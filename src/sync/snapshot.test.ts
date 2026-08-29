/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { VocabItem } from '../brain/types';
import { buildSnapshot, parseSnapshot, type BackupReview } from './snapshot';

const item: VocabItem = {
  text: 'did you eat',
  kind: 'phrase',
  words: 3,
  count: 5,
  selfCount: 5,
  partnerCount: 0,
  score: 10,
  examples: ['Did you eat? I miss you Alex'],
};
const lesson = { lessonId: 'u1-l1', completedAt: '2026-10-07T10:00:00.000Z' };
const profile = { firstName: 'Sam', includePartner: false, importedAt: '2026-10-06T09:00:00.000Z' };
const review: BackupReview = {
  text: 'did you eat',
  card: {
    due: '2026-10-09T10:00:00.000Z',
    stability: 2.3,
    difficulty: 5.1,
    elapsed_days: 0,
    scheduled_days: 2,
    learning_steps: 0,
    reps: 1,
    lapses: 0,
    state: 2,
    last_review: '2026-10-07T10:00:00.000Z',
  },
};

describe('buildSnapshot', () => {
  it('never includes example messages', () => {
    const snapshot = buildSnapshot([item], [lesson], profile);
    assert.ok(!JSON.stringify(snapshot).includes('Alex'));
    assert.ok(!('examples' in snapshot.phrases[0]));
  });
});

describe('parseSnapshot', () => {
  const valid = buildSnapshot([item], [lesson], profile);

  it('accepts a snapshot the phone built', () => {
    assert.deepEqual(parseSnapshot(JSON.parse(JSON.stringify(valid))), valid);
  });

  it('drops any field it does not know, so chat text cannot ride along', () => {
    const sneaky = { ...valid, phrases: [{ ...valid.phrases[0], examples: ['secret message'] }], chat: 'whole chat' };
    const parsed = parseSnapshot(sneaky)!;
    assert.ok(!JSON.stringify(parsed).includes('secret'));
    assert.ok(!('chat' in parsed));
  });

  it('rejects malformed input', () => {
    assert.equal(parseSnapshot(null), null);
    assert.equal(parseSnapshot({ phrases: 'nope', lessons: [] }), null);
    assert.equal(parseSnapshot({ ...valid, lessons: [{ lessonId: 'drop table', completedAt: lesson.completedAt }] }), null);
    assert.equal(parseSnapshot({ ...valid, phrases: [{ ...valid.phrases[0], count: -1 }] }), null);
    assert.equal(parseSnapshot({ ...valid, profile: { ...profile, importedAt: 'yesterday-ish' } }), null);
  });

  it('rejects oversized uploads', () => {
    const huge = { ...valid, phrases: Array.from({ length: 2001 }, (_, i) => ({ ...valid.phrases[0], text: `p${i}` })) };
    assert.equal(parseSnapshot(huge), null);
  });

  it('keeps one row per phrase', () => {
    const twice = { ...valid, phrases: [valid.phrases[0], valid.phrases[0]] };
    assert.equal(parseSnapshot(twice)!.phrases.length, 1);
  });

  it('carries memory cards and streak days', () => {
    const full = buildSnapshot([item], [lesson], profile, [review], ['2026-10-06', '2026-10-07']);
    assert.deepEqual(parseSnapshot(JSON.parse(JSON.stringify(full))), full);
  });

  it('still accepts an older backup without them', () => {
    const { reviews: _r, activityDays: _a, ...older } = valid;
    const parsed = parseSnapshot(older)!;
    assert.deepEqual(parsed.reviews, []);
    assert.deepEqual(parsed.activityDays, []);
  });

  it('rejects malformed memory cards and days', () => {
    const badState = { ...review, card: { ...review.card, state: 9 } };
    assert.equal(parseSnapshot({ ...valid, reviews: [badState] }), null);
    assert.equal(parseSnapshot({ ...valid, reviews: [{ ...review, card: { ...review.card, due: 'soon' } }] }), null);
    assert.equal(parseSnapshot({ ...valid, activityDays: ['yesterday'] }), null);
  });
});
