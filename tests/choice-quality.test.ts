import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { assessments } from '../src/engine/assessments';
import { generateTest, makeCode } from '../src/engine/assemble';
import { verifyChoiceQuality } from '../src/engine/choice-quality';
import { Fraction } from '../src/engine/fraction';
import { Rng } from '../src/engine/rng';
import { allTemplates } from '../src/engine/templates';
import { generateReviewedDraft } from '../src/engine/templates/reviewed';
import type { Item } from '../src/engine/types';
import { verifyItem } from '../src/engine/verify';

const forms = assessments.flatMap(assessment =>
  Array.from({ length: 200 }, (_, seed) => generateTest(makeCode(`QUALITY-${seed}`, assessment.id, 'v2'))),
);
const items = forms.flatMap(form => form.items).filter(item => item.type === 'mc');
const numeric = (value: string) => {
  const result = Fraction.parse(value);
  if (!result) throw new Error(`Expected a number, got ${value}.`);
  return result;
};

describe('reviewed multiple-choice content', () => {
  it('covers all 35 MC templates with explicit mistake models, specific feedback, and shuffled keys', () => {
    const templates = allTemplates.filter(template => template.type === 'mc');
    expect(templates).toHaveLength(35);
    for (const template of templates) {
      const examples = items.filter(item => item.templateId === template.id);
      expect(examples.length).toBeGreaterThanOrEqual(200);
      expect(new Set(examples.map(item => item.choices!.find(choice => choice.value === item.key)!.id)).size).toBe(4);
      for (const item of examples) {
        verifyChoiceQuality(item);
        for (const choice of item.choices!) {
          if (choice.value === item.key) expect(choice.misconception).toBeNull();
          else {
            expect(choice.errorModel).toMatch(/^[a-z0-9-]+$/);
            expect(choice.misconception!.length).toBeGreaterThan(30);
            expect(choice.misconception).not.toMatch(/Recheck the operation|nearby value/i);
          }
        }
      }
    }
  });

  it('uses actual multiplication algorithm mistakes, with two comparable same-final-digit competitors', () => {
    for (const item of items.filter(item => item.data.kind === 'product')) {
      if (item.data.kind !== 'product') throw new Error('Expected multiplication.');
      const { a, b } = item.data, key = a * b;
      const expected = new Set<number>();
      for (const [left, right] of [[a, b], [b, a]]) {
        const ones = right! % 10, tens = Math.floor(right! / 10);
        expected.add(left! * (ones + tens));
        expected.add(left! * ones);
        expected.add(left! * tens * 10);
        expected.add(left! * tens * 100 + left! * ones);
        for (const [digit, place] of [[ones, 10], [tens, 100]]) {
          const carry = Math.floor((left! % 10) * digit! / 10);
          if (carry) { expected.add(key - carry * place!); expected.add(key + carry * place!); }
        }
        const carry = Math.floor((Math.floor(left! * ones / 10) % 10 + left! * tens % 10) / 10);
        if (carry) { expected.add(key - 100); expected.add(key + 100); }
      }
      const wrong = item.choices!.filter(choice => choice.value !== item.key).map(choice => Number(numeric(choice.value).n));
      expect(wrong.every(value => expected.has(value))).toBe(true);
      expect(wrong.filter(value => value % 10 === key % 10 && value >= key / 2 && value <= key * 2).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('does not assign a numeric template one fixed answer rank across seeds', () => {
    const ranks = new Map<string, Set<number>>();
    for (const item of items) {
      const key = Fraction.parse(item.key);
      if (!key) continue;
      const rank = item.choices!.filter(choice => {
        const value = numeric(choice.value);
        return value.n * key.d < key.n * value.d;
      }).length;
      if (!ranks.has(item.templateId)) ranks.set(item.templateId, new Set());
      ranks.get(item.templateId)!.add(rank);
    }
    for (const [template, values] of ranks) expect(values.size, template).toBeGreaterThan(1);
  });

  it('keeps money and decimal addition options at uniform two-place precision', () => {
    for (const item of items.filter(item => item.data.kind === 'purchase' || item.data.kind === 'decimal')) {
      expect(item.choices!.every(choice => /^\d+\.\d{2}$/.test(choice.label))).toBe(true);
      for (const choice of item.choices!) expect(numeric(choice.label).equals(numeric(choice.value))).toBe(true);
    }
  });

  it('makes factoring require the middle coefficient, not just constant or sign matching', () => {
    const factors = items.filter(item => item.data.kind === 'factorization');
    expect(factors.some(item => item.key.includes(':-'))).toBe(true);
    expect(factors.some(item => !item.key.includes(':-'))).toBe(true);
    for (const item of factors) {
      if (item.data.kind !== 'factorization') throw new Error('Expected factoring.');
      for (const choice of item.choices!) {
        const [a, b] = choice.value.slice(7).split(',').map(Number);
        expect(a! * b!).toBe(item.data.product);
        expect(Math.sign(a! + b!)).toBe(Math.sign(item.data.sum));
        expect(a! + b! === item.data.sum).toBe(choice.value === item.key);
      }
    }
  });

  it('balances inequality endpoints and directions without an inclusive-boundary giveaway', () => {
    for (const item of items.filter(item => item.data.kind === 'inequality')) {
      const choices = item.choices!;
      expect(choices.filter(choice => choice.value.startsWith('<:'))).toHaveLength(2);
      expect(choices.filter(choice => choice.value.startsWith('>:'))).toHaveLength(2);
      const boundaries = choices.map(choice => choice.value.split(':')[1]);
      expect(new Set(boundaries).size).toBe(2);
      for (const boundary of boundaries) expect(boundaries.filter(value => value === boundary)).toHaveLength(2);
    }
  });

  it('uses nonuniform median sets whose mean is different, with wrong answers inside the data range', () => {
    for (const item of items.filter(item => item.data.kind === 'median')) {
      if (item.data.kind !== 'median') throw new Error('Expected median.');
      const { values } = item.data;
      expect(new Set(values).size).toBe(6);
      expect(new Fraction(values.reduce((sum, value) => sum + value, 0), values.length).equals(numeric(item.key))).toBe(false);
      for (const choice of item.choices!) {
        const value = numeric(choice.value);
        expect(value.n >= BigInt(Math.min(...values)) * value.d).toBe(true);
        expect(value.n <= BigInt(Math.max(...values)) * value.d).toBe(true);
      }
    }
  });

  it('varies association answers and coordinate signs while keeping plotted data independently verifiable', () => {
    const plots = items.filter(item => item.data.kind === 'association');
    expect(new Set(plots.map(item => item.key))).toEqual(new Set(['positive', 'negative', 'none']));
    expect(plots.some(item => item.data.kind === 'association' && item.data.points.some(point => point[1] < 0))).toBe(true);
    for (const item of plots) {
      verifyItem(item);
      expect(item.prompt).toContain('linear association');
      expect(item.choices!.find(choice => choice.value === 'none')!.label).toContain('linear');
    }
  });

  it('never fills an impossible reviewed item with generic offsets', () => {
    const template = allTemplates.find(entry => entry.id === 'nbt.multiply')!;
    let draws = 0;
    expect(() => generateReviewedDraft({
      ...template, id: 'impossible-carries',
      generate() {
        draws++;
        return { prompt: '10 × 10', data: { kind: 'product', a: 10, b: 10 }, answer: new Fraction(100), solution: '100' };
      },
    }, new Rng('REJECTION'))).toThrow('impossible-carries after 100 parameter draws');
    expect(draws).toBe(100);
  });

  it('rejects missing error models, ambiguous label formatting, and multiplication shortcuts', () => {
    const item = items.find(entry => entry.data.kind === 'product')!;
    const badModels = item.choices!.map(choice => ({ ...choice, errorModel: undefined }));
    expect(() => verifyChoiceQuality({ ...item, choices: badModels })).toThrow('authored distractors');
    const badLabels = item.choices!.map(choice => ({ ...choice, label: 'same' }));
    expect(() => verifyChoiceQuality({ ...item, choices: badLabels })).toThrow('distinct labels');
    const easy: Item = {
      ...item, data: { kind: 'product', a: 25, b: 20 }, key: '500',
      choices: [500, 499, 501, 502].map((value, index) => ({
        id: String(index), value: String(value), label: String(value),
        misconception: index ? 'A deliberately weak nearby-number choice.' : null, errorModel: 'fake-model',
      })),
    };
    expect(() => verifyChoiceQuality(easy)).toThrow('same-units-digit');
  });

  it('pins reviewed v2 output separately from the unchanged v1 fixtures', () => {
    const hashes = assessments.map(assessment => ({
      assessment: assessment.id,
      hash: createHash('sha256').update(JSON.stringify(generateTest(makeCode('BAYTRAIL', assessment.id, 'v2')))).digest('hex'),
    }));
    expect(hashes).toMatchInlineSnapshot(`
      [
        {
          "assessment": "g5",
          "hash": "2dab7360ed105695e4a967ea40ba62b349b870bf8d7c6021ba2a2a0624bc5857",
        },
        {
          "assessment": "g8",
          "hash": "472474b9f2abef2939d161712781dafd71d33587813fdfd8851b2274f674e065",
        },
        {
          "assessment": "g5-mstar",
          "hash": "2180fea11443fb40e61337ee7c9ca3f2166259d00debb745466242f734fbd085",
        },
        {
          "assessment": "alg1",
          "hash": "6358367fc68292f3d5eaeaa9d11cc38a0e53a58266a4e70e548aa7521e3f2995",
        },
      ]
    `);
  });
});
