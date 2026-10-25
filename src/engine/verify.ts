import { Fraction } from './fraction';
import type { Item, ProblemData } from './types';

// Re-solve from the displayed problem's source data, without template helpers.
function solve(data: ProblemData): readonly [bigint, bigint] | 'square' {
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
  }
}

export function verifyItem(item: Item): void {
  const solved = solve(item.data);
  const key = Fraction.parse(item.key);
  const valid = solved === 'square'
    ? item.key === 'square'
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
