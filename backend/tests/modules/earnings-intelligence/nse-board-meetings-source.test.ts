/// <reference types="@types/jest" />
import path from 'path';
import fs from 'fs';
import {
  isPurposeResultsAnnouncement,
  parseNseBoardMeetingDate,
  parseNseBoardMeetingRow,
  parseNseBoardMeetings,
  matchBoardMeetingToPeriodEnd,
  buildNseBoardMeetingsUrl,
  NSE_BOARD_MEETINGS_SOURCE,
  NSE_BOARD_MEETINGS_ENDPOINT,
  MATCH_WINDOW_MAX_DAYS,
  type NseBoardMeetingRow,
} from '../../../src/modules/earnings-intelligence/earnings-intelligence.nse-board-meetings-source';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const d = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

const row = (symbol: string, purpose: string, meetingDate: string): NseBoardMeetingRow => ({
  symbol,
  company: 'Test Corp',
  purpose,
  meetingDate,
});

// ---------------------------------------------------------------------------
// A. parseNseBoardMeetingDate
// ---------------------------------------------------------------------------

describe('parseNseBoardMeetingDate', () => {
  it('parses DD-Mon-YYYY (most common NSE format)', () => {
    expect(parseNseBoardMeetingDate('18-Oct-2024')).toEqual(d('2024-10-18'));
  });

  it('parses DD-Mon-YYYY with varying case', () => {
    expect(parseNseBoardMeetingDate('17-OCT-2024')).toEqual(d('2024-10-17'));
    expect(parseNseBoardMeetingDate('05-jan-2025')).toEqual(d('2025-01-05'));
    expect(parseNseBoardMeetingDate('31-Mar-2024')).toEqual(d('2024-03-31'));
  });

  it('parses DD-MM-YYYY format', () => {
    expect(parseNseBoardMeetingDate('18-10-2024')).toEqual(d('2024-10-18'));
  });

  it('parses YYYY-MM-DD ISO format', () => {
    expect(parseNseBoardMeetingDate('2024-10-18')).toEqual(d('2024-10-18'));
  });

  it('normalises to UTC midnight', () => {
    const result = parseNseBoardMeetingDate('18-Oct-2024');
    expect(result?.toISOString()).toBe('2024-10-18T00:00:00.000Z');
  });

  it('returns null for empty string', () => {
    expect(parseNseBoardMeetingDate('')).toBeNull();
  });

  it('returns null for "-"', () => {
    expect(parseNseBoardMeetingDate('-')).toBeNull();
  });

  it('returns null for "N/A"', () => {
    expect(parseNseBoardMeetingDate('N/A')).toBeNull();
  });

  it('returns null for unparseable string', () => {
    expect(parseNseBoardMeetingDate('NOT-A-DATE')).toBeNull();
  });

  it('returns null for null/undefined', () => {
    expect(parseNseBoardMeetingDate(null)).toBeNull();
    expect(parseNseBoardMeetingDate(undefined)).toBeNull();
  });

  it('never throws for garbage input', () => {
    expect(() => parseNseBoardMeetingDate('!!!@@@###')).not.toThrow();
    expect(parseNseBoardMeetingDate('!!!@@@###')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// B. isPurposeResultsAnnouncement — positive patterns
// ---------------------------------------------------------------------------

describe('isPurposeResultsAnnouncement — positive (results purposes)', () => {
  const positives = [
    'Quarterly Results',
    'Half Yearly Results',
    'Annual Results',
    'Financial Results',
    'To consider and approve Unaudited Financial Results for Q3 FY25',
    'Financial Results for the quarter ended December 31, 2024',
    'Unaudited Standalone Financial Results',
    'Audited Financial Results',
    'To consider approval of Financial Results',
    'Quarterly Results & Dividend',    // contains dividend but also results
    'Results for Q3 FY25',
    'Consolidated Financial Results for the quarter ended December 31, 2024',
    'Standalone Financial Results',
    'Audited Financial Results for the year ended March 31, 2024',
    'Unaudited Financial Results for the quarter and half year ended September 30, 2024',
  ];

  for (const purpose of positives) {
    it(`recognises "${purpose.slice(0, 60)}" as a results announcement`, () => {
      expect(isPurposeResultsAnnouncement(purpose)).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------
// C. isPurposeResultsAnnouncement — negative patterns
// ---------------------------------------------------------------------------

describe('isPurposeResultsAnnouncement — negative (non-result purposes)', () => {
  const negatives = [
    'Dividend',
    'Interim Dividend - Rs 5 Per Share',
    'Final Dividend',
    'Annual General Meeting',
    'AGM',
    'EGM',
    'General Meeting',
    'Buyback of Equity Shares',
    'Buy-Back',
    'Bonus Issue',
    'Face Value Split (Sub-Division)',
    'Rights Issue',
    'Rights 8:13',
    'Merger and Amalgamation',
    'Demerger',
    'Auditor Appointment',
    'Issue of Securities',
    'ESOP',
    '',
  ];

  for (const purpose of negatives) {
    it(`rejects "${purpose.slice(0, 60)}" as non-results purpose`, () => {
      expect(isPurposeResultsAnnouncement(purpose)).toBe(false);
    });
  }
});

// ---------------------------------------------------------------------------
// D. parseNseBoardMeetingRow — per-row isolation
// ---------------------------------------------------------------------------

describe('parseNseBoardMeetingRow', () => {
  const warnings: string[] = [];
  beforeEach(() => warnings.splice(0, warnings.length));

  it('returns valid parsed meeting for a clean results row', () => {
    const result = parseNseBoardMeetingRow(
      row('RELIANCE', 'Quarterly Results', '18-Oct-2024'),
      NSE_BOARD_MEETINGS_SOURCE,
      warnings
    );
    expect(result).not.toBeNull();
    expect(result!.symbol).toBe('RELIANCE');
    expect(result!.purpose).toBe('RESULTS');
    expect(result!.boardMeetingDate).toEqual(d('2024-10-18'));
    expect(result!.source).toBe(NSE_BOARD_MEETINGS_SOURCE);
    expect(result!.rawPurpose).toBe('Quarterly Results');
    expect(warnings).toHaveLength(0);
  });

  it('returns null (no warning) for a non-results purpose (dividend)', () => {
    // Non-result rows are silently skipped — not an error
    const result = parseNseBoardMeetingRow(
      row('RELIANCE', 'Dividend', '01-Dec-2024'),
      NSE_BOARD_MEETINGS_SOURCE,
      warnings
    );
    expect(result).toBeNull();
    expect(warnings).toHaveLength(0);
  });

  it('returns null and warns for missing symbol', () => {
    const result = parseNseBoardMeetingRow(
      row('', 'Quarterly Results', '18-Oct-2024'),
      NSE_BOARD_MEETINGS_SOURCE,
      warnings
    );
    expect(result).toBeNull();
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toMatch(/missing symbol/i);
  });

  it('returns null and warns for unparseable date', () => {
    const result = parseNseBoardMeetingRow(
      row('RELIANCE', 'Quarterly Results', 'NOT-A-DATE'),
      NSE_BOARD_MEETINGS_SOURCE,
      warnings
    );
    expect(result).toBeNull();
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toMatch(/meetingDate/i);
  });

  it('respects fromDate filter', () => {
    const result = parseNseBoardMeetingRow(
      row('RELIANCE', 'Quarterly Results', '01-Jan-2024'),
      NSE_BOARD_MEETINGS_SOURCE,
      warnings,
      { fromDate: d('2024-06-01') }
    );
    expect(result).toBeNull();
    expect(warnings).toHaveLength(0);
  });

  it('respects toDate filter', () => {
    const result = parseNseBoardMeetingRow(
      row('RELIANCE', 'Quarterly Results', '01-Dec-2024'),
      NSE_BOARD_MEETINGS_SOURCE,
      warnings,
      { toDate: d('2024-10-31') }
    );
    expect(result).toBeNull();
    expect(warnings).toHaveLength(0);
  });

  it('does not throw for completely malformed input', () => {
    const bad = { symbol: null, purpose: null, meetingDate: null } as unknown as NseBoardMeetingRow;
    expect(() => parseNseBoardMeetingRow(bad, NSE_BOARD_MEETINGS_SOURCE, warnings)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// E. parseNseBoardMeetings — batch parser
// ---------------------------------------------------------------------------

describe('parseNseBoardMeetings — batch parsing', () => {
  const resultRows: NseBoardMeetingRow[] = [
    row('RELIANCE',  'Quarterly Results',                                                    '18-Oct-2024'),
    row('INFY',      'Unaudited Financial Results for Q2 FY25',                              '17-Oct-2024'),
    row('TCS',       'Financial Results',                                                    '10-Oct-2024'),
    row('WIPRO',     'Audited Financial Results for the year ended March 31, 2024',          '24-Apr-2024'),
    row('HDFCBANK',  'Quarterly Results & Dividend',                                         '19-Oct-2024'),
  ];

  const nonResultRows: NseBoardMeetingRow[] = [
    row('DIVIDENDCO', 'Dividend',              '01-Dec-2024'),
    row('AGMCO',      'Annual General Meeting', '15-Sep-2024'),
    row('BUYBACKCO',  'Buyback of Equity Shares', '01-Oct-2024'),
    row('BONUSCO',    'Bonus Issue',            '10-Oct-2024'),
  ];

  it('parses all result-announcement rows and silently drops non-result rows', () => {
    const { parsed, skipped, warnings } = parseNseBoardMeetings([...resultRows, ...nonResultRows]);
    expect(parsed).toHaveLength(5);
    expect(skipped).toBe(0);
    expect(warnings).toHaveLength(0);
  });

  it('returns empty result for empty input', () => {
    const { parsed, skipped, warnings } = parseNseBoardMeetings([]);
    expect(parsed).toHaveLength(0);
    expect(skipped).toBe(0);
    expect(warnings).toHaveLength(0);
  });

  it('handles rows with bad dates — counted as skipped + warned', () => {
    const mixed = [
      ...resultRows,
      row('BADDATE', 'Quarterly Results', 'NOT-A-DATE'),
    ];
    const { parsed, skipped, warnings } = parseNseBoardMeetings(mixed);
    expect(parsed).toHaveLength(5);
    expect(skipped).toBe(1);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/meetingDate/i);
  });

  it('uses custom source name when provided', () => {
    const { parsed } = parseNseBoardMeetings(
      [row('RELIANCE', 'Quarterly Results', '18-Oct-2024')],
      { source: 'MY_SOURCE' }
    );
    expect(parsed[0].source).toBe('MY_SOURCE');
  });

  it('respects fromDate/toDate options', () => {
    const { parsed } = parseNseBoardMeetings(resultRows, {
      fromDate: d('2024-10-15'),
      toDate: d('2024-10-20'),
    });
    // Only meetings within 15–20 Oct
    for (const p of parsed) {
      expect(p.boardMeetingDate >= d('2024-10-15')).toBe(true);
      expect(p.boardMeetingDate <= d('2024-10-20')).toBe(true);
    }
  });

  it('all parsed rows have purpose=RESULTS', () => {
    const { parsed } = parseNseBoardMeetings(resultRows);
    for (const p of parsed) expect(p.purpose).toBe('RESULTS');
  });

  it('preserves rawPurpose on every parsed row', () => {
    const { parsed } = parseNseBoardMeetings(resultRows);
    for (const p of parsed) expect(p.rawPurpose).toBeTruthy();
  });

  it('normalises symbols to uppercase', () => {
    const mixedCase: NseBoardMeetingRow[] = [
      { symbol: 'reliance', company: 'Test', purpose: 'Quarterly Results', meetingDate: '18-Oct-2024' },
    ];
    const { parsed } = parseNseBoardMeetings(mixedCase);
    expect(parsed[0].symbol).toBe('RELIANCE');
  });
});

// ---------------------------------------------------------------------------
// F. matchBoardMeetingToPeriodEnd
// ---------------------------------------------------------------------------

describe('matchBoardMeetingToPeriodEnd', () => {
  it('matches board meeting date to the closest prior fiscal quarter-end within window', () => {
    // Q2 FY25 ends 30-Sep-2024; board meeting 18-Oct-2024 → 18 days later
    const meetingDate = d('2024-10-18');
    const periodEnds = [d('2024-09-30'), d('2024-06-30'), d('2024-03-31')];
    const match = matchBoardMeetingToPeriodEnd(meetingDate, periodEnds);
    expect(match).toEqual(d('2024-09-30'));
  });

  it('matches annual results (board meeting ~60–80 days after fiscal year end)', () => {
    // FY24 ends 31-Mar-2024; board meeting 20-Jun-2024 → 81 days later (within 90d window)
    const meetingDate = d('2024-06-20');
    const periodEnds = [d('2024-03-31'), d('2023-03-31')];
    const match = matchBoardMeetingToPeriodEnd(meetingDate, periodEnds);
    expect(match).toEqual(d('2024-03-31'));
  });

  it('returns null when board meeting is > MATCH_WINDOW_MAX_DAYS after all period ends', () => {
    const meetingDate = d('2024-10-18');
    // All period ends are > 90 days before the meeting
    const periodEnds = [d('2024-06-30'), d('2024-03-31')];
    const match = matchBoardMeetingToPeriodEnd(meetingDate, periodEnds);
    expect(match).toBeNull();
  });

  it('returns null when meeting date is before all period ends', () => {
    const meetingDate = d('2024-01-01');
    const periodEnds = [d('2024-03-31'), d('2024-06-30')];
    const match = matchBoardMeetingToPeriodEnd(meetingDate, periodEnds);
    expect(match).toBeNull();
  });

  it('picks the most recent period end when multiple are within window', () => {
    // Q3 and Q2 both within window — should pick Q3 (most recent)
    const meetingDate = d('2024-11-15');
    const periodEnds = [d('2024-09-30'), d('2024-06-30'), d('2024-03-31')];
    const match = matchBoardMeetingToPeriodEnd(meetingDate, periodEnds);
    expect(match).toEqual(d('2024-09-30'));
  });

  it('returns null for empty period ends array', () => {
    expect(matchBoardMeetingToPeriodEnd(d('2024-10-18'), [])).toBeNull();
  });

  it('MATCH_WINDOW_MAX_DAYS is 90', () => {
    expect(MATCH_WINDOW_MAX_DAYS).toBe(90);
  });
});

// ---------------------------------------------------------------------------
// G. URL builder
// ---------------------------------------------------------------------------

describe('buildNseBoardMeetingsUrl', () => {
  it('builds the bulk equities endpoint by default', () => {
    const url = buildNseBoardMeetingsUrl();
    expect(url).toContain(NSE_BOARD_MEETINGS_ENDPOINT);
    expect(url).toContain('index=equities');
  });

  it('appends symbol when provided', () => {
    const url = buildNseBoardMeetingsUrl({ symbol: 'RELIANCE' });
    expect(url).toContain('symbol=RELIANCE');
  });

  it('appends from_date and to_date when provided', () => {
    const url = buildNseBoardMeetingsUrl({ fromDate: '01-10-2024', toDate: '31-12-2024' });
    expect(url).toContain('from_date=01-10-2024');
    expect(url).toContain('to_date=31-12-2024');
  });

  it('supports sme index', () => {
    const url = buildNseBoardMeetingsUrl({ index: 'sme' });
    expect(url).toContain('index=sme');
  });
});

// ---------------------------------------------------------------------------
// H. Fixture-based integration test
// ---------------------------------------------------------------------------

describe('fixture-based integration — NSE board meetings', () => {
  const FIXTURE_PATH = path.join(
    __dirname,
    'fixtures',
    'nse-board-meetings.fixture.json'
  );

  let fixtureRows: NseBoardMeetingRow[];

  beforeAll(() => {
    const json = fs.readFileSync(FIXTURE_PATH, 'utf-8');
    fixtureRows = JSON.parse(json) as NseBoardMeetingRow[];
  });

  it('loads the fixture file without error', () => {
    expect(fixtureRows.length).toBeGreaterThan(0);
  });

  it('extracts only result-announcement rows from a realistic NSE payload', () => {
    const { parsed, skipped, warnings } = parseNseBoardMeetings(fixtureRows);
    // Fixture contains:
    //   Results rows (9): RELIANCE, INFY, TCS, HDFCBANK, WIPRO, BHARTIARTL, NESTLEIND, TITAN, LTIM
    //   Non-results (silently dropped): DIVIDENDONLY, AGMCO, BUYBACKCO, BONUSCO
    //   Error rows (warned + skipped): BADDATE (bad date), empty symbol
    expect(parsed.length).toBe(9);
    expect(skipped).toBe(2); // BADDATE + empty symbol
    expect(warnings).toHaveLength(2);
  });

  it('correctly identifies RELIANCE as a quarterly results meeting', () => {
    const { parsed } = parseNseBoardMeetings(fixtureRows);
    const r = parsed.find((p) => p.symbol === 'RELIANCE');
    expect(r).toBeDefined();
    expect(r!.purpose).toBe('RESULTS');
    expect(r!.boardMeetingDate).toEqual(d('2024-10-18'));
    expect(r!.rawPurpose).toBe('Quarterly Results');
  });

  it('correctly identifies WIPRO annual results meeting', () => {
    const { parsed } = parseNseBoardMeetings(fixtureRows);
    const r = parsed.find((p) => p.symbol === 'WIPRO');
    expect(r).toBeDefined();
    expect(r!.boardMeetingDate).toEqual(d('2024-04-24'));
  });

  it('correctly identifies HDFCBANK (purpose: Quarterly Results & Dividend)', () => {
    // "Quarterly Results & Dividend" should be recognised as a results announcement
    const { parsed } = parseNseBoardMeetings(fixtureRows);
    const r = parsed.find((p) => p.symbol === 'HDFCBANK');
    expect(r).toBeDefined();
  });

  it('excludes DIVIDENDONLY, AGMCO, BUYBACKCO, BONUSCO (non-results purposes)', () => {
    const { parsed } = parseNseBoardMeetings(fixtureRows);
    const symbols = parsed.map((p) => p.symbol);
    expect(symbols).not.toContain('DIVIDENDONLY');
    expect(symbols).not.toContain('AGMCO');
    expect(symbols).not.toContain('BUYBACKCO');
    expect(symbols).not.toContain('BONUSCO');
  });

  it('has a warning for the bad-date row and empty-symbol row', () => {
    const { warnings } = parseNseBoardMeetings(fixtureRows);
    expect(warnings.some((w) => w.toLowerCase().includes('meetingdate'))).toBe(true);
    expect(warnings.some((w) => w.toLowerCase().includes('missing symbol'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// I. officialResultDate flow into earnings-intelligence service
//    (integration: when officialResultDate is present, the service produces
//    RESULT_WINNERS / RESULT_DISAPPOINTMENTS / RESULT_REACTION_HISTORY)
// ---------------------------------------------------------------------------

describe('earnings-intelligence service — officialResultDate flow', () => {
  /**
   * Import the service to verify that when EarningsFundamentalInput carries
   * an officialResultDate the service correctly resolves the OFFICIAL_CALENDAR
   * source and produces the result categories.
   *
   * This test does NOT use live network or DB.
   */
  let EarningsIntelligenceService: any;

  beforeAll(async () => {
    const mod = await import('../../../src/modules/earnings-intelligence/earnings-intelligence.service');
    EarningsIntelligenceService = mod.EarningsIntelligenceService;
  });

  function fund(periodEndDate: string, overrides: Record<string, unknown> = {}) {
    return {
      id: `fund-${periodEndDate}`,
      stockId: 'stock-1',
      revenue: 1000,
      netIncome: 100,
      eps: 10,
      periodType: 'QUARTERLY',
      periodEndDate: new Date(`${periodEndDate}T00:00:00.000Z`),
      source: 'MANUAL_VERIFIED',
      validatedAt: new Date(`${periodEndDate}T00:00:00.000Z`),
      ingestionTimestamp: new Date(),
      lastUpdatedTimestamp: new Date(),
      dataStatus: 'COMPLETE',
      ...overrides,
    };
  }

  it('RESULT_WINNERS and RESULT_REACTION_HISTORY appear when officialResultDate is set on fundamental', () => {
    const svc = new EarningsIntelligenceService({} as any);

    const snapshot = svc.calculateSnapshot({
      stockId: 'stock-1',
      symbol: 'RELIANCE',
      region: 'IN',
      assetType: 'STOCK',
      snapshotDate: new Date('2024-11-01T00:00:00.000Z'),
      dataThroughDate: null,
      fundamentals: [
        fund('2024-09-30', {
          officialResultDate: new Date('2024-10-18T00:00:00.000Z'),
          revenue: 1200,
          netIncome: 130,
          eps: 13,
        }),
        fund('2023-09-30', { revenue: 1000, netIncome: 100, eps: 10 }),
      ],
      prices: [
        { symbol: 'RELIANCE', timestamp: new Date('2024-10-18T00:00:00.000Z'), close: 2800, adjustedClose: 2800, volume: 1000000 },
        { symbol: 'RELIANCE', timestamp: new Date('2024-10-25T00:00:00.000Z'), close: 2890, adjustedClose: 2890, volume: 900000 },
      ],
      deliverySnapshots: [],
    });

    expect(snapshot.resultDateSource).toBe('OFFICIAL_CALENDAR');
    expect(snapshot.resultDate?.toISOString().slice(0, 10)).toBe('2024-10-18');
    expect(snapshot.categories).toContain('RESULT_WINNERS');
    expect(snapshot.categories).toContain('RESULT_REACTION_HISTORY');
    expect(snapshot.warnings).toEqual([]);
  });

  it('RESULT_DISAPPOINTMENTS appears when officialResultDate is set and earnings declined sharply', () => {
    const svc = new EarningsIntelligenceService({} as any);

    const snapshot = svc.calculateSnapshot({
      stockId: 'stock-2',
      symbol: 'WEAKCO',
      region: 'IN',
      assetType: 'STOCK',
      snapshotDate: new Date('2024-11-01T00:00:00.000Z'),
      dataThroughDate: null,
      fundamentals: [
        fund('2024-09-30', {
          officialResultDate: new Date('2024-10-20T00:00:00.000Z'),
          revenue: 800,     // -20% vs YoY
          netIncome: 50,    // -50% vs YoY
          eps: 5,           // -50% vs YoY
        }),
        fund('2023-09-30', { revenue: 1000, netIncome: 100, eps: 10 }),
      ],
      prices: [
        { symbol: 'WEAKCO', timestamp: new Date('2024-10-20T00:00:00.000Z'), close: 500, adjustedClose: 500, volume: 500000 },
        { symbol: 'WEAKCO', timestamp: new Date('2024-10-28T00:00:00.000Z'), close: 460, adjustedClose: 460, volume: 600000 },
      ],
      deliverySnapshots: [],
    });

    expect(snapshot.resultDateSource).toBe('OFFICIAL_CALENDAR');
    expect(snapshot.categories).toContain('RESULT_DISAPPOINTMENTS');
    expect(snapshot.warnings).toEqual([]);
  });

  it('result date is DATE_TBA (no fabricated date) when officialResultDate is absent', () => {
    const svc = new EarningsIntelligenceService({} as any);

    // No official date → the engine must NOT fabricate a forward date; it reports
    // DATE_TBA and keeps the row out of the official-only result categories.
    const snapshot = svc.calculateSnapshot({
      stockId: 'stock-3',
      symbol: 'NOOFFICIAL',
      region: 'IN',
      assetType: 'STOCK',
      snapshotDate: new Date('2024-07-15T00:00:00.000Z'),
      dataThroughDate: null,
      fundamentals: [
        fund('2024-03-31', { validatedAt: new Date('2024-05-10T00:00:00.000Z') }),
        fund('2023-03-31', {}),
      ],
      prices: [],
      deliverySnapshots: [],
    });

    expect(snapshot.resultDateSource).toBe('DATE_TBA');
    expect(snapshot.resultDate).toBeNull();
    expect(snapshot.resultDateLabel).toBe('TBA');
    expect(snapshot.warnings).toContain('RESULT_DATE_NOT_ANNOUNCED');
    expect(snapshot.categories).not.toContain('RESULT_WINNERS');
    expect(snapshot.categories).not.toContain('RESULT_DISAPPOINTMENTS');
    expect(snapshot.categories).not.toContain('RESULT_REACTION_HISTORY');
  });
});
