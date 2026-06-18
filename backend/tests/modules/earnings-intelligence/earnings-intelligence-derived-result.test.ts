/// <reference types="@types/jest" />
/**
 * Derived recent-result path (US "Result Winners" / "Result Disappointments").
 *
 * These tests pin the behaviour added so the US Earnings page's RESULT_WINNERS /
 * RESULT_DISAPPOINTMENTS buckets populate from the most-recent reported quarter,
 * WITHOUT changing the India official-date path and WITHOUT regressing the
 * forward-date UPCOMING_RESULTS bucket.
 *
 * The filename is intentionally hyphenated (…-derived-result) so its compiled
 * stem does not collide with the dotted earnings-intelligence.* sources under
 * ts-jest (which otherwise surfaces as TS2307 on a shared module stem).
 */
import { EarningsIntelligenceService } from '../../../src/modules/earnings-intelligence';
import type { EarningsFundamentalInput } from '../../../src/modules/earnings-intelligence';

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
    source: 'YAHOO',
    validatedAt: new Date(`${periodEndDate}T00:00:00.000Z`),
    ingestionTimestamp: new Date(`${periodEndDate}T01:00:00.000Z`),
    lastUpdatedTimestamp: new Date(`${periodEndDate}T01:00:00.000Z`),
    dataStatus: 'PARTIAL',
    ...overrides,
  };
}

describe('EarningsIntelligenceService — derived recent-result (US Result Winners)', () => {
  // ── 1. US winner via the DERIVED (estimated) result date ────────────────────
  it('US: a stock whose official date is in the FUTURE still becomes a RESULT_WINNER via the derived last-quarter date', () => {
    const service = new EarningsIntelligenceService({} as any);
    // US lag = 40d. Latest reported quarter ends 2026-04-01 → estimated last result
    // = 2026-05-11 (38 days before the 2026-06-18 snapshot → inside the 60d window,
    // and in the past). The official date is the NEXT (forward) earnings date.
    const snapshot = service.calculateSnapshot({
      stockId: 'stock-us',
      symbol: 'NVDA',
      region: 'US',
      assetType: 'STOCK',
      snapshotDate: new Date('2026-06-18T00:00:00.000Z'),
      dataThroughDate: null,
      fundamentals: [
        fundamental('2026-04-01', 130, 18, 1.8, {
          // Forward (next) earnings date → Upcoming, never a recent past.
          officialResultDate: new Date('2026-07-15T00:00:00.000Z'),
        }),
        fundamental('2025-04-01', 100, 10, 1),
      ],
      prices: [
        // Before bar (≤ derived date 2026-05-11) and an "after" bar ≥5 sessions out.
        { symbol: 'NVDA', timestamp: new Date('2026-05-11T00:00:00.000Z'), close: 100, adjustedClose: 100, volume: 1000 },
        { symbol: 'NVDA', timestamp: new Date('2026-05-20T00:00:00.000Z'), close: 104, adjustedClose: 104, volume: 1200 },
      ],
      deliverySnapshots: [],
    });

    // RESULT_WINNERS populates off the derived last-quarter result …
    expect(snapshot.categories).toContain('RESULT_WINNERS');
    // … and the row can legitimately ALSO be Upcoming via its official forward date.
    expect(snapshot.categories).toContain('UPCOMING_RESULTS');
    expect(snapshot.daysToResult).toBeGreaterThanOrEqual(0);
    // The winner provenance reads as ESTIMATED, not an official announcement.
    expect(snapshot.reasonTags).toContain('RECENT_RESULT_ESTIMATED_FROM_PERIOD_CADENCE');
    // The persisted row-level date stays the genuine official forward date; the
    // derived classification rides on the reason flag, not on overwriting it.
    expect(snapshot.resultDateSource).toBe('OFFICIAL_CALENDAR');
    // The derived (estimated) date must NOT have leaked into the official-only
    // RESULT_REACTION_HISTORY bucket (that requires the official date's reaction,
    // and the official date is in the future → no reaction window).
    expect(snapshot.categories).not.toContain('RESULT_REACTION_HISTORY');
  });

  // ── 2. INDIA regression: unchanged official-past path still wins ────────────
  it('IN: a recent PAST official date still produces RESULT_WINNERS via the unchanged official path, and the derived path does NOT double-fire', () => {
    const service = new EarningsIntelligenceService({} as any);
    const snapshot = service.calculateSnapshot({
      stockId: 'stock-in',
      symbol: 'TCS',
      region: 'IN',
      assetType: 'STOCK',
      snapshotDate: new Date('2026-06-18T00:00:00.000Z'),
      dataThroughDate: null,
      fundamentals: [
        fundamental('2026-03-31', 130, 18, 1.8, {
          // NSE board-meeting date — a recent PAST date (39 days before snapshot).
          officialResultDate: new Date('2026-05-10T00:00:00.000Z'),
          validatedAt: new Date('2026-05-11T00:00:00.000Z'),
        }),
        fundamental('2025-03-31', 100, 10, 1),
      ],
      prices: [
        { symbol: 'TCS', timestamp: new Date('2026-05-10T00:00:00.000Z'), close: 100, adjustedClose: 100, volume: 1000 },
        { symbol: 'TCS', timestamp: new Date('2026-05-18T00:00:00.000Z'), close: 106, adjustedClose: 106, volume: 1200 },
      ],
      deliverySnapshots: [],
    });

    // Winner via the unchanged OFFICIAL_CALENDAR path …
    expect(snapshot.categories).toContain('RESULT_WINNERS');
    expect(snapshot.resultDateSource).toBe('OFFICIAL_CALENDAR');
    expect(snapshot.resultDate?.toISOString()).toBe('2026-05-10T00:00:00.000Z');
    // Reaction history present because the official date has a real reaction window.
    expect(snapshot.categories).toContain('RESULT_REACTION_HISTORY');
    // … and the derived path must NOT have engaged (no estimated provenance flag).
    expect(snapshot.reasonTags).not.toContain('RECENT_RESULT_ESTIMATED_FROM_PERIOD_CADENCE');
    expect(snapshot.warnings).toEqual([]);
  });

  // ── 3. UPCOMING unaffected by the derived path ──────────────────────────────
  it('US: a future official date classifies UPCOMING_RESULTS exactly as before; the derived path does not add it to UPCOMING', () => {
    const service = new EarningsIntelligenceService({} as any);
    // Latest quarter ends 2026-04-01 → derived last result = 2026-05-11 (recent),
    // but growth is FLAT/negative so it does NOT qualify as a derived winner.
    // The forward official date must still produce UPCOMING_RESULTS once.
    const snapshot = service.calculateSnapshot({
      stockId: 'stock-up',
      symbol: 'INTC',
      region: 'US',
      assetType: 'STOCK',
      snapshotDate: new Date('2026-06-18T00:00:00.000Z'),
      dataThroughDate: null,
      fundamentals: [
        fundamental('2026-04-01', 90, 8, 0.8, {
          officialResultDate: new Date('2026-07-10T00:00:00.000Z'),
        }),
        fundamental('2025-04-01', 100, 10, 1),
      ],
      prices: [],
      deliverySnapshots: [],
    });

    // UPCOMING present, from the official forward date, exactly once.
    expect(snapshot.categories).toContain('UPCOMING_RESULTS');
    expect(snapshot.categories.filter((c) => c === 'UPCOMING_RESULTS')).toHaveLength(1);
    expect(snapshot.resultDateSource).toBe('OFFICIAL_CALENDAR');
    expect(snapshot.daysToResult).toBe(22);
    // Falling fundamentals → not a winner via either path.
    expect(snapshot.categories).not.toContain('RESULT_WINNERS');
  });

  // ── 4. No false winners from a STALE most-recent period ─────────────────────
  it('US: a stale most-recent period (periodEnd + lag older than the recent window) does NOT become a derived RESULT_WINNER', () => {
    const service = new EarningsIntelligenceService({} as any);
    // Latest quarter ends 2026-01-01 → derived last result = 2026-02-10, which is
    // 128 days before the 2026-06-18 snapshot → well outside the 60d recent window.
    // Even with strong growth + a positive price move, no derived winner may fire.
    const snapshot = service.calculateSnapshot({
      stockId: 'stock-stale',
      symbol: 'STALE',
      region: 'US',
      assetType: 'STOCK',
      snapshotDate: new Date('2026-06-18T00:00:00.000Z'),
      dataThroughDate: null,
      fundamentals: [
        fundamental('2026-01-01', 130, 18, 1.8, {
          // No official date at all → DATE_TBA; nothing recent on the official path.
        }),
        fundamental('2025-01-01', 100, 10, 1),
      ],
      prices: [
        { symbol: 'STALE', timestamp: new Date('2026-02-10T00:00:00.000Z'), close: 100, adjustedClose: 100, volume: 1000 },
        { symbol: 'STALE', timestamp: new Date('2026-02-20T00:00:00.000Z'), close: 110, adjustedClose: 110, volume: 1200 },
      ],
      deliverySnapshots: [],
    });

    expect(snapshot.categories).not.toContain('RESULT_WINNERS');
    expect(snapshot.categories).not.toContain('RESULT_DISAPPOINTMENTS');
    expect(snapshot.reasonTags).not.toContain('RECENT_RESULT_ESTIMATED_FROM_PERIOD_CADENCE');
  });

  // ── 5. Derived DISAPPOINTMENT (mirror of #1, completeness) ───────────────────
  it('US: a sharp revenue/EPS decline in the last reported quarter populates RESULT_DISAPPOINTMENTS via the derived date', () => {
    const service = new EarningsIntelligenceService({} as any);
    const snapshot = service.calculateSnapshot({
      stockId: 'stock-dis',
      symbol: 'DISP',
      region: 'US',
      assetType: 'STOCK',
      snapshotDate: new Date('2026-06-18T00:00:00.000Z'),
      dataThroughDate: null,
      fundamentals: [
        fundamental('2026-04-01', 80, 4, 0.4, {
          officialResultDate: new Date('2026-07-15T00:00:00.000Z'),
        }),
        fundamental('2025-04-01', 100, 10, 1),
      ],
      prices: [],
      deliverySnapshots: [],
    });

    expect(snapshot.categories).toContain('RESULT_DISAPPOINTMENTS');
    expect(snapshot.reasonTags).toContain('RECENT_RESULT_ESTIMATED_FROM_PERIOD_CADENCE');
  });
});
