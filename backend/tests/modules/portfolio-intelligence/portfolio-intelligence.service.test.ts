/// <reference types="@types/jest" />
import { PortfolioIntelligenceService } from '../../../src/modules/portfolio-intelligence';

const portfolio = {
  id: 'portfolio-1',
  name: 'Core',
  baseCurrency: 'USD',
  description: null,
  createdAt: '2026-04-28T00:00:00.000Z',
  updatedAt: '2026-04-28T00:00:00.000Z',
};

const holding = (overrides: any = {}) => ({
  id: overrides.id || 'holding-1',
  portfolioId: 'portfolio-1',
  instrumentId: overrides.instrumentId || 'stock-1',
  symbol: overrides.symbol || 'AAA',
  companyName: overrides.companyName || 'AAA Co',
  quantity: 10,
  averageCost: 80,
  currency: 'USD',
  notes: null,
  createdAt: '2026-04-28T00:00:00.000Z',
  updatedAt: '2026-04-28T00:00:00.000Z',
  currentPrice: overrides.currentPrice ?? 100,
  priceDate: overrides.priceDate ?? '2026-06-04',
  marketValue: overrides.marketValue ?? 1000,
  investedAmount: 800,
  unrealizedPnL: overrides.unrealizedPnL ?? 200,
  unrealizedPnLPercent: overrides.unrealizedPnLPercent ?? 0.25,
  dailyChange: overrides.dailyChange ?? 2,
  dailyChangePercent: overrides.dailyChangePercent ?? 0.02,
  allocationPercent: overrides.allocationPercent ?? 0.2,
  sector: overrides.sector || 'Technology',
  country: overrides.country || 'US',
  signal: overrides.signal === undefined ? {
    score: 82,
    direction: 'BULLISH',
    confidence: 'HIGH',
    generatedAt: new Date().toISOString(),
  } : overrides.signal,
});

const summary = (holdings: any[]) => ({
  portfolio,
  totalValue: holdings.reduce((total, item) => total + item.marketValue, 0),
  totalInvested: holdings.reduce((total, item) => total + item.investedAmount, 0),
  totalUnrealizedPnL: holdings.reduce((total, item) => total + item.unrealizedPnL, 0),
  totalUnrealizedPnLPercent: 0.1,
  dailyPnL: 0,
  dailyPnLPercent: 0,
  numberOfHoldings: holdings.length,
  holdings,
  source: 'portfolio-management',
  dataStatus: holdings.some((item) => item.currentPrice === null) ? 'PARTIAL' : 'COMPLETE',
  generatedAt: '2026-04-28T00:00:00.000Z',
});

const allocation = (holdings: any[]) => ({
  portfolioId: 'portfolio-1',
  byHolding: holdings.map((item) => ({ key: item.symbol, value: item.marketValue, allocationPercent: item.allocationPercent })),
  bySector: [{ key: 'Technology', value: holdings.reduce((total, item) => total + item.marketValue, 0), allocationPercent: 1 }],
  byCountry: [{ key: 'US', value: holdings.reduce((total, item) => total + item.marketValue, 0), allocationPercent: 1 }],
  byCurrency: [{ key: 'USD', value: holdings.reduce((total, item) => total + item.marketValue, 0), allocationPercent: 1 }],
  generatedAt: '2026-04-28T00:00:00.000Z',
});

/**
 * Mock repository: cache miss on findByPortfolioId + findComputedAt so the
 * service falls through to compute + persist on every intelligence() call.
 * findLatestWatermarks returns [] by default (no watermarks = no watermark-driven staleness).
 * bulkLatestSnapshots returns empty map by default (no snapshot rows).
 */
const mockRepo = () => ({
  findByPortfolioId: jest.fn().mockResolvedValue(null),
  findComputedAt: jest.fn().mockResolvedValue(null),
  upsertSnapshot: jest.fn().mockResolvedValue(undefined),
  findLatestWatermarks: jest.fn().mockResolvedValue([]),
  bulkLatestSnapshots: jest.fn().mockResolvedValue(new Map()),
});

const serviceWith = (holdings: any[]) => new PortfolioIntelligenceService(
  {
    summary: jest.fn().mockResolvedValue(summary(holdings)),
    allocation: jest.fn().mockResolvedValue(allocation(holdings)),
    // getPortfolioDetail is called by intelligence() for the staleness guard.
    getPortfolioDetail: jest.fn().mockResolvedValue({ portfolio, holdings }),
  } as any,
  undefined,   // default thresholds
  undefined,   // no capitalPostureService
  mockRepo() as any,
);

describe('PortfolioIntelligenceService', () => {
  it('calculates health score and status thresholds', async () => {
    const result = await serviceWith([
      holding({ id: 'h1', symbol: 'AAA', allocationPercent: 0.2 }),
      holding({ id: 'h2', symbol: 'BBB', allocationPercent: 0.2, sector: 'Healthcare' }),
      holding({ id: 'h3', symbol: 'CCC', allocationPercent: 0.2, sector: 'Financials' }),
      holding({ id: 'h4', symbol: 'DDD', allocationPercent: 0.2, sector: 'Industrials' }),
      holding({ id: 'h5', symbol: 'EEE', allocationPercent: 0.2, sector: 'Energy' }),
    ]).intelligence('portfolio-1');

    expect(result?.healthScore).toBeGreaterThanOrEqual(50);
    expect(['HEALTHY', 'WATCH']).toContain(result?.status);
    expect(result?.scoreBreakdown.signalQuality).toBeGreaterThan(50);
  });

  it('labels missing price as high risk and creates red flags', async () => {
    const missingPrice = holding({
      currentPrice: null,
      marketValue: 0,
      unrealizedPnL: -800,
      unrealizedPnLPercent: -1,
      signal: null,
    });
    const result = await serviceWith([missingPrice]).intelligence('portfolio-1');

    expect(result?.holdings[0].decisionLabel).toBe('HIGH_RISK');
    expect(result?.redFlags.some((flag) => flag.category === 'data')).toBe(true);
    expect(result?.groupedSummary.dataIssues.length).toBe(1);
  });

  it('detects bearish and loss red flags', async () => {
    const result = await serviceWith([
      holding({
        unrealizedPnL: -200,
        unrealizedPnLPercent: -0.2,
        dailyChangePercent: -0.06,
        signal: { score: 25, direction: 'BEARISH', confidence: 'MEDIUM', generatedAt: new Date().toISOString() },
      }),
    ]).intelligence('portfolio-1');

    expect(result?.redFlags.map((flag) => flag.category)).toEqual(expect.arrayContaining(['holding-loss', 'daily-drop', 'signal']));
    expect(result?.reviewRanking[0].decisionLabel).toBe('HIGH_RISK');
  });

  it('sorts review ranking by urgency', async () => {
    const result = await serviceWith([
      holding({ id: 'good', symbol: 'GOOD' }),
      holding({ id: 'review', symbol: 'REV', signal: { score: 30, direction: 'BEARISH', confidence: 'LOW', generatedAt: new Date().toISOString() } }),
      holding({ id: 'risk', symbol: 'RISK', currentPrice: null, marketValue: 0, unrealizedPnL: -800, unrealizedPnLPercent: -1 }),
    ]).intelligence('portfolio-1');

    expect(result?.reviewRanking[0].symbol).toBe('RISK');
    expect(result?.reviewRanking[1].symbol).toBe('REV');
  });

  it('summarizes signal overlay', async () => {
    const result = await serviceWith([
      holding({ symbol: 'BULL', signal: { score: 80, direction: 'BULLISH', confidence: 'HIGH', generatedAt: new Date().toISOString() } }),
      holding({ symbol: 'BEAR', signal: { score: 20, direction: 'BEARISH', confidence: 'LOW', generatedAt: new Date().toISOString() } }),
      holding({ symbol: 'MISS', signal: null }),
    ]).intelligence('portfolio-1');

    expect(result?.signalOverlay).toMatchObject({
      bullishCount: 1,
      bearishCount: 1,
      missingSignalCount: 1,
    });
  });

  it('handles empty portfolios', async () => {
    const result = await serviceWith([]).intelligence('portfolio-1');

    expect(result?.status).toBe('AT_RISK');
    expect(result?.holdings).toEqual([]);
    expect(result?.redFlags.some((flag) => flag.category === 'diversification')).toBe(true);
  });

  // ── Staleness-guard tests ──────────────────────────────────────────────────

  describe('staleness guard', () => {
    const freshSnapshot = { portfolioId: 'portfolio-1', healthScore: 80, status: 'HEALTHY' } as any;

    it('serves the cached snapshot when computedAt is newer than portfolio.updatedAt', async () => {
      const portfolioUpdatedAt = new Date('2026-04-28T00:00:00.000Z');
      const computedAt = new Date('2026-04-29T00:00:00.000Z'); // computed AFTER last holdings change
      const repo = {
        findByPortfolioId: jest.fn().mockResolvedValue(freshSnapshot),
        findComputedAt: jest.fn().mockResolvedValue(computedAt),
        upsertSnapshot: jest.fn(),
        findLatestWatermarks: jest.fn().mockResolvedValue([]),
        bulkLatestSnapshots: jest.fn().mockResolvedValue(new Map()),
      };
      const portfolioDetail = { portfolio: { ...portfolio, updatedAt: portfolioUpdatedAt.toISOString() }, holdings: [] };
      const svc = new PortfolioIntelligenceService(
        { summary: jest.fn(), allocation: jest.fn(), getPortfolioDetail: jest.fn().mockResolvedValue(portfolioDetail) } as any,
        undefined, undefined, repo as any,
      );

      const result = await svc.intelligence('portfolio-1');

      // Should have served the cached snapshot without recomputing
      expect(result).toBe(freshSnapshot);
      expect(repo.upsertSnapshot).not.toHaveBeenCalled();
    });

    it('recomputes when portfolio.updatedAt is newer than snapshot.computedAt (stale)', async () => {
      const computedAt = new Date('2026-04-28T00:00:00.000Z');
      const portfolioUpdatedAt = new Date('2026-04-29T00:00:00.000Z'); // holdings changed AFTER last compute
      const repo = {
        findByPortfolioId: jest.fn().mockResolvedValue(freshSnapshot),
        findComputedAt: jest.fn().mockResolvedValue(computedAt),
        upsertSnapshot: jest.fn().mockResolvedValue(undefined),
        findLatestWatermarks: jest.fn().mockResolvedValue([]),
        bulkLatestSnapshots: jest.fn().mockResolvedValue(new Map()),
      };
      const h = [holding()];
      const portfolioDetail = { portfolio: { ...portfolio, updatedAt: portfolioUpdatedAt.toISOString() }, holdings: h };
      const svc = new PortfolioIntelligenceService(
        {
          summary: jest.fn().mockResolvedValue(summary(h)),
          allocation: jest.fn().mockResolvedValue(allocation(h)),
          getPortfolioDetail: jest.fn().mockResolvedValue(portfolioDetail),
        } as any,
        undefined, undefined, repo as any,
      );

      await svc.intelligence('portfolio-1');

      // upsertSnapshot must have been called once — snapshot was stale
      expect(repo.upsertSnapshot).toHaveBeenCalledTimes(1);
    });

    it('returns null when portfolio does not exist', async () => {
      const repo = {
        findByPortfolioId: jest.fn().mockResolvedValue(null),
        findComputedAt: jest.fn().mockResolvedValue(null),
        upsertSnapshot: jest.fn(),
        findLatestWatermarks: jest.fn().mockResolvedValue([]),
        bulkLatestSnapshots: jest.fn().mockResolvedValue(new Map()),
      };
      const svc = new PortfolioIntelligenceService(
        { summary: jest.fn(), allocation: jest.fn(), getPortfolioDetail: jest.fn().mockResolvedValue(null) } as any,
        undefined, undefined, repo as any,
      );

      const result = await svc.intelligence('nonexistent');
      expect(result).toBeNull();
    });

    it('lazy-materialises (computes + persists) when no snapshot exists yet', async () => {
      const repo = {
        findByPortfolioId: jest.fn().mockResolvedValue(null),
        findComputedAt: jest.fn().mockResolvedValue(null),
        upsertSnapshot: jest.fn().mockResolvedValue(undefined),
        findLatestWatermarks: jest.fn().mockResolvedValue([]),
        bulkLatestSnapshots: jest.fn().mockResolvedValue(new Map()),
      };
      const h = [holding()];
      const portfolioDetail = { portfolio, holdings: h };
      const svc = new PortfolioIntelligenceService(
        {
          summary: jest.fn().mockResolvedValue(summary(h)),
          allocation: jest.fn().mockResolvedValue(allocation(h)),
          getPortfolioDetail: jest.fn().mockResolvedValue(portfolioDetail),
        } as any,
        undefined, undefined, repo as any,
      );

      await svc.intelligence('portfolio-1');

      // Must have persisted the first snapshot
      expect(repo.upsertSnapshot).toHaveBeenCalledTimes(1);
    });
  });

  // ── Watermark-driven staleness tests ──────────────────────────────────────

  describe('watermark staleness guard', () => {
    const freshSnapshot = { portfolioId: 'portfolio-1', healthScore: 80, status: 'HEALTHY' } as any;
    const computedAt = new Date('2026-06-10T20:00:00.000Z');
    const portfolioUpdatedAt = new Date('2026-06-09T00:00:00.000Z'); // holdings NOT changed after compute

    it('triggers recompute when latest watermark assembledAt is NEWER than computedAt', async () => {
      const newerWatermark = { region: 'US', assetType: 'EQUITY', assembledAt: new Date('2026-06-11T02:00:00.000Z') };
      const repo = {
        findByPortfolioId: jest.fn().mockResolvedValue(freshSnapshot),
        findComputedAt: jest.fn().mockResolvedValue(computedAt),
        upsertSnapshot: jest.fn().mockResolvedValue(undefined),
        findLatestWatermarks: jest.fn().mockResolvedValue([newerWatermark]),
        bulkLatestSnapshots: jest.fn().mockResolvedValue(new Map()),
      };
      const h = [holding({ country: 'US' })];
      const portfolioDetail = { portfolio: { ...portfolio, updatedAt: portfolioUpdatedAt.toISOString() }, holdings: h };
      const svc = new PortfolioIntelligenceService(
        {
          summary: jest.fn().mockResolvedValue(summary(h)),
          allocation: jest.fn().mockResolvedValue(allocation(h)),
          getPortfolioDetail: jest.fn().mockResolvedValue(portfolioDetail),
        } as any,
        undefined, undefined, repo as any,
      );

      await svc.intelligence('portfolio-1');

      // Should have recomputed because the watermark assembledAt is newer
      expect(repo.upsertSnapshot).toHaveBeenCalledTimes(1);
      expect(repo.findLatestWatermarks).toHaveBeenCalledTimes(1);
    });

    it('serves cached snapshot when watermark assembledAt is OLDER than computedAt', async () => {
      const olderWatermark = { region: 'US', assetType: 'EQUITY', assembledAt: new Date('2026-06-09T02:00:00.000Z') };
      const repo = {
        findByPortfolioId: jest.fn().mockResolvedValue(freshSnapshot),
        findComputedAt: jest.fn().mockResolvedValue(computedAt),
        upsertSnapshot: jest.fn(),
        findLatestWatermarks: jest.fn().mockResolvedValue([olderWatermark]),
        bulkLatestSnapshots: jest.fn().mockResolvedValue(new Map()),
      };
      const h = [holding({ country: 'US' })];
      const portfolioDetail = { portfolio: { ...portfolio, updatedAt: portfolioUpdatedAt.toISOString() }, holdings: h };
      const svc = new PortfolioIntelligenceService(
        {
          summary: jest.fn(),
          allocation: jest.fn(),
          getPortfolioDetail: jest.fn().mockResolvedValue(portfolioDetail),
        } as any,
        undefined, undefined, repo as any,
      );

      const result = await svc.intelligence('portfolio-1');

      // Served from cache — no recompute
      expect(result).toBe(freshSnapshot);
      expect(repo.upsertSnapshot).not.toHaveBeenCalled();
    });

    it('skips watermark check and serves cached snapshot when there are no holdings', async () => {
      const repo = {
        findByPortfolioId: jest.fn().mockResolvedValue(freshSnapshot),
        findComputedAt: jest.fn().mockResolvedValue(computedAt),
        upsertSnapshot: jest.fn(),
        findLatestWatermarks: jest.fn().mockResolvedValue([]),
        bulkLatestSnapshots: jest.fn().mockResolvedValue(new Map()),
      };
      const portfolioDetail = { portfolio: { ...portfolio, updatedAt: portfolioUpdatedAt.toISOString() }, holdings: [] };
      const svc = new PortfolioIntelligenceService(
        { summary: jest.fn(), allocation: jest.fn(), getPortfolioDetail: jest.fn().mockResolvedValue(portfolioDetail) } as any,
        undefined, undefined, repo as any,
      );

      const result = await svc.intelligence('portfolio-1');

      // Watermark query should not have been made (no holdings to derive scopes from)
      expect(repo.findLatestWatermarks).not.toHaveBeenCalled();
      expect(result).toBe(freshSnapshot);
    });

    it('skips watermark check when PORTFOLIO_SNAPSHOT_READS=false', async () => {
      const origEnv = process.env.PORTFOLIO_SNAPSHOT_READS;
      process.env.PORTFOLIO_SNAPSHOT_READS = 'false';
      try {
        const newerWatermark = { region: 'US', assetType: 'EQUITY', assembledAt: new Date('2026-06-11T02:00:00.000Z') };
        const repo = {
          findByPortfolioId: jest.fn().mockResolvedValue(freshSnapshot),
          findComputedAt: jest.fn().mockResolvedValue(computedAt),
          upsertSnapshot: jest.fn(),
          findLatestWatermarks: jest.fn().mockResolvedValue([newerWatermark]),
          bulkLatestSnapshots: jest.fn().mockResolvedValue(new Map()),
        };
        const h = [holding({ country: 'US' })];
        const portfolioDetail = { portfolio: { ...portfolio, updatedAt: portfolioUpdatedAt.toISOString() }, holdings: h };
        const svc = new PortfolioIntelligenceService(
          { summary: jest.fn(), allocation: jest.fn(), getPortfolioDetail: jest.fn().mockResolvedValue(portfolioDetail) } as any,
          undefined, undefined, repo as any,
        );

        const result = await svc.intelligence('portfolio-1');

        // Flag off: watermark check skipped, cached snapshot served
        expect(repo.findLatestWatermarks).not.toHaveBeenCalled();
        expect(repo.upsertSnapshot).not.toHaveBeenCalled();
        expect(result).toBe(freshSnapshot);
      } finally {
        if (origEnv === undefined) delete process.env.PORTFOLIO_SNAPSHOT_READS;
        else process.env.PORTFOLIO_SNAPSHOT_READS = origEnv;
      }
    });
  });

  // ── Snapshot-backed holding classification tests ──────────────────────────

  describe('snapshot-backed holding classification', () => {
    const okProvenance = {
      eligibility: 'OK', signals: 'OK', calibration: 'OK', decision: 'OK',
      tradePlan: 'OK', context: 'OK', derivatives: 'N_A', earnings: 'OK', smartMoney: 'OK',
    };
    const buildSnapshotRow = (overrides: any = {}) => ({
      instrumentId: 'stock-1',
      signalScore: overrides.signalScore ?? 78,
      signalDirection: overrides.signalDirection ?? 'BULLISH',
      calibratedScore: overrides.calibratedScore ?? 80,
      calibrationAuthority: overrides.calibrationAuthority ?? 'HIGH',
      strategyDecision: overrides.strategyDecision ?? 'TRADE_CANDIDATE',
      rulesFired: overrides.rulesFired ?? [],
      marketRegime: overrides.marketRegime ?? 'RISK_ON',
      breadthPct: overrides.breadthPct ?? 0.65,
      provenance: overrides.provenance ?? okProvenance,
      assembledAt: overrides.assembledAt ?? new Date('2026-06-11T02:00:00.000Z'),
    });

    it('uses snapshot signal when signals provenance is OK', async () => {
      const snapshotMap = new Map([['stock-1', buildSnapshotRow({ signalDirection: 'BEARISH', signalScore: 20 })]]);
      const h = [holding({ instrumentId: 'stock-1', signal: { score: 82, direction: 'BULLISH', confidence: 'HIGH', generatedAt: new Date().toISOString() } })];
      const repo = {
        findByPortfolioId: jest.fn().mockResolvedValue(null),
        findComputedAt: jest.fn().mockResolvedValue(null),
        upsertSnapshot: jest.fn().mockResolvedValue(undefined),
        findLatestWatermarks: jest.fn().mockResolvedValue([]),
        bulkLatestSnapshots: jest.fn().mockResolvedValue(snapshotMap),
      };
      const svc = new PortfolioIntelligenceService(
        {
          summary: jest.fn().mockResolvedValue(summary(h)),
          allocation: jest.fn().mockResolvedValue(allocation(h)),
          getPortfolioDetail: jest.fn().mockResolvedValue({ portfolio, holdings: h }),
        } as any,
        undefined, undefined, repo as any,
      );

      const result = await svc.intelligence('portfolio-1');

      // Signal from snapshot should be BEARISH (not the live BULLISH)
      expect(result?.holdings[0].latestSignal?.direction).toBe('BEARISH');
      expect(result?.holdings[0].latestSignal?.score).toBe(20);
    });

    it('falls back to live signal when signals provenance is FAILED', async () => {
      const failedProvenance = { ...okProvenance, signals: 'FAILED' };
      const snapshotMap = new Map([['stock-1', buildSnapshotRow({ signalDirection: 'BEARISH', signalScore: 20, provenance: failedProvenance })]]);
      const h = [holding({ instrumentId: 'stock-1', signal: { score: 82, direction: 'BULLISH', confidence: 'HIGH', generatedAt: new Date().toISOString() } })];
      const repo = {
        findByPortfolioId: jest.fn().mockResolvedValue(null),
        findComputedAt: jest.fn().mockResolvedValue(null),
        upsertSnapshot: jest.fn().mockResolvedValue(undefined),
        findLatestWatermarks: jest.fn().mockResolvedValue([]),
        bulkLatestSnapshots: jest.fn().mockResolvedValue(snapshotMap),
      };
      const svc = new PortfolioIntelligenceService(
        {
          summary: jest.fn().mockResolvedValue(summary(h)),
          allocation: jest.fn().mockResolvedValue(allocation(h)),
          getPortfolioDetail: jest.fn().mockResolvedValue({ portfolio, holdings: h }),
        } as any,
        undefined, undefined, repo as any,
      );

      const result = await svc.intelligence('portfolio-1');

      // Should fall back to live signal (BULLISH) when snapshot signals provenance is FAILED
      expect(result?.holdings[0].latestSignal?.direction).toBe('BULLISH');
    });

    it('falls back to live signal when signals provenance is N_A', async () => {
      const naProvenance = { ...okProvenance, signals: 'N_A' };
      const snapshotMap = new Map([['stock-1', buildSnapshotRow({ signalDirection: 'BEARISH', provenance: naProvenance })]]);
      const h = [holding({ instrumentId: 'stock-1', signal: { score: 82, direction: 'BULLISH', confidence: 'HIGH', generatedAt: new Date().toISOString() } })];
      const repo = {
        findByPortfolioId: jest.fn().mockResolvedValue(null),
        findComputedAt: jest.fn().mockResolvedValue(null),
        upsertSnapshot: jest.fn().mockResolvedValue(undefined),
        findLatestWatermarks: jest.fn().mockResolvedValue([]),
        bulkLatestSnapshots: jest.fn().mockResolvedValue(snapshotMap),
      };
      const svc = new PortfolioIntelligenceService(
        {
          summary: jest.fn().mockResolvedValue(summary(h)),
          allocation: jest.fn().mockResolvedValue(allocation(h)),
          getPortfolioDetail: jest.fn().mockResolvedValue({ portfolio, holdings: h }),
        } as any,
        undefined, undefined, repo as any,
      );

      const result = await svc.intelligence('portfolio-1');

      expect(result?.holdings[0].latestSignal?.direction).toBe('BULLISH');
    });

    it('uses snapshot signal when signals provenance is STALE', async () => {
      const staleProvenance = { ...okProvenance, signals: 'STALE' };
      const snapshotMap = new Map([['stock-1', buildSnapshotRow({ signalDirection: 'NEUTRAL', provenance: staleProvenance })]]);
      const h = [holding({ instrumentId: 'stock-1', signal: { score: 82, direction: 'BULLISH', confidence: 'HIGH', generatedAt: new Date().toISOString() } })];
      const repo = {
        findByPortfolioId: jest.fn().mockResolvedValue(null),
        findComputedAt: jest.fn().mockResolvedValue(null),
        upsertSnapshot: jest.fn().mockResolvedValue(undefined),
        findLatestWatermarks: jest.fn().mockResolvedValue([]),
        bulkLatestSnapshots: jest.fn().mockResolvedValue(snapshotMap),
      };
      const svc = new PortfolioIntelligenceService(
        {
          summary: jest.fn().mockResolvedValue(summary(h)),
          allocation: jest.fn().mockResolvedValue(allocation(h)),
          getPortfolioDetail: jest.fn().mockResolvedValue({ portfolio, holdings: h }),
        } as any,
        undefined, undefined, repo as any,
      );

      const result = await svc.intelligence('portfolio-1');

      // STALE is usable
      expect(result?.holdings[0].latestSignal?.direction).toBe('NEUTRAL');
    });

    it('skips snapshot reads when PORTFOLIO_SNAPSHOT_READS=false (legacy path)', async () => {
      const origEnv = process.env.PORTFOLIO_SNAPSHOT_READS;
      process.env.PORTFOLIO_SNAPSHOT_READS = 'false';
      try {
        const snapshotMap = new Map([['stock-1', buildSnapshotRow({ signalDirection: 'BEARISH', signalScore: 20 })]]);
        const repo = {
          findByPortfolioId: jest.fn().mockResolvedValue(null),
          findComputedAt: jest.fn().mockResolvedValue(null),
          upsertSnapshot: jest.fn().mockResolvedValue(undefined),
          findLatestWatermarks: jest.fn().mockResolvedValue([]),
          bulkLatestSnapshots: jest.fn().mockResolvedValue(snapshotMap),
        };
        const h = [holding({ instrumentId: 'stock-1', signal: { score: 82, direction: 'BULLISH', confidence: 'HIGH', generatedAt: new Date().toISOString() } })];
        const svc = new PortfolioIntelligenceService(
          {
            summary: jest.fn().mockResolvedValue(summary(h)),
            allocation: jest.fn().mockResolvedValue(allocation(h)),
            getPortfolioDetail: jest.fn().mockResolvedValue({ portfolio, holdings: h }),
          } as any,
          undefined, undefined, repo as any,
        );

        const result = await svc.intelligence('portfolio-1');

        // Flag off: bulkLatestSnapshots should not be called; live signal used
        expect(repo.bulkLatestSnapshots).not.toHaveBeenCalled();
        expect(result?.holdings[0].latestSignal?.direction).toBe('BULLISH');
      } finally {
        if (origEnv === undefined) delete process.env.PORTFOLIO_SNAPSHOT_READS;
        else process.env.PORTFOLIO_SNAPSHOT_READS = origEnv;
      }
    });
  });
});
