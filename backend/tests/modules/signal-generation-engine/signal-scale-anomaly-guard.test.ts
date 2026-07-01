/**
 * Phase C #7 — scale-anomaly guard on the fundamental-vote inputs.
 *
 * A single source-filing units/scale error (the TNTELE case: one QUARTERLY netIncome
 * ~1000x its own neighbours) must be dropped from the record set BEFORE it reaches the
 * vote layer, so it can't flip the margin/growth votes.  Locks:
 *   - the statistical (leave-one-out) detector removes the mis-scaled fiscal period;
 *   - clean history passes through untouched;
 *   - the live-TTM snapshot at index 0 is ALWAYS preserved (B1 invariant), even if it
 *     would itself statistically flag;
 *   - with the poisoned period removed, the downstream growth/margin-trend votes are
 *     computed from clean data.
 */
import { filterScaleAnomalousFundamentals } from '../../../src/modules/signal-generation-engine/signal-fundamentals-scale-guard';
import { evaluateFundamentals } from '../../../src/modules/signal-generation-engine/signal-scoring';
import { DEFAULT_SIGNAL_SCORING_CONFIG, type SignalScoringConfig } from '../../../src/modules/signal-generation-engine/signal-scoring.config';

const V4_CONFIG: SignalScoringConfig = { ...DEFAULT_SIGNAL_SCORING_CONFIG, scoringEngineVersion: 'v4' };

const day = 24 * 60 * 60 * 1000;
const qEnd = (i: number) => new Date(Date.UTC(2026, 2, 31) - i * 91 * day).toISOString();

// index 0 = live TTM snapshot; 1..8 = standalone quarters (snake_case serving shape).
const cleanQuarters = () => [
  { period_type: 'TTM', period_end_date: qEnd(0), revenue: 400, eps: 14, net_income: 60, pe_ratio: 15 },
  { period_type: 'QUARTERLY', period_end_date: qEnd(1), revenue: 100, eps: 14, net_income: 20, source: 'SEC_EDGAR' },
  { period_type: 'QUARTERLY', period_end_date: qEnd(2), revenue: 98, eps: 13, net_income: 19, source: 'SEC_EDGAR' },
  { period_type: 'QUARTERLY', period_end_date: qEnd(3), revenue: 96, eps: 12, net_income: 18, source: 'SEC_EDGAR' },
  { period_type: 'QUARTERLY', period_end_date: qEnd(4), revenue: 95, eps: 12, net_income: 18, source: 'SEC_EDGAR' },
  { period_type: 'QUARTERLY', period_end_date: qEnd(5), revenue: 94, eps: 11, net_income: 17, source: 'SEC_EDGAR' },
  { period_type: 'QUARTERLY', period_end_date: qEnd(6), revenue: 92, eps: 11, net_income: 17, source: 'SEC_EDGAR' },
];

describe('filterScaleAnomalousFundamentals — statistical guard (#7)', () => {
  it('drops a TNTELE-style ~1000x mis-scaled quarter and keeps every clean period', () => {
    const records = cleanQuarters();
    const poisonedDate = qEnd(3);
    records[3] = { ...records[3], net_income: 18000 }; // ~1000x the ~18 peer median

    // Non-curated symbol so ONLY the statistical (leave-one-out) detector is exercised — the real
    // curated TNTELE suppression list carries a 2024-12-31 period that collides with this fixture's
    // synthetic dates and would drop a second (legitimately curated) period.
    const result = filterScaleAnomalousFundamentals('IN', 'SCALEX', records);

    expect(result.droppedCount).toBe(1);
    expect(result.records.some((r: any) => r.period_end_date === poisonedDate && r.period_type === 'QUARTERLY')).toBe(false);
    // all other periods survive
    expect(result.records).toHaveLength(records.length - 1);
  });

  it('leaves clean history completely untouched (no false positives)', () => {
    const records = cleanQuarters();
    const result = filterScaleAnomalousFundamentals('IN', 'CLEANCO', records);
    expect(result.droppedCount).toBe(0);
    expect(result.records).toHaveLength(records.length);
    expect(result.records).toEqual(records);
  });

  it('preserves the live-TTM snapshot at index 0 (B1) even if it would statistically flag', () => {
    // Put an out-of-scale value AT index 0 among clean QUARTERLY peers; the guard must never
    // drop index 0 regardless of the detector.
    const records = [
      { period_type: 'QUARTERLY', period_end_date: qEnd(0), revenue: 100, eps: 14, net_income: 18000, source: 'SEC_EDGAR' },
      { period_type: 'QUARTERLY', period_end_date: qEnd(1), revenue: 100, eps: 14, net_income: 20, source: 'SEC_EDGAR' },
      { period_type: 'QUARTERLY', period_end_date: qEnd(2), revenue: 98, eps: 13, net_income: 19, source: 'SEC_EDGAR' },
      { period_type: 'QUARTERLY', period_end_date: qEnd(3), revenue: 96, eps: 12, net_income: 18, source: 'SEC_EDGAR' },
      { period_type: 'QUARTERLY', period_end_date: qEnd(4), revenue: 95, eps: 12, net_income: 18, source: 'SEC_EDGAR' },
    ];
    const result = filterScaleAnomalousFundamentals('IN', 'EDGE', records);
    expect(result.records[0]).toBe(records[0]); // index 0 survives untouched
  });

  it('is a safe no-op on empty / null inputs', () => {
    expect(filterScaleAnomalousFundamentals('IN', 'X', null).droppedCount).toBe(0);
    expect(filterScaleAnomalousFundamentals('IN', 'X', []).records).toEqual([]);
  });
});

describe('downstream: the poisoned quarter no longer feeds the vote layer (#7)', () => {
  it('drops the bogus MARGIN_CONTRACTION_YOY the scale-anomaly would otherwise fire', () => {
    // The margin-trend vote anchors on the latest fiscal quarter and its year-over-year
    // comparable (~365d earlier). Poison THAT comparable's net_income so the mis-scaled value
    // actually participates in the vote: without the guard the huge prior-margin makes the
    // latest quarter look like a massive margin contraction (a bogus MARGIN_CONTRACTION_YOY);
    // with the guard the poisoned period is dropped and that false vote never fires.
    const poisoned = cleanQuarters();
    const yoyComparableIndex = 5; // qEnd(5) ≈ one year before the latest quarter (qEnd(1))
    poisoned[yoyComparableIndex] = { ...poisoned[yoyComparableIndex], net_income: 18000 };
    const cleaned = filterScaleAnomalousFundamentals('IN', 'SCALEX', poisoned).records;

    const votesFor = (records: any[]) => {
      const ev = evaluateFundamentals(records[0], null, null, V4_CONFIG, records);
      return [...ev.signals, ...ev.negativeSignals].map((s) => s.code).sort();
    };

    const poisonedVotes = votesFor(poisoned);
    const cleanedVotes = votesFor(cleaned);

    // Without the guard the scale error fabricates a margin-contraction vote…
    expect(poisonedVotes).toContain('MARGIN_CONTRACTION_YOY');
    // …and the guard removes it (and the mis-scaled period no longer feeds any vote).
    expect(cleanedVotes).not.toContain('MARGIN_CONTRACTION_YOY');
    expect(cleanedVotes).not.toEqual(poisonedVotes);
  });
});
