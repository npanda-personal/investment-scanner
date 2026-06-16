/// <reference types="@types/jest" />
/**
 * Unit tests for the SEC 13F rolling-window period model + zip-URL builder.
 * SEC moved off YYYYqQ to 3-month FILING windows (Mar–May/Jun–Aug/Sep–Nov/Dec–Feb).
 */
import {
  defaultMostRecent13fPeriod,
  parse13fPeriod,
  thirteenFZipUrl,
} from '../../../src/modules/market-data-foundation/ingestion/us/market-data-foundation.sec-13f.periods';

describe('defaultMostRecent13fPeriod', () => {
  it('mid-Jun 2026 → the just-completed Mar–May window', () => {
    const p = defaultMostRecent13fPeriod(new Date('2026-06-16T00:00:00Z'));
    expect(p.key).toBe('2026-05');
    expect(p.label).toBe('Mar–May 2026');
    expect(p.fileStem).toBe('01mar2026-31may2026');
  });

  it('mid-Feb 2026 → the previous Sep–Nov window (Dec–Feb not yet closed)', () => {
    const p = defaultMostRecent13fPeriod(new Date('2026-02-15T00:00:00Z'));
    expect(p.key).toBe('2025-11');
    expect(p.fileStem).toBe('01sep2025-30nov2025');
  });

  it('mid-Mar 2026 → the year-spanning Dec–Feb window (Feb-28 end day)', () => {
    const p = defaultMostRecent13fPeriod(new Date('2026-03-15T00:00:00Z'));
    expect(p.key).toBe('2026-02');
    expect(p.fileStem).toBe('01dec2025-28feb2026');
  });
});

describe('parse13fPeriod', () => {
  it('resolves a "YYYY-MM" window-end key', () => {
    expect(parse13fPeriod('2026-05')).toEqual({
      key: '2026-05',
      label: 'Mar–May 2026',
      fileStem: '01mar2026-31may2026',
    });
  });

  it('resolves a year-spanning Dec–Feb key', () => {
    const p = parse13fPeriod('2026-02');
    expect(p?.fileStem).toBe('01dec2025-28feb2026');
    expect(p?.key).toBe('2026-02');
  });

  it('accepts a full SEC file stem verbatim', () => {
    const p = parse13fPeriod('01jun2025-31aug2025');
    expect(p?.key).toBe('2025-08');
    expect(p?.fileStem).toBe('01jun2025-31aug2025');
  });

  it('accepts a legacy YYYYqQ dataset name', () => {
    const p = parse13fPeriod('2023q4');
    expect(p?.fileStem).toBe('2023q4');
    expect(p?.key).toBe('2023-12');
  });

  it('rejects a month that is not a valid 13F window end', () => {
    expect(parse13fPeriod('2026-04')).toBeNull(); // Apr is not a window end
    expect(parse13fPeriod('garbage')).toBeNull();
  });
});

describe('thirteenFZipUrl', () => {
  it('builds the structured-data-set zip URL from a period', () => {
    const p = parse13fPeriod('2026-05')!;
    expect(thirteenFZipUrl(p)).toBe(
      'https://www.sec.gov/files/structureddata/data/form-13f-data-sets/01mar2026-31may2026_form13f.zip',
    );
  });
});
