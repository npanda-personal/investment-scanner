/// <reference types="@types/jest" />
import {
  CalendarService,
  classifyCorporateAction,
  parseCalendarQuery,
  parseCalendarRefreshBody,
} from '../../../src/modules/calendar';
import { parseFredValue, mapReleaseToSeries } from '../../../src/modules/calendar';
import { computeTrend } from '../../../src/modules/calendar/calendar.service';
import {
  deriveIpoStatus,
  normalizeNseRow,
  normalizeBseRow,
  parseIpoDate,
  parsePriceBand,
} from '../../../src/modules/calendar/calendar.ipo-source';

interface MakeOpts {
  signal?: any[];
  upcomingFetcher?: jest.Mock;
}

function makeService(overrides: Record<string, any> = {}, opts: MakeOpts = {}) {
  const repo = {
    latestIpoSnapshots: jest.fn().mockResolvedValue([]),
    listCorporateActions: jest.fn().mockResolvedValue([]),
    listUpcomingEarnings: jest.fn().mockResolvedValue([]),
    listEconomicEvents: jest.fn().mockResolvedValue([]),
    listRecentlyListed: jest.fn().mockResolvedValue([]),
    firstCloseOnOrAfter: jest.fn().mockResolvedValue(null),
    latestPrices: jest.fn().mockResolvedValue(new Map()),
    listUpcomingIpos: jest.fn().mockResolvedValue([]),
    upsertUpcomingIpo: jest.fn().mockResolvedValue(undefined),
    recentClosesForSymbols: jest.fn().mockResolvedValue(new Map()),
    upsertIpoSnapshot: jest.fn().mockResolvedValue(undefined),
    upsertEconomicEvent: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  // Injected stubs keep tests hermetic: no real signal engine, no NSE/BSE network.
  const signalReader = { latestPersistedForInstruments: jest.fn().mockResolvedValue(opts.signal ?? []) };
  const upcomingFetcher = opts.upcomingFetcher ?? jest.fn().mockResolvedValue([]);
  const service = new CalendarService(repo as any, signalReader as any, upcomingFetcher);
  return { service, repo, signalReader, upcomingFetcher };
}

const RANGE = {
  from: new Date('2026-01-01T00:00:00.000Z'),
  to: new Date('2026-12-31T00:00:00.000Z'),
};

/** Default query knobs the parser always supplies; spread into latest() calls. */
const QUERY_DEFAULTS = { ...RANGE, limit: 100, ipoMonths: 3 } as const;

describe('classifyCorporateAction', () => {
  it('maps dividend variants to DIVIDEND', () => {
    expect(classifyCorporateAction('dividend')).toBe('DIVIDEND');
    expect(classifyCorporateAction('INTERIM_DIVIDEND')).toBe('DIVIDEND');
    expect(classifyCorporateAction('Special Dividend')).toBe('DIVIDEND');
  });
  it('maps split/bonus variants to SPLIT', () => {
    expect(classifyCorporateAction('split')).toBe('SPLIT');
    expect(classifyCorporateAction('REVERSE_SPLIT')).toBe('SPLIT');
    expect(classifyCorporateAction('bonus')).toBe('SPLIT');
  });
  it('returns null for unrelated action types', () => {
    expect(classifyCorporateAction('rights_issue')).toBeNull();
  });
});

describe('parseCalendarQuery', () => {
  it('applies defaults and clamps limit', () => {
    const q = parseCalendarQuery({ limit: '99999' });
    expect(q.region).toBe('IN');
    expect(q.assetType).toBe('STOCK');
    expect(q.type).toBe('ALL');
    expect(q.limit).toBe(500); // MAX_LIMIT
    expect(q.from.getTime()).toBeLessThan(q.to.getTime());
  });
  it('normalizes type and region casing', () => {
    expect(parseCalendarQuery({ type: 'ipo', region: 'us' }).type).toBe('IPO');
    expect(parseCalendarQuery({ region: 'us' }).region).toBe('US');
  });
  it('falls back to ALL for an unknown type', () => {
    expect(parseCalendarQuery({ type: 'nonsense' }).type).toBe('ALL');
  });
  it('swaps an inverted from/to range', () => {
    const q = parseCalendarQuery({ from: '2026-06-01', to: '2026-01-01' });
    expect(q.from.getTime()).toBeLessThan(q.to.getTime());
  });
});

describe('parseCalendarRefreshBody', () => {
  it('defaults includeEconomic true and parses explicit false', () => {
    expect(parseCalendarRefreshBody({}).includeEconomic).toBe(true);
    expect(parseCalendarRefreshBody({ includeEconomic: false }).includeEconomic).toBe(false);
    expect(parseCalendarRefreshBody({ includeEconomic: 'false' }).includeEconomic).toBe(false);
  });
  it('clamps lookbackDays', () => {
    expect(parseCalendarRefreshBody({ lookbackDays: '99999' }).lookbackDays).toBe(1825);
  });
});

describe('CalendarService.latest', () => {
  it('assembles, classifies and sorts events across all sources', async () => {
    const { service } = makeService({
      latestIpoSnapshots: jest.fn().mockResolvedValue([
        {
          symbol: 'NEWCO',
          companyName: 'New Co',
          scopeRegion: 'IN',
          listingDate: new Date('2026-06-01T00:00:00.000Z'),
          daysListed: 10,
          firstClose: 100,
          latestClose: 120,
          returnSinceListing: 0.2,
          sector: 'Tech',
          exchange: 'NSE',
          currency: 'INR',
          freshness: 'FRESH',
        },
      ]),
      listCorporateActions: jest.fn().mockResolvedValue([
        {
          id: 'ca1',
          actionType: 'dividend',
          effectiveDate: new Date('2026-05-20T00:00:00.000Z'),
          paymentDate: null,
          amount: 4.5,
          splitRatio: null,
          currency: 'INR',
          stock: { symbol: 'AAA', name: 'Alpha', region: 'IN', currency: 'INR' },
        },
        {
          id: 'ca2',
          actionType: 'split',
          effectiveDate: new Date('2026-04-15T00:00:00.000Z'),
          paymentDate: null,
          amount: null,
          splitRatio: 2,
          currency: 'INR',
          stock: { symbol: 'BBB', name: 'Beta', region: 'IN', currency: 'INR' },
        },
      ]),
      listEconomicEvents: jest.fn().mockResolvedValue([
        {
          source: 'FRED',
          releaseId: '10',
          releaseName: 'Consumer Price Index',
          seriesId: 'CPIAUCSL',
          region: 'US',
          eventDate: new Date('2026-07-10T00:00:00.000Z'),
          actualValue: 310,
          previousValue: 309,
          unit: 'Index',
          sourceUrl: 'https://fred.stlouisfed.org/release?rid=10',
        },
      ]),
    });

    const res = await service.latest({ region: 'IN', assetType: 'STOCK', type: 'ALL', ...QUERY_DEFAULTS });

    expect(res.counts).toEqual({ IPO: 1, IPO_UPCOMING: 0, DIVIDEND: 1, SPLIT: 1, EARNINGS: 0, ECONOMIC: 1 });
    expect(res.freshness).toBe('PARTIAL'); // EARNINGS empty
    // newest-first: economic (Jul 10) leads
    expect(res.items[0].eventType).toBe('ECONOMIC');
    const ipo = res.items.find((e) => e.eventType === 'IPO');
    expect(ipo?.metrics.returnSinceListing).toBe(0.2);
    const div = res.items.find((e) => e.eventType === 'DIVIDEND');
    expect(div?.title).toContain('Dividend');
    expect(div?.metrics.amount).toBe(4.5);
  });

  it('returns NO_DATA freshness with a warning when a single requested type is empty', async () => {
    const { service } = makeService();
    const res = await service.latest({ region: 'IN', assetType: 'STOCK', type: 'IPO', ...QUERY_DEFAULTS });
    expect(res.freshness).toBe('NO_DATA');
    expect(res.items).toHaveLength(0);
    expect(res.warnings.length).toBeGreaterThan(0);
  });

  it('scopes economic events by region (no US-leak into IN)', async () => {
    const { service, repo } = makeService();
    await service.latest({ region: 'IN', assetType: 'STOCK', type: 'ECONOMIC', ...QUERY_DEFAULTS });
    // region must be passed through as the first arg so IN excludes US-stored FRED rows
    expect(repo.listEconomicEvents).toHaveBeenCalledWith('IN', RANGE.from, RANGE.to, 100);
  });

  it('does not surface the empty-economic warning for IN (economic is US-only)', async () => {
    const { service } = makeService();
    const res = await service.latest({ region: 'IN', assetType: 'STOCK', type: 'ALL', ...QUERY_DEFAULTS });
    expect(res.warnings.some((w) => w.includes('economic releases ingested'))).toBe(false);
  });

  it('still surfaces the empty-economic warning for US', async () => {
    const { service } = makeService();
    const res = await service.latest({ region: 'US', assetType: 'STOCK', type: 'ECONOMIC', ...QUERY_DEFAULTS });
    expect(res.warnings.some((w) => w.includes('economic releases ingested'))).toBe(true);
  });
});

describe('CalendarService.refreshSnapshots (IPO)', () => {
  it('computes returnSinceListing and upserts a snapshot row', async () => {
    const upsert = jest.fn().mockResolvedValue(undefined);
    const { service } = makeService({
      listRecentlyListed: jest.fn().mockResolvedValue([
        {
          id: 's1',
          symbol: 'NEWCO',
          name: 'New Co',
          region: 'IN',
          exchange: 'NSE',
          sector: 'Tech',
          currency: 'INR',
          ipoDate: new Date('2026-06-01T00:00:00.000Z'),
        },
      ]),
      firstCloseOnOrAfter: jest.fn().mockResolvedValue({ close: 100, timestamp: new Date('2026-06-01T00:00:00.000Z') }),
      latestPrices: jest.fn().mockResolvedValue(new Map([['NEWCO', { price: 150, timestamp: new Date('2026-06-20T00:00:00.000Z') }]])),
      upsertIpoSnapshot: upsert,
    });

    const result = await service.refreshSnapshots({
      region: 'IN',
      assetType: 'STOCK',
      snapshotDate: new Date('2026-06-21T00:00:00.000Z'),
      lookbackDays: 365,
      includeEconomic: false,
      includeUpcomingIpo: false,
    });

    expect(result.ipo.written).toBe(1);
    expect(result.economic.skipped).toBe(true);
    expect(result.upcomingIpo.skipped).toBe(true);
    expect(upsert).toHaveBeenCalledTimes(1);
    const row = upsert.mock.calls[0][0];
    expect(row.returnSinceListing).toBeCloseTo(0.5, 5); // (150-100)/100
    expect(row.freshness).toBe('FRESH');
    expect(row.daysListed).toBe(20);
  });
});

describe('CalendarService — IPO Closed sub-tab (signal + trend join)', () => {
  const ipoRow = {
    symbol: 'NEWCO',
    stockId: 'stock-1',
    companyName: 'New Co',
    scopeRegion: 'IN',
    listingDate: new Date('2026-06-01T00:00:00.000Z'),
    returnSinceListing: 0.2,
    exchange: 'NSE',
    freshness: 'FRESH',
  };

  it('stamps the real signal verdict + read-time trend onto the listed IPO', async () => {
    const { service } = makeService(
      {
        latestIpoSnapshots: jest.fn().mockResolvedValue([ipoRow]),
        recentClosesForSymbols: jest.fn().mockResolvedValue(
          new Map([['NEWCO', [{ close: 100 }, { close: 130 }]]]),
        ),
      },
      { signal: [{ instrument_id: 'stock-1', direction: 'BULLISH', confidence: 'HIGH' }] },
    );

    const res = await service.latest({ region: 'IN', assetType: 'STOCK', type: 'IPO', ...QUERY_DEFAULTS });
    const ipo = res.items.find((e) => e.eventType === 'IPO');
    expect(ipo?.metrics.signalDirection).toBe('BULLISH');
    expect(ipo?.metrics.signalConfidence).toBe('HIGH');
    expect(ipo?.metrics.trendDirection).toBe('UP'); // (130-100)/100 = +0.30 > band
  });

  it('renders the listed IPO with null signal when no trusted signal exists (never errors)', async () => {
    const { service } = makeService({
      latestIpoSnapshots: jest.fn().mockResolvedValue([ipoRow]),
    }); // signal stub returns [] by default
    const res = await service.latest({ region: 'IN', assetType: 'STOCK', type: 'IPO', ...QUERY_DEFAULTS });
    const ipo = res.items.find((e) => e.eventType === 'IPO');
    expect(ipo).toBeTruthy();
    expect(ipo?.metrics.signalDirection).toBeNull();
    expect(ipo?.metrics.trendDirection).toBeNull(); // no closes → no trend
  });

  it('drives the Closed window off ipoMonths, not the page from/to', async () => {
    const latestIpoSnapshots = jest.fn().mockResolvedValue([]);
    const { service } = makeService({ latestIpoSnapshots });
    await service.latest({ region: 'IN', assetType: 'STOCK', type: 'IPO', ...QUERY_DEFAULTS, ipoMonths: 6 });
    expect(latestIpoSnapshots).toHaveBeenCalledTimes(1);
    const [region, assetType, from, to] = latestIpoSnapshots.mock.calls[0];
    expect(region).toBe('IN');
    expect(assetType).toBe('STOCK');
    // The window is the page's forward [from,to]? No — it must be ~6 months BACKWARD from today.
    const monthsBack = (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
    expect(monthsBack).toBe(6);
    expect(to.getTime()).toBeGreaterThan(from.getTime());
  });
});

describe('CalendarService — IPO Upcoming sub-tab (mapping + ingest)', () => {
  it('maps an upcoming snapshot row to an IPO_UPCOMING event', async () => {
    const { service } = makeService({
      listUpcomingIpos: jest.fn().mockResolvedValue([
        {
          source: 'NSE',
          scopeRegion: 'IN',
          snapshotDate: new Date('2026-06-25T00:00:00.000Z'),
          exchange: 'NSE',
          ipoType: 'MAINBOARD',
          symbol: null,
          companyName: 'Forthcoming Ltd',
          status: 'ONGOING',
          openDate: new Date('2026-06-24T00:00:00.000Z'),
          closeDate: new Date('2026-06-26T00:00:00.000Z'),
          priceBandMin: 108,
          priceBandMax: 114,
          issueSizeCr: 500,
          lotSize: 130,
          expectedListingDate: new Date('2026-06-30T00:00:00.000Z'),
          sourceUrl: 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',
        },
      ]),
    });
    const res = await service.latest({ region: 'IN', assetType: 'STOCK', type: 'IPO_UPCOMING', ...QUERY_DEFAULTS });
    expect(res.counts.IPO_UPCOMING).toBe(1);
    const ev = res.items.find((e) => e.eventType === 'IPO_UPCOMING');
    expect(ev?.companyName).toBe('Forthcoming Ltd');
    expect(ev?.metrics.status).toBe('ONGOING');
    expect(ev?.metrics.priceBandMin).toBe(108);
    expect(ev?.metrics.expectedListingDate).toBe(new Date('2026-06-30T00:00:00.000Z').toISOString());
    expect(ev?.date).toBe(new Date('2026-06-26T00:00:00.000Z').toISOString()); // anchored on close
  });

  it('ingests fetched NSE/BSE records into upcoming_ipo_snapshots when includeUpcomingIpo', async () => {
    const fetcher = jest.fn().mockResolvedValue([
      { source: 'NSE', companyName: 'A Ltd', status: 'UPCOMING', exchange: 'NSE' },
      { source: 'BSE', companyName: 'B Ltd', status: 'ONGOING', exchange: 'BSE' },
    ]);
    const upsert = jest.fn().mockResolvedValue(undefined);
    const { service } = makeService({ upsertUpcomingIpo: upsert }, { upcomingFetcher: fetcher });
    const result = await service.refreshSnapshots({
      region: 'IN',
      assetType: 'STOCK',
      snapshotDate: new Date('2026-06-25T00:00:00.000Z'),
      lookbackDays: 365,
      includeEconomic: false,
      includeUpcomingIpo: true,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(result.upcomingIpo.written).toBe(2);
    expect(result.upcomingIpo.skipped).toBe(false);
  });

  it('skips the upcoming-IPO ingest for non-IN regions (NSE/BSE only)', async () => {
    const fetcher = jest.fn().mockResolvedValue([]);
    const { service } = makeService({}, { upcomingFetcher: fetcher });
    const result = await service.refreshSnapshots({
      region: 'US',
      assetType: 'STOCK',
      snapshotDate: new Date('2026-06-25T00:00:00.000Z'),
      lookbackDays: 365,
      includeEconomic: false,
      includeUpcomingIpo: true,
    });
    expect(fetcher).not.toHaveBeenCalled();
    expect(result.upcomingIpo.skipped).toBe(true);
  });
});

describe('computeTrend', () => {
  it('classifies by the ±2% dead-band and returns null for thin data', () => {
    expect(computeTrend([{ close: 100 }, { close: 130 }])?.direction).toBe('UP');
    expect(computeTrend([{ close: 100 }, { close: 70 }])?.direction).toBe('DOWN');
    expect(computeTrend([{ close: 100 }, { close: 101 }])?.direction).toBe('FLAT');
    expect(computeTrend([{ close: 100 }])).toBeNull();
    expect(computeTrend([])).toBeNull();
    expect(computeTrend(undefined)).toBeNull();
  });
});

describe('IPO source parsers (NSE/BSE, pure)', () => {
  const NOW = new Date('2026-06-25T00:00:00.000Z');

  it('parseIpoDate handles NSE/BSE/ISO formats and rejects junk', () => {
    expect(parseIpoDate('12-Jun-2026')?.toISOString()).toBe('2026-06-12T00:00:00.000Z');
    expect(parseIpoDate('12/06/2026')?.toISOString()).toBe('2026-06-12T00:00:00.000Z');
    expect(parseIpoDate('2026-06-12')?.toISOString()).toBe('2026-06-12T00:00:00.000Z');
    expect(parseIpoDate('not-a-date')).toBeNull();
    expect(parseIpoDate(null)).toBeNull();
  });

  it('parsePriceBand extracts min/max from messy strings', () => {
    expect(parsePriceBand('108 - 114')).toEqual({ min: 108, max: 114 });
    expect(parsePriceBand('₹108 to ₹114')).toEqual({ min: 108, max: 114 });
    expect(parsePriceBand('114')).toEqual({ min: 114, max: 114 });
    expect(parsePriceBand('')).toEqual({ min: null, max: null });
  });

  it('deriveIpoStatus: ONGOING in-window, UPCOMING pre-open, drops closed+listed', () => {
    const open = new Date('2026-06-24T00:00:00.000Z');
    const close = new Date('2026-06-26T00:00:00.000Z');
    expect(deriveIpoStatus(null, open, close, null, NOW)).toBe('ONGOING');
    expect(deriveIpoStatus(null, new Date('2026-07-01T00:00:00.000Z'), new Date('2026-07-03T00:00:00.000Z'), null, NOW)).toBe('UPCOMING');
    // Subscription closed and listing already past → dropped (belongs to the Closed tab).
    expect(
      deriveIpoStatus(null, new Date('2026-06-10T00:00:00.000Z'), new Date('2026-06-12T00:00:00.000Z'), new Date('2026-06-16T00:00:00.000Z'), NOW),
    ).toBeNull();
  });

  it('normalizeNseRow / normalizeBseRow shape rows and drop the nameless', () => {
    const nse = normalizeNseRow(
      { companyName: 'New Co', symbol: 'NEWCO', issueStartDate: '24-Jun-2026', issueEndDate: '26-Jun-2026', issuePrice: '108 - 114', series: 'EQ' },
      NOW,
    );
    expect(nse?.source).toBe('NSE');
    expect(nse?.status).toBe('ONGOING');
    expect(nse?.priceBandMax).toBe(114);
    expect(nse?.ipoType).toBe('MAINBOARD');

    const bse = normalizeBseRow(
      { CompanyName: 'SME Co', IPOOpenDate: '24/06/2026', IPOCloseDate: '26/06/2026', Flag: 'SME' },
      NOW,
    );
    expect(bse?.source).toBe('BSE');
    expect(bse?.ipoType).toBe('SME');
    expect(normalizeNseRow({ symbol: 'X' }, NOW)).toBeNull(); // no company name
  });
});

describe('FRED helpers', () => {
  it('parseFredValue treats "." and blanks as null', () => {
    expect(parseFredValue('.')).toBeNull();
    expect(parseFredValue('')).toBeNull();
    expect(parseFredValue('3.14')).toBeCloseTo(3.14, 5);
    expect(parseFredValue(null)).toBeNull();
  });
  it('mapReleaseToSeries matches headline releases', () => {
    expect(mapReleaseToSeries('Consumer Price Index')?.seriesId).toBe('CPIAUCSL');
    expect(mapReleaseToSeries('Employment Situation')?.seriesId).toBe('UNRATE');
    expect(mapReleaseToSeries('Some Obscure Release')).toBeNull();
  });
});
