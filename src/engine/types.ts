import type { Rng } from './rng';
import type { Fraction } from './fraction';

export type Category = 'nbt' | 'nf' | 'oa' | 'md' | 'g';
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
  | { kind: 'shape'; equalSides: number; rightAngles: number };

export type Figure =
  | { kind: 'box'; length: number; width: number; height: number | null }
  | { kind: 'coordinate'; x: number; y: number }
  | { kind: 'plot'; counts: number[]; denominator: number };

export interface Choice {
  id: string;
  value: string;
  label: string;
  misconception: string | null;
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
  answer: Fraction | 'square';
  solution: string;
  distractors?: { value: Fraction; misconception: string }[];
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
