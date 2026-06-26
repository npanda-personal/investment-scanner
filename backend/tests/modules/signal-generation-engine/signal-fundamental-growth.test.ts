/**
 * Phase 1 fundamental YoY growth — pure-unit tests.
 *
 * Locks the CRITICAL correctness property: yoyComparable matches the same-periodType
 * record ~1 year earlier (QUARTERLY → 4 quarters back, NOT the prior quarter records[1];
 * ANNUAL → prior annual), returns null outside the tolerance window, and the vote
 * thresholds fire / stay silent exactly as specified.
 */
import {
  yoyComparable,
  latestFiscalRecord,
  fundamentalGrowthVotes,
  fundamentalMarginTrendVotes,
  fundamentalPeHistoryVotes,
} from '../../../src/modules/signal-generation-engine/signal-fundamental-growth';

/**
 * Build a record using the runtime snake_case shape from formatFundamentalsResponse:
 * period_type, period_end_date (ISO string), revenue, eps.
 */
const anchor = new Date('2026-03-31T00:00:00.000Z');
const daysAgo = (d: number) => new Date(anchor.getTime() - d * 24 * 60 * 60 * 1000);

const rec = (
  period_type: 'QUARTERLY' | 'ANNUAL',
  daysBeforeAnchor: number,
  fields: { revenue?: number | null; eps?: number | null; net_income?: number | null; pe_ratio?: number | null } = {},
) => ({
  period_type,
  period_end_date: daysAgo(daysBeforeAnchor).toISOString(),
  revenue: fields.revenue ?? null,
  eps: fields.eps ?? null,
  net_income: fields.net_income ?? null,
  pe_ratio: fields.pe_ratio ?? null,
});

describe('yoyComparable — same-periodType, ~1yr-prior matcher', () => {
  it('QUARTERLY: picks the quarter ~4 quarters back, NOT the immediately-prior quarter (records[1])', () => {
    // DESC by periodEndDate: latest (Q0), Q-1, Q-2, Q-3, Q-4 (~365d back)
    const q0 = rec('QUARTERLY', 0);
    const records = [
      q0,
      rec('QUARTERLY', 91),  // prior quarter — must NOT be chosen
      rec('QUARTERLY', 182),
      rec('QUARTERLY', 273),
      rec('QUARTERLY', 365), // YoY comparable
    ];
    const match = yoyComparable(records, q0);
    expect(match).toBe(records[4]);
    expect(match).not.toBe(records[1]); // not the seasonally-noisy prior quarter
  });

  it('ANNUAL: picks the prior annual record', () => {
    const a0 = rec('ANNUAL', 0);
    const records = [a0, rec('ANNUAL', 366), rec('ANNUAL', 731)];
    expect(yoyComparable(records, a0)).toBe(records[1]);
  });

  it('does not cross period types (a QUARTERLY latest ignores ANNUAL records ~1yr back)', () => {
    const q0 = rec('QUARTERLY', 0);
    const records = [q0, rec('ANNUAL', 365), rec('QUARTERLY', 91)];
    expect(yoyComparable(records, q0)).toBeNull();
  });

  it('returns null when nothing falls in the [300,430]d tolerance window', () => {
    const q0 = rec('QUARTERLY', 0);
    // only a too-recent (91d) and a too-old (550d) candidate exist
    const records = [q0, rec('QUARTERLY', 91), rec('QUARTERLY', 550)];
    expect(yoyComparable(records, q0)).toBeNull();
  });

  it('accepts the window edges (300d and 430d) and picks the one closest to 365d', () => {
    const q0 = rec('QUARTERLY', 0);
    const near = rec('QUARTERLY', 360); // closest to 365
    const records = [q0, rec('QUARTERLY', 300), near, rec('QUARTERLY', 430)];
    expect(yoyComparable(records, q0)).toBe(near);
  });

  it('returns null on empty / missing latest end-date', () => {
    expect(yoyComparable([], rec('ANNUAL', 0))).toBeNull();
    const records: Array<{ period_type: string; period_end_date: string | null }> = [rec('ANNUAL', 365)];
    expect(yoyComparable(records, { period_type: 'ANNUAL', period_end_date: null })).toBeNull();
  });
});

describe('fundamentalGrowthVotes — revenue/EPS YoY thresholds', () => {
  const yoyPair = (latestFields: any, priorFields: any) => {
    const latest = rec('QUARTERLY', 0, latestFields);
    const prior = rec('QUARTERLY', 365, priorFields);
    return { latest, records: [latest, rec('QUARTERLY', 91, {}), prior] };
  };

  it('fires REVENUE_GROWTH_YOY at ≥+10% and EPS_GROWTH_YOY at ≥+15%', () => {
    const { records } = yoyPair({ revenue: 110, eps: 1.2 }, { revenue: 100, eps: 1.0 });
    const { signals, negativeSignals } = fundamentalGrowthVotes(records);
    expect(signals.map((s) => s.code)).toEqual(expect.arrayContaining(['REVENUE_GROWTH_YOY', 'EPS_GROWTH_YOY']));
    expect(negativeSignals).toHaveLength(0);
    expect(signals.find((s) => s.code === 'REVENUE_GROWTH_YOY')?.label).toContain('10.0%');
    expect(signals.every((s) => s.category === 'FUNDAMENTAL')).toBe(true);
  });

  it('fires REVENUE_DECLINE_YOY at ≤−10% and EPS_DECLINE_YOY at ≤−20%', () => {
    const { records } = yoyPair({ revenue: 90, eps: 0.75 }, { revenue: 100, eps: 1.0 });
    const { signals, negativeSignals } = fundamentalGrowthVotes(records);
    expect(signals).toHaveLength(0);
    expect(negativeSignals.map((s) => s.code)).toEqual(
      expect.arrayContaining(['REVENUE_DECLINE_YOY', 'EPS_DECLINE_YOY']),
    );
  });

  it('stays silent in the neutral band (small +/- moves)', () => {
    const { records } = yoyPair({ revenue: 105, eps: 1.05 }, { revenue: 100, eps: 1.0 });
    const { signals, negativeSignals } = fundamentalGrowthVotes(records);
    expect(signals).toHaveLength(0);
    expect(negativeSignals).toHaveLength(0);
  });

  it('skips EPS growth when prior EPS ≤ 0 (ratio is sign-meaningless) but still votes revenue', () => {
    const { records } = yoyPair({ revenue: 130, eps: 2.0 }, { revenue: 100, eps: -0.5 });
    const { signals, negativeSignals } = fundamentalGrowthVotes(records);
    expect(signals.map((s) => s.code)).toContain('REVENUE_GROWTH_YOY');
    expect(signals.some((s) => s.code.startsWith('EPS'))).toBe(false);
    expect(negativeSignals.some((s) => s.code.startsWith('EPS'))).toBe(false);
  });

  it('handles missing revenue/eps gracefully (skips the missing metric)', () => {
    const { records } = yoyPair({ revenue: 130, eps: null }, { revenue: 100, eps: 1.0 });
    const { signals } = fundamentalGrowthVotes(records);
    expect(signals.map((s) => s.code)).toEqual(['REVENUE_GROWTH_YOY']);
  });

  it('returns no votes when there is no YoY comparable in the window', () => {
    const latest = rec('QUARTERLY', 0, { revenue: 200, eps: 5 });
    const records = [latest, rec('QUARTERLY', 91, { revenue: 100, eps: 1 })]; // only prior quarter
    const { signals, negativeSignals } = fundamentalGrowthVotes(records);
    expect(signals).toHaveLength(0);
    expect(negativeSignals).toHaveLength(0);
  });
});

describe('fundamentalMarginTrendVotes — net margin expansion/contraction YoY', () => {
  const marginPair = (latestFields: any, priorFields: any) => {
    const latest = rec('QUARTERLY', 0, latestFields);
    const prior = rec('QUARTERLY', 365, priorFields);
    return { latest, records: [latest, rec('QUARTERLY', 91), prior] };
  };

  it('fires MARGIN_EXPANSION_YOY when margin expands ≥3pp', () => {
    const { records } = marginPair(
      { revenue: 100, net_income: 15 },
      { revenue: 100, net_income: 10 },
    );
    const { signals, negativeSignals } = fundamentalMarginTrendVotes(records);
    expect(signals).toHaveLength(1);
    expect(signals[0].code).toBe('MARGIN_EXPANSION_YOY');
    expect(signals[0].label).toContain('5.0pp');
    expect(signals[0].category).toBe('FUNDAMENTAL');
    expect(negativeSignals).toHaveLength(0);
  });

  it('fires MARGIN_CONTRACTION_YOY when margin contracts ≥3pp', () => {
    const { records } = marginPair(
      { revenue: 100, net_income: 5 },
      { revenue: 100, net_income: 12 },
    );
    const { signals, negativeSignals } = fundamentalMarginTrendVotes(records);
    expect(signals).toHaveLength(0);
    expect(negativeSignals).toHaveLength(1);
    expect(negativeSignals[0].code).toBe('MARGIN_CONTRACTION_YOY');
  });

  it('stays silent in the neutral band (<3pp change)', () => {
    const { records } = marginPair(
      { revenue: 100, net_income: 11 },
      { revenue: 100, net_income: 10 },
    );
    const { signals, negativeSignals } = fundamentalMarginTrendVotes(records);
    expect(signals).toHaveLength(0);
    expect(negativeSignals).toHaveLength(0);
  });

  it('skips when revenue is zero or negative', () => {
    const { records } = marginPair(
      { revenue: 0, net_income: 5 },
      { revenue: 100, net_income: 10 },
    );
    const { signals, negativeSignals } = fundamentalMarginTrendVotes(records);
    expect(signals).toHaveLength(0);
    expect(negativeSignals).toHaveLength(0);
  });

  it('skips when net_income is null on either side', () => {
    const { records } = marginPair(
      { revenue: 100, net_income: null },
      { revenue: 100, net_income: 10 },
    );
    const { signals, negativeSignals } = fundamentalMarginTrendVotes(records);
    expect(signals).toHaveLength(0);
    expect(negativeSignals).toHaveLength(0);
  });
});

describe('fundamentalPeHistoryVotes — PE vs own historical median', () => {
  it('fires PE_BELOW_OWN_HISTORY when current PE is ≥20% below median', () => {
    const latest = rec('QUARTERLY', 0, { pe_ratio: 8 });
    const records = [
      latest,
      rec('QUARTERLY', 91, { pe_ratio: 15 }),
      rec('QUARTERLY', 182, { pe_ratio: 14 }),
      rec('QUARTERLY', 273, { pe_ratio: 16 }),
    ];
    const { signals, negativeSignals } = fundamentalPeHistoryVotes(latest, records);
    expect(signals).toHaveLength(1);
    expect(signals[0].code).toBe('PE_BELOW_OWN_HISTORY');
    expect(signals[0].category).toBe('FUNDAMENTAL');
    expect(negativeSignals).toHaveLength(0);
  });

  it('fires PE_ABOVE_OWN_HISTORY when current PE is ≥40% above median', () => {
    const latest = rec('QUARTERLY', 0, { pe_ratio: 30 });
    const records = [
      latest,
      rec('QUARTERLY', 91, { pe_ratio: 15 }),
      rec('QUARTERLY', 182, { pe_ratio: 14 }),
      rec('QUARTERLY', 273, { pe_ratio: 16 }),
    ];
    const { signals, negativeSignals } = fundamentalPeHistoryVotes(latest, records);
    expect(signals).toHaveLength(0);
    expect(negativeSignals).toHaveLength(1);
    expect(negativeSignals[0].code).toBe('PE_ABOVE_OWN_HISTORY');
  });

  it('stays silent when PE is near the median', () => {
    const latest = rec('QUARTERLY', 0, { pe_ratio: 15 });
    const records = [
      latest,
      rec('QUARTERLY', 91, { pe_ratio: 14 }),
      rec('QUARTERLY', 182, { pe_ratio: 16 }),
      rec('QUARTERLY', 273, { pe_ratio: 15 }),
    ];
    const { signals, negativeSignals } = fundamentalPeHistoryVotes(latest, records);
    expect(signals).toHaveLength(0);
    expect(negativeSignals).toHaveLength(0);
  });

  it('requires at least 2 valid PE values (skips with fewer)', () => {
    const latest = rec('QUARTERLY', 0, { pe_ratio: 5 });
    const records = [latest, rec('QUARTERLY', 91, { pe_ratio: 20 })];
    const { signals, negativeSignals } = fundamentalPeHistoryVotes(latest, records);
    expect(signals).toHaveLength(0);
    expect(negativeSignals).toHaveLength(0);
  });

  it('fires PE_BELOW_OWN_HISTORY with exactly 2 valid historical PEs', () => {
    const latest = rec('QUARTERLY', 0, { pe_ratio: 8 });
    const records = [
      latest,
      rec('QUARTERLY', 91, { pe_ratio: 15 }),
      rec('QUARTERLY', 182, { pe_ratio: 14 }),
    ];
    const { signals } = fundamentalPeHistoryVotes(latest, records);
    expect(signals).toHaveLength(1);
    expect(signals[0].code).toBe('PE_BELOW_OWN_HISTORY');
  });

  it('ignores zero/negative PE values when computing median', () => {
    const latest = rec('QUARTERLY', 0, { pe_ratio: 8 });
    const records = [
      latest,
      rec('QUARTERLY', 91, { pe_ratio: -5 }),
      rec('QUARTERLY', 182, { pe_ratio: 0 }),
      rec('QUARTERLY', 273, { pe_ratio: 15 }),
      rec('QUARTERLY', 365, { pe_ratio: 14 }),
      rec('QUARTERLY', 456, { pe_ratio: 16 }),
    ];
    const { signals } = fundamentalPeHistoryVotes(latest, records);
    expect(signals).toHaveLength(1);
    expect(signals[0].code).toBe('PE_BELOW_OWN_HISTORY');
  });

  it('skips when current PE is null or ≤0', () => {
    const latest = rec('QUARTERLY', 0, { pe_ratio: -3 });
    const records = [
      latest,
      rec('QUARTERLY', 91, { pe_ratio: 15 }),
      rec('QUARTERLY', 182, { pe_ratio: 14 }),
      rec('QUARTERLY', 273, { pe_ratio: 16 }),
    ];
    const { signals, negativeSignals } = fundamentalPeHistoryVotes(latest, records);
    expect(signals).toHaveLength(0);
    expect(negativeSignals).toHaveLength(0);
  });
});

/**
 * Regression coverage for the US fix: US/EU fundamentals carry a TTM snapshot dated
 * ~today as the newest record, with ANNUAL fiscal history behind it. The YoY votes
 * MUST anchor on the latest ANNUAL (fiscal) record and ignore the shadowing TTM,
 * otherwise the GROWTH setup tab can never populate for those regions.
 */
describe('fiscal-only YoY anchoring (US/EU TTM-shadowing regression)', () => {
  // Mixed-period record builder including TTM (the US/EU runtime shape).
  const mrec = (
    period_type: 'TTM' | 'ANNUAL' | 'QUARTERLY',
    daysBeforeAnchor: number,
    fields: { revenue?: number | null; eps?: number | null; net_income?: number | null } = {},
  ) => ({
    period_type,
    period_end_date: daysAgo(daysBeforeAnchor).toISOString(),
    revenue: fields.revenue ?? null,
    eps: fields.eps ?? null,
    net_income: fields.net_income ?? null,
    pe_ratio: null,
  });

  it('latestFiscalRecord ignores TTM and returns the newest ANNUAL record', () => {
    const ttm = mrec('TTM', 0, { revenue: 999 });
    const fy2025 = mrec('ANNUAL', 30, { revenue: 130 });
    const fy2024 = mrec('ANNUAL', 395, { revenue: 100 });
    const records = [ttm, fy2025, fy2024]; // DESC by date, TTM newest
    expect(latestFiscalRecord(records)).toBe(fy2025);
  });

  it('latestFiscalRecord returns null when only TTM snapshots exist (pre-backfill US/EU)', () => {
    expect(latestFiscalRecord([mrec('TTM', 0, { revenue: 500 })])).toBeNull();
  });

  it('fires REVENUE_GROWTH_YOY off ANNUAL history even when a TTM row is the newest record', () => {
    const records = [
      mrec('TTM', 0, { revenue: 9999, eps: 99 }), // shadowing TTM dated today — must be ignored
      mrec('ANNUAL', 30, { revenue: 130, eps: 1.4 }),
      mrec('ANNUAL', 395, { revenue: 100, eps: 1.0 }), // YoY comparable (~365d before the FY anchor)
    ];
    const { signals, negativeSignals } = fundamentalGrowthVotes(records);
    expect(signals.map((s) => s.code)).toEqual(
      expect.arrayContaining(['REVENUE_GROWTH_YOY', 'EPS_GROWTH_YOY']),
    );
    expect(negativeSignals).toHaveLength(0);
  });

  it('fires MARGIN_EXPANSION_YOY off ANNUAL history despite a shadowing TTM row', () => {
    const records = [
      mrec('TTM', 0, { revenue: 9999, net_income: 9999 }), // ignored
      mrec('ANNUAL', 30, { revenue: 100, net_income: 15 }),
      mrec('ANNUAL', 395, { revenue: 100, net_income: 10 }),
    ];
    const { signals } = fundamentalMarginTrendVotes(records);
    expect(signals.map((s) => s.code)).toContain('MARGIN_EXPANSION_YOY');
  });

  it('stays silent for TTM-only stocks (US/EU before ANNUAL backfill, EU permanently)', () => {
    const records = [
      mrec('TTM', 0, { revenue: 130, eps: 1.4, net_income: 20 }),
      mrec('TTM', 365, { revenue: 100, eps: 1.0, net_income: 10 }), // same rolling window, not a fiscal YoY pair
    ];
    expect(fundamentalGrowthVotes(records).signals).toHaveLength(0);
    expect(fundamentalGrowthVotes(records).negativeSignals).toHaveLength(0);
    expect(fundamentalMarginTrendVotes(records).signals).toHaveLength(0);
  });
});
