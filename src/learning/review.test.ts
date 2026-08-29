/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Rating } from 'ts-fsrs';

import { dayKey, fromStored, gradeFrom, isDue, scheduleNext, streakLength, toStored } from './review';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date(2026, 9, 7, 9, 0);

describe('gradeFrom', () => {
  it('turns a lesson\'s answers into a grade', () => {
    assert.equal(gradeFrom(['correct', 'correct']), Rating.Good);
    assert.equal(gradeFrom(['correct', 'almost']), Rating.Hard);
    assert.equal(gradeFrom(['almost', 'wrong', 'correct']), Rating.Again);
    assert.equal(gradeFrom([]), Rating.Good); // only met, never tested
  });
});

describe('scheduleNext', () => {
  it('brings a new phrase back in days, not minutes', () => {
    const card = scheduleNext(null, Rating.Good, now);
    const days = (card.due.getTime() - now.getTime()) / DAY;
    assert.ok(days >= 1 && days <= 3, `due in ${days} days`);
  });

  it('spaces a phrase further each time it is remembered', () => {
    let card = scheduleNext(null, Rating.Good, now);
    const first = card.due.getTime() - now.getTime();
    card = scheduleNext(card, Rating.Good, card.due);
    const second = card.due.getTime() - card.last_review!.getTime();
    assert.ok(second > first, 'second gap should be longer');
  });

  it('brings a missed phrase back sooner than a remembered one', () => {
    const base = scheduleNext(scheduleNext(null, Rating.Good, now), Rating.Good, new Date(now.getTime() + 3 * DAY));
    const later = new Date(base.due);
    const remembered = scheduleNext(base, Rating.Good, later);
    const missed = scheduleNext(base, Rating.Again, later);
    assert.ok(missed.due < remembered.due);
  });

  it('round-trips through storage', () => {
    const card = scheduleNext(null, Rating.Good, now);
    assert.deepEqual(fromStored(JSON.parse(JSON.stringify(toStored(card)))), card);
    assert.ok(!isDue(card, now));
    assert.ok(isDue(card, new Date(card.due.getTime() + 1)));
  });
});

describe('streakLength', () => {
  const day = (offset: number) => dayKey(new Date(2026, 9, 7 + offset));

  it('counts days in a row ending today', () => {
    assert.equal(streakLength(new Set([day(0), day(-1), day(-2)]), now), 3);
  });

  it('keeps a streak alive until today is over', () => {
    assert.equal(streakLength(new Set([day(-1), day(-2)]), now), 2);
  });

  it('breaks after a missed day', () => {
    assert.equal(streakLength(new Set([day(0), day(-2), day(-3)]), now), 1);
    assert.equal(streakLength(new Set([day(-2)]), now), 0);
  });
});
