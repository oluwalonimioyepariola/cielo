import { dayKey, gradeFrom, scheduleNext } from '@/learning/review';
import type { Verdict } from '@/learning/grading';

import { backUpProgress } from './backup';
import { getReviewCards, recordActivityDay, saveReviewCards } from './db';

/** The review session's route id: /lesson/review. */
export const REVIEW_ID = 'review';

/**
 * After a lesson, review or test: updates each practised phrase's memory card from how it went,
 * and marks today as a learning day for the streak.
 */
export function recordPractice(phrases: string[], outcomes: Map<string, Verdict[]>, now = new Date()) {
  const cards = getReviewCards(phrases);
  for (const text of phrases) {
    cards.set(text, scheduleNext(cards.get(text) ?? null, gradeFrom(outcomes.get(text) ?? []), now));
  }
  saveReviewCards(cards);
  recordActivityDay(dayKey(now));
  // Memory cards and the streak are part of the backup, so every session backs up, reviews included.
  backUpProgress();
}
