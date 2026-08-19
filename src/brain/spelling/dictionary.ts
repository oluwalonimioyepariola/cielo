import { WORDS_BY_FREQUENCY } from './dictionary-data';

let ranks: Map<string, number> | null = null;

function load(): Map<string, number> {
  const map = new Map<string, number>();
  WORDS_BY_FREQUENCY.split(' ').forEach((word, i) => map.set(word, i + 1));
  return map;
}

/** 1 for the most common English word ("the"), up to 50,000; undefined if it isn't in the dictionary. */
export function wordRank(word: string): number | undefined {
  ranks ??= load();
  return ranks.get(word);
}

export function isEnglishWord(word: string): boolean {
  return wordRank(word) !== undefined;
}
