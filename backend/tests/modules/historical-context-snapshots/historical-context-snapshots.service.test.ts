/// <reference types="@types/jest" />
import { HistoricalContextSnapshotsService, normalizeSnapshotDate } from '../../../src/modules/historical-context-snapshots';

const snapshotDate = normalizeSnapshotDate('2026-04-29');

function repo(overrides: Record<string, any> = {}) {
  const count = { inserted: 0, updated: 0, skipped: 0 };
  return {
    emptyCount: jest.fn(() => ({ ...count })),
    upsertMarket: jest.fn().mockResolvedValue('inserted'),
    upsertSector: jest.fn().mockResolvedValue('inserted'),
    upsertCountry: jest.fn().mockResolvedValue('updated'),
    upsertSmartMoney: jest.fn().mockResolvedValue('inserted'),
    upsertDataQuality: jest.fn().mockResolvedValue('inserted'),
    coverage: jest.fn().mockResolvedValue({
      marketSnapshots: 1,
      sectorSnapshots: 2,
      countrySnapshots: 1,
      smartMoneySnapshots: 1,
      dataQualitySnapshots: 1,
      latestSnapshotDate: snapshotDate,
    }),
    lookup: jest.fn().mockResolvedValue({
      market: { regime: 'RISK_ON', snapshotDate },
      sector: null,
      country: null,
      smartMoney: null,
      dataQuality: null,
    }),
    ...overrides,
  };
}

const marketContext = {
  summary: jest.fn().mockResolvedValue({
    regime: { regime: 'RISK_ON', score: 75 },
    breadth: { percentAboveSma50: 0.7, percentAboveSma200: 0.6, advanceDeclineRatio: 1.2, newHigh52WeekCount: 3, newLow52WeekCount: 1 },
    macro: { macroStatus: 'UNKNOWN' },
    explanation: ['Risk-on context.'],
    topSectors: [{ sector: 'Technology', return1M: 0.03, return3M: 0.1, return6M: 0.2, relativeStrengthScore: 80, instrumentCount: 10, bullishSignalCount: 6, bearishSignalCount: 1, leadershipStatus: 'LEADING' }],
    weakSectors: [{ sector: 'Utilities', return1M: -0.01, return3M: 0.01, return6M: 0.02, relativeStrengthScore: 35, instrumentCount: 5, bullishSignalCount: 1, bearishSignalCount: 3, leadershipStatus: 'LAGGING' }],
    countryStrength: [{ country: 'US', return1M: 0.02, return3M: 0.06, return6M: 0.1, relativeStrengthScore: 65, bullishSignalCount: 4 }],
    dataStatus: 'PARTIAL',
  }),
};

const smartMoneySummary = {
  smartMoneyScore: 72,
  status: 'ACCUMULATION',
  confidence: 'MEDIUM',
  signals: [{ direction: 'ACCUMULATION', type: 'UNUSUAL_VOLUME' }],
  explanation: 'Accumulation leaning.',
  source: 'market-data-foundation',
  dataStatus: 'PARTIAL',
  sector: 'Technology',
};

const smartMoney = {
  stock: jest.fn().mockResolvedValue({
    ...smartMoneySummary,
    evidence: { provenance: { source: 'ON_DEMAND_DERIVED', downstreamSafe: false } },
  }),
  latestPersistedStock: jest.fn().mockResolvedValue(smartMoneySummary),
};

const marketData = {
  listInstruments: jest.fn().mockResolvedValue({ instruments: [{ id: 'stock-1', symbol: 'AAPL', sector: 'Technology', industry: 'Consumer Electronics' }] }),
  listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: Array.from({ length: 252 }) }),
  latestPriceByInstrumentId: jest.fn().mockResolvedValue({ latest: { close: 100 } }),
  fundamentalsByInstrumentId: jest.fn().mockResolvedValue({ records: [{}] }),
};

describe('historical context snapshots service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates market, sector, country, smart-money, and data-quality snapshots', async () => {
    const repository = repo();
    const service = new HistoricalContextSnapshotsService(repository as any, marketContext as any, smartMoney as any, marketData as any);
    const result = await service.generate(snapshotDate, 5, { region: 'IN', assetType: 'STOCK' });
    expect(result.market.inserted).toBe(1);
    expect(result.region).toBe('IN');
    expect(result.assetType).toBe('STOCK');
    expect(result.sectors.inserted).toBe(2);
    expect(result.countries.updated).toBe(1);
    expect(result.smartMoney.inserted).toBe(1);
    expect(result.dataQuality.inserted).toBe(1);
    expect(marketContext.summary).toHaveBeenCalledWith({ region: 'IN' });
    expect(marketData.listInstruments).toHaveBeenCalledWith(expect.objectContaining({ region: 'IN', assetType: 'STOCK' }));
    expect(marketData.listPricesByInstrumentId).toHaveBeenCalledWith('stock-1', 500, undefined, undefined, { region: 'IN', assetType: 'STOCK' });
    expect(marketData.latestPriceByInstrumentId).toHaveBeenCalledWith('stock-1', { region: 'IN', assetType: 'STOCK' });
    expect(smartMoney.latestPersistedStock).toHaveBeenCalledWith('stock-1', '3M');
    expect(smartMoney.stock).not.toHaveBeenCalled();
    expect(repository.upsertMarket).toHaveBeenCalledWith(expect.objectContaining({ snapshotDate, region: 'IN', regime: 'RISK_ON' }));
    expect(repository.upsertSector).toHaveBeenCalledWith(expect.objectContaining({ snapshotDate, region: 'IN' }));
    expect(repository.upsertCountry).toHaveBeenCalledWith(expect.objectContaining({ snapshotDate, region: 'IN' }));
  });

  it('does not persist on-demand smart-money evidence into historical context snapshots', async () => {
    const repository = repo();
    const unsafeSmartMoney = {
      stock: jest.fn().mockResolvedValue({
        ...smartMoneySummary,
        evidence: { provenance: { source: 'ON_DEMAND_DERIVED', downstreamSafe: false } },
      }),
    };
    const service = new HistoricalContextSnapshotsService(repository as any, marketContext as any, unsafeSmartMoney as any, marketData as any);

    const result = await service.generate(snapshotDate, 5, { region: 'IN', assetType: 'STOCK' });

    expect(unsafeSmartMoney.stock).not.toHaveBeenCalled();
    expect(repository.upsertSmartMoney).not.toHaveBeenCalled();
    expect(result.smartMoney.skipped).toBe(1);
  });

  it('skips explicitly downstream-unsafe smart-money evidence', async () => {
    const repository = repo();
    const unsafeSmartMoney = {
      latestPersistedStock: jest.fn().mockResolvedValue({
        ...smartMoneySummary,
        evidence: { provenance: { source: 'ON_DEMAND_DERIVED', downstreamSafe: false } },
      }),
    };
    const service = new HistoricalContextSnapshotsService(repository as any, marketContext as any, unsafeSmartMoney as any, marketData as any);

    const result = await service.generate(snapshotDate, 5, { region: 'IN', assetType: 'STOCK' });

    expect(repository.upsertSmartMoney).not.toHaveBeenCalled();
    expect(result.smartMoney.skipped).toBe(1);
    expect(result.warnings).toContain('AAPL smart-money snapshot skipped: on-demand evidence is not downstream safe.');
  });

  it('handles partial generation failures with warnings', async () => {
    const repository = repo();
    const failingMarket = { summary: jest.fn().mockRejectedValue(new Error('boom')) };
    const service = new HistoricalContextSnapshotsService(repository as any, failingMarket as any, smartMoney as any, marketData as any);
    const result = await service.generate(snapshotDate, 5);
    expect(result.market.skipped).toBe(1);
    expect(result.warnings[0]).toContain('market context summary failed');
  });

  it('skips Unknown sector leadership during generation and records a metadata-gap warning', async () => {
    const repository = repo();
    const contextWithUnknownSector = {
      summary: jest.fn().mockResolvedValue({
        ...(await marketContext.summary()),
        topSectors: [
          { sector: 'Unknown', return1M: 0.03, return3M: 0.1, return6M: 0.2, relativeStrengthScore: 72, instrumentCount: 72, bullishSignalCount: 6, bearishSignalCount: 1, leadershipStatus: 'LEADING' },
          { sector: 'Financials', return1M: 0.02, return3M: 0.07, return6M: 0.11, relativeStrengthScore: 80, instrumentCount: 12, bullishSignalCount: 7, bearishSignalCount: 1, leadershipStatus: 'LEADING' },
        ],
        weakSectors: [],
      }),
    };
    const service = new HistoricalContextSnapshotsService(repository as any, contextWithUnknownSector as any, smartMoney as any, marketData as any);

    const result = await service.generate(snapshotDate, 5, { region: 'IN', assetType: 'STOCK' });

    expect(result.sectors).toMatchObject({ inserted: 1, skipped: 1 });
    expect(repository.upsertSector).toHaveBeenCalledTimes(1);
    expect(repository.upsertSector).toHaveBeenCalledWith(expect.objectContaining({ sector: 'Financials' }));
    expect(result.warnings).toContain('Sector Unknown is a metadata gap and is not ranked as sector leadership evidence.');
  });

  it('returns lookup gaps and data status', async () => {
    const repository = repo();
    const service = new HistoricalContextSnapshotsService(repository as any, marketContext as any, smartMoney as any, marketData as any);
    const result = await service.lookup(snapshotDate, 7, { sector: 'Technology', instrumentId: 'stock-1', region: 'IN', assetType: 'STOCK' });
    expect(result.dataStatus).toBe('PARTIAL');
    expect(repository.lookup).toHaveBeenCalledWith(snapshotDate, 7, expect.objectContaining({ region: 'IN', assetType: 'STOCK' }));
    expect(result.gaps).toEqual(expect.arrayContaining(['sector context snapshot missing', 'smart-money context snapshot missing']));
  });

  it('returns metadata-gap explanation for Unknown sector lookup instead of a ranked sector', async () => {
    const repository = repo({
      lookup: jest.fn().mockResolvedValue({
        market: { regime: 'RISK_ON', snapshotDate },
        sector: null,
        country: null,
        smartMoney: null,
        dataQuality: null,
      }),
    });
    const service = new HistoricalContextSnapshotsService(repository as any, marketContext as any, smartMoney as any, marketData as any);

    const result = await service.lookup(snapshotDate, 7, { sector: 'Unknown', region: 'IN', assetType: 'STOCK' });

    expect(result.sector).toBeNull();
    expect(repository.lookup).toHaveBeenCalledWith(snapshotDate, 7, expect.objectContaining({ sector: undefined }));
    expect(result.gaps).toContain('Sector Unknown is a metadata gap and is not ranked as sector leadership evidence.');
  });

  it('returns coverage warnings when empty', async () => {
    const repository = repo({ coverage: jest.fn().mockResolvedValue({ marketSnapshots: 0, sectorSnapshots: 0, countrySnapshots: 0, smartMoneySnapshots: 0, dataQualitySnapshots: 0, latestSnapshotDate: null }) });
    const service = new HistoricalContextSnapshotsService(repository as any, marketContext as any, smartMoney as any, marketData as any);
    await expect(service.coverage({ region: 'IN', assetType: 'STOCK' })).resolves.toMatchObject({ warnings: ['No market context snapshots have been generated yet.'] });
    expect(repository.coverage).toHaveBeenCalledWith({ region: 'IN', assetType: 'STOCK' });
  });
});
