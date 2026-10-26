import type { Blueprint } from '../types';

export const algebra1: Blueprint = {
  id: 'p1',
  title: 'Algebra I · MCAP practice',
  description: '20 original Algebra I questions covering algebra, functions, quantities, and statistics.',
  provenance: {
    status: 'practice',
    sourceUrl: 'https://msde.maryland.gov/media/26358',
    note: 'Original Algebra I practice. The linked MSDE blueprint is a reference, not a claim of matching its official quotas. This 20-point MC/numeric form uses app-defined domain counts and difficulty, omits constructed responses and official calculator sections, and reports no scale score.',
  },
  categories: [
    { id: 'nq', title: 'Number & Quantity', short: 'Number & quantity', count: 2 },
    { id: 'a', title: 'Algebra', short: 'Algebra', count: 8 },
    { id: 'f', title: 'Functions', short: 'Functions', count: 6 },
    { id: 's', title: 'Statistics & Probability', short: 'Statistics', count: 4 },
  ],
  typeCounts: { mc: 10, numeric: 10 },
  difficultyCounts: { 1: 6, 2: 10, 3: 4 },
  totalPoints: 20,
  allowNegativeChoices: true,
  slots: [
    'alg1.rational-power', 'alg1.linear-equation', 'alg1.function-value', 'alg1.mean', 'alg1.unit-rate',
    'alg1.polynomial-sum', 'alg1.average-rate', 'alg1.median', 'alg1.polynomial-product', 'alg1.exponential',
    'alg1.factor', 'alg1.sequence', 'alg1.association', 'alg1.quadratic', 'alg1.vertex',
    'alg1.inequality', 'alg1.intercept', 'alg1.regression', 'alg1.system', 'alg1.rearrange',
  ],
};
