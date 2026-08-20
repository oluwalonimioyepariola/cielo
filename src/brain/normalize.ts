import { FILLER, SLANG, STOPWORDS } from './lexicon';
import { createSpellingFixer as createFixer, unstretch as unstretchWith, type SpellingFixer } from './spelling';

export type Token = {
  /** Lowercased, slang-expanded word. */
  word: string;
  /** Typed with a capital first letter — a hint that it may be a name. */
  capitalized: boolean;
};

const URL = /\b(?:https?:\/\/|www\.)\S+/gi;
const EMAIL = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g;
const PHONE = /\+?\d[\d\s().-]{6,}\d/g;
const MENTION = /@\S+/g;
const EMOJI = /[\p{Extended_Pictographic}\p{Emoji_Modifier}\u200d\ufe0f\u20e3]+/gu;
const CURLY_QUOTES = /[\u2018\u2019\u02bc`\u00b4]/g;

// Phrases never run across punctuation, line breaks or emoji.
const SEGMENT_BREAK = /[.!?,;:()[\]{}"\u201c\u201d\u2026\n\r\t]+|\s[-\u2013\u2014]+\s/;
const TOKEN = /[A-Za-z0-9]+(?:'[A-Za-z]+)*/g;

export const isKnown = (word: string) => STOPWORDS.has(word) || FILLER.has(word) || word in SLANG;

/** Removes things that must never become vocabulary: links, emails, phone numbers, @mentions. */
export function stripPrivate(text: string): string {
  return text
    .replace(CURLY_QUOTES, "'")
    .replace(URL, ' ')
    .replace(EMAIL, ' ')
    .replace(MENTION, ' ')
    .replace(PHONE, ' ');
}

/** Rule-based repair for stretched words ("sooo" → "so"), without chat context. */
export function unstretch(word: string): string {
  return unstretchWith(word, isKnown);
}

/** A spelling fixer tuned to one chat, aware of Cielo's stopwords, filler and slang. */
export function createSpellingFixer(texts: Iterable<string>, protect: Iterable<string> = []): SpellingFixer {
  return createFixer(texts, { isKnown, protect });
}

export type { SpellingFixer };

/**
 * Splits a message into phrase-safe segments of normalized tokens.
 * Numbers also break a segment, so "see you at 5 then" doesn't produce "you then".
 */
export function segment(text: string, fix: SpellingFixer = unstretch): Token[][] {
  const clean = stripPrivate(text).replace(EMOJI, '\n');
  const segments: Token[][] = [];

  for (const part of clean.split(SEGMENT_BREAK)) {
    let current: Token[] = [];
    const flush = () => {
      if (current.length) segments.push(current);
      current = [];
    };

    for (const raw of part.match(TOKEN) ?? []) {
      const lower = fix(raw.toLowerCase());
      const expansion = SLANG[lower];
      if (expansion) {
        for (const word of expansion.split(' ')) current.push({ word, capitalized: false });
      } else if (/\d/.test(lower)) {
        flush();
      } else {
        current.push({ word: lower, capitalized: raw[0] !== raw[0].toLowerCase() });
      }
    }
    flush();
  }

  return segments;
}
