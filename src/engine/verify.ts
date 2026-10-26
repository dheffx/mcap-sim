import { Fraction } from './fraction';
import type { Item, ProblemData } from './types';

function exactRoot(value: bigint, degree: number): bigint {
  if (value < 0n) {
    if (degree % 2 === 0) throw new Error('An even real root cannot have a negative radicand.');
    return -exactRoot(-value, degree);
  }
  let low = 0n, high = value + 1n;
  while (low + 1n < high) {
    const middle = (low + high) / 2n;
    if (middle ** BigInt(degree) <= value) low = middle;
    else high = middle;
  }
  if (low ** BigInt(degree) !== value) throw new Error('Expected an exact integer root.');
  return low;
}

function evaluate(coefficients: readonly number[], input: bigint): bigint {
  let value = 0n;
  for (let i = coefficients.length - 1; i >= 0; i--) value = value * input + BigInt(coefficients[i]!);
  return value;
}

// Re-solve from the displayed problem's source data, without template helpers.
function solve(data: ProblemData): readonly [bigint, bigint] | string {
  const n = BigInt;
  switch (data.kind) {
    case 'product': return [n(data.a) * n(data.b), 1n];
    case 'quotient': return [n(data.dividend), n(data.divisor)];
    case 'decimal':
      if (data.operation === 'multiply') return [n(data.a) * n(data.b), n(data.scale) ** 2n];
      return [data.operation === 'add' ? n(data.a) + n(data.b) : n(data.a) - n(data.b), n(data.scale)];
    case 'place': {
      const digit = Math.floor(data.value / 10 ** (3 - data.position)) % 10;
      return [n(digit), 10n ** n(data.position)];
    }
    case 'fraction':
      if (data.operation === 'multiply') return [n(data.a) * n(data.c), n(data.b) * n(data.d)];
      return [
        data.operation === 'add' ? n(data.a) * n(data.d) + n(data.c) * n(data.b) : n(data.a) * n(data.d) - n(data.c) * n(data.b),
        n(data.b) * n(data.d),
      ];
    case 'unitDivision':
      return data.unitFirst ? [1n, n(data.denominator) * n(data.whole)] : [n(data.whole) * n(data.denominator), 1n];
    case 'expression': return [n(data.a) * n(data.c) + n(data.b) * n(data.c), 1n];
    case 'pattern': {
      let term = n(data.start);
      for (let index = 1; index < data.index; index++) term += n(data.step);
      return [term, 1n];
    }
    case 'volume': {
      if (data.missingHeight) return [n(data.volume), n(data.length) * n(data.width)];
      let cubes = 0n;
      for (let layer = 0; layer < data.height; layer++) cubes += n(data.length) * n(data.width);
      return [cubes, 1n];
    }
    case 'conversion': return [n(data.quantity) * n(data.factor), 1n];
    case 'plot': {
      let sum = 0n;
      for (let i = 0; i < data.counts.length; i++) sum += n(data.counts[i]!) * n(i + 1);
      return [sum, n(data.denominator)];
    }
    case 'coordinate': return [n(data.x), 1n];
    case 'shape':
      if (data.equalSides !== 4 || data.rightAngles !== 4) throw new Error('Unsupported shape properties.');
      return 'square';
    case 'root': return [exactRoot(n(data.radicand), data.degree) ** n(data.power), 1n];
    case 'repeating': return [n(data.digit), 9n];
    case 'exponentSum': return [n(data.a) + n(data.b), 1n];
    case 'scientific': return [n(data.coefficient) * 10n ** n(data.exponent), 10n ** n(data.places)];
    case 'linearEquation': return [n(data.c) - n(data.b), n(data.a)];
    case 'distributedEquation': return [n(data.d) - n(data.a) * n(data.b), n(data.a) - n(data.c)];
    case 'slope': return [n(data.y2) - n(data.y1), n(data.x2) - n(data.x1)];
    case 'system': {
      const determinant = n(data.a) * n(data.e) - n(data.b) * n(data.d);
      if (determinant === 0n) throw new Error('A system must have exactly one solution.');
      return data.variable === 'x'
        ? [n(data.c) * n(data.e) - n(data.b) * n(data.f), determinant]
        : [n(data.a) * n(data.f) - n(data.c) * n(data.d), determinant];
    }
    case 'linearValue': return [n(data.slope) * n(data.input) + n(data.intercept), 1n];
    case 'rateDifference': return [n(data.first) - n(data.second), 1n];
    case 'pythagorean': return [exactRoot(n(data.a) ** 2n + n(data.b) ** 2n, 2), 1n];
    case 'distance': return [exactRoot((n(data.x2) - n(data.x1)) ** 2n + (n(data.y2) - n(data.y1)) ** 2n, 2), 1n];
    case 'dilation': return [n(data.x) * n(data.factor), 1n];
    case 'triangleAngle': return [180n - n(data.a) - n(data.b), 1n];
    case 'cylinder': return [n(data.radius) ** 2n * n(data.height), 1n];
    case 'association': {
      const count = n(data.points.length);
      let sumX = 0n, sumY = 0n, products = 0n;
      for (const [x, y] of data.points) {
        sumX += n(x);
        sumY += n(y);
        products += n(x) * n(y);
      }
      const direction = count * products - sumX * sumY;
      if (direction !== 0n) return direction > 0n ? 'positive' : 'negative';
      return data.points.every(point => point[1] === data.points[0]?.[1]) ? 'constant' : 'none';
    }
    case 'conditionalRate': return [n(data.successes), n(data.successes) + n(data.other)];
    case 'polynomialSum': return [n(data.left[data.degree] ?? 0) + n(data.right[data.degree] ?? 0), 1n];
    case 'polynomialProduct': {
      const first = [n(data.p), 1n], second = [n(data.q), 1n];
      let coefficient = 0n;
      for (let i = 0; i < first.length; i++) {
        for (let j = 0; j < second.length; j++) {
          if (i + j === 1) coefficient += first[i]! * second[j]!;
        }
      }
      return [coefficient, 1n];
    }
    case 'factorization':
      for (let factor = 1; factor <= data.sum; factor++) {
        const other = data.sum - factor;
        if (other >= factor && factor * other === data.product) return `factor:${factor},${other}`;
      }
      throw new Error('Quadratic has no expected positive integer factorization.');
    case 'quadratic': {
      const discriminant = n(data.b) ** 2n - 4n * n(data.a) * n(data.c);
      const root = exactRoot(discriminant, 2), denominator = 2n * n(data.a);
      const positive = [-n(data.b) + root, -n(data.b) - root].filter(value => value * denominator > 0n);
      if (positive.length !== 1) throw new Error('Expected exactly one positive quadratic solution.');
      return [positive[0]!, denominator];
    }
    case 'inequality': {
      if (data.a === 0) throw new Error('An inequality must have a nonzero x coefficient.');
      const boundary = new Fraction(n(data.c) - n(data.b), n(data.a)).toString();
      return `${data.a < 0 ? '>' : '<'}:${boundary}`;
    }
    case 'trapezoidHeight': return [2n * n(data.area), n(data.firstBase) + n(data.secondBase)];
    case 'polynomialValue': return [evaluate(data.coefficients, n(data.input)), 1n];
    case 'averageRate': return [
      evaluate(data.coefficients, n(data.second)) - evaluate(data.coefficients, n(data.first)),
      n(data.second) - n(data.first),
    ];
    case 'exponential': {
      let result = n(data.initial);
      for (let period = 0; period < data.periods; period++) result *= n(data.factor);
      return [result, 1n];
    }
    case 'vertex': {
      const a = n(data.a), b = -2n * a * n(data.h), c = a * n(data.h) ** 2n + n(data.k);
      if (a <= 0n) throw new Error('The quadratic must have a minimum.');
      return [4n * a * c - b * b, 4n * a];
    }
    case 'xIntercept': return [-n(data.intercept), n(data.slope)];
    case 'mean': return [data.values.reduce((total, value) => total + n(value), 0n), n(data.values.length)];
    case 'median': {
      const values = [...data.values].sort((a, b) => a - b), middle = Math.floor(values.length / 2);
      if (!values.length) throw new Error('A median needs at least one value.');
      return values.length % 2 === 0 ? [n(values[middle - 1]!) + n(values[middle]!), 2n] : [n(values[middle]!), 1n];
    }
    case 'gardenArea': return [n(data.length) * n(data.widthNumerator), n(data.widthDenominator)];
    case 'purchase': return [n(data.units) * n(data.priceCents) + n(data.feeCents), 100n];
    case 'trips': return [(n(data.people) + n(data.capacity) - 1n) / n(data.capacity), 1n];
    case 'combinedVolume': return [
      data.first.reduce((volume, side) => volume * n(side), 1n) + data.second.reduce((volume, side) => volume * n(side), 1n), 1n,
    ];
    case 'placeRatio': return [10n ** n(data.power), 1n];
    case 'fractionMistake': {
      const actual = (n(data.a) * n(data.d) + n(data.c) * n(data.b)) * (n(data.b) + n(data.d));
      const claimed = (n(data.a) + n(data.c)) * n(data.b) * n(data.d);
      if (actual === claimed) throw new Error('The claimed fraction sum must be wrong.');
      return 'common-denominator';
    }
    case 'fractionScale': return data.numerator < data.denominator ? 'less' : data.numerator > data.denominator ? 'greater' : 'equal';
  }
}

export function verifyItem(item: Item): void {
  const solved = solve(item.data);
  const key = Fraction.parse(item.key);
  const valid = typeof solved === 'string'
    ? item.key === solved
    : key !== null && solved[1] !== 0n && solved[0] * key.d === key.n * solved[1];
  if (!valid) throw new Error(`Independent verification failed for ${item.id}.`);
  if (!item.prompt.trim() || !item.solution.trim() || /NaN|Infinity|undefined|\{\{/.test(JSON.stringify(item))) {
    throw new Error(`Invalid content in ${item.id}.`);
  }
  if (item.type === 'mc') {
    const choices = item.choices;
    if (!choices || choices.length !== 4 || new Set(choices.map(choice => choice.id)).size !== 4 ||
        new Set(choices.map(choice => choice.value)).size !== 4 ||
        choices.filter(choice => choice.value === item.key).length !== 1) {
      throw new Error(`Invalid multiple-choice options for ${item.id}.`);
    }
    const equivalent = choices.filter(choice => {
      const value = Fraction.parse(choice.value);
      return key && value ? key.equals(value) : choice.value === item.key;
    });
    if (equivalent.length !== 1) throw new Error(`Ambiguous options for ${item.id}.`);
  }
}
