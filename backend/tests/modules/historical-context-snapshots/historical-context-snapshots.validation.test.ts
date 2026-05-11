/// <reference types="@types/jest" />
import { normalizeSnapshotDate, parseGenerateRequest, parseLookupQuery, parseSnapshotQuery } from '../../../src/modules/historical-context-snapshots';

describe('historical context snapshots validation', () => {
  it('normalizes snapshot date to UTC midnight', () => {
    expect(normalizeSnapshotDate('2026-04-29T15:30:00Z').toISOString()).toBe('2026-04-29T00:00:00.000Z');
  });

  it('clamps generation limit', () => {
    expect(parseGenerateRequest({ snapshotDate: '2026-04-29', limit: 9999 }).limit).toBe(250);
  });

  it('defaults and normalizes snapshot market scope', () => {
    expect(parseGenerateRequest({ snapshotDate: '2026-04-29', region: 'us', assetType: 'stock' })).toMatchObject({ region: 'US', assetType: 'STOCK' });
    expect(parseSnapshotQuery({ region: 'in', assetType: 'stock' })).toMatchObject({ region: 'IN', assetType: 'STOCK' });
    expect(parseLookupQuery({ date: '2026-04-29', region: 'eu', assetType: 'stock' })).toMatchObject({ region: 'EU', assetType: 'STOCK' });
  });

  it('rejects invalid ranges and requires lookup date', () => {
    expect(() => parseSnapshotQuery({ from: '2026-04-30', to: '2026-04-29' })).toThrow('from must be before to');
    expect(() => parseLookupQuery({})).toThrow('date is required');
  });
});
