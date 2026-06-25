/// <reference types="@types/jest" />
import {
  CalendarService,
  classifyCorporateAction,
  parseCalendarQuery,
  parseCalendarRefreshBody,
} from '../../../src/modules/calendar';
import { parseFredValue, mapReleaseToSeries } from '../../../src/modules/calendar';

function makeService(overrides: Record<string, any> = {}) {
  const repo = {
    latestIpoSnapshots: jest.fn().mockResolvedValue([]),
    listCorporateActions: jest.fn().mockResolvedValue([]),
    listUpcomingEarnings: jest.fn().mockResolvedValue([]),
    listEconomicEvents: jest.fn().mockResolvedValue([]),
    listRecentlyListed: jest.fn().mockResolvedValue([]),
    firstCloseOnOrAfter: jest.fn().mockResolvedValue(null),
    latestPrices: jest.fn().mockResolvedValue(new Map()),
    upsertIpoSnapshot: jest.fn().mockResolvedValue(undefined),
    upsertEconomicEvent: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return { service: new CalendarService(repo as any), repo };
}

const RANGE = {
  from: new Date('2026-01-01T00:00:00.000Z'),
  to: new Date('2026-12-31T00:00:00.000Z'),
};

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

    const res = await service.latest({ region: 'IN', assetType: 'STOCK', type: 'ALL', ...RANGE, limit: 100 });

    expect(res.counts).toEqual({ IPO: 1, DIVIDEND: 1, SPLIT: 1, EARNINGS: 0, ECONOMIC: 1 });
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
    const res = await service.latest({ region: 'IN', assetType: 'STOCK', type: 'IPO', ...RANGE, limit: 100 });
    expect(res.freshness).toBe('NO_DATA');
    expect(res.items).toHaveLength(0);
    expect(res.warnings.length).toBeGreaterThan(0);
  });

  it('scopes economic events by region (no US-leak into IN)', async () => {
    const { service, repo } = makeService();
    await service.latest({ region: 'IN', assetType: 'STOCK', type: 'ECONOMIC', ...RANGE, limit: 100 });
    // region must be passed through as the first arg so IN excludes US-stored FRED rows
    expect(repo.listEconomicEvents).toHaveBeenCalledWith('IN', RANGE.from, RANGE.to, 100);
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
    });

    expect(result.ipo.written).toBe(1);
    expect(result.economic.skipped).toBe(true);
    expect(upsert).toHaveBeenCalledTimes(1);
    const row = upsert.mock.calls[0][0];
    expect(row.returnSinceListing).toBeCloseTo(0.5, 5); // (150-100)/100
    expect(row.freshness).toBe('FRESH');
    expect(row.daysListed).toBe(20);
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
