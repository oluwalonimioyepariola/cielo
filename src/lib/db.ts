import { openDatabaseSync } from 'expo-sqlite';

import type { ChatAnalysis, VocabItem, VocabKind } from '@/brain';
import { fromStored, toStored, type StoredCard } from '@/learning/review';
import type { BackupLesson, BackupReview, ProgressSnapshot } from '@/sync/snapshot';
import type { Card } from 'ts-fsrs';

/** The on-device database. Holds what the brain learned from the chat — never the chat itself. */
const db = openDatabaseSync('cielo.db');

// Each entry upgrades the schema by one version. Append; never edit a shipped migration.
const MIGRATIONS = [
  `CREATE TABLE vocab (
     text TEXT PRIMARY KEY NOT NULL,
     kind TEXT NOT NULL,
     words INTEGER NOT NULL,
     count INTEGER NOT NULL,
     self_count INTEGER NOT NULL,
     partner_count INTEGER NOT NULL,
     score REAL NOT NULL,
     examples TEXT NOT NULL
   );
   CREATE TABLE meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);`,
  `CREATE TABLE lesson_progress (lesson_id TEXT PRIMARY KEY NOT NULL, completed_at TEXT NOT NULL);`,
  // Spaced review: one FSRS memory card per phrase (kept across re-imports), and the days with learning.
  `CREATE TABLE review_card (text TEXT PRIMARY KEY NOT NULL, card TEXT NOT NULL, due TEXT NOT NULL);
   CREATE INDEX review_card_due ON review_card (due);
   CREATE TABLE activity_day (day TEXT PRIMARY KEY NOT NULL);`,
];

function migrate() {
  const { user_version: version } = db.getFirstSync<{ user_version: number }>('PRAGMA user_version') ?? {
    user_version: 0,
  };
  for (let v = version; v < MIGRATIONS.length; v++) {
    db.withTransactionSync(() => {
      db.execSync(MIGRATIONS[v]);
      db.execSync(`PRAGMA user_version = ${v + 1}`);
    });
  }
}
migrate();

type VocabRow = {
  text: string;
  kind: VocabKind;
  words: number;
  count: number;
  self_count: number;
  partner_count: number;
  score: number;
  examples: string;
};

type Stats = ChatAnalysis['stats'];

export type ImportSummary = {
  self: string;
  includePartner: boolean;
  importedAt: string;
  /** Set when the words came back from the account backup rather than from a chat on this phone. */
  restoredFromBackup?: boolean;
  /** Dates are stored as ISO strings. */
  stats: Omit<Stats, 'firstMessageAt' | 'lastMessageAt'> & {
    firstMessageAt: string | null;
    lastMessageAt: string | null;
  };
};

/** Replaces the vocabulary with a fresh analysis. */
export function saveAnalysis(analysis: ChatAnalysis, summary: Omit<ImportSummary, 'stats'>) {
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM vocab');
    // A new word list means a new path, so progress starts over — except Day 0, which doesn't depend on the chat.
    db.runSync("DELETE FROM lesson_progress WHERE lesson_id NOT LIKE 'u0-%'");
    const insert = db.prepareSync(
      `INSERT INTO vocab (text, kind, words, count, self_count, partner_count, score, examples)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    try {
      for (const v of analysis.vocab) {
        insert.executeSync([
          v.text,
          v.kind,
          v.words,
          v.count,
          v.selfCount,
          v.partnerCount,
          v.score,
          JSON.stringify(v.examples),
        ]);
      }
    } finally {
      insert.finalizeSync();
    }
    const { firstMessageAt, lastMessageAt } = analysis.stats;
    const value: ImportSummary = {
      ...summary,
      stats: {
        ...analysis.stats,
        firstMessageAt: firstMessageAt?.toISOString() ?? null,
        lastMessageAt: lastMessageAt?.toISOString() ?? null,
      },
    };
    db.runSync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', 'import', JSON.stringify(value));
  });
}

export function getVocab(): VocabItem[] {
  return db.getAllSync<VocabRow>('SELECT * FROM vocab ORDER BY score DESC, words DESC, text').map((r) => ({
    text: r.text,
    kind: r.kind,
    words: r.words,
    count: r.count,
    selfCount: r.self_count,
    partnerCount: r.partner_count,
    score: r.score,
    examples: JSON.parse(r.examples),
  }));
}

export function getImportSummary(): ImportSummary | null {
  const row = db.getFirstSync<{ value: string }>("SELECT value FROM meta WHERE key = 'import'");
  return row ? JSON.parse(row.value) : null;
}

/** Wipes everything Cielo learned on this phone (used on sign-out). */
export function clearAll() {
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM vocab');
    db.runSync('DELETE FROM meta');
    db.runSync('DELETE FROM lesson_progress');
    db.runSync('DELETE FROM review_card');
    db.runSync('DELETE FROM activity_day');
  });
}

export function getCompletedLessons(): Set<string> {
  return new Set(
    db.getAllSync<{ lesson_id: string }>('SELECT lesson_id FROM lesson_progress').map((r) => r.lesson_id),
  );
}

export function markLessonComplete(lessonId: string) {
  markLessonsComplete([lessonId]);
}

export function markLessonsComplete(lessonIds: string[]) {
  const now = new Date().toISOString();
  db.withTransactionSync(() => {
    for (const id of lessonIds) {
      db.runSync('INSERT OR IGNORE INTO lesson_progress (lesson_id, completed_at) VALUES (?, ?)', id, now);
    }
  });
}

export function getLessonProgress(): BackupLesson[] {
  return db
    .getAllSync<{ lesson_id: string; completed_at: string }>('SELECT lesson_id, completed_at FROM lesson_progress')
    .map((r) => ({ lessonId: r.lesson_id, completedAt: r.completed_at }));
}

/**
 * Puts a backup onto this phone (a new phone, or after reinstalling). The example messages don't
 * come back, because they never left the old phone; importing the chat again restores them.
 */
export function restoreSnapshot(snapshot: ProgressSnapshot) {
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM vocab');
    const insert = db.prepareSync(
      `INSERT INTO vocab (text, kind, words, count, self_count, partner_count, score, examples)
       VALUES (?, ?, ?, ?, ?, ?, ?, '[]')`,
    );
    try {
      for (const p of snapshot.phrases) {
        insert.executeSync([p.text, p.kind, p.words, p.count, p.selfCount, p.partnerCount, p.score]);
      }
    } finally {
      insert.finalizeSync();
    }
    for (const l of snapshot.lessons) {
      db.runSync('INSERT OR IGNORE INTO lesson_progress (lesson_id, completed_at) VALUES (?, ?)', l.lessonId, l.completedAt);
    }
    for (const r of snapshot.reviews) {
      db.runSync('INSERT OR REPLACE INTO review_card (text, card, due) VALUES (?, ?, ?)', r.text, JSON.stringify(r.card), r.card.due);
    }
    for (const day of snapshot.activityDays) {
      db.runSync('INSERT OR IGNORE INTO activity_day (day) VALUES (?)', day);
    }
    if (snapshot.profile) {
      const summary: ImportSummary = {
        self: snapshot.profile.firstName ?? '',
        includePartner: snapshot.profile.includePartner,
        importedAt: snapshot.profile.importedAt,
        restoredFromBackup: true,
        stats: {
          totalMessages: 0,
          selfMessages: 0,
          partnerMessages: 0,
          firstMessageAt: null,
          lastMessageAt: null,
          uniqueWords: snapshot.phrases.length,
        },
      };
      db.runSync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', 'import', JSON.stringify(summary));
    }
  });
}

// --- Spaced review ---

export function getReviewCards(texts: string[]): Map<string, Card> {
  const cards = new Map<string, Card>();
  for (const row of db.getAllSync<{ text: string; card: string }>('SELECT text, card FROM review_card')) {
    if (texts.includes(row.text)) cards.set(row.text, fromStored(JSON.parse(row.card) as StoredCard));
  }
  return cards;
}

export function saveReviewCards(cards: Map<string, Card>) {
  db.withTransactionSync(() => {
    for (const [text, card] of cards) {
      db.runSync(
        'INSERT OR REPLACE INTO review_card (text, card, due) VALUES (?, ?, ?)',
        text,
        JSON.stringify(toStored(card)),
        card.due.toISOString(),
      );
    }
  });
}

/** Phrases due for review now, most overdue first. ISO dates in UTC sort as text. */
export function getDueTexts(now: Date): string[] {
  return db
    .getAllSync<{ text: string }>('SELECT text FROM review_card WHERE due <= ? ORDER BY due', now.toISOString())
    .map((r) => r.text);
}

export function recordActivityDay(day: string) {
  db.runSync('INSERT OR IGNORE INTO activity_day (day) VALUES (?)', day);
}

export function getActivityDays(): Set<string> {
  return new Set(db.getAllSync<{ day: string }>('SELECT day FROM activity_day').map((r) => r.day));
}

/** Every memory card, in storage form, for the backup. */
export function getStoredReviews(): BackupReview[] {
  return db
    .getAllSync<{ text: string; card: string }>('SELECT text, card FROM review_card')
    .map((r) => ({ text: r.text, card: JSON.parse(r.card) as StoredCard }));
}
