import { algebra1Templates } from './alg1';
import { templates as grade5Templates } from './g5';
import { mstarTemplates } from './g5-mstar';
import { grade8Templates } from './g8';
import type { Template } from '../types';

export const allTemplates: readonly Template[] = [
  ...grade5Templates, ...grade8Templates, ...mstarTemplates, ...algebra1Templates,
];
