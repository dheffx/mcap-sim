import type { Template } from '../types';
import { associationDraft, f, polynomial } from './shared';

export const grade8Templates: readonly Template[] = [
  {
    id: 'g8.square-root', category: 'ns', standard: '8.EE.A.2', difficulty: 1, type: 'mc',
    generate(rng) {
      const root = rng.int(3, 15);
      return {
        prompt: 'What is the principal square root?',
        math: `\\sqrt{${root * root}}`, data: { kind: 'root', radicand: root * root, degree: 2, power: 1 }, answer: f(root),
        solution: `${root} × ${root} = ${root * root}. The principal square root is the nonnegative value ${root}.`,
        distractors: [{ value: f(root * root, 2), misconception: 'Taking a square root is not dividing by two. Find the nonnegative number whose square is the radicand.' }],
      };
    },
  },
  {
    id: 'g8.cube-root', category: 'ns', standard: '8.EE.A.2', difficulty: 2, type: 'numeric',
    generate(rng) {
      const root = rng.pick([-8, -6, -5, -4, -3, 2, 3, 4, 5, 6, 8]);
      return {
        prompt: 'What is the value of this cube root?', math: `\\sqrt[3]{${root ** 3}}`,
        data: { kind: 'root', radicand: root ** 3, degree: 3, power: 1 }, answer: f(root),
        solution: `${root} × ${root} × ${root} = ${root ** 3}, so the cube root is ${root}. A negative number has a negative real cube root.`,
      };
    },
  },
  {
    id: 'g8.repeating', category: 'ns', standard: '8.NS.A.1', difficulty: 2, type: 'mc',
    generate(rng) {
      const digit = rng.int(1, 8);
      return {
        prompt: 'Which fraction is equal to this repeating decimal?', math: `0.\\overline{${digit}}`,
        data: { kind: 'repeating', digit }, answer: f(digit, 9),
        solution: `Let x = 0.${digit}${digit}${digit}… . Then 10x = ${digit}.${digit}${digit}${digit}… . Subtract: 9x = ${digit}, so x = ${digit}/9.`,
        distractors: [{ value: f(digit, 10), misconception: 'A repeating decimal is not a terminating decimal. The bar means the digit continues forever.' }],
      };
    },
  },
  {
    id: 'g8.exponents', category: 'ee', standard: '8.EE.A.1', difficulty: 1, type: 'mc',
    generate(rng) {
      const a = rng.int(-4, 5), b = rng.int(2, 7);
      return {
        prompt: 'The expression is equal to 2 raised to the power n. What is n?',
        math: `2^{${a}}\\times 2^{${b}}=2^n`, data: { kind: 'exponentSum', a, b }, answer: f(a + b),
        solution: `When multiplying powers with the same base, add exponents: n = (${a}) + (${b}) = ${a + b}.`,
        distractors: [{ value: f(a * b), misconception: 'Add exponents when multiplying powers of the same base. Multiplying exponents applies to a power raised to another power.' }],
      };
    },
  },
  {
    id: 'g8.scientific', category: 'ee', standard: '8.EE.A.3', difficulty: 2, type: 'numeric',
    generate(rng) {
      const coefficient = rng.int(11, 99), exponent = rng.int(3, 6);
      const answer = f(coefficient * 10 ** exponent, 10);
      return {
        prompt: 'Write this number in standard decimal notation. Do not use commas.',
        math: `${Math.floor(coefficient / 10)}.${coefficient % 10}\\times10^{${exponent}}`,
        data: { kind: 'scientific', coefficient, places: 1, exponent }, answer,
        solution: `Multiplying by 10^${exponent} moves the decimal point ${exponent} places right. The value is ${answer}.`,
      };
    },
  },
  {
    id: 'g8.linear-equation', category: 'ee', standard: '8.EE.C.7', difficulty: 2, type: 'numeric',
    generate(rng) {
      const a = rng.int(2, 8), b = rng.int(-12, 12), x = rng.int(-9, 9), c = a * x + b;
      return {
        prompt: 'Solve for x.', math: `${polynomial([b, a])}=${c}`,
        data: { kind: 'linearEquation', a, b, c }, answer: f(x),
        solution: `Subtract (${b}) from both sides to get ${a}x = ${c - b}. Divide by ${a}: x = ${x}.`,
      };
    },
  },
  {
    id: 'g8.distribute', category: 'ee', standard: '8.EE.C.7', difficulty: 3, type: 'mc',
    generate(rng) {
      const a = rng.int(3, 8), c = rng.int(1, a - 1), b = rng.int(2, 7), x = rng.int(-6, 9);
      const d = (a - c) * x + a * b;
      return {
        prompt: 'Solve for x.', math: `${a}(x+${b})=${polynomial([d, c])}`,
        data: { kind: 'distributedEquation', a, b, c, d }, answer: f(x),
        solution: `Distribute ${a}: ${a}x + ${a * b} = ${c}x + (${d}). Subtract ${c}x and ${a * b}: ${a - c}x = ${d - a * b}. Thus x = ${x}.`,
        distractors: [{ value: f(d - b, a - c), misconception: 'The outside factor multiplies both terms inside the parentheses, not just x.' }],
      };
    },
  },
  {
    id: 'g8.slope', category: 'ee', standard: '8.EE.B.6', difficulty: 2, type: 'mc',
    generate(rng) {
      const slope = rng.pick([-2, -1, 1, 2]), intercept = rng.int(-1, 1);
      const x1 = -2, x2 = 2, y1 = slope * x1 + intercept, y2 = slope * x2 + intercept;
      return {
        prompt: 'What is the slope of the line through the two marked points?',
        figure: { kind: 'graph', points: [[x1, y1], [x2, y2]], connect: true },
        data: { kind: 'slope', x1, y1, x2, y2 }, answer: f(slope),
        solution: `Slope = change in y / change in x = (${y2} - (${y1})) / (${x2} - (${x1})) = ${slope}.`,
        distractors: [{ value: f(x2 - x1, y2 - y1), misconception: 'Slope is rise divided by run, not run divided by rise. Keep the subtraction order consistent.' }],
      };
    },
  },
  {
    id: 'g8.system', category: 'ee', standard: '8.EE.C.8', difficulty: 3, type: 'numeric',
    generate(rng) {
      const x = rng.int(-7, 9), y = rng.int(-6, 8), sum = x + y, difference = x - y;
      return {
        prompt: 'Solve the system. Enter the value of x.',
        math: `\\begin{cases}x+y=${sum}\\\\x-y=${difference}\\end{cases}`,
        data: { kind: 'system', a: 1, b: 1, c: sum, d: 1, e: -1, f: difference, variable: 'x' }, answer: f(x),
        solution: `Add the equations to eliminate y: 2x = ${sum + difference}. Divide by 2 to get x = ${x}. Substitution gives y = ${y}.`,
      };
    },
  },
  {
    id: 'g8.function-value', category: 'f', standard: '8.F.A.3', difficulty: 1, type: 'numeric',
    generate(rng) {
      const slope = rng.int(2, 6), intercept = rng.int(-8, 8), input = rng.int(-4, 6);
      return {
        prompt: `The rule defines y as a function of x. What is y when x = ${input}?`,
        math: `y=${polynomial([intercept, slope])}`, data: { kind: 'linearValue', slope, intercept, input }, answer: f(slope * input + intercept),
        solution: `Substitute x = ${input}: y = ${slope} × (${input}) + (${intercept}) = ${slope * input + intercept}.`,
      };
    },
  },
  {
    id: 'g8.table-rate', category: 'f', standard: '8.F.B.4', difficulty: 2, type: 'mc',
    generate(rng) {
      const slope = rng.int(2, 6), intercept = rng.int(1, 8);
      return {
        prompt: 'The table represents a linear function. What is its rate of change?',
        math: `\\begin{array}{c|ccc}x&1&3&5\\\\\\hline y&${slope + intercept}&${3 * slope + intercept}&${5 * slope + intercept}\\end{array}`,
        data: { kind: 'slope', x1: 1, y1: slope + intercept, x2: 3, y2: 3 * slope + intercept }, answer: f(slope),
        solution: `When x increases from 1 to 3, y increases by ${2 * slope}. Divide the changes: ${2 * slope}/2 = ${slope}.`,
        distractors: [{ value: f(2 * slope), misconception: 'The change in y is not the rate unless the change in x is 1. Divide by the change in x.' }],
      };
    },
  },
  {
    id: 'g8.initial-value', category: 'f', standard: '8.F.B.4', difficulty: 1, type: 'mc',
    generate(rng) {
      const slope = rng.pick([-1, 1]), intercept = rng.pick([-2, -1, 1, 2]);
      return {
        prompt: 'What is the initial value (y-intercept) of the graphed linear function?',
        figure: { kind: 'graph', points: [[-3, -3 * slope + intercept], [3, 3 * slope + intercept]], connect: true },
        data: { kind: 'linearValue', slope, intercept, input: 0 }, answer: f(intercept),
        solution: `The initial value is y when x = 0. The line crosses the y-axis at ${intercept}, so that is the initial value.`,
        distractors: [{ value: f(slope), misconception: 'Slope describes the rate of change. The initial value is the height where the line crosses the y-axis.' }],
      };
    },
  },
  {
    id: 'g8.compare-rates', category: 'f', standard: '8.F.A.2', difficulty: 3, type: 'numeric',
    generate(rng) {
      const second = rng.int(2, 5), first = second + rng.int(1, 4), b = rng.int(1, 9);
      return {
        prompt: `Plan A charges according to y = ${first}x + ${b}, where x is hours and y is dollars. Plan B costs $${second + 4} for 1 hour and $${3 * second + 4} for 3 hours and has a constant rate. How many dollars per hour greater is Plan A's rate?`,
        data: { kind: 'rateDifference', first, second }, answer: f(first - second), unit: 'dollars per hour',
        solution: `Plan A's rate is ${first}. Plan B's rate is (${3 * second + 4} - ${second + 4})/(3 - 1) = ${second}. The difference is ${first} - ${second} = ${first - second} dollars per hour.`,
      };
    },
  },
  {
    id: 'g8.pythagorean', category: 'g', standard: '8.G.B.7', difficulty: 2, type: 'numeric',
    generate(rng) {
      const [legA, legB, hypotenuse] = rng.pick([[3, 4, 5], [5, 12, 13], [8, 15, 17]] as const);
      const scale = rng.int(1, 3), a = legA * scale, b = legB * scale, c = hypotenuse * scale;
      return {
        prompt: `A right triangle has legs measuring ${a} cm and ${b} cm. What is the hypotenuse length?`,
        data: { kind: 'pythagorean', a, b }, answer: f(c), unit: 'cm',
        solution: `By the Pythagorean theorem, c² = ${a}² + ${b}² = ${a * a + b * b}. The positive square root is ${c} cm.`,
      };
    },
  },
  {
    id: 'g8.distance', category: 'g', standard: '8.G.B.8', difficulty: 3, type: 'mc',
    generate(rng) {
      const scale = rng.int(1, 3), x1 = rng.int(-6, 1), y1 = rng.int(-5, 2), x2 = x1 + 3 * scale, y2 = y1 + 4 * scale;
      return {
        prompt: `What is the distance between (${x1}, ${y1}) and (${x2}, ${y2}) in the coordinate plane?`,
        data: { kind: 'distance', x1, y1, x2, y2 }, answer: f(5 * scale), unit: 'units',
        solution: `The horizontal change is ${3 * scale} and the vertical change is ${4 * scale}. Distance = √(${3 * scale}² + ${4 * scale}²) = ${5 * scale} units.`,
        distractors: [{ value: f(7 * scale), misconception: 'Adding horizontal and vertical distances follows a bent path. The straight-line distance is the hypotenuse of a right triangle.' }],
      };
    },
  },
  {
    id: 'g8.dilation', category: 'g', standard: '8.G.A.3', difficulty: 1, type: 'numeric',
    generate(rng) {
      const x = rng.pick([-5, -3, -1, 1, 3, 5]), y = rng.int(-4, 4), factor = rng.int(2, 4);
      return {
        prompt: `Point (${x}, ${y}) is dilated about the origin by a scale factor of ${factor}. What is the x-coordinate of its image?`,
        data: { kind: 'dilation', x, factor }, answer: f(x * factor),
        solution: `A dilation centered at the origin multiplies both coordinates by the scale factor. The new x-coordinate is ${x} × ${factor} = ${x * factor}.`,
      };
    },
  },
  {
    id: 'g8.angle', category: 'g', standard: '8.G.A.5', difficulty: 2, type: 'mc',
    generate(rng) {
      const a = rng.int(35, 75), b = rng.int(30, 65);
      return {
        prompt: `Two interior angles of a triangle measure ${a}° and ${b}°. What is the third interior angle?`,
        data: { kind: 'triangleAngle', a, b }, answer: f(180 - a - b), unit: 'degrees',
        solution: `The interior angles of a triangle sum to 180°. Subtract the known angles: 180 - ${a} - ${b} = ${180 - a - b}°.`,
        distractors: [{ value: f(a + b), misconception: 'The sum of the given angles is not the remaining angle. Subtract their sum from 180°.' }],
      };
    },
  },
  {
    id: 'g8.cylinder', category: 'g', standard: '8.G.C.9', difficulty: 2, type: 'numeric',
    generate(rng) {
      const radius = rng.int(2, 7), height = rng.int(3, 12), coefficient = radius * radius * height;
      return {
        prompt: `A cylinder has radius ${radius} cm and height ${height} cm. Its volume is kπ cubic centimeters. What is k? Enter only the coefficient, not π.`,
        math: 'V=\\pi r^2h', data: { kind: 'cylinder', radius, height }, answer: f(coefficient),
        solution: `V = π × ${radius}² × ${height} = ${coefficient}π cubic centimeters. Therefore k = ${coefficient}.`,
      };
    },
  },
  { id: 'g8.association', category: 'sp', standard: '8.SP.A.1', difficulty: 1, type: 'mc', generate: associationDraft },
  {
    id: 'g8.conditional-rate', category: 'sp', standard: '8.SP.A.4', difficulty: 2, type: 'numeric',
    generate(rng) {
      const successes = rng.int(4, 15), other = rng.int(4, 15), nonClub = rng.int(8, 20);
      return {
        prompt: `A survey finds that ${successes} science-club members walk to school and ${other} science-club members do not. Another ${nonClub} students surveyed are not in the club. What fraction of the science-club members walk to school?`,
        data: { kind: 'conditionalRate', successes, other }, answer: f(successes, successes + other),
        solution: `Restrict the total to science-club members: ${successes} + ${other} = ${successes + other}. Of those, ${successes} walk, giving ${f(successes, successes + other)}. Nonmembers are not in this denominator.`,
      };
    },
  },
];
