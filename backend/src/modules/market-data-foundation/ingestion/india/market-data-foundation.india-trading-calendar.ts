// India NSE trading-calendar / holiday cache (Phase 4c extraction).
//
// IndiaTradingCalendar owns the in-process NSE CM trading-holiday cache and the
// official-holiday fetch/parse logic that previously lived inline on
// MarketDataFoundationService. The service constructs this class once (passing itself
// as the IndiaTradingCalendarHost) and keeps a thin delegator for
// nseCmTradingHolidayDatesForRange — both the IndiaHistoricalBackfillHost member and
// the `jest.spyOn(service, 'nseCmTradingHolidayDatesForRange')` test seam stay on the
// service delegator. Behaviour is byte-identical to the pre-extraction inline
// implementation (bodies were moved verbatim, rewriting `this.<sharedHelper>` to
// `this.host.<sharedHelper>` for collaborators that remain on the service and the
// holiday-cache field reference to the cache now owned by this class).
//
// The constructor's `registerNseHolidayProvider(...)` synchronous-reader closure stays
// on the service but now reads THIS class's `nseTradingHolidayCache` via the calendar
// instance — semantics (lazy fetch + cache, static-fallback before warm) are unchanged.

import { nseHolidayMasterUrl } from '../market-data-foundation.endpoints';
import type { IndiaTradingCalendarHost } from './market-data-foundation.india-ingestion-host';

export type NseTradingHolidayCacheEntry = {
  expiresAt: number;
  holidays: Map<string, string>;
  sourceUrl: string;
};

export class IndiaTradingCalendar {
  // In-process NSE CM trading-holiday cache (moved verbatim from the service instance
  // field). The service constructor's registerNseHolidayProvider closure reads this map
  // through the calendar instance, preserving the synchronous-reader semantics.
  readonly nseTradingHolidayCache = new Map<number, NseTradingHolidayCacheEntry>();

  constructor(private readonly host: IndiaTradingCalendarHost) {}

  async nseCmTradingHolidayDatesForRange(startDate: Date, endDate: Date): Promise<Map<string, string>> {
    const startYear = startDate.getUTCFullYear();
    const endYear = endDate.getUTCFullYear();
    const holidays = new Map<string, string>();
    for (let year = startYear; year <= endYear; year += 1) {
      const yearHolidays = await this.nseCmTradingHolidayDatesForYear(year);
      yearHolidays.forEach((description, date) => {
        const time = Date.parse(`${date}T00:00:00.000Z`);
        if (time >= startDate.getTime() && time <= endDate.getTime()) {
          holidays.set(date, description);
        }
      });
    }
    return holidays;
  }

  private async nseCmTradingHolidayDatesForYear(year: number): Promise<Map<string, string>> {
    const cached = this.nseTradingHolidayCache.get(year);
    if (cached && cached.expiresAt > Date.now()) return cached.holidays;
    const sourceUrl = nseHolidayMasterUrl(year);
    const holidays = await this.fetchOfficialNseTradingHolidayDatesForYear(year, sourceUrl);
    const ttlMs = this.host.clampNumber(
      this.host.readPositiveNumber(process.env.MARKET_DATA_NSE_HOLIDAY_CACHE_TTL_MS, 24 * 60 * 60_000),
      60_000,
      7 * 24 * 60 * 60_000,
      24 * 60 * 60_000
    );
    this.nseTradingHolidayCache.set(year, { expiresAt: Date.now() + ttlMs, holidays, sourceUrl });
    return holidays;
  }

  // Public so the service can keep a forwarding seam for the existing test that reaches
  // `(service as any).fetchOfficialNseTradingHolidayDatesForYear(...)` directly (the
  // download is still spied at the service via downloadOfficialExchangeJson).
  async fetchOfficialNseTradingHolidayDatesForYear(year: number, sourceUrl?: string): Promise<Map<string, string>> {
    const url = sourceUrl || nseHolidayMasterUrl(year);
    const payload = await this.host.downloadOfficialExchangeJson(url);
    const rows = Array.isArray(payload?.CM) ? payload.CM : [];
    if (rows.length === 0) {
      throw new Error(`Official NSE CM trading holiday calendar returned no rows for ${year}.`);
    }
    const holidays = new Map<string, string>();
    for (const row of rows) {
      const date = this.parseNseHolidayDate(row?.tradingDate);
      if (!date || !date.startsWith(`${year}-`)) continue;
      holidays.set(date, String(row?.description || 'NSE trading holiday').trim() || 'NSE trading holiday');
    }
    if (holidays.size === 0) {
      throw new Error(`Official NSE CM trading holiday calendar contained no parseable rows for ${year}.`);
    }
    return holidays;
  }

  private parseNseHolidayDate(value: unknown): string | null {
    const text = String(value || '').trim();
    const match = text.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
    if (!match) return null;
    const monthIndex = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].indexOf(match[2].toUpperCase());
    if (monthIndex < 0) return null;
    const day = Number(match[1]);
    const year = Number(match[3]);
    if (!Number.isInteger(day) || !Number.isInteger(year) || day < 1 || day > 31) return null;
    return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
}
