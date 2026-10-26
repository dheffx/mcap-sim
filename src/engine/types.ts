import type { Rng } from './rng';
import type { Fraction } from './fraction';

export type Category = 'nbt' | 'nf' | 'oa' | 'md' | 'g' | 'ns' | 'ee' | 'f' | 'sp' | 'nq' | 'a' | 's' | 'content' | 'modeling' | 'reasoning';
export type ItemType = 'mc' | 'numeric';
export type Difficulty = 1 | 2 | 3;

export type ProblemData =
  | { kind: 'product'; a: number; b: number }
  | { kind: 'quotient'; dividend: number; divisor: number }
  | { kind: 'decimal'; a: number; b: number; scale: number; operation: 'add' | 'subtract' | 'multiply' }
  | { kind: 'place'; value: number; position: number }
  | { kind: 'fraction'; a: number; b: number; c: number; d: number; operation: 'add' | 'subtract' | 'multiply' }
  | { kind: 'unitDivision'; whole: number; denominator: number; unitFirst: boolean }
  | { kind: 'expression'; a: number; b: number; c: number }
  | { kind: 'pattern'; start: number; step: number; index: number }
  | { kind: 'volume'; length: number; width: number; height: number; missingHeight: boolean; volume: number }
  | { kind: 'conversion'; quantity: number; factor: number }
  | { kind: 'plot'; counts: number[]; denominator: number }
  | { kind: 'coordinate'; x: number; y: number }
  | { kind: 'shape'; equalSides: number; rightAngles: number }
  | { kind: 'root'; radicand: number; degree: 2 | 3; power: number }
  | { kind: 'repeating'; digit: number; whole?: number }
  | { kind: 'exponentSum'; a: number; b: number }
  | { kind: 'scientific'; coefficient: number; places: number; exponent: number }
  | { kind: 'linearEquation'; a: number; b: number; c: number }
  | { kind: 'distributedEquation'; a: number; b: number; c: number; d: number }
  | { kind: 'slope'; x1: number; y1: number; x2: number; y2: number }
  | { kind: 'system'; a: number; b: number; c: number; d: number; e: number; f: number; variable: 'x' | 'y' }
  | { kind: 'linearValue'; slope: number; intercept: number; input: number }
  | { kind: 'rateDifference'; first: number; second: number }
  | { kind: 'pythagorean'; a: number; b: number }
  | { kind: 'distance'; x1: number; y1: number; x2: number; y2: number }
  | { kind: 'dilation'; x: number; factor: number }
  | { kind: 'triangleAngle'; a: number; b: number }
  | { kind: 'cylinder'; radius: number; height: number }
  | { kind: 'association'; points: readonly (readonly [number, number])[] }
  | { kind: 'conditionalRate'; successes: number; other: number }
  | { kind: 'polynomialSum'; left: number[]; right: number[]; degree: number }
  | { kind: 'polynomialProduct'; p: number; q: number }
  | { kind: 'factorization'; sum: number; product: number }
  | { kind: 'quadratic'; a: number; b: number; c: number }
  | { kind: 'inequality'; a: number; b: number; c: number }
  | { kind: 'trapezoidHeight'; area: number; firstBase: number; secondBase: number }
  | { kind: 'polynomialValue'; coefficients: number[]; input: number }
  | { kind: 'averageRate'; coefficients: number[]; first: number; second: number }
  | { kind: 'exponential'; initial: number; factor: number; periods: number }
  | { kind: 'vertex'; a: number; h: number; k: number }
  | { kind: 'xIntercept'; slope: number; intercept: number }
  | { kind: 'mean'; values: number[] }
  | { kind: 'median'; values: number[] }
  | { kind: 'gardenArea'; length: number; widthNumerator: number; widthDenominator: number }
  | { kind: 'purchase'; units: number; priceCents: number; feeCents: number }
  | { kind: 'trips'; people: number; capacity: number }
  | { kind: 'combinedVolume'; first: readonly [number, number, number]; second: readonly [number, number, number] }
  | { kind: 'placeRatio'; power: number }
  | { kind: 'fractionMistake'; a: number; b: number; c: number; d: number }
  | { kind: 'fractionScale'; numerator: number; denominator: number };

export type Figure =
  | { kind: 'box'; length: number; width: number; height: number | null }
  | { kind: 'coordinate'; x: number; y: number }
  | { kind: 'plot'; counts: number[]; denominator: number }
  | { kind: 'graph'; points: readonly (readonly [number, number])[]; connect: boolean };

export interface ChoiceDraft {
  value: string;
  label: string;
  misconception: string | null;
  text?: boolean;
  errorModel?: string;
}

export interface Choice extends ChoiceDraft {
  id: string;
}

export interface Item {
  id: string;
  templateId: string;
  category: Category;
  standard: string;
  difficulty: Difficulty;
  type: ItemType;
  points: 1;
  prompt: string;
  math?: string;
  unit?: string;
  figure?: Figure;
  data: ProblemData;
  choices?: Choice[];
  key: string;
  solution: string;
}

export interface Draft {
  prompt: string;
  math?: string;
  unit?: string;
  figure?: Figure;
  data: ProblemData;
  answer: Fraction | string;
  solution: string;
  distractors?: { value: Fraction; misconception: string }[];
  choices?: ChoiceDraft[];
}

export interface Template {
  id: string;
  category: Category;
  standard: string;
  difficulty: Difficulty;
  type: ItemType;
  generate: (rng: Rng) => Draft;
}

export interface Blueprint {
  id: string;
  title: string;
  description: string;
  provenance: { status: 'practice'; sourceUrl: string; note: string };
  categories: readonly { id: Category; title: string; short: string; count: number }[];
  typeCounts: Record<ItemType, number>;
  difficultyCounts: Record<Difficulty, number>;
  totalPoints: number;
  slots: readonly string[];
  categoryOverrides?: Readonly<Record<string, Category>>;
  allowNegativeChoices?: boolean;
}

export interface Assessment {
  id: string;
  title: string;
  subtitle: string;
  status: 'available' | 'planned';
  blueprint?: Blueprint;
}

export interface GeneratedTest {
  code: string;
  seed: string;
  blueprint: Blueprint;
  items: Item[];
}
