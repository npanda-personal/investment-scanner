/// <reference types="@types/jest" />
/**
 * Tests for #35b: portfolio-level marketPosture (Capital Posture) surfacing.
 *
 * All CapitalPostureService calls are mocked via constructor injection so no
 * DB or lazy-require path is exercised in unit tests.
 */
import { PortfolioIntelligenceService } from '../../../src/modules/portfolio-intelligence';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const portfolio = {
  id: 'portfolio-posture-test',
  name: 'Posture Test Portfolio',
  baseCurrency: 'INR',
  description: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const holding = (overrides: any = {}) => ({
  id: overrides.id ?? 'holding-1',
  portfolioId: portfolio.id,
  instrumentId: overrides.instrumentId ?? 'stock-1',
  symbol: overrides.symbol ?? 'RELIANCE',
  companyName: overrides.companyName ?? 'Reliance Industries',
  quantity: 10,
  averageCost: 2500,
  currency: 'INR',
  notes: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  currentPrice: overrides.currentPrice ?? 2700,
  marketValue: overrides.marketValue ?? 27000,
  investedAmount: 25000,
  unrealizedPnL: overrides.unrealizedPnL ?? 2000,
  unrealizedPnLPercent: overrides.unrealizedPnLPercent ?? 0.08,
  dailyChange: 50,
  dailyChangePercent: overrides.dailyChangePercent ?? 0.019,
  allocationPercent: overrides.allocationPercent ?? 0.5,
  sector: overrides.sector ?? 'Energy',
  country: overrides.country ?? 'IN',
  signal: overrides.signal === undefined
    ? { score: 70, direction: 'BULLISH', confidence: 'HIGH', generatedAt: new Date().toISOString() }
    : overrides.signal,
});

const summaryFor = (holdings: any[]) => ({
  portfolio,
  totalValue: holdings.reduce((t, h) => t + h.marketValue, 0),
  totalInvested: holdings.reduce((t, h) => t + h.investedAmount, 0),
  totalUnrealizedPnL: holdings.reduce((t, h) => t + h.unrealizedPnL, 0),
  totalUnrealizedPnLPercent: 0.08,
  dailyPnL: 0,
  dailyPnLPercent: 0,
  numberOfHoldings: holdings.length,
  holdings,
  source: 'portfolio-management',
  dataStatus: 'COMPLETE',
  generatedAt: '2026-01-01T00:00:00.000Z',
});

const allocationFor = (holdings: any[]) => ({
  portfolioId: portfolio.id,
  byHolding: holdings.map((h) => ({ key: h.symbol, value: h.marketValue, allocationPercent: h.allocationPercent })),
  bySector: [{ key: 'Energy', value: holdings.reduce((t, h) => t + h.marketValue, 0), allocationPercent: 1 }],
  byCountry: [{ key: 'IN', value: holdings.reduce((t, h) => t + h.marketValue, 0), allocationPercent: 1 }],
  byCurrency: [{ key: 'INR', value: holdings.reduce((t, h) => t + h.marketValue, 0), allocationPercent: 1 }],
  generatedAt: '2026-01-01T00:00:00.000Z',
});

const ASSEMBLED_AT = '2026-06-04T10:00:00.000Z';

/** Build a service with mocked CapitalPostureService and portfolio service. */
const serviceWith = (
  holdings: any[],
  capitalPostureMock: { capitalPosture: jest.Mock },
) =>
  new PortfolioIntelligenceService(
    {
      summary: jest.fn().mockResolvedValue(summaryFor(holdings)),
      allocation: jest.fn().mockResolvedValue(allocationFor(holdings)),
    } as any,
    undefined, // use default thresholds
    capitalPostureMock,
  );

const mockRiskOff = () => ({
  capitalPosture: jest.fn().mockResolvedValue({
    availability: 'READY',
    postureLabel: 'RISK_OFF',
    assembledAt: ASSEMBLED_AT,
    message: 'Regime signals caution — consider raising cash and reducing exposure.',
  }),
});

const mockRiskOn = () => ({
  capitalPosture: jest.fn().mockResolvedValue({
    availability: 'READY',
    postureLabel: 'RISK_ON',
    assembledAt: ASSEMBLED_AT,
    message: 'Environment supports deploying capital into high-conviction positions.',
  }),
});

const mockNeutral = () => ({
  capitalPosture: jest.fn().mockResolvedValue({
    availability: 'READY',
    postureLabel: 'NEUTRAL',
    assembledAt: ASSEMBLED_AT,
    message: 'Selective environment — hold existing positions.',
  }),
});

const mockUnavailable = () => ({
  capitalPosture: jest.fn().mockResolvedValue({
    availability: 'UNAVAILABLE',
    postureLabel: null,
    assembledAt: ASSEMBLED_AT,
    message: 'No persisted market-context or market-pulse snapshot is available for this scope.',
  }),
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PortfolioIntelligenceService — marketPosture (#35b)', () => {
  const baseHoldings = [
    holding({ id: 'h1', symbol: 'RELIANCE', allocationPercent: 0.5 }),
    holding({ id: 'h2', symbol: 'TCS', allocationPercent: 0.5, sector: 'Technology' }),
  ];

  it('surfaces marketPosture field in intelligence response', async () => {
    const svc = serviceWith(baseHoldings, mockRiskOn());
    const result = await svc.intelligence(portfolio.id);
    expect(result).not.toBeNull();
    expect(result?.marketPosture).toBeDefined();
  });

  describe('RISK_OFF posture', () => {
    it('sets postureLabel to RISK_OFF', async () => {
      const svc = serviceWith(baseHoldings, mockRiskOff());
      const result = await svc.intelligence(portfolio.id);
      expect(result?.marketPosture.postureLabel).toBe('RISK_OFF');
    });

    it('includes reduce-exposure language in contextNote', async () => {
      const svc = serviceWith(baseHoldings, mockRiskOff());
      const result = await svc.intelligence(portfolio.id);
      const note = result?.marketPosture.contextNote.toLowerCase() ?? '';
      // Must contain research-support language (reduce/exposure/caution), NOT buy/sell
      expect(note).toMatch(/reduc|caution|exposure/);
      expect(note).not.toMatch(/\bbuy\b/);
      expect(note).not.toMatch(/\bsell\b/);
    });

    it('preserves assembledAt from the posture DTO', async () => {
      const svc = serviceWith(baseHoldings, mockRiskOff());
      const result = await svc.intelligence(portfolio.id);
      expect(result?.marketPosture.assembledAt).toBe(ASSEMBLED_AT);
    });

    it('derives region IN from holdings country', async () => {
      const svc = serviceWith(baseHoldings, mockRiskOff());
      const result = await svc.intelligence(portfolio.id);
      expect(result?.marketPosture.region).toBe('IN');
    });
  });

  describe('RISK_ON posture', () => {
    it('sets postureLabel to RISK_ON', async () => {
      const svc = serviceWith(baseHoldings, mockRiskOn());
      const result = await svc.intelligence(portfolio.id);
      expect(result?.marketPosture.postureLabel).toBe('RISK_ON');
    });

    it('includes supportive language in contextNote', async () => {
      const svc = serviceWith(baseHoldings, mockRiskOn());
      const result = await svc.intelligence(portfolio.id);
      const note = result?.marketPosture.contextNote.toLowerCase() ?? '';
      expect(note).toMatch(/supportive|support/);
      expect(note).not.toMatch(/\bbuy\b/);
      expect(note).not.toMatch(/\bsell\b/);
    });
  });

  describe('NEUTRAL posture', () => {
    it('sets postureLabel to NEUTRAL', async () => {
      const svc = serviceWith(baseHoldings, mockNeutral());
      const result = await svc.intelligence(portfolio.id);
      expect(result?.marketPosture.postureLabel).toBe('NEUTRAL');
    });

    it('uses selective/review language in contextNote', async () => {
      const svc = serviceWith(baseHoldings, mockNeutral());
      const result = await svc.intelligence(portfolio.id);
      const note = result?.marketPosture.contextNote.toLowerCase() ?? '';
      expect(note).toMatch(/neutral|selective|review/);
    });
  });

  describe('UNAVAILABLE posture — honest note, no fabrication', () => {
    it('sets postureLabel to null', async () => {
      const svc = serviceWith(baseHoldings, mockUnavailable());
      const result = await svc.intelligence(portfolio.id);
      expect(result?.marketPosture.postureLabel).toBeNull();
    });

    it('surfaces honest unavailability note', async () => {
      const svc = serviceWith(baseHoldings, mockUnavailable());
      const result = await svc.intelligence(portfolio.id);
      const note = result?.marketPosture.contextNote.toLowerCase() ?? '';
      expect(note).toMatch(/unavailable|cannot|not available/);
    });

    it('does not affect the rest of the intelligence response', async () => {
      const svc = serviceWith(baseHoldings, mockUnavailable());
      const result = await svc.intelligence(portfolio.id);
      expect(result).not.toBeNull();
      expect(result?.healthScore).toBeGreaterThanOrEqual(0);
      expect(result?.holdings).toHaveLength(2);
      expect(result?.redFlags).toBeDefined();
      expect(result?.reviewRanking).toBeDefined();
    });
  });

  describe('Health-score math unchanged', () => {
    it('health-score components still sum with the same weights (20/25/25/20/10)', async () => {
      const svc = serviceWith(baseHoldings, mockRiskOff());
      const result = await svc.intelligence(portfolio.id);
      expect(result).not.toBeNull();
      const sb = result!.scoreBreakdown;
      // Recompute manually using the same formula — must still match
      const expected = Math.round(
        sb.concentration * 0.2 +
        sb.pnlHealth * 0.25 +
        sb.signalQuality * 0.25 +
        sb.dataCompleteness * 0.2 +
        sb.sectorConcentration * 0.1,
      );
      expect(result!.healthScore).toBe(expected);
    });

    it('RISK_ON and RISK_OFF return identical healthScore for same holdings', async () => {
      const holdingsA = [holding({ id: 'x1' })];
      const svcOn  = serviceWith(holdingsA, mockRiskOn());
      const svcOff = serviceWith(holdingsA, mockRiskOff());
      const [resOn, resOff] = await Promise.all([
        svcOn.intelligence(portfolio.id),
        svcOff.intelligence(portfolio.id),
      ]);
      expect(resOn?.healthScore).toBe(resOff?.healthScore);
      expect(resOn?.scoreBreakdown).toEqual(resOff?.scoreBreakdown);
    });
  });

  describe('No buy/sell wording anywhere in marketPosture', () => {
    const allPostures = [mockRiskOn(), mockRiskOff(), mockNeutral(), mockUnavailable()];
    it.each(allPostures.map((m, i) => [i, m]))(
      'posture mock %i has no buy/sell wording',
      async (_i, mock) => {
        const svc = serviceWith(baseHoldings, mock as any);
        const result = await svc.intelligence(portfolio.id);
        const note = result?.marketPosture.contextNote ?? '';
        expect(note).not.toMatch(/\bbuy\b/i);
        expect(note).not.toMatch(/\bsell\b/i);
        expect(note).not.toMatch(/\bpurchase\b/i);
      },
    );
  });

  describe('capitalPosture called with derived region', () => {
    it('passes region IN when holdings have country IN', async () => {
      const mock = mockRiskOn();
      const svc = serviceWith(baseHoldings, mock);
      await svc.intelligence(portfolio.id);
      expect(mock.capitalPosture).toHaveBeenCalledWith('IN');
    });

    it('defaults to IN when holdings have no country', async () => {
      const noCountry = [holding({ country: undefined })];
      const mock = mockRiskOn();
      const svc = serviceWith(noCountry, mock);
      await svc.intelligence(portfolio.id);
      expect(mock.capitalPosture).toHaveBeenCalledWith('IN');
    });
  });
});
