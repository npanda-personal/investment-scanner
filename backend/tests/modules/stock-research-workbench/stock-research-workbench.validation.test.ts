/// <reference types="@types/jest" />
import { normalizeResearchRange, validateInstrumentId } from '../../../src/modules/stock-research-workbench';

describe('stock research workbench validation', () => {
  it('normalizes supported ranges and falls back for invalid ranges', () => {
    expect(normalizeResearchRange('3m')).toBe('3M');
    expect(normalizeResearchRange('MAX')).toBe('MAX');
    expect(normalizeResearchRange('nonsense')).toBe('1Y');
    expect(normalizeResearchRange(undefined)).toBe('1Y');
  });

  it('validates instrument ids', () => {
    expect(validateInstrumentId('abc')).toBeNull();
    expect(validateInstrumentId('')).toBe('instrumentId is required');
  });
});
