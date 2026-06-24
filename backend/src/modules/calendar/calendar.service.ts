// Calendar service — unified persisted-read assembler + refresh orchestration.
// READ path touches no provider; it merges four persisted sources into one
// CalendarEvent[]. REFRESH path materializes the IPO snapshot (from Stock.ipoDate +
// boundary closes) and ingests the FRED economic-release schedule. Research-support
// framing only — first traded close is labeled as such, never an "IPO/offer price".

import { CalendarRepository } from './calendar.repository';
import type { CorporateActionRow, EarningsUpcomingRow } from './calendar.repository';
import {
  fetchMappedReleaseDates,
  fetchLatestActualPrevious,
  getFredApiKey,
  mapReleaseToSeries,
} from './calendar.fred-source';
import {
  CALENDAR_EVENT_TYPES,
  type CalendarEvent,
  type CalendarEventType,
  type CalendarFreshness,
  type CalendarQuery,
  type CalendarRefreshRequest,
  type CalendarRefreshResult,
  type CalendarRefreshSourceResult,
  type CalendarResponse,
} from './calendar.types';

const DAY_MS = 24 * 60 * 60 * 1000;

function isoDay(d: Date): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

function emptyCounts(): Record<CalendarEventType, number> {
  return { IPO: 0, DIVIDEND: 0, SPLIT: 0, EARNINGS: 0, ECONOMIC: 0 };
}

/** Map a raw corporate-action type string to a calendar event family (or null to drop). */
export function classifyCorporateAction(actionType: string): 'DIVIDEND' | 'SPLIT' | null {
  const t = actionType.toLowerCase();
  if (t.includes('dividend')) return 'DIVIDEND';
  if (t.includes('split') || t.includes('bonus')) return 'SPLIT';
  return null;
}

export class CalendarService {
  constructor(private readonly repository = new CalendarRepository()) {}

  // ---- READ: unified assembly --------------------------------------------

  async latest(query: CalendarQuery): Promise<CalendarResponse> {
    const { region, assetType, type, from, to, limit } = query;
    const warnings: string[] = [];
    const wants = (t: CalendarEventType) => type === 'ALL' || type === t;

    const events: CalendarEvent[] = [];

    if (wants('IPO')) {
      const rows = await this.repository.latestIpoSnapshots(region, assetType, from, to, limit);
      if (!rows.length) warnings.push('No IPO snapshot for this scope yet — run a calendar refresh.');
      events.push(...rows.map((r) => this.ipoToEvent(r)));
    }

    if (wants('DIVIDEND') || wants('SPLIT')) {
      const rows = await this.repository.listCorporateActions(region, [], from, to, limit * 2);
      for (const r of rows) {
        const family = classifyCorporateAction(r.actionType);
        if (family === 'DIVIDEND' && wants('DIVIDEND')) events.push(this.corporateActionToEvent(r, 'DIVIDEND'));
        if (family === 'SPLIT' && wants('SPLIT')) events.push(this.corporateActionToEvent(r, 'SPLIT'));
      }
    }

    if (wants('EARNINGS')) {
      const rows = await this.repository.listUpcomingEarnings(region, assetType, from, to, limit);
      if (!rows.length) warnings.push('No upcoming earnings in range — see Earnings Intelligence for the full view.');
      events.push(...rows.map((r) => this.earningsToEvent(r, region)));
    }

    if (wants('ECONOMIC')) {
      const rows = await this.repository.listEconomicEvents(from, to, limit);
      if (!rows.length) warnings.push('No economic releases ingested yet (FRED, US/global) — run a calendar refresh.');
      events.push(...rows.map((r) => this.economicToEvent(r)));
    }

    // Newest-first; stable within a day by symbol/title.
    events.sort((a, b) => {
      const d = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (d !== 0) return d;
      return (a.symbol ?? a.title).localeCompare(b.symbol ?? b.title);
    });

    const counts = emptyCounts();
    for (const e of events) counts[e.eventType] += 1;

    const requested = type === 'ALL' ? [...CALENDAR_EVENT_TYPES] : [type];
    const populated = requested.filter((t) => counts[t] > 0).length;
    let freshness: CalendarFreshness = 'NO_DATA';
    if (populated === requested.length) freshness = 'FRESH';
    else if (populated > 0) freshness = 'PARTIAL';

    return {
      scope: { region, assetType },
      type,
      range: { from: isoDay(from), to: isoDay(to) },
      generatedAt: new Date().toISOString(),
      freshness,
      counts,
      items: events.slice(0, limit),
      warnings,
    };
  }

  // ---- READ: mappers ------------------------------------------------------

  private ipoToEvent(r: any): CalendarEvent {
    return {
      id: `ipo:${r.symbol}:${isoDay(r.listingDate)}`,
      eventType: 'IPO',
      date: r.listingDate.toISOString(),
      region: r.scopeRegion,
      symbol: r.symbol,
      companyName: r.companyName ?? null,
      title: r.companyName ? `${r.companyName} — recently listed` : `${r.symbol} — recently listed`,
      detail: r.exchange ? `Listed on ${r.exchange}` : null,
      metrics: {
        daysListed: r.daysListed ?? null,
        firstClose: r.firstClose ?? null,
        firstCloseDate: r.firstCloseDate ? r.firstCloseDate.toISOString() : null,
        latestClose: r.latestClose ?? null,
        returnSinceListing: r.returnSinceListing ?? null,
        sector: r.sector ?? null,
        exchange: r.exchange ?? null,
        currency: r.currency ?? null,
        freshness: r.freshness ?? null,
      },
      sourceUrl: null,
    };
  }

  private corporateActionToEvent(r: CorporateActionRow, family: 'DIVIDEND' | 'SPLIT'): CalendarEvent {
    const amount = r.amount != null ? Number(r.amount) : null;
    const ratio = r.splitRatio != null ? Number(r.splitRatio) : null;
    const currency = r.currency ?? r.stock?.currency ?? null;
    const symbol = r.stock?.symbol ?? null;
    const title =
      family === 'DIVIDEND'
        ? amount != null
          ? `Dividend ${amount}${currency ? ` ${currency}` : ''}`
          : 'Dividend'
        : r.actionType.toLowerCase().includes('bonus')
          ? 'Bonus issue'
          : 'Stock split';
    return {
      id: `ca:${r.id}`,
      eventType: family,
      date: r.effectiveDate.toISOString(),
      region: r.stock?.region ?? '',
      symbol,
      companyName: r.stock?.name ?? null,
      title,
      detail: r.actionType,
      metrics: {
        amount,
        ratio,
        currency,
        actionType: r.actionType,
        paymentDate: r.paymentDate ? r.paymentDate.toISOString() : null,
      },
      sourceUrl: null,
    };
  }

  private earningsToEvent(r: EarningsUpcomingRow, region: string): CalendarEvent {
    return {
      id: `earn:${r.symbol}:${r.resultDate ? isoDay(r.resultDate) : 'tba'}`,
      eventType: 'EARNINGS',
      date: (r.resultDate ?? new Date()).toISOString(),
      region,
      symbol: r.symbol,
      companyName: r.stock?.name ?? null,
      title: r.stock?.name ? `${r.stock.name} — results` : `${r.symbol} — results`,
      detail: r.resultDateSource && r.resultDateSource !== 'UNKNOWN' ? `Date source: ${r.resultDateSource}` : null,
      metrics: {
        daysToResult: r.daysToResult ?? null,
        resultDateSource: r.resultDateSource ?? null,
      },
      // FE deep-links the row to the Earnings Intelligence page (handled client-side).
      sourceUrl: null,
    };
  }

  private economicToEvent(r: any): CalendarEvent {
    return {
      id: `econ:${r.source}:${r.releaseId}:${isoDay(r.eventDate)}`,
      eventType: 'ECONOMIC',
      date: r.eventDate.toISOString(),
      region: r.region ?? 'US',
      symbol: null,
      companyName: null,
      title: r.releaseName,
      detail: r.seriesId ? `${r.source} · ${r.seriesId}` : r.source,
      metrics: {
        actualValue: r.actualValue ?? null,
        previousValue: r.previousValue ?? null,
        unit: r.unit ?? null,
      },
      sourceUrl: r.sourceUrl ?? null,
    };
  }

  // ---- REFRESH: materialize IPO snapshot + FRED economic events -----------

  async refreshSnapshots(req: CalendarRefreshRequest): Promise<CalendarRefreshResult> {
    const ipo = await this.refreshIpoSnapshot(req);
    const economic = req.includeEconomic
      ? await this.ingestEconomicEvents(req)
      : { processed: 0, written: 0, skipped: true, warnings: ['Economic ingest skipped by request.'] };

    const failed = ipo.warnings.some((w) => w.startsWith('FAILED')) || economic.warnings.some((w) => w.startsWith('FAILED'));
    const anyWritten = ipo.written > 0 || economic.written > 0;
    const status: CalendarRefreshResult['status'] = failed ? 'PARTIAL' : anyWritten ? 'OK' : 'PARTIAL';

    return {
      status,
      region: req.region,
      snapshotDate: isoDay(req.snapshotDate),
      ipo,
      economic,
      generatedAt: new Date().toISOString(),
    };
  }

  private async refreshIpoSnapshot(req: CalendarRefreshRequest): Promise<CalendarRefreshSourceResult> {
    const warnings: string[] = [];
    const cutoff = new Date(req.snapshotDate.getTime() - req.lookbackDays * DAY_MS);
    const stocks = await this.repository.listRecentlyListed(req.region, req.assetType, cutoff, req.snapshotDate);

    if (!stocks.length) {
      return { processed: 0, written: 0, skipped: false, warnings: ['No recently-listed stocks in window.'] };
    }

    const latest = await this.repository.latestPrices(stocks.map((s) => s.symbol));

    let written = 0;
    for (const s of stocks) {
      if (!s.ipoDate) continue;
      const rowWarnings: string[] = [];
      const first = await this.repository.firstCloseOnOrAfter(s.symbol, s.ipoDate);
      const last = latest.get(s.symbol) ?? null;

      if (!first) rowWarnings.push('No traded close on/after listing date.');
      if (!last) rowWarnings.push('No latest price available.');

      const returnSinceListing =
        first && last && first.close > 0 ? (last.price - first.close) / first.close : null;
      const daysListed = Math.max(0, Math.floor((req.snapshotDate.getTime() - s.ipoDate.getTime()) / DAY_MS));
      const freshness = first && last ? 'FRESH' : first || last ? 'PARTIAL' : 'NO_DATA';

      await this.repository.upsertIpoSnapshot({
        snapshotDate: req.snapshotDate,
        dataThroughDate: last?.timestamp ?? null,
        stockId: s.id,
        symbol: s.symbol,
        companyName: s.name,
        scopeRegion: req.region,
        scopeAssetType: req.assetType,
        listingDate: s.ipoDate,
        daysListed,
        exchange: s.exchange,
        sector: s.sector,
        currency: s.currency,
        firstClose: first?.close ?? null,
        firstCloseDate: first?.timestamp ?? null,
        latestClose: last?.price ?? null,
        latestCloseDate: last?.timestamp ?? null,
        returnSinceListing,
        warnings: rowWarnings,
        freshness,
      });
      written += 1;
    }

    return { processed: stocks.length, written, skipped: false, warnings };
  }

  private async ingestEconomicEvents(req: CalendarRefreshRequest): Promise<CalendarRefreshSourceResult> {
    const apiKey = getFredApiKey();
    if (!apiKey) {
      return {
        processed: 0,
        written: 0,
        skipped: true,
        warnings: ['FRED_API_KEY not set; economic calendar skipped (US/global releases unavailable).'],
      };
    }

    const warnings: string[] = [];
    // Schedule window: 60 days back, 120 days forward of the snapshot date.
    const from = new Date(req.snapshotDate.getTime() - 60 * DAY_MS);
    const to = new Date(req.snapshotDate.getTime() + 120 * DAY_MS);

    let releases;
    try {
      releases = await fetchMappedReleaseDates(apiKey, from, to);
    } catch (error) {
      return {
        processed: 0,
        written: 0,
        skipped: false,
        warnings: [`FAILED to fetch FRED release schedule: ${(error as Error).message}`],
      };
    }

    // Resolve actual/previous once per distinct mapped series (cache to bound API calls).
    const seriesCache = new Map<string, { actual: number | null; previous: number | null }>();
    let written = 0;
    for (const rel of releases) {
      const mapping = mapReleaseToSeries(rel.releaseName);
      let actual: number | null = null;
      let previous: number | null = null;
      let unit: string | null = null;
      let seriesId: string | null = null;

      if (mapping) {
        seriesId = mapping.seriesId;
        unit = mapping.unit;
        if (!seriesCache.has(mapping.seriesId)) {
          try {
            seriesCache.set(mapping.seriesId, await fetchLatestActualPrevious(mapping.seriesId, apiKey));
          } catch (error) {
            seriesCache.set(mapping.seriesId, { actual: null, previous: null });
            warnings.push(`${mapping.seriesId}: ${(error as Error).message}`);
          }
        }
        ({ actual, previous } = seriesCache.get(mapping.seriesId)!);
      }

      const eventDate = new Date(rel.date);
      if (Number.isNaN(eventDate.getTime())) continue;

      await this.repository.upsertEconomicEvent({
        source: 'FRED',
        releaseId: rel.releaseId,
        releaseName: rel.releaseName,
        seriesId,
        region: 'US',
        eventDate,
        actualValue: actual,
        previousValue: previous,
        unit,
        sourceUrl: `https://fred.stlouisfed.org/release?rid=${rel.releaseId}`,
      });
      written += 1;
    }

    return { processed: releases.length, written, skipped: false, warnings };
  }
}
