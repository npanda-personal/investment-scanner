/// <reference types="@types/jest" />
import { MarketContextIntelligenceController, MarketContextIntelligenceService } from '../../../src/modules/market-context-intelligence';
import type { SectorIndexInput } from '../../../src/modules/market-context-intelligence';

const point = (date: string, close: number) => ({
  timestamp: new Date(`${date}T00:00:00.000Z`),
  close,
  adjustedClose: null,
});

const sectorIndex = (
  displayName: string,
  closes: { current: number; oneWeek: number; oneMonth: number; threeMonth: number }
): SectorIndexInput => ({
  instrumentId: displayName.toLowerCase().replace(/\s+/g, '-'),
  symbol: displayName.toUpperCase().replace(/\s+/g, '_'),
  displayName,
  sourceSymbol: displayName.toUpperCase(),
  latestPrice: closes.current,
  latestTimestamp: new Date('2026-05-29T00:00:00.000Z'),
  prices: [
    point('2026-05-29', closes.current),
    point('2026-05-22', closes.oneWeek),
    point('2026-04-29', closes.oneMonth),
    point('2026-02-28', closes.threeMonth),
  ],
});

describe('Sector Intelligence Snapshot read model', () => {
  it('ranks sector indexes, generates scores, and classifies strong/improving/weak sectors', () => {
    const service = new MarketContextIntelligenceService({} as any, {} as any, {} as any);

    const snapshots = service.buildSectorSnapshots([
      sectorIndex('NIFTY IT', { current: 140, oneWeek: 130, oneMonth: 120, threeMonth: 100 }),
      sectorIndex('NIFTY BANK', { current: 106, oneWeek: 100, oneMonth: 104, threeMonth: 105 }),
      sectorIndex('NIFTY REALTY', { current: 80, oneWeek: 90, oneMonth: 100, threeMonth: 120 }),
    ], new Date('2026-05-29T00:00:00.000Z'));

    expect(snapshots.map((snapshot) => snapshot.sector)).toEqual(['IT', 'Bank', 'Realty']);
    expect(snapshots[0]).toMatchObject({
      sector: 'IT',
      classification: 'STRONG',
      sectorScore: expect.any(Number),
      trendScore: expect.any(Number),
      return1M: 16.67,
    });
    expect(snapshots[1]).toMatchObject({
      sector: 'Bank',
      classification: 'IMPROVING',
    });
    expect(snapshots[2]).toMatchObject({
      sector: 'Realty',
      classification: 'WEAK',
    });
    expect(snapshots[0].sectorScore).toBeGreaterThan(snapshots[1].sectorScore);
    expect(snapshots[1].sectorScore).toBeGreaterThan(snapshots[2].sectorScore);
    expect(snapshots[0].reasonTags).toEqual(expect.arrayContaining(['STRONG', 'TOP_RELATIVE_RANK', 'POSITIVE_TREND']));
  });

  it('refreshes persisted sector snapshots idempotently for the same data-through date', async () => {
    const repository = {
      loadSectorIndexInputs: jest.fn().mockResolvedValue([
        sectorIndex('NIFTY IT', { current: 140, oneWeek: 130, oneMonth: 120, threeMonth: 100 }),
        sectorIndex('NIFTY REALTY', { current: 80, oneWeek: 90, oneMonth: 100, threeMonth: 120 }),
      ]),
      saveSectorSnapshots: jest.fn().mockResolvedValue({ savedCount: 2, createdCount: 1, updatedCount: 1 }),
    };
    const service = new MarketContextIntelligenceService(repository as any, {} as any, {} as any);

    const first = await service.refreshSectorSnapshots({ region: 'IN', assetType: 'STOCK', dataThroughDate: '2026-05-29' });
    const second = await service.refreshSectorSnapshots({ region: 'IN', assetType: 'STOCK', dataThroughDate: '2026-05-29' });

    expect(first).toMatchObject({
      status: 'COMPLETED',
      scope: { region: 'IN', assetType: 'STOCK' },
      dataThroughDate: '2026-05-29',
      savedCount: 2,
    });
    expect(second.sectors).toEqual(first.sectors);
    expect(repository.saveSectorSnapshots).toHaveBeenCalledTimes(2);
    expect(repository.saveSectorSnapshots).toHaveBeenNthCalledWith(1, first.sectors, { region: 'IN', assetType: 'STOCK' });
    expect(repository.saveSectorSnapshots).toHaveBeenNthCalledWith(2, first.sectors, { region: 'IN', assetType: 'STOCK' });
  });

  it('returns latest persisted sector snapshots through the API controller without refreshing', async () => {
    const envelope = {
      status: 'ready',
      scope: { region: 'IN', assetType: 'STOCK' },
      snapshotDate: '2026-06-01',
      dataThroughDate: '2026-05-29',
      generatedAt: '2026-06-01T08:00:00.000Z',
      materialized: true,
      sourceLabels: {
        sectorIndexes: 'Persisted sector index catalog rows',
        prices: 'Persisted PriceTick and LatestPrice sector index evidence',
      },
      warnings: [],
      sectors: [{
        snapshotDate: '2026-06-01',
        dataThroughDate: '2026-05-29',
        sector: 'IT',
        classification: 'STRONG',
        sectorScore: 95,
        return1W: 7.69,
        return1M: 16.67,
        return3M: 40,
        trendScore: 100,
        reasonTags: ['STRONG'],
        warnings: [],
      }],
    };
    const service = {
      latestSectorIntelligenceSnapshot: jest.fn().mockResolvedValue(envelope),
    };
    const controller = new MarketContextIntelligenceController(service as any, {} as any);
    const req = { query: { region: 'IN', assetType: 'STOCK' } };
    const res = {
      setHeader: jest.fn(),
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await controller.sectorSnapshots(req as any, res as any);

    expect(service.latestSectorIntelligenceSnapshot).toHaveBeenCalledWith({ region: 'IN', assetType: 'STOCK' });
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(res.json).toHaveBeenCalledWith(envelope);
    expect(service).not.toHaveProperty('refreshSectorSnapshots');
  });
});
