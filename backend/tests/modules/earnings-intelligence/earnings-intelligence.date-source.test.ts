/// <reference types="@types/jest" />
import {
  registerEarningsDateSource,
  resolveEarningsDateSource,
  supportedEarningsDateSourceRegions,
  type EarningsDateSource,
} from '../../../src/modules/earnings-intelligence/earnings-intelligence.date-source';

describe('earnings date-source registry', () => {
  it('registers the built-in IN and US providers on import', () => {
    expect(supportedEarningsDateSourceRegions()).toEqual(expect.arrayContaining(['IN', 'US']));
    expect(resolveEarningsDateSource('IN')?.region).toBe('IN');
    expect(resolveEarningsDateSource('us')?.region).toBe('US');
  });

  it('returns null for a region with no registered provider', () => {
    expect(resolveEarningsDateSource('ZZ')).toBeNull();
  });

  it('allows a new region to be added by registration alone (no engine edits)', async () => {
    const euSource: EarningsDateSource = {
      region: 'EU',
      label: 'Test EU source',
      async ingest() {
        return {
          region: 'EU',
          source: 'TEST_EU',
          status: 'COMPLETED',
          processed: 1,
          updated: 1,
          alreadySet: 0,
          noMatch: 0,
          warnings: [],
        };
      },
    };
    registerEarningsDateSource(euSource);

    const resolved = resolveEarningsDateSource('eu');
    expect(resolved).not.toBeNull();
    const summary = await resolved!.ingest();
    expect(summary.source).toBe('TEST_EU');
    expect(summary.status).toBe('COMPLETED');
  });
});
