import { algebra1 } from './blueprint/alg1';
import { grade5 } from './blueprint/g5';
import { grade5Mstar } from './blueprint/g5-mstar';
import { grade8 } from './blueprint/g8';
import type { Assessment } from './types';

export const assessments: readonly Assessment[] = [
  { id: 'g5', title: 'Grade 5', subtitle: 'Legacy MCAP practice', status: 'available', blueprint: grade5 },
  { id: 'g8', title: 'Grade 8', subtitle: 'Legacy MCAP practice', status: 'available', blueprint: grade8 },
  { id: 'g5-mstar', title: 'Grade 5', subtitle: 'MSTAR practice', status: 'available', blueprint: grade5Mstar },
  { id: 'alg1', title: 'Algebra I', subtitle: 'MCAP practice', status: 'available', blueprint: algebra1 },
];
