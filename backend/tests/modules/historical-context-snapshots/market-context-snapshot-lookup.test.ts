/// <reference types="@types/jest" />
/**
 * Tests for the nearest-on-or-before MarketContextSnapshot lookup.
 *
 * Covers:
 *  1. lookup returns regime + snapshotDate from the nearest snapshot on/before the query date.
 *  2. regimeForDate convenience method returns the regime string.
 *  3. lookup returns dataStatus MISSING when no market snapshot exists within the window.
 *  4. lookup returns dataStatus PARTIAL when a market snapshot exists but no sector snapshot.
 */
import { HistoricalContextSnapshotsService } from '../../../src/modules/historical-context-snapshots';
import { normalizeSnapshotDate } from '../../../src/modules/historical-context-snapshots/historical-context-snapshots.validation';

const QUERY_DATE = normalizeSnapshotDate('2024-06-15');
const SNAPSHOT_DATE = normalizeSnapshotDate('2024-06-12');

function makeRepo(marketRow: any) {
  return {
    emptyCount: jest.fn(() => ({ inserted: 0, updated: 0, skipped: 0 })),
    upsertMarket: jest.fn().mockResolvedValue('inserted'),
    upsertSector: jest.fn().mockResolvedValue('inserted'),
    upsertCountry: jest.fn().mockResolvedValue('inserted'),
    upsertSmartMoney: jest.fn().mockResolvedValue('inserted'),
    upsertDataQuality: jest.fn().mockResolvedValue('inserted'),
    lookup: jest.fn().mockResolvedValue({
      market: marketRow,
      sector: null,
      country: null,
      smartMoney: null,
      dataQuality: null,
    }),
    coverage: jest.fn().mockResolvedValue({
      marketSnapshots: 1,
      sectorSnapshots: 0,
      countrySnapshots: 0,
      smartMoneySnapshots: 0,
      dataQualitySnapshots: 0,
      latestSnapshotDate: SNAPSHOT_DATE,
    }),
  };
}

describe('historical-context-snapshots nearest-on-or-before lookup', () => {
  it('returns regime and snapshotDate from the closest snapshot on/before the query date', async () => {
    const marketRow = {
      regime: 'RISK_ON',
      regimeScore: 72,
      snapshotDate: SNAPSHOT_DATE,
      region: 'IN',
      dataStatus: 'PARTIAL',
    };
    const repo = makeRepo(marketRow);
    const svc = new HistoricalContextSnapshotsService(repo as any, {} as any, {} as any, {} as any);

    const result = await svc.lookup(QUERY_DATE, 7, { region: 'IN' });

    expect(result.market).toBeDefined();
    expect(result.market!.regime).toBe('RISK_ON');
    expect(result.market!.snapshotDate).toEqual(SNAPSHOT_DATE);
    // Lookup is a persisted read (the repo.lookup mock was called)
    expect(repo.lookup).toHaveBeenCalledWith(
      QUERY_DATE,
      7,
      expect.objectContaining({ region: 'IN' })
    );
  });

  it('returns dataStatus MISSING when no market snapshot exists within window', async () => {
    const repo = makeRepo(null); // no market row
    const svc = new HistoricalContextSnapshotsService(repo as any, {} as any, {} as any, {} as any);

    const result = await svc.lookup(QUERY_DATE, 7, { region: 'IN' });

    expect(result.dataStatus).toBe('MISSING');
    expect(result.market).toBeNull();
    expect(result.gaps).toContain('market context snapshot missing');
  });

  it('returns dataStatus PARTIAL when market snapshot exists but no sector', async () => {
    const marketRow = { regime: 'NEUTRAL', regimeScore: 50, snapshotDate: SNAPSHOT_DATE, region: 'IN', dataStatus: 'PARTIAL' };
    const repo = makeRepo(marketRow);
    const svc = new HistoricalContextSnapshotsService(repo as any, {} as any, {} as any, {} as any);

    const result = await svc.lookup(QUERY_DATE, 7, { region: 'IN', sector: 'Technology' });

    // sector filter is set but no sector row => partial
    expect(result.dataStatus).toBe('PARTIAL');
    expect(result.market).not.toBeNull();
  });

  it('regimeForDate returns regime string for nearest snapshot', async () => {
    const marketRow = { regime: 'RISK_OFF', regimeScore: 30, snapshotDate: SNAPSHOT_DATE, region: 'IN', dataStatus: 'PARTIAL' };
    const repo = makeRepo(marketRow);
    const svc = new HistoricalContextSnapshotsService(repo as any, {} as any, {} as any, {} as any);

    const regime = await svc.regimeForDate(QUERY_DATE, { region: 'IN' });

    expect(regime).toBe('RISK_OFF');
  });

  it('regimeForDate returns null when no snapshot exists within the window', async () => {
    const repo = makeRepo(null);
    const svc = new HistoricalContextSnapshotsService(repo as any, {} as any, {} as any, {} as any);

    const regime = await svc.regimeForDate(QUERY_DATE, { region: 'IN' });

    expect(regime).toBeNull();
  });
});
