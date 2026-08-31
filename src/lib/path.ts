import { buildCurriculum, type Unit } from '@/learning/curriculum';
import { firstName } from '@/learning/starter';

import { getImportSummary, getVocab } from './db';

/** The user's whole learning path: Day 0's basics, then their own words. */
export function loadCurriculum(): Unit[] {
  return buildCurriculum(getVocab(), { starter: true, name: firstName(getImportSummary()?.self) });
}
