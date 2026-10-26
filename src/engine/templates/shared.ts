import { Fraction } from '../fraction';
import type { Rng } from '../rng';
import type { Draft } from '../types';

export const f = (n: number, d = 1) => new Fraction(n, d);

export function polynomial(coefficients: readonly number[], variable = 'x'): string {
  let result = '';
  for (let degree = coefficients.length - 1; degree >= 0; degree--) {
    const value = coefficients[degree]!;
    if (value === 0) continue;
    const magnitude = Math.abs(value);
    const coefficient = degree > 0 && magnitude === 1 ? '' : String(magnitude);
    const power = degree === 0 ? '' : degree === 1 ? variable : `${variable}^{${degree}}`;
    result += `${value < 0 ? result ? ' - ' : '-' : result ? ' + ' : ''}${coefficient}${power}`;
  }
  return result || '0';
}

export function associationDraft(rng: Rng): Draft {
  const positive = rng.pick([true, false]);
  const points: [number, number][] = Array.from({ length: 5 }, (_, i) => {
    const x = i + 1;
    return [x, (positive ? x + 1 : 7 - x) + rng.int(0, 1)];
  });
  return {
    prompt: 'The scatter plot shows two measured quantities. Which description best matches their association?',
    figure: { kind: 'graph', points, connect: false },
    data: { kind: 'association', points },
    answer: positive ? 'positive' : 'negative',
    solution: `As x increases, y generally ${positive ? 'increases' : 'decreases'}. This is a ${positive ? 'positive' : 'negative'} association; it does not by itself establish causation.`,
    choices: [
      { value: 'positive', label: 'Positive association', text: true, misconception: positive ? null : 'Positive association means both quantities tend to increase together. Here y falls as x increases.' },
      { value: 'negative', label: 'Negative association', text: true, misconception: positive ? 'Negative association means one quantity tends to decrease as the other increases. Here both tend to rise.' : null },
      { value: 'none', label: 'No association', text: true, misconception: 'The points show a clear directional pattern, not a random cloud.' },
      { value: 'constant', label: 'The y-value is constant', text: true, misconception: 'The y-values change across the graph; they do not all lie on a horizontal line.' },
    ],
  };
}
