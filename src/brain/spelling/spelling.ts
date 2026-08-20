import { wordRank } from './dictionary';

/** Turns a raw lowercased word into the word the user meant. */
export type SpellingFixer = (word: string) => string;

export type SpellingOptions = {
  /** Extra words to treat as real and very common — e.g. stopwords, chat filler, slang keys. */
  isKnown?: (word: string) => boolean;
  /** Words that must never be changed, such as the names of the people in the chat. */
  protect?: Iterable<string>;
};

const STRETCHED = /(.)\1\1/; // three or more of the same letter in a row
const RUN = /(.)\1{2,}/g;
const MAX_RUNS = 4; // 2^4 = 16 candidates at most
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

// Doubled endings that are real English ("see", "too", "all", "miss", "off", "jazz").
const REAL_DOUBLE_ENDINGS = new Set(['ee', 'oo', 'll', 'ss', 'ff', 'zz']);

// Typo fixes only ever land on reasonably common words, never on something obscure.
const MAX_SUGGESTION_RANK = 30_000;
// A short word the user types this often is probably deliberate slang ("abeg", "sabi").
// Longer repeated misspellings are usually habits ("wierd", "tommorow") and still get fixed,
// unless the only fix is an uncommon word.
const DELIBERATE_USES = 3;
const MAX_SLANG_LENGTH = 4;
const COMMON_RANK = 20_000;
const MIN_TYPO_LENGTH = 4;
const MIN_TWO_EDIT_LENGTH = 7;

/**
 * Rule-based fallback for stretched words when neither the chat nor the dictionary helps:
 * runs of 3+ shrink to 2, then a doubled ending shrinks to 1 unless it's a real English ending.
 */
export function unstretch(word: string, isKnown: (w: string) => boolean = () => false): string {
  if (!STRETCHED.test(word)) return word;
  const two = word.replace(RUN, '$1$1');
  const single = two.slice(0, -1);
  const ending = two.slice(-2);
  if (ending[0] !== ending[1]) return two;
  if (!REAL_DOUBLE_ENDINGS.has(ending) || isKnown(single)) return single;
  return two;
}

/** Every way to shrink the stretched runs: "loooovee" → love, lovee, loove, loovee. */
function shrinkCandidates(word: string): string[] {
  const parts = word.split(/((.)\2{2,})/).filter((_, i) => i % 3 !== 2);
  let candidates = [''];
  let runs = 0;
  for (const part of parts) {
    const isRun = part.length >= 3 && STRETCHED.test(part) && runs < MAX_RUNS;
    if (isRun) runs++;
    const options = isRun ? [part[0], part[0] + part[0]] : [part];
    candidates = candidates.flatMap((c) => options.map((o) => c + o));
  }
  return candidates;
}

/** All strings one edit away: a deleted, swapped, replaced or inserted letter. */
function edits1(word: string): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i <= word.length; i++) {
    const left = word.slice(0, i);
    const right = word.slice(i);
    if (right) out.add(left + right.slice(1));
    if (right.length > 1) out.add(left + right[1] + right[0] + right.slice(2));
    for (const c of LETTERS) {
      if (right) out.add(left + c + right.slice(1));
      out.add(left + c + right);
    }
  }
  out.delete(word);
  return out;
}

/** The most common dictionary word among the candidates, if any is common enough. */
function mostCommon(candidates: Iterable<string>): { word: string; rank: number } | null {
  let best: { word: string; rank: number } | null = null;
  for (const c of candidates) {
    const rank = wordRank(c);
    if (rank !== undefined && rank <= MAX_SUGGESTION_RANK && (!best || rank < best.rank)) best = { word: c, rank };
  }
  return best;
}

/**
 * Words the user only ever types with a capital letter mid-sentence ("tell Kemi hi") are
 * probably names. They're left exactly as typed, so a name never gets "corrected" into a real word.
 */
function findNameLikeWords(texts: string[]): Set<string> {
  const capitalizedMid = new Set<string>();
  const lowercase = new Set<string>();
  for (const text of texts) {
    for (const sentence of text.split(/[.!?\n]+/)) {
      const tokens = sentence.match(/[A-Za-z]+(?:'[A-Za-z]+)*/g) ?? [];
      tokens.forEach((token, i) => {
        const lower = token.toLowerCase();
        if (token === lower) lowercase.add(lower);
        else if (i > 0 && lower !== 'i' && !lower.startsWith("i'")) capitalizedMid.add(lower);
      });
    }
  }
  return new Set([...capitalizedMid].filter((w) => !lowercase.has(w)));
}

/**
 * Builds a fixer for one chat. It combines three sources of truth:
 *
 * 1. **The user's own spelling.** Someone who writes "loooove" usually writes "love" elsewhere too.
 * 2. **An English frequency dictionary** (50,000 words), so "goooood" becomes "good" rather than
 *    "god", and typos like "tommorow" or "becuase" become real words.
 * 3. **Caller-supplied known words** (stopwords, chat filler, slang).
 *
 * Guard rails, so real chat language survives: names and protected words are never touched;
 * only words that aren't real words get typo-fixed; fixes are 1 edit away (2 for long words) and
 * must be common words; and short words the user types often are treated as deliberate slang.
 */
export function createSpellingFixer(texts: Iterable<string>, options: SpellingOptions = {}): SpellingFixer {
  const isKnown = options.isKnown ?? (() => false);
  const all = [...texts];

  const typed = new Map<string, number>();
  for (const text of all) {
    for (const raw of text.match(/[A-Za-z]+(?:'[A-Za-z]+)*/g) ?? []) {
      const word = raw.toLowerCase();
      if (!STRETCHED.test(word)) typed.set(word, (typed.get(word) ?? 0) + 1);
    }
  }
  const protectedWords = new Set([...(options.protect ?? []), ...findNameLikeWords(all)]);

  const isReal = (word: string) => isKnown(word) || wordRank(word) !== undefined;

  // How likely a candidate is what the user meant. Known words dominate; then dictionary
  // frequency (Zipf-style, 1/rank) blended with how often the user types it themselves.
  const likelihood = (word: string) => {
    const rank = wordRank(word);
    return (isKnown(word) ? 1e6 : 0) + (rank ? 1e5 / rank : 0) + (typed.get(word) ?? 0) * 100;
  };

  const repairStretch = (word: string) => {
    let best = '';
    let bestScore = 0;
    for (const candidate of shrinkCandidates(word)) {
      const score = likelihood(candidate);
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
    return bestScore > 0 ? best : unstretch(word, isKnown);
  };

  const trimDoubledEnd = (word: string) => {
    if (!/(.)\1$/.test(word) || isReal(word)) return word;
    const single = word.slice(0, -1);
    const usualSpelling = (typed.get(single) ?? 0) >= DELIBERATE_USES * Math.max(1, typed.get(word) ?? 0);
    return isReal(single) || usualSpelling ? single : word;
  };

  const fixTypo = (word: string) => {
    if (word.length < MIN_TYPO_LENGTH || isReal(word)) return word;
    const near = edits1(word);
    let fix = mostCommon(near);
    if (!fix && word.length >= MIN_TWO_EDIT_LENGTH) {
      const twoAway = new Set<string>();
      for (const w of near) for (const w2 of edits1(w)) twoAway.add(w2);
      fix = mostCommon(twoAway);
    }
    if (!fix) return word;
    const deliberate =
      (typed.get(word) ?? 0) >= DELIBERATE_USES && (word.length <= MAX_SLANG_LENGTH || fix.rank > COMMON_RANK);
    return deliberate ? word : fix.word;
  };

  const cache = new Map<string, string>();
  return (word) => {
    const cached = cache.get(word);
    if (cached !== undefined) return cached;

    let fixed = word;
    if (!protectedWords.has(word) && /^[a-z]+$/.test(word)) {
      if (STRETCHED.test(fixed)) fixed = repairStretch(fixed);
      fixed = trimDoubledEnd(fixed);
      fixed = fixTypo(fixed);
    }

    cache.set(word, fixed);
    return fixed;
  };
}
