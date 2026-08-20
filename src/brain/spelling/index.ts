// Chat-text spelling repair: stretched words, doubled endings and typos, offline, with an
// English frequency dictionary. Self-contained (no app or Expo imports) so it can become
// its own package later.
export { isEnglishWord, wordRank } from './dictionary';
export { createSpellingFixer, unstretch, type SpellingFixer, type SpellingOptions } from './spelling';
