/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { analyzeChat, parseWhatsApp } from '../brain';
import type { VocabItem } from '../brain/types';
import { buildCurriculum, findLesson, lessonStates } from './curriculum';

const item = (text: string, score: number): VocabItem => ({
  text,
  kind: text.includes(' ') ? 'phrase' : 'word',
  words: text.split(' ').length,
  count: Math.round(score),
  selfCount: Math.round(score),
  partnerCount: 0,
  score,
  examples: [],
});

describe('buildCurriculum', () => {
  const sample = analyzeChat(
    parseWhatsApp(readFileSync(join(__dirname, '../brain/__fixtures__/sample-ios.txt'), 'utf8')),
    { self: 'Sam' },
  ).vocab;
  const units = buildCurriculum(sample);

  it('uses every phrase exactly once', () => {
    const taught = units.flatMap((u) => u.items.map((i) => i.text));
    assert.equal(taught.length, sample.length);
    assert.equal(new Set(taught).size, sample.length);
  });

  it('starts with the most-used phrase', () => {
    assert.equal(units[0].lessons[0].items[0].text, sample[0].text);
  });

  it('keeps lessons small and ends every unit with a checkpoint', () => {
    for (const unit of units) {
      const lessons = unit.lessons.filter((l) => l.kind === 'lesson');
      assert.ok(lessons.every((l) => l.items.length >= 2 && l.items.length <= 6));
      assert.equal(unit.lessons.at(-1)!.kind, 'checkpoint');
      assert.equal(unit.lessons.at(-1)!.items.length, unit.items.length);
    }
  });

  it('makes each lesson one topic', () => {
    const food = ['did you eat', 'did you eat lunch', "i'm hungry"].map((t, i) => item(t, 50 - i));
    const night = ['good night', 'sweet dreams', 'sleep well'].map((t, i) => item(t, 40 - i));
    const [day] = buildCurriculum([...night, ...food]);
    const [first, second] = day.lessons;
    assert.equal(first.topic?.title, 'Food talk');
    assert.equal(first.topic?.es, 'La comida');
    assert.deepEqual(first.items.map((i) => i.text), ['did you eat', 'did you eat lunch', "i'm hungry"]);
    assert.equal(second.topic?.title, 'Saying goodnight');
  });

  it('pools one-phrase topics into their family before "Everyday words"', () => {
    const [day] = buildCurriculum([item('good morning', 30), item('good night', 29), item('random thing', 28), item('other stuff', 27)]);
    const titles = day.lessons.filter((l) => l.kind === 'lesson').map((l) => l.topic?.title);
    assert.deepEqual(titles, ['Hellos and goodnights', 'Everyday words']);
  });

  it('is stable: the same words give the same lesson ids', () => {
    const again = buildCurriculum(sample);
    assert.deepEqual(
      again.flatMap((u) => u.lessons.map((l) => l.id)),
      units.flatMap((u) => u.lessons.map((l) => l.id)),
    );
  });
});

describe('lessonStates', () => {
  const units = buildCurriculum(Array.from({ length: 20 }, (_, i) => item(`phrase number ${i}`, 100 - i)));
  const ids = units.flatMap((u) => u.lessons.map((l) => l.id));

  it('unlocks only the first lesson at the start', () => {
    const states = lessonStates(units, new Set());
    assert.equal(states.get(ids[0]), 'current');
    assert.ok(ids.slice(1).every((id) => states.get(id) === 'locked'));
  });

  it('moves the current lesson forward one at a time', () => {
    const states = lessonStates(units, new Set([ids[0], ids[1]]));
    assert.deepEqual([ids[0], ids[1], ids[2], ids[3]].map((id) => states.get(id)), ['done', 'done', 'current', 'locked']);
  });

  it('finds a lesson by id', () => {
    assert.equal(findLesson(units, ids[1])?.lesson.id, ids[1]);
    assert.equal(findLesson(units, 'nope'), null);
  });
});
