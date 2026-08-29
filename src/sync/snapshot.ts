import type { VocabItem } from '@/brain/types';
import type { StoredCard } from '@/learning/review';

/**
 * The backup of a learner's progress: shared by the phone (which builds it) and the server
 * (which checks and stores it). It carries the learning, never the chat: no example messages,
 * no message text, nothing about the other person. Pure TypeScript, no app or server imports.
 */
export type BackupPhrase = Omit<VocabItem, 'examples'>;
export type BackupLesson = { lessonId: string; completedAt: string };
export type BackupProfile = { firstName: string | null; includePartner: boolean; importedAt: string };
/** A phrase's spaced-review memory card: dates and numbers only. */
export type BackupReview = { text: string; card: StoredCard };

export type ProgressSnapshot = {
  phrases: BackupPhrase[];
  lessons: BackupLesson[];
  profile: BackupProfile | null;
  reviews: BackupReview[];
  /** Days with learning, as YYYY-MM-DD, for the streak. */
  activityDays: string[];
};

// Generous for a real path (the brain keeps 500 phrases), small enough to refuse abuse.
export const LIMITS = { phrases: 2000, lessons: 2000, reviews: 4000, activityDays: 3700, textLength: 200, lessonIdLength: 40 };

/** What the phone sends: the user's phrases with their example messages stripped off. */
export function buildSnapshot(
  vocab: VocabItem[],
  lessons: BackupLesson[],
  profile: BackupProfile | null,
  reviews: BackupReview[] = [],
  activityDays: string[] = [],
): ProgressSnapshot {
  return {
    phrases: vocab.map(({ examples: _examples, ...phrase }) => phrase),
    lessons,
    profile,
    reviews,
    activityDays,
  };
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 1e7;
const isDate = (v: unknown): v is string => typeof v === 'string' && v.length < 40 && !Number.isNaN(Date.parse(v));

/**
 * Checks an uploaded snapshot field by field and rebuilds it from known fields only, so nothing
 * unexpected (like an example message) can ride along. Returns null if anything is off.
 */
export function parseSnapshot(input: unknown): ProgressSnapshot | null {
  if (!isObject(input) || !Array.isArray(input.phrases) || !Array.isArray(input.lessons)) return null;
  if (input.phrases.length > LIMITS.phrases || input.lessons.length > LIMITS.lessons) return null;

  const phrases: BackupPhrase[] = [];
  for (const p of input.phrases) {
    if (!isObject(p) || typeof p.text !== 'string' || !p.text || p.text.length > LIMITS.textLength) return null;
    if (p.kind !== 'word' && p.kind !== 'phrase') return null;
    if (![p.words, p.count, p.selfCount, p.partnerCount].every(isCount)) return null;
    if (typeof p.score !== 'number' || !Number.isFinite(p.score)) return null;
    phrases.push({
      text: p.text,
      kind: p.kind,
      words: p.words as number,
      count: p.count as number,
      selfCount: p.selfCount as number,
      partnerCount: p.partnerCount as number,
      score: p.score,
    });
  }

  const lessons: BackupLesson[] = [];
  for (const l of input.lessons) {
    if (!isObject(l) || typeof l.lessonId !== 'string' || !/^u\d+-(l\d+|check)$/.test(l.lessonId)) return null;
    if (l.lessonId.length > LIMITS.lessonIdLength || !isDate(l.completedAt)) return null;
    lessons.push({ lessonId: l.lessonId, completedAt: l.completedAt });
  }

  let profile: BackupProfile | null = null;
  if (input.profile != null) {
    const p = input.profile;
    if (!isObject(p) || !isDate(p.importedAt) || typeof p.includePartner !== 'boolean') return null;
    if (p.firstName != null && (typeof p.firstName !== 'string' || p.firstName.length > 40)) return null;
    profile = { firstName: (p.firstName as string | null) ?? null, includePartner: p.includePartner, importedAt: p.importedAt };
  }

  // Memory cards and streak days arrived later; a backup without them is still valid.
  const reviews = parseReviews(input.reviews ?? []);
  const activityDays = parseDays(input.activityDays ?? []);
  if (!reviews || !activityDays) return null;

  return { phrases: dedupe(phrases), lessons, profile, reviews, activityDays };
}

const CARD_NUMBERS = ['stability', 'difficulty', 'elapsed_days', 'scheduled_days', 'learning_steps', 'reps', 'lapses'] as const;

function parseReviews(input: unknown): BackupReview[] | null {
  if (!Array.isArray(input) || input.length > LIMITS.reviews) return null;
  const reviews: BackupReview[] = [];
  const seen = new Set<string>();
  for (const r of input) {
    if (!isObject(r) || typeof r.text !== 'string' || !r.text || r.text.length > LIMITS.textLength) return null;
    const c = r.card;
    if (!isObject(c) || !isDate(c.due) || (c.last_review !== undefined && !isDate(c.last_review))) return null;
    if (!CARD_NUMBERS.every((k) => typeof c[k] === 'number' && Number.isFinite(c[k]) && (c[k] as number) >= 0)) return null;
    if (typeof c.state !== 'number' || !Number.isInteger(c.state) || c.state < 0 || c.state > 3) return null;
    if (seen.has(r.text)) continue;
    seen.add(r.text);
    const card = Object.fromEntries(CARD_NUMBERS.map((k) => [k, c[k] as number])) as Record<(typeof CARD_NUMBERS)[number], number>;
    reviews.push({
      text: r.text,
      card: { ...card, state: c.state, due: c.due as string, ...(c.last_review ? { last_review: c.last_review as string } : {}) },
    });
  }
  return reviews;
}

function parseDays(input: unknown): string[] | null {
  if (!Array.isArray(input) || input.length > LIMITS.activityDays) return null;
  if (!input.every((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))) return null;
  return [...new Set(input as string[])];
}

/** The same phrase twice would break the database's one-row-per-phrase rule; keep the first. */
function dedupe(phrases: BackupPhrase[]): BackupPhrase[] {
  const seen = new Set<string>();
  return phrases.filter((p) => !seen.has(p.text) && seen.add(p.text));
}
