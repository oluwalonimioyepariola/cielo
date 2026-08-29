import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type Grade } from 'ts-fsrs';

import type { Verdict } from './grading';

/**
 * Spaced review with FSRS (the scheduler Anki uses): each phrase keeps a memory card, and comes
 * back just before the learner would forget it. Pure logic, no storage.
 *
 * Short-term steps are off: Cielo is used once or twice a day, so reviews are spaced in days.
 * A brand-new "Good" phrase comes back the next day; misses come back sooner, strong ones later.
 */
const scheduler = fsrs(generatorParameters({ enable_short_term: false, enable_fuzz: true }));

/** How a lesson went for one phrase: any miss is "Again", a near-miss "Hard", otherwise "Good". */
export function gradeFrom(verdicts: Verdict[]): Grade {
  if (verdicts.includes('wrong')) return Rating.Again;
  if (verdicts.includes('almost')) return Rating.Hard;
  return Rating.Good;
}

/** The phrase's next memory card after this review. A phrase seen for the first time starts fresh. */
export function scheduleNext(card: Card | null, grade: Grade, now: Date): Card {
  return scheduler.next(card ?? createEmptyCard(now), now, grade).card;
}

// --- Storage form: plain JSON with ISO dates ---

export type StoredCard = Omit<Card, 'due' | 'last_review'> & { due: string; last_review?: string };

export const toStored = (card: Card): StoredCard => ({
  ...card,
  due: card.due.toISOString(),
  last_review: card.last_review?.toISOString(),
});

export const fromStored = (stored: StoredCard): Card => ({
  ...stored,
  due: new Date(stored.due),
  last_review: stored.last_review ? new Date(stored.last_review) : undefined,
});

export const isDue = (card: Card, now: Date) => card.due.getTime() <= now.getTime();

// --- Daily streak ---

/** A local calendar day as YYYY-MM-DD, so a streak follows the learner's own midnight. */
export function dayKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/**
 * Days in a row with some learning, ending today, or yesterday (today isn't over yet, so a streak
 * isn't broken until a whole day is missed).
 */
export function streakLength(days: Set<string>, now: Date): number {
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
