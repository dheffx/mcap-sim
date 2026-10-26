import { decimal, Fraction, latex } from '../fraction';
import type { ChoiceDraft, Draft, Template } from '../types';
import type { Rng } from '../rng';

const f = (n: number, d = 1) => new Fraction(n, d);
const names = ['Maya', 'Jordan', 'Avery', 'Sam', 'Alex'] as const;

function decimalDraft(rng: Rng, operation: 'add' | 'subtract' | 'multiply'): Draft {
  const a = rng.int(200, 900);
  const b = rng.int(11, 99);
  const left = f(a, 100);
  const right = f(b, 100);
  const answer = operation === 'add' ? left.add(right) : operation === 'subtract' ? left.sub(right) : left.mul(right);
  const symbol = operation === 'add' ? '+' : operation === 'subtract' ? '-' : '\\times';
  return {
    prompt: 'What is the value of this expression?',
    math: `${decimal(a, 2)} ${symbol} ${decimal(b, 2)}`,
    data: { kind: 'decimal', a, b, scale: 100, operation },
    answer,
    solution: operation === 'multiply'
      ? `Multiply ${a} by ${b} to get ${a * b}. The factors have four decimal places altogether, so divide by 10,000. The exact answer is ${answer}.`
      : `Line up the decimal points and ${operation === 'add' ? 'add' : 'subtract'} hundredths: ${a} ${operation === 'add' ? '+' : '-'} ${b} = ${operation === 'add' ? a + b : a - b} hundredths. This equals ${answer}.`,
    distractors: [
      { value: operation === 'multiply' ? f(a * b, 100) : f(operation === 'add' ? a + b : a - b, 10), misconception: 'Keep track of place value. These numbers are hundredths, not tenths; a product needs the decimal places of both factors.' },
    ],
  };
}

function fractionDraft(rng: Rng, operation: 'add' | 'subtract' | 'multiply'): Draft {
  const b = rng.pick([3, 4, 5, 6]);
  const d = rng.pick([7, 8, 9, 10]);
  const a = operation === 'subtract' ? b + rng.int(1, b - 1) : rng.int(1, b - 1);
  const c = rng.int(1, d - 1);
  const left = f(a, b);
  const right = f(c, d);
  const answer = operation === 'add' ? left.add(right) : operation === 'subtract' ? left.sub(right) : left.mul(right);
  const symbol = operation === 'add' ? '+' : operation === 'subtract' ? '-' : '\\times';
  return {
    prompt: 'What is the value of this expression? Give your answer as a fraction or a decimal.',
    math: `\\frac{${a}}{${b}} ${symbol} \\frac{${c}}{${d}}`,
    data: { kind: 'fraction', a, b, c, d, operation },
    answer,
    solution: operation === 'multiply'
      ? `Multiply the numerators and multiply the denominators: (${a} × ${c}) / (${b} × ${d}) = ${answer} in simplest form.`
      : `Use ${b * d} as a common denominator: ${a * d}/${b * d} ${operation === 'add' ? '+' : '-'} ${c * b}/${b * d}. Then ${operation === 'add' ? 'add' : 'subtract'} the numerators and simplify to get ${answer}.`,
    distractors: [
      { value: f(operation === 'subtract' ? a - c : a + c, b + d), misconception: 'For addition or subtraction, rename fractions with a common denominator. Do not add the denominators. For multiplication, multiply both numerators and both denominators.' },
    ],
  };
}

export const templates: readonly Template[] = [
  {
    id: 'nbt.multiply', category: 'nbt', standard: '5.NBT.B.5', difficulty: 2, type: 'mc',
    generate(rng) {
      const a = rng.int(12, 48);
      const b = rng.int(12, 29);
      return {
        prompt: `A school orders ${a} boxes of pencils. Each box holds ${b} pencils. How many pencils does the school order?`,
        math: `${a} \\times ${b} = \\; ?`,
        unit: 'pencils', data: { kind: 'product', a, b }, answer: f(a * b),
        solution: `Multiply the number of boxes by the pencils in each box: ${a} × ${b} = ${a * b} pencils.`,
        distractors: [{ value: f(a + b), misconception: 'Adding gives the total of two quantities, not the number in equal groups. Multiply the number of boxes by the number in each box.' }],
      };
    },
  },
  {
    id: 'nbt.divide', category: 'nbt', standard: '5.NBT.B.6', difficulty: 2, type: 'numeric',
    generate(rng) {
      const divisor = rng.int(12, 24);
      const quotient = rng.int(12, 45);
      const dividend = divisor * quotient;
      return {
        prompt: `A Chesapeake Bay cleanup team sorts ${dividend} bottles equally into ${divisor} bins. How many bottles go in each bin?`,
        unit: 'bottles', data: { kind: 'quotient', dividend, divisor }, answer: f(quotient),
        solution: `${dividend} ÷ ${divisor} = ${quotient}. Check by multiplying: ${divisor} × ${quotient} = ${dividend}.`,
      };
    },
  },
  { id: 'nbt.decimal-add', category: 'nbt', standard: '5.NBT.B.7', difficulty: 1, type: 'mc', generate: rng => decimalDraft(rng, 'add') },
  { id: 'nbt.decimal-subtract', category: 'nbt', standard: '5.NBT.B.7', difficulty: 2, type: 'numeric', generate: rng => decimalDraft(rng, 'subtract') },
  { id: 'nbt.decimal-product', category: 'nbt', standard: '5.NBT.B.7', difficulty: 3, type: 'numeric', generate: rng => decimalDraft(rng, 'multiply') },
  {
    id: 'nbt.place-value', category: 'nbt', standard: '5.NBT.A.1', difficulty: 1, type: 'mc',
    generate(rng) {
      const digit = rng.int(2, 9);
      const value = rng.int(1, 9) * 1000 + rng.int(1, 9) * 100 + digit * 10 + rng.int(1, 9);
      const answer = f(digit, 100);
      return {
        prompt: `What is the value of the digit in the hundredths place in ${decimal(value, 3)}?`,
        math: decimal(value, 3), data: { kind: 'place', value, position: 2 }, answer,
        solution: `The hundredths place is the second place to the right of the decimal point. Its digit is ${digit}, so its value is ${digit}/100.`,
        distractors: [
          { value: f(digit, 10), misconception: 'Tenths are one place to the right of the decimal point; hundredths are two places to the right.' },
          { value: f(digit, 1000), misconception: 'Thousandths are three places to the right of the decimal point. This question asks for hundredths.' },
          { value: f(digit), misconception: 'The value of a digit depends on its place. This digit represents hundredths, not whole units.' },
        ],
      };
    },
  },
  { id: 'nf.add', category: 'nf', standard: '5.NF.A.1', difficulty: 2, type: 'mc', generate: rng => fractionDraft(rng, 'add') },
  { id: 'nf.subtract', category: 'nf', standard: '5.NF.A.1', difficulty: 3, type: 'numeric', generate: rng => fractionDraft(rng, 'subtract') },
  { id: 'nf.product', category: 'nf', standard: '5.NF.B.4', difficulty: 2, type: 'mc', generate: rng => fractionDraft(rng, 'multiply') },
  {
    id: 'nf.whole-product', category: 'nf', standard: '5.NF.B.6', difficulty: 2, type: 'numeric',
    generate(rng) {
      const whole = rng.int(3, 9);
      const denominator = rng.pick([3, 4, 5, 6, 8]);
      const numerator = rng.int(1, denominator - 1);
      const answer = f(whole).mul(f(numerator, denominator));
      return {
        prompt: `${rng.pick(names)} needs ${numerator}/${denominator} cup of oats for each batch of granola. How many cups are needed for ${whole} batches?`,
        unit: 'cups', data: { kind: 'fraction', a: whole, b: 1, c: numerator, d: denominator, operation: 'multiply' }, answer,
        solution: `Multiply cups per batch by the number of batches: ${whole} × ${numerator}/${denominator} = ${answer} cups.`,
      };
    },
  },
  {
    id: 'nf.whole-div-unit', category: 'nf', standard: '5.NF.B.7', difficulty: 2, type: 'mc',
    generate(rng) {
      const whole = rng.int(2, 8);
      const denominator = rng.pick([2, 3, 4, 6, 8]);
      return {
        prompt: `A ribbon is ${whole} meters long. It is cut into pieces that are each 1/${denominator} meter long. How many pieces are made?`,
        data: { kind: 'unitDivision', whole, denominator, unitFirst: false }, answer: f(whole * denominator),
        solution: `Each meter makes ${denominator} pieces. In ${whole} meters, there are ${whole} × ${denominator} = ${whole * denominator} pieces.`,
        distractors: [{ value: f(whole, denominator), misconception: 'Dividing by a unit fraction counts how many small pieces fit into the whole. Multiply by the denominator rather than dividing by it.' }],
      };
    },
  },
  {
    id: 'nf.unit-div-whole', category: 'nf', standard: '5.NF.B.7', difficulty: 3, type: 'numeric',
    generate(rng) {
      const whole = rng.int(2, 6);
      const denominator = rng.pick([2, 3, 4, 5]);
      return {
        prompt: `A group shares 1/${denominator} liter of juice equally among ${whole} students. How many liters does each student receive?`,
        unit: 'liters', data: { kind: 'unitDivision', whole, denominator, unitFirst: true }, answer: f(1, denominator).div(f(whole)),
        solution: `Divide the fraction by ${whole}: (1/${denominator}) ÷ ${whole} = 1/(${denominator} × ${whole}) = 1/${denominator * whole} liter.`,
      };
    },
  },
  {
    id: 'oa.expression', category: 'oa', standard: '5.OA.A.1', difficulty: 2, type: 'mc',
    generate(rng) {
      const a = rng.int(3, 12), b = rng.int(2, 9), c = rng.int(2, 6);
      return {
        prompt: 'What is the value of this expression?',
        math: `(${a} + ${b}) \\times ${c}`, data: { kind: 'expression', a, b, c }, answer: f((a + b) * c),
        solution: `First evaluate the parentheses: ${a} + ${b} = ${a + b}. Then multiply: ${a + b} × ${c} = ${(a + b) * c}.`,
        distractors: [{ value: f(a + b * c), misconception: 'Parentheses come first. Add the two numbers inside the parentheses before multiplying.' }],
      };
    },
  },
  {
    id: 'oa.pattern', category: 'oa', standard: '5.OA.B.3', difficulty: 1, type: 'numeric',
    generate(rng) {
      const start = rng.int(1, 8), step = rng.int(3, 9), index = 6;
      return {
        prompt: `A number pattern starts at ${start} and adds ${step} each time. The first four terms are ${[0, 1, 2, 3].map(i => start + i * step).join(', ')}. What is the sixth term?`,
        data: { kind: 'pattern', start, step, index }, answer: f(start + step * (index - 1)),
        solution: `The first term is already ${start}. Add ${step} five times to reach the sixth term: ${start} + 5 × ${step} = ${start + 5 * step}.`,
      };
    },
  },
  {
    id: 'md.volume', category: 'md', standard: '5.MD.C.5', difficulty: 1, type: 'mc',
    generate(rng) {
      const length = rng.int(3, 9), width = rng.int(2, 6), height = rng.int(2, 7);
      const volume = length * width * height;
      return {
        prompt: 'This rectangular prism is filled with unit cubes. What is its volume in cubic centimeters?',
        figure: { kind: 'box', length, width, height }, unit: 'cm³',
        data: { kind: 'volume', length, width, height, missingHeight: false, volume }, answer: f(volume),
        solution: `Volume = length × width × height = ${length} × ${width} × ${height} = ${volume} cubic centimeters.`,
        distractors: [
          { value: f(length * width), misconception: 'Length × width gives the area of one layer. Multiply by the height to count all layers.' },
          { value: f(length + width + height), misconception: 'Adding the dimensions does not count the unit cubes. Volume is the product of all three dimensions.' },
        ],
      };
    },
  },
  {
    id: 'md.missing-height', category: 'md', standard: '5.MD.C.5', difficulty: 3, type: 'numeric',
    generate(rng) {
      const length = rng.int(3, 9), width = rng.int(2, 6), height = rng.int(3, 9);
      const volume = length * width * height;
      return {
        prompt: `A rectangular prism has a volume of ${volume} cubic centimeters. Its length is ${length} cm and its width is ${width} cm. What is its height?`,
        figure: { kind: 'box', length, width, height: null }, unit: 'cm',
        data: { kind: 'volume', length, width, height, missingHeight: true, volume }, answer: f(height),
        solution: `One layer has ${length} × ${width} = ${length * width} unit cubes. Divide volume by that area: ${volume} ÷ ${length * width} = ${height} cm.`,
      };
    },
  },
  {
    id: 'md.conversion', category: 'md', standard: '5.MD.A.1', difficulty: 1, type: 'numeric',
    generate(rng) {
      const quantity = rng.int(2, 12), factor = 1000;
      return {
        prompt: `A class collects ${quantity} kilograms of paper for recycling. How many grams of paper is this? There are 1,000 grams in 1 kilogram.`,
        unit: 'grams', data: { kind: 'conversion', quantity, factor }, answer: f(quantity * factor),
        solution: `Multiply kilograms by 1,000: ${quantity} × 1,000 = ${quantity * factor} grams.`,
      };
    },
  },
  {
    id: 'md.line-plot', category: 'md', standard: '5.MD.B.2', difficulty: 2, type: 'mc',
    generate(rng) {
      const counts = Array.from({ length: 4 }, () => rng.int(1, 3));
      let answer = f(0);
      counts.forEach((count, i) => { answer = answer.add(f((i + 1) * count, 4)); });
      return {
        prompt: 'The line plot shows lengths of ribbons in meters. Each dot represents one ribbon. What is the total length of all the ribbons?',
        figure: { kind: 'plot', counts, denominator: 4 }, unit: 'meters',
        data: { kind: 'plot', counts, denominator: 4 }, answer,
        solution: `Add the lengths represented by every dot: ${counts.map((count, i) => `${count} × ${i + 1}/4`).join(' + ')} = ${answer} meters.`,
        distractors: [{ value: f(counts.reduce((sum, count) => sum + count, 0)), misconception: 'Counting dots gives the number of ribbons. To find total length, multiply each length by the number of dots at that length, then add.' }],
      };
    },
  },
  {
    id: 'g.coordinate', category: 'g', standard: '5.G.A.2', difficulty: 1, type: 'numeric',
    generate(rng) {
      const x = rng.int(1, 6), y = rng.int(x + 1, 8);
      return {
        prompt: 'Point P marks a nature center on the map. What is the x-coordinate of point P?',
        figure: { kind: 'coordinate', x, y }, data: { kind: 'coordinate', x, y }, answer: f(x),
        solution: `In an ordered pair (x, y), x is the horizontal distance from the origin. Point P is at (${x}, ${y}), so its x-coordinate is ${x}.`,
      };
    },
  },
  {
    id: 'g.classify', category: 'g', standard: '5.G.B.4', difficulty: 2, type: 'mc',
    generate() {
      return {
        prompt: 'A quadrilateral has four equal sides and four right angles. Which is the most specific name for this shape?',
        data: { kind: 'shape', equalSides: 4, rightAngles: 4 }, answer: 'square',
        solution: 'A square has four equal sides and four right angles. It is also a rectangle and a rhombus, but square is the most specific name.',
      };
    },
  },
];

export function numericChoices(draft: Draft, rng: Rng, allowNegative = false): ChoiceDraft[] {
  if (draft.choices) return rng.shuffle(draft.choices);
  if (draft.answer === 'square') {
    return rng.shuffle([
      { value: 'square', label: 'Square', misconception: null },
      { value: 'rectangle', label: 'Rectangle', misconception: 'A square is a rectangle, but "square" is more specific because it also tells us all four sides are equal.' },
      { value: 'rhombus', label: 'Rhombus', misconception: 'A square is a rhombus, but "square" also tells us all four angles are right angles.' },
      { value: 'triangle', label: 'Triangle', misconception: 'A triangle has three sides. The shape in the question has four sides.' },
    ]);
  }
  if (typeof draft.answer === 'string') throw new Error('A symbolic answer requires explicit choices.');
  const answer = draft.answer;
  const options: { value: string; label: string; misconception: string | null }[] = [
    { value: answer.toString(), label: latex(answer), misconception: null },
  ];
  const candidates = [
    ...(draft.distractors ?? []),
    ...[1, -1, 2, 10].map(offset => ({
      value: answer.add(f(offset)),
      misconception: 'Check each calculation and its place value. The worked solution shows how to find the exact answer.',
    })),
  ];
  for (const candidate of candidates) {
    if (!allowNegative && candidate.value.n < 0n) continue;
    if (options.some(option => option.value === candidate.value.toString())) continue;
    options.push({ value: candidate.value.toString(), label: latex(candidate.value), misconception: candidate.misconception });
    if (options.length === 4) break;
  }
  if (options.length !== 4) throw new Error('Could not construct four distinct options.');
  return rng.shuffle(options);
}
