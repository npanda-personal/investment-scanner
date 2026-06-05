/// <reference types="@types/jest" />
import fs from 'fs';
import path from 'path';
import {
  parseNseExDate,
  parseNseSubject,
  parseNseCorporateActions,
  parseNseCorporateActionRow,
  buildCorporateActionNaturalKey,
  importNseCorporateActions,
  buildNseCorporateActionsUrl,
  NSE_CORPORATE_ACTIONS_SOURCE,
  NSE_CORPORATE_ACTIONS_ENDPOINT,
  type NseCorporateActionRow,
  type CorporateActionDbInput,
  type ParsedCorporateAction,
} from '../../../src/modules/market-data-foundation/market-data-foundation.corporate-actions-source';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Shorthand for a UTC-midnight Date from an ISO YYYY-MM-DD string. */
const d = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

/** Build a minimal NseCorporateActionRow from the required fields. */
const row = (symbol: string, subject: string, exDate: string): NseCorporateActionRow => ({
  symbol,
  series: 'EQ',
  subject,
  exDate,
  faceVal: '10',
  ind: '-',
  recDate: '-',
  bcStartDate: '-',
  bcEndDate: '-',
  ndStartDate: '-',
  ndEndDate: '-',
  comp: 'Test Corp',
  isin: 'INE000000000',
  caBroadcastDate: null,
});

// ---------------------------------------------------------------------------
// A. parseNseExDate — date string → UTC midnight
// ---------------------------------------------------------------------------

describe('parseNseExDate', () => {
  it('parses DD-Mon-YYYY (most common NSE API format)', () => {
    const result = parseNseExDate('17-Oct-2023');
    expect(result).toEqual(d('2023-10-17'));
  });

  it('parses DD-Mon-YYYY with full month casing variety', () => {
    expect(parseNseExDate('04-SEP-2023')).toEqual(d('2023-09-04'));
    expect(parseNseExDate('11-mar-2019')).toEqual(d('2019-03-11'));
    expect(parseNseExDate('10-Nov-2023')).toEqual(d('2023-11-10'));
  });

  it('parses DD-MM-YYYY format', () => {
    const result = parseNseExDate('29-09-2017');
    expect(result).toEqual(d('2017-09-29'));
  });

  it('parses YYYY-MM-DD ISO format', () => {
    const result = parseNseExDate('2023-10-17');
    expect(result).toEqual(d('2023-10-17'));
  });

  it('normalises to UTC midnight (no time component)', () => {
    const result = parseNseExDate('27-Jun-2023');
    expect(result).not.toBeNull();
    expect(result!.toISOString()).toBe('2023-06-27T00:00:00.000Z');
  });

  it('returns null for empty string', () => {
    expect(parseNseExDate('')).toBeNull();
  });

  it('returns null for "-" placeholder', () => {
    expect(parseNseExDate('-')).toBeNull();
  });

  it('returns null for "N/A"', () => {
    expect(parseNseExDate('N/A')).toBeNull();
  });

  it('returns null for "invalid-date"', () => {
    expect(parseNseExDate('invalid-date')).toBeNull();
  });

  it('returns null for null/undefined input', () => {
    expect(parseNseExDate(null)).toBeNull();
    expect(parseNseExDate(undefined)).toBeNull();
  });

  it('does not throw for any arbitrary garbage string', () => {
    expect(() => parseNseExDate('!!!@@@###')).not.toThrow();
    expect(parseNseExDate('!!!@@@###')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// B. parseNseSubject — purpose string → structured result
// ---------------------------------------------------------------------------

describe('parseNseSubject — bonus', () => {
  it('parses "Bonus 1:1" → actionType bonus, splitRatio 2', () => {
    const r = parseNseSubject('Bonus 1:1');
    expect(r).toEqual({ actionType: 'bonus', splitRatio: 2 });
  });

  it('parses "Bonus 2:1" → splitRatio 3', () => {
    const r = parseNseSubject('Bonus 2:1');
    expect(r).toEqual({ actionType: 'bonus', splitRatio: 3 });
  });

  it('parses "Bonus 3:2" → splitRatio 2.5', () => {
    const r = parseNseSubject('Bonus 3:2');
    expect(r).toEqual({ actionType: 'bonus', splitRatio: 2.5 });
  });

  it('parses "bonus issue 1:3" (BSE-style variant, lowercase)', () => {
    const r = parseNseSubject('bonus issue 1:3');
    expect(r).toEqual({ actionType: 'bonus', splitRatio: 4 / 3 });
  });

  it('parses "BONUS 7:5" (upper case)', () => {
    const r = parseNseSubject('BONUS 7:5');
    expect(r).not.toBeNull();
    expect(r!.actionType).toBe('bonus');
    // (7+5)/5 = 2.4
    expect(r!.actionType === 'bonus' && r!.splitRatio).toBeCloseTo(2.4);
  });
});

describe('parseNseSubject — face value split', () => {
  it('parses full NSE split subject with Rs X to Rs Y', () => {
    const r = parseNseSubject(
      'Face Value Split (Sub-Division) - From Rs 10/- Per Share To Rs 2/- Per Share'
    );
    expect(r).toEqual({ actionType: 'split', splitRatio: 5 });
  });

  it('parses "Sub-Division from Rs 10 to Re 1" → splitRatio 10', () => {
    const r = parseNseSubject('Sub-Division from Rs 10 to Re 1');
    expect(r).toEqual({ actionType: 'split', splitRatio: 10 });
  });

  it('parses "Face Value Split from Rs 5 to Rs 1" → splitRatio 5', () => {
    const r = parseNseSubject('Face Value Split from Rs 5 to Rs 1');
    expect(r).toEqual({ actionType: 'split', splitRatio: 5 });
  });

  it('parses "stock split from rs.10/- to rs.1/-" (BSE/kite variant)', () => {
    const r = parseNseSubject('stock split from rs.10/- to rs.1/-');
    expect(r).toEqual({ actionType: 'split', splitRatio: 10 });
  });

  it('parses Rs 10 to Rs 5 split → splitRatio 2', () => {
    const r = parseNseSubject('Face Value Split (Sub-Division) - From Rs 10/- Per Share To Rs 5/- Per Share');
    expect(r).toEqual({ actionType: 'split', splitRatio: 2 });
  });

  it('returns null when both face values are equal (degenerate case)', () => {
    const r = parseNseSubject('Face Value Split from Rs 10 to Rs 10');
    expect(r).toBeNull();
  });
});

describe('parseNseSubject — dividend', () => {
  it('parses "Dividend - Rs 5 Per Share" → amount 5', () => {
    const r = parseNseSubject('Dividend - Rs 5 Per Share');
    expect(r).toEqual({ actionType: 'dividend', amount: 5 });
  });

  it('parses "Dividend - Rs 2.50" → amount 2.5', () => {
    const r = parseNseSubject('Dividend - Rs 2.50');
    expect(r).toEqual({ actionType: 'dividend', amount: 2.5 });
  });

  it('parses "Interim Dividend - Re 0.80 Per Share" → amount 0.8', () => {
    const r = parseNseSubject('Interim Dividend - Re 0.80 Per Share');
    expect(r).toEqual({ actionType: 'dividend', amount: 0.8 });
  });

  it('parses "Interim Dividend Re 1" → amount 1', () => {
    const r = parseNseSubject('Interim Dividend Re 1');
    expect(r).toEqual({ actionType: 'dividend', amount: 1 });
  });

  it('parses "Final Dividend Rs 12" → amount 12', () => {
    const r = parseNseSubject('Final Dividend Rs 12');
    expect(r).toEqual({ actionType: 'dividend', amount: 12 });
  });

  it('parses "Dividend - Rs 19 Per Share" → amount 19', () => {
    const r = parseNseSubject('Dividend - Rs 19 Per Share');
    expect(r).toEqual({ actionType: 'dividend', amount: 19 });
  });

  it('parses "Final Dividend Rs 24" → amount 24', () => {
    const r = parseNseSubject('Final Dividend Rs 24');
    expect(r).toEqual({ actionType: 'dividend', amount: 24 });
  });

  it('parses "Special Dividend - Rs 3.50 Per Share" → amount 3.5', () => {
    const r = parseNseSubject('Special Dividend - Rs 3.50 Per Share');
    expect(r).toEqual({ actionType: 'dividend', amount: 3.5 });
  });

  it('returns null when "Dividend" is present but no amount can be extracted', () => {
    const r = parseNseSubject('Dividend (no amount here)');
    expect(r).toBeNull();
  });
});

describe('parseNseSubject — rights (CB-15)', () => {
  it('parses "Rights 8:13 @ Premium Rs 4/-" → rights with TERP inputs', () => {
    const r = parseNseSubject('Rights 8:13 @ Premium Rs 4/-');
    expect(r).not.toBeNull();
    expect(r!.actionType).toBe('rights');
    if (r!.actionType === 'rights') {
      // rightsRatio = 8/13 ≈ 0.6154
      expect(r!.rightsRatio).toBeCloseTo(8 / 13, 10);
      expect(r!.issuePrice).toBe(4);
    }
  });

  it('parses "Rights 2:5 @ Rs 150" → correct ratio and price', () => {
    const r = parseNseSubject('Rights 2:5 @ Rs 150');
    expect(r).not.toBeNull();
    expect(r!.actionType).toBe('rights');
    if (r!.actionType === 'rights') {
      expect(r!.rightsRatio).toBeCloseTo(2 / 5, 10);
      expect(r!.issuePrice).toBe(150);
    }
  });

  it('recognises "Rights Issue" (no ratio/price) as rights_unparseable', () => {
    const r = parseNseSubject('Rights Issue');
    expect(r).not.toBeNull();
    expect(r!.actionType).toBe('rights_unparseable');
  });

  it('recognises bare "Rights" with no ratio as rights_unparseable', () => {
    const r = parseNseSubject('Rights');
    expect(r).not.toBeNull();
    expect(r!.actionType).toBe('rights_unparseable');
  });
});

describe('parseNseSubject — unknown/garbled', () => {
  it('returns null for empty string', () => {
    expect(parseNseSubject('')).toBeNull();
  });

  it('returns null for "Some Garbled Action XYZ Unknown"', () => {
    expect(parseNseSubject('Some Garbled Action XYZ Unknown')).toBeNull();
  });

  it('returns null for "Buy Back"', () => {
    expect(parseNseSubject('Buy Back')).toBeNull();
  });

  it('does not throw for any arbitrary garbage', () => {
    expect(() => parseNseSubject('!!! @@@ ### 123')).not.toThrow();
    expect(parseNseSubject('!!! @@@ ### 123')).toBeNull();
  });
});

describe('parseNseSubject — merger/demerger/spinoff (CB-16)', () => {
  it('recognises "Demerger" → demerger', () => {
    const r = parseNseSubject('Demerger');
    expect(r).not.toBeNull();
    expect(r!.actionType).toBe('demerger');
  });

  it('recognises "Scheme of Demerger" → demerger', () => {
    const r = parseNseSubject('Scheme of Demerger');
    expect(r!.actionType).toBe('demerger');
  });

  it('recognises "Merger" → merger', () => {
    const r = parseNseSubject('Merger');
    expect(r!.actionType).toBe('merger');
  });

  it('recognises "Amalgamation" → merger', () => {
    const r = parseNseSubject('Amalgamation');
    expect(r!.actionType).toBe('merger');
  });

  it('recognises "Scheme of Amalgamation" → merger', () => {
    const r = parseNseSubject('Scheme of Amalgamation');
    expect(r!.actionType).toBe('merger');
  });

  it('recognises "Spin Off" → spinoff', () => {
    const r = parseNseSubject('Spin Off');
    expect(r!.actionType).toBe('spinoff');
  });

  it('recognises "Spinoff" → spinoff', () => {
    const r = parseNseSubject('Spinoff');
    expect(r!.actionType).toBe('spinoff');
  });

  it('does not misclassify "Demerger" as merger', () => {
    const r = parseNseSubject('Demerger');
    expect(r!.actionType).not.toBe('merger');
  });
});

// ---------------------------------------------------------------------------
// C. parseNseCorporateActionRow — per-row error isolation
// ---------------------------------------------------------------------------

describe('parseNseCorporateActionRow — per-row error isolation', () => {
  it('returns valid action for a clean bonus row', () => {
    const warnings: string[] = [];
    const result = parseNseCorporateActionRow(
      row('GENSOL', 'Bonus 2:1', '17-Oct-2023'),
      NSE_CORPORATE_ACTIONS_SOURCE,
      warnings
    );
    expect(result).not.toBeNull();
    expect(result!.symbol).toBe('GENSOL');
    expect(result!.actionType).toBe('bonus');
    expect(result!.splitRatio).toBe(3);
    expect(result!.effectiveDate).toEqual(d('2023-10-17'));
    expect(result!.source).toBe(NSE_CORPORATE_ACTIONS_SOURCE);
    expect(result!.rawPurpose).toBe('Bonus 2:1');
    expect(warnings).toHaveLength(0);
  });

  it('returns null and pushes warning for missing symbol', () => {
    const warnings: string[] = [];
    const result = parseNseCorporateActionRow(
      row('', 'Bonus 1:1', '17-Oct-2023'),
      NSE_CORPORATE_ACTIONS_SOURCE,
      warnings
    );
    expect(result).toBeNull();
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toMatch(/missing symbol/i);
  });

  it('returns null and warns for unparseable date', () => {
    const warnings: string[] = [];
    const result = parseNseCorporateActionRow(
      row('BADCO', 'Bonus 1:1', 'invalid-date'),
      NSE_CORPORATE_ACTIONS_SOURCE,
      warnings
    );
    expect(result).toBeNull();
    expect(warnings[0]).toMatch(/exdate/i);
  });

  it('returns null and warns for unrecognised subject', () => {
    const warnings: string[] = [];
    const result = parseNseCorporateActionRow(
      row('CO', 'Some Garbled XYZ', '17-Oct-2023'),
      NSE_CORPORATE_ACTIONS_SOURCE,
      warnings
    );
    expect(result).toBeNull();
    expect(warnings[0]).toMatch(/unrecognised subject/i);
  });

  it('returns a rights action with TERP inputs for parseable rights row (CB-15)', () => {
    const warnings: string[] = [];
    const result = parseNseCorporateActionRow(
      row('CO', 'Rights 8:13 @ Premium Rs 4/-', '15-May-2023'),
      NSE_CORPORATE_ACTIONS_SOURCE,
      warnings
    );
    // Parseable rights are now stored (not skipped) for TERP adjustment.
    expect(result).not.toBeNull();
    expect(result!.actionType).toBe('rights');
    expect(result!.rightsRatio).toBeCloseTo(8 / 13, 10);
    expect(result!.issuePrice).toBe(4);
    expect(warnings).toHaveLength(0); // no warning for parseable rights
  });

  it('returns rights_unparseable action and warns when ratio/price missing', () => {
    const warnings: string[] = [];
    const result = parseNseCorporateActionRow(
      row('CO', 'Rights Issue', '15-May-2023'),
      NSE_CORPORATE_ACTIONS_SOURCE,
      warnings
    );
    expect(result).not.toBeNull();
    expect(result!.actionType).toBe('rights_unparseable');
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toMatch(/rights/i);
    expect(warnings[0]).toMatch(/unparseable/i);
  });

  it('sets currency INR on dividend actions', () => {
    // currency is set in the mapper stage, not the row parser —
    // verify via the importNseCorporateActions path instead
    const warnings: string[] = [];
    const result = parseNseCorporateActionRow(
      row('HDFC', 'Dividend - Rs 19 Per Share', '27-Jun-2023'),
      NSE_CORPORATE_ACTIONS_SOURCE,
      warnings
    );
    expect(result).not.toBeNull();
    expect(result!.actionType).toBe('dividend');
    expect(result!.amount).toBe(19);
    expect(result!.splitRatio).toBeUndefined();
  });

  it('does not throw when a completely malformed object is passed', () => {
    const warnings: string[] = [];
    const badRow = { symbol: null, series: null, subject: null, exDate: null } as unknown as NseCorporateActionRow;
    expect(() =>
      parseNseCorporateActionRow(badRow, NSE_CORPORATE_ACTIONS_SOURCE, warnings)
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// D. parseNseCorporateActions — batch parser, counts, per-row isolation
// ---------------------------------------------------------------------------

describe('parseNseCorporateActions — batch parsing', () => {
  const goodRows: NseCorporateActionRow[] = [
    row('GENSOL',    'Bonus 2:1',                                                                   '17-Oct-2023'),
    row('SHILPAMED', 'Bonus 1:1',                                                                   '04-Sep-2023'),
    row('RELIANCE',  'Face Value Split (Sub-Division) - From Rs 10/- Per Share To Rs 2/- Per Share', '29-Sep-2017'),
    row('FCL',       'Interim Dividend - Re 0.80 Per Share',                                        '10-Nov-2023'),
    row('HDFCBANK',  'Dividend - Rs 19 Per Share',                                                  '27-Jun-2023'),
  ];

  it('parses all valid rows and returns correct counts', () => {
    const { parsed, skipped, warnings } = parseNseCorporateActions(goodRows);
    expect(parsed).toHaveLength(5);
    expect(skipped).toBe(0);
    expect(warnings).toHaveLength(0);
  });

  it('isolates bad rows — valid rows still parsed', () => {
    const mixed: NseCorporateActionRow[] = [
      ...goodRows,
      row('BADCO', 'Garbled XYZ', '01-Jan-2024'),      // unrecognised → skipped
      row('',      'Bonus 1:1',   '01-Jan-2024'),       // missing symbol → skipped
      row('CO3',   'Bonus 1:1',   'invalid-date'),      // bad date → skipped
      row('CO4',   'Rights Issue', '01-Jan-2024'),      // CB-15: rights_unparseable → STORED (not skipped); warning emitted
    ];
    const { parsed, skipped, warnings } = parseNseCorporateActions(mixed);
    // 5 good + 1 rights_unparseable (now stored) = 6 parsed; 3 hard-skipped
    expect(parsed).toHaveLength(6);
    expect(skipped).toBe(3);
    // warnings: 3 skip-warnings + 1 rights_unparseable advisory = 4
    expect(warnings).toHaveLength(4);
  });

  it('returns empty result for empty input', () => {
    const { parsed, skipped, warnings } = parseNseCorporateActions([]);
    expect(parsed).toHaveLength(0);
    expect(skipped).toBe(0);
    expect(warnings).toHaveLength(0);
  });

  it('uses custom source name when provided', () => {
    const { parsed } = parseNseCorporateActions(
      [row('GENSOL', 'Bonus 1:1', '17-Oct-2023')],
      { source: 'MY_CUSTOM_SOURCE' }
    );
    expect(parsed[0].source).toBe('MY_CUSTOM_SOURCE');
  });

  it('preserves rawPurpose on every parsed action', () => {
    const { parsed } = parseNseCorporateActions(goodRows);
    for (const action of parsed) {
      expect(action.rawPurpose).toBeTruthy();
    }
  });

  it('splits row maps to correct action type and ratio', () => {
    const { parsed } = parseNseCorporateActions([
      row('INFY', 'Face Value Split from Rs 5 to Rs 1', '11-Jun-1999'),
    ]);
    expect(parsed[0].actionType).toBe('split');
    expect(parsed[0].splitRatio).toBe(5);
    expect(parsed[0].amount).toBeUndefined();
  });

  it('bonus row maps to correct ratio — 3:2', () => {
    const { parsed } = parseNseCorporateActions([
      row('PAGEIND', 'Bonus 3:2', '26-Oct-2016'),
    ]);
    expect(parsed[0].actionType).toBe('bonus');
    expect(parsed[0].splitRatio).toBeCloseTo(2.5);
  });
});

// ---------------------------------------------------------------------------
// E. buildCorporateActionNaturalKey — idempotency
// ---------------------------------------------------------------------------

describe('buildCorporateActionNaturalKey — idempotency', () => {
  const action: ParsedCorporateAction = {
    symbol: 'GENSOL',
    actionType: 'bonus',
    effectiveDate: d('2023-10-17'),
    splitRatio: 3,
    source: NSE_CORPORATE_ACTIONS_SOURCE,
    rawPurpose: 'Bonus 2:1',
  };

  it('produces the same key for the same inputs', () => {
    const k1 = buildCorporateActionNaturalKey('stock-123', action);
    const k2 = buildCorporateActionNaturalKey('stock-123', action);
    expect(k1).toBe(k2);
  });

  it('changes key when stockId changes', () => {
    const k1 = buildCorporateActionNaturalKey('stock-123', action);
    const k2 = buildCorporateActionNaturalKey('stock-456', action);
    expect(k1).not.toBe(k2);
  });

  it('changes key when actionType changes', () => {
    const k1 = buildCorporateActionNaturalKey('stock-123', action);
    const k2 = buildCorporateActionNaturalKey('stock-123', { ...action, actionType: 'split' });
    expect(k1).not.toBe(k2);
  });

  it('changes key when effectiveDate changes', () => {
    const k1 = buildCorporateActionNaturalKey('stock-123', action);
    const k2 = buildCorporateActionNaturalKey('stock-123', { ...action, effectiveDate: d('2023-10-18') });
    expect(k1).not.toBe(k2);
  });

  it('key contains stockId, actionType, date, source, and ratio', () => {
    const k = buildCorporateActionNaturalKey('stock-123', action);
    expect(k).toContain('stock-123');
    expect(k).toContain('bonus');
    expect(k).toContain('2023-10-17');
    expect(k).toContain(NSE_CORPORATE_ACTIONS_SOURCE.toLowerCase());
  });

  it('keys are pipe-delimited (matches repository convention)', () => {
    const k = buildCorporateActionNaturalKey('stock-123', action);
    const parts = k.split('|');
    expect(parts).toHaveLength(6);
  });

  it('null amount and null splitRatio yield "null" segments', () => {
    const k = buildCorporateActionNaturalKey('stock-123', {
      ...action,
      splitRatio: undefined,
      amount: undefined,
    });
    const parts = k.split('|');
    expect(parts[4]).toBe('null'); // amount segment
    expect(parts[5]).toBe('null'); // splitRatio segment
  });
});

// ---------------------------------------------------------------------------
// F. importNseCorporateActions — mapper counts (mocked upsert)
// ---------------------------------------------------------------------------

describe('importNseCorporateActions — mapper counts', () => {
  const parsedActions: ParsedCorporateAction[] = [
    {
      symbol: 'GENSOL',
      actionType: 'bonus',
      effectiveDate: d('2023-10-17'),
      splitRatio: 3,
      source: NSE_CORPORATE_ACTIONS_SOURCE,
      rawPurpose: 'Bonus 2:1',
    },
    {
      symbol: 'HDFCBANK',
      actionType: 'dividend',
      effectiveDate: d('2023-06-27'),
      amount: 19,
      source: NSE_CORPORATE_ACTIONS_SOURCE,
      rawPurpose: 'Dividend - Rs 19 Per Share',
    },
    {
      symbol: 'RELIANCE',
      actionType: 'split',
      effectiveDate: d('2017-09-29'),
      splitRatio: 5,
      source: NSE_CORPORATE_ACTIONS_SOURCE,
      rawPurpose: 'Face Value Split (Sub-Division) - From Rs 10/- Per Share To Rs 2/- Per Share',
    },
  ];

  const symbolMap: Record<string, string> = {
    GENSOL:   'stock-001',
    HDFCBANK: 'stock-002',
    RELIANCE: 'stock-003',
  };

  it('calls upsertFn once per unique stockId and counts correctly', async () => {
    const upsertCalls: Array<{ stockId: string; actions: CorporateActionDbInput[] }> = [];
    const upsertFn = jest.fn().mockImplementation(
      (stockId: string, actions: CorporateActionDbInput[]) => {
        upsertCalls.push({ stockId, actions });
        return Promise.resolve(actions.map((_, i) => ({ id: `op-${i}` })));
      }
    );

    const result = await importNseCorporateActions(
      parsedActions,
      (sym) => symbolMap[sym],
      upsertFn
    );

    // One upsert call per stock (3 distinct stocks here)
    expect(upsertFn).toHaveBeenCalledTimes(3);
    expect(result.inserted).toBe(3);
    expect(result.skipped).toBe(0);
    expect(result.rejected).toBe(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('skips symbols not found in catalog and records warning', async () => {
    const upsertFn = jest.fn().mockResolvedValue([{ id: 'op-1' }]);
    const result = await importNseCorporateActions(
      parsedActions,
      (sym) => sym === 'RELIANCE' ? undefined : symbolMap[sym], // RELIANCE not in catalog
      upsertFn
    );

    expect(result.skipped).toBe(1);
    expect(result.warnings.some((w) => w.includes('RELIANCE'))).toBe(true);
    expect(result.inserted).toBe(2);
  });

  it('skips all when symbolToStockId returns undefined for all', async () => {
    const upsertFn = jest.fn();
    const result = await importNseCorporateActions(
      parsedActions,
      () => undefined,
      upsertFn
    );

    expect(upsertFn).not.toHaveBeenCalled();
    expect(result.skipped).toBe(3);
    expect(result.inserted).toBe(0);
  });

  it('deduplicates actions with same naturalKey within batch', async () => {
    const upsertFn = jest.fn().mockResolvedValue([{ id: 'op-1' }]);
    const duplicate = { ...parsedActions[0] }; // exact same action twice
    const result = await importNseCorporateActions(
      [parsedActions[0], duplicate],
      (sym) => symbolMap[sym],
      upsertFn
    );

    expect(result.skipped).toBe(1); // second duplicate skipped
    expect(result.inserted).toBe(1);
    expect(result.warnings.some((w) => w.includes('Duplicate'))).toBe(true);
  });

  it('marks as rejected and warns when upsertFn throws', async () => {
    const upsertFn = jest.fn().mockRejectedValue(new Error('DB connection error'));
    const result = await importNseCorporateActions(
      parsedActions,
      (sym) => symbolMap[sym],
      upsertFn
    );

    expect(result.rejected).toBe(3);
    expect(result.inserted).toBe(0);
    expect(result.warnings.some((w) => w.includes('DB connection error'))).toBe(true);
  });

  it('passes correct DB input shape to upsertFn', async () => {
    let capturedActions: CorporateActionDbInput[] = [];
    const upsertFn = jest.fn().mockImplementation(
      (_stockId: string, actions: CorporateActionDbInput[]) => {
        capturedActions = [...capturedActions, ...actions];
        return Promise.resolve(actions.map(() => ({ id: 'op' })));
      }
    );

    await importNseCorporateActions(
      [parsedActions[0]], // GENSOL bonus
      (sym) => symbolMap[sym],
      upsertFn
    );

    expect(capturedActions).toHaveLength(1);
    const dbInput = capturedActions[0];
    expect(dbInput.type).toBe('bonus');
    expect(dbInput.date).toBe('2023-10-17');
    expect(dbInput.splitRatio).toBe(3);
    expect(dbInput.amount).toBeNull();
    expect(dbInput.currency).toBeNull(); // only dividends get INR
    expect(dbInput.source).toBe(NSE_CORPORATE_ACTIONS_SOURCE);
  });

  it('sets currency INR for dividend actions in DB input', async () => {
    let capturedActions: CorporateActionDbInput[] = [];
    const upsertFn = jest.fn().mockImplementation(
      (_stockId: string, actions: CorporateActionDbInput[]) => {
        capturedActions = actions;
        return Promise.resolve(actions.map(() => ({ id: 'op' })));
      }
    );

    await importNseCorporateActions(
      [parsedActions[1]], // HDFCBANK dividend
      (sym) => symbolMap[sym],
      upsertFn
    );

    expect(capturedActions[0].currency).toBe('INR');
    expect(capturedActions[0].amount).toBe(19);
    expect(capturedActions[0].splitRatio).toBeNull();
  });

  it('handles empty actions list without calling upsertFn', async () => {
    const upsertFn = jest.fn();
    const result = await importNseCorporateActions([], () => 'stock-001', upsertFn);
    expect(upsertFn).not.toHaveBeenCalled();
    expect(result.inserted).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// G. URL builder
// ---------------------------------------------------------------------------

describe('buildNseCorporateActionsUrl', () => {
  it('builds the equities endpoint by default', () => {
    const url = buildNseCorporateActionsUrl();
    expect(url).toContain(NSE_CORPORATE_ACTIONS_ENDPOINT);
    expect(url).toContain('index=equities');
  });

  it('appends symbol when provided', () => {
    const url = buildNseCorporateActionsUrl({ symbol: 'GENSOL' });
    expect(url).toContain('symbol=GENSOL');
  });

  it('appends from_date and to_date when provided', () => {
    const url = buildNseCorporateActionsUrl({ fromDate: '01-01-2024', toDate: '31-01-2024' });
    expect(url).toContain('from_date=01-01-2024');
    expect(url).toContain('to_date=31-01-2024');
  });

  it('supports sme segment', () => {
    const url = buildNseCorporateActionsUrl({ index: 'sme' });
    expect(url).toContain('index=sme');
  });
});

// ---------------------------------------------------------------------------
// H. Fixture-based integration test (reads real fixture CSV)
// ---------------------------------------------------------------------------

describe('fixture-based integration — NSE corporate actions CSV', () => {
  /**
   * The fixture CSV at `fixtures/nse-corporate-actions.fixture.csv` mirrors
   * the real NSE API JSON format (one JSON object per row in the CSV) to
   * represent a realistic batch of corporate actions including all types.
   *
   * We parse the CSV into row objects manually here (the API normally returns
   * JSON, but the fixture gives us a human-readable reference).
   */
  const FIXTURE_PATH = path.join(
    __dirname,
    'fixtures',
    'nse-corporate-actions.fixture.csv'
  );

  let fixtureRows: NseCorporateActionRow[];

  beforeAll(() => {
    const csv = fs.readFileSync(FIXTURE_PATH, 'utf-8');
    const lines = csv.split(/\r?\n/).filter((l) => l.trim());
    const headers = lines[0].split(',');

    fixtureRows = lines.slice(1).map((line) => {
      const values = line.split(',');
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h.trim()] = (values[i] ?? '').trim();
      });
      return {
        symbol: obj.symbol,
        series: obj.series,
        ind: obj.ind,
        faceVal: obj.faceVal,
        subject: obj.subject,
        exDate: obj.exDate,
        recDate: obj.recDate,
        bcStartDate: obj.bcStartDate,
        bcEndDate: obj.bcEndDate,
        ndStartDate: obj.ndStartDate,
        ndEndDate: obj.ndEndDate,
        comp: obj.comp,
        isin: obj.isin,
        caBroadcastDate: obj.caBroadcastDate || null,
      } as NseCorporateActionRow;
    });
  });

  it('reads the fixture file without error', () => {
    expect(fixtureRows.length).toBeGreaterThan(0);
  });

  it('parses all valid fixture rows including CB-15 rights and CB-16 demerger', () => {
    const { parsed, skipped, warnings } = parseNseCorporateActions(fixtureRows);

    // Fixture has: 2 bonus (GENSOL,SHILPAMED) + bonus WIPRO + bonus PAGEIND
    //              + 2 splits (RELIANCE, SUMEETINDS) + TATAPOWER sub-div + INFY split
    //              + 3 dividends (FCL, HDFCBANK, TCS) + NESTLEIND
    //              + UTKARSHBNK rights (CB-15: parseable → stored)
    //              = 13 valid rows
    // Skipped: UNKNOWN_CO (garbled), BADDATE (bad date),
    //          ZEROFV (equal face value), NOSYMBOL (empty symbol) = 4 skipped
    expect(parsed).toHaveLength(13);
    expect(skipped).toBe(4);
    // 4 skip-warnings (garbled, bad date, equal FV, no symbol); no rights warning for parseable rights
    expect(warnings).toHaveLength(4);
  });

  it('correctly identifies GENSOL as bonus with splitRatio 3', () => {
    const { parsed } = parseNseCorporateActions(fixtureRows);
    const gensol = parsed.find((p) => p.symbol === 'GENSOL');
    expect(gensol).toBeDefined();
    expect(gensol!.actionType).toBe('bonus');
    expect(gensol!.splitRatio).toBe(3);
    expect(gensol!.effectiveDate).toEqual(d('2023-10-17'));
  });

  it('correctly identifies RELIANCE as split with splitRatio 5', () => {
    const { parsed } = parseNseCorporateActions(fixtureRows);
    const reliance = parsed.find((p) => p.symbol === 'RELIANCE');
    expect(reliance).toBeDefined();
    expect(reliance!.actionType).toBe('split');
    expect(reliance!.splitRatio).toBe(5);
  });

  it('correctly identifies FCL as dividend with amount 0.8', () => {
    const { parsed } = parseNseCorporateActions(fixtureRows);
    const fcl = parsed.find((p) => p.symbol === 'FCL');
    expect(fcl).toBeDefined();
    expect(fcl!.actionType).toBe('dividend');
    expect(fcl!.amount).toBeCloseTo(0.8);
  });

  it('fixture warnings mention unrecognised subjects (no rights warning for parseable rights)', () => {
    const { warnings } = parseNseCorporateActions(fixtureRows);
    // UTKARSHBNK has parseable rights — no warning emitted for it.
    const hasUnrecognisedWarning = warnings.some((w) => w.toLowerCase().includes('unrecognised'));
    expect(hasUnrecognisedWarning).toBe(true);
  });

  it('UTKARSHBNK rights row is stored with correct TERP inputs (CB-15)', () => {
    const { parsed } = parseNseCorporateActions(fixtureRows);
    const utkarsh = parsed.find((p) => p.symbol === 'UTKARSHBNK');
    expect(utkarsh).toBeDefined();
    expect(utkarsh!.actionType).toBe('rights');
    // rightsRatio = 8/13; issuePrice = 4
    expect(utkarsh!.rightsRatio).toBeCloseTo(8 / 13, 10);
    expect(utkarsh!.issuePrice).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// I. Ratio convention cross-check with adjustment engine expectation
// ---------------------------------------------------------------------------

describe('ratio convention — aligned with corporate-adjustment.ts', () => {
  /**
   * The adjustment engine uses ratio = newShares / oldShares.
   *   • 1:1 bonus → R = 2   (price factor = 1/2 = 0.5)
   *   • 5:1 split  → R = 5   (price factor = 1/5 = 0.2)
   *   • 10:1 rev   → R = 0.1 (price factor = 10)
   *
   * ParseNseSubject must produce these same values.
   */

  it('bonus 1:1 → splitRatio 2 (matches adjustment engine AdjustmentAction.ratio=2)', () => {
    const r = parseNseSubject('Bonus 1:1');
    expect(r!.actionType === 'bonus' && r!.splitRatio).toBe(2);
  });

  it('5:1 face value split (Rs 10 → Rs 2) → splitRatio 5 (matches engine ratio=5)', () => {
    const r = parseNseSubject(
      'Face Value Split (Sub-Division) - From Rs 10/- Per Share To Rs 2/- Per Share'
    );
    expect(r!.actionType === 'split' && r!.splitRatio).toBe(5);
  });

  it('10:1 face value split (Rs 10 → Re 1) → splitRatio 10 (matches engine)', () => {
    const r = parseNseSubject('Sub-Division from Rs 10 to Re 1');
    expect(r!.actionType === 'split' && r!.splitRatio).toBe(10);
  });

  it('dividend → amount only, no splitRatio', () => {
    const r = parseNseSubject('Final Dividend Rs 24');
    expect(r).not.toBeNull();
    expect(r!.actionType).toBe('dividend');
    if (r!.actionType === 'dividend') {
      expect(r!.amount).toBe(24);
    }
  });
});
