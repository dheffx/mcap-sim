import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { assessments } from '../src/engine/assessments';
import { generateTest, makeCode } from '../src/engine/assemble';
import { verifyChoiceQuality } from '../src/engine/choice-quality';
import { Fraction } from '../src/engine/fraction';
import { allTemplates } from '../src/engine/templates';
import type { ProblemData } from '../src/engine/types';
import { verifyItem } from '../src/engine/verify';

const forms = assessments.flatMap(assessment => Array.from({ length: 150 }, (_, index) =>
  generateTest(makeCode(`VARIETY-${index}`, assessment.id, 'v3'))));
const items = forms.flatMap(form => form.items);
const byTemplate = (id: string) => items.filter(item => item.templateId === id);

describe('seeded v3 question variety', () => {
  it('varies authored setups for every one of the 70 skill templates, not just their numbers', () => {
    for (const template of allTemplates) {
      const examples = byTemplate(template.id);
      expect(examples.length, template.id).toBeGreaterThanOrEqual(150);
      expect.soft(new Set(examples.map(item => item.variantId)).size, template.id).toBeGreaterThan(1);
      const structures = new Set(examples.map(item =>
        `${item.prompt}|${item.math ?? ''}`.replace(/-?\d+([./]\d+)?/g, '#')));
      expect.soft(structures.size, template.id).toBeGreaterThan(1);
      for (const item of examples) {
        expect(item.variantId).toMatch(new RegExp(`^${template.id.replaceAll('.', '\\.')}\\.`));
        expect(item.type).toBe(template.type);
        expect(item.standard).toBe(template.standard);
        expect(item.difficulty).toBe(template.difficulty);
        verifyItem(item);
        verifyChoiceQuality(item);
      }
    }
  });

  it('shuffles complete forms deterministically without losing slots, quotas, or response IDs', () => {
    for (const assessment of assessments) {
      const examples = forms.filter(form => form.code.split('.')[1] === assessment.id).slice(0, 20);
      expect(new Set(examples.map(form => form.items.map(item => item.templateId).join(','))).size).toBe(20);
      expect(new Set(examples.map(form => form.items[0]!.templateId)).size).toBeGreaterThan(4);
      for (const form of examples) {
        expect(generateTest(form.code)).toEqual(form);
        expect(form.items.map(item => item.id)).toEqual(Array.from({ length: 20 }, (_, i) => `q${i + 1}`));
        expect(form.items.filter(item => item.type === 'mc')).toHaveLength(10);
        expect(new Set(form.items.map(item => item.templateId))).toEqual(new Set(form.blueprint.slots));
      }
    }
  });

  it('replaces append-zero conversion questions with six mixed-unit, two-step families', () => {
    const conversions = byTemplate('md.conversion');
    expect(new Set(conversions.map(item => item.variantId)).size).toBe(6);
    expect(new Set(conversions.map(item => item.unit)).size).toBe(5);
    expect(conversions.some(item => Fraction.parse(item.key)!.d > 1n)).toBe(true);
    const operations = new Set<string>(), targets = new Set<number>();
    for (const item of conversions) {
      if (item.data.kind !== 'measurement') throw new Error('Expected a structured mixed-unit question.');
      expect(item.data.amounts).toHaveLength(2);
      expect(new Set(item.data.amounts.map(amount => amount.unitFactor)).size).toBe(2);
      expect(Fraction.parse(item.key)!.n > 0n).toBe(true);
      expect(item.prompt).not.toContain('How many grams of paper is this');
      operations.add(item.data.operation);
      targets.add(item.data.targetFactor);
    }
    expect(operations).toEqual(new Set(['add', 'subtract']));
    expect(targets).toEqual(new Set([1, 100, 1000]));
  });

  it('varies unknown dimensions, coordinate axes, shape classes, and geometry tasks', () => {
    expect(new Set(byTemplate('md.missing-height').map(item => item.data.kind === 'volume' ? item.data.missing : 'invalid')))
      .toEqual(new Set(['length', 'width', 'height']));
    expect(new Set(byTemplate('g.coordinate').map(item => item.data.kind === 'coordinate' ? item.data.axis : 'invalid')))
      .toEqual(new Set(['x', 'y']));
    expect(new Set(byTemplate('g.classify').map(item => item.key)))
      .toEqual(new Set(['square', 'rectangle', 'rhombus', 'parallelogram']));
    expect(new Set(byTemplate('g8.pythagorean').map(item => item.data.kind === 'rightTriangle' ? item.data.target : 'invalid')))
      .toEqual(new Set(['leg', 'hypotenuse']));
    expect(new Set(byTemplate('g8.angle').map(item => item.data.kind))).toEqual(new Set(['triangleAngle', 'triangleExterior']));
    expect(new Set(byTemplate('g8.cylinder').map(item => item.data.kind === 'cylinderMeasure' ? item.data.target : 'volume')))
      .toEqual(new Set(['radius', 'height', 'volume']));
  });

  it('varies algebra operations and requested quantities rather than only equation constants', () => {
    expect(new Set(byTemplate('g8.exponents').map(item => item.data.kind === 'exponentRule' ? item.data.operation : 'invalid')))
      .toEqual(new Set(['multiply', 'divide', 'power']));
    expect(new Set(byTemplate('alg1.inequality').map(item => item.data.kind === 'inequality' ? item.data.symbol : 'invalid')))
      .toEqual(new Set(['<', '>', '<=', '>=']));
    expect(new Set(byTemplate('alg1.quadratic').map(item => item.data.kind === 'quadratic' ? item.data.root : 'invalid')))
      .toEqual(new Set(['positive', 'negative']));
    expect(new Set(byTemplate('alg1.vertex').map(item => item.data.kind === 'vertex' ? `${item.data.extremum}-${item.data.target}` : 'invalid')).size).toBe(4);
    expect(new Set(byTemplate('alg1.function-value').map(item => item.variantId)).size).toBe(3);
    expect(new Set(byTemplate('alg1.mean').map(item => item.data.kind))).toEqual(new Set(['mean', 'missingMean']));
    expect(new Set(byTemplate('alg1.median').map(item => item.data.kind === 'median' ? item.data.values.length : 0)))
      .toEqual(new Set([6, 7]));
    expect(new Set(byTemplate('alg1.exponential').map(item => item.data.kind === 'exponential' && (item.data.factorDenominator ?? 1) > 1)))
      .toEqual(new Set([true, false]));
    expect(new Set(byTemplate('g8.scientific').map(item => item.data.kind === 'scientific' && item.data.exponent < 0)))
      .toEqual(new Set([true, false]));
  });

  it('does not give away applied multiplication by displaying its operation in the stem', () => {
    for (const item of byTemplate('nbt.multiply')) {
      expect(item.math).toBeUndefined();
      expect(item.solution).not.toContain('pencils');
    }
    for (const item of byTemplate('g8.initial-value')) {
      expect(item.choices!.some(choice => choice.misconception?.includes('marked point'))).toBe(false);
    }
  });

  it('pins v3 outputs without replacing earlier version goldens', () => {
    expect(assessments.map(assessment => ({
      assessment: assessment.id,
      hash: createHash('sha256').update(JSON.stringify(generateTest(makeCode('BAYTRAIL', assessment.id, 'v3')))).digest('hex'),
    }))).toMatchInlineSnapshot(`
      [
        {
          "assessment": "g5",
          "hash": "6cb465ac88ce0651a6857898c391037e0b6e4874cd2c60fb584d7d5113ff119e",
        },
        {
          "assessment": "g8",
          "hash": "a68789891dc1256e0fa93b82b49a905e91df86f276dbd5e32ef48badb71dd6c2",
        },
        {
          "assessment": "g5-mstar",
          "hash": "678ba243430df9916b80ff62e27462767daf64ccd20663d13c439eb2232f19b3",
        },
        {
          "assessment": "alg1",
          "hash": "e4ad7879e8a755e3af8713fc2518f6d6083abbc89c587aeae281609def166ffc",
        },
      ]
    `);
  });
});

describe('independent verification of alternate mathematical tasks', () => {
  const base = items.find(item => item.type === 'numeric')!;
  const examples: { data: ProblemData; key: string }[] = [
    { data: { kind: 'measurement', amounts: [{ value: 250, scale: 100, unitFactor: 1000 }, { value: 375, scale: 1, unitFactor: 1 }], targetFactor: 1000, operation: 'add' }, key: '23/8' },
    { data: { kind: 'measurement', amounts: [{ value: 325, scale: 100, unitFactor: 100 }, { value: 180, scale: 1, unitFactor: 1 }], targetFactor: 100, operation: 'subtract' }, key: '29/20' },
    { data: { kind: 'rightTriangle', first: 5, second: 13, target: 'leg' }, key: '12' },
    { data: { kind: 'rightTriangle', first: 5, second: 12, target: 'hypotenuse' }, key: '13' },
    { data: { kind: 'cylinderMeasure', coefficient: 75, known: 5, target: 'height' }, key: '3' },
    { data: { kind: 'cylinderMeasure', coefficient: 75, known: 3, target: 'radius' }, key: '5' },
    { data: { kind: 'quadrilateral', allSidesEqual: false, rightAngles: true, oppositeSidesParallel: true }, key: 'rectangle' },
    { data: { kind: 'quadrilateral', allSidesEqual: true, rightAngles: false, oppositeSidesParallel: true }, key: 'rhombus' },
    { data: { kind: 'exponentRule', a: -2, b: 3, operation: 'divide' }, key: '-5' },
    { data: { kind: 'exponentRule', a: -2, b: 3, operation: 'power' }, key: '-6' },
    { data: { kind: 'triangleExterior', a: 35, b: 65 }, key: '100' },
    { data: { kind: 'missingMean', known: [4, 8, 9, 11], meanNumerator: 8, meanDenominator: 1 }, key: '8' },
    { data: { kind: 'coordinate', x: 2, y: 5, axis: 'y' }, key: '5' },
    { data: { kind: 'scientific', coefficient: 25, places: 1, exponent: -3 }, key: '1/400' },
    { data: { kind: 'volume', length: 5, width: 4, height: 3, volume: 60, missingHeight: true, missing: 'length' }, key: '5' },
    { data: { kind: 'dilation', x: -3, factor: 1, denominator: 2 }, key: '-3/2' },
    { data: { kind: 'polynomialProduct', p: -3, q: 5, degree: 0 }, key: '-15' },
    { data: { kind: 'quadratic', a: 1, b: 2, c: -15, root: 'negative' }, key: '-5' },
    { data: { kind: 'inequality', a: -2, b: 1, c: 7, symbol: '>=' }, key: '<=:-3' },
    { data: { kind: 'exponential', initial: 81, factor: 1, factorDenominator: 3, periods: 4 }, key: '1' },
    { data: { kind: 'vertex', a: -3, h: -2, k: 7, extremum: 'maximum', target: 'input' }, key: '-2' },
    { data: { kind: 'vertex', a: -3, h: -2, k: 7, extremum: 'maximum', target: 'value' }, key: '7' },
    { data: { kind: 'combinedVolume', first: [4, 4, 4], second: [2, 2, 2], operation: 'subtract' }, key: '56' },
    { data: { kind: 'placeRatio', power: 2, inverse: true }, key: '1/100' },
    { data: { kind: 'fractionMistake', a: 1, b: 3, c: 1, d: 4, claimNumerator: 2, claimDenominator: 12 }, key: 'common-denominator' },
  ];
  it.each(examples)('independently solves $data.kind ($key)', ({ data, key }) => {
    verifyItem({ ...base, data, key });
    expect(() => verifyItem({ ...base, data, key: '999999999' })).toThrow('Independent verification');
  });

  it('rejects truncated radius calculations, invalid unit scales, and a student claim that is actually correct', () => {
    expect(() => verifyItem({ ...base, data: { kind: 'cylinderMeasure', coefficient: 13, known: 3, target: 'radius' }, key: '2' })).toThrow('exact radius squared');
    expect(() => verifyItem({ ...base, data: { kind: 'measurement', amounts: [{ value: 3, scale: 0, unitFactor: 100 }], targetFactor: 1, operation: 'add' }, key: '3' })).toThrow('scales must be positive');
    expect(() => verifyItem({ ...base, data: { kind: 'fractionMistake', a: 1, b: 3, c: 1, d: 4, claimNumerator: 7, claimDenominator: 12 }, key: 'common-denominator' })).toThrow('must be wrong');
    expect(() => verifyItem({ ...base, data: { kind: 'quadrilateral', allSidesEqual: false, rightAngles: false, oppositeSidesParallel: false }, key: 'parallelogram' })).toThrow('quadrilateral properties');
  });
});
