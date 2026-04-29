/// <reference types="@types/jest" />
import { AiInvestmentCopilotService } from '../../../src/modules/ai-investment-copilot';

const createService = (overrides: any = {}) => new AiInvestmentCopilotService({
  stockResearchService: {
    workbench: jest.fn().mockResolvedValue({
      overview: { symbol: 'AAA', company_name: 'AAA Co', latest_price: 100 },
      performance: { return_1y: 0.2, max_drawdown: -0.1 },
      fundamentals: { latest: { net_income: 1000 } },
    }),
    ...overrides.stockResearchService,
  },
  signalService: {
    latestForInstrument: jest.fn().mockResolvedValue({ score: 82, direction: 'BULLISH', confidence: 'HIGH' }),
    ...overrides.signalService,
  },
  smartMoneyService: {
    stock: jest.fn().mockResolvedValue({
      smartMoneyScore: 76,
      status: 'ACCUMULATION',
      dataStatus: 'PARTIAL',
      insiderOwnership: { ownershipDataStatus: 'MISSING' },
    }),
    sectors: jest.fn().mockResolvedValue([{ sector: 'Technology', averageSmartMoneyScore: 70, sectorStatus: 'ACCUMULATING' }]),
    ...overrides.smartMoneyService,
  },
  marketContextService: {
    summary: jest.fn().mockResolvedValue({
      regime: { regime: 'RISK_ON', explanation: 'risk-on because breadth is constructive.' },
      topSectors: [{ sector: 'Technology', relativeStrengthScore: 75 }],
      weakSectors: [{ sector: 'Utilities', relativeStrengthScore: 35 }],
      breadth: { percentAboveSma50: 0.65, advanceDeclineRatio: 0.2 },
      macro: { macroStatus: 'UNKNOWN', dataStatus: 'MISSING' },
    }),
    ...overrides.marketContextService,
  },
  portfolioManagementService: {
    summary: jest.fn().mockResolvedValue({ numberOfHoldings: 2, totalValue: 10000, dataStatus: 'COMPLETE', holdings: [] }),
    ...overrides.portfolioManagementService,
  },
  portfolioIntelligenceService: {
    intelligence: jest.fn().mockResolvedValue({
      healthScore: 78,
      status: 'HEALTHY',
      redFlags: [],
      groupedSummary: { strongHoldings: [{ symbol: 'AAA', reasons: ['Positive P&L.'] }], weakHoldings: [] },
      signalOverlay: { bullishCount: 1, bearishCount: 0 },
    }),
    ...overrides.portfolioIntelligenceService,
  },
  watchlistManagementService: {
    detail: jest.fn().mockResolvedValue({
      watchlist: { name: 'Ideas' },
      items: [
        { symbol: 'AAA', latestSignal: { score: 80 }, currentPrice: 100 },
        { symbol: 'BBB', latestSignal: { score: 30 }, currentPrice: 50 },
      ],
    }),
    ...overrides.watchlistManagementService,
  },
  alertsMonitoringService: {
    listEvents: jest.fn().mockResolvedValue([
      { title: 'Drawdown', message: 'Holding drawdown exceeded threshold', severity: 'CRITICAL', type: 'PORTFOLIO_HOLDING_DRAWDOWN', readAt: null, dismissedAt: null },
      { title: 'Price above', message: 'Price crossed threshold', severity: 'INFO', type: 'PRICE_ABOVE', readAt: null, dismissedAt: null },
    ]),
    ...overrides.alertsMonitoringService,
  },
});

describe('AiInvestmentCopilotService', () => {
  it('generates stock summary from structured module data', async () => {
    const result = await createService().stockSummary('stock-1');

    expect(result.title).toContain('AAA');
    expect(result.bullishFactors.join(' ')).toContain('Signal direction is bullish');
    expect(result.dataGaps).toContain('Insider and institutional ownership data is unavailable in the free MVP provider.');
    expect(result.sourceModules).toEqual(expect.arrayContaining(['stock-research-workbench', 'smart-money-intelligence']));
  });

  it('generates portfolio summary', async () => {
    const result = await createService().portfolioSummary('portfolio-1');

    expect(result.summary).toContain('Portfolio health');
    expect(result.bullishFactors[0]).toContain('AAA');
    expect(result.sourceModules).toContain('portfolio-intelligence');
  });

  it('generates watchlist summary', async () => {
    const result = await createService().watchlistSummary('watchlist-1');

    expect(result.summary).toContain('2 tracked ideas');
    expect(result.bullishFactors.join(' ')).toContain('AAA');
    expect(result.bearishFactors.join(' ')).toContain('BBB');
  });

  it('generates market brief', async () => {
    const result = await createService().marketBrief();

    expect(result.title).toBe('Market Brief');
    expect(result.keyTakeaways.join(' ')).toContain('risk-on');
    expect(result.dataGaps).toContain('Macro proxy data is not configured yet.');
  });

  it('generates alert digest', async () => {
    const result = await createService().alertDigest();

    expect(result.summary).toContain('2 unread alert events');
    expect(result.riskFactors.join(' ')).toContain('CRITICAL');
  });

  it('includes missing data gaps and works without paid provider', async () => {
    const result = await createService({
      signalService: { latestForInstrument: jest.fn().mockResolvedValue(null) },
      smartMoneyService: { stock: jest.fn().mockResolvedValue(null) },
    }).stockSummary('stock-1');

    expect(result.dataGaps).toEqual(expect.arrayContaining([
      'Latest signal result is unavailable.',
      'Smart money summary is unavailable.',
    ]));
    expect(result.summary).toContain('For research support only');
  });

  it('sanitizes unsafe wording', async () => {
    const result = await createService({
      marketContextService: {
        summary: jest.fn().mockResolvedValue({
          regime: { regime: 'RISK_ON', explanation: 'buy now because gains are guaranteed.' },
          topSectors: [],
          weakSectors: [],
          breadth: { percentAboveSma50: null, advanceDeclineRatio: null },
          macro: { macroStatus: 'UNKNOWN', dataStatus: 'MISSING' },
        }),
      },
    }).marketBrief();

    const text = JSON.stringify(result).toLowerCase();
    expect(text).not.toContain('buy now');
    expect(text).not.toContain('guaranteed');
  });
});
