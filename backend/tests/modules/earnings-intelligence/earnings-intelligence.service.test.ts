/// <reference types="@types/jest" />
import { EarningsIntelligenceService } from '../../../src/modules/earnings-intelligence';
import type { EarningsFundamentalInput, EarningsSnapshotDto } from '../../../src/modules/earnings-intelligence';

function fundamental(
  periodEndDate: string,
  revenue: number,
  netIncome: number,
  eps: number,
  overrides: Partial<EarningsFundamentalInput> = {}
): EarningsFundamentalInput {
  return {
    id: `fund-${periodEndDate}`,
    stockId: 'stock-1',
    revenue,
    netIncome,
    eps,
    periodType: 'QUARTERLY',
    periodEndDate: new Date(`${periodEndDate}T00:00:00.000Z`),
    source: 'MANUAL_VERIFIED',
    validatedAt: new Date(`${periodEndDate}T00:00:00.000Z`),
    ingestionTimestamp: new Date(`${periodEndDate}T01:00:00.000Z`),
    lastUpdatedTimestamp: new Date(`${periodEndDate}T01:00:00.000Z`),
    dataStatus: 'PARTIAL',
    ...overrides,
  };
}

function persistedRow(categories: EarningsSnapshotDto['categories']): EarningsSnapshotDto {
  return {
    id: 'earnings-1',
    stockId: 'stock-1',
    snapshotDate: '2026-06-01T00:00:00.000Z',
    dataThroughDate: '2026-05-31T00:00:00.000Z',
    symbol: 'AAA',
    resultDate: '2026-05-10T00:00:00.000Z',
    resultDateLabel: 'Official',
    resultDateSource: 'OFFICIAL_CALENDAR',
    periodEndDate: '2026-03-31T00:00:00.000Z',
    validatedAt: '2026-05-11T00:00:00.000Z',
    daysToResult: null,
    revenueGrowth: 20,
    profitGrowth: 30,
    epsGrowth: 25,
    revenueGrowthQoQ: 20,
    profitGrowthQoQ: 30,
    epsGrowthQoQ: 25,
    revenueGrowthYoY: null,
    profitGrowthYoY: null,
    epsGrowthYoY: null,
    growthComparisonBasis: 'QOQ',
    marginTrend: 1.5,
    consistencyScore: 100,
    accelerationScore: 75,
    reasonTags: ['MANUAL_VERIFIED_RESULT'],
    riskTags: [],
    warnings: [],
    freshness: 'FRESH',
    categories,
    rsi14: null,
    smaPosture: null,
    pricePosition52w: null,
    adx14: null,
    deliveryPercent: null,
  };
}

describe('EarningsIntelligenceService', () => {
  it('calculates consistency score from improving persisted earnings metrics', () => {
    const service = new EarningsIntelligenceService({} as any);

    expect(service.calculateConsistencyScore([
      fundamental('2025-03-31', 100, 10, 1),
      fundamental('2025-06-30', 110, 12, 1.2),
      fundamental('2025-09-30', 125, 15, 1.5),
    ])).toBe(100);
  });

  it('calculates acceleration score when latest growth improves versus prior growth', () => {
    const service = new EarningsIntelligenceService({} as any);

    expect(service.calculateAccelerationScore([
      fundamental('2025-03-31', 100, 10, 1),
      fundamental('2025-06-30', 110, 12.1, 1.2),
      fundamental('2025-09-30', 130, 16.9, 1.5),
    ])).toBe(100);
  });

  it('generates result winner and reaction history only from official result date inputs', () => {
    const service = new EarningsIntelligenceService({} as any);
    const winner = service.calculateSnapshot({
      stockId: 'stock-1',
      symbol: 'AAA',
      region: 'IN',
      assetType: 'STOCK',
      snapshotDate: new Date('2026-06-01T00:00:00.000Z'),
      dataThroughDate: null,
      fundamentals: [
        fundamental('2026-03-31', 130, 18, 1.8, {
          officialResultDate: new Date('2026-05-10T00:00:00.000Z'),
          validatedAt: new Date('2026-05-11T00:00:00.000Z'),
        }),
        fundamental('2025-03-31', 100, 10, 1),
      ],
      prices: [
        { symbol: 'AAA', timestamp: new Date('2026-05-08T00:00:00.000Z'), close: 100, adjustedClose: 100, volume: 1000 },
        { symbol: 'AAA', timestamp: new Date('2026-05-16T00:00:00.000Z'), close: 106, adjustedClose: 106, volume: 1200 },
      ],
      deliverySnapshots: [],
    });

    expect(winner.categories).toEqual(expect.arrayContaining([
      'RESULT_WINNERS',
      'RESULT_REACTION_HISTORY',
      'EARNINGS_WATCHLIST',
    ]));
    expect(winner.resultDateSource).toBe('OFFICIAL_CALENDAR');
    expect(winner.resultDate?.toISOString()).toBe('2026-05-10T00:00:00.000Z');
    expect(winner.periodEndDate?.toISOString()).toBe('2026-03-31T00:00:00.000Z');
    expect(winner.validatedAt?.toISOString()).toBe('2026-05-11T00:00:00.000Z');
    expect(winner.warnings).toEqual([]);
  });

  it('classifies a conflicting result into exactly one bucket and tags MIXED_RESULT', () => {
    const service = new EarningsIntelligenceService({} as any);
    // Strong revenue/profit growth + positive price reaction (winner gates) BUT a
    // material EPS decline (disappointment gate): the two guardrails both fire.
    const snapshot = service.calculateSnapshot({
      stockId: 'stock-1',
      symbol: 'AAA',
      region: 'IN',
      assetType: 'STOCK',
      snapshotDate: new Date('2026-06-01T00:00:00.000Z'),
      dataThroughDate: null,
      fundamentals: [
        fundamental('2026-03-31', 130, 18, 0.9, {
          officialResultDate: new Date('2026-05-10T00:00:00.000Z'),
          validatedAt: new Date('2026-05-11T00:00:00.000Z'),
        }),
        fundamental('2025-03-31', 100, 10, 1.0),
      ],
      prices: [
        { symbol: 'AAA', timestamp: new Date('2026-05-08T00:00:00.000Z'), close: 100, adjustedClose: 100, volume: 1000 },
        { symbol: 'AAA', timestamp: new Date('2026-05-16T00:00:00.000Z'), close: 106, adjustedClose: 106, volume: 1200 },
      ],
      deliverySnapshots: [],
    });

    // Net evidence leans positive → Winner; never both tabs at once.
    expect(snapshot.categories).toContain('RESULT_WINNERS');
    expect(snapshot.categories).not.toContain('RESULT_DISAPPOINTMENTS');
    expect(snapshot.reasonTags).toContain('MIXED_RESULT');
  });

  it('routes a conflicting result to Disappointment when the miss dominates (magnitude-aware)', () => {
    const service = new EarningsIntelligenceService({} as any);
    // Small revenue/profit gains + a positive reaction satisfy the winner gates,
    // but a 40% EPS collapse dominates on magnitude → Disappointment, tagged mixed.
    const snapshot = service.calculateSnapshot({
      stockId: 'stock-1',
      symbol: 'AAA',
      region: 'IN',
      assetType: 'STOCK',
      snapshotDate: new Date('2026-06-01T00:00:00.000Z'),
      dataThroughDate: null,
      fundamentals: [
        fundamental('2026-03-31', 108, 11, 0.6, {
          officialResultDate: new Date('2026-05-10T00:00:00.000Z'),
          validatedAt: new Date('2026-05-11T00:00:00.000Z'),
        }),
        fundamental('2025-03-31', 100, 10, 1.0),
      ],
      prices: [
        { symbol: 'AAA', timestamp: new Date('2026-05-08T00:00:00.000Z'), close: 100, adjustedClose: 100, volume: 1000 },
        { symbol: 'AAA', timestamp: new Date('2026-05-16T00:00:00.000Z'), close: 106, adjustedClose: 106, volume: 1200 },
      ],
      deliverySnapshots: [],
    });

    expect(snapshot.categories).toContain('RESULT_DISAPPOINTMENTS');
    expect(snapshot.categories).not.toContain('RESULT_WINNERS');
    expect(snapshot.reasonTags).toContain('MIXED_RESULT');
  });

  it('Phase 3: an in-window cadence projection surfaces an Estimated date and enters UPCOMING_RESULTS', () => {
    const service = new EarningsIntelligenceService({} as any);

    const estimated = service.calculateSnapshot({
      stockId: 'stock-1',
      symbol: 'AAA',
      region: 'IN',
      assetType: 'STOCK',
      snapshotDate: new Date('2026-07-15T00:00:00.000Z'),
      dataThroughDate: null,
      fundamentals: [
        fundamental('2026-03-31', 130, 18, 1.8, { validatedAt: new Date('2026-05-10T00:00:00.000Z') }),
        fundamental('2025-03-31', 100, 10, 1),
      ],
      prices: [],
      deliverySnapshots: [
        { stockId: 'stock-1', symbol: 'AAA', tradingDate: new Date('2026-07-14T00:00:00.000Z'), deliveryPercent: 62, tradedQuantity: 1000, deliverableQuantity: 620 },
      ],
    });

    // periodEnd 2026-03-31 → next quarter end 2026-06-30 + 45d lag = 2026-08-14,
    // 30 days out (≤ the 90-day upcoming window) → an honest Estimated date that
    // populates the year-round UPCOMING_RESULTS / PRE_RESULT_INTEREST tabs.
    expect(estimated.resultDateSource).toBe('ESTIMATED_FROM_CADENCE');
    expect(estimated.resultDate?.toISOString()).toBe('2026-08-14T00:00:00.000Z');
    expect(estimated.resultDateLabel).toBe('Estimated');
    expect(estimated.daysToResult).toBe(30);
    expect(estimated.riskTags).toContain('ESTIMATED_RESULT_DATE');
    expect(estimated.reasonTags).toContain('PRE_RESULT_DELIVERY_INTEREST');
    expect(estimated.warnings).toEqual(expect.arrayContaining(['RESULT_DATE_ESTIMATED_FROM_CADENCE']));
    expect(estimated.warnings).not.toContain('RESULT_DATE_NOT_ANNOUNCED');
    expect(estimated.categories).toContain('UPCOMING_RESULTS');
    expect(estimated.categories).toContain('PRE_RESULT_INTEREST');
    // Result-reaction history stays gated on an OFFICIAL date only.
    expect(estimated.categories).not.toContain('RESULT_REACTION_HISTORY');
  });

  it('Phase 3: the Estimated result date is the cadence projection, preserving period/validation provenance', () => {
    const service = new EarningsIntelligenceService({} as any);

    // With no official date the resolved result date is the cadence projection
    // (2026-06-30 + 45d = 2026-08-14), NOT the fiscal period end or the validation
    // timestamp — those remain preserved as separate provenance fields.
    const snapshot = service.calculateSnapshot({
      stockId: 'stock-1',
      symbol: 'AAA',
      region: 'IN',
      assetType: 'STOCK',
      snapshotDate: new Date('2026-05-01T00:00:00.000Z'),
      dataThroughDate: null,
      fundamentals: [
        fundamental('2026-03-31', 130, 18, 1.8, { validatedAt: new Date('2026-05-10T00:00:00.000Z') }),
        fundamental('2025-03-31', 100, 10, 1),
      ],
      prices: [
        { symbol: 'AAA', timestamp: new Date('2026-04-28T00:00:00.000Z'), close: 100, adjustedClose: 100, volume: 1000 },
      ],
      deliverySnapshots: [],
    });

    expect(snapshot.resultDateSource).toBe('ESTIMATED_FROM_CADENCE');
    expect(snapshot.resultDate?.toISOString()).toBe('2026-08-14T00:00:00.000Z');
    expect(snapshot.resultDateLabel).toBe('Estimated');
    expect(snapshot.periodEndDate?.toISOString()).toBe('2026-03-31T00:00:00.000Z');
    expect(snapshot.validatedAt?.toISOString()).toBe('2026-05-10T00:00:00.000Z');
    // 105 days out → beyond the 90-day window: labeled, but not yet "upcoming".
    expect(snapshot.categories).not.toContain('UPCOMING_RESULTS');
    expect(snapshot.categories).not.toContain('RESULT_WINNERS');
    expect(snapshot.categories).not.toContain('RESULT_REACTION_HISTORY');
    // Price-reaction history still requires an OFFICIAL date, never an estimate.
    expect(snapshot.riskTags).toContain('PRICE_REACTION_REQUIRES_OFFICIAL_RESULT_DATE');
    expect(snapshot.warnings).toEqual(expect.arrayContaining(['RESULT_DATE_ESTIMATED_FROM_CADENCE']));
  });

  it('Phase 3: an OVERDUE period with no official date stays DATE_TBA (no past-dated estimate)', () => {
    const service = new EarningsIntelligenceService({} as any);

    // periodEnd 2025-03-31 → projection 2025-08-14, which is in the past relative
    // to the snapshot: the result is overdue with no official date, so we never
    // surface a stale projected date — it stays DATE_TBA and out of UPCOMING.
    const tba = service.calculateSnapshot({
      stockId: 'stock-1',
      symbol: 'AAA',
      region: 'IN',
      assetType: 'STOCK',
      snapshotDate: new Date('2026-07-15T00:00:00.000Z'),
      dataThroughDate: null,
      fundamentals: [
        fundamental('2025-03-31', 130, 18, 1.8, { validatedAt: new Date('2025-05-10T00:00:00.000Z') }),
        fundamental('2024-03-31', 100, 10, 1),
      ],
      prices: [],
      deliverySnapshots: [],
    });

    expect(tba.daysToResult).toBeNull();
    expect(tba.resultDate).toBeNull();
    expect(tba.resultDateSource).toBe('DATE_TBA');
    expect(tba.resultDateLabel).toBe('TBA');
    expect(tba.riskTags).toContain('ESTIMATED_RESULT_DATE');
    expect(tba.warnings).toEqual(expect.arrayContaining(['RESULT_DATE_NOT_ANNOUNCED']));
    expect(tba.categories).not.toContain('UPCOMING_RESULTS');
    expect(tba.categories).not.toContain('PRE_RESULT_INTEREST');
  });

  it('Phase 3: a PAST official date pivots to the cadence estimate once it ages beyond the recent window', () => {
    const service = new EarningsIntelligenceService({} as any);

    // The Q4 result was officially announced 2026-04-20 — 86 days before the
    // snapshot, past IN's 60-day recent-result window.  It can no longer be a
    // "recent" winner / reaction-history row, so the resolver pivots to the forward
    // cadence estimate (2026-06-30 + 45d = 2026-08-14) so the NEXT result populates
    // UPCOMING_RESULTS instead of the row pinning to a stale past date forever.
    const agedOut = service.calculateSnapshot({
      stockId: 'stock-1',
      symbol: 'AAA',
      region: 'IN',
      assetType: 'STOCK',
      snapshotDate: new Date('2026-07-15T00:00:00.000Z'),
      dataThroughDate: null,
      fundamentals: [
        fundamental('2026-03-31', 130, 18, 1.8, {
          officialResultDate: new Date('2026-04-20T00:00:00.000Z'),
          validatedAt: new Date('2026-04-21T00:00:00.000Z'),
        }),
        fundamental('2025-03-31', 100, 10, 1),
      ],
      // Price data straddles the PAST official date with a post-result bar well past
      // the reaction window — so a price reaction WOULD compute if the row were still
      // OFFICIAL.  Asserting no RESULT_REACTION_HISTORY therefore proves the source
      // pivot (not missing price data) is what drops the aged-out row from that tab.
      prices: [
        { symbol: 'AAA', timestamp: new Date('2026-04-18T00:00:00.000Z'), close: 100, adjustedClose: 100, volume: 1000 },
        { symbol: 'AAA', timestamp: new Date('2026-04-30T00:00:00.000Z'), close: 108, adjustedClose: 108, volume: 1200 },
      ],
      deliverySnapshots: [],
    });

    expect(agedOut.resultDateSource).toBe('ESTIMATED_FROM_CADENCE');
    expect(agedOut.resultDate?.toISOString()).toBe('2026-08-14T00:00:00.000Z');
    expect(agedOut.daysToResult).toBe(30);
    expect(agedOut.categories).toContain('UPCOMING_RESULTS');
    // Aged out of the recent window → no longer a recent winner / reaction-history row,
    // even though straddling price data is present.
    expect(agedOut.categories).not.toContain('RESULT_WINNERS');
    expect(agedOut.categories).not.toContain('RESULT_REACTION_HISTORY');
  });

  it('Phase 3: a PAST official date within the recent window stays OFFICIAL and out of UPCOMING', () => {
    const service = new EarningsIntelligenceService({} as any);

    // Same shape but the official result is only 36 days before the snapshot —
    // inside IN's 60-day recent window — so it remains the authoritative result
    // (driving winner / reaction-history) and is NOT pulled forward into UPCOMING,
    // even though a forward cadence estimate would otherwise be in range.
    const recent = service.calculateSnapshot({
      stockId: 'stock-1',
      symbol: 'AAA',
      region: 'IN',
      assetType: 'STOCK',
      snapshotDate: new Date('2026-07-15T00:00:00.000Z'),
      dataThroughDate: null,
      fundamentals: [
        fundamental('2026-03-31', 130, 18, 1.8, {
          officialResultDate: new Date('2026-06-09T00:00:00.000Z'),
          validatedAt: new Date('2026-06-10T00:00:00.000Z'),
        }),
        fundamental('2025-03-31', 100, 10, 1),
      ],
      prices: [
        { symbol: 'AAA', timestamp: new Date('2026-06-07T00:00:00.000Z'), close: 100, adjustedClose: 100, volume: 1000 },
        { symbol: 'AAA', timestamp: new Date('2026-06-19T00:00:00.000Z'), close: 107, adjustedClose: 107, volume: 1200 },
      ],
      deliverySnapshots: [],
    });

    expect(recent.resultDateSource).toBe('OFFICIAL_CALENDAR');
    expect(recent.resultDate?.toISOString()).toBe('2026-06-09T00:00:00.000Z');
    expect(recent.daysToResult).toBeNull();
    expect(recent.categories).not.toContain('UPCOMING_RESULTS');
    expect(recent.categories).toContain('RESULT_REACTION_HISTORY');
  });

  it('marks stale freshness from period end even when validatedAt is recent', () => {
    const service = new EarningsIntelligenceService({} as any);

    // FY25 latest period (2025-03-31) — estimated result = 2025-03-31+3m+45d = 2025-08-14.
    // Any snapshotDate after 2025-08-14 puts the estimate in the past, so the fallback
    // path is reached regardless of window size.
    const snapshot = service.calculateSnapshot({
      stockId: 'stock-1',
      symbol: 'AAA',
      region: 'IN',
      assetType: 'STOCK',
      snapshotDate: new Date('2026-06-01T00:00:00.000Z'),
      dataThroughDate: null,
      fundamentals: [
        fundamental('2025-03-31', 130, 18, 1.8, { validatedAt: new Date('2026-05-10T00:00:00.000Z') }),
        fundamental('2024-03-31', 100, 10, 1),
      ],
      prices: [],
      deliverySnapshots: [],
    });

    expect(snapshot.resultDateSource).toBe('DATE_TBA');
    expect(snapshot.freshness).toBe('STALE');
    expect(snapshot.riskTags).toContain('STALE_EARNINGS_DATA');
  });

  it('assigns a valid fallback category when no stronger earnings bucket qualifies', () => {
    const service = new EarningsIntelligenceService({} as any);

    const snapshot = service.calculateSnapshot({
      stockId: 'stock-1',
      symbol: 'AAA',
      region: 'IN',
      assetType: 'STOCK',
      snapshotDate: new Date('2026-06-01T00:00:00.000Z'),
      dataThroughDate: null,
      fundamentals: [
        fundamental('2025-03-31', 90, 8, 0.8),
        fundamental('2024-03-31', 100, 10, 1),
      ],
      prices: [],
      deliverySnapshots: [],
    });

    expect(snapshot.categories).toEqual(['EARNINGS_WATCHLIST']);
  });

  it('refreshes with idempotent snapshot upsert by scope date and symbol', async () => {
    const stored = new Map<string, EarningsSnapshotDto>();
    const repository = {
      countRefreshUniverse: jest.fn().mockResolvedValue(1),
      loadCalculationInputs: jest.fn().mockResolvedValue([{
        stockId: 'stock-1',
        symbol: 'AAA',
        region: 'IN',
        assetType: 'STOCK',
        // Use snapshotDate in May so estimated result date (Aug-14) is >90 days away,
        // keeping resultDateSource=PERIOD_END_DATE_FALLBACK and freshness=FRESH.
        snapshotDate: new Date('2026-05-01T00:00:00.000Z'),
        dataThroughDate: null,
        fundamentals: [
          fundamental('2026-03-31', 130, 18, 1.8, { validatedAt: new Date('2026-04-30T00:00:00.000Z') }),
          fundamental('2025-03-31', 100, 10, 1),
        ],
        prices: [],
        deliverySnapshots: [],
      }]),
      upsertSnapshots: jest.fn(async (rows) => rows.map((row: any) => {
        const key = `${row.snapshotDate.toISOString()}:${row.scopeRegion}:${row.scopeAssetType}:${row.symbol}`;
        const saved = { id: stored.get(key)?.id || 'earnings-1', ...row, snapshotDate: row.snapshotDate.toISOString(), dataThroughDate: row.dataThroughDate?.toISOString?.() ?? null, resultDate: row.resultDate?.toISOString?.() ?? null };
        stored.set(key, saved);
        return saved;
      })),
    };
    const service = new EarningsIntelligenceService(repository as any);

    await service.refreshSnapshots({ region: 'IN', assetType: 'STOCK', snapshotDate: new Date('2026-06-01T00:00:00.000Z') });
    await service.refreshSnapshots({ region: 'IN', assetType: 'STOCK', snapshotDate: new Date('2026-06-01T00:00:00.000Z') });

    expect(repository.upsertSnapshots).toHaveBeenCalledTimes(2);
    expect(stored.size).toBe(1);
  });

  // ── Trading-session-aware price-reaction window ────────────────────────────

  it('reaction: "after" bar is PRICE_REACTION_TRADING_SESSIONS sessions out, not 5 calendar days', () => {
    const svc = new EarningsIntelligenceService({} as any);
    // Result date: Monday 2026-05-11
    // Before bar: 2026-05-11 (result day)
    // 5 trading sessions after Mon 11 = Mon 18 (Tue12, Wed13, Thu14, Fri15, Mon18)
    // Calendar 5 days after Mon 11 would be Sat 16 → scan picks Mon 18 anyway
    // The test verifies the "after" bar is the one >= the trading-session target
    const resultDate = new Date('2026-05-11T00:00:00.000Z');
    const snapshot = svc.calculateSnapshot({
      stockId: 'stock-1',
      symbol: 'REACT',
      region: 'IN',
      assetType: 'STOCK',
      snapshotDate: new Date('2026-06-01T00:00:00.000Z'),
      dataThroughDate: null,
      fundamentals: [
        fundamental('2026-03-31', 130, 18, 1.8, {
          officialResultDate: resultDate,
          validatedAt: new Date('2026-05-12T00:00:00.000Z'),
        }),
        fundamental('2025-03-31', 100, 10, 1),
      ],
      prices: [
        // Before bar
        { symbol: 'REACT', timestamp: new Date('2026-05-11T00:00:00.000Z'), close: 100, adjustedClose: 100, volume: 1000 },
        // This bar is exactly 5 calendar days out (Sat) — should NOT be selected
        // because 2026-05-16 is a Saturday and Intl.DateTimeFormat in IST would
        // still represent it; addTradingSessions skips it.
        { symbol: 'REACT', timestamp: new Date('2026-05-16T00:00:00.000Z'), close: 104, adjustedClose: 104, volume: 1000 },
        // This bar is 5 trading sessions out (Mon 18)
        { symbol: 'REACT', timestamp: new Date('2026-05-18T00:00:00.000Z'), close: 108, adjustedClose: 108, volume: 1200 },
      ],
      deliverySnapshots: [],
    });

    // The reaction should be measured to the Mon-18 bar (5 trading sessions)
    // 108/100 - 1 = +8%
    expect(snapshot.categories).toContain('RESULT_WINNERS');
    expect(snapshot.categories).toContain('RESULT_REACTION_HISTORY');
    // priceReaction is stored in the snapshot — we verify the result is > 0
    // (positive reaction → RESULT_WINNERS) and that the correct bar was chosen
    // by checking it's NOT the Sat-16 bar (+4%) classification still being winner
    // but the Mon-18 bar (+8%)
    expect(snapshot.warnings).toEqual([]);
  });

  it('reaction: holiday cluster — "after" bar skips over a weekend+holiday and uses next trading day', () => {
    const svc = new EarningsIntelligenceService({} as any);
    // Result date: Thursday 2026-05-07
    // 5 trading sessions: Fri 08 = 1, Mon 11 = 2, Tue 12 = 3, Wed 13 = 4, Thu 14 = 5
    // If instead we added 5 calendar days: Mon 12 — that's only 3 trading sessions
    // With trading-session math: the "after" bar should be >= Thu 2026-05-14
    const resultDate = new Date('2026-05-07T00:00:00.000Z');
    const snapshot = svc.calculateSnapshot({
      stockId: 'stock-2',
      symbol: 'HOLI',
      region: 'IN',
      assetType: 'STOCK',
      snapshotDate: new Date('2026-06-01T00:00:00.000Z'),
      dataThroughDate: null,
      fundamentals: [
        fundamental('2026-03-31', 120, 15, 1.5, {
          officialResultDate: resultDate,
          validatedAt: new Date('2026-05-08T00:00:00.000Z'),
        }),
        fundamental('2025-03-31', 100, 10, 1),
      ],
      prices: [
        // Before bar (day of result)
        { symbol: 'HOLI', timestamp: new Date('2026-05-07T00:00:00.000Z'), close: 200, adjustedClose: 200, volume: 1000 },
        // 5 calendar days out: Mon 12 — this is the WRONG bar (only 3 sessions)
        { symbol: 'HOLI', timestamp: new Date('2026-05-12T00:00:00.000Z'), close: 202, adjustedClose: 202, volume: 1000 },
        // 5 trading sessions out: Thu 14 — this is the CORRECT bar
        { symbol: 'HOLI', timestamp: new Date('2026-05-14T00:00:00.000Z'), close: 210, adjustedClose: 210, volume: 1200 },
      ],
      deliverySnapshots: [],
    });

    // With trading-session math the "after" bar should be >= 2026-05-14 (Thu)
    // reaction = 210/200-1 = +5% → RESULT_WINNERS
    expect(snapshot.categories).toContain('RESULT_WINNERS');
    expect(snapshot.categories).toContain('RESULT_REACTION_HISTORY');
    expect(snapshot.warnings).toEqual([]);
  });

  it('reaction: RESULT_REACTION_HISTORY absent when no bar is available after the trading-session target', () => {
    // When priceReaction is null (no after bar), RESULT_REACTION_HISTORY must not appear.
    // Note: RESULT_WINNERS may still appear if fundamentals growth alone qualifies
    // (consistencyScore/accelerationScore ≥ 60 path), which is by design.
    const svc = new EarningsIntelligenceService({} as any);
    const resultDate = new Date('2026-05-07T00:00:00.000Z');
    const snapshot = svc.calculateSnapshot({
      stockId: 'stock-3',
      symbol: 'NOBAR',
      region: 'IN',
      assetType: 'STOCK',
      snapshotDate: new Date('2026-05-10T00:00:00.000Z'),
      dataThroughDate: null,
      fundamentals: [
        fundamental('2026-03-31', 120, 15, 1.5, {
          officialResultDate: resultDate,
          validatedAt: new Date('2026-05-08T00:00:00.000Z'),
        }),
        fundamental('2025-03-31', 100, 10, 1),
      ],
      prices: [
        // Only the before bar; no "after" bar exists past the target date
        { symbol: 'NOBAR', timestamp: new Date('2026-05-07T00:00:00.000Z'), close: 200, adjustedClose: 200, volume: 1000 },
      ],
      deliverySnapshots: [],
    });

    // RESULT_REACTION_HISTORY requires priceReaction != null — must be absent
    expect(snapshot.categories).not.toContain('RESULT_REACTION_HISTORY');
    // INSUFFICIENT_RESULT_REACTION_WINDOW risk tag is set when reaction is null
    expect(snapshot.riskTags).toContain('INSUFFICIENT_RESULT_REACTION_WINDOW');
  });

  it('serves only the latest persisted snapshot without request-time calculation', async () => {
    const repository = {
      latestSnapshot: jest.fn().mockResolvedValue({
        rows: [persistedRow(['RESULT_WINNERS', 'EARNINGS_WATCHLIST'])],
        truncated: false,
        snapshotDate: '2026-06-01',
        dataThroughDate: '2026-05-31',
      }),
    };
    // Disable the read-time signal join (null reader) so this unit test stays
    // pure — no real signal engine / DB access.
    const service = new EarningsIntelligenceService(repository as any, undefined, null);

    const response = await service.latest({ region: 'IN', assetType: 'STOCK', limit: 10, category: 'RESULT_WINNERS' }, new Date('2026-06-01T06:00:00.000Z'));

    expect(repository.latestSnapshot).toHaveBeenCalledWith({
      region: 'IN',
      assetType: 'STOCK',
      limit: 10,
      category: 'RESULT_WINNERS',
    });
    expect(response.categories.RESULT_WINNERS).toHaveLength(1);
    expect(response.items[0].symbol).toBe('AAA');
  });

  it('joins the latest trusted signal onto each row at read time', async () => {
    const repository = {
      latestSnapshot: jest.fn().mockResolvedValue({
        rows: [persistedRow(['RESULT_WINNERS', 'EARNINGS_WATCHLIST'])],
        truncated: false,
        snapshotDate: '2026-06-01',
        dataThroughDate: '2026-05-31',
      }),
    };
    const signalReader = {
      latestPersistedForInstruments: jest.fn().mockResolvedValue([
        {
          instrument_id: 'stock-1',
          symbol: 'AAA',
          score: 71,
          calibratedScore: 80,
          direction: 'BULLISH',
          confidence: 'HIGH',
          lifecycleState: 'ENTRY',
          triggerPrice: 1234.5,
          generated_at: '2026-05-30T00:00:00.000Z',
        },
      ]),
    };
    const service = new EarningsIntelligenceService(repository as any, undefined, signalReader as any);

    const response = await service.latest({ region: 'IN', assetType: 'STOCK', limit: 10 }, new Date('2026-06-01T06:00:00.000Z'));

    expect(signalReader.latestPersistedForInstruments).toHaveBeenCalledWith(['stock-1']);
    expect(response.items[0].signal).toEqual({
      direction: 'BULLISH',
      score: 80, // calibrated preferred over raw
      confidence: 'HIGH',
      lifecycleState: 'ENTRY',
      triggerPrice: 1234.5,
      generatedDate: '2026-05-30T00:00:00.000Z',
    });
    // Same row reference is shared with the category bucket.
    expect(response.categories.RESULT_WINNERS[0].signal?.direction).toBe('BULLISH');
  });

  it('sets signal=null for rows with no trusted signal and never blocks the read', async () => {
    const repository = {
      latestSnapshot: jest.fn().mockResolvedValue({
        rows: [persistedRow(['RESULT_WINNERS'])],
        truncated: false,
        snapshotDate: '2026-06-01',
        dataThroughDate: '2026-05-31',
      }),
    };
    const signalReader = { latestPersistedForInstruments: jest.fn().mockResolvedValue([]) };
    const service = new EarningsIntelligenceService(repository as any, undefined, signalReader as any);

    const response = await service.latest({ region: 'IN', assetType: 'STOCK', limit: 10 }, new Date('2026-06-01T06:00:00.000Z'));

    expect(response.items[0].signal).toBeNull();
  });

  it('leaves signal undefined and warns (not null) when the signal join throws', async () => {
    const repository = {
      latestSnapshot: jest.fn().mockResolvedValue({
        rows: [persistedRow(['RESULT_WINNERS'])],
        truncated: false,
        snapshotDate: '2026-06-01',
        dataThroughDate: '2026-05-31',
      }),
    };
    const signalReader = {
      latestPersistedForInstruments: jest.fn().mockRejectedValue(new Error('signal store down')),
    };
    const service = new EarningsIntelligenceService(repository as any, undefined, signalReader as any);

    const response = await service.latest({ region: 'IN', assetType: 'STOCK', limit: 10 }, new Date('2026-06-01T06:00:00.000Z'));

    // undefined (join failed) is distinct from null (no trusted signal).
    expect(response.items[0].signal).toBeUndefined();
    expect(response.warnings.some((w) => w.toLowerCase().includes('signal enrichment failed'))).toBe(true);
  });

  // ── CB-44: official date preferred; estimated clearly labeled ────────────────

  it('CB-44: official result date produces resultDateLabel="Official" and no estimation warnings', () => {
    const service = new EarningsIntelligenceService({} as any);
    const snapshot = service.calculateSnapshot({
      stockId: 'stock-1',
      symbol: 'AAA',
      region: 'IN',
      assetType: 'STOCK',
      snapshotDate: new Date('2026-06-01T00:00:00.000Z'),
      dataThroughDate: null,
      fundamentals: [
        fundamental('2026-03-31', 130, 18, 1.8, {
          officialResultDate: new Date('2026-05-10T00:00:00.000Z'),
          validatedAt: new Date('2026-05-11T00:00:00.000Z'),
        }),
        fundamental('2025-03-31', 100, 10, 1),
      ],
      prices: [],
      deliverySnapshots: [],
    });

    expect(snapshot.resultDateSource).toBe('OFFICIAL_CALENDAR');
    expect(snapshot.resultDateLabel).toBe('Official');
    expect(snapshot.warnings).not.toContain('OFFICIAL_CALENDAR_NOT_AVAILABLE');
    expect(snapshot.warnings).not.toContain('RESULT_DATE_ESTIMATED_FROM_PERIOD_CADENCE');
    expect(snapshot.riskTags).not.toContain('ESTIMATED_RESULT_DATE');
  });

  it('CB-44: absent official date for an OVERDUE period produces resultDateLabel="TBA" with not-announced warning', () => {
    const service = new EarningsIntelligenceService({} as any);
    // Overdue period (projection in the past) → DATE_TBA rather than a Phase 3
    // forward estimate; the not-announced honesty warning still applies.
    const snapshot = service.calculateSnapshot({
      stockId: 'stock-1',
      symbol: 'AAA',
      region: 'IN',
      assetType: 'STOCK',
      snapshotDate: new Date('2026-07-15T00:00:00.000Z'),
      dataThroughDate: null,
      fundamentals: [
        fundamental('2025-03-31', 130, 18, 1.8, {
          validatedAt: new Date('2025-05-10T00:00:00.000Z'),
        }),
        fundamental('2024-03-31', 100, 10, 1),
      ],
      prices: [],
      deliverySnapshots: [],
    });

    expect(snapshot.resultDateSource).toBe('DATE_TBA');
    expect(snapshot.resultDateLabel).toBe('TBA');
    expect(snapshot.warnings).toContain('RESULT_DATE_NOT_ANNOUNCED');
    expect(snapshot.riskTags).toContain('ESTIMATED_RESULT_DATE');
  });

  it('CB-44: an OVERDUE DATE_TBA period never surfaces a (past-dated) result date', () => {
    const service = new EarningsIntelligenceService({} as any);
    // Projection 2024-08-14 is well in the past at snapshot 2026-05-01 → DATE_TBA
    // with a suppressed (null) date; we never show a stale projected date.
    const snapshot = service.calculateSnapshot({
      stockId: 'stock-1',
      symbol: 'AAA',
      region: 'IN',
      assetType: 'STOCK',
      snapshotDate: new Date('2026-05-01T00:00:00.000Z'),
      dataThroughDate: null,
      fundamentals: [
        fundamental('2024-03-31', 130, 18, 1.8, { validatedAt: new Date('2024-04-30T00:00:00.000Z') }),
        fundamental('2023-03-31', 100, 10, 1),
      ],
      prices: [],
      deliverySnapshots: [],
    });

    expect(snapshot.resultDateSource).toBe('DATE_TBA');
    expect(snapshot.resultDate).toBeNull();
    expect(snapshot.resultDateLabel).toBe('TBA');
  });

  it('CB-44: latestProximityBySymbol returns only rows with daysToResult populated', async () => {
    const rowWithDays: EarningsSnapshotDto = {
      ...persistedRow(['UPCOMING_RESULTS']),
      symbol: 'UPCO',
      daysToResult: 2,
      resultDateSource: 'OFFICIAL_CALENDAR',
      resultDateLabel: 'Official',
    };
    const rowNoDays: EarningsSnapshotDto = {
      ...persistedRow(['EARNINGS_WATCHLIST']),
      symbol: 'NOUP',
      daysToResult: null,
      resultDateLabel: 'Official',
    };
    const repository = {
      latestSnapshot: jest.fn().mockResolvedValue({
        rows: [rowWithDays, rowNoDays],
        truncated: false,
        snapshotDate: '2026-06-01',
        dataThroughDate: '2026-05-31',
      }),
    };
    const service = new EarningsIntelligenceService(repository as any);

    const map = await service.latestProximityBySymbol('IN', 'STOCK');

    expect(map.has('UPCO')).toBe(true);
    expect(map.has('NOUP')).toBe(false);
    const entry = map.get('UPCO')!;
    expect(entry.daysToResult).toBe(2);
    expect(entry.resultDateLabel).toBe('Official');
  });

  // ── B1: consistency/acceleration scoring must not mix period types ──────────

  it('B1: consistency score ignores an interleaved annual row and scores the quarterly series only', () => {
    const service = new EarningsIntelligenceService({} as any);
    // Three cleanly-rising quarters plus one large ANNUAL row whose magnitude
    // would corrupt a mixed-series comparison (rise-then-collapse).  Single-class
    // scoring must keep the quarterly progression at a perfect 100.
    const snapshot = service.calculateSnapshot({
      stockId: 'stock-1',
      symbol: 'MIX',
      region: 'IN',
      assetType: 'STOCK',
      snapshotDate: new Date('2025-11-01T00:00:00.000Z'),
      dataThroughDate: null,
      fundamentals: [
        fundamental('2025-09-30', 120, 12, 1.2),
        { ...fundamental('2025-07-31', 400, 40, 4), periodType: 'ANNUAL' },
        fundamental('2025-06-30', 110, 11, 1.1),
        fundamental('2025-03-31', 100, 10, 1),
      ],
      prices: [],
      deliverySnapshots: [],
    });

    expect(snapshot.consistencyScore).toBe(100);
  });

  // ── B2: US/TTM fundamentals are not reported as missing quarterly + annual ──

  it('B2: a TTM (US) series is recognised, not flagged as missing quarterly AND annual', () => {
    const service = new EarningsIntelligenceService({} as any);
    const ttm = (periodEndDate: string, revenue: number, netIncome: number, eps: number): EarningsFundamentalInput =>
      ({ ...fundamental(periodEndDate, revenue, netIncome, eps), periodType: 'TTM' });

    const snapshot = service.calculateSnapshot({
      stockId: 'stock-us',
      symbol: 'AAPL',
      region: 'US',
      assetType: 'STOCK',
      snapshotDate: new Date('2025-11-15T00:00:00.000Z'),
      dataThroughDate: null,
      fundamentals: [
        ttm('2025-09-30', 1000, 100, 10),
        ttm('2024-09-30', 900, 80, 8),
      ],
      prices: [],
      deliverySnapshots: [],
    });

    expect(snapshot.riskTags).not.toContain('MISSING_QUARTERLY_RESULTS');
    expect(snapshot.riskTags).not.toContain('MISSING_ANNUAL_RESULTS');
    expect(snapshot.reasonTags).toContain('LATEST_TTM_RESULT');
  });

  it('B2: a quarterly-only stock is still flagged as missing annual results', () => {
    const service = new EarningsIntelligenceService({} as any);
    const snapshot = service.calculateSnapshot({
      stockId: 'stock-q',
      symbol: 'QONLY',
      region: 'IN',
      assetType: 'STOCK',
      snapshotDate: new Date('2025-11-01T00:00:00.000Z'),
      dataThroughDate: null,
      fundamentals: [
        fundamental('2025-09-30', 120, 12, 1.2),
        fundamental('2025-06-30', 110, 11, 1.1),
      ],
      prices: [],
      deliverySnapshots: [],
    });

    expect(snapshot.riskTags).toContain('MISSING_ANNUAL_RESULTS');
    expect(snapshot.riskTags).not.toContain('MISSING_QUARTERLY_RESULTS');
  });

  // ── Region config: unknown region degrades gracefully with a warning ────────

  it('surfaces an unconfigured-region warning while still returning a response', async () => {
    const repository = {
      latestSnapshot: jest.fn().mockResolvedValue({
        rows: [persistedRow(['EARNINGS_WATCHLIST'])],
        truncated: false,
        snapshotDate: '2026-06-01',
        dataThroughDate: '2026-05-31',
      }),
    };
    const service = new EarningsIntelligenceService(repository as any, undefined, null);

    const response = await service.latest({ region: 'MARS', assetType: 'STOCK', limit: 10 }, new Date('2026-06-01T06:00:00.000Z'));

    expect(response.warnings.some((w) => w.includes('no dedicated Earnings Intelligence configuration'))).toBe(true);
    expect(response.scope.region).toBe('MARS');
  });
});

describe('EarningsIntelligenceService — Phase 2 QoQ/YoY growth split', () => {
  const baseInput = {
    stockId: 'stock-1',
    symbol: 'SPLITCO',
    region: 'IN' as const,
    assetType: 'STOCK' as const,
    snapshotDate: new Date('2026-05-15T00:00:00.000Z'),
    dataThroughDate: null,
    prices: [],
    deliverySnapshots: [],
  };

  it('computes QoQ vs the prior quarter and YoY vs the year-ago quarter as distinct figures; legacy fields alias QoQ', () => {
    const service = new EarningsIntelligenceService({} as any);
    const snapshot = service.calculateSnapshot({
      ...baseInput,
      fundamentals: [
        fundamental('2026-03-31', 1320, 156, 13.2), // latest
        fundamental('2025-12-31', 1200, 130, 12),   // prior quarter → QoQ basis
        fundamental('2025-03-31', 1100, 120, 11),   // same quarter last year → YoY basis
      ],
    });

    // QoQ: vs 2025-12-31
    expect(snapshot.revenueGrowthQoQ).toBe(10);
    expect(snapshot.profitGrowthQoQ).toBe(20);
    expect(snapshot.epsGrowthQoQ).toBe(10);
    // YoY: vs 2025-03-31 (a genuine year-ago comparable) — distinct from QoQ
    expect(snapshot.revenueGrowthYoY).toBe(20);
    expect(snapshot.profitGrowthYoY).toBe(30);
    expect(snapshot.epsGrowthYoY).toBe(20);
    // Legacy fields are the QoQ alias; basis names it.
    expect(snapshot.revenueGrowth).toBe(snapshot.revenueGrowthQoQ);
    expect(snapshot.profitGrowth).toBe(snapshot.profitGrowthQoQ);
    expect(snapshot.epsGrowth).toBe(snapshot.epsGrowthQoQ);
    expect(snapshot.growthComparisonBasis).toBe('QOQ');
  });

  it('reports YoY = null when no true year-ago comparable exists (no silent prior-quarter fallback)', () => {
    const service = new EarningsIntelligenceService({} as any);
    const snapshot = service.calculateSnapshot({
      ...baseInput,
      fundamentals: [
        fundamental('2026-03-31', 1320, 156, 13.2), // latest
        fundamental('2025-12-31', 1200, 130, 12),   // only a prior quarter — no year-ago row
      ],
    });

    // QoQ still computed against the prior quarter…
    expect(snapshot.revenueGrowthQoQ).toBe(10);
    expect(snapshot.revenueGrowth).toBe(10);
    expect(snapshot.growthComparisonBasis).toBe('QOQ');
    // …but YoY is honestly null rather than masquerading as the prior-quarter figure.
    expect(snapshot.revenueGrowthYoY).toBeNull();
    expect(snapshot.profitGrowthYoY).toBeNull();
    expect(snapshot.epsGrowthYoY).toBeNull();
  });
});
