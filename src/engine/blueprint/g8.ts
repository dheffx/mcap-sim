import type { Blueprint } from '../types';

export const grade8: Blueprint = {
  id: 'p1',
  title: 'Grade 8 · legacy MCAP practice',
  description: '20 original Grade 8 questions covering number systems, equations, functions, geometry, and statistics.',
  provenance: {
    status: 'practice',
    sourceUrl: 'https://msde.maryland.gov/academics-0/mathematics',
    note: 'Original Grade 8 practice, not an official MCAP blueprint. Counts and difficulty tiers are app-defined. This condensed MC/numeric form omits constructed responses, adaptive delivery, official section/calculator rules, and scale scores.',
  },
  categories: [
    { id: 'ns', title: 'The Number System', short: 'Number system', count: 3 },
    { id: 'ee', title: 'Expressions & Equations', short: 'Equations', count: 6 },
    { id: 'f', title: 'Functions', short: 'Functions', count: 4 },
    { id: 'g', title: 'Geometry', short: 'Geometry', count: 5 },
    { id: 'sp', title: 'Statistics & Probability', short: 'Statistics', count: 2 },
  ],
  typeCounts: { mc: 10, numeric: 10 },
  difficultyCounts: { 1: 6, 2: 10, 3: 4 },
  totalPoints: 20,
  allowNegativeChoices: true,
  slots: [
    'g8.square-root', 'g8.exponents', 'g8.function-value', 'g8.pythagorean', 'g8.association',
    'g8.cube-root', 'g8.scientific', 'g8.table-rate', 'g8.distance', 'g8.conditional-rate',
    'g8.repeating', 'g8.linear-equation', 'g8.initial-value', 'g8.dilation', 'g8.distribute',
    'g8.slope', 'g8.compare-rates', 'g8.angle', 'g8.system', 'g8.cylinder',
  ],
};
