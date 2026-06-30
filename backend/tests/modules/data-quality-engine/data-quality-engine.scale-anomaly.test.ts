/// <reference types="@types/jest" />
import {
  detectFundamentalScaleAnomalies,
  formatScaleAnomalyWarning,
  DEFAULT_SCALE_ANOMALY_CONFIG,
  type FundamentalScaleAnomaly,
} from '../../../src/modules/data-quality-engine/data-quality-engine.scale-anomaly';
import { DataQualityEngineService } from '../../../src/modules/data-quality-engine';

// ── Fixture builders ─────────────────────────────────────────────────────────

/** A quarterly fundamentals record in the DQE serving (snake_case) shape. */
const quarter = (
  yyyy: number,
  mm: number,
  fields: { revenue?: number | null; net_income?: number | null; eps?: number | null },
  extra: Record<string, any> = {},
) => ({
  period_type: 'QUARTERLY',
  period_end_date: new Date(Date.UTC(yyyy, mm - 1, 28)).toISOString(),
  revenue: fields.revenue ?? null,
  net_income: fields.net_income ?? null,
  eps: fields.eps ?? null,
  source: 'NSE',
  ...extra,
});

/**
 * The canonical TNTELE positive case: a long run of ~-36M quarterly losses with
 * ONE quarter mis-scaled to ~-34.6B (the real NSE source-data error). Other
 * periodTypes (FourD year-to-date, ANNUAL) are intentionally present at their
 * own scales to prove they do not contaminate the quarterly comparison.
 */
const tnteleRecords = () => [
  quarter(2025, 12, { net_income: -34_634_800_000 }), // the mis-scaled quarter
  quarter(2025, 9, { net_income: -36_868_000 }),
  quarter(2025, 6, { net_income: -35_500_000 }),
  quarter(2025, 3, { net_income: -37_100_000 }),
  quarter(2024, 12, { net_income: -34_900_000 }),
  quarter(2024, 9, { net_income: -36_200_000 }),
  quarter(2024, 6, { net_income: -35_900_000 }),
  // Different periodTypes at their own legitimate scales — must be ignored when
  // judging the QUARTERLY values.
  { period_type: 'FourD', period_end_date: new Date(Date.UTC(2025, 11, 28)).toISOString(), net_income: -112_032_600_000, source: 'NSE' },
  { period_type: 'ANNUAL', period_end_date: new Date(Date.UTC(2025, 2, 28)).toISOString(), net_income: -148_898_000, source: 'NSE' },
];

/**
 * A genuinely large company: consistently large values across every quarter.
 * No single period is orders-of-magnitude out of line, so nothing must flag.
 */
const largeCompanyRecords = () =>
  Array.from({ length: 8 }).map((_, i) =>
    quarter(2024 - Math.floor(i / 4), 12 - (i % 4) * 3, {
      revenue: 2_400_000_000_000 + i * 5_000_000_000,
      net_income: 180_000_000_000 + i * 1_000_000_000,
      eps: 95 + i,
    }),
  );

// ── Detector unit tests ──────────────────────────────────────────────────────

describe('detectFundamentalScaleAnomalies', () => {
  it('flags the TNTELE ~1000x mis-scaled quarter (canonical positive case)', () => {
    const findings = detectFundamentalScaleAnomalies(tnteleRecords());

    const netIncome = findings.filter((f) => f.field === 'netIncome');
    expect(netIncome).toHaveLength(1);

    const flagged = netIncome[0];
    expect(flagged.periodType).toBe('QUARTERLY');
    expect(flagged.periodEndDate).toBe('2025-12-28');
    expect(flagged.value).toBe(-34_634_800_000);
    expect(flagged.ratio).toBeGreaterThan(100);
    expect(flagged.ratio).toBeGreaterThan(900); // ~960x in practice
    expect(flagged.reasonCode).toBe('FUNDAMENTAL_SCALE_ANOMALY');
    // Baseline built only from the seven OTHER quarters, never the outlier itself
    // nor the FourD/ANNUAL periods.
    expect(flagged.peerCount).toBe(6);
    expect(flagged.peerMedianMagnitude).toBeLessThan(40_000_000);
  });

  it('does NOT flag a genuinely large company with consistent values (negative case)', () => {
    const findings = detectFundamentalScaleAnomalies(largeCompanyRecords());
    expect(findings).toHaveLength(0);
  });

  it('does not compare across periodTypes (FourD/ANNUAL never judged vs QUARTERLY)', () => {
    const findings = detectFundamentalScaleAnomalies(tnteleRecords());
    expect(findings.every((f) => f.periodType === 'QUARTERLY')).toBe(true);
  });

  it('leaves shallow coverage unjudged (below minPeerPeriods)', () => {
    // 3 records → only 2 peers per candidate, below the default minPeerPeriods (3).
    const records = [
      quarter(2025, 12, { net_income: -34_000_000_000 }),
      quarter(2025, 9, { net_income: -36_000_000 }),
      quarter(2025, 6, { net_income: -35_000_000 }),
    ];
    expect(detectFundamentalScaleAnomalies(records)).toHaveLength(0);
  });

  it('does not flag when the neighbour baseline magnitude is zero', () => {
    const records = [
      quarter(2025, 12, { revenue: 5_000_000_000 }),
      quarter(2025, 9, { revenue: 0 }),
      quarter(2025, 6, { revenue: 0 }),
      quarter(2025, 3, { revenue: 0 }),
      quarter(2024, 12, { revenue: 0 }),
    ];
    expect(detectFundamentalScaleAnomalies(records)).toHaveLength(0);
  });

  it('flags revenue and eps independently when each has its own outlier', () => {
    const records = [
      quarter(2025, 12, { revenue: 1_000_000, eps: 12 }),
      quarter(2025, 9, { revenue: 1_050_000, eps: 11 }),
      quarter(2025, 6, { revenue: 980_000, eps: 13 }),
      quarter(2025, 3, { revenue: 1_020_000, eps: 12 }),
      quarter(2024, 12, { revenue: 1_010_000, eps: 12 }),
      // Outliers: revenue 200x, eps 100x+
      quarter(2024, 9, { revenue: 210_000_000, eps: 1_400 }),
    ];
    const findings = detectFundamentalScaleAnomalies(records);
    const fields = findings.map((f) => f.field).sort();
    expect(fields).toEqual(['eps', 'revenue']);
  });

  it('tolerates camelCase records and null/undefined value fields', () => {
    const records = [
      { periodType: 'QUARTERLY', periodEndDate: new Date(Date.UTC(2025, 11, 28)), netIncome: -34_000_000_000 },
      { periodType: 'QUARTERLY', periodEndDate: new Date(Date.UTC(2025, 8, 28)), netIncome: -36_000_000 },
      { periodType: 'QUARTERLY', periodEndDate: new Date(Date.UTC(2025, 5, 28)), netIncome: -35_000_000 },
      { periodType: 'QUARTERLY', periodEndDate: new Date(Date.UTC(2025, 2, 28)), netIncome: -37_000_000 },
      { periodType: 'QUARTERLY', periodEndDate: new Date(Date.UTC(2024, 11, 28)), netIncome: -34_500_000 },
      { periodType: 'QUARTERLY', periodEndDate: new Date(Date.UTC(2024, 8, 28)), netIncome: null },
    ];
    const findings = detectFundamentalScaleAnomalies(records);
    expect(findings).toHaveLength(1);
    expect(findings[0].field).toBe('netIncome');
  });

  it('returns no findings for empty or non-array input', () => {
    expect(detectFundamentalScaleAnomalies([])).toEqual([]);
    expect(detectFundamentalScaleAnomalies(undefined as any)).toEqual([]);
  });

  it('separates consolidated vs standalone only when the flag is uniformly present', () => {
    // Standalone quarters are small; one consolidated quarter is legitimately
    // larger. With the flag uniformly present, they are judged in separate
    // groups, so the lone consolidated row is not flagged against standalone peers
    // (and on its own has too few peers to judge).
    const records = [
      quarter(2025, 12, { revenue: 1_000_000 }, { is_consolidated: false }),
      quarter(2025, 9, { revenue: 1_050_000 }, { is_consolidated: false }),
      quarter(2025, 6, { revenue: 980_000 }, { is_consolidated: false }),
      quarter(2025, 3, { revenue: 1_020_000 }, { is_consolidated: false }),
      quarter(2024, 12, { revenue: 300_000_000 }, { is_consolidated: true }),
    ];
    expect(detectFundamentalScaleAnomalies(records)).toHaveLength(0);
  });

  it('falls back to one group per periodType when the qualifier is mixed/null', () => {
    // Same shape but the consolidated outlier has a NULL flag → cannot reliably
    // separate, so it is compared against the standalone quarters and flagged.
    const records = [
      quarter(2025, 12, { revenue: 1_000_000 }, { is_consolidated: false }),
      quarter(2025, 9, { revenue: 1_050_000 }, { is_consolidated: false }),
      quarter(2025, 6, { revenue: 980_000 }, { is_consolidated: false }),
      quarter(2025, 3, { revenue: 1_020_000 }, { is_consolidated: false }),
      quarter(2024, 12, { revenue: 300_000_000 }, { is_consolidated: null }),
    ];
    const findings = detectFundamentalScaleAnomalies(records);
    expect(findings).toHaveLength(1);
    expect(findings[0].field).toBe('revenue');
  });

  it('respects an overridden ratio threshold', () => {
    const records = [
      quarter(2025, 12, { revenue: 50_000_000 }), // 50x the ~1M baseline
      quarter(2025, 9, { revenue: 1_050_000 }),
      quarter(2025, 6, { revenue: 980_000 }),
      quarter(2025, 3, { revenue: 1_020_000 }),
      quarter(2024, 12, { revenue: 1_010_000 }),
    ];
    // Default 100x → no flag.
    expect(detectFundamentalScaleAnomalies(records)).toHaveLength(0);
    // Lower the bar to 25x → flagged.
    const findings = detectFundamentalScaleAnomalies(records, {
      ...DEFAULT_SCALE_ANOMALY_CONFIG,
      ratioThreshold: 25,
    });
    expect(findings).toHaveLength(1);
  });
});

describe('formatScaleAnomalyWarning', () => {
  it('produces a non-destructive, research-support warning string', () => {
    const anomaly: FundamentalScaleAnomaly = {
      field: 'netIncome',
      periodType: 'QUARTERLY',
      periodEndDate: '2025-12-28',
      value: -34_634_800_000,
      magnitude: 34_634_800_000,
      peerCount: 6,
      peerMedianMagnitude: 35_900_000,
      ratio: 964.8,
      robustZ: Infinity,
      source: 'NSE',
      reasonCode: 'FUNDAMENTAL_SCALE_ANOMALY',
    };
    const message = formatScaleAnomalyWarning(anomaly);
    expect(message).toContain('QUARTERLY netIncome');
    expect(message).toContain('2025-12-28');
    expect(message).toContain('value retained unchanged');
    expect(message).toContain('possible source-filing units/scale error');
    // Research-support language only — no advice / verdict wording.
    expect(message).not.toMatch(/buy|sell|guaranteed|price target/i);
  });
});

// ── Integration: surfaces as a DQE evaluation warning (non-destructive) ───────

describe('DataQualityEngineService.evaluateInstrument — scale-anomaly warning', () => {
  const service = new DataQualityEngineService();
  const DAY_MS = 86_400_000;
  const instrument = {
    id: 'in-stock-tntele',
    symbol: 'TNTELE',
    sector: 'Communication',
    industry: 'Telecom',
    country: 'IN',
    currency: 'INR',
    assetType: 'STOCK',
  };
  const prices = Array.from({ length: 260 }).map((_, i) => ({
    date: new Date(Date.now() - i * DAY_MS).toISOString(),
    close: 100 - i * 0.01,
    adjusted_close: 100 - i * 0.01,
    volume: 1_000_000,
  }));

  it('adds a scale-anomaly warning without mutating the fundamentals values', () => {
    const fundamentals = tnteleRecords();
    const before = fundamentals.map((r) => r.net_income);

    const result = service.evaluateInstrument(instrument, prices, prices[0], fundamentals, [], false);

    expect(result.warnings.some((w) => w.includes('Fundamentals scale anomaly'))).toBe(true);
    // Non-destructive: the stored values are untouched.
    expect(fundamentals.map((r) => r.net_income)).toEqual(before);
  });

  it('adds no scale-anomaly warning for a consistent large company', () => {
    const result = service.evaluateInstrument(instrument, prices, prices[0], largeCompanyRecords(), [], false);
    expect(result.warnings.some((w) => w.includes('Fundamentals scale anomaly'))).toBe(false);
  });
});
