import { PHRASES, WORDS, type Entry } from './entries';

export type Translation = {
  es: string;
  /** Other correct ways to say it, each with when to use it ("if you're a woman", "in Spain"). */
  alts: { es: string; when: string }[];
  note?: string;
};

/** The brain's normalized form: lowercase, straight apostrophes, single spaces, no punctuation. */
export function normalizeKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’`]/g, "'")
    .replace(/[^a-z' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const toTranslation = ({ es, alts, note }: Entry): Translation => ({
  es,
  alts: (alts ?? []).map(([altEs, when]) => ({ es: altEs, when })),
  note,
});

let bank: Map<string, Translation> | null = null;

function load(): Map<string, Translation> {
  const map = new Map<string, Translation>();
  for (const entry of [...WORDS, ...PHRASES]) map.set(normalizeKey(entry.en), toTranslation(entry));
  return map;
}

/** The Spanish for a word or phrase from the user's chat, or null if the bank doesn't have it yet. */
export function translate(text: string): Translation | null {
  bank ??= load();
  return bank.get(normalizeKey(text)) ?? null;
}

export function bankSize(): number {
  bank ??= load();
  return bank.size;
}

/** Every Spanish phrase in the bank — a pool of believable wrong options for exercises. */
export function allBankSpanish(): string[] {
  bank ??= load();
  return [...new Set([...bank.values()].map((t) => t.es))];
}
