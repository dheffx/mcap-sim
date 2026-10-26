import type { Blueprint, Category } from '../types';

const content = [
  'nbt.multiply', 'nbt.divide', 'nbt.decimal-add', 'nf.add', 'nf.whole-product',
  'nf.unit-div-whole', 'oa.pattern', 'md.volume', 'g.coordinate', 'g.classify',
];
const modeling = [
  'mstar.garden', 'mstar.purchase', 'mstar.trips', 'mstar.combined-volume', 'mstar.ribbon', 'mstar.servings',
];
const reasoning = ['mstar.place-ratio', 'mstar.fraction-error', 'mstar.scaling', 'mstar.layers'];

const overrides: Record<string, Category> = {};
for (const id of content) overrides[id] = 'content';
for (const id of modeling) overrides[id] = 'modeling';
for (const id of reasoning) overrides[id] = 'reasoning';

export const grade5Mstar: Blueprint = {
  id: 'p1',
  title: 'Grade 5 · MSTAR practice',
  description: 'Grade 5 practice organized into content, modeling, and reasoning.',
  provenance: {
    status: 'practice',
    sourceUrl: 'https://msde.maryland.gov/media/26375',
    note: 'Original MSTAR-inspired Grade 5 practice, not a transcription of the official blueprint. The 10 content, 6 modeling, and 4 reasoning slots and 20 one-point MC/numeric items are app-defined. Reasoning is limited to auto-gradable questions; written justifications, official quotas, calculator sections, and scale scores are not simulated.',
  },
  categories: [
    { id: 'content', title: 'Content', short: 'Content', count: 10 },
    { id: 'modeling', title: 'Modeling', short: 'Modeling', count: 6 },
    { id: 'reasoning', title: 'Reasoning', short: 'Reasoning', count: 4 },
  ],
  typeCounts: { mc: 10, numeric: 10 },
  difficultyCounts: { 1: 6, 2: 10, 3: 4 },
  totalPoints: 20,
  categoryOverrides: overrides,
  slots: [
    'nbt.multiply', 'mstar.garden', 'mstar.place-ratio', 'nbt.divide', 'mstar.purchase',
    'nbt.decimal-add', 'mstar.fraction-error', 'nf.add', 'mstar.trips', 'nf.whole-product',
    'mstar.scaling', 'nf.unit-div-whole', 'mstar.combined-volume', 'oa.pattern', 'mstar.layers',
    'md.volume', 'mstar.ribbon', 'g.coordinate', 'mstar.servings', 'g.classify',
  ],
};
