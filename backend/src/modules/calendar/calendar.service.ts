// Calendar service — unified persisted-read assembler + refresh orchestration.
// READ path touches no provider; it merges the persisted sources into one CalendarEvent[].
// REFRESH path materializes the IPO snapshot (from Stock.ipoDate + boundary closes) and ingests
// the FRED economic-release schedule. The IPO concern (both sub-tabs + upcoming-feed ingest) lives
// in calendar.ipo-service.ts; this file orchestrates it alongside corporate-actions/earnings/FRED.
// Research-support framing only — first traded close is labeled as such, never an "IPO/offer price".

import { CalendarRepository } from './calendar.repository';
import type { CorporateActionRow, EarningsUpcomingRow } from './calendar.repository';
import {
  fetchMappedReleaseDates,
  fetchLatestActualPrevious,
  getFredApiKey,
  mapReleaseToSeries,
} from './calendar.fred-source';
import { CalendarIpoService, type SignalReader } from './calendar.ipo-service';
import { isoDay } from './calendar.format';
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
  type UpcomingIpoRecord,
} from './calendar.types';

// Re-exported so existing importers keep the calendar.service path (impl now in calendar.ipo-service).
export { computeTrend } from './calendar.ipo-service';

const DAY_MS = 24 * 60 * 60 * 1000;

function emptyCounts(): Record<CalendarEventType, number> {
  return { IPO: 0, IPO_UPCOMING: 0, DIVIDEND: 0, SPLIT: 0, EARNINGS: 0, ECONOMIC: 0 };
}

/** Map a raw corporate-action type string to a calendar event family (or null to drop). */
export function classifyCorporateAction(actionType: string): 'DIVIDEND' | 'SPLIT' | null {
  const t = actionType.toLowerCase();
  if (t.includes('dividend')) return 'DIVIDEND';
  if (t.includes('split') || t.includes('bonus')) return 'SPLIT';
  return null;
}

export class CalendarService {
  /** IPO sub-tabs (Closed + Upcoming) + upcoming-feed ingest — split out at the 500-line cap. */
  private readonly ipoService: CalendarIpoService;

  constructor(
    private readonly repository = new CalendarRepository(),
    /** Persisted-read signal verdict source for the Closed sub-tab (tests inject a stub). */
    signalReader?: SignalReader,
    /** NSE+BSE forthcoming-IPO fetcher; injectable so refresh tests stay offline. */
    upcomingIpoFetcher?: (now?: Date) => Promise<UpcomingIpoRecord[]>,
  ) {
    // Passing undefined lets CalendarIpoService apply its real fetchUpcomingIpos default.
    this.ipoService = new CalendarIpoService(this.repository, signalReader, upcomingIpoFetcher);
  }

  // ---- READ: unified assembly --------------------------------------------

  async latest(query: CalendarQuery): Promise<CalendarResponse> {
    const { region, assetType, type, from, to, limit } = query;
    const warnings: string[] = [];
    const wants = (t: CalendarEventType) => type === 'ALL' || type === t;

    const events: CalendarEvent[] = [];

    if (wants('IPO') || wants('IPO_UPCOMING')) {
      events.push(...(await this.ipoService.assembleIpoEvents(query, warnings)));
    }

    if (wants('DIVIDEND') || wants('SPLIT')) {
      const rows = await this.repository.listCorporateActions(region, assetType, [], from, to, limit * 2);
      for (const r of rows) {
        const family = classifyCorporateAction(r.actionType);
        if (family === 'DIVIDEND' && wants('DIVIDEND')) events.push(this.corporateActionToEvent(r, 'DIVIDEND'));
        if (family === 'SPLIT' && wants('SPLIT')) events.push(this.corporateActionToEvent(r, 'SPLIT'));
      }
    }

    if (wants('EARNINGS')) {
      const rows = await this.repository.listUpcomingEarnings(region, assetType, from, to, limit);
      if (!rows.length) warnings.push('No upcoming earnings results in this window for this region.');
      events.push(...rows.map((r) => this.earningsToEvent(r, region)));
    }

    if (wants('ECONOMIC')) {
      const rows = await this.repository.listEconomicEvents(region, from, to, limit);
      // Economic releases are FRED US/global only (the Economic tab is hidden for other regions),
      // so the "run a refresh" hint only makes sense for US — never surface it on the IN page.
      if (!rows.length && region === 'US') {
        warnings.push('No economic releases ingested yet (FRED, US/global) — run a calendar refresh.');
      }
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

    // Truncate PER FAMILY, not globally. Each family is already fetched bounded to ~`limit`;
    // a single global newest-first `slice(0, limit)` would let a large, date-clustered family
    // crowd out the others whenever the merged feed exceeds `limit`. That silently dropped the
    // SOONEST-upcoming earnings under type=ALL (the merged list is sorted newest-first, so the
    // slice kept the furthest-out results and discarded the next companies to report) — exactly
    // the rows the forward-looking Earnings tab leads with. Capping each event family at `limit`
    // independently preserves every tab's rows while still bounding the payload. `counts` above
    // is pre-cap so tab badges stay accurate; the FE requests the max limit and re-filters per tab.
    const perFamilyRemaining = emptyCounts();
    for (const t of CALENDAR_EVENT_TYPES) perFamilyRemaining[t] = limit;
    const items: CalendarEvent[] = [];
    for (const e of events) {
      if (perFamilyRemaining[e.eventType] > 0) {
        items.push(e);
        perFamilyRemaining[e.eventType] -= 1;
      }
    }

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
      items,
      warnings,
    };
  }

  // ---- READ: mappers ------------------------------------------------------

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
      id: `earn:${r.symbol}:${isoDay(r.resultDate)}`,
      eventType: 'EARNINGS',
      date: r.resultDate.toISOString(),
      region,
      symbol: r.symbol,
      companyName: r.stock?.name ?? null,
      title: r.stock?.name ? `${r.stock.name} — results` : `${r.symbol} — results`,
      detail: r.resultDateSource && r.resultDateSource !== 'UNKNOWN' ? `Date source: ${r.resultDateSource}` : null,
      metrics: {
        daysToResult: r.daysToResult ?? null,
        resultDateSource: r.resultDateSource ?? null,
      },
      // FE links the row to the instrument-details page (pure calendar — no signals/analysis surface).
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

  // ---- REFRESH: materialize IPO snapshot + FRED economic events + upcoming-IPO feed ----

  async refreshSnapshots(req: CalendarRefreshRequest): Promise<CalendarRefreshResult> {
    const ipo = await this.refreshIpoSnapshot(req);
    const economic = req.includeEconomic
      ? await this.ingestEconomicEvents(req)
      : { processed: 0, written: 0, skipped: true, warnings: ['Economic ingest skipped by request.'] };
    const upcomingIpo = req.includeUpcomingIpo
      ? await this.ipoService.ingestUpcomingIpos(req)
      : { processed: 0, written: 0, skipped: true, warnings: ['Upcoming-IPO ingest skipped by request.'] };

    const failed =
      ipo.warnings.some((w) => w.startsWith('FAILED')) ||
      economic.warnings.some((w) => w.startsWith('FAILED')) ||
      upcomingIpo.warnings.some((w) => w.startsWith('FAILED'));
    const anyWritten = ipo.written > 0 || economic.written > 0 || upcomingIpo.written > 0;
    const status: CalendarRefreshResult['status'] = failed ? 'PARTIAL' : anyWritten ? 'OK' : 'PARTIAL';

    return {
      status,
      region: req.region,
      snapshotDate: isoDay(req.snapshotDate),
      ipo,
      economic,
      upcomingIpo,
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

      // Prefer the split/dividend-adjusted first close (back-adjusted to the latest-price
      // basis) so a corporate action between listing and now doesn't distort the ratio;
      // fall back to the raw close when no adjusted value exists. `firstClose` stored below
      // stays the raw observed close — an honest "first traded close", not the adjusted one.
      const firstForReturn = first ? (first.adjustedClose ?? first.close) : null;
      const returnSinceListing =
        firstForReturn != null && last && firstForReturn > 0
          ? (last.price - firstForReturn) / firstForReturn
          : null;
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
