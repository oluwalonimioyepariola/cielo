/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { analyzeChat, parseWhatsApp } from '../../brain';
import { PHRASES, WORDS } from './entries';
import { normalizeKey, translate } from './index';

const all = [...PHRASES, ...WORDS];

describe('phrase bank entries', () => {
  it('has no duplicate keys', () => {
    const keys = all.map((e) => normalizeKey(e.en));
    const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
    assert.deepEqual(dupes, []);
  });

  it('stores keys in the same form the brain produces', () => {
    for (const entry of all) assert.equal(entry.en, normalizeKey(entry.en), `"${entry.en}"`);
  });

  it('opens Spanish questions and exclamations properly', () => {
    for (const { es, alts = [] } of all) {
      for (const text of [es, ...alts.map(([a]) => a)]) {
        if (text.endsWith('?')) assert.ok(text.includes('¿'), `missing ¿ in "${text}"`);
        if (text.endsWith('!')) assert.ok(text.includes('¡'), `missing ¡ in "${text}"`);
        // Catches gender-helper slips like "cansadoo" and stray double spaces.
        assert.ok(!/(?:oo|aa)\b|\s{2}/.test(text), `malformed "${text}"`);
      }
    }
  });

  it('builds gendered pairs correctly', () => {
    assert.deepEqual(translate("i'm tired"), {
      es: 'Estoy cansado',
      alts: [{ es: 'Estoy cansada', when: "if you're a woman" }],
      note: undefined,
    });
    assert.equal(translate('are you awake')?.es, '¿Estás despierto?');
    assert.equal(translate('are you awake')?.alts[0].es, '¿Estás despierta?');
  });
});

describe('translate', () => {
  it('matches regardless of case, curly apostrophes and punctuation', () => {
    assert.equal(translate('Did you eat?')?.es, '¿Ya comiste?');
    assert.equal(translate('I’m on my way!')?.es, 'Voy en camino');
  });

  it('returns null for phrases the bank does not know', () => {
    assert.equal(translate('the quarterly earnings call'), null);
  });

  it("covers the sample chat's top phrases", () => {
    const vocab = analyzeChat(
      parseWhatsApp(readFileSync(join(__dirname, '../../brain/__fixtures__/sample-ios.txt'), 'utf8')),
      { self: 'Sam' },
    ).vocab;
    const top = vocab.slice(0, 10).map((v) => v.text);
    const missing = top.filter((t) => !translate(t));
    assert.deepEqual(missing, []);
  });
});
