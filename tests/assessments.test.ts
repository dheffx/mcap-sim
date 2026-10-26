import { createHash } from 'node:crypto';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import katex from 'katex';
import { assessments } from '../src/engine/assessments';
import { answerLabel, distribution, generateTest, isCorrect, makeCode } from '../src/engine/assemble';
import { Fraction } from '../src/engine/fraction';
import { allTemplates } from '../src/engine/templates';
import type { ProblemData } from '../src/engine/types';
import { verifyItem } from '../src/engine/verify';
import { Figure } from '../src/ui/components';
import { TestSetup } from '../src/ui/TestSetup';

const additions = assessments.filter(assessment => assessment.id !== 'g5');
const seeds = fc.array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-'), { minLength: 1, maxLength: 40 }).map(parts => parts.join(''));

describe('four registered practice assessments', () => {
  it('registers all forms with distinct, fully covered template slots', () => {
    expect(assessments.map(assessment => assessment.id)).toEqual(['g5', 'g8', 'g5-mstar', 'alg1']);
    expect(allTemplates).toHaveLength(70);
    expect(new Set(allTemplates.map(template => template.id)).size).toBe(70);
    for (const assessment of assessments) {
      expect(assessment.status).toBe('available');
      const blueprint = assessment.blueprint!;
      expect(blueprint.provenance.status).toBe('practice');
      expect(blueprint.provenance.note).toContain('app-defined');
      expect(new Set(blueprint.slots).size).toBe(20);
      expect(blueprint.slots.every(id => allTemplates.some(template => template.id === id))).toBe(true);
    }
    expect(new Set(assessments.map(assessment => makeCode('SAME-SEED', assessment.id))).size).toBe(4);
  });

  it.each(assessments)('shows the selected $id assessment and enables all four options', assessment => {
    const html = renderToStaticMarkup(createElement(TestSetup, {
      initialAssessmentId: assessment.id,
      initialSeed: 'SETUP',
      onPrepare: () => {},
    }));
    expect(html).toContain(`value="${assessment.id}" selected=""`);
    expect(html.match(/<option /g)).toHaveLength(4);
    expect(html).not.toContain('<option disabled');
  });

  it.each(additions)('maintains $id quotas, exact grading, rendering, and deterministic output', assessment => {
    fc.assert(fc.property(seeds, seed => {
      const test = generateTest(makeCode(seed, assessment.id));
      expect(generateTest(test.code)).toEqual(test);
      const report = distribution(test);
      expect(report.categories.map(category => category.actual)).toEqual(test.blueprint.categories.map(category => category.count));
      expect(report.types).toEqual({ mc: 10, numeric: 10 });
      expect(report.difficulties.map(entry => entry.count)).toEqual([6, 10, 4]);
      expect(report.points).toBe(20);
      for (const item of test.items) {
        verifyItem(item);
        expect(() => verifyItem({ ...item, key: '999999999' })).toThrow('Independent verification');
        expect(isCorrect(item, '')).toBe(false);
        expect(isCorrect(item, 'nonsense')).toBe(false);
        if (item.type === 'numeric') {
          const key = Fraction.parse(item.key)!;
          expect(isCorrect(item, `${2n * key.n}/${2n * key.d}`)).toBe(true);
          expect(isCorrect(item, key.add(new Fraction(1)).toString())).toBe(false);
        } else {
          expect(answerLabel(item)).toBeTruthy();
          for (const choice of item.choices!) {
            expect(isCorrect(item, choice.id)).toBe(choice.value === item.key);
            expect(choice.misconception === null).toBe(choice.value === item.key);
            if (!choice.text && item.data.kind !== 'shape') expect(() => katex.renderToString(choice.label, { throwOnError: true })).not.toThrow();
          }
        }
        if (item.math) expect(() => katex.renderToString(item.math!, { throwOnError: true })).not.toThrow();
        if (item.figure) {
          const html = renderToStaticMarkup(createElement(Figure, { figure: item.figure }));
          expect(html).toContain('role="img"');
          expect(html).toContain('aria-label=');
          expect(html).not.toMatch(/NaN|Infinity|undefined/);
          if (item.figure.kind === 'graph') {
            expect(item.figure.points.flat().every(value => value >= -6 && value <= 8)).toBe(true);
            if (item.data.kind === 'association') expect(item.figure.points).toEqual(item.data.points);
            if (item.data.kind === 'linearValue') {
              const { slope, intercept } = item.data;
              expect(item.figure.points.every(([x, y]) => y === slope * x + intercept)).toBe(true);
            }
          }
        }
      }
    }), { numRuns: 250 });
  }, 30000);

  it('maps reused MSTAR content into its own reporting categories', () => {
    const test = generateTest(makeCode('CATEGORIES', 'g5-mstar'));
    expect(test.items.filter(item => item.category === 'content')).toHaveLength(10);
    expect(test.items.filter(item => item.category === 'modeling')).toHaveLength(6);
    expect(test.items.filter(item => item.category === 'reasoning')).toHaveLength(4);
    expect(test.items.find(item => item.templateId === 'g.classify')?.category).toBe('content');
  });

  it('supports negative numeric options and both inequality directions', () => {
    const items = Array.from({ length: 30 }, (_, index) => generateTest(makeCode(`SIGNS-${index}`, 'alg1')).items).flat();
    const inequalities = items.filter(item => item.data.kind === 'inequality');
    expect(inequalities.some(item => item.key.startsWith('>:'))).toBe(true);
    expect(inequalities.some(item => item.key.startsWith('<:'))).toBe(true);
    expect(items.some(item => item.choices?.some(choice => (Fraction.parse(choice.value)?.n ?? 0n) < 0n))).toBe(true);
    expect(items.some(item => item.type === 'numeric' && Fraction.parse(item.key)!.d > 1n)).toBe(true);
  });

  it('pins the new v1 assessment outputs', () => {
    const hashes = additions.map(assessment => ({
      assessment: assessment.id,
      hash: createHash('sha256').update(JSON.stringify(generateTest(makeCode('BAYTRAIL', assessment.id)))).digest('hex'),
    }));
    expect(hashes).toMatchInlineSnapshot(`
      [
        {
          "assessment": "g8",
          "hash": "74b7ffd394ed569f0efc9b862107917b0718fb8a57447fc3913ef7379b7362f2",
        },
        {
          "assessment": "g5-mstar",
          "hash": "ac0e1545e0f20081fb8732d3850e0ffafe3f616b7cb623dbc4f587fc89125bb7",
        },
        {
          "assessment": "alg1",
          "hash": "490bb267b79e5640b227c1f22b956fad1edd1501ff48c8ba454a4a77c2ea87fe",
        },
      ]
    `);
  });
});

describe('independent solvers for new mathematical structures', () => {
  const base = generateTest(makeCode('SOLVERS', 'alg1')).items.find(item => item.type === 'numeric')!;
  const examples: { data: ProblemData; key: string }[] = [
    { data: { kind: 'root', radicand: -125, degree: 3, power: 1 }, key: '-5' },
    { data: { kind: 'root', radicand: 125, degree: 3, power: 2 }, key: '25' },
    { data: { kind: 'root', radicand: 0, degree: 2, power: 1 }, key: '0' },
    { data: { kind: 'repeating', digit: 6 }, key: '2/3' },
    { data: { kind: 'exponentSum', a: -4, b: 3 }, key: '-1' },
    { data: { kind: 'scientific', coefficient: 23, places: 1, exponent: 4 }, key: '23000' },
    { data: { kind: 'linearEquation', a: -4, b: 2, c: 8 }, key: '-3/2' },
    { data: { kind: 'distributedEquation', a: 3, b: 4, c: 2, d: 7 }, key: '-5' },
    { data: { kind: 'slope', x1: -2, y1: 5, x2: 2, y2: -3 }, key: '-2' },
    { data: { kind: 'system', a: 2, b: 3, c: -1, d: 3, e: 3, f: 0, variable: 'y' }, key: '-1' },
    { data: { kind: 'linearValue', slope: -3, intercept: 2, input: 4 }, key: '-10' },
    { data: { kind: 'rateDifference', first: 7, second: 3 }, key: '4' },
    { data: { kind: 'pythagorean', a: 5, b: 12 }, key: '13' },
    { data: { kind: 'distance', x1: -3, y1: -4, x2: 0, y2: 0 }, key: '5' },
    { data: { kind: 'dilation', x: -3, factor: 4 }, key: '-12' },
    { data: { kind: 'triangleAngle', a: 45, b: 65 }, key: '70' },
    { data: { kind: 'cylinder', radius: 3, height: 4 }, key: '36' },
    { data: { kind: 'conditionalRate', successes: 6, other: 9 }, key: '2/5' },
    { data: { kind: 'polynomialSum', left: [1, -3, 2], right: [4, 5, 1], degree: 1 }, key: '2' },
    { data: { kind: 'polynomialProduct', p: 3, q: 5 }, key: '8' },
    { data: { kind: 'factorization', sum: 7, product: 10 }, key: 'factor:2,5' },
    { data: { kind: 'quadratic', a: 1, b: 2, c: -15 }, key: '3' },
    { data: { kind: 'inequality', a: -2, b: 6, c: 14 }, key: '>:-4' },
    { data: { kind: 'trapezoidHeight', area: 42, firstBase: 5, secondBase: 9 }, key: '6' },
    { data: { kind: 'polynomialValue', coefficients: [-2, 3, 2], input: -3 }, key: '7' },
    { data: { kind: 'averageRate', coefficients: [5, 3, 2], first: -2, second: 1 }, key: '1' },
    { data: { kind: 'exponential', initial: 5, factor: 3, periods: 4 }, key: '405' },
    { data: { kind: 'vertex', a: 3, h: -4, k: -7 }, key: '-7' },
    { data: { kind: 'xIntercept', slope: -3, intercept: 12 }, key: '4' },
    { data: { kind: 'mean', values: [4, 5, 6, 7] }, key: '11/2' },
    { data: { kind: 'median', values: [9, 2, 8, 1] }, key: '5' },
    { data: { kind: 'association', points: [[1, 6], [2, 4], [3, 2]] }, key: 'negative' },
    { data: { kind: 'gardenArea', length: 7, widthNumerator: 5, widthDenominator: 3 }, key: '35/3' },
    { data: { kind: 'purchase', units: 3, priceCents: 125, feeCents: 50 }, key: '17/4' },
    { data: { kind: 'trips', people: 31, capacity: 10 }, key: '4' },
    { data: { kind: 'combinedVolume', first: [2, 3, 4], second: [3, 4, 5] }, key: '84' },
    { data: { kind: 'placeRatio', power: 3 }, key: '1000' },
    { data: { kind: 'fractionMistake', a: 1, b: 3, c: 2, d: 5 }, key: 'common-denominator' },
    { data: { kind: 'fractionScale', numerator: 5, denominator: 3 }, key: 'greater' },
  ];

  it.each(examples)('independently solves $data.kind', ({ data, key }) => {
    expect(() => verifyItem({ ...base, data, key })).not.toThrow();
    expect(() => verifyItem({ ...base, data, key: '999999999' })).toThrow('Independent verification');
  });

  it('rejects inexact roots, singular systems, and nonexistent minima', () => {
    expect(() => verifyItem({ ...base, data: { kind: 'root', radicand: 2, degree: 2, power: 1 }, key: '1' })).toThrow('exact integer root');
    expect(() => verifyItem({ ...base, data: { kind: 'root', radicand: -4, degree: 2, power: 1 }, key: '-2' })).toThrow('negative radicand');
    expect(() => verifyItem({ ...base, data: { kind: 'system', a: 1, b: 1, c: 2, d: 2, e: 2, f: 4, variable: 'x' }, key: '1' })).toThrow('exactly one solution');
    expect(() => verifyItem({ ...base, data: { kind: 'vertex', a: -1, h: 2, k: 3 }, key: '3' })).toThrow('minimum');
  });
});
