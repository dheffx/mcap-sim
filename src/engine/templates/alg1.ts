import type { Template } from '../types';
import { associationDraft, f, polynomial } from './shared';

export const algebra1Templates: readonly Template[] = [
  {
    id: 'alg1.rational-power', category: 'nq', standard: 'N.RN.A.1', difficulty: 1, type: 'mc',
    generate(rng) {
      const root = rng.int(2, 6), radicand = root ** 3;
      return {
        prompt: 'What is the value of this expression?', math: `${radicand}^{\\frac{2}{3}}`,
        data: { kind: 'root', radicand, degree: 3, power: 2 }, answer: f(root * root),
        solution: `The denominator of the exponent means take the cube root: ∛${radicand} = ${root}. Then square it: ${root}² = ${root * root}.`,
        distractors: [{ value: f(radicand * 2, 3), misconception: 'A fractional exponent does not mean multiply the base by that fraction. Its denominator specifies a root.' }],
      };
    },
  },
  {
    id: 'alg1.unit-rate', category: 'nq', standard: 'N.Q.A.1', difficulty: 1, type: 'numeric',
    generate(rng) {
      const speed = rng.int(2, 8), divisor = rng.int(15, 40), dividend = speed * divisor;
      return {
        prompt: `A runner travels ${dividend} meters in ${divisor} seconds at a constant speed. What is the speed in meters per second?`,
        data: { kind: 'quotient', dividend, divisor }, answer: f(speed), unit: 'meters per second',
        solution: `Divide distance by time: ${dividend} meters / ${divisor} seconds = ${speed} meters per second. The units are distance per unit of time.`,
      };
    },
  },
  {
    id: 'alg1.linear-equation', category: 'a', standard: 'A.REI.B.3', difficulty: 2, type: 'numeric',
    generate(rng) {
      const a = rng.pick([-7, -5, -3, 2, 4, 6]), b = rng.int(-15, 15), numerator = rng.int(-15, 15), denominator = rng.pick([1, 2]);
      const c = a * numerator + b * denominator;
      return {
        prompt: 'Solve for x. A fraction or exact decimal is accepted.',
        math: `${polynomial([b * denominator, a * denominator])}=${c}`,
        data: { kind: 'linearEquation', a: a * denominator, b: b * denominator, c }, answer: f(numerator, denominator),
        solution: `Subtract (${b * denominator}) from both sides, then divide by (${a * denominator}): x = ${c - b * denominator}/${a * denominator} = ${f(numerator, denominator)}.`,
      };
    },
  },
  {
    id: 'alg1.polynomial-sum', category: 'a', standard: 'A.APR.A.1', difficulty: 2, type: 'mc',
    generate(rng) {
      const left = [rng.int(-8, 8), rng.int(-7, 7), rng.int(1, 5)];
      const right = [rng.int(-8, 8), rng.int(-7, 7), rng.int(1, 5)];
      return {
        prompt: 'After simplifying this sum, what is the coefficient of x?',
        math: `(${polynomial(left)})+(${polynomial(right)})`,
        data: { kind: 'polynomialSum', left, right, degree: 1 }, answer: f(left[1]! + right[1]!),
        solution: `Combine only the x terms: (${left[1]})x + (${right[1]})x = (${left[1]! + right[1]!})x. The x² and constant terms are not like terms with x.`,
        distractors: [{ value: f(left[2]! + right[2]!), misconception: 'That combines the x² coefficients. The question asks for the coefficient of x, not x².' }],
      };
    },
  },
  {
    id: 'alg1.polynomial-product', category: 'a', standard: 'A.APR.A.1', difficulty: 2, type: 'mc',
    generate(rng) {
      const p = rng.int(2, 9), q = rng.int(2, 9);
      return {
        prompt: 'After expanding this product, what is the coefficient of x?',
        math: `(x+${p})(x+${q})`, data: { kind: 'polynomialProduct', p, q }, answer: f(p + q),
        solution: `Expanding gives x² + ${q}x + ${p}x + ${p * q}. Combining the middle terms gives coefficient ${p + q}.`,
        distractors: [{ value: f(p * q), misconception: 'The product of the constants is the constant term, not the coefficient of x. Add the two middle-term coefficients.' }],
      };
    },
  },
  {
    id: 'alg1.factor', category: 'a', standard: 'A.SSE.A.2', difficulty: 3, type: 'mc',
    generate(rng) {
      const p = rng.int(1, 5), q = rng.int(p + 1, 9);
      return {
        prompt: 'Which expression is equivalent to this polynomial?',
        math: polynomial([p * q, p + q, 1]),
        data: { kind: 'factorization', sum: p + q, product: p * q }, answer: `factor:${p},${q}`,
        solution: `Find two numbers that multiply to ${p * q} and add to ${p + q}: ${p} and ${q}. The factorization is (x + ${p})(x + ${q}).`,
        choices: [
          { value: `factor:${p},${q}`, label: `(x+${p})(x+${q})`, misconception: null },
          { value: 'negative-first', label: `(x-${p})(x+${q})`, misconception: 'One negative and one positive constant make a negative constant product, unlike the given polynomial.' },
          { value: 'both-negative', label: `(x-${p})(x-${q})`, misconception: 'Two negative constants give a negative middle-term coefficient, unlike the positive coefficient here.' },
          { value: 'sum-product', label: `(x+${p + q})(x+${p * q})`, misconception: 'The two factor constants must add to the middle coefficient and multiply to the constant; they are not those two coefficients themselves.' },
        ],
      };
    },
  },
  {
    id: 'alg1.quadratic', category: 'a', standard: 'A.REI.B.4', difficulty: 3, type: 'numeric',
    generate(rng) {
      const negative = -rng.int(1, 8), positive = rng.int(1, 9), b = -(negative + positive), c = negative * positive;
      return {
        prompt: 'The quadratic equation has one positive and one negative solution. Enter the positive solution.',
        math: `${polynomial([c, b, 1])}=0`, data: { kind: 'quadratic', a: 1, b, c }, answer: f(positive),
        solution: `Factor as (x - (${negative}))(x - ${positive}) = 0. The zero-product property gives x = ${negative} or x = ${positive}. The positive solution is ${positive}.`,
      };
    },
  },
  {
    id: 'alg1.inequality', category: 'a', standard: 'A.REI.B.3', difficulty: 2, type: 'mc',
    generate(rng) {
      const a = rng.pick([-6, -4, -2, 2, 3, 5]), b = rng.int(-9, 9), boundary = rng.int(2, 9), c = a * boundary + b;
      const direction = a < 0 ? '>' : '<';
      return {
        prompt: 'Which inequality gives all solutions?',
        math: `${polynomial([b, a])}<${c}`, data: { kind: 'inequality', a, b, c }, answer: `${direction}:${boundary}`,
        solution: `Subtract (${b}), then divide by (${a}). ${a < 0 ? 'Division by a negative reverses the inequality sign. ' : 'Division by a positive keeps the inequality sign. '}The result is x ${direction} ${boundary}.`,
        choices: [
          { value: `${direction}:${boundary}`, label: `x${direction}${boundary}`, misconception: null },
          { value: `${direction === '<' ? '>' : '<'}:${boundary}`, label: `x${direction === '<' ? '>' : '<'}${boundary}`, misconception: 'Reverse the inequality sign only when multiplying or dividing by a negative number.' },
          { value: 'include-boundary', label: `x${direction === '<' ? '\\le' : '\\ge'}${boundary}`, misconception: 'The original inequality is strict. Equality is not included in its solution.' },
          { value: 'negative-boundary', label: `x${direction}${-boundary}`, misconception: 'Check subtraction and division signs; the boundary is not its opposite.' },
        ],
      };
    },
  },
  {
    id: 'alg1.system', category: 'a', standard: 'A.REI.C.6', difficulty: 3, type: 'numeric',
    generate(rng) {
      const x = rng.int(-6, 8), y = rng.int(-5, 7), a = rng.int(2, 5), b = rng.int(1, 4), d = a + 1, e = b;
      const c = a * x + b * y, result = d * x + e * y;
      return {
        prompt: 'Solve the system. Enter the value of y.',
        math: `\\begin{cases}${polynomial([0, a])}+${b}y=${c}\\\\${polynomial([0, d])}+${e}y=${result}\\end{cases}`,
        data: { kind: 'system', a, b, c, d, e, f: result, variable: 'y' }, answer: f(y),
        solution: `Subtract the first equation from the second to eliminate y: x = ${result - c}. Substitute x = ${x} into the first equation: ${b}y = ${c - a * x}, so y = ${y}.`,
      };
    },
  },
  {
    id: 'alg1.rearrange', category: 'a', standard: 'A.CED.A.4', difficulty: 2, type: 'numeric',
    generate(rng) {
      const firstBase = rng.int(3, 10), secondBase = rng.int(4, 12), height = rng.int(2, 6) * 2;
      const area = height * (firstBase + secondBase) / 2;
      return {
        prompt: `A trapezoid has area ${area} square centimeters and parallel bases ${firstBase} cm and ${secondBase} cm. Use the formula to find its height h.`,
        math: 'A=\\frac{1}{2}h(b_1+b_2)', data: { kind: 'trapezoidHeight', area, firstBase, secondBase }, answer: f(height), unit: 'cm',
        solution: `Multiply both sides by 2 and divide by b₁ + b₂: h = 2A/(b₁ + b₂) = ${2 * area}/${firstBase + secondBase} = ${height} cm.`,
      };
    },
  },
  {
    id: 'alg1.function-value', category: 'f', standard: 'F.IF.A.2', difficulty: 1, type: 'numeric',
    generate(rng) {
      const a = rng.int(1, 4), b = rng.int(-6, 6), c = rng.int(-8, 8), input = rng.int(-4, 5);
      return {
        prompt: `Evaluate f(${input}).`, math: `f(x)=${polynomial([c, b, a])}`,
        data: { kind: 'polynomialValue', coefficients: [c, b, a], input }, answer: f(a * input ** 2 + b * input + c),
        solution: `Substitute (${input}) for every x, using parentheses: ${a} × (${input})² + (${b}) × (${input}) + (${c}) = ${a * input ** 2 + b * input + c}.`,
      };
    },
  },
  {
    id: 'alg1.average-rate', category: 'f', standard: 'F.IF.B.6', difficulty: 2, type: 'mc',
    generate(rng) {
      const first = rng.int(-3, 1), second = first + rng.int(2, 5), a = rng.int(1, 3), b = rng.int(-4, 4), c = rng.int(0, 6);
      const y1 = a * first ** 2 + b * first + c, y2 = a * second ** 2 + b * second + c;
      return {
        prompt: `What is the average rate of change of f from x = ${first} to x = ${second}?`,
        math: `f(x)=${polynomial([c, b, a])}`, data: { kind: 'averageRate', coefficients: [c, b, a], first, second }, answer: f(y2 - y1, second - first),
        solution: `f(${first}) = ${y1} and f(${second}) = ${y2}. Average rate = (${y2} - (${y1}))/(${second} - (${first})) = ${f(y2 - y1, second - first)}.`,
        distractors: [{ value: f(y2 - y1), misconception: 'The change in output must be divided by the change in input to get average rate of change.' }],
      };
    },
  },
  {
    id: 'alg1.exponential', category: 'f', standard: 'F.LE.A.2', difficulty: 2, type: 'numeric',
    generate(rng) {
      const initial = rng.int(3, 12), factor = rng.int(2, 3), periods = rng.int(3, 5);
      return {
        prompt: `A culture begins with ${initial} organisms and multiplies by a factor of ${factor} each hour. How many organisms are present after ${periods} hours?`,
        data: { kind: 'exponential', initial, factor, periods }, answer: f(initial * factor ** periods), unit: 'organisms',
        solution: `Use repeated multiplication, not repeated addition: ${initial} × ${factor}^${periods} = ${initial * factor ** periods} organisms.`,
      };
    },
  },
  {
    id: 'alg1.sequence', category: 'f', standard: 'F.BF.A.2', difficulty: 1, type: 'mc',
    generate(rng) {
      const start = rng.int(-8, 12), step = rng.pick([-5, -3, 2, 4, 6]), index = rng.int(7, 12);
      return {
        prompt: `An arithmetic sequence has first term ${start} and common difference ${step}. What is term ${index}?`,
        data: { kind: 'pattern', start, step, index }, answer: f(start + (index - 1) * step),
        solution: `Use aₙ = a₁ + (n - 1)d. The term is ${start} + (${index} - 1) × (${step}) = ${start + (index - 1) * step}.`,
        distractors: [{ value: f(start + index * step), misconception: 'The first term is already given, so the common difference is added n - 1 times, not n times.' }],
      };
    },
  },
  {
    id: 'alg1.vertex', category: 'f', standard: 'F.IF.C.8', difficulty: 3, type: 'numeric',
    generate(rng) {
      const a = rng.int(1, 4), h = rng.int(-5, 5), k = rng.int(-9, 9);
      return {
        prompt: 'What is the minimum value of f(x)? Enter the output value, not the x-coordinate.',
        math: `f(x)=${a}(x-(${h}))^2+(${k})`, data: { kind: 'vertex', a, h, k }, answer: f(k),
        solution: `Because ${a} is positive, the squared term is minimized at zero, when x = ${h}. The minimum output is then f(${h}) = ${k}.`,
      };
    },
  },
  {
    id: 'alg1.intercept', category: 'f', standard: 'F.IF.B.4', difficulty: 2, type: 'mc',
    generate(rng) {
      const slope = rng.pick([-4, -2, 2, 3, 5]), root = rng.pick([-6, -4, -2, 2, 4, 6]), intercept = -slope * root;
      return {
        prompt: 'What is the x-intercept of the graph? Enter the x-coordinate.',
        math: `y=${polynomial([intercept, slope])}`, data: { kind: 'xIntercept', slope, intercept }, answer: f(root),
        solution: `At an x-intercept, y = 0. Solve 0 = ${slope}x + (${intercept}): x = ${-intercept}/${slope} = ${root}.`,
        distractors: [{ value: f(intercept), misconception: 'The constant is the y-intercept. To find the x-intercept, set y to zero and solve for x.' }],
      };
    },
  },
  {
    id: 'alg1.mean', category: 's', standard: 'S.ID.A.2', difficulty: 1, type: 'numeric',
    generate(rng) {
      const values = Array.from({ length: 5 }, () => rng.int(4, 24)), sum = values.reduce((total, value) => total + value, 0);
      return {
        prompt: `A data set contains ${values.join(', ')}. What is its mean?`,
        data: { kind: 'mean', values }, answer: f(sum, values.length),
        solution: `Add the ${values.length} values to get ${sum}. Divide by ${values.length}: mean = ${f(sum, values.length)}.`,
      };
    },
  },
  {
    id: 'alg1.median', category: 's', standard: 'S.ID.A.2', difficulty: 2, type: 'mc',
    generate(rng) {
      const start = rng.int(3, 10), gap = rng.int(2, 5);
      const sorted = Array.from({ length: 6 }, (_, i) => start + gap * i), values = rng.shuffle(sorted);
      return {
        prompt: `What is the median of this data set: ${values.join(', ')}?`,
        data: { kind: 'median', values }, answer: f(sorted[2]! + sorted[3]!, 2),
        solution: `Order the values: ${sorted.join(', ')}. With six values, average the two middle values: (${sorted[2]} + ${sorted[3]})/2 = ${f(sorted[2]! + sorted[3]!, 2)}.`,
        distractors: [{ value: f(sorted[2]!), misconception: 'An even-sized data set has two middle values. Average them rather than selecting only the lower middle value.' }],
      };
    },
  },
  { id: 'alg1.association', category: 's', standard: 'S.ID.B.6', difficulty: 1, type: 'mc', generate: associationDraft },
  {
    id: 'alg1.regression', category: 's', standard: 'S.ID.B.6', difficulty: 2, type: 'numeric',
    generate(rng) {
      const slope = rng.int(2, 6), intercept = rng.int(8, 20), input = rng.int(5, 10);
      return {
        prompt: `A line of best fit models a plant's height y (cm) after x weeks. Use the model to predict its height after ${input} weeks.`,
        math: `\\widehat{y}=${polynomial([intercept, slope])}`,
        data: { kind: 'linearValue', slope, intercept, input }, answer: f(slope * input + intercept), unit: 'cm',
        solution: `Substitute x = ${input} into the model: predicted height = ${slope} × ${input} + ${intercept} = ${slope * input + intercept} cm. This is a prediction, not a guarantee of an exact measurement.`,
      };
    },
  },
];
