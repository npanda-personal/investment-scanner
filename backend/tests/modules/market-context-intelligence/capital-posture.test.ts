/// <reference types="@types/jest" />
import { CapitalPostureService } from '../../../src/modules/market-context-intelligence/capital-posture.service';
import {
  EXPOSURE_BANDS,
  BREADTH_WEAK_THRESHOLD,
  BREADTH_VERY_WEAK_THRESHOLD,
} from '../../../src/modules/market-context-intelligence/capital-posture.types';
import type { MarketContextSummary } from '../../../src/modules/market-context-intelligence/market-context-intelligence.types';
import type { MarketPulseSnapshotRecord } from '../../../src/modules/market-context-intelligence/market-pulse-snapshot.types';

// ─── Test fixture builders ───────────────────────────────────────────────────

function makeContextSummary(regime: 'RISK_ON' | 'NEUTRAL' | 'RISK_OFF', regimeScore: number): MarketContextSummary {
  return {
    regime: {
      regime,
      score: regimeScore,
      explanation: `test-${regime}`,
      updatedAt: '2026-06-04T06:00:00.000Z',
      dataStatus: 'COMPLETE',
    },
    topSectors: [],
    weakSectors: [],
    breadth: {
      percentAboveSma50:  0.55,
      percentAboveSma200: 0.48,
      sma50SampleCount: 200,
      sma200SampleCount: 180,
      advanceDeclineRatio: 1.1,
      newHigh52WeekCount: 8,
      newLow52WeekCount: 2,
      bullishSignalCount: 15,
      bearishSignalCount: 5,
      instrumentCount: 210,
      dataStatus: 'COMPLETE',
    },
    countryStrength: [],
    macro: {
      interestRateProxy: null,
      inflationProxy: null,
      usdStrengthProxy: null,
      commodityProxy: null,
      macroStatus: 'UNKNOWN',
      dataStatus: 'MISSING',
      explanation: 'unavailable',
    },
    explanation: ['test'],
    updatedAt: '2026-06-04T06:00:00.000Z',
    dataStatus: 'COMPLETE',
  } as any;
}

function makePulseRecord(healthScore: number, breadthAbove50Dma: number): Partial<MarketPulseSnapshotRecord> {
  return {
    id: 'pulse-1',
    snapshotDate: new Date('2026-06-04'),
    dataThroughDate: new Date('2026-06-03'),
    generatedAt: new Date('2026-06-04T06:00:00.000Z'),
    region: 'IN',
    assetType: 'STOCK',
    timeframe: '1d',
    status: 'FRESH',
    marketHealthScore: healthScore,
    marketHealthLabel: healthScore >= 80 ? 'HEALTHY' : healthScore >= 60 ? 'TRADABLE_BUT_SELECTIVE' : healthScore >= 40 ? 'FRAGILE' : 'RISKY',
    indexTrendScore: 65,
    sectorStrengthScore: 62,
    breadthScore: breadthAbove50Dma * 100,
    deliveryParticipationScore: 55,
    dataFreshnessScore: 75,
    topIndicesJson: [{ symbol: 'NIFTY50', label: 'NIFTY 50', return1M: 0.032, score: 66 }] as any,
    strongSectorsJson: [] as any,
    weakSectorsJson: [] as any,
    breadthSummaryJson: {
      status: 'READY',
      percentAbove20Dma: breadthAbove50Dma + 0.05,
      percentAbove50Dma: breadthAbove50Dma,
      percentAbove200Dma: breadthAbove50Dma - 0.08,
      sampleCount: 240,
      sma20SampleCount: 230,
      sma50SampleCount: 220,
      sma200SampleCount: 195,
      summaryText: 'Breadth sample 240.',
    } as any,
    deliverySummaryJson: {
      status: 'READY',
      sampleCount: 180,
      highDeliveryCount: 90,
      highDeliveryPercent: 0.5,
      latestTradingDate: '2026-06-03',
      summaryText: '90 of 180 stocks show high delivery participation.',
    } as any,
    candidateCount: 42,
    warningsJson: [],
    sourceSummaryJson: {} as any,
    pipelineRunId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ─── Helper: create service with injected mock repos ─────────────────────────

function makeService(
  ctxResult: MarketContextSummary | null,
  pulseResult: Partial<MarketPulseSnapshotRecord> | null,
) {
  const contextRepo = {
    latestPersistedSnapshot: jest.fn().mockResolvedValue(ctxResult),
  };
  const pulseRepo = {
    latestSnapshot: jest.fn().mockResolvedValue(pulseResult),
  };
  return new CapitalPostureService(contextRepo as any, pulseRepo as any);
}

// ─── UNAVAILABLE: no persisted snapshot ─────────────────────────────────────

describe('CapitalPostureService — UNAVAILABLE state', () => {
  it('returns UNAVAILABLE when no persisted snapshot exists — does NOT generate', async () => {
    const svc = makeService(null, null);
    const result = await svc.capitalPosture('IN');

    expect(result.availability).toBe('UNAVAILABLE');
    expect(result.postureLabel).toBeNull();
    expect(result.suggestedExposureBand).toBeNull();
    expect(result.action).toBeNull();
    expect(result.regimeGate).toBeNull();
    // Assert no buy/sell in message
    expect(result.message).not.toMatch(/\b(buy|sell)\b/i);
  });

  it('UNAVAILABLE result carries gap notes in evidence', async () => {
    const svc = makeService(null, null);
    const result = await svc.capitalPosture('IN');
    expect(result.evidence.gaps.length).toBeGreaterThan(0);
    expect(result.evidence.regime).toBeNull();
    expect(result.evidence.marketHealthScore).toBeNull();
  });
});

// ─── RISK_OFF ────────────────────────────────────────────────────────────────

describe('CapitalPostureService — RISK_OFF → RAISE_CASH / low band', () => {
  it('maps RISK_OFF regime to RAISE_CASH and 0–25 % band', async () => {
    const svc = makeService(
      makeContextSummary('RISK_OFF', 30),
      makePulseRecord(35, 0.30),
    );
    const result = await svc.capitalPosture('IN');

    expect(result.availability).toBe('READY');
    expect(result.postureLabel).toBe('RISK_OFF');
    expect(result.suggestedExposureBand).toEqual(EXPOSURE_BANDS.RISK_OFF);
    expect(result.suggestedExposureBand).toEqual({ minPct: 0, maxPct: 25 });
    expect(result.action).toBe('RAISE_CASH');
    expect(result.regimeGate?.longsDiscouraged).toBe(true);
    expect(result.regimeGate?.contextualShortsOnly).toBe(true);
  });

  it('RISK_OFF action message contains no buy/sell wording', async () => {
    const svc = makeService(makeContextSummary('RISK_OFF', 28), makePulseRecord(32, 0.20));
    const result = await svc.capitalPosture('IN');
    expect(result.message).not.toMatch(/\b(buy|sell)\b/i);
    expect(result.action).toBe('RAISE_CASH');
  });
});

// ─── RISK_ON ─────────────────────────────────────────────────────────────────

describe('CapitalPostureService — RISK_ON → DEPLOY / high band', () => {
  it('maps RISK_ON regime to DEPLOY and 75–100 % band', async () => {
    const svc = makeService(
      makeContextSummary('RISK_ON', 72),
      makePulseRecord(82, 0.65),
    );
    const result = await svc.capitalPosture('IN');

    expect(result.availability).toBe('READY');
    expect(result.postureLabel).toBe('RISK_ON');
    expect(result.suggestedExposureBand).toEqual(EXPOSURE_BANDS.RISK_ON);
    expect(result.suggestedExposureBand).toEqual({ minPct: 75, maxPct: 100 });
    expect(result.action).toBe('DEPLOY');
    expect(result.regimeGate?.longsDiscouraged).toBe(false);
    expect(result.regimeGate?.contextualShortsOnly).toBe(false);
  });

  it('RISK_ON message contains no buy/sell wording', async () => {
    const svc = makeService(makeContextSummary('RISK_ON', 75), makePulseRecord(85, 0.70));
    const result = await svc.capitalPosture('IN');
    expect(result.message).not.toMatch(/\b(buy|sell)\b/i);
    expect(result.action).toBe('DEPLOY');
  });
});

// ─── NEUTRAL ─────────────────────────────────────────────────────────────────

describe('CapitalPostureService — NEUTRAL → HOLD / mid band', () => {
  it('maps NEUTRAL regime to HOLD and 40–75 % band', async () => {
    const svc = makeService(
      makeContextSummary('NEUTRAL', 52),
      makePulseRecord(65, 0.50),
    );
    const result = await svc.capitalPosture('IN');

    expect(result.availability).toBe('READY');
    expect(result.postureLabel).toBe('NEUTRAL');
    expect(result.suggestedExposureBand).toEqual(EXPOSURE_BANDS.NEUTRAL);
    expect(result.suggestedExposureBand).toEqual({ minPct: 40, maxPct: 75 });
    expect(result.action).toBe('HOLD');
  });

  it('NEUTRAL message contains no buy/sell wording', async () => {
    const svc = makeService(makeContextSummary('NEUTRAL', 55), makePulseRecord(62, 0.48));
    const result = await svc.capitalPosture('IN');
    expect(result.message).not.toMatch(/\b(buy|sell)\b/i);
  });
});

// ─── Breadth denominators in evidence ────────────────────────────────────────

describe('CapitalPostureService — evidence carries breadth denominators', () => {
  it('evidence.breadthAbove50Dma has non-zero sampleCount and denominator', async () => {
    const svc = makeService(
      makeContextSummary('NEUTRAL', 55),
      makePulseRecord(62, 0.50),
    );
    const result = await svc.capitalPosture('IN');
    const b50 = result.evidence.breadthAbove50Dma;
    expect(b50).not.toBeNull();
    expect(b50!.value).toBeCloseTo(0.50);
    expect(b50!.sampleCount).toBeGreaterThan(0);
    expect(b50!.denominator).toBeGreaterThan(0);
  });

  it('evidence.breadthAbove200Dma has non-zero sampleCount and denominator', async () => {
    const svc = makeService(
      makeContextSummary('NEUTRAL', 55),
      makePulseRecord(62, 0.50),
    );
    const result = await svc.capitalPosture('IN');
    const b200 = result.evidence.breadthAbove200Dma;
    expect(b200).not.toBeNull();
    expect(b200!.sampleCount).toBeGreaterThan(0);
    expect(b200!.denominator).toBeGreaterThan(0);
  });
});

// ─── Breadth modifier downgrade ──────────────────────────────────────────────

describe('CapitalPostureService — breadth modifier', () => {
  it('RISK_ON is downgraded to NEUTRAL when breadth < BREADTH_WEAK_THRESHOLD', async () => {
    const svc = makeService(
      makeContextSummary('RISK_ON', 70),
      // health score high but breadth weak
      makePulseRecord(80, BREADTH_WEAK_THRESHOLD - 0.05),
    );
    const result = await svc.capitalPosture('IN');
    expect(result.postureLabel).toBe('NEUTRAL');
    expect(result.action).toBe('HOLD');
  });

  it('NEUTRAL is downgraded to RISK_OFF when breadth < BREADTH_VERY_WEAK_THRESHOLD', async () => {
    const svc = makeService(
      makeContextSummary('NEUTRAL', 55),
      makePulseRecord(60, BREADTH_VERY_WEAK_THRESHOLD - 0.05),
    );
    const result = await svc.capitalPosture('IN');
    expect(result.postureLabel).toBe('RISK_OFF');
    expect(result.action).toBe('RAISE_CASH');
  });
});

// ─── Health-score downgrade ──────────────────────────────────────────────────

describe('CapitalPostureService — health-score downgrade', () => {
  it('RISK_ON is downgraded to NEUTRAL when marketHealthScore < HEALTH_SCORE_STRONG_MIN', async () => {
    const svc = makeService(
      makeContextSummary('RISK_ON', 70),
      makePulseRecord(55, 0.60), // healthScore < 60
    );
    const result = await svc.capitalPosture('IN');
    // Health score 55 → downgrade RISK_ON → NEUTRAL; breadth 0.60 ≥ threshold → no further downgrade
    expect(result.postureLabel).toBe('NEUTRAL');
  });

  it('RISK_ON is downgraded to RISK_OFF when marketHealthScore ≤ HEALTH_SCORE_FRAGILE_MAX', async () => {
    const svc = makeService(
      makeContextSummary('RISK_ON', 70),
      makePulseRecord(35, 0.60), // healthScore ≤ 39 → RISK_OFF
    );
    const result = await svc.capitalPosture('IN');
    expect(result.postureLabel).toBe('RISK_OFF');
    expect(result.action).toBe('RAISE_CASH');
  });
});

// ─── regimeGate helper ───────────────────────────────────────────────────────

describe('CapitalPostureService — regimeGate helper', () => {
  it('regimeGate returns null when no snapshot exists', async () => {
    const svc = makeService(null, null);
    const gate = await svc.regimeGate('IN');
    expect(gate).toBeNull();
  });

  it('regimeGate returns longsDiscouraged=true for RISK_OFF', async () => {
    const svc = makeService(makeContextSummary('RISK_OFF', 28), makePulseRecord(32, 0.20));
    const gate = await svc.regimeGate('IN');
    expect(gate?.longsDiscouraged).toBe(true);
    expect(gate?.contextualShortsOnly).toBe(true);
    expect(gate?.posture).toBe('RISK_OFF');
  });

  it('regimeGate returns longsDiscouraged=false for RISK_ON', async () => {
    const svc = makeService(makeContextSummary('RISK_ON', 72), makePulseRecord(82, 0.65));
    const gate = await svc.regimeGate('IN');
    expect(gate?.longsDiscouraged).toBe(false);
    expect(gate?.contextualShortsOnly).toBe(false);
  });

  it('regimeGate contextualShortsOnly=true for NEUTRAL with weak breadth', async () => {
    const svc = makeService(
      makeContextSummary('NEUTRAL', 55),
      makePulseRecord(62, BREADTH_WEAK_THRESHOLD - 0.02),
    );
    const gate = await svc.regimeGate('IN');
    // breadth < threshold → downgrade NEUTRAL posture; shorts contextually valid
    expect(gate?.contextualShortsOnly).toBe(true);
  });

  it('regimeGate note contains no buy/sell wording', async () => {
    const svc = makeService(makeContextSummary('RISK_OFF', 28), makePulseRecord(32, 0.20));
    const gate = await svc.regimeGate('IN');
    expect(gate?.note).not.toMatch(/\b(buy|sell)\b/i);
  });
});

// ─── Read-only contract: repos called without side-effects ──────────────────

describe('CapitalPostureService — persisted-reads-only contract', () => {
  it('calls latestPersistedSnapshot (not saveSnapshot) on context repo', async () => {
    const contextRepo = {
      latestPersistedSnapshot: jest.fn().mockResolvedValue(null),
      saveSnapshot: jest.fn(),
      latestSnapshot: jest.fn(),
    };
    const pulseRepo = {
      latestSnapshot: jest.fn().mockResolvedValue(null),
      upsertSnapshot: jest.fn(),
    };
    const svc = new CapitalPostureService(contextRepo as any, pulseRepo as any);

    await svc.capitalPosture('IN');

    expect(contextRepo.latestPersistedSnapshot).toHaveBeenCalledTimes(1);
    expect(contextRepo.saveSnapshot).not.toHaveBeenCalled();
    expect(contextRepo.latestSnapshot).not.toHaveBeenCalled();
    expect(pulseRepo.upsertSnapshot).not.toHaveBeenCalled();
  });

  it('calls latestSnapshot (not upsertSnapshot) on pulse repo', async () => {
    const contextRepo = { latestPersistedSnapshot: jest.fn().mockResolvedValue(null) };
    const pulseRepo   = {
      latestSnapshot: jest.fn().mockResolvedValue(null),
      upsertSnapshot: jest.fn(),
    };
    const svc = new CapitalPostureService(contextRepo as any, pulseRepo as any);

    await svc.capitalPosture('IN');

    expect(pulseRepo.latestSnapshot).toHaveBeenCalledTimes(1);
    expect(pulseRepo.upsertSnapshot).not.toHaveBeenCalled();
  });
});

// ─── Research-support language (no buy/sell anywhere) ──────────────────────

describe('CapitalPostureService — research-support language', () => {
  const regimeScenarios: Array<['RISK_ON' | 'NEUTRAL' | 'RISK_OFF', number, number, number]> = [
    ['RISK_ON',  72, 82, 0.65],
    ['NEUTRAL',  52, 62, 0.50],
    ['RISK_OFF', 28, 32, 0.20],
  ];

  for (const [regime, regimeScore, healthScore, breadth] of regimeScenarios) {
    it(`no buy/sell strings in ${regime} response`, async () => {
      const svc = makeService(makeContextSummary(regime, regimeScore), makePulseRecord(healthScore, breadth));
      const result = await svc.capitalPosture('IN');
      const payload = JSON.stringify(result);
      expect(payload).not.toMatch(/\b(buy|sell)\b/i);
    });
  }
});

// ─── Controller handler test ─────────────────────────────────────────────────

describe('MarketContextIntelligenceController — capitalPosture handler', () => {
  it('calls capitalPostureService.capitalPosture with region from query', async () => {
    const { MarketContextIntelligenceController } = require('../../../src/modules/market-context-intelligence');

    const mockPosture = {
      availability: 'READY',
      scope: { region: 'IN' },
      postureLabel: 'NEUTRAL',
      suggestedExposureBand: { minPct: 40, maxPct: 75 },
      action: 'HOLD',
      evidence: { gaps: [] },
      regimeGate: { longsDiscouraged: false, contextualShortsOnly: false, posture: 'NEUTRAL', breadthAbove50Pct: 0.5, note: 'NEUTRAL regime.' },
      assembledAt: '2026-06-04T06:00:00.000Z',
      message: 'Posture NEUTRAL: Selective environment.',
    };

    const capitalPostureService = { capitalPosture: jest.fn().mockResolvedValue(mockPosture) };

    const controller = new MarketContextIntelligenceController(
      {} as any,
      {} as any,
      capitalPostureService as any,
    );

    const req = { query: { region: 'IN' } } as any;
    const res = { setHeader: jest.fn(), json: jest.fn(), status: jest.fn().mockReturnThis() } as any;

    await controller.capitalPosture(req, res);

    expect(capitalPostureService.capitalPosture).toHaveBeenCalledWith('IN');
    expect(res.json).toHaveBeenCalledWith(mockPosture);
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toMatch(/\b(buy|sell)\b/i);
  });
});

// ─── Routes test ─────────────────────────────────────────────────────────────

describe('market-context routes — capital-posture endpoint registered', () => {
  it('registers GET /market-context/capital-posture', () => {
    const { createMarketContextIntelligenceRouter } = require('../../../src/modules/market-context-intelligence');
    const router = createMarketContextIntelligenceRouter({
      summary:                 jest.fn(),
      persistedSummary:        jest.fn(),
      persistedBreadth:        jest.fn(),
      capitalPosture:          jest.fn(),
      marketPulse:             jest.fn(),
      marketPulseHistory:      jest.fn(),
      sectorSnapshots:         jest.fn(),
      regime:                  jest.fn(),
      sectors:                 jest.fn(),
      breadth:                 jest.fn(),
      countries:               jest.fn(),
      macro:                   jest.fn(),
      run:                     jest.fn(),
      fiiDiiActivity:          jest.fn(),
      fiiDiiIngest:            jest.fn(),
      bulkBlockDeals:          jest.fn(),
      bulkBlockDealsIngest:    jest.fn(),
      institutionalActivity:   jest.fn(),
    } as any);

    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

    expect(routes).toContain('GET /market-context/capital-posture');
  });
});
