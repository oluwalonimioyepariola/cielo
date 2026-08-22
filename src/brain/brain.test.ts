/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { analyzeChat, parseWhatsApp } from './index';
import { createSpellingFixer, unstretch } from './normalize';

const fixture = (name: string) => readFileSync(join(__dirname, '__fixtures__', name), 'utf8');

describe('parseWhatsApp', () => {
  it('reads an iOS export: participants, skipped notices and placeholders', () => {
    const chat = parseWhatsApp(fixture('sample-ios.txt'));

    assert.deepEqual(
      chat.participants.map((p) => p.name),
      ['Sam', 'Alex Rivera'],
    );
    const texts = chat.messages.map((m) => m.text);
    assert.ok(!texts.some((t) => /encrypted|omitted|was deleted/i.test(t)));
  });

  it('joins multi-line messages and strips the edited marker', () => {
    const chat = parseWhatsApp(fixture('sample-ios.txt'));
    const texts = chat.messages.map((m) => m.text);

    assert.ok(texts.includes("I can't wait to see you this weekend\nCan't wait to see you!!\nSeriously can't wait"));
    assert.ok(texts.includes('Surprise me'));
  });

  it('parses day-first dates', () => {
    const chat = parseWhatsApp(fixture('sample-ios.txt'));
    const first = chat.messages[0].timestamp!;

    assert.equal(first.getFullYear(), 2024);
    assert.equal(first.getMonth(), 2); // March
    assert.equal(first.getDate(), 2);
  });

  it('reads an Android export with month-first dates and 12-hour times', () => {
    const chat = parseWhatsApp(fixture('sample-android.txt'));
    const late = chat.messages.find((m) => m.text.startsWith('See you tomorrow'))!;

    assert.equal(chat.skippedLines, 1);
    assert.equal(late.text, "See you tomorrow\nI'll bring the snacks");
    assert.equal(late.timestamp!.getDate(), 25);
    assert.equal(late.timestamp!.getHours(), 21);
    assert.equal(chat.messages.at(-1)!.timestamp!.getHours(), 0); // 12:05 AM
  });
});

describe('analyzeChat', () => {
  const chat = parseWhatsApp(fixture('sample-ios.txt'));
  const own = analyzeChat(chat, { self: 'Sam' });
  const texts = own.vocab.map((v) => v.text);

  it("ranks the user's everyday phrases first", () => {
    assert.equal(texts[0], 'did you eat');
    for (const phrase of ['on my way', 'i miss you', 'i love you', 'good morning', 'how are you']) {
      assert.ok(texts.includes(phrase), `missing "${phrase}"`);
    }
  });

  it('counts texting shorthand as the full phrase', () => {
    const onMyWay = own.vocab.find((v) => v.text === 'on my way')!;
    // "omw" ×2 + "on my way" ×2
    assert.equal(onMyWay.count, 4);
  });

  it('keeps whole phrases instead of overlapping fragments', () => {
    assert.ok(texts.includes("call me when you're free"));
    assert.ok(!texts.includes("call me when you're"));
    assert.ok(!texts.includes('good'));
  });

  it('never learns names, links or phone numbers', () => {
    const everything = own.vocab.flatMap((v) => [v.text, ...v.examples]).join(' ').toLowerCase();
    for (const leak of ['alex', 'kemi', 'example.com', '7700', 'https']) {
      assert.ok(!everything.includes(leak), `leaked "${leak}"`);
    }
  });

  it("ignores the other person's messages unless the user opts in", () => {
    assert.ok(own.vocab.every((v) => v.partnerCount === 0));

    const both = analyzeChat(chat, { self: 'Sam', includePartner: true });
    assert.ok(both.vocab.some((v) => v.partnerCount > 0));
  });

  it('rejects a name that is not in the chat', () => {
    assert.throws(() => analyzeChat(chat, { self: 'Jordan' }));
  });
});

describe('unstretch', () => {
  it('shrinks stretched words back to real ones', () => {
    assert.equal(unstretch('sooo'), 'so');
    assert.equal(unstretch('babyyy'), 'baby');
    assert.equal(unstretch('yesss'), 'yes');
    assert.equal(unstretch('goooood'), 'good');
    assert.equal(unstretch('missss'), 'miss');
    assert.equal(unstretch('see'), 'see');
  });
});

describe('createSpellingFixer', () => {
  const fix = createSpellingFixer(
    [
      'I love you',
      'see you soon',
      'hey there',
      'hey how are you',
      'Tell Kemi I said hi',
      'Kemi is coming too',
      'abeg come',
      'abeg call me',
      'abeg',
      'good night babe',
    ],
    ['alex', 'rivera'],
  );

  it('repairs stretched words', () => {
    assert.equal(fix('loooove'), 'love');
    assert.equal(fix('loooooveee'), 'love');
    assert.equal(fix('goooood'), 'good'); // not "god": the dictionary knows "good" is far more common
    assert.equal(fix('heyyyy'), 'hey');
    assert.equal(fix('sooo'), 'so');
    assert.equal(fix('lmaooo'), 'lmao');
    assert.equal(fix('babyyy'), 'baby');
  });

  it('fixes typos to common words', () => {
    assert.equal(fix('tommorow'), 'tomorrow');
    assert.equal(fix('becuase'), 'because');
    assert.equal(fix('beautful'), 'beautiful');
    assert.equal(fix('definately'), 'definitely');
    assert.equal(fix('loove'), 'love');
  });

  it('trims a doubled last letter only when the result is a real word', () => {
    assert.equal(fix('heyy'), 'hey');
    assert.equal(fix('noo'), 'no');
    assert.equal(fix('see'), 'see');
    assert.equal(fix('too'), 'too');
    assert.equal(fix('free'), 'free');
  });

  it('leaves names, protected words, real words and deliberate slang alone', () => {
    assert.equal(fix('kemi'), 'kemi'); // only ever typed capitalized mid-sentence
    assert.equal(fix('alex'), 'alex');
    assert.equal(fix('abeg'), 'abeg'); // typed 3 times: deliberate
    assert.equal(fix('babe'), 'babe');
    assert.equal(fix('omw'), 'omw'); // slang, expanded later
  });

  it('fixes habitual typos even when the user repeats them', () => {
    const habitual = createSpellingFixer(['that was wierd', 'so wierd', 'wierd day', 'wierd']);
    assert.equal(habitual('wierd'), 'weird');
  });
});
