import type { ResearchRange } from './stock-research-workbench.types';

export const RESEARCH_RANGES: ResearchRange[] = ['1W', '1M', '3M', '6M', 'YTD', '1Y', '3Y', '5Y', 'MAX'];

export const normalizeResearchRange = (value: unknown): ResearchRange => {
  if (typeof value !== 'string') return '1Y';
  const upper = value.toUpperCase() as ResearchRange;
  return RESEARCH_RANGES.includes(upper) ? upper : '1Y';
};

export const validateInstrumentId = (value: unknown): string | null => {
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    return 'instrumentId is required';
  }
  return null;
};
