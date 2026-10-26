import { decimal, Fraction } from '../fraction';
import type { Rng } from '../rng';
import type { ChoiceDraft, Draft, Template } from '../types';
import { generateReviewedDraft, numericChoices } from './reviewed';
import { f, polynomial } from './shared';

type Alternative = readonly [string, Partial<Draft>];
type ErrorCase = readonly [number | Fraction, string, string];

function choose(draft: Draft, rng: Rng, alternatives: readonly Alternative[]): Draft {
  const [variantId, changes] = rng.pick(alternatives);
  return { ...draft, ...changes, variantId };
}

function numeric(draft: Draft, rng: Rng, variantId: string, changes: Partial<Draft> & { answer: Fraction }, errors: readonly ErrorCase[], allowNegative: boolean): Draft | null {
  const updated = { ...draft, ...changes };
  const choices = numericChoices(updated, rng, allowNegative, errors.map(([value, errorModel, misconception]) => ({
    value: typeof value === 'number' ? f(value) : value, errorModel, misconception,
  })));
  return choices ? { ...updated, choices, variantId } : null;
}

const fraction = (numerator: number, denominator: number) => denominator === 1 ? String(numerator) : `${numerator}/${denominator}`;

function measurement(draft: Draft, rng: Rng): Draft {
  const large = rng.int(225, 575), small = rng.int(125, 195);
  const alternatives = [
    { id: 'trail-total', prompt: `A trail has a ${decimal(large, 2)} km section and a ${small} m section. What is their combined length in meters?`, value: large, scale: 100, factor: 1000, other: small, target: 1, subtract: false, unit: 'meters', reference: '1 km = 1,000 m' },
    { id: 'route-kilometers', prompt: `A cyclist rides ${small * 10} m to a park, then ${decimal(large, 2)} km on a trail. How many kilometers is the entire ride?`, value: large, scale: 100, factor: 1000, other: small * 10, target: 1000, subtract: false, unit: 'kilometers', reference: '1 km = 1,000 m' },
    { id: 'ribbon-gap', prompt: `A project needs ${decimal(large, 2)} m of ribbon. There are ${small} cm available. How many more centimeters are needed?`, value: large, scale: 100, factor: 100, other: small, target: 1, subtract: true, unit: 'centimeters', reference: '1 m = 100 cm' },
    { id: 'container-left', prompt: `A container holds ${decimal(large, 2)} L of water. After ${small * 10} mL is poured out, how many milliliters remain?`, value: large, scale: 100, factor: 1000, other: small * 10, target: 1, subtract: true, unit: 'milliliters', reference: '1 L = 1,000 mL' },
    { id: 'parcel-mass', prompt: `A parcel contains an item with mass ${decimal(large, 2)} kg and packaging with mass ${small} g. What is its total mass in kilograms?`, value: large, scale: 100, factor: 1000, other: small, target: 1000, subtract: false, unit: 'kilograms', reference: '1 kg = 1,000 g' },
    { id: 'fabric-remaining', prompt: `A ${decimal(large, 2)} m piece of fabric is shortened by ${small} cm. What is its remaining length in meters?`, value: large, scale: 100, factor: 100, other: small, target: 100, subtract: true, unit: 'meters', reference: '1 m = 100 cm' },
  ];
  const selected = rng.pick(alternatives);
  const converted = f(selected.value * selected.factor, selected.scale);
  const total = selected.subtract ? converted.sub(f(selected.other)) : converted.add(f(selected.other));
  const answer = total.div(f(selected.target));
  return {
    ...draft, variantId: selected.id, prompt: `${selected.prompt} (${selected.reference}.)`,
    math: undefined, figure: undefined, unit: selected.unit, answer,
    data: { kind: 'measurement', amounts: [
      { value: selected.value, scale: selected.scale, unitFactor: selected.factor },
      { value: selected.other, scale: 1, unitFactor: 1 },
    ], targetFactor: selected.target, operation: selected.subtract ? 'subtract' : 'add' },
    solution: `First convert the larger-unit measurement to the smaller unit: ${selected.value}/${selected.scale} × ${selected.factor} = ${converted}. Then ${selected.subtract ? 'subtract' : 'add'} ${selected.other} to get ${total}. ${selected.target === 1 ? 'This is already in the requested unit.' : `Divide by ${selected.target} to express it in the requested unit.`} The answer is ${answer} ${selected.unit}.`,
  };
}

function system(draft: Draft, rng: Rng): Draft {
  if (draft.data.kind !== 'system') throw new Error('Expected system data.');
  const original = draft.data, variant = rng.pick(['equations', 'prices', 'counts'] as const);
  let data = { ...original, variable: rng.pick(['x', 'y'] as const) };
  let prompt = `Solve this system for ${data.variable}.`, unit: string | undefined;
  if (variant === 'prices') {
    const x = rng.int(2, 9), y = rng.int(2, 8), a = rng.int(2, 5);
    const b = rng.pick([2, 3, 4, 5, 6].filter(value => value !== a)), d = a + 1, e = b + 1;
    data = { kind: 'system', a, b, c: a * x + b * y, d, e, f: d * x + e * y, variable: data.variable };
    prompt = `${a} notebooks and ${b} pens cost $${data.c}. ${d} notebooks and ${e} pens cost $${data.f}. Every notebook has the same price, and every pen has the same price. What is the price of one ${data.variable === 'x' ? 'notebook' : 'pen'}?`;
    unit = 'dollars';
  } else if (variant === 'counts') {
    const y = rng.int(5, 18), x = y + rng.int(3, 12);
    data = { kind: 'system', a: 1, b: 1, c: x + y, d: 1, e: -1, f: x - y, variable: data.variable };
    prompt = `Two clubs have ${data.c} members altogether. The larger club has ${data.f} more members than the smaller club. How many members belong to the ${data.variable === 'x' ? 'larger' : 'smaller'} club?`;
    unit = 'members';
  }
  const determinant = data.a * data.e - data.b * data.d;
  const x = f(data.c * data.e - data.b * data.f, determinant);
  const y = f(data.a * data.f - data.c * data.d, determinant);
  return {
    ...draft, variantId: `${variant}-${data.variable}`, data, prompt, unit, answer: data.variable === 'x' ? x : y,
    math: variant === 'equations' ? `\\begin{cases}${data.a}x+(${data.b})y=${data.c}\\\\${data.d}x+(${data.e})y=${data.f}\\end{cases}` : undefined,
    solution: `Use x for ${variant === 'prices' ? 'the notebook price' : variant === 'counts' ? 'the larger club' : 'the first unknown'} and y for ${variant === 'prices' ? 'the pen price' : variant === 'counts' ? 'the smaller club' : 'the second unknown'}. The equations are ${data.a}x + (${data.b})y = ${data.c} and ${data.d}x + (${data.e})y = ${data.f}. Multiply the first by ${data.e} and the second by ${data.b}, then subtract: (${determinant})x = ${data.c * data.e - data.b * data.f}. Thus x = ${x}; substituting gives y = ${y}.`,
  };
}

function vary(draft: Draft, template: Template, rng: Rng): Draft | null {
  const data = draft.data;
  switch (data.kind) {
    case 'product': {
      const { a, b } = data;
      return choose({ ...draft, math: undefined, solution: `There are ${a} equal groups of ${b}. Multiply: ${a} × ${b} = ${a * b}.` }, rng, [
        ['seating', { prompt: `An auditorium has ${a} rows with ${b} seats in each row. How many seats are there altogether?`, unit: 'seats' }],
        ['area', { prompt: `A rectangular mural is ${a} tiles long and ${b} tiles high. Each tile covers one square unit. What area does the mural cover?`, unit: 'square units' }],
        ['production', { prompt: `A printer makes ${b} labels each minute. It runs for ${a} minutes without stopping. How many labels does it make?`, unit: 'labels' }],
        ['inventory', { prompt: `A warehouse stacks ${a} identical trays. Each tray holds ${b} parts. How many parts are in the stack?`, unit: 'parts' }],
      ]);
    }
    case 'quotient': {
      const { dividend, divisor } = data;
      return choose({ ...draft, solution: `Divide the total by the amount per group: ${dividend} ÷ ${divisor} = ${draft.answer}. Check: ${divisor} × ${draft.answer} = ${dividend}.` }, rng,
        template.id === 'alg1.unit-rate' ? [
          ['speed', { prompt: `A train travels ${dividend} kilometers in ${divisor} hours at a constant speed. What is its speed in kilometers per hour?`, unit: 'kilometers per hour' }],
          ['production-rate', { prompt: `A machine produces ${dividend} parts in ${divisor} minutes at a constant rate. How many parts does it produce per minute?`, unit: 'parts per minute' }],
          ['unit-price', { prompt: `${divisor} identical supplies cost $${dividend} altogether. What is the price of one supply?`, unit: 'dollars' }],
        ] : [
          ['equal-sharing', { prompt: `A library distributes ${dividend} books equally among ${divisor} classrooms. How many books does each classroom receive?`, unit: 'books' }],
          ['number-of-groups', { prompt: `A factory packs ${dividend} batteries into cartons holding ${divisor} batteries each. How many full cartons are packed?`, unit: 'cartons' }],
          ['missing-factor', { prompt: `A rectangular array contains ${dividend} dots in ${divisor} equal rows. How many dots are in each row?`, unit: 'dots' }],
        ]);
    }
    case 'decimal': {
      const a = decimal(data.a, 2), b = decimal(data.b, 2);
      if (data.operation === 'add') return choose(draft, rng, [
        ['distance', { prompt: `A runner completes ${a} km before a break and ${b} km afterward. How many kilometers does the runner complete in total?`, math: undefined, unit: 'kilometers' }],
        ['cost', { prompt: `A notebook costs $${a} and a pen costs $${b}. What is the total cost?`, math: undefined, unit: 'dollars' }],
        ['expression', { prompt: 'Which value belongs in the blank?', math: `${a}+${b}=\\square`, unit: undefined }],
      ]);
      if (data.operation === 'subtract') return choose(draft, rng, [
        ['remaining', { prompt: `A container holds ${a} L of juice. After ${b} L is served, how many liters remain?`, math: undefined, unit: 'liters' }],
        ['difference', { prompt: `A package has mass ${a} kg and an empty box has mass ${b} kg. How much greater is the package's mass?`, math: undefined, unit: 'kilograms' }],
        ['missing-addend', { prompt: `A rope is ${a} m long. One section is ${b} m long. What length must the other section have?`, math: undefined, unit: 'meters' }],
      ]);
      return choose(draft, rng, [
        ['area', { prompt: `A rectangle is ${a} m long and ${b} m wide. What is its area?`, math: undefined, unit: 'square meters' }],
        ['price-by-mass', { prompt: `Trail mix costs $${a} per kilogram. What is the exact cost of ${b} kg, before rounding to cents?`, math: undefined, unit: 'dollars' }],
        ['expression', { prompt: 'Find the exact product. Do not round.', unit: undefined }],
      ]);
    }
    case 'place': {
      const position = rng.int(1, 3), digit = Math.floor(data.value / 10 ** (3 - position)) % 10;
      const places = ['ones', 'tenths', 'hundredths', 'thousandths'];
      const errors: ErrorCase[] = [1, 2, 3].filter(value => value !== position).map(other => [
        f(digit, 10 ** other), `wrong-place-${other}`, `The requested place is ${places[position]}, not ${places[other]}. The digit's value is the digit divided by ${10 ** position}.`,
      ]);
      errors.push([digit, 'digit-not-value', 'The digit alone is a whole number. Its value depends on its decimal place.']);
      for (const other of [1, 2, 3].filter(value => value !== position)) errors.push([
        f(Math.floor(data.value / 10 ** (3 - other)) % 10, 10 ** position), `read-neighbor-${other}`,
        `Read the digit in the ${places[position]} place, not the ${places[other]} place.`,
      ]);
      return numeric(draft, rng, `place-${position}`, {
        data: { ...data, position }, answer: f(digit, 10 ** position),
        prompt: `In ${decimal(data.value, 3)}, what value does the ${places[position]} digit represent?`, math: undefined,
        solution: `The ${places[position]} digit is ${digit}. Its value is ${digit}/${10 ** position} = ${f(digit, 10 ** position)}.`,
      }, errors, false);
    }
    case 'fraction': {
      const a = fraction(data.a, data.b), b = fraction(data.c, data.d);
      if (data.operation === 'add') return choose(draft, rng, [
        ['combine-lengths', { prompt: `A design uses ${a} m of blue ribbon and ${b} m of gold ribbon. How many meters of ribbon are used in all?`, math: undefined, unit: 'meters' }],
        ['combine-volumes', { prompt: `Two containers hold ${a} L and ${b} L of water. How many liters do they hold altogether?`, math: undefined, unit: 'liters' }],
        ['expression', { prompt: 'Find the exact sum of these fractions.', unit: undefined }],
      ]);
      if (data.operation === 'subtract') return choose(draft, rng, [
        ['remaining', { prompt: `An art club has ${a} m of fabric and uses ${b} m. How many meters remain?`, math: undefined, unit: 'meters' }],
        ['fill-to-goal', { prompt: `A recipe needs ${a} L of broth. There are already ${b} L in the pot. How many more liters are needed?`, math: undefined, unit: 'liters' }],
        ['comparison', { prompt: `One parcel has mass ${a} kg and another has mass ${b} kg. How many kilograms heavier is the first parcel?`, math: undefined, unit: 'kilograms' }],
      ]);
      return choose({ ...draft, solution: `Multiply the quantities: (${a}) × (${b}) = ${draft.answer}. Multiply numerators and denominators, then simplify.` }, rng, [
        ['recipe', { prompt: `Each batch uses ${b} cup of flour. How many cups are needed for ${a} batches?`, math: undefined, unit: 'cups' }],
        ['area', { prompt: `A rectangular piece of paper measures ${a} m by ${b} m. What is its area?`, math: undefined, unit: 'square meters' }],
        ['fraction-of-amount', { prompt: `A jug holds ${a} L of juice. A student pours out ${b} of the juice. How many liters are poured out?`, math: undefined, unit: 'liters' }],
      ]);
    }
    case 'unitDivision': {
      const { whole, denominator } = data;
      return choose({ ...draft, solution: data.unitFirst
        ? `Divide 1/${denominator} into ${whole} equal shares: (1/${denominator}) ÷ ${whole} = 1/${denominator * whole}.`
        : `Each whole unit contains ${denominator} portions, so ${whole} whole units contain ${whole} × ${denominator} = ${whole * denominator} portions.` }, rng,
      data.unitFirst ? [
        ['sharing-volume', { prompt: `There is 1/${denominator} L of paint. It is divided equally among ${whole} containers. How many liters go into each container?`, unit: 'liters' }],
        ['sharing-length', { prompt: `A 1/${denominator} m strip is cut into ${whole} equal pieces. How long is each piece in meters?`, unit: 'meters' }],
        ['expression', { prompt: 'Evaluate this quotient exactly.', math: `\\frac{1}{${denominator}}\\div${whole}`, unit: undefined }],
      ] : [
        ['portion-count', { prompt: `There are ${whole} L of soup. Each serving is 1/${denominator} L. How many servings are available?`, unit: 'servings' }],
        ['length-count', { prompt: `A ${whole} m cable is cut into sections measuring 1/${denominator} m each. How many sections are made?`, unit: 'sections' }],
        ['expression', { prompt: 'How many unit-fraction portions fit in this whole-number amount?', math: `${whole}\\div\\frac{1}{${denominator}}`, unit: undefined }],
      ]);
    }
    case 'expression': return choose(draft, rng, [
      ['grouped-expression', { prompt: 'Evaluate the grouped expression.' }],
      ['two-supplies', { prompt: `Each kit contains ${data.a} pencils and ${data.b} markers. How many writing tools are in ${data.c} kits?`, math: undefined, unit: 'tools' }],
      ['two-rows', { prompt: `A display has ${data.c} shelves. Each shelf holds ${data.a} red books and ${data.b} blue books. How many books are displayed?`, math: undefined, unit: 'books' }],
    ]);
    case 'pattern': return choose({ ...draft, solution: `Term ${data.index} is the starting value plus ${data.index - 1} changes: ${data.start} + (${data.index} - 1) × (${data.step}) = ${draft.answer}.` }, rng, [
      ['sequence', { prompt: `A sequence begins ${[0, 1, 2, 3].map(i => data.start + i * data.step).join(', ')} and continues with a constant difference. What is term ${data.index}?` }],
      ['table', { prompt: `The table follows a constant-step pattern. What is the value at position ${data.index}?`, math: `\\begin{array}{c|ccc}\\text{position}&1&2&3\\\\\\hline\\text{value}&${data.start}&${data.start + data.step}&${data.start + 2 * data.step}\\end{array}` }],
      ['rule', { prompt: `The first value is ${data.start}. Each following value changes by ${data.step}. What is the value in position ${data.index}?` }],
    ]);
    case 'volume': {
      const { length, width, height, volume } = data;
      if (data.missingHeight) {
        if (template.id === 'mstar.layers') return choose(draft, rng, [
          ['cubes-per-layer', { prompt: `A prism contains ${volume} unit cubes, arranged in layers of ${length * width} cubes each. How many layers does it have?`, solution: `Divide all ${volume} cubes by ${length * width} cubes per layer: ${height} layers.` }],
          ['base-to-layers', { prompt: `A student counts ${length} × ${width} cubes in one layer of a prism. The prism contains ${volume} cubes altogether. How many equal layers must the student count?` }],
        ]);
        const missing = rng.pick(['length', 'width', 'height'] as const);
        const known = Object.entries({ length, width, height }).filter(([name]) => name !== missing).map(([name, value]) => `${name} ${value} cm`).join(' and ');
        return { ...draft, variantId: `missing-${missing}`, figure: undefined, data: { ...data, missing },
          prompt: `A rectangular prism has volume ${volume} cubic centimeters, ${known}. What is its ${missing}?`,
          answer: f(data[missing]), solution: `Divide the volume by the product of the two known dimensions. The missing ${missing} is ${data[missing]} cm.` };
      }
      return choose({ ...draft, solution: `A layer contains ${length * width} cubes and there are ${height} layers. The volume is ${length} × ${width} × ${height} = ${volume} cubic centimeters.` }, rng, [
        ['diagram', { prompt: 'Find the volume of the rectangular prism shown.' }],
        ['layers', { prompt: `A prism has ${height} layers with ${length * width} unit cubes in each layer. What is its volume in cubic centimeters?`, figure: undefined }],
        ['dimensions', { prompt: `A storage box has inside dimensions ${length} cm by ${width} cm by ${height} cm. What is its capacity in cubic centimeters?`, figure: undefined }],
      ]);
    }
    case 'conversion': return measurement(draft, rng);
    case 'plot': {
      const denominator = rng.pick([2, 4, 8]), weighted = data.counts.reduce((sum, count, i) => sum + count * (i + 1), 0);
      const totalCount = data.counts.reduce((sum, count) => sum + count, 0), last = data.counts[3]! * 4;
      const context = rng.pick(['craft', 'sewing', 'collection']);
      return numeric(draft, rng, `${context}-scale-${denominator}`, {
        data: { ...data, denominator }, figure: { kind: 'plot', counts: data.counts, denominator }, answer: f(weighted, denominator),
        prompt: context === 'craft' ? 'A craft club uses every ribbon represented by a dot in this plot. How many meters of ribbon does it use?'
          : context === 'sewing' ? 'Each dot represents one ribbon in a sewing kit. What is the combined length of the ribbons, in meters?'
          : 'The plot records the lengths of collected ribbon pieces. How many meters long would they be placed end to end?',
        solution: `Weight every dot by its labeled length: ${data.counts.map((count, i) => `${count} × ${i + 1}/${denominator}`).join(' + ')} = ${f(weighted, denominator)} meters.`,
      }, [
        [totalCount, 'count-only-dots', 'Counting dots gives the number of pieces, not their total length.'],
        [f(10, denominator), 'one-piece-per-label', 'Include every dot at a labeled length, not just one piece at each label.'],
        [weighted, 'ignore-plot-scale', `The labels are fractional meters with denominator ${denominator}, not whole meters.`],
        [f(weighted - last, denominator), 'omit-final-column', 'Include the pieces at the final labeled length when finding the total.'],
        [f(weighted + last, denominator), 'repeat-final-column', 'Count each piece once; do not add the final column twice.'],
      ], false);
    }
    case 'coordinate': {
      const axis = rng.pick(['x', 'y'] as const);
      return { ...choose(draft, rng, [
        ['map', { prompt: `Point P marks a campsite on this map. What is its ${axis}-coordinate?` }],
        ['ordered-pair', { prompt: `An ordered pair describes point P. What number belongs in the ${axis === 'x' ? 'first' : 'second'} position?` }],
      ]), data: { ...data, axis }, answer: f(data[axis]),
      solution: `Point P is (${data.x}, ${data.y}). The ${axis}-coordinate is the ${axis === 'x' ? 'horizontal' : 'vertical'} coordinate, ${data[axis]}.` };
    }
    case 'shape': {
      const shape = rng.pick(['square', 'rectangle', 'rhombus', 'parallelogram'] as const);
      const descriptions = {
        square: 'four equal sides and four right angles',
        rectangle: 'four right angles, with adjacent sides of different lengths',
        rhombus: 'four equal sides and no right angles',
        parallelogram: 'two pairs of parallel sides, adjacent sides of different lengths, and no right angles',
      };
      const choices: ChoiceDraft[] = (['square', 'rectangle', 'rhombus', 'parallelogram'] as const).map(value => ({
        value, label: value[0]!.toUpperCase() + value.slice(1), text: true,
        misconception: value === shape ? null : `Use all the stated properties and choose the most specific class. A ${shape} matches ${descriptions[shape]}.`,
        ...(value === shape ? {} : { errorModel: `quadrilateral-${value}` }),
      }));
      return { ...draft, variantId: shape, choices, answer: shape,
        data: { kind: 'quadrilateral', allSidesEqual: shape === 'square' || shape === 'rhombus', rightAngles: shape === 'square' || shape === 'rectangle', oppositeSidesParallel: true },
        prompt: `A quadrilateral has ${descriptions[shape]}. Which is its most specific name?`,
        solution: `A ${shape} has ${descriptions[shape]}. Broader categories do not capture all these restrictions.` };
    }
    case 'root': {
      if (template.id === 'alg1.rational-power') {
        const [degree, power] = rng.pick([[2, 1], [2, 3], [3, 1], [3, 2]] as const), root = rng.int(2, 6), radicand = root ** degree;
        const radical = rng.pick([true, false]);
        return numeric(draft, rng, `power-${power}-root-${degree}-${radical ? 'radical' : 'exponent'}`, {
          data: { kind: 'root', radicand, degree, power }, answer: f(root ** power),
          math: radical ? `(${degree === 2 ? '\\sqrt' : '\\sqrt[3]'}{${radicand}})^{${power}}` : `${radicand}^{\\frac{${power}}{${degree}}}`,
          prompt: radical ? 'Find the exact value of this radical expression.' : 'Evaluate this rational power exactly.',
          solution: `First take the ${degree === 2 ? 'square' : 'cube'} root to get ${root}, then raise it to power ${power}: ${root ** power}.`,
        }, [
          [root, 'root-without-numerator-power', 'Taking the root is only the denominator step. Apply the numerator power too.'],
          [radicand, 'ignore-rational-exponent', 'The fractional exponent changes the original base; do not leave it unchanged.'],
          [f(radicand * power, degree), 'multiply-base-by-exponent', 'An exponent specifies a power and a root, not ordinary multiplication by a fraction.'],
          [root * power, 'multiply-instead-of-power', 'A numerator power requires repeated multiplication of the root, not multiplying the root by that numerator.'],
          [root ** (power + 1), 'one-extra-root-factor', 'Use exactly the numerator number of root factors, not one extra.'],
          [f(root ** power, degree), 'divide-after-taking-root', 'The denominator specifies a root. It is not an additional division afterward.'],
          [-(root ** power), 'negative-principal-value', 'A positive base raised to this rational power has a positive principal value.'],
        ], true);
      }
      if (data.degree === 2) return choose(draft, rng, [
        ['radical', { prompt: 'Find the nonnegative value of this radical.' }],
        ['square-area', { prompt: `A square has area ${data.radicand} square units. What is its side length?`, math: undefined, unit: 'units' }],
        ['equation', { prompt: 'What nonnegative number satisfies this equation?', math: `s^2=${data.radicand}` }],
      ]);
      return choose(draft, rng, [
        ['radical', { prompt: 'Evaluate this real cube root.' }],
        ['equation', { prompt: 'What real number satisfies this equation?', math: `t^3=${data.radicand}` }],
        ['inverse-operation', { prompt: `Three identical factors have product ${data.radicand}. What is each factor?`, math: undefined }],
      ]);
    }
    case 'repeating': return choose(draft, rng, [
      ['decimal-expansion', { prompt: 'Which rational number has exactly this decimal expansion?' }],
      ['measurement', { prompt: 'A length in meters is recorded using this repeating decimal. Which fraction gives the exact length?', unit: 'meters' }],
      ['equivalence', { prompt: 'Choose an equivalent fraction, not a rounded approximation.' }],
    ]);
    case 'exponentSum': {
      const operation = rng.pick(['multiply', 'divide', 'power'] as const), base = rng.pick([2, 3, 5, 10]), { a, b } = data;
      const answer = operation === 'multiply' ? a + b : operation === 'divide' ? a - b : a * b;
      const expression = operation === 'multiply' ? `${base}^{${a}}\\cdot${base}^{${b}}` : operation === 'divide' ? `\\frac{${base}^{${a}}}{${base}^{${b}}}` : `(${base}^{${a}})^{${b}}`;
      return numeric(draft, rng, operation, {
        data: { kind: 'exponentRule', a, b, operation }, answer: f(answer), prompt: 'What exponent n makes the equation true?', math: `${expression}=${base}^n`,
        solution: `${operation === 'multiply' ? 'Add exponents for a product of like bases' : operation === 'divide' ? 'Subtract exponents for a quotient of like bases' : 'Multiply exponents for a power of a power'}: n = ${answer}.`,
      }, [
        [a + b, 'add-exponents', 'Adding exponents applies to a product of like bases, not a quotient or a power of a power.'],
        [a - b, 'subtract-exponents', 'Subtracting exponents applies to a quotient of like bases.'],
        [a * b, 'multiply-exponents', 'Multiplying exponents applies to a power of a power.'],
        [b - a, 'reverse-exponent-subtraction', 'For a quotient, subtract the denominator exponent from the numerator exponent, not the reverse.'],
        [a, 'ignore-second-exponent', 'Both exponents affect the result; do not keep only the first one.'],
        [b, 'ignore-first-exponent', 'Both exponents affect the result; do not keep only the second one.'],
      ], true);
    }
    case 'scientific': {
      const exponent = rng.pick([-5, -4, -3, 3, 4, 5]);
      const answer = exponent < 0 ? f(data.coefficient, 10 ** (data.places - exponent)) : f(data.coefficient * 10 ** exponent, 10 ** data.places);
      return { ...choose(draft, rng, [
        ['notation', { prompt: 'Express this number as an ordinary decimal, without commas.' }],
        ['sensor', { prompt: 'A sensor records this measurement in meters. Write the measurement as an ordinary decimal.', unit: 'meters' }],
      ]), variantId: `exponent-${exponent < 0 ? 'negative' : 'positive'}`,
      data: { ...data, exponent }, answer, math: `${decimal(data.coefficient, data.places)}\\times10^{${exponent}}`,
      solution: `Move the decimal point ${Math.abs(exponent)} places ${exponent < 0 ? 'left' : 'right'}. The exact value is ${answer}.` };
    }
    case 'linearEquation': {
      const x = f(data.c - data.b, data.a);
      const a = rng.int(3, 8), b = rng.int(1, 5), c = rng.int(1, a - 1), unknown = rng.int(-6, 9), d = (a - c) * unknown + a * b;
      return choose({ ...draft, solution: `Subtract (${data.b}) from both sides and divide by (${data.a}): the unknown is ${x}.` }, rng, [
        ['equation', { prompt: 'Find the value of the unknown in this equation.' }],
        ['missing-input', { prompt: `A rule multiplies an input by ${data.a}, then adds (${data.b}). Its output is ${data.c}. What was the input?`, math: undefined }],
        ['both-sides', { prompt: 'Find x when the two expressions have equal value.', math: `${a}(x+${b})=${polynomial([d, c])}`,
          data: { kind: 'distributedEquation', a, b, c, d }, answer: f(unknown),
          solution: `Distribute, then collect variable terms: ${a - c}x = ${d - a * b}. Divide by ${a - c} to get x = ${unknown}.` }],
      ]);
    }
    case 'distributedEquation': return choose(draft, rng, [
      ['equation', { prompt: 'Find the value of x that makes both sides equal.' }],
      ['equal-rules', { prompt: `Rule A adds ${data.b} to an input x, then multiplies by ${data.a}. Rule B multiplies the same input by ${data.c}, then adds (${data.d}). At what input do the two rules give the same output?`, math: undefined }],
      ['equivalent-balance', { prompt: 'Solve this equation, accounting for the whole group in parentheses.' }],
    ]);
    case 'slope': {
      const { x1, y1, x2, y2 } = data;
      const alternatives: Alternative[] = [
        ['points', { prompt: `A line passes through (${x1}, ${y1}) and (${x2}, ${y2}). What is its rate of change?`, math: undefined, figure: undefined }],
        ['table', { prompt: 'A linear function includes the input-output pairs in this table. What is its rate of change?', figure: undefined, math: `\\begin{array}{c|cc}x&${x1}&${x2}\\\\\\hline y&${y1}&${y2}\\end{array}` }],
        ['changes', { prompt: `On a line, x changes from ${x1} to ${x2} while y changes from ${y1} to ${y2}. What is the slope?`, math: undefined, figure: undefined }],
      ];
      if (template.id === 'g8.slope') alternatives.push(['graph', { prompt: 'What is the slope of the line through the marked points?', math: undefined }]);
      return choose(draft, rng, alternatives);
    }
    case 'system': return system(draft, rng);
    case 'linearValue': {
      const { slope, intercept, input } = data;
      if (template.type === 'mc') return choose({ ...draft, choices: draft.choices?.map(choice => ({
        ...choice,
        misconception: choice.errorModel === 'first-point-for-intercept' ? 'This is the output at x = -3, not at x = 0. The initial value uses an input of zero.'
          : choice.errorModel === 'last-point-for-intercept' ? 'This is the output at x = 3, not at x = 0. The initial value uses an input of zero.' : choice.misconception,
      })) }, rng, [
        ['graph', { prompt: 'At x = 0, what output does this linear graph have?' }],
        ['table', { prompt: 'The table follows a linear rule. What is the output when the input is zero?', figure: undefined, math: `\\begin{array}{c|ccc}x&-3&1&3\\\\\\hline y&${intercept - 3 * slope}&${intercept + slope}&${intercept + 3 * slope}\\end{array}` }],
      ]);
      if (template.id === 'alg1.regression') return choose({ ...draft, solution: `Substitute x = ${input} into the prediction rule: ${slope} × ${input} + (${intercept}) = ${draft.answer}. This is a model prediction, not a guarantee of an exact measurement.` }, rng, [
        ['plant-model', { prompt: `A line of best fit predicts a plant's height y in centimeters after x weeks. What height does it predict after ${input} weeks?`, unit: 'centimeters' }],
        ['attendance-model', { prompt: `A line of best fit predicts attendance y from the number x of advance notices. What attendance does it predict when x = ${input}?`, unit: 'people' }],
        ['temperature-model', { prompt: `A line of best fit predicts temperature y in degrees Celsius after x minutes. What does it predict at ${input} minutes?`, unit: 'degrees Celsius' }],
      ]);
      return choose(draft, rng, [
        ['function-rule', { prompt: `Evaluate the linear rule at input ${input}.` }],
        ['table-extension', { prompt: `This table follows a linear rule. What output corresponds to input ${input}?`, math: `\\begin{array}{c|cc}x&${input - 2}&${input - 1}\\\\\\hline y&${slope * (input - 2) + intercept}&${slope * (input - 1) + intercept}\\end{array}` }],
        ['machine', { prompt: `A machine multiplies each input by ${slope} and adds (${intercept}). What output does input ${input} produce?`, math: undefined }],
      ]);
    }
    case 'rateDifference': {
      const offset = rng.int(2, 10);
      return choose({ ...draft, solution: `The first rate is ${data.first}; the second rate is ${data.second}. Their difference is ${data.first - data.second}.` }, rng, [
        ['plans', { prompt: `Plan A costs y = ${data.first}x + ${offset} dollars for x hours. Plan B costs $${data.second + offset} for 1 hour and $${4 * data.second + offset} for 4 hours, at a constant rate. How many dollars per hour greater is Plan A's rate?` }],
        ['machines', { prompt: `Machine A makes ${data.first} parts per minute. Machine B's counter rises from ${offset} to ${offset + 3 * data.second} in 3 minutes, at a constant rate. How many more parts per minute does A make than B?`, unit: 'parts per minute' }],
        ['table-versus-rule', { prompt: `Tank A gains ${2 * data.first} liters in 2 minutes at a constant rate. Tank B's volume V in liters after t minutes follows V = ${data.second}t + ${offset}. How many liters per minute greater is A's rate?`, unit: 'liters per minute' }],
      ]);
    }
    case 'pythagorean': {
      const [a, b, c] = rng.pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25]] as const);
      const scale = rng.int(1, 3), first = a * scale, second = c * scale;
      return choose({ ...draft, solution: `Use the Pythagorean theorem. The legs are ${a * scale} and ${b * scale}; the hypotenuse is ${c * scale}. Square the known lengths, then add for the hypotenuse or subtract to find a missing leg.` }, rng, [
        ['diagonal', { data: { kind: 'rightTriangle', first, second: b * scale, target: 'hypotenuse' }, answer: f(second), prompt: `A rectangular field is ${first} m by ${b * scale} m. What is the straight-line distance between opposite corners?`, unit: 'meters' }],
        ['ladder', { data: { kind: 'rightTriangle', first, second, target: 'leg' }, answer: f(b * scale), prompt: `A ${second} m ladder leans against a vertical wall. Its foot is ${first} m from the wall. How high up the wall does it reach?`, unit: 'meters' }],
        ['missing-leg', { data: { kind: 'rightTriangle', first: b * scale, second, target: 'leg' }, answer: f(first), prompt: `A right triangle has hypotenuse ${second} cm and one leg ${b * scale} cm. What is the other leg's length?` }],
      ]);
    }
    case 'distance': {
      const [a, b, c] = rng.pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25]] as const), scale = rng.int(1, 2);
      const dx = a * scale, dy = b * scale, x1 = rng.int(-8, 4), y1 = rng.int(-8, 4);
      const x2 = x1 + dx * rng.pick([-1, 1]), y2 = y1 + dy * rng.pick([-1, 1]);
      const presentation = rng.pick(['points', 'map']);
      return numeric(draft, rng, presentation, {
        data: { kind: 'distance', x1, y1, x2, y2 }, answer: f(c * scale),
        prompt: presentation === 'points' ? `Find the straight-line distance between (${x1}, ${y1}) and (${x2}, ${y2}).`
          : `On a coordinate map, a station is at (${x1}, ${y1}) and a shelter is at (${x2}, ${y2}). How many units long is a direct path between them?`,
        solution: `The coordinate changes have lengths ${dx} and ${dy}. Their squares sum to ${dx * dx + dy * dy}; taking the positive square root gives ${c * scale} units.`,
      }, [
        [dx + dy, 'bent-path-distance', 'Adding horizontal and vertical distances measures a bent path, not the direct path.'],
        [dx * dx + dy * dy, 'distance-squared', 'The sum of squares is distance squared. Take its positive square root.'],
        [dx, 'horizontal-only', 'The points differ vertically as well as horizontally. Include both changes.'],
        [dy, 'vertical-only', 'The points differ horizontally as well as vertically. Include both changes.'],
        [Math.abs(dx - dy), 'subtract-coordinate-changes', 'Subtracting the two coordinate changes does not find the hypotenuse.'],
      ], false);
    }
    case 'dilation': {
      const shrink = rng.pick([true, false]), denominator = shrink ? rng.pick([2, 3, 4]) : 1, factor = shrink ? 1 : data.factor;
      return { ...draft, variantId: shrink ? 'shrink' : 'enlarge', data: { ...data, factor, denominator },
        prompt: shrink
          ? `A reduced image is created with scale factor 1/${denominator}, centered at the origin. Point P originally has x-coordinate ${data.x}. What is the reduced image's x-coordinate?`
          : `Point P has x-coordinate ${data.x}. It is enlarged about the origin by scale factor ${factor}. What is the image's x-coordinate?`,
        answer: f(data.x * factor, denominator), solution: `Multiply the coordinate by the scale factor: ${data.x} × ${fraction(factor, denominator)} = ${f(data.x * factor, denominator)}.` };
    }
    case 'triangleAngle': {
      if (rng.pick([true, false])) return choose(draft, rng, [
        ['interior', { prompt: `A triangular sign has interior angles ${data.a} degrees and ${data.b} degrees. Find the remaining interior angle.` }],
        ['triangle-total', { prompt: `Two angles inside a triangle measure ${data.a} degrees and ${data.b} degrees. How many degrees must the third angle measure?` }],
      ]);
      return numeric(draft, rng, 'exterior', {
        data: { kind: 'triangleExterior', a: data.a, b: data.b }, answer: f(data.a + data.b),
        prompt: `One side of a triangle is extended. The two interior angles not adjacent to the exterior angle measure ${data.a} degrees and ${data.b} degrees. What is the exterior angle?`,
        solution: `An exterior angle equals the sum of the two remote interior angles: ${data.a} + ${data.b} = ${data.a + data.b} degrees.`,
      }, [
        [180 - data.a - data.b, 'interior-not-exterior', 'That is the third interior angle. Its adjacent exterior angle is supplementary to it.'],
        [180 - data.a, 'use-only-first-angle', 'Both remote interior angles determine the exterior angle, not just the first.'],
        [180 - data.b, 'use-only-second-angle', 'Both remote interior angles determine the exterior angle, not just the second.'],
        [Math.abs(data.a - data.b), 'subtract-remote-angles', 'Add the remote interior angles rather than finding their difference.'],
        [data.a, 'copy-one-remote-angle', 'The exterior angle includes the contributions of both remote interior angles.'],
      ], false);
    }
    case 'cylinder': {
      const coefficient = data.radius ** 2 * data.height;
      return choose(draft, rng, [
        ['volume', { prompt: `A cylinder has radius ${data.radius} cm and height ${data.height} cm. Write its volume as kπ cubic centimeters. What is k?` }],
        ['height', { prompt: `A cylinder has volume ${coefficient}π cubic centimeters and radius ${data.radius} cm. What is its height?`, math: 'V=\\pi r^2h', unit: 'cm',
          data: { kind: 'cylinderMeasure', coefficient, known: data.radius, target: 'height' }, answer: f(data.height),
          solution: `Cancel π, then divide by radius squared: ${coefficient}/${data.radius ** 2} = ${data.height} cm.` }],
        ['radius', { prompt: `A cylinder has volume ${coefficient}π cubic centimeters and height ${data.height} cm. What is its radius?`, math: 'V=\\pi r^2h', unit: 'cm',
          data: { kind: 'cylinderMeasure', coefficient, known: data.height, target: 'radius' }, answer: f(data.radius),
          solution: `Cancel π and divide by height: r² = ${coefficient}/${data.height} = ${data.radius ** 2}. The positive square root is ${data.radius} cm.` }],
      ]);
    }
    case 'association': return choose(draft, rng, [
      ['generic', { prompt: 'Which description matches the linear association between the two plotted variables?' }],
      ['temperature', { prompt: 'Here x is hours before or after noon, and y is temperature change. What linear association does the scatter plot show?' }],
      ['changes', { prompt: 'The axes record changes in two measured quantities. Which statement describes their linear association?' }],
    ]);
    case 'conditionalRate': {
      const chooseOther = rng.pick([true, false]), requested = chooseOther ? data.other : data.successes;
      const updated = { ...data, successes: requested, other: chooseOther ? data.successes : data.other };
      return { ...choose(draft, rng, [
        ['survey', { prompt: `Of the science-club members surveyed, ${data.successes} walk to school and ${data.other} do not. Another ${rng.int(8, 20)} surveyed students are not club members. What fraction of club members ${chooseOther ? 'do not walk' : 'walk'} to school?` }],
        ['table', { prompt: `Among the club members in this survey, what fraction ${chooseOther ? 'do not walk' : 'walk'} to school?`, math: `\\begin{array}{c|cc}&\\text{walk}&\\text{do not walk}\\\\\\hline\\text{club}&${data.successes}&${data.other}\\\\\\text{nonclub}&${rng.int(3, 12)}&${rng.int(3, 12)}\\end{array}` }],
      ]), data: updated, answer: f(requested, data.successes + data.other),
      solution: `Restrict the denominator to club members: ${data.successes} + ${data.other}. The requested group has ${requested} members, giving ${f(requested, data.successes + data.other)}.` };
    }
    case 'polynomialSum': {
      const degree = rng.pick([0, 1, 2]), a = data.left[degree]!, b = data.right[degree]!;
      const requested = degree === 0 ? 'constant term' : degree === 1 ? 'coefficient of x' : 'coefficient of x squared';
      return numeric(draft, rng, `degree-${degree}`, {
        data: { ...data, degree }, answer: f(a + b), prompt: `After adding these polynomials, what is the ${requested}?`,
        solution: `Combine the matching terms: (${a}) + (${b}) = ${a + b}. Terms with other powers do not contribute to the requested coefficient.`,
      }, [
        [a - b, 'subtract-coefficients', 'The expressions are being added, so add the signed coefficients of the requested terms.'],
        [a * b, 'multiply-coefficients', 'Adding polynomials adds like-term coefficients; it does not multiply them.'],
        [a, 'first-polynomial-only', 'Include the requested term from the second polynomial as well.'],
        [b, 'second-polynomial-only', 'Include the requested term from the first polynomial as well.'],
        ...[0, 1, 2].filter(value => value !== degree).map(other => [
          data.left[other]! + data.right[other]!, `wrong-degree-${other}`, 'Those are different-powered terms. Combine only the terms requested in the question.',
        ] as const),
      ], true);
    }
    case 'polynomialProduct': {
      const constant = rng.pick([true, false]), { p, q } = data;
      if (!constant) return choose(draft, rng, [
        ['linear-term', { prompt: 'Expand the product and find the coefficient of the linear term.' }],
        ['area-model', { prompt: `A rectangle has side lengths (x + ${p}) and (x + ${q}), with x positive. In its expanded area expression, what is the coefficient of x?` }],
      ]);
      return numeric(draft, rng, 'constant-term', {
        data: { ...data, degree: 0 }, answer: f(p * q), prompt: 'Expand this product. What is its constant term?',
        solution: `The constant term comes from multiplying the constants: ${p} × ${q} = ${p * q}.`,
      }, [
        [p + q, 'linear-coefficient-for-constant', 'Adding the constants gives the linear coefficient, not the constant term.'],
        [p, 'first-constant-only', 'Both constant factors contribute to the constant term.'],
        [q, 'second-constant-only', 'Both constant factors contribute to the constant term.'],
        [p - q, 'subtract-constants', 'The constants are factors in a product, not terms to subtract.'],
        [p * p, 'repeat-first-constant', 'Use both actual constants rather than squaring the first one.'],
        [q * q, 'repeat-second-constant', 'Use both actual constants rather than squaring the second one.'],
      ], true);
    }
    case 'factorization': {
      if (rng.pick([true, false])) return choose(draft, rng, [
        ['equivalent-product', { prompt: 'Which product has this expanded form?' }],
        ['factor', { prompt: 'Choose the completely factored form of this quadratic.' }],
      ]);
      const [p, q] = String(draft.answer).slice(7).split(',').map(Number);
      return numeric(draft, rng, 'missing-factor', {
        data: { kind: 'linearEquation', a: 1, b: p!, c: data.sum }, answer: f(q!),
        prompt: 'What value of k makes this polynomial identity true?',
        math: `(${polynomial([p!, 1])})(x+k)=${polynomial([data.product, data.sum, 1])}`,
        solution: `Matching the x coefficient gives ${p} + k = ${data.sum}, so k = ${q}. Check the constant: ${p} × ${q} = ${data.product}.`,
      }, [
        [p!, 'repeat-known-factor', 'The unknown factor constant need not equal the known one. Match both the sum and product.'],
        [data.sum, 'middle-coefficient-as-factor', 'The middle coefficient is the sum of the two factor constants, not the unknown constant by itself.'],
        [data.product, 'constant-product-as-factor', 'The polynomial constant is the product of the two factor constants. Divide out the known factor.'],
        [-q!, 'negate-factor-constant', 'Check the signs needed to match both the middle coefficient and the constant term.'],
      ], true);
    }
    case 'quadratic': {
      if (typeof draft.answer === 'string') throw new Error('Expected a numeric root.');
      const positive = draft.answer, negative = f(data.c, data.a).div(positive), root = rng.pick(['positive', 'negative'] as const), scale = rng.int(1, 4);
      return { ...draft, variantId: `${root}-root`, data: { ...data, a: data.a * scale, b: data.b * scale, c: data.c * scale, root },
        prompt: `This equation has one positive and one negative solution. What is its ${root} solution?`,
        math: `${polynomial([data.c * scale, data.b * scale, data.a * scale])}=0`, answer: root === 'positive' ? positive : negative,
        solution: `Divide out the common factor ${scale}. Factoring the remaining quadratic gives solutions ${negative} and ${positive}. Choose the ${root} solution.` };
    }
    case 'inequality': {
      const symbol = rng.pick(['<', '>', '<=', '>='] as const);
      const reverse = { '<': '>', '>': '<', '<=': '>=', '>=': '<=' } as const;
      const direction = data.a < 0 ? reverse[symbol] : symbol, opposite = reverse[direction];
      const boundary = f(data.c - data.b, data.a), wrong = f(data.c + data.b, data.a);
      const display = (value: string) => value.replace('<=', '\\le ').replace('>=', '\\ge ');
      const choices: ChoiceDraft[] = [[direction, boundary], [opposite, boundary], [direction, wrong], [opposite, wrong]].map(([sign, endpoint], index) => ({
        value: `${sign}:${endpoint}`, label: `x${display(String(sign))}${endpoint}`,
        misconception: index === 0 ? null : index === 1 ? 'Reverse the inequality only when dividing or multiplying by a negative number.'
          : 'Subtract the constant to isolate the variable term, then divide and check the inequality direction.',
        ...(index === 0 ? {} : { errorModel: index === 1 ? 'wrong-direction' : 'wrong-boundary' }),
      }));
      return { ...draft, variantId: `relation-${symbol}`, data: { ...data, symbol }, answer: `${direction}:${boundary}`, choices,
        prompt: 'Which inequality describes the complete solution set?', math: `${polynomial([data.b, data.a])}${display(symbol)}${data.c}`,
        solution: `Subtract (${data.b}) and divide by (${data.a}). ${data.a < 0 ? 'Reverse the relation because the divisor is negative.' : 'Keep the relation because the divisor is positive.'} Equality ${symbol.includes('=') ? 'is included' : 'is not included'}. Thus x ${direction} ${boundary}.` };
    }
    case 'trapezoidHeight': {
      const height = f(2 * data.area, data.firstBase + data.secondBase);
      const length = rng.int(5, 15), width = rng.int(3, 9), perimeter = 2 * (length + width);
      const principal = rng.int(2, 8) * 100, rate = rng.int(2, 5), time = rng.int(2, 6), interest = principal * rate * time / 100;
      return choose(draft, rng, [
        ['trapezoid-height', { prompt: `A trapezoid has area ${data.area} square centimeters and bases ${data.firstBase} cm and ${data.secondBase} cm. Rearrange the formula to find h.`, answer: height }],
        ['rectangle-width', { prompt: `A rectangle has perimeter ${perimeter} cm and length ${length} cm. Rearrange the formula to find its width w.`, math: 'P=2l+2w',
          data: { kind: 'linearEquation', a: 2, b: 2 * length, c: perimeter }, answer: f(width),
          solution: `Subtract twice the length, then divide by 2: w = (${perimeter} - ${2 * length})/2 = ${width} cm.` }],
        ['interest-time', { prompt: `Simple interest is $${interest} on a principal of $${principal} at a rate of ${rate}% per year. Rearrange the formula to find the time t in years.`, math: 'I=\\frac{Prt}{100}', unit: 'years',
          data: { kind: 'linearEquation', a: principal * rate, b: 0, c: interest * 100 }, answer: f(time),
          solution: `Multiply by 100 and divide by principal × rate: t = ${interest * 100}/${principal * rate} = ${time} years.` }],
      ]);
    }
    case 'polynomialValue': {
      const coefficients = data.coefficients.slice(0, 2), linear = coefficients[0]! + coefficients[1]! * data.input;
      const initial = rng.int(2, 6), factor = rng.int(2, 3), input = rng.int(0, 5);
      return choose(draft, rng, [
        ['quadratic-function', { prompt: `Find the output f(${data.input}).` }],
        ['linear-function', { prompt: `What is f(${data.input}) for this function?`, math: `f(x)=${polynomial(coefficients)}`,
          data: { ...data, coefficients }, answer: f(linear), solution: `Substitute (${data.input}) for x: f(${data.input}) = ${linear}.` }],
        ['exponential-function', { prompt: `Evaluate f(${input}).`, math: `f(x)=${initial}\\cdot${factor}^x`,
          data: { kind: 'exponential', initial, factor, periods: input }, answer: f(initial * factor ** input),
          solution: `Evaluate the power first, then multiply: f(${input}) = ${initial} × ${factor}^${input} = ${initial * factor ** input}.` }],
      ]);
    }
    case 'averageRate': {
      const value = (x: number) => data.coefficients.reduce((sum, coefficient, degree) => sum + coefficient * x ** degree, 0);
      return choose(draft, rng, [
        ['function-rule', { prompt: `Find the average rate of change on the interval from ${data.first} to ${data.second}.` }],
        ['endpoint-table', { prompt: 'The table gives two values of a function. What is its average rate of change over this interval?', math: `\\begin{array}{c|cc}x&${data.first}&${data.second}\\\\\\hline f(x)&${value(data.first)}&${value(data.second)}\\end{array}` }],
        ['secant', { prompt: `What is the slope of the secant line through the points on this graph with x-coordinates ${data.first} and ${data.second}?` }],
      ]);
    }
    case 'exponential': {
      const decay = rng.pick([true, false]);
      if (decay) {
        const initial = data.initial * data.factor ** data.periods;
        return { ...draft, variantId: 'decay', data: { ...data, initial, factor: 1, factorDenominator: data.factor }, answer: f(data.initial),
          prompt: `A sample begins with mass ${initial} g. After each hour, 1/${data.factor} of its previous mass remains. What mass remains after ${data.periods} hours?`, unit: 'grams',
          solution: `Multiply by 1/${data.factor} for each of ${data.periods} hours: ${initial} × (1/${data.factor})^${data.periods} = ${data.initial} g.` };
      }
      return choose(draft, rng, [
        ['growth-population', { prompt: `A culture begins with ${data.initial} organisms. Its population is multiplied by ${data.factor} each hour. How many organisms are present after ${data.periods} hours?` }],
        ['branching-pattern', { prompt: `A diagram starts with ${data.initial} branches. At each stage every branch splits into ${data.factor} branches. How many branches exist after ${data.periods} stages?`, unit: 'branches',
          solution: `Multiply the starting count by the growth factor once per stage: ${data.initial} × ${data.factor}^${data.periods} = ${draft.answer} branches.` }],
      ]);
    }
    case 'vertex': {
      const extremum = rng.pick(['minimum', 'maximum'] as const), target = rng.pick(['input', 'value'] as const), a = extremum === 'minimum' ? data.a : -data.a;
      return { ...draft, variantId: `${extremum}-${target}`, data: { ...data, a, extremum, target }, answer: f(target === 'input' ? data.h : data.k),
        prompt: target === 'input' ? `At what x-coordinate does this function reach its ${extremum}?` : `What is the ${extremum} output value of this function?`,
        math: `f(x)=${a}(x-(${data.h}))^2+(${data.k})`,
        solution: `The squared term is zero at x = ${data.h}. Because the leading coefficient is ${a > 0 ? 'positive' : 'negative'}, this gives the ${extremum}. Its x-coordinate is ${data.h} and its output is ${data.k}.` };
    }
    case 'xIntercept': return choose(draft, rng, [
      ['equation', { prompt: 'Which input makes this linear function equal to zero?' }],
      ['table', { prompt: 'The table follows a linear rule. What is the x-coordinate where its graph crosses the x-axis?', math: `\\begin{array}{c|cc}x&-1&1\\\\\\hline y&${data.intercept - data.slope}&${data.intercept + data.slope}\\end{array}` }],
      ['zero', { prompt: 'Find the zero of the linear function.' }],
    ]);
    case 'mean': {
      const missing = rng.pick([true, false]), sum = data.values.reduce((total, value) => total + value, 0);
      if (missing) {
        const known = data.values.slice(0, -1), mean = f(sum, data.values.length);
        return { ...draft, variantId: 'missing-value', data: { kind: 'missingMean', known, meanNumerator: Number(mean.n), meanDenominator: Number(mean.d) },
          prompt: `A set of ${data.values.length} values has mean ${mean}. The known values are ${known.join(', ')}. What is the missing value?`, answer: f(data.values.at(-1)!),
          solution: `The required total is ${mean} × ${data.values.length} = ${sum}. Subtract the sum of the known values to get ${data.values.at(-1)}.` };
      }
      return choose(draft, rng, [
        ['data-set', { prompt: `These measurements were recorded: ${data.values.join(', ')}. What is their mean?` }],
        ['equal-share', { prompt: `Five containers hold ${data.values.join(', ')} liters of water. If all the water is redistributed equally among the containers, how many liters go into each?`, unit: 'liters', solution: `The equal share is the mean: (${data.values.join(' + ')})/5 = ${draft.answer} liters.` }],
      ]);
    }
    case 'median': {
      if (rng.pick([true, false])) return choose(draft, rng, [
        ['ordered-middle', { prompt: `Find the median of these measurements: ${data.values.join(', ')}.` }],
        ['context', { prompt: `Recorded waiting times in minutes are ${data.values.join(', ')}. What is the median waiting time?`, unit: 'minutes' }],
      ]);
      const values = rng.shuffle(Array.from({ length: 30 }, (_, i) => i + 3)).slice(0, 7), sorted = [...values].sort((a, b) => a - b);
      const middle = sorted[3]!, mean = f(values.reduce((sum, value) => sum + value, 0), values.length);
      if (mean.equals(f(middle))) return null;
      return numeric(draft, rng, 'odd-count', {
        data: { kind: 'median', values }, answer: f(middle), prompt: `What is the median of these seven values: ${values.join(', ')}?`,
        solution: `Sort the values: ${sorted.join(', ')}. With seven values, the fourth value, ${middle}, is the median.`,
      }, [
        [mean, 'mean-for-median', 'The mean averages all values. The median is the center of the ordered data.'],
        [sorted[2]!, 'middle-one-position-early', 'With seven ordered values, three values belong on either side of the median.'],
        [sorted[4]!, 'middle-one-position-late', 'With seven ordered values, three values belong on either side of the median.'],
        [values[3]!, 'middle-before-ordering', 'Sort the data before taking its middle value.'],
        [f(sorted[0]! + sorted[6]!, 2), 'midrange-for-median', 'Averaging the extremes finds the midrange, not the median.'],
      ], false);
    }
    case 'gardenArea': return choose(draft, rng, [
      ['garden', { prompt: `A garden measures ${data.length} m by ${fraction(data.widthNumerator, data.widthDenominator)} m. How many square meters can be planted?` }],
      ['floor-covering', { prompt: `A rectangular mat is ${data.length} m long and ${fraction(data.widthNumerator, data.widthDenominator)} m wide. How much floor area does it cover?` }],
      ['painted-panel', { prompt: `One face of a rectangular panel is ${data.length} m by ${fraction(data.widthNumerator, data.widthDenominator)} m. How many square meters must be painted?` }],
    ]);
    case 'purchase': {
      const first = rng.int(1, data.units - 1);
      return choose(draft, rng, [
        ['seeds', { prompt: `An order contains ${data.units} packets of seeds at $${decimal(data.priceCents, 2)} per packet, plus one delivery fee of $${decimal(data.feeCents, 2)}. What is the total cost?` }],
        ['combined-order', { prompt: `One group orders ${first} packets of beads and another orders ${data.units - first}. Each packet costs $${decimal(data.priceCents, 2)}. Their combined order has a single $${decimal(data.feeCents, 2)} delivery fee. What is the total cost?` }],
        ['price-list', { prompt: `A price list shows packets for $${decimal(data.priceCents, 2)} each and delivery for $${decimal(data.feeCents, 2)} per order. What does one order of ${data.units} packets cost?` }],
      ]);
    }
    case 'trips': {
      const feedback: Record<string, string> = {
        'discard-trip-remainder': 'The remainder still needs transportation. Count one additional trip even though it is not full.',
        'remainder-as-trip-count': 'The remainder counts what is left after full loads, not the total number of trips.',
        'one-trip-per-remaining-student': 'The remainder fits in one additional load. It does not need a separate trip for each remaining unit.',
        'capacity-as-trip-count': 'Capacity is the amount carried per trip. Divide the total by capacity to plan the trips.',
      };
      return choose({ ...draft, choices: draft.choices?.map(choice => {
        if (choice.misconception === null) return choice;
        const misconception = feedback[choice.errorModel ?? ''];
        if (!misconception) throw new Error('Missing trip feedback.');
        return { ...choice, misconception };
      }), solution: `${data.people} ÷ ${data.capacity} = ${Math.floor(data.people / data.capacity)} full loads with ${data.people % data.capacity} left. Count one additional trip for the remainder.` }, rng, [
        ['shuttle', { prompt: `A shuttle carries at most ${data.capacity} passengers at once. What is the minimum number of trips needed to move ${data.people} passengers?` }],
        ['cart', { prompt: `A cart carries at most ${data.capacity} boxes per trip. How many trips are needed to move all ${data.people} boxes?` }],
        ['boat', { prompt: `A boat carries at most ${data.capacity} crates per crossing. What is the minimum number of crossings needed for ${data.people} crates?` }],
      ]);
    }
    case 'combinedVolume': {
      if (rng.pick([true, false])) return choose(draft, rng, [
        ['two-sections', { prompt: `Two nonoverlapping sections form a model. Their dimensions are ${data.first.join(' by ')} cm and ${data.second.join(' by ')} cm. What is the total volume?` }],
        ['two-boxes', { prompt: `Two boxes have inside dimensions ${data.first.join(' by ')} cm and ${data.second.join(' by ')} cm. What is their combined capacity in cubic centimeters?` }],
      ]);
      const second = data.second, first: [number, number, number] = [second[0] + rng.int(1, 4), second[1] + rng.int(1, 4), second[2] + rng.int(1, 4)];
      const outer = first.reduce((volume, side) => volume * side, 1), removed = second.reduce((volume, side) => volume * side, 1);
      return { ...draft, variantId: 'removed-section', data: { ...data, first, operation: 'subtract' }, answer: f(outer - removed),
        prompt: `A solid block measures ${first.join(' by ')} cm. A rectangular piece measuring ${second.join(' by ')} cm is removed from it. What volume of material remains?`,
        solution: `The original volume is ${outer} cubic centimeters; the removed volume is ${removed}. Subtract: ${outer} - ${removed} = ${outer - removed} cubic centimeters.` };
    }
    case 'placeRatio': {
      const inverse = rng.pick([true, false]), digit = rng.int(2, 9), place = data.power === 1 ? 'tenths' : data.power === 2 ? 'hundredths' : 'thousandths';
      return { ...draft, variantId: inverse ? 'fraction-as-large' : 'times-as-large', data: { ...data, inverse },
        prompt: inverse ? `What fraction of the value of ${digit} in the ones place is the value of ${digit} in the ${place} place?`
          : `How many times as large is ${digit} in the ones place as ${digit} in the ${place} place?`,
        answer: inverse ? f(1, 10 ** data.power) : f(10 ** data.power),
        solution: `The two values are ${digit} and ${digit}/${10 ** data.power}. Divide the requested value by the comparison value to get ${inverse ? f(1, 10 ** data.power) : 10 ** data.power}.` };
    }
    case 'fractionMistake': {
      const error = rng.pick(['add-across', 'denominators-only', 'one-numerator'] as const);
      const claimNumerator = error === 'one-numerator' ? data.a * data.d + data.c : data.a + data.c;
      const claimDenominator = error === 'add-across' ? data.b + data.d : data.b * data.d;
      const action = error === 'add-across' ? 'adds both the numerators and the denominators'
        : error === 'denominators-only' ? 'changes to a common denominator but keeps both original numerators'
        : 'scales the first numerator for a common denominator but does not scale the second numerator';
      return { ...draft, variantId: error, data: { ...data, claimNumerator, claimDenominator },
        prompt: `A student ${action} and writes ${data.a}/${data.b} + ${data.c}/${data.d} = ${claimNumerator}/${claimDenominator}. Which method would correct the student's work?` };
    }
    case 'fractionScale': {
      const whole = rng.int(4, 12), factor = `${data.numerator}/${data.denominator}`;
      return choose({ ...draft, solution: `The factor ${factor} is ${data.numerator < data.denominator ? 'less' : 'greater'} than 1. Multiplying the positive quantity ${whole} by it makes the result ${data.numerator < data.denominator ? 'smaller' : 'larger'} than ${whole}.` }, rng, [
        ['product', { prompt: `Compare ${whole} × ${factor} with ${whole}, without finding the exact product. Which explanation is valid?` }],
        ['resizing', { prompt: `A ${whole} m length is scaled by a factor of ${factor}. Compare the new length with the original length. Which explanation is valid?` }],
        ['recipe', { prompt: `A recipe uses ${whole} cups for one batch. A cook makes ${factor} of a batch. Compare the amount used with ${whole} cups. Which explanation is valid?` }],
      ]);
    }
    default: throw new Error(`No content variants authored for ${data.kind}.`);
  }
}

export function generateVariedDraft(template: Template, rng: Rng, allowNegative = false): Draft {
  for (let attempt = 0; attempt < 100; attempt++) {
    const draft = vary(generateReviewedDraft(template, rng, allowNegative), template, rng);
    if (draft) return { ...draft, variantId: `${template.id}.${draft.variantId}` };
  }
  throw new Error(`Could not generate varied content for ${template.id} after 100 parameter draws.`);
}
