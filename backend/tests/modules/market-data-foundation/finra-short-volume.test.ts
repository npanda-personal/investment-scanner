/// <reference types="@types/jest" />
import {
  parseFinraShortVolumeFile,
  computeShortVolumePct,
  isUsTradingDay,
  previousTradingDay,
  tradingDaysEndingAt,
} from '../../../src/modules/market-data-foundation/ingestion/us/market-data-foundation.finra-short-volume.service';

// ---------------------------------------------------------------------------
// Pure parser + helper coverage (no network, no DB).
//
// FINRA Reg SHO daily file: pipe-delimited, header line, fractional
// consolidated volumes, trailing footer summary line, and div-0 totals.
// ---------------------------------------------------------------------------

const HEADER = 'Date|Symbol|ShortVolume|ShortExemptVolume|TotalVolume|Market';

describe('parseFinraShortVolumeFile', () => {
  it('parses pipe-delimited rows, skips header + footer, computes pct', () => {
    const body = [
      HEADER,
      '20260616|AAPL|1000|0|4000|Q', // 25%
      '20260616|MSFT|600.5|10|2000|N', // fractional short volume → 30.025%
      '20260616|Records: 2', // trailing footer summary line (skip)
    ].join('\n');

    const rows = parseFinraShortVolumeFile(body);
    expect(rows).toHaveLength(2);

    expect(rows[0]).toMatchObject({
      tradingDate: '2026-06-16',
      symbol: 'AAPL',
      shortVolume: 1000,
      shortExemptVolume: 0,
      totalVolume: 4000,
      shortVolumePct: 25,
      market: 'Q',
    });

    // Fractional consolidated volume is preserved, not truncated.
    expect(rows[1].symbol).toBe('MSFT');
    expect(rows[1].shortVolume).toBeCloseTo(600.5, 4);
    expect(rows[1].shortVolumePct).toBeCloseTo(30.025, 4);
  });

  it('guards divide-by-zero total volume (pct → null, row still kept)', () => {
    const body = [HEADER, '20260616|ZERO|0|0|0|Q'].join('\n');
    const rows = parseFinraShortVolumeFile(body);
    expect(rows).toHaveLength(1);
    expect(rows[0].symbol).toBe('ZERO');
    expect(rows[0].shortVolumePct).toBeNull();
  });

  it('handles CRLF line endings and blank lines', () => {
    const body = [HEADER, '20260616|AAPL|1000|0|4000|Q', '', '   '].join('\r\n');
    const rows = parseFinraShortVolumeFile(body);
    expect(rows).toHaveLength(1);
    expect(rows[0].symbol).toBe('AAPL');
  });

  it('restricts to the allowed (tracked) symbol set when provided', () => {
    const body = [
      HEADER,
      '20260616|AAPL|1000|0|4000|Q',
      '20260616|FOO|10|0|100|N', // not tracked
      '20260616|MSFT|500|0|1000|N',
    ].join('\n');
    const rows = parseFinraShortVolumeFile(body, new Set(['AAPL', 'MSFT']));
    expect(rows.map((r) => r.symbol).sort()).toEqual(['AAPL', 'MSFT']);
  });
});

describe('computeShortVolumePct', () => {
  it('returns rounded percentage for positive total', () => {
    expect(computeShortVolumePct(1, 3)).toBeCloseTo(33.3333, 4);
  });
  it('returns null for zero / negative / non-finite total', () => {
    expect(computeShortVolumePct(100, 0)).toBeNull();
    expect(computeShortVolumePct(100, -5)).toBeNull();
    expect(computeShortVolumePct(100, Number.NaN)).toBeNull();
  });
});

describe('trading-day helpers', () => {
  it('treats weekends and NYSE holidays as non-trading days', () => {
    expect(isUsTradingDay('2026-06-16')).toBe(true); // Tue
    expect(isUsTradingDay('2026-06-20')).toBe(false); // Sat
    expect(isUsTradingDay('2026-06-21')).toBe(false); // Sun
    expect(isUsTradingDay('2026-06-19')).toBe(false); // Juneteenth (holiday)
  });

  it('previousTradingDay skips weekends', () => {
    // Monday 2026-06-15 → previous trading day is Friday 2026-06-12.
    expect(previousTradingDay('2026-06-15')).toBe('2026-06-12');
  });

  it('tradingDaysEndingAt returns N trading days oldest-first', () => {
    const days = tradingDaysEndingAt('2026-06-17', 3); // Wed
    expect(days).toEqual(['2026-06-15', '2026-06-16', '2026-06-17']);
  });
});
