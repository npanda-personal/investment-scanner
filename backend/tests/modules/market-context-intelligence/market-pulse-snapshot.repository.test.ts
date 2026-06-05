/// <reference types="@types/jest" />
import { MarketPulseSnapshotRepository } from '../../../src/modules/market-context-intelligence/market-pulse-snapshot.repository';

describe('MarketPulseSnapshotRepository', () => {
  it('upserts Market Pulse snapshots by snapshot date and scope for idempotency', async () => {
    const upsert = jest.fn().mockResolvedValue({ id: 'pulse-1' });
    const repository = new MarketPulseSnapshotRepository({
      marketPulseSnapshot: { upsert },
    } as any);
    const snapshotDate = new Date('2026-06-01T00:00:00.000Z');
    const dataThroughDate = new Date('2026-05-29T00:00:00.000Z');

    await repository.upsertSnapshot({
      snapshotDate,
      dataThroughDate,
      generatedAt: new Date('2026-06-01T06:00:00.000Z'),
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      status: 'FRESH',
      marketHealthScore: 82,
      marketHealthLabel: 'HEALTHY',
      indexTrendScore: 80,
      sectorStrengthScore: 75,
      breadthScore: 70,
      deliveryParticipationScore: 65,
      dataFreshnessScore: 100,
      topIndicesJson: [],
      strongSectorsJson: [],
      weakSectorsJson: [],
      breadthSummaryJson: {
        status: 'READY',
        percentAbove20Dma: 0.75,
        percentAbove50Dma: 0.7,
        percentAbove200Dma: 0.6,
        percentPositive1M: 0.72,
        percentPositive3M: 0.65,
        sampleCount: 100,
        sma20SampleCount: 100,
        sma50SampleCount: 100,
        sma200SampleCount: 100,
        positive1MSampleCount: 100,
        positive3MSampleCount: 100,
        summaryText: 'Breadth sample is healthy.',
      },
      deliverySummaryJson: {
        status: 'READY',
        sampleCount: 100,
        highDeliveryCount: 60,
        highDeliveryPercent: 0.6,
        latestTradingDate: '2026-05-29',
        summaryText: '60 of 100 stocks show high delivery participation.',
      },
      candidateCount: 4,
      warningsJson: [],
      sourceSummaryJson: {
        status: 'FRESH',
        score: 100,
        latestCompletedTradingDate: '2026-05-29',
        dataThroughDate: '2026-05-29',
        segments: {},
      },
      vixSummaryJson: { latest: 14.5, low5d: 13.2, high5d: 16.1, asOf: '2026-05-29', posture: 'CALM' },
      advanceDeclineJson: { advances: 150, declines: 80, ratio: 1.88, asOf: '2026-05-29' },
      pipelineRunId: 'run-1',
    });

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        snapshotDate_region_assetType_timeframe: {
          snapshotDate,
          region: 'IN',
          assetType: 'STOCK',
          timeframe: '1d',
        },
      },
      create: expect.objectContaining({
        snapshotDate,
        dataThroughDate,
        region: 'IN',
        assetType: 'STOCK',
        timeframe: '1d',
        pipelineRunId: 'run-1',
      }),
      update: expect.objectContaining({
        dataThroughDate,
        marketHealthScore: 82,
        candidateCount: 4,
      }),
    }));
  });

  it('returns the latest persisted snapshot without invoking calculation work', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: 'pulse-1', snapshotDate: new Date('2026-06-01T00:00:00.000Z') });
    const repository = new MarketPulseSnapshotRepository({
      marketPulseSnapshot: { findFirst },
    } as any);

    const row = await repository.latestSnapshot({ region: 'IN', assetType: 'STOCK' });

    expect(row).toEqual(expect.objectContaining({ id: 'pulse-1' }));
    expect(findFirst).toHaveBeenCalledWith({
      where: { region: 'IN', assetType: 'STOCK', timeframe: '1d' },
      orderBy: [{ snapshotDate: 'desc' }, { generatedAt: 'desc' }, { updatedAt: 'desc' }],
    });
  });

  it('uses completed NSE index source-file provenance from sector-index prices as SECTOR_INDEX freshness evidence', async () => {
    const sourceFileImport = {
      findMany: jest.fn().mockResolvedValue([
        {
          source: 'NSE',
          segment: 'INDEX',
          status: 'COMPLETED',
          tradingDate: new Date('2026-06-01T00:00:00.000Z'),
          importedAt: new Date('2026-06-01T18:00:00.000Z'),
        },
      ]),
    };
    const priceTick = {
      findMany: jest.fn().mockResolvedValue([
        {
          timestamp: new Date('2026-06-01T00:00:00.000Z'),
          sourceFileImport: {
            source: 'NSE',
            segment: 'INDEX',
            status: 'COMPLETED',
            tradingDate: new Date('2026-06-01T00:00:00.000Z'),
            importedAt: new Date('2026-06-01T18:00:00.000Z'),
          },
        },
      ]),
    };
    const repository = new MarketPulseSnapshotRepository({ sourceFileImport, priceTick } as any);

    const rows = await (repository as any).loadSourceImports('IN');

    expect(priceTick.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        region: 'IN',
        source: 'NIFTY_SECTOR_INDEX',
        sourceFileImportId: { not: null },
      }),
    }));
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: 'NSE',
        segment: 'SECTOR_INDEX',
        status: 'COMPLETED',
        tradingDate: new Date('2026-06-01T00:00:00.000Z'),
      }),
    ]));
  });
});
