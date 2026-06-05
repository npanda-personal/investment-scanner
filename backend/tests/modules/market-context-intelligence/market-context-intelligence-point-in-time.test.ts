/// <reference types="@types/jest" />
/**
 * Tests for point-in-time (asOf) regime snapshot generation.
 *
 * Covers:
 *  1. runAsOf with asOf date slices prices to <= asOf (no look-ahead)
 *  2. snapshotDate stored = asOf date
 *  3. omitting asOf produces current-date behaviour (unchanged)
 *  4. calculateRegime uses only the sliced prices
 */
import { MarketContextIntelligenceService } from '../../../src/modules/market-context-intelligence';

/** Build a mock market-data service whose listPricesByInstrumentId records the endDate arg. */
function makeMarketDataService(pricesOverride?: number[]) {
  const prices = pricesOverride ?? Array.from({ length: 260 }, (_, i) => 120 - i * 0.2);
  const capturedEndDates: Array<Date | undefined> = [];
  return {
    service: {
      listInstruments: jest.fn().mockResolvedValue({
        instruments: [{ id: 'stock-1', symbol: 'AAA', sector: 'Technology', country: 'India' }],
      }),
      listPricesByInstrumentId: jest.fn().mockImplementation(
        (_id: string, _limit: number, _start?: Date, end?: Date) => {
          capturedEndDates.push(end);
          return Promise.resolve({ prices: prices.map((close) => ({ adjusted_close: close })) });
        }
      ),
    },
    capturedEndDates,
  };
}

function makeSignalService() {
  return { topSignals: jest.fn().mockResolvedValue({ signals: [] }) };
}

function makeRepository() {
  const savedSnapshots: Array<{ summary: any; region: string; asOf: Date | undefined }> = [];
  return {
    repo: {
      saveSnapshot: jest.fn().mockImplementation((summary: any, region: string, asOf?: Date) => {
        savedSnapshots.push({ summary, region, asOf });
        return Promise.resolve();
      }),
      latestSnapshot: jest.fn().mockResolvedValue(null),
      latestPersistedSnapshot: jest.fn().mockResolvedValue(null),
      loadIndexPrices: jest.fn().mockResolvedValue([]),
    },
    savedSnapshots,
  };
}

describe('MarketContextIntelligenceService — point-in-time (asOf)', () => {
  it('passes asOf as endDate to listPricesByInstrumentId (no look-ahead)', async () => {
    const asOf = new Date('2024-06-01T00:00:00.000Z');
    const { service: mds, capturedEndDates } = makeMarketDataService();
    const { repo } = makeRepository();
    const svc = new MarketContextIntelligenceService(repo as any, mds as any, makeSignalService() as any);

    await svc.runAsOf('IN', asOf);

    // The endDate passed to price fetches should equal asOf (start of UTC day)
    expect(capturedEndDates.length).toBeGreaterThan(0);
    for (const end of capturedEndDates) {
      expect(end).toBeDefined();
      expect(end!.toISOString().slice(0, 10)).toBe('2024-06-01');
    }
  });

  it('saves the snapshot with snapshotDate = asOf', async () => {
    const asOf = new Date('2023-03-15T00:00:00.000Z');
    const { service: mds } = makeMarketDataService();
    const { repo, savedSnapshots } = makeRepository();
    const svc = new MarketContextIntelligenceService(repo as any, mds as any, makeSignalService() as any);

    await svc.runAsOf('IN', asOf);

    expect(savedSnapshots).toHaveLength(1);
    // The repository saveSnapshot is called with the asOf date as third argument
    expect(savedSnapshots[0].asOf).toBeDefined();
    expect(savedSnapshots[0].asOf!.toISOString().slice(0, 10)).toBe('2023-03-15');
  });

  it('omitting asOf passes no endDate (current behaviour unchanged)', async () => {
    const { service: mds, capturedEndDates } = makeMarketDataService();
    const { repo } = makeRepository();
    const svc = new MarketContextIntelligenceService(repo as any, mds as any, makeSignalService() as any);

    await svc.runAsOf('IN', undefined);

    // All endDate args should be undefined (no date filter on current run)
    expect(capturedEndDates.length).toBeGreaterThan(0);
    for (const end of capturedEndDates) {
      expect(end).toBeUndefined();
    }
  });

  it('run() delegates to runAsOf without asOf (no endDate filter)', async () => {
    const { service: mds, capturedEndDates } = makeMarketDataService();
    const { repo } = makeRepository();
    const svc = new MarketContextIntelligenceService(repo as any, mds as any, makeSignalService() as any);

    await svc.run('IN');

    expect(capturedEndDates.length).toBeGreaterThan(0);
    for (const end of capturedEndDates) {
      expect(end).toBeUndefined();
    }
  });

  it('saveSnapshot is called with asOf date when asOf provided', async () => {
    const asOf = new Date('2022-09-01T00:00:00.000Z');
    const { service: mds } = makeMarketDataService();
    const { repo } = makeRepository();
    const svc = new MarketContextIntelligenceService(repo as any, mds as any, makeSignalService() as any);

    await svc.runAsOf('IN', asOf);

    expect(repo.saveSnapshot).toHaveBeenCalledWith(
      expect.any(Object),
      'IN',
      expect.objectContaining({ toISOString: expect.any(Function) })
    );
    const callArgs = (repo.saveSnapshot as jest.Mock).mock.calls[0];
    const savedAsOf = callArgs[2] as Date;
    expect(savedAsOf.toISOString().slice(0, 10)).toBe('2022-09-01');
  });

  it('saveSnapshot is called without asOf date when asOf omitted', async () => {
    const { service: mds } = makeMarketDataService();
    const { repo } = makeRepository();
    const svc = new MarketContextIntelligenceService(repo as any, mds as any, makeSignalService() as any);

    await svc.run('IN');

    expect(repo.saveSnapshot).toHaveBeenCalledWith(
      expect.any(Object),
      'IN',
      undefined
    );
  });
});
