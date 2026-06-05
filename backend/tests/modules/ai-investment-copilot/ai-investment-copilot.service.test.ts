/// <reference types="@types/jest" />
import { AiInvestmentCopilotService } from '../../../src/modules/ai-investment-copilot';

const createServiceWithBilling = (subscriptionService: any, overrides: any = {}) => new AiInvestmentCopilotService({
  stockResearchService: { workbench: jest.fn().mockResolvedValue({ overview: { symbol: 'AAA', company_name: 'AAA Co', latest_price: 100 }, performance: {}, fundamentals: {} }) },
  signalService: { latestForInstrument: jest.fn().mockResolvedValue(null) },
  smartMoneyService: { stock: jest.fn().mockResolvedValue(null), sectors: jest.fn().mockResolvedValue([]) },
  marketContextService: { summary: jest.fn().mockResolvedValue({ regime: { regime: 'NEUTRAL', explanation: 'neutral' }, topSectors: [], weakSectors: [], breadth: { percentAboveSma50: null, advanceDeclineRatio: null }, macro: { macroStatus: 'UNKNOWN', dataStatus: 'MISSING' } }) },
  portfolioManagementService: { summary: jest.fn().mockResolvedValue({ numberOfHoldings: 0, totalValue: 0, dataStatus: 'COMPLETE', holdings: [] }) },
  portfolioIntelligenceService: { intelligence: jest.fn().mockResolvedValue({ healthScore: 0, status: 'UNKNOWN', redFlags: [], groupedSummary: { strongHoldings: [], weakHoldings: [] }, signalOverlay: null }) },
  watchlistManagementService: { detail: jest.fn().mockResolvedValue({ watchlist: { name: 'Test' }, items: [] }) },
  alertsMonitoringService: { listEvents: jest.fn().mockResolvedValue([]) },
  subscriptionService,
  ...overrides,
});

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
  // Pipeline enrichment services: optional, passed through directly.
  // Explicitly null disables lazy-require fallback (no DB calls in unit tests).
  strategyDecisionService: overrides.strategyDecisionService !== undefined
    ? overrides.strategyDecisionService
    : null,
  tradePlanService: overrides.tradePlanService !== undefined
    ? overrides.tradePlanService
    : null,
  todayReviewService: overrides.todayReviewService !== undefined
    ? overrides.todayReviewService
    : null,
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

  // -----------------------------------------------------------------------
  // Pipeline enrichment tests (strategy-decision, trade-plan, today-review)
  // -----------------------------------------------------------------------

  describe('pipeline enrichment — strategy-decision', () => {
    it('includes strategy-decision rationale when present', async () => {
      const strategyDecisionService = {
        latestForInstrument: jest.fn().mockResolvedValue({
          decision: 'TRADE_CANDIDATE',
          strategy: 'TREND_MOMENTUM',
          decisionScore: 85,
          confidence: 'HIGH',
          reasons: ['Market gate is OPEN.', 'Price is above SMA50 with bullish Multi-Timeframe Alignment (Macro Uptrend).'],
          blockers: [],
        }),
      };
      const result = await createService({ strategyDecisionService }).stockSummary('stock-1');

      const allText = JSON.stringify(result);
      expect(allText).toContain('TRADE_CANDIDATE');
      expect(allText).toContain('TREND_MOMENTUM');
      expect(result.bullishFactors.join(' ')).toContain('TRADE_CANDIDATE');
      expect(result.keyTakeaways.join(' ')).toContain('Strategy decision is TRADE_CANDIDATE');
      expect(result.sourceModules).toContain('strategy-decision-engine');
      // No fabricated buy/sell wording
      expect(allText.toLowerCase()).not.toMatch(/\bbuy\b|\bsell\b/);
    });

    it('reports AVOID decision in bearishFactors', async () => {
      const strategyDecisionService = {
        latestForInstrument: jest.fn().mockResolvedValue({
          decision: 'AVOID',
          strategy: 'TREND_MOMENTUM',
          decisionScore: 22,
          confidence: 'LOW',
          reasons: ['Price is below SMA50 support.'],
          blockers: ['Market gate is CLOSED; no new long candidates.'],
        }),
      };
      const result = await createService({ strategyDecisionService }).stockSummary('stock-1');

      expect(result.bearishFactors.join(' ')).toContain('AVOID');
      expect(result.bearishFactors.join(' ')).toContain('TREND_MOMENTUM');
    });

    it('gracefully omits strategy-decision with honest note when source returns null', async () => {
      const strategyDecisionService = {
        latestForInstrument: jest.fn().mockResolvedValue(null),
      };
      const result = await createService({ strategyDecisionService }).stockSummary('stock-1');

      expect(result.dataGaps).toContain('No current strategy decision on record.');
      expect(result.keyTakeaways.join(' ')).toContain('No current strategy decision on record.');
      expect(result.sourceModules).not.toContain('strategy-decision-engine');
      // No fabricated numbers
      expect(result.bullishFactors.join(' ')).not.toMatch(/score \d+.*strategy/i);
    });
  });

  describe('pipeline enrichment — trade-plan', () => {
    it('includes trade-plan geometry when present and valid', async () => {
      const tradePlanService = {
        latestForInstrument: jest.fn().mockResolvedValue({
          planStatus: 'VALID',
          riskGrade: 'MEDIUM',
          entryZone: { type: 'PULLBACK', preferredEntryMin: 480.0, preferredEntryMax: 495.0 },
          stopLoss: { price: 462.5, method: 'SMA50' },
          target: { price: 540.0, method: 'REWARD_RISK_MULTIPLE' },
          rewardRiskRatio: 2.12,
          blockers: [],
        }),
      };
      const result = await createService({ tradePlanService }).stockSummary('stock-1');

      const allText = JSON.stringify(result);
      expect(allText).toContain('480');
      expect(allText).toContain('462.5');
      expect(allText).toContain('540');
      expect(allText).toContain('2.12');
      expect(result.keyTakeaways.join(' ')).toContain('Trade plan is VALID');
      expect(result.sourceModules).toContain('trade-plan-risk-engine');
    });

    it('notes BLOCKED plan in risk factors', async () => {
      const tradePlanService = {
        latestForInstrument: jest.fn().mockResolvedValue({
          planStatus: 'BLOCKED',
          riskGrade: 'HIGH',
          entryZone: null,
          stopLoss: null,
          target: null,
          rewardRiskRatio: 0,
          blockers: ['No Strategy Decision found for instrument.'],
        }),
      };
      const result = await createService({ tradePlanService }).stockSummary('stock-1');

      expect(result.riskFactors.join(' ')).toContain('BLOCKED');
      expect(result.keyTakeaways.join(' ')).toContain('BLOCKED');
    });

    it('gracefully omits trade-plan with honest note when source returns null', async () => {
      const tradePlanService = {
        latestForInstrument: jest.fn().mockResolvedValue(null),
      };
      const result = await createService({ tradePlanService }).stockSummary('stock-1');

      expect(result.dataGaps).toContain('No current trade plan on record.');
      expect(result.keyTakeaways.join(' ')).toContain('No current trade plan on record.');
      expect(result.sourceModules).not.toContain('trade-plan-risk-engine');
      // No fabricated prices
      const allText = JSON.stringify(result);
      expect(allText).not.toMatch(/entry.*\d{3,}/i);
    });
  });

  describe('pipeline enrichment — today-review', () => {
    it('notes today-review classification when instrument is present', async () => {
      const todayReviewService = {
        latest: jest.fn().mockResolvedValue({
          candidates: [
            {
              instrumentId: 'stock-1',
              symbol: 'AAA',
              state: 'LONG_REVIEW',
              direction: 'LONG',
              grade: 'B',
              confidenceScore: 72,
              reasonSummary: 'Long review candidate from price-action setup and proven OHLCV evidence.',
              watchReasons: [],
            },
          ],
        }),
      };
      const result = await createService({ todayReviewService }).stockSummary('stock-1');

      const allText = JSON.stringify(result);
      expect(allText).toContain('LONG_REVIEW');
      expect(allText).toContain('grade');
      expect(result.bullishFactors.join(' ')).toContain('LONG_REVIEW');
      expect(result.keyTakeaways.join(' ')).toContain('LONG_REVIEW');
      expect(result.sourceModules).toContain('today-trade-review');
    });

    it('puts SHORT_REVIEW in bearishFactors', async () => {
      const todayReviewService = {
        latest: jest.fn().mockResolvedValue({
          candidates: [
            {
              instrumentId: 'stock-1',
              symbol: 'AAA',
              state: 'SHORT_REVIEW',
              direction: 'SHORT',
              grade: 'C',
              confidenceScore: 45,
              reasonSummary: 'Short review candidate.',
              watchReasons: ['Exit/bearish setup detected.'],
            },
          ],
        }),
      };
      const result = await createService({ todayReviewService }).stockSummary('stock-1');

      expect(result.bearishFactors.join(' ')).toContain('SHORT_REVIEW');
    });

    it('gracefully omits today-review with honest note when instrument is absent from run', async () => {
      const todayReviewService = {
        latest: jest.fn().mockResolvedValue({
          candidates: [
            { instrumentId: 'other-stock', symbol: 'ZZZ', state: 'LONG_REVIEW', direction: 'LONG', grade: 'A', confidenceScore: 90, reasonSummary: '', watchReasons: [] },
          ],
        }),
      };
      const result = await createService({ todayReviewService }).stockSummary('stock-1');

      expect(result.dataGaps).toContain('Instrument is not in the latest today-review candidate set.');
      expect(result.sourceModules).not.toContain('today-trade-review');
    });

    it('gracefully omits today-review when service returns null', async () => {
      const todayReviewService = {
        latest: jest.fn().mockResolvedValue(null),
      };
      const result = await createService({ todayReviewService }).stockSummary('stock-1');

      expect(result.dataGaps).toContain('Instrument is not in the latest today-review candidate set.');
      expect(result.sourceModules).not.toContain('today-trade-review');
    });
  });

  describe('pipeline enrichment — no buy/sell wording + no fabricated numbers', () => {
    it('never outputs buy/sell advice wording in any enrichment path', async () => {
      const strategyDecisionService = {
        latestForInstrument: jest.fn().mockResolvedValue({
          decision: 'TRADE_CANDIDATE',
          strategy: 'TREND_MOMENTUM',
          decisionScore: 88,
          confidence: 'HIGH',
          reasons: ['Price is above SMA50.'],
          blockers: [],
        }),
      };
      const tradePlanService = {
        latestForInstrument: jest.fn().mockResolvedValue({
          planStatus: 'VALID',
          riskGrade: 'LOW',
          entryZone: { type: 'BREAKOUT', preferredEntryMin: 500, preferredEntryMax: 510 },
          stopLoss: { price: 475, method: 'SMA50' },
          target: { price: 555, method: 'REWARD_RISK_MULTIPLE' },
          rewardRiskRatio: 2.2,
          blockers: [],
        }),
      };
      const todayReviewService = {
        latest: jest.fn().mockResolvedValue({
          candidates: [
            { instrumentId: 'stock-1', symbol: 'AAA', state: 'LONG_REVIEW', direction: 'LONG', grade: 'A', confidenceScore: 85, reasonSummary: 'Strategy-backed candidate.', watchReasons: [] },
          ],
        }),
      };
      const result = await createService({ strategyDecisionService, tradePlanService, todayReviewService }).stockSummary('stock-1');

      const allText = JSON.stringify(result).toLowerCase();
      expect(allText).not.toMatch(/\bbuy\b|\bsell\b/);
      expect(allText).toContain('for research support only');
    });

    it('does not fabricate entry/stop/target numbers when all pipeline sources are empty', async () => {
      const strategyDecisionService = { latestForInstrument: jest.fn().mockResolvedValue(null) };
      const tradePlanService = { latestForInstrument: jest.fn().mockResolvedValue(null) };
      const todayReviewService = { latest: jest.fn().mockResolvedValue(null) };

      const result = await createService({ strategyDecisionService, tradePlanService, todayReviewService }).stockSummary('stock-1');

      const allText = JSON.stringify(result);
      // No price numbers appearing from fabrication (only 100 which is the mocked latest_price)
      const noFabricatedGeometry = !allText.match(/entry zone:.*\d{3,}/i) && !allText.match(/stop.*\d{3,}/i);
      expect(noFabricatedGeometry).toBe(true);
      expect(result.dataGaps).toContain('No current strategy decision on record.');
      expect(result.dataGaps).toContain('No current trade plan on record.');
      expect(result.dataGaps).toContain('Instrument is not in the latest today-review candidate set.');
    });
  });

  // -----------------------------------------------------------------------
  // CB-47: correctness / compliance regression tests
  // -----------------------------------------------------------------------

  describe('CB-47: riskFactors must not duplicate bearishFactors verbatim', () => {
    it('riskFactors and bearishFactors are distinct (no item shared between both)', async () => {
      const strategyDecisionService = {
        latestForInstrument: jest.fn().mockResolvedValue({
          decision: 'AVOID',
          strategy: 'TREND_MOMENTUM',
          decisionScore: 20,
          confidence: 'LOW',
          reasons: ['Price is below SMA50 support.'],
          blockers: ['Market gate is CLOSED.'],
        }),
      };
      const result = await createService({ strategyDecisionService }).stockSummary('stock-1');

      const sharedItems = result.riskFactors.filter((r: string) =>
        result.bearishFactors.includes(r)
      );
      expect(sharedItems).toHaveLength(0);
    });

    it('riskFactors are non-empty distinct items (bearish signal produces risk flag, not duplicate)', async () => {
      const result = await createService({
        signalService: {
          latestForInstrument: jest.fn().mockResolvedValue({ score: 30, direction: 'BEARISH', confidence: 'MEDIUM' }),
        },
      }).stockSummary('stock-1');

      // bearishFactors has the bearish signal entry
      expect(result.bearishFactors.join(' ')).toContain('bearish');
      // riskFactors must NOT reproduce that exact same string
      const exact = result.bearishFactors.find((b: string) => b.toLowerCase().includes('bearish'));
      if (exact) {
        expect(result.riskFactors).not.toContain(exact);
      }
    });
  });

  describe('CB-47: safeLanguage — enter/exit verbs and pipelineExplanation sanitization', () => {
    it('sanitizes "enter the trade" phrase in any text field', async () => {
      const result = await createService({
        marketContextService: {
          summary: jest.fn().mockResolvedValue({
            regime: { regime: 'RISK_ON', explanation: 'Conditions align; enter the trade at breakout.' },
            topSectors: [],
            weakSectors: [],
            breadth: { percentAboveSma50: null, advanceDeclineRatio: null },
            macro: { macroStatus: 'UNKNOWN', dataStatus: 'MISSING' },
          }),
        },
      }).marketBrief();

      const allText = JSON.stringify(result).toLowerCase();
      expect(allText).not.toContain('enter the trade');
    });

    it('sanitizes "exit" action verb in pipelineExplanation reason strings', async () => {
      const strategyDecisionService = {
        latestForInstrument: jest.fn().mockResolvedValue({
          decision: 'TRADE_CANDIDATE',
          strategy: 'TREND_MOMENTUM',
          decisionScore: 80,
          confidence: 'HIGH',
          reasons: ['You should exit your short and enter a long position here.'],
          blockers: [],
        }),
      };
      const result = await createService({ strategyDecisionService }).stockSummary('stock-1');

      // pipelineExplanation.strategyDecision.reasons must be sanitized
      const pe = (result as any).pipelineExplanation;
      const reasonText = (pe?.strategyDecision?.reasons ?? []).join(' ').toLowerCase();
      expect(reasonText).not.toMatch(/\benter a long\b/);
    });
  });

  describe('CB-47: dataStatus — missing strategy/today-review must yield PARTIAL, not COMPLETE', () => {
    it('yields PARTIAL when strategyDecision is absent (no strategy decision on record)', async () => {
      // null disables lazy-require; strategyDecision will be null → dataGap added
      const result = await createService({
        strategyDecisionService: null,
        todayReviewService: null,
      }).stockSummary('stock-1');

      expect(result.dataStatus).toBe('PARTIAL');
      expect(result.dataGaps).toContain('No current strategy decision on record.');
    });

    it('yields PARTIAL when instrument is absent from today-review', async () => {
      const todayReviewService = {
        latest: jest.fn().mockResolvedValue({
          candidates: [{ instrumentId: 'other', symbol: 'ZZZ', state: 'LONG_REVIEW', direction: 'LONG', grade: 'A', confidenceScore: 90, reasonSummary: '', watchReasons: [] }],
        }),
      };
      const result = await createService({ todayReviewService }).stockSummary('stock-1');

      expect(result.dataStatus).toBe('PARTIAL');
      expect(result.dataGaps).toContain('Instrument is not in the latest today-review candidate set.');
    });

    it('yields COMPLETE only when all pipeline stages are present and no data gaps exist', async () => {
      const strategyDecisionService = {
        latestForInstrument: jest.fn().mockResolvedValue({
          decision: 'TRADE_CANDIDATE',
          strategy: 'TREND_MOMENTUM',
          decisionScore: 82,
          confidence: 'HIGH',
          reasons: ['Price above SMA50.'],
          blockers: [],
        }),
      };
      const tradePlanService = {
        latestForInstrument: jest.fn().mockResolvedValue({
          planStatus: 'VALID',
          riskGrade: 'LOW',
          entryZone: { type: 'BREAKOUT', preferredEntryMin: 490, preferredEntryMax: 505 },
          stopLoss: { price: 470, method: 'SMA50' },
          target: { price: 540, method: 'REWARD_RISK_MULTIPLE' },
          rewardRiskRatio: 2.0,
          blockers: [],
        }),
      };
      const todayReviewService = {
        latest: jest.fn().mockResolvedValue({
          candidates: [{ instrumentId: 'stock-1', symbol: 'AAA', state: 'LONG_REVIEW', direction: 'LONG', grade: 'A', confidenceScore: 88, reasonSummary: 'All green.', watchReasons: [] }],
        }),
      };
      // Also need smartMoney with complete data and non-MISSING macro
      const result = await createService({
        strategyDecisionService,
        tradePlanService,
        todayReviewService,
        smartMoneyService: {
          stock: jest.fn().mockResolvedValue({ smartMoneyScore: 80, status: 'ACCUMULATION', dataStatus: 'COMPLETE', insiderOwnership: { ownershipDataStatus: 'AVAILABLE' } }),
          sectors: jest.fn().mockResolvedValue([]),
        },
        marketContextService: {
          summary: jest.fn().mockResolvedValue({
            regime: { regime: 'RISK_ON', explanation: 'breadth positive.' },
            topSectors: [],
            weakSectors: [],
            breadth: { percentAboveSma50: 0.7, advanceDeclineRatio: 0.5 },
            macro: { macroStatus: 'STABLE', dataStatus: 'AVAILABLE' },
          }),
        },
      }).stockSummary('stock-1');

      expect(result.dataGaps).toHaveLength(0);
      expect(result.dataStatus).toBe('COMPLETE');
    });
  });

  describe('COPILOT_USAGE_UNLIMITED env gate (BUG 4 regression)', () => {
    afterEach(() => {
      delete process.env.COPILOT_USAGE_UNLIMITED;
    });

    it('does NOT call assertAllowed by default (flag defaults to unlimited)', async () => {
      delete process.env.COPILOT_USAGE_UNLIMITED; // ensure default
      const assertAllowed = jest.fn().mockRejectedValue(new Error('Copilot summaries today limit reached'));
      const recordUsage = jest.fn().mockResolvedValue(undefined);
      const service = createServiceWithBilling({ assertAllowed, recordUsage });
      // Must NOT throw even though assertAllowed would reject
      await expect(service.marketBrief('user-1')).resolves.toBeDefined();
      expect(assertAllowed).not.toHaveBeenCalled();
      expect(recordUsage).toHaveBeenCalledWith('RUN_COPILOT_SUMMARY', 'user-1');
    });

    it('does NOT call assertAllowed when COPILOT_USAGE_UNLIMITED=true', async () => {
      process.env.COPILOT_USAGE_UNLIMITED = 'true';
      const assertAllowed = jest.fn().mockRejectedValue(new Error('limit reached'));
      const recordUsage = jest.fn().mockResolvedValue(undefined);
      const service = createServiceWithBilling({ assertAllowed, recordUsage });
      await expect(service.marketBrief('user-1')).resolves.toBeDefined();
      expect(assertAllowed).not.toHaveBeenCalled();
    });

    it('enforces assertAllowed when COPILOT_USAGE_UNLIMITED=false (original gating)', async () => {
      process.env.COPILOT_USAGE_UNLIMITED = 'false';
      const assertAllowed = jest.fn().mockRejectedValue(new Error('Copilot summaries today limit reached for FREE'));
      const recordUsage = jest.fn().mockResolvedValue(undefined);
      const service = createServiceWithBilling({ assertAllowed, recordUsage });
      await expect(service.marketBrief('user-1')).rejects.toThrow('limit reached');
      expect(assertAllowed).toHaveBeenCalledWith('RUN_COPILOT_SUMMARY', 'user-1');
    });
  });
});
