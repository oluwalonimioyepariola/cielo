import { BAD_PHRASE_END, BAD_PHRASE_START, NOT_NAMES, STOPWORDS, isFiller } from './lexicon';
import { createSpellingFixer, segment, stripPrivate, type Token } from './normalize';
import type { AnalyzeOptions, ChatMessage, VocabItem } from './types';

const MAX_EXAMPLES = 3;
const MAX_EXAMPLE_LENGTH = 140;
// A shorter item is dropped when at least this share of its uses sits inside longer phrases
// ("good" is nearly always "good morning" or "good night").
const SUBSUMED_SHARE = 0.8;

type Counter = {
  text: string;
  words: number;
  /** Times it opened a sentence — fragments like "you so much" never do. */
  starts: number;
  selfCount: number;
  partnerCount: number;
  exampleIds: number[];
};

type Selected = { message: ChatMessage; isSelf: boolean; segments: Token[][] };

export function extractVocab(
  messages: ChatMessage[],
  participantNames: string[],
  options: AnalyzeOptions,
): { vocab: VocabItem[]; uniqueWords: number; names: Set<string> } {
  const {
    self,
    includePartner = false,
    partnerWeight = 0.5,
    minWordCount = 2,
    minPhraseCount = 2,
    maxPhraseWords = 6,
    limit = 500,
  } = options;

  // The partner's messages are never even tokenized unless the user opted in.
  const chosen = messages.filter((m) => includePartner || m.sender === self);
  const fix = createSpellingFixer(
    chosen.map((m) => m.text),
    participantNames.flatMap((name) => name.toLowerCase().split(/[^a-z']+/)),
  );
  const selected: Selected[] = chosen.map((message) => ({
    message,
    isSelf: message.sender === self,
    segments: segment(message.text, fix),
  }));

  const names = detectNames(selected, participantNames);
  const counters = new Map<string, Counter>();
  const uniqueWords = new Set<string>();

  selected.forEach(({ isSelf, segments }, id) => {
    // Count each item once per message, so "love love love" doesn't outrank real usage.
    const seen = new Set<string>();

    for (const run of cleanRuns(segments, names)) {
      for (let start = 0; start < run.length; start++) {
        for (let n = 1; n <= maxPhraseWords && start + n <= run.length; n++) {
          const words = run.slice(start, start + n);
          if (n === 1) {
            if (STOPWORDS.has(words[0]) || words[0].length < 2) continue;
            uniqueWords.add(words[0]);
          } else if (!isGoodPhrase(words)) {
            continue;
          }

          const text = words.join(' ');
          if (seen.has(text)) continue;
          seen.add(text);

          let counter = counters.get(text);
          if (!counter) {
            counter = { text, words: n, starts: 0, selfCount: 0, partnerCount: 0, exampleIds: [] };
            counters.set(text, counter);
          }
          if (start === 0) counter.starts++;
          if (isSelf) counter.selfCount++;
          else counter.partnerCount++;
          if (counter.exampleIds.length < MAX_EXAMPLES * 4) counter.exampleIds.push(id);
        }
      }
    }
  });

  const total = (c: Counter) => c.selfCount + c.partnerCount;
  const frequent = [...counters.values()].filter(
    (c) => total(c) >= (c.words === 1 ? minWordCount : minPhraseCount),
  );
  // Fragments are removed only after they've marked their own pieces as covered.
  const kept = dropSubsumed(frequent, total).filter((c) => !isTailFragment(c));

  const vocab = kept
    .map((c): VocabItem => {
      const weighted = c.selfCount + partnerWeight * c.partnerCount;
      return {
        text: c.text,
        kind: c.words === 1 ? 'word' : 'phrase',
        words: c.words,
        count: total(c),
        selfCount: c.selfCount,
        partnerCount: c.partnerCount,
        // Phrases are worth more than single words: they're what people actually say.
        score: Math.round(weighted * (1 + 0.5 * (c.words - 1)) * 100) / 100,
        examples: pickExamples(c.exampleIds.map((id) => selected[id].message.text), names),
      };
    })
    .sort((a, b) => b.score - a.score || b.words - a.words || a.text.localeCompare(b.text))
    .slice(0, limit);

  return { vocab, uniqueWords: uniqueWords.size, names };
}

/**
 * Names: participant names, plus words typed capitalized mid-sentence almost every time
 * ("miss you Kemi", "tell Kemi I said hi") that are never typed in lowercase.
 */
function detectNames(selected: Selected[], participantNames: string[]): Set<string> {
  const names = new Set<string>();
  for (const name of participantNames) {
    for (const part of name.toLowerCase().split(/[^a-z']+/)) {
      if (part.length >= 2 && !STOPWORDS.has(part)) names.add(part);
    }
  }

  const capitalizedMid = new Map<string, number>();
  const lowercase = new Map<string, number>();
  for (const { segments } of selected) {
    for (const seg of segments) {
      seg.forEach((token, i) => {
        if (!token.capitalized) lowercase.set(token.word, (lowercase.get(token.word) ?? 0) + 1);
        else if (i > 0) capitalizedMid.set(token.word, (capitalizedMid.get(token.word) ?? 0) + 1);
      });
    }
  }

  for (const [word, caps] of capitalizedMid) {
    if (caps < 2 || NOT_NAMES.has(word) || STOPWORDS.has(word) || word === 'i' || word.startsWith("i'")) continue;
    if ((lowercase.get(word) ?? 0) <= caps * 0.1) names.add(word);
  }
  return names;
}

/** Splits segments at names and filler, so phrases never contain either. */
function cleanRuns(segments: Token[][], names: Set<string>): string[][] {
  const runs: string[][] = [];
  for (const seg of segments) {
    let run: string[] = [];
    for (const { word } of seg) {
      if (names.has(word) || isFiller(word)) {
        if (run.length) runs.push(run);
        run = [];
      } else {
        run.push(word);
      }
    }
    if (run.length) runs.push(run);
  }
  return runs;
}

const OBJECT_PRONOUNS = new Set(['you', 'me', 'him', 'her', 'them', 'us', 'it']);

/**
 * "you so much" is the tail of "i miss you so much" / "i love you so much", not something anyone says.
 * A phrase starting with an object pronoun must open a sentence at least once ("you too!" does).
 */
function isTailFragment(c: Counter): boolean {
  return c.words > 1 && c.starts === 0 && OBJECT_PRONOUNS.has(c.text.slice(0, c.text.indexOf(' ')));
}

function isGoodPhrase(words: string[]): boolean {
  if (BAD_PHRASE_START.has(words[0]) || BAD_PHRASE_END.has(words[words.length - 1])) return false;
  if (new Set(words).size < words.length) return false; // "love love", "so so"
  // Two function words alone ("you are") are grammar, not vocabulary. Three can be a real phrase
  // ("where are you", "how are you").
  return words.length >= 3 || words.some((w) => !STOPWORDS.has(w));
}

function dropSubsumed(items: Counter[], total: (c: Counter) => number): Counter[] {
  // A phrase of n words contains exactly two phrases of n-1 words: without its first word and without its last.
  // Credit each of those with the longer phrase's uses.
  const covered = new Map<string, number>();
  for (const longer of items) {
    if (longer.words === 1) continue;
    const words = longer.text.split(' ');
    for (const child of new Set([words.slice(1).join(' '), words.slice(0, -1).join(' ')])) {
      covered.set(child, (covered.get(child) ?? 0) + total(longer));
    }
  }
  return items.filter((c) => (covered.get(c.text) ?? 0) < SUBSUMED_SHARE * total(c));
}

/** Short real messages with names, links and numbers taken out — used later as lesson context. */
function pickExamples(texts: string[], names: Set<string>): string[] {
  const nameWords = [...names].map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const namePattern = nameWords.length ? new RegExp(`[,\\s]*\\b(?:${nameWords.join('|')})\\b`, 'gi') : null;

  const cleaned = new Set<string>();
  for (const text of texts) {
    let t = stripPrivate(text);
    if (namePattern) t = t.replace(namePattern, '');
    t = t
      .replace(/\s+/g, ' ')
      .replace(/\s+([.,!?])/g, '$1')
      .replace(/^[\s,]+/, '')
      .trim();
    if (t && t.length <= MAX_EXAMPLE_LENGTH) cleaned.add(t);
  }
  return [...cleaned].sort((a, b) => a.length - b.length).slice(0, MAX_EXAMPLES);
}
