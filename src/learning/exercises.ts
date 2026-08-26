import type { VocabItem } from '@/brain/types';

import type { Lesson, LessonItem } from './curriculum';
import { toTiles } from './grading';
import { allBankSpanish, translate, type Translation } from './phrase-bank';

/** A phrase that can be taught: the user's English, its Spanish, and where they said it. */
export type Teachable = {
  en: string;
  t: Translation;
  example?: string;
};

export type Exercise =
  | { kind: 'meet'; item: Teachable }
  | { kind: 'pick-spanish'; item: Teachable; options: string[] }
  | { kind: 'pick-english'; item: Teachable; options: string[] }
  | { kind: 'build'; item: Teachable; tiles: string[] }
  | { kind: 'type'; item: Teachable }
  | { kind: 'match'; pairs: Teachable[]; spanishOrder: number[] };

export const isGraded = (e: Exercise) => e.kind !== 'meet' && e.kind !== 'match';

/** Every correct Spanish answer for an item: the main form plus its alternatives. */
export const acceptedSpanish = (item: Teachable) => [item.t.es, ...item.t.alts.map((a) => a.es)];

export function toTeachable(item: LessonItem): Teachable | null {
  const t = item.translation ?? translate(item.text);
  return t ? { en: item.text, t, example: item.examples[0] } : null;
}

// --- Deterministic randomness, so a lesson is the same every time it's opened ---

function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** `count` wrong options, unique, and never another correct form of the answer. */
function distractors(correct: string[], pool: string[], count: number, random: () => number): string[] {
  const avoid = new Set(correct.map((c) => c.toLowerCase()));
  const picked: string[] = [];
  for (const option of shuffle(pool, random)) {
    const key = option.toLowerCase();
    if (avoid.has(key)) continue;
    avoid.add(key);
    picked.push(option);
    if (picked.length === count) break;
  }
  return picked;
}

const OPTIONS = 3;
const EXTRA_TILES = 2;
const MATCH_SIZE = 4;

/**
 * The exercises for one lesson, in teaching order.
 *
 * A lesson introduces each phrase (meet → pick the Spanish), then practises them all in other
 * directions (build the sentence or pick the English), matches pairs, and ends by typing the
 * shortest ones from memory. A checkpoint skips introductions and mixes everything for the day.
 */
export function buildExercises(lesson: Lesson, vocab: VocabItem[], seed = lesson.id): Exercise[] {
  const random = seededRandom(seed);
  const items = lesson.items.map(toTeachable).filter((t): t is Teachable => t !== null);
  if (!items.length) return [];

  const others = vocab.map(toTeachable).filter((t): t is Teachable => t !== null);
  const spanishPool = [...new Set([...others.map((o) => o.t.es), ...allBankSpanish()])];
  const englishPool = [...new Set(others.map((o) => o.en))];

  const pickSpanish = (item: Teachable): Exercise => ({
    kind: 'pick-spanish',
    item,
    options: shuffle([item.t.es, ...distractors(acceptedSpanish(item), spanishPool, OPTIONS - 1, random)], random),
  });
  const pickEnglish = (item: Teachable): Exercise | null => {
    const wrong = distractors([item.en], englishPool, OPTIONS - 1, random);
    return wrong.length === OPTIONS - 1 ? { kind: 'pick-english', item, options: shuffle([item.en, ...wrong], random) } : null;
  };
  const build = (item: Teachable): Exercise | null => {
    const words = toTiles(item.t.es);
    if (words.length < 2) return null;
    const spare = distractors(words, spanishPool.flatMap(toTiles), EXTRA_TILES, random);
    return { kind: 'build', item, tiles: shuffle([...words, ...spare], random) };
  };
  const match = (pairs: Teachable[]): Exercise => ({
    kind: 'match',
    pairs,
    spanishOrder: shuffle(pairs.map((_, i) => i), random),
  });
  const practise = (item: Teachable) => build(item) ?? pickEnglish(item) ?? pickSpanish(item);

  const exercises: Exercise[] = [];

  if (lesson.kind === 'lesson') {
    for (const item of items) exercises.push({ kind: 'meet', item }, pickSpanish(item));
    for (const item of shuffle(items, random)) exercises.push(practise(item));
    if (items.length >= 3) exercises.push(match(items.slice(0, MATCH_SIZE)));
    // Type from memory: the two shortest, so the lesson ends on a win rather than a wall.
    const shortest = [...items].sort((a, b) => a.t.es.length - b.t.es.length).slice(0, 2);
    for (const item of shortest) exercises.push({ kind: 'type', item });
  } else {
    const kinds = [pickSpanish, practise, (item: Teachable): Exercise => ({ kind: 'type', item }), practise];
    shuffle(items, random).forEach((item, i) => exercises.push(kinds[i % kinds.length](item)));
    for (let i = 0; i < Math.min(items.length, MATCH_SIZE * 2); i += MATCH_SIZE) {
      const group = items.slice(i, i + MATCH_SIZE);
      if (group.length >= 3) exercises.push(match(group));
    }
  }

  return exercises;
}
