import { Fraction } from './fraction';
import type { Item } from './types';

export function verifyChoiceQuality(item: Item): void {
  if (item.type !== 'mc') return;
  const choices = item.choices;
  if (!choices || new Set(choices.map(choice => choice.label)).size !== 4 ||
      choices.some(choice => choice.value !== item.key && (!choice.errorModel || !choice.misconception?.trim()))) {
    throw new Error(`Missing authored distractors or distinct labels for ${item.id}.`);
  }
  const key = Fraction.parse(item.key);
  if (!key) return;
  const wrong = choices.filter(choice => choice.value !== item.key).map(choice => {
    const value = Fraction.parse(choice.value);
    if (!value) throw new Error(`Mixed numeric and symbolic options in ${item.id}.`);
    return value;
  });
  if (!wrong.some(value => (value.d === 1n) === (key.d === 1n))) {
    throw new Error(`The answer is identifiable by integer/fraction format in ${item.id}.`);
  }
  if (key.n !== 0n && !wrong.some(value => (value.n < 0n) === (key.n < 0n) && value.n !== 0n)) {
    throw new Error(`The answer is identifiable by sign in ${item.id}.`);
  }
  if (item.data.kind === 'product') {
    const peers = wrong.filter(value => value.d === 1n && value.n % 10n === key.n % 10n &&
      value.n * 2n >= key.n && value.n <= key.n * 2n);
    if (peers.length < 2) throw new Error(`Multiplication needs two plausible same-units-digit alternatives in ${item.id}.`);
  }
}
