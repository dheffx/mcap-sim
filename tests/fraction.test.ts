import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { decimal, Fraction } from '../src/engine/fraction';

describe('exact rational arithmetic', () => {
  it.each([
    ['0.5', '1/2'], ['.5', '1/2'], ['2/4', '1/2'], [' -2 / -4 ', '1/2'],
    ['+3.50', '7/2'], ['-0.125', '-1/8'], ['0', '0'], ['4.', '4'],
    ['999999999999999999999999', '999999999999999999999999'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(Fraction.parse(input)?.toString()).toBe(expected);
  });

  it.each(['', ' ', '1/0', 'NaN', 'Infinity', '1e2', '1 1/2', '2 meters', '1,000', '--2', '1/2/3', '1'.repeat(81)])('rejects invalid input %j', input => {
    expect(Fraction.parse(input)).toBeNull();
  });

  it('rejects division by zero and unsafe integer components', () => {
    expect(() => new Fraction(1, 0)).toThrow();
    expect(() => new Fraction(1).div(new Fraction(0))).toThrow();
    expect(() => new Fraction(Number.MAX_SAFE_INTEGER + 1)).toThrow();
    expect(() => new Fraction(0.2)).toThrow();
  });

  it('does decimal arithmetic without floating-point error', () => {
    expect(Fraction.parse('0.1')!.add(Fraction.parse('0.2')!).toString()).toBe('3/10');
    expect(decimal(7, 3)).toBe('0.007');
    expect(decimal(1234, 2)).toBe('12.34');
  });

  it('satisfies exact rational algebra over random values', () => {
    fc.assert(fc.property(
      fc.integer({ min: -10000, max: 10000 }), fc.integer({ min: 1, max: 100 }),
      fc.integer({ min: -10000, max: 10000 }), fc.integer({ min: 1, max: 100 }),
      (a, b, c, d) => {
        const x = new Fraction(a, b), y = new Fraction(c, d);
        expect(x.add(y).sub(y).equals(x)).toBe(true);
        expect(x.mul(y).equals(y.mul(x))).toBe(true);
        if (c !== 0) expect(x.mul(y).div(y).equals(x)).toBe(true);
        expect(Fraction.parse(x.toString())!.equals(x)).toBe(true);
      },
    ), { numRuns: 1000 });
  });
});
