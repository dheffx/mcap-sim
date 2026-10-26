import type { Blueprint } from '../types';

export const grade5: Blueprint = {
  id: 'p1',
  title: 'Grade 5 · legacy MCAP practice',
  description: 'A 20-question, fixed-form introduction to Grade 5 skills.',
  provenance: {
    status: 'practice',
    sourceUrl: 'https://msde.maryland.gov/academics-0/mathematics',
    note: 'Original practice form, not an official MCAP blueprint. Domain counts, difficulty tiers, and the 1-point MC/numeric mix are app-defined. Legacy MSDE item/point quotas have not been transcribed or verified. Reasoning/modeling constructed responses and official scale scores are not included.',
  },
  categories: [
    { id: 'nbt', title: 'Number & Operations in Base Ten', short: 'Base ten', count: 6 },
    { id: 'nf', title: 'Number & Operations — Fractions', short: 'Fractions', count: 6 },
    { id: 'oa', title: 'Operations & Algebraic Thinking', short: 'Algebraic thinking', count: 2 },
    { id: 'md', title: 'Measurement & Data', short: 'Measurement', count: 4 },
    { id: 'g', title: 'Geometry', short: 'Geometry', count: 2 },
  ],
  typeCounts: { mc: 10, numeric: 10 },
  difficultyCounts: { 1: 6, 2: 10, 3: 4 },
  totalPoints: 20,
  slots: [
    'nbt.multiply', 'nf.add', 'oa.expression', 'md.volume', 'g.coordinate',
    'nbt.divide', 'nf.subtract', 'md.conversion', 'nbt.decimal-add', 'nf.product',
    'oa.pattern', 'md.missing-height', 'nbt.decimal-subtract', 'nf.whole-product',
    'g.classify', 'nbt.decimal-product', 'nf.whole-div-unit', 'md.line-plot',
    'nbt.place-value', 'nf.unit-div-whole',
  ],
};
