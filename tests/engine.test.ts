import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import katex from 'katex';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { answerLabel, assertDistribution, distribution, generateTest, isCorrect, makeCode } from '../src/engine/assemble';
import { grade5 } from '../src/engine/blueprint/g5';
import { Fraction } from '../src/engine/fraction';
import { Rng, slotRng } from '../src/engine/rng';
import { templates } from '../src/engine/templates/g5';
import { verifyItem } from '../src/engine/verify';
import { Figure } from '../src/ui/components';

const seedArbitrary = fc.array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-'), { minLength: 1, maxLength: 40 }).map(characters => characters.join(''));

describe('versioned codes and reproducibility', () => {
  it('normalizes seeds but pins assessment, blueprint, and generator versions', () => {
    expect(makeCode(' baytrail ')).toBe('BAYTRAIL.g5.p1.v1');
    expect(generateTest('baytrail.g5.p1.v1')).toEqual(generateTest('BAYTRAIL.g5.p1.v1'));
    expect(generateTest(' baytrail .g5.p1.v1')).toEqual(generateTest('BAYTRAIL.g5.p1.v1'));
  });

  it.each(['', 'a.b', 'a/b', 'a b', 'x'.repeat(41), '🙂'])('rejects unsupported seeds %j', seed => {
    expect(() => makeCode(seed)).toThrow();
  });

  it.each([
    'BAYTRAIL', 'BAYTRAIL.g5.p1.v0', 'BAYTRAIL.g5.b2022.v1',
    'BAYTRAIL.g8.p1.v1', 'BAYTRAIL.alg1.p1.v1', 'BAYTRAIL.g5.p1.v1.extra',
  ])('does not silently regenerate unsupported code %s', code => {
    expect(() => generateTest(code)).toThrow();
  });

  it('keeps independent slot and option streams isolated', () => {
    const first = slotRng('S.g5.p1.v1', 0);
    const expected = slotRng('S.g5.p1.v1', 1).int(0, 1000000);
    for (let i = 0; i < 100; i++) first.int(0, 10);
    expect(slotRng('S.g5.p1.v1', 1).int(0, 1000000)).toBe(expected);
    expect(slotRng('S.g5.p1.v1', 0, 'options').int(0, 1000000))
      .not.toBe(slotRng('S.g5.p1.v1', 0).int(0, 1000000));
  });

  it('handles valid RNG ranges and refuses malformed ranges', () => {
    const rng = new Rng('bounds');
    expect(rng.int(7, 7)).toBe(7);
    expect(() => rng.int(2, 1)).toThrow();
    expect(() => rng.int(0.1, 1)).toThrow();
    expect(() => rng.int(0, Infinity)).toThrow();
    expect(() => rng.pick([])).toThrow();
    expect(rng.shuffle([1, 2, 3]).slice().sort()).toEqual([1, 2, 3]);
  });

  it('freezes v1 output: changes require a deliberate generator version bump', () => {
    const hashes = ['BAYTRAIL', 'MARYLAND', 'FRACTIONS-42'].map(seed =>
      createHash('sha256').update(JSON.stringify(generateTest(makeCode(seed)))).digest('hex'),
    );
    expect(hashes).toMatchInlineSnapshot(`
      [
        "d7e0a0577d87937819e540103202116c280b412a89c92d427649896ccc6351c1",
        "baef9503fd2163df0dbaa2e04722f5cdea1c720c10bac5ea99c8ceb5867e8182",
        "461a9498eb8f0f590cb8e1c5809fc5973a8a6760bf6bfafeffe5de6786b8ee7a",
      ]
    `);
  });
});

describe('blueprint-driven assembly and independent verification', () => {
  it('is honest about the unverified official blueprint', () => {
    expect(grade5.provenance.status).toBe('practice');
    expect(grade5.provenance.note).toContain('not an official MCAP blueprint');
    expect(new Set(grade5.slots).size).toBe(20);
    expect(templates).toHaveLength(20);
  });

  it('maintains exact quotas, renders every figure, and grades every generated key', () => {
    fc.assert(fc.property(seedArbitrary, seed => {
      const test = generateTest(makeCode(seed));
      expect(generateTest(test.code)).toEqual(test);
      const report = distribution(test);
      expect(report.types).toEqual({ mc: 10, numeric: 10 });
      expect(report.difficulties.map(entry => entry.count)).toEqual([6, 10, 4]);
      expect(report.points).toBe(20);
      expect(report.categories.map(entry => entry.actual)).toEqual([6, 6, 2, 4, 2]);
      for (const item of test.items) {
        verifyItem(item);
        expect(isCorrect(item, '')).toBe(false);
        expect(isCorrect(item, 'nonsense')).toBe(false);
        expect(isCorrect(item, item.type === 'mc' ? 'Z' : '1/0')).toBe(false);
        if (item.type === 'mc') {
          for (const choice of item.choices!) {
            expect(isCorrect(item, choice.id)).toBe(choice.value === item.key);
            if (item.data.kind !== 'shape') {
              expect(() => katex.renderToString(choice.label, { throwOnError: true })).not.toThrow();
              expect(Fraction.parse(choice.value)!.n >= 0n).toBe(true);
            }
          }
          expect(answerLabel(item)).toBeTruthy();
        } else {
          expect(isCorrect(item, item.key)).toBe(true);
          const key = Fraction.parse(item.key)!;
          expect(isCorrect(item, `${key.n * 2n}/${key.d * 2n}`)).toBe(true);
          expect(isCorrect(item, key.add(new Fraction(1)).toString())).toBe(false);
        }
        if (item.math) expect(() => katex.renderToString(item.math!, { throwOnError: true })).not.toThrow();
        if (item.figure) {
          const svg = renderToStaticMarkup(createElement(Figure, { figure: item.figure }));
          expect(svg).toContain('role="img"');
          expect(svg).toContain('aria-label=');
          expect(svg).not.toMatch(/NaN|Infinity|undefined/);
        }
      }
    }), { numRuns: 250 });
  }, 30000);

  it('refuses a corrupted answer key, ambiguous choices, and bad quotas', () => {
    const test = generateTest(makeCode('CORRUPTION'));
    const numeric = test.items.find(item => item.type === 'numeric')!;
    expect(() => verifyItem({ ...numeric, key: '-123456789' })).toThrow('Independent verification');
    const mc = test.items.find(item => item.type === 'mc')!;
    expect(() => verifyItem({ ...mc, choices: [mc.choices![0]!, mc.choices![0]!, ...mc.choices!.slice(2)] })).toThrow('options');
    expect(() => assertDistribution({ ...test, items: test.items.slice(1) })).toThrow('blueprint');
  });

  it('varies content and option ordering across seeds', () => {
    const first = generateTest(makeCode('FIRST'));
    const second = generateTest(makeCode('SECOND'));
    expect(first.items.filter((item, index) => JSON.stringify(item.data) !== JSON.stringify(second.items[index]!.data)).length).toBeGreaterThan(15);
    const positions = new Set(Array.from({ length: 20 }, (_, i) => {
      const item = generateTest(makeCode(`POSITION${i}`)).items[0]!;
      return item.choices!.find(choice => choice.value === item.key)!.id;
    }));
    expect(positions.size).toBe(4);
  });
});
