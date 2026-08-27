/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { analyzeChat, parseWhatsApp } from '../brain';
import { buildCurriculum } from './curriculum';
import { buildExercises, isGraded, toTeachable } from './exercises';
import { firstName } from './starter';

const vocab = analyzeChat(
  parseWhatsApp(readFileSync(join(__dirname, '../brain/__fixtures__/sample-ios.txt'), 'utf8')),
  { self: 'Sam' },
).vocab;

describe('Day 0, "Primeros pasos"', () => {
  const units = buildCurriculum(vocab, { starter: true, name: 'Sam' });
  const [day0, ...personal] = units;

  it('comes first, with six small lessons and a recap', () => {
    assert.equal(day0.label, 'Primeros pasos');
    assert.equal(day0.lessons.filter((l) => l.kind === 'lesson').length, 6);
    assert.equal(day0.lessons.at(-1)!.kind, 'checkpoint');
    assert.ok(day0.lessons.every((l) => l.id.startsWith('u0-')));
    assert.equal(personal[0].label, 'Day 1');
    assert.equal(personal[0].lessons[0].id, 'u1-l1');
  });

  it('has Spanish for every phrase', () => {
    const missing = day0.items.filter((item) => !toTeachable(item)).map((i) => i.text);
    assert.deepEqual(missing, []);
  });

  it('builds a full lesson for each step', () => {
    for (const lesson of day0.lessons.filter((l) => l.kind === 'lesson')) {
      const meets = buildExercises(lesson, vocab).filter((e) => e.kind === 'meet');
      assert.equal(meets.length, lesson.items.length, lesson.id);
    }
  });

  it('has enough graded questions for the 12-question test-out', () => {
    const recap = day0.lessons.at(-1)!;
    assert.ok(buildExercises(recap, vocab).filter(isGraded).length >= 12);
  });

  it('says "Me llamo" with the user\'s own name', () => {
    const item = day0.items.find((i) => i.text === 'my name is Sam');
    assert.equal(toTeachable(item!)?.t.es, 'Me llamo Sam');
  });

  it('teaches a basic once: in Day 0, with the user\'s own message', () => {
    const personalTexts = personal.flatMap((u) => u.items.map((i) => i.text));
    assert.ok(!personalTexts.includes('how are you'));
    const howAreYou = day0.items.find((i) => i.text === 'how are you')!;
    assert.ok(howAreYou.examples.length > 0);
  });
});

describe('firstName', () => {
  it('takes the first name and capitalizes it', () => {
    assert.equal(firstName('sam rivera'), 'Sam');
    assert.equal(firstName('Oluwalonimi Oyepariola'), 'Oluwalonimi');
  });

  it('skips phone numbers, emoji and empty names', () => {
    assert.equal(firstName('+44 7700 900123'), null);
    assert.equal(firstName('💛'), null);
    assert.equal(firstName(''), null);
    assert.equal(firstName(null), null);
  });

  it('leaves the name out of Day 0 when there is none', () => {
    const [day0] = buildCurriculum(vocab, { starter: true, name: null });
    assert.ok(!day0.items.some((i) => i.text.startsWith('my name is')));
  });
});
