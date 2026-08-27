/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { analyzeChat, parseWhatsApp } from '../brain';
import { buildCurriculum } from './curriculum';
import { acceptedSpanish, buildExercises, type Exercise } from './exercises';
import { gradeTiles, gradeTyped, toTiles } from './grading';

describe('gradeTyped', () => {
  const answers = ['¿Ya comiste?'];

  it('ignores case, punctuation and ¿ ¡', () => {
    assert.equal(gradeTyped('ya comiste', answers).verdict, 'correct');
    assert.equal(gradeTyped('YA COMISTE!!', answers).verdict, 'correct');
  });

  it('accepts missing accents, with a hint', () => {
    const grade = gradeTyped('como estas', ['¿Cómo estás?']);
    assert.equal(grade.verdict, 'almost');
    assert.equal(grade.hint, 'Mind the accents');
    assert.equal(grade.expected, '¿Cómo estás?');
  });

  it('forgives a small typo in longer answers only', () => {
    assert.equal(gradeTyped('ya comste', answers).verdict, 'almost');
    assert.equal(gradeTyped('hla', ['Hola']).verdict, 'wrong');
  });

  it('accepts any correct form', () => {
    assert.equal(gradeTyped('estoy cansada', ['Estoy cansado', 'Estoy cansada']).verdict, 'correct');
  });

  it('rejects a different phrase', () => {
    assert.equal(gradeTyped('buenos dias', answers).verdict, 'wrong');
    assert.equal(gradeTyped('', answers).verdict, 'wrong');
  });
});

describe('gradeTiles', () => {
  it('checks word order without punctuation', () => {
    assert.deepEqual(toTiles('¿Ya comiste?'), ['ya', 'comiste']);
    assert.equal(gradeTiles(['ya', 'comiste'], ['¿Ya comiste?']).verdict, 'correct');
    assert.equal(gradeTiles(['comiste', 'ya'], ['¿Ya comiste?']).verdict, 'wrong');
  });
});

describe('buildExercises', () => {
  const vocab = analyzeChat(
    parseWhatsApp(readFileSync(join(__dirname, '../brain/__fixtures__/sample-ios.txt'), 'utf8')),
    { self: 'Sam' },
  ).vocab;
  const units = buildCurriculum(vocab);
  const lesson = units[0].lessons[0];
  const exercises = buildExercises(lesson, vocab);

  it('introduces every phrase before practising it', () => {
    const met = new Set<string>();
    for (const ex of exercises) {
      if (ex.kind === 'meet') met.add(ex.item.en);
      else if ('item' in ex) assert.ok(met.has(ex.item.en), `"${ex.item.en}" practised before it was introduced`);
    }
    assert.equal(met.size, lesson.items.length);
  });

  it('gives choice exercises exactly one correct option among unique choices', () => {
    for (const ex of exercises) {
      if (ex.kind !== 'pick-spanish' && ex.kind !== 'pick-english') continue;
      assert.equal(new Set(ex.options).size, ex.options.length);
      const correct = ex.kind === 'pick-spanish' ? acceptedSpanish(ex.item) : [ex.item.en];
      assert.equal(ex.options.filter((o) => correct.includes(o)).length, 1);
    }
  });

  it('gives build exercises every word of the answer plus spares', () => {
    for (const ex of exercises.filter((e): e is Extract<Exercise, { kind: 'build' }> => e.kind === 'build')) {
      const words = toTiles(ex.item.t.es);
      for (const w of words) assert.ok(ex.tiles.includes(w));
      assert.ok(ex.tiles.length > words.length);
    }
  });

  it('is the same every time a lesson opens', () => {
    assert.deepEqual(buildExercises(lesson, vocab), exercises);
  });

  it('builds a checkpoint without introductions', () => {
    const checkpoint = units[0].lessons.at(-1)!;
    const review = buildExercises(checkpoint, vocab);
    assert.ok(review.length >= checkpoint.items.length);
    assert.ok(review.every((e) => e.kind !== 'meet'));
  });
});
