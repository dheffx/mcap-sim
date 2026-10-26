import type { Template } from '../types';
import { f } from './shared';
import { decimal } from '../fraction';

export const mstarTemplates: readonly Template[] = [
  {
    id: 'mstar.garden', category: 'modeling', standard: '5.NF.B.4', difficulty: 2, type: 'numeric',
    generate(rng) {
      const length = rng.int(3, 9), denominator = rng.pick([2, 3, 4]), numerator = denominator + rng.int(1, denominator - 1);
      const answer = f(length).mul(f(numerator, denominator));
      return {
        prompt: `A rectangular school garden is ${length} meters long and ${numerator}/${denominator} meters wide. How many square meters of ground does it cover?`,
        data: { kind: 'gardenArea', length, widthNumerator: numerator, widthDenominator: denominator }, answer, unit: 'square meters',
        solution: `Area = length × width = ${length} × ${numerator}/${denominator} = ${answer} square meters. Adding the side lengths would not measure the ground covered.`,
      };
    },
  },
  {
    id: 'mstar.purchase', category: 'modeling', standard: '5.NBT.B.7', difficulty: 3, type: 'mc',
    generate(rng) {
      const units = rng.int(3, 8), priceCents = rng.int(125, 375), feeCents = rng.int(25, 95);
      const answer = f(units * priceCents + feeCents, 100);
      return {
        prompt: `A class buys ${units} packets of seeds at $${decimal(priceCents, 2)} each and pays a single $${decimal(feeCents, 2)} delivery fee. What is the total cost in dollars?`,
        data: { kind: 'purchase', units, priceCents, feeCents }, answer, unit: 'dollars',
        solution: `Multiply price per packet by ${units}, then add the one-time fee: (${units} × ${priceCents} + ${feeCents}) cents = ${answer} dollars.`,
        distractors: [{ value: f(units * (priceCents + feeCents), 100), misconception: 'The delivery fee is paid once, not once for every packet. Multiply only the packet price by the number of packets.' }],
      };
    },
  },
  {
    id: 'mstar.trips', category: 'modeling', standard: '5.NBT.B.6', difficulty: 1, type: 'mc',
    generate(rng) {
      const capacity = rng.int(8, 15), fullTrips = rng.int(2, 5), remaining = rng.int(1, capacity - 1), people = capacity * fullTrips + remaining;
      return {
        prompt: `A shuttle can carry at most ${capacity} students per trip. How many trips are needed to transport all ${people} students?`,
        data: { kind: 'trips', people, capacity }, answer: f(fullTrips + 1),
        solution: `${people} ÷ ${capacity} gives ${fullTrips} full trips with ${remaining} students left. Those students need one more trip, for ${fullTrips + 1} trips total.`,
        distractors: [{ value: f(fullTrips), misconception: 'A remainder represents students who still need transportation. One additional trip is required even if it is not full.' }],
      };
    },
  },
  {
    id: 'mstar.combined-volume', category: 'modeling', standard: '5.MD.C.5', difficulty: 3, type: 'numeric',
    generate(rng) {
      const first: [number, number, number] = [rng.int(3, 7), rng.int(2, 5), rng.int(2, 5)];
      const second: [number, number, number] = [rng.int(2, 5), rng.int(2, 4), rng.int(2, 4)];
      const firstVolume = first[0] * first[1] * first[2], secondVolume = second[0] * second[1] * second[2];
      return {
        prompt: `Two nonoverlapping rectangular-prism sections make a display. One section measures ${first.join(' × ')} cm; the other measures ${second.join(' × ')} cm. What is their combined volume?`,
        data: { kind: 'combinedVolume', first, second }, answer: f(firstVolume + secondVolume), unit: 'cm³',
        solution: `Find each volume separately: ${first.join(' × ')} = ${firstVolume} and ${second.join(' × ')} = ${secondVolume}. Since the sections do not overlap, add: ${firstVolume} + ${secondVolume} = ${firstVolume + secondVolume} cm³.`,
      };
    },
  },
  {
    id: 'mstar.ribbon', category: 'modeling', standard: '5.NF.A.2', difficulty: 2, type: 'numeric',
    generate(rng) {
      const b = rng.pick([3, 4, 5]), d = rng.pick([6, 7, 8]), a = b * rng.int(2, 5) + rng.int(1, b - 1), c = rng.int(1, d - 1);
      const answer = f(a, b).sub(f(c, d));
      return {
        prompt: `A ribbon is ${a}/${b} meters long. A student cuts off ${c}/${d} meter for a project. How many meters of ribbon remain?`,
        data: { kind: 'fraction', a, b, c, d, operation: 'subtract' }, answer, unit: 'meters',
        solution: `Subtract the used length. A common denominator is ${b * d}: ${a * d}/${b * d} - ${c * b}/${b * d} = ${answer} meters.`,
      };
    },
  },
  {
    id: 'mstar.servings', category: 'modeling', standard: '5.NF.B.7', difficulty: 2, type: 'mc',
    generate(rng) {
      const whole = rng.int(2, 7), denominator = rng.pick([2, 3, 4, 6]);
      return {
        prompt: `A pitcher holds ${whole} liters of water. Each cup holds 1/${denominator} liter. How many full cups can be filled?`,
        data: { kind: 'unitDivision', whole, denominator, unitFirst: false }, answer: f(whole * denominator),
        solution: `There are ${denominator} cup-sized portions in each liter. Multiply: ${whole} × ${denominator} = ${whole * denominator} full cups.`,
        distractors: [{ value: f(whole, denominator), misconception: 'The question counts how many small portions fit into the water. Dividing by a unit fraction multiplies by its denominator.' }],
      };
    },
  },
  {
    id: 'mstar.place-ratio', category: 'reasoning', standard: '5.NBT.A.1', difficulty: 1, type: 'numeric',
    generate(rng) {
      const digit = rng.int(2, 9), power = rng.int(1, 3), place = power === 1 ? 'tenths' : power === 2 ? 'hundredths' : 'thousandths';
      return {
        prompt: `A digit ${digit} in the ones place has how many times the value of a digit ${digit} in the ${place} place?`,
        data: { kind: 'placeRatio', power }, answer: f(10 ** power),
        solution: `The values are ${digit} and ${digit}/${10 ** power}. Moving ${power} place${power === 1 ? '' : 's'} left multiplies the value by ${10 ** power}. The ratio is ${10 ** power}.`,
      };
    },
  },
  {
    id: 'mstar.fraction-error', category: 'reasoning', standard: '5.NF.A.1', difficulty: 2, type: 'mc',
    generate(rng) {
      const b = rng.pick([3, 4, 5]), d = rng.pick([7, 8, 9]), a = rng.int(1, b - 1), c = rng.int(1, d - 1);
      return {
        prompt: `A student claims ${a}/${b} + ${c}/${d} = ${a + c}/${b + d}. Which correction explains how to add the fractions correctly?`,
        data: { kind: 'fractionMistake', a, b, c, d }, answer: 'common-denominator',
        solution: `The fractions name different-sized parts. Rename them using a common denominator, then add the numerators: ${a * d}/${b * d} + ${c * b}/${b * d} = ${f(a, b).add(f(c, d))}. Do not add the denominators.`,
        choices: [
          { value: 'common-denominator', label: 'Use a common denominator, then add the numerators.', text: true, misconception: null },
          { value: 'multiply-only', label: 'Multiply only the numerators and keep both denominators unchanged.', text: true, misconception: 'The fractions need to be rewritten as equivalent fractions with a shared denominator.' },
          { value: 'add-all', label: 'Add all four numbers to make one whole number.', text: true, misconception: 'Numerators count parts and denominators describe the size of the parts; they cannot all be added together.' },
          { value: 'correct-already', label: 'No correction is needed; add the denominators too.', text: true, misconception: 'Adding denominators changes the size of the parts. Use a common denominator instead.' },
        ],
      };
    },
  },
  {
    id: 'mstar.scaling', category: 'reasoning', standard: '5.NF.B.5', difficulty: 2, type: 'mc',
    generate(rng) {
      const denominator = rng.int(3, 8), less = rng.pick([true, false]);
      const numerator = less ? rng.int(1, denominator - 1) : denominator + rng.int(1, 4), whole = rng.int(4, 12);
      return {
        prompt: `Without calculating the exact product, compare ${whole} × ${numerator}/${denominator} with ${whole}. Which explanation is correct?`,
        data: { kind: 'fractionScale', numerator, denominator }, answer: less ? 'less' : 'greater',
        solution: `${numerator}/${denominator} is ${less ? 'less' : 'greater'} than 1. Multiplying a positive number by that fraction makes it ${less ? 'smaller' : 'larger'}, so the product is ${less ? 'less' : 'greater'} than ${whole}.`,
        choices: [
          { value: 'less', label: `Less than ${whole}, because the factor is less than 1.`, text: true, misconception: less ? null : 'Compare the numerator and denominator: this factor is greater than 1, so it makes a positive quantity larger.' },
          { value: 'greater', label: `Greater than ${whole}, because the factor is greater than 1.`, text: true, misconception: less ? 'This factor is less than 1. Multiplication does not always make a number larger.' : null },
          { value: 'equal', label: `Equal to ${whole}, because multiplication never changes the whole number.`, text: true, misconception: 'A positive number stays unchanged only when multiplied by 1. This fraction is not 1.' },
          { value: 'always-greater', label: 'Greater, because every multiplication makes a number larger.', text: true, misconception: 'Multiplication by a positive fraction less than 1 makes a number smaller. Check the factor, not just the operation.' },
        ],
      };
    },
  },
  {
    id: 'mstar.layers', category: 'reasoning', standard: '5.MD.C.5', difficulty: 3, type: 'numeric',
    generate(rng) {
      const length = rng.int(3, 8), width = rng.int(2, 5), height = rng.int(3, 7), volume = length * width * height;
      return {
        prompt: `A student says a box measuring ${length} cm by ${width} cm across its base has a volume of ${length * width} cm³. The box actually holds ${volume} unit cubes. How many layers of unit cubes did the student need to count?`,
        data: { kind: 'volume', length, width, height, missingHeight: true, volume }, answer: f(height), unit: 'layers',
        solution: `${length} × ${width} = ${length * width} counts only one layer. Divide the actual volume by the cubes per layer: ${volume}/${length * width} = ${height} layers. Volume needs all the layers, not just the base.`,
      };
    },
  },
];
