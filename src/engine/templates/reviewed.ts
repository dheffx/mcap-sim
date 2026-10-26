import { decimal, Fraction, latex } from '../fraction';
import type { Rng } from '../rng';
import type { ChoiceDraft, Draft, ProblemData, Template } from '../types';
import { f, polynomial } from './shared';

export interface Mistake {
  value: Fraction;
  errorModel: string;
  misconception: string;
}

const mistake = (value: Fraction | number, errorModel: string, misconception: string): Mistake => ({
  value: typeof value === 'number' ? f(value) : value, errorModel, misconception,
});

function numericMistakes(data: ProblemData): Mistake[] {
  switch (data.kind) {
    case 'product': {
      const result: Mistake[] = [];
      for (const [a, b] of [[data.a, data.b], [data.b, data.a]] as const) {
        const tens = Math.floor(b / 10), ones = b % 10, product = a * b;
        result.push(
          mistake(a * (tens + ones), 'unshifted-tens-product', 'The tens partial product must be shifted one place left. A tens digit represents tens, not ones.'),
          mistake(a * ones, 'omit-tens-product', 'This counts only the ones partial product. Include the tens partial product too.'),
          mistake(a * tens * 10, 'omit-ones-product', 'This counts only the tens partial product. Include the ones partial product too.'),
          mistake(a * tens * 100 + a * ones, 'extra-placeholder-zero', 'The tens partial product shifts one place, not two. An extra placeholder zero makes it ten times too large.'),
        );
        for (const [digit, place] of [[ones, 10], [tens, 100]] as const) {
          const carry = Math.floor((a % 10) * digit / 10);
          if (carry > 0) result.push(
            mistake(product - carry * place, 'dropped-multiplication-carry', `In ${a} × ${digit}, the ones multiplication creates a carry of ${carry}. That carry must be included in the next column.`),
            mistake(product + carry * place, 'double-multiplication-carry', `In ${a} × ${digit}, use the carry of ${carry} once. Including it twice overcounts the partial product.`),
          );
        }
        const additionCarry = Math.floor((Math.floor(a * ones / 10) % 10 + a * tens % 10) / 10);
        if (additionCarry > 0) result.push(
          mistake(product - 100, 'dropped-partial-sum-carry', 'Adding the partial products creates a carry from tens to hundreds. Keep that carry when adding.'),
          mistake(product + 100, 'double-partial-sum-carry', 'The carry from adding the tens column belongs in the hundreds column once, not twice.'),
        );
      }
      return result;
    }
    case 'decimal': {
      if (data.operation !== 'add') throw new Error('Only decimal addition is a reviewed MC skill.');
      const { a, b, scale } = data, sum = a + b;
      const result = [
        mistake(f(a + 10 * b, scale), 'misaligned-decimal', 'Line up decimal points. Moving the second addend one column left changes its value by a factor of ten.'),
        mistake(f(a - b, scale), 'subtract-instead-of-add', 'The expression asks for a sum, not a difference. Add the aligned place values.'),
      ];
      const hundredthsCarry = Math.floor((a % 10 + b % 10) / 10);
      const tenthsCarry = Math.floor((Math.floor(a / 10) % 10 + Math.floor(b / 10) % 10 + hundredthsCarry) / 10);
      for (const [carry, place, column] of [[hundredthsCarry, 10, 'hundredths'], [tenthsCarry, 100, 'tenths']] as const) {
        if (carry) result.push(
          mistake(f(sum - place, scale), `drop-${column}-carry`, `The ${column} column creates a carry into the next place. Keep that carry in the sum.`),
          mistake(f(sum + place, scale), `double-${column}-carry`, `The carry from the ${column} column is included once, not twice.`),
        );
      }
      return result;
    }
    case 'place': {
      const digit = Math.floor(data.value / 10) % 10;
      return [
        mistake(f(digit, 10), 'tenths-for-hundredths', 'Tenths are one place to the right of the decimal point; hundredths are two places to the right.'),
        mistake(f(digit, 1000), 'thousandths-for-hundredths', 'Thousandths are three places to the right. The question asks for hundredths.'),
        mistake(digit, 'digit-instead-of-value', 'A digit and its value are different. This digit represents hundredths, not whole units.'),
        mistake(f(Math.floor(data.value / 100) % 10, 100), 'read-tenths-digit', 'The tenths digit is one place to the right of the decimal point. Read the next digit to find the hundredths value.'),
        mistake(f(data.value % 10, 100), 'read-thousandths-digit', 'The thousandths digit is three places to the right. The hundredths digit is the preceding digit.'),
      ];
    }
    case 'fraction': {
      const { a, b, c, d } = data;
      if (data.operation === 'add') return [
        mistake(f(a + c, b + d), 'add-numerators-and-denominators', 'Adding denominators changes the size of the parts. Rename both fractions with a common denominator before adding.'),
        mistake(f(a * d + c, b * d), 'scale-only-first-numerator', 'When renaming the second fraction, multiply its numerator as well as its denominator.'),
        mistake(f(a + c * b, b * d), 'scale-only-second-numerator', 'When renaming the first fraction, multiply its numerator as well as its denominator.'),
        mistake(f(a + c, b * d), 'change-only-denominators', 'A new denominator requires an equivalent change to each numerator. Keeping the old numerators changes the fractions.'),
        mistake(f(a + c, b), 'keep-first-denominator', 'The second fraction must be renamed before its numerator can be added to the first numerator. Do not simply keep the first denominator.'),
        mistake(f(a + c, d), 'keep-second-denominator', 'The first fraction must be renamed before its numerator can be added to the second numerator. Do not simply keep the second denominator.'),
        mistake(f(a * d + c * b, b + d), 'cross-products-over-added-denominators', 'Cross-products can count common-sized parts, but their denominator is the common product, not the sum of the denominators.'),
        mistake(f(a * c, b * d), 'multiply-instead-of-add', 'Multiplying numerators and denominators finds a product, not the requested sum.'),
      ];
      if (data.operation === 'multiply') return [
        mistake(f(a + c, b + d), 'add-instead-of-multiply', 'For a product, multiply the numerators and multiply the denominators; do not add across the fraction bars.'),
        mistake(f(a + c, b * d), 'add-numerators-in-product', 'The numerators must be multiplied, not added, when multiplying fractions.'),
        mistake(f(a * c, b + d), 'add-denominators-in-product', 'The denominators must be multiplied, not added, when multiplying fractions.'),
        mistake(f(a * d, b * c), 'invert-second-factor', 'Taking the reciprocal of the second fraction applies to division, not multiplication.'),
        mistake(f(a * c, b * d * d), 'use-denominator-twice', 'Each factor contributes its denominator once. Using the second denominator twice makes the product too small.'),
        mistake(f(a * c, b * b), 'repeat-first-denominator', 'Multiply the two actual denominators. Repeating the first denominator changes the second factor.'),
        mistake(f(a * c, d * d), 'repeat-second-denominator', 'Multiply the two actual denominators. Repeating the second denominator changes the first factor.'),
        mistake(f(a * d + c * b, b * d), 'sum-instead-of-product', 'Finding a common denominator and adding gives a sum. This expression asks for a product.'),
      ];
      throw new Error('Fraction subtraction is not a reviewed MC skill.');
    }
    case 'unitDivision': {
      const { whole, denominator } = data;
      return [
        mistake(f(whole, denominator), 'multiply-by-unit-fraction', 'The question counts how many small portions fit into the whole. Dividing by a unit fraction multiplies by its denominator.'),
        mistake(whole + denominator, 'add-whole-and-denominator', 'The denominator tells how many portions fit into each whole unit. It is a factor, not a number to add.'),
        mistake(f(denominator, whole), 'reverse-division', 'Keep the total amount as the dividend. Reversing the quantities answers a different question.'),
        mistake(denominator, 'count-only-one-whole', 'That counts the portions in one whole unit. Count the portions in every whole unit given.'),
        mistake(whole, 'ignore-portion-size', 'The total number of whole units is not the number of fractional portions. Each whole unit contains several portions.'),
        mistake(whole * denominator ** 2, 'apply-reciprocal-twice', 'Apply the denominator once to count portions per whole. Applying it twice subdivides portions again even though the portion size has not changed.'),
      ];
    }
    case 'expression': {
      const { a, b, c } = data;
      return [
        mistake(a + b * c, 'ignore-parentheses', 'The parentheses require adding first. Multiplying only the second addend does not multiply the whole sum.'),
        mistake(a * c + b, 'distribute-to-first-only', 'If you distribute, the outside factor must multiply both addends, not just the first.'),
        mistake(a + b + c, 'add-outside-factor', 'The operation outside the parentheses is multiplication, not addition.'),
        mistake(a * b * c, 'multiply-inside-parentheses', 'The operation inside the parentheses is addition. Do not replace it with multiplication.'),
        mistake(a * (b + c), 'move-parentheses', 'Keep the original grouping. Multiplying the first number by a sum of the other two describes a different expression.'),
      ];
    }
    case 'volume': {
      const { length: l, width: w, height: h } = data;
      return [
        mistake(l * w, 'count-base-layer-only', 'Length × width counts one layer. Multiply by the height to count every layer.'),
        mistake(l * h, 'omit-width', 'The length and height describe only one face. Include the width to count all the cubes.'),
        mistake(w * h, 'omit-length', 'The width and height describe only one face. Include the length to count all the cubes.'),
        mistake(2 * (l * w + l * h + w * h), 'surface-area-for-volume', 'Adding areas of faces measures the surface, not the number of unit cubes inside.'),
        mistake(2 * (l + w) * h, 'perimeter-times-height', 'The base needs an area, length × width, not its perimeter, before multiplying by height.'),
      ];
    }
    case 'plot': {
      const { counts, denominator } = data;
      const weighted = counts.reduce((sum, count, i) => sum + count * (i + 1), 0);
      return [
        mistake(counts.reduce((sum, count) => sum + count, 0), 'count-dots-not-lengths', 'Counting dots finds the number of ribbons. Weight every dot by its ribbon length to find total length.'),
        mistake(f(counts.length * (counts.length + 1), 2 * denominator), 'count-one-ribbon-per-length', 'Each dot is a ribbon. Counting each labeled length once misses repeated lengths.'),
        mistake(weighted, 'ignore-fractional-scale', `The labels are measured in ${denominator}ths of a meter, not whole meters. Keep the denominator when adding lengths.`),
        mistake(f(weighted - counts[counts.length - 1]! * counts.length, denominator), 'omit-last-plot-column', 'Include the dots at the last labeled length as well as the shorter lengths.'),
        mistake(f(weighted + counts[counts.length - 1]! * counts.length, denominator), 'count-last-plot-column-twice', 'Include each ribbon once. Counting the final column twice adds lengths that are not in the plot.'),
      ];
    }
    case 'root': {
      let root = 0;
      while (root ** data.degree < data.radicand) root++;
      if (data.power === 2) return [
        mistake(root, 'root-without-power', 'The denominator specifies a cube root, but the numerator still requires squaring that root.'),
        mistake(data.radicand, 'ignore-fractional-exponent', 'The fractional exponent changes the base. Take the root and then apply the numerator power.'),
        mistake(2 * root, 'multiply-root-by-exponent', 'The numerator means square the root, not multiply it by two.'),
        mistake(data.radicand ** 2, 'square-without-root', 'Squaring the original base ignores the cube root required by the denominator.'),
        mistake(f(root * root, 3), 'divide-root-result-again', 'The denominator specifies which root to take; it is not another division after taking the root.'),
      ];
      return [
        mistake(-root, 'negative-principal-root', 'The principal square root is the nonnegative root, even though the negative root has the same square.'),
        mistake(f(data.radicand, 2), 'divide-radicand-by-two', 'Taking a square root is not dividing by two. Find the number whose square is the radicand.'),
        mistake(data.radicand, 'leave-radicand-unchanged', 'The radicand is the number being square-rooted, not the resulting root.'),
        mistake(2 * root, 'double-square-root', 'A square root asks for one nonnegative number whose square is the radicand; do not double it.'),
      ];
    }
    case 'repeating': {
      const whole = data.whole ?? 0, digit = data.digit;
      return [
        mistake(f(10 * whole + digit, 10), 'terminate-repeating-decimal', 'The repeating digit continues forever. A terminating decimal stops and is not exactly equal.'),
        mistake(f(99 * whole + digit, 99), 'repeat-two-digit-block', 'There is one repeating digit, so subtract x from 10x, not from 100x with a two-digit block.'),
        mistake(f(10 * whole + digit, 9), 'fail-to-subtract-whole-part', 'When subtracting x from 10x, subtract the whole-number part too, not just the repeating decimal tails.'),
        mistake(f(9 * whole + 10 * digit, 9), 'shift-repeating-block-left', 'The repeating block begins after the decimal point. Moving it into the ones place changes the number.'),
      ];
    }
    case 'exponentSum': {
      const { a, b } = data;
      return [
        mistake(a * b, 'multiply-exponents', 'Multiply exponents for a power raised to another power. For a product with the same base, add exponents.'),
        mistake(a - b, 'use-quotient-exponent-rule', 'Subtracting exponents applies to division of like bases, not multiplication.'),
        mistake(b - a, 'reverse-quotient-exponent-rule', 'This is a product, not a quotient. Add both signed exponents.'),
        mistake(a, 'ignore-second-power', 'The second power contributes its exponent too. Both factors must be included.'),
        mistake(b, 'ignore-first-power', 'The first power contributes its exponent too, including its sign.'),
      ];
    }
    case 'distributedEquation': {
      const { a, b, c, d } = data;
      return [
        mistake(f(d - b, a - c), 'distribute-to-x-only', 'The outside factor multiplies both x and the constant inside the parentheses.'),
        mistake(f(d + a * b, a - c), 'move-constant-with-wrong-sign', 'Subtract the distributed constant from both sides; adding it does not isolate the x terms.'),
        mistake(f(d - a * b, a + c), 'add-instead-of-subtract-x-terms', 'Subtract the right-hand x term from both sides. Its coefficient does not get added to the left coefficient.'),
        mistake(f(d - a * b, a), 'ignore-right-x-term', 'The x term on the right must be moved and combined before dividing by the remaining coefficient.'),
      ];
    }
    case 'slope': {
      const rise = data.y2 - data.y1, run = data.x2 - data.x1;
      return [
        ...(rise === 0 ? [] : [mistake(f(run, rise), 'run-over-rise', 'Slope is change in y divided by change in x, not the reciprocal.')]),
        mistake(f(-rise, run), 'reverse-one-subtraction', 'Subtract coordinates in the same order in the numerator and denominator. Reversing only one changes the sign.'),
        mistake(rise, 'use-rise-only', 'The change in y must be divided by the change in x. It is not the slope by itself.'),
        mistake(run, 'use-run-only', 'The horizontal change is the denominator of slope, not the complete rate.'),
        ...(data.x2 === 0 ? [] : [mistake(f(data.y2, data.x2), 'assume-line-through-origin', 'A point’s y/x ratio is not generally the slope. Use differences between two points unless the line passes through the origin.')]),
      ];
    }
    case 'linearValue': {
      const { slope, intercept } = data;
      return [
        mistake(slope, 'slope-for-initial-value', 'Slope is the rate of change. The initial value is y when x is zero.'),
        mistake(-intercept, 'negate-y-intercept', 'Read the signed y-coordinate where the line crosses the y-axis; do not reverse its sign.'),
        mistake(-3 * slope + intercept, 'first-point-for-intercept', 'The left marked point is not on the y-axis. The intercept is where x equals zero.'),
        mistake(3 * slope + intercept, 'last-point-for-intercept', 'The right marked point is not on the y-axis. The intercept is where x equals zero.'),
        mistake(f(-intercept, slope), 'x-intercept-for-y-intercept', 'Setting y to zero finds an x-intercept. The initial value is found by setting x to zero.'),
      ];
    }
    case 'distance': {
      const dx = Math.abs(data.x2 - data.x1), dy = Math.abs(data.y2 - data.y1);
      return [
        mistake(dx + dy, 'add-coordinate-distances', 'Adding horizontal and vertical changes follows a bent path. Use the hypotenuse for straight-line distance.'),
        mistake(dx * dx + dy * dy, 'omit-distance-square-root', 'The sum of squared changes is distance squared. Take its positive square root.'),
        mistake(dx, 'horizontal-distance-only', 'The points also differ vertically. Include both coordinate changes.'),
        mistake(dy, 'vertical-distance-only', 'The points also differ horizontally. Include both coordinate changes.'),
        mistake(Math.abs(dx - dy), 'subtract-coordinate-distances', 'Subtracting the changes does not find the hypotenuse. Add their squares before taking the square root.'),
      ];
    }
    case 'triangleAngle': {
      const { a, b } = data;
      return [
        mistake(a + b, 'sum-given-angles', 'The sum of the given angles is not the remaining angle. Subtract their sum from 180 degrees.'),
        mistake(180 - a, 'subtract-first-angle-only', 'Both given angles use part of the 180-degree total. Subtract both.'),
        mistake(180 - b, 'subtract-second-angle-only', 'Both given angles use part of the 180-degree total. Subtract both.'),
        mistake(Math.abs(a - b), 'difference-of-given-angles', 'The difference between two angles does not determine the third. Use the triangle’s 180-degree total.'),
        mistake(90 - a, 'assume-right-triangle', 'The triangle is not stated to be a right triangle. Do not substitute a 90-degree total for the remaining angles.'),
      ];
    }
    case 'polynomialSum': {
      const l = data.left, r = data.right, a = l[1]!, b = r[1]!;
      return [
        mistake(a - b, 'subtract-like-coefficients', 'The polynomials are being added. Add the signed coefficients of x rather than subtracting them.'),
        mistake(a * b, 'multiply-like-coefficients', 'Adding like terms adds their coefficients; it does not multiply them.'),
        mistake(l[2]! + r[2]!, 'quadratic-coefficient-for-linear', 'That combines the x-squared coefficients. The question asks for the coefficient of x.'),
        mistake(l[0]! + r[0]!, 'constant-for-linear-coefficient', 'Constant terms do not contain x. Combine the linear terms instead.'),
        mistake(a, 'ignore-second-linear-term', 'Include the x term from both polynomials.'),
        mistake(b, 'ignore-first-linear-term', 'Include the x term from both polynomials.'),
        mistake(a + b + l[2]! + r[2]!, 'combine-unlike-powers', 'Terms in x and x squared are not like terms and cannot be combined into one x coefficient.'),
      ];
    }
    case 'polynomialProduct': {
      const { p, q } = data;
      return [
        mistake(p * q, 'constant-product-for-linear', 'The product of the constants is the constant term. The x coefficient comes from adding the two cross products.'),
        mistake(p, 'omit-first-cross-product', 'Expansion has two cross products. Include both contributions to x.'),
        mistake(q, 'omit-second-cross-product', 'Expansion has two cross products. Include both contributions to x.'),
        mistake(2 * p, 'assume-identical-binomial-p', 'The two binomials need not have the same constant. Add the two actual constants.'),
        mistake(2 * q, 'assume-identical-binomial-q', 'The two binomials need not have the same constant. Add the two actual constants.'),
        mistake(p * q + 1, 'combine-constant-and-leading-terms', 'The leading x-squared term and the constant term do not combine into a linear term.'),
      ];
    }
    case 'averageRate': {
      const evaluate = (x: number) => data.coefficients.reduce((sum, coefficient, degree) => sum + coefficient * x ** degree, 0);
      const y1 = evaluate(data.first), y2 = evaluate(data.second), dx = data.second - data.first, dy = y2 - y1;
      return [
        mistake(dy, 'omit-input-change', 'Average rate divides the output change by the input change.'),
        mistake(f(-dy, dx), 'reverse-output-subtraction', 'Use the same endpoint order for both changes. Reversing only the output subtraction changes the sign.'),
        mistake(f(y2, dx), 'omit-first-output', 'Subtract the first output before dividing. The final output alone is not the output change.'),
        mistake(f(y2 + y1, dx), 'add-outputs-in-rate', 'A rate of change uses the difference of outputs, not their sum.'),
        ...(dy === 0 ? [] : [mistake(f(dx, dy), 'input-change-over-output-change', 'Divide output change by input change, not the reciprocal.')]),
      ];
    }
    case 'pattern': {
      const { start, step, index } = data;
      return [
        mistake(start + index * step, 'one-step-too-many', 'The first term is already given. Add the common difference n minus 1 times, not n times.'),
        mistake(start + (index - 2) * step, 'one-step-too-few', 'Count the first value as term 1; stopping one addition early gives the previous term.'),
        mistake(index * step, 'omit-starting-value', 'The rule must include the actual first term, not just a multiple of the common difference.'),
        mistake(start + index - 1, 'use-unit-step', 'Use the given common difference at every step, not an increase of one.'),
        mistake(start * index, 'repeat-first-term', 'The sequence changes by its common difference. It is not n copies of its first term.'),
      ];
    }
    case 'xIntercept': {
      const { slope, intercept } = data;
      return [
        mistake(intercept, 'y-intercept-for-x-intercept', 'The constant is the y-intercept. Set y to zero and solve for x instead.'),
        mistake(f(intercept, slope), 'miss-intercept-negation', 'Subtract the constant from both sides before dividing by the slope.'),
        mistake(f(-slope, intercept), 'invert-intercept-division', 'After isolating the x term, divide the negative intercept by the slope, not the other way around.'),
        mistake(-intercept, 'omit-slope-division', 'Moving the constant is only the first step. Divide by the x coefficient too.'),
        mistake(slope, 'slope-for-x-intercept', 'Slope measures rate of change, not the x-coordinate where y equals zero.'),
      ];
    }
    case 'median': {
      const sorted = [...data.values].sort((a, b) => a - b), n = sorted.length;
      return [
        mistake(sorted[n / 2 - 1]!, 'lower-middle-only', 'An even-sized set has two middle values. Average both instead of choosing the lower one.'),
        mistake(sorted[n / 2]!, 'upper-middle-only', 'An even-sized set has two middle values. Average both instead of choosing the upper one.'),
        mistake(f(sorted.reduce((sum, value) => sum + value, 0), n), 'mean-for-median', 'Adding all values and dividing by the count gives the mean. The median uses the middle of the ordered data.'),
        mistake(f(data.values[n / 2 - 1]! + data.values[n / 2]!, 2), 'middle-before-sorting', 'Order the data before finding its two middle positions. The displayed order is not sorted.'),
      ];
    }
    case 'purchase': {
      const { units, priceCents: price, feeCents: fee } = data;
      return [
        mistake(f(units * (price + fee), 100), 'repeat-one-time-fee', 'The delivery fee is paid once, not once per packet. Multiply only the packet price by the quantity.'),
        mistake(f(units * price, 100), 'omit-delivery-fee', 'The packet subtotal does not include the stated delivery fee. Add that fee once.'),
        mistake(f(price + fee, 100), 'buy-one-packet-only', 'That pays for only one packet. Multiply the packet price by the full quantity before adding delivery.'),
        mistake(f(units * price - fee, 100), 'subtract-delivery-fee', 'A fee increases the cost. Add it rather than subtracting it.'),
      ];
    }
    case 'trips': {
      const whole = Math.floor(data.people / data.capacity), remainder = data.people % data.capacity;
      return [
        mistake(whole, 'discard-trip-remainder', 'Students left after the full trips still need transportation. Count one more trip for them.'),
        mistake(remainder, 'remainder-as-trip-count', 'The remainder counts students left over, not the total number of trips.'),
        mistake(whole + remainder, 'one-trip-per-remaining-student', 'The remaining students can share one additional trip; they do not each need a separate trip.'),
        mistake(data.capacity, 'capacity-as-trip-count', 'Capacity counts students per trip. Divide the number of students by that capacity to plan trips.'),
      ];
    }
    default: throw new Error(`No reviewed numeric distractors for ${data.kind}.`);
  }
}

export function numericChoices(draft: Draft, rng: Rng, allowNegative: boolean, candidates?: readonly Mistake[]): ChoiceDraft[] | null {
  if (typeof draft.answer === 'string') throw new Error('Expected a numeric answer.');
  const answer = draft.answer, data = draft.data;
  const quantity = ['product', 'unitDivision', 'volume', 'plot', 'triangleAngle', 'distance', 'purchase', 'trips'].includes(data.kind);
  const distinct = new Map<string, Mistake>();
  for (const candidate of candidates ?? numericMistakes(data)) {
    const value = candidate.value;
    if (value.equals(answer) || ((!allowNegative || quantity) && value.n < 0n) || (quantity && value.n === 0n)) continue;
    if (data.kind === 'triangleAngle' && value.n >= 180n * value.d) continue;
    if (data.kind === 'median' && (value.n < BigInt(Math.min(...data.values)) * value.d || value.n > BigInt(Math.max(...data.values)) * value.d)) continue;
    if (!distinct.has(value.toString())) distinct.set(value.toString(), candidate);
  }
  const pool = [...distinct.values()];
  const sets: Mistake[][] = [];
  for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < pool.length; j++) for (let k = j + 1; k < pool.length; k++) {
    const selected = [pool[i]!, pool[j]!, pool[k]!];
    if (!selected.some(candidate => (candidate.value.d === 1n) === (answer.d === 1n))) continue;
    if (answer.n !== 0n && !selected.some(candidate => (candidate.value.n < 0n) === (answer.n < 0n) && candidate.value.n !== 0n)) continue;
    if (data.kind === 'product' && selected.filter(({ value }) =>
      value.d === 1n && value.n % 10n === answer.n % 10n && value.n * 2n >= answer.n && value.n <= answer.n * 2n).length < 2) continue;
    sets.push(selected);
  }
  if (!sets.length) return null;
  const label = (value: Fraction) => data.kind === 'decimal' || data.kind === 'purchase'
    ? decimal(Number(value.n * 100n / value.d), 2) : latex(value);
  return [
    { value: answer.toString(), label: label(answer), misconception: null },
    ...rng.pick(sets).map(candidate => ({
      value: candidate.value.toString(), label: label(candidate.value),
      misconception: candidate.misconception, errorModel: candidate.errorModel,
    })),
  ];
}

function factorDraft(rng: Rng): Draft {
  const product = rng.pick([24, 30, 36, 40, 42, 48, 60, 72, 84, 90, 96, 120]);
  const sign = rng.pick([-1, 1]);
  const pairs: [number, number][] = [];
  for (let p = 1; p * p <= product; p++) if (product % p === 0) {
    const pair: [number, number] = sign > 0 ? [p, product / p] : [-product / p, -p];
    pairs.push(pair);
  }
  const [p, q] = rng.pick(pairs), sum = p + q;
  const choices = rng.shuffle(pairs.filter(pair => pair[0] !== p)).slice(0, 3);
  const label = (a: number, b: number) => `(${polynomial([a, 1])})(${polynomial([b, 1])})`;
  return {
    prompt: 'Which expression is equivalent to this polynomial?', math: polynomial([product, sum, 1]),
    data: { kind: 'factorization', sum, product }, answer: `factor:${p},${q}`,
    solution: `The two constants must multiply to ${product} and add to ${sum}. The pair ${p} and ${q} satisfies both conditions.`,
    choices: [
      { value: `factor:${p},${q}`, label: label(p, q), misconception: null },
      ...choices.map(([a, b]) => ({
        value: `factor:${a},${b}`, label: label(a, b), errorModel: 'factor-pair-wrong-sum',
        misconception: `These constants multiply to ${product}, but add to ${a + b}, not ${sum}. Check the middle coefficient as well as the constant.`,
      })),
    ],
  };
}

function inequalityDraft(rng: Rng): Draft {
  const a = rng.pick([-5, -3, -2, 2, 3, 4]), boundary = rng.pick([-7, -4, -2, 2, 5, 8]);
  const b = a * rng.pick([-4, -2, -1, 1, 2, 4]), c = a * boundary + b, wrongBoundary = (c + b) / a;
  const direction = a < 0 ? '>' : '<', opposite = a < 0 ? '<' : '>';
  return {
    prompt: 'Which inequality gives all solutions?', math: `${polynomial([b, a])}<${c}`,
    data: { kind: 'inequality', a, b, c }, answer: `${direction}:${boundary}`,
    solution: `Subtract (${b}), then divide by (${a}). ${a < 0 ? 'Reverse the inequality because the divisor is negative.' : 'Keep the inequality direction because the divisor is positive.'} Thus x ${direction} ${boundary}.`,
    choices: [
      { value: `${direction}:${boundary}`, label: `x${direction}${boundary}`, misconception: null },
      { value: `${opposite}:${boundary}`, label: `x${opposite}${boundary}`, errorModel: 'wrong-inequality-direction', misconception: 'Reverse the inequality only when multiplying or dividing by a negative number.' },
      { value: `${direction}:${wrongBoundary}`, label: `x${direction}${wrongBoundary}`, errorModel: 'add-constant-to-isolate', misconception: `Subtract (${b}) from both sides. Adding it gives the wrong boundary.` },
      { value: `${opposite}:${wrongBoundary}`, label: `x${opposite}${wrongBoundary}`, errorModel: 'wrong-boundary-and-direction', misconception: `Subtract (${b}) to isolate the x term, then check whether dividing by (${a}) reverses the inequality.` },
    ],
  };
}

function associationDraft(rng: Rng): Draft {
  const direction = rng.pick(['positive', 'negative', 'none'] as const), offset = rng.int(-1, 2);
  const slope = rng.pick([1, 2]) * (direction === 'negative' ? -1 : 1);
  const cloud = rng.pick([[2, -1, 3, -3, 3], [-1, 3, -2, 1, 0]]);
  const points: [number, number][] = Array.from({ length: 5 }, (_, i) => [
    i - 2, offset + (direction === 'none' ? cloud[i]! : slope * (i - 2) + rng.int(-1, 1)),
  ]);
  const descriptions = [
    ['positive', 'Positive linear association', 'A positive association has a generally upward trend as x increases.'],
    ['negative', 'Negative linear association', 'A negative association has a generally downward trend as x increases.'],
    ['none', 'No clear linear association', 'Look for a consistent upward or downward linear trend rather than just positive or negative coordinates.'],
    ['constant', 'The y-value is constant', 'A constant y-value would put every point on one horizontal line. These y-values vary.'],
  ] as const;
  return {
    prompt: 'Which description best matches the linear association in this scatter plot?',
    figure: { kind: 'graph', points, connect: false }, data: { kind: 'association', points }, answer: direction,
    solution: direction === 'none'
      ? 'The points have no consistent upward or downward linear trend. This does not rule out every possible non-linear relationship.'
      : `As x increases, y generally ${direction === 'positive' ? 'increases' : 'decreases'}. The sign of the coordinates does not determine the direction of association, and association alone does not establish causation.`,
    choices: descriptions.map(([value, label, feedback]) => ({
      value, label, text: true, misconception: value === direction ? null : feedback,
      ...(value === direction ? {} : { errorModel: `association-${value}` }),
    })),
  };
}

function textChoices(draft: Draft): ChoiceDraft[] {
  switch (draft.data.kind) {
    case 'shape': return [
      { value: 'square', label: 'Square', text: true, misconception: null },
      { value: 'rectangle', label: 'Rectangle', text: true, errorModel: 'less-specific-rectangle', misconception: 'A square is a rectangle, but square also specifies that all four sides are equal.' },
      { value: 'rhombus', label: 'Rhombus', text: true, errorModel: 'less-specific-rhombus', misconception: 'A square is a rhombus, but square also specifies that all four angles are right angles.' },
      { value: 'parallelogram', label: 'Parallelogram', text: true, errorModel: 'less-specific-parallelogram', misconception: 'A square is a parallelogram, but that broader name does not specify four equal sides and four right angles.' },
    ];
    case 'fractionMistake': return [
      { value: 'common-denominator', label: 'Use a common denominator and scale both numerators, then add.', text: true, misconception: null },
      { value: 'denominators-only', label: 'Use a common denominator but keep the original numerators, then add.', text: true, errorModel: 'change-only-denominators', misconception: 'Equivalent fractions require changing each numerator by the same factor as its denominator.' },
      { value: 'add-across', label: 'Add the numerators and add the denominators, then simplify.', text: true, errorModel: 'add-numerators-and-denominators', misconception: 'Adding denominators changes the size of the parts. Use equivalent fractions with a common denominator.' },
      { value: 'multiply-across', label: 'Multiply the numerators and multiply the denominators, then simplify.', text: true, errorModel: 'multiply-instead-of-add', misconception: 'Multiplying across finds a product. The operation in this problem is addition.' },
    ];
    case 'fractionScale': {
      const { numerator, denominator } = draft.data;
      const less = numerator < denominator;
      return [
        { value: 'less', label: 'The product is smaller because the factor is less than 1.', text: true, misconception: less ? null : 'Compare numerator and denominator: this factor is greater than 1, so it increases a positive quantity.', ...(less ? {} : { errorModel: 'improper-fraction-as-less-than-one' }) },
        { value: 'greater', label: 'The product is larger because the factor is greater than 1.', text: true, misconception: less ? 'This factor is less than 1, so multiplication makes the positive quantity smaller.' : null, ...(less ? { errorModel: 'proper-fraction-as-greater-than-one' } : {}) },
        { value: 'less-reversed', label: 'The product is smaller because the factor is greater than 1.', text: true, errorModel: 'reverse-scaling-or-factor-comparison', misconception: less ? 'The product is smaller, but this factor is less than 1, not greater than 1.' : 'A factor greater than 1 makes a positive quantity larger, not smaller.' },
        { value: 'greater-reversed', label: 'The product is larger because the factor is less than 1.', text: true, errorModel: 'reverse-scaling-or-factor-comparison', misconception: less ? 'A factor less than 1 makes a positive quantity smaller, not larger.' : 'The product is larger, but this factor is greater than 1, not less than 1.' },
      ];
    }
    default: throw new Error(`No reviewed text choices for ${draft.data.kind}.`);
  }
}

export function generateReviewedDraft(template: Template, rng: Rng, allowNegative = false): Draft {
  if (template.type !== 'mc') return template.generate(rng);
  if (template.id === 'alg1.factor') return factorDraft(rng);
  if (template.id === 'alg1.inequality') return inequalityDraft(rng);
  if (template.id.endsWith('.association')) return associationDraft(rng);
  // Redraw problem parameters, never pad a short pool with arbitrary numeric offsets.
  for (let attempt = 0; attempt < 100; attempt++) {
    let draft = template.generate(rng);
    if (template.id === 'g8.repeating') {
      const digit = rng.int(1, 8), whole = rng.int(1, 4);
      draft = {
        prompt: 'Which fraction is exactly equal to this repeating decimal?', math: `${whole}.\\overline{${digit}}`,
        data: { kind: 'repeating', digit, whole }, answer: f(9 * whole + digit, 9),
        solution: `Let x be this number. Subtract x from 10x to cancel the repeating tails: 9x = ${9 * whole + digit}. Therefore x = ${f(9 * whole + digit, 9)}.`,
      };
    }
    if (template.id === 'alg1.median') {
      const values = rng.shuffle(Array.from({ length: 39 }, (_, i) => i + 2)).slice(0, 6);
      const sorted = [...values].sort((a, b) => a - b), answer = f(sorted[2]! + sorted[3]!, 2);
      if (answer.equals(f(values.reduce((sum, value) => sum + value, 0), 6))) continue;
      draft = {
        prompt: `What is the median of this data set: ${values.join(', ')}?`,
        data: { kind: 'median', values }, answer,
        solution: `Order the values: ${sorted.join(', ')}. Average the two middle values: (${sorted[2]} + ${sorted[3]})/2 = ${answer}.`,
      };
    }
    if (draft.data.kind === 'xIntercept') draft = { ...draft, prompt: 'Which is the x-coordinate where this line crosses the x-axis?' };
    if (typeof draft.answer === 'string') return { ...draft, choices: textChoices(draft) };
    const choices = numericChoices(draft, rng, allowNegative);
    if (choices) return { ...draft, choices };
  }
  throw new Error(`Could not generate reviewed choices for ${template.id} after 100 parameter draws.`);
}
