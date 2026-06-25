// Calendar IPO service — the IPO concern split out of calendar.service.ts (which is at the
// 500-line cap; the *.crypto-service.ts / fno-ban.service.ts precedent). Owns BOTH IPO sub-tabs:
//   • READ  — Closed (already-listed, backward ipoMonths window, enriched with the real signal
//             verdict + a read-time price trend + snapshot freshness as "health") and Upcoming
//             (the forthcoming/ongoing NSE+BSE feed). No provider fetch on the read path.
//   • REFRESH — ingest the NSE+BSE forthcoming-IPO feed into upcoming_ipo_snapshots.
// Research-support framing only — descriptive subscription data + a neutral trend, never advice.

import { CalendarRepository } from './calendar.repository';
import { fetchUpcomingIpos } from './calendar.ipo-source';
import { isoDay, isoOrNull } from './calendar.format';
import type {
  CalendarEvent,
  CalendarQuery,
  CalendarRefreshRequest,
  CalendarRefreshSourceResult,
  UpcomingIpoRecord,
} from './calendar.types';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Trend look-back for the Closed tab — ~5 weeks of sessions; ±2% dead-band keeps FLAT honest. */
const TREND_WINDOW_DAYS = 35;
const TREND_FLAT_BAND = 0.02;

/** Minimal persisted-read signal surface the calendar needs (a thin slice of the signal service). */
export interface SignalReader {
  latestPersistedForInstruments(
    instrumentIds: string[],
  ): Promise<Array<{ instrument_id: string; direction: string; confidence: string }>>;
}

type IpoSignal = { direction: string; confidence: string };
type IpoTrend = { direction: 'UP' | 'FLAT' | 'DOWN'; pct: number };

/** Recent-direction proxy from persisted closes (ascending). Null when too few points. */
export function computeTrend(closes: { close: number }[] | undefined): IpoTrend | null {
  if (!closes || closes.length < 2) return null;
  const start = closes[0].close;
  const end = closes[closes.length - 1].close;
  if (!(start > 0)) return null;
  const pct = (end - start) / start;
  const direction = pct > TREND_FLAT_BAND ? 'UP' : pct < -TREND_FLAT_BAND ? 'DOWN' : 'FLAT';
  return { direction, pct };
}

export class CalendarIpoService {
  /** Lazily constructed real signal reader (avoids load-time weight + tests inject a stub). */
  private lazySignalReader?: SignalReader;

  constructor(
    private readonly repository: CalendarRepository,
    /** Persisted-read signal verdict source for the Closed sub-tab; lazy real default below. */
    private readonly signalReader?: SignalReader,
    /** NSE+BSE forthcoming-IPO fetcher; injectable so refresh tests stay offline. */
    private readonly upcomingIpoFetcher: (now?: Date) => Promise<UpcomingIpoRecord[]> = fetchUpcomingIpos,
  ) {}

  private resolvedSignalReader(): SignalReader {
    if (this.signalReader) return this.signalReader;
    if (!this.lazySignalReader) {
      // Lazy require (not a static import): avoids eagerly pulling the whole signal-engine graph
      // into the calendar module + keeps unit tests hermetic (they inject a stub reader instead).
      const { SignalGenerationEngineService } = require('../signal-generation-engine');
      this.lazySignalReader = new SignalGenerationEngineService();
    }
    return this.lazySignalReader!;
  }

  // ---- READ: IPO assembly (Closed + Upcoming sub-tabs) --------------------

  /**
   * Closed sub-tab = already-listed IPOs over a BACKWARD ipoMonths window (decoupled from the
   * page's forward range), enriched with the real signal verdict + a recent-price trend + the
   * snapshot freshness as "health". Upcoming sub-tab = the forthcoming/ongoing NSE+BSE feed.
   */
  async assembleIpoEvents(query: CalendarQuery, warnings: string[]): Promise<CalendarEvent[]> {
    const { region, assetType, type, limit, ipoMonths } = query;
    const out: CalendarEvent[] = [];
    const wantClosed = type === 'ALL' || type === 'IPO';
    const wantUpcoming = type === 'ALL' || type === 'IPO' || type === 'IPO_UPCOMING';

    if (wantClosed) {
      const today = new Date();
      const closedTo = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      const closedFrom = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - ipoMonths, today.getUTCDate()));
      const rows = await this.repository.latestIpoSnapshots(region, assetType, closedFrom, closedTo, limit);
      if (!rows.length) {
        warnings.push('No recently-listed IPOs in this window — run a calendar refresh or widen the timeframe.');
      } else {
        const [signalMap, trendMap] = await Promise.all([
          this.signalMapFor(rows),
          this.trendMapFor(rows, closedTo),
        ]);
        out.push(
          ...rows.map((r) =>
            this.ipoToEvent(r, signalMap.get(String(r.stockId)) ?? null, trendMap.get(r.symbol) ?? null),
          ),
        );
      }
    }

    if (wantUpcoming) {
      const rows = await this.repository.listUpcomingIpos(region, limit);
      if (!rows.length) warnings.push('No forthcoming IPOs ingested yet (NSE/BSE) — run a calendar refresh.');
      out.push(...rows.map((r) => this.upcomingIpoToEvent(r)));
    }
    return out;
  }

  /** Trusted persisted signal verdict per listed IPO, keyed by stockId. Graceful: empty on error. */
  private async signalMapFor(rows: any[]): Promise<Map<string, IpoSignal>> {
    const map = new Map<string, IpoSignal>();
    const ids = [...new Set(rows.map((r) => String(r.stockId)).filter(Boolean))];
    if (!ids.length) return map;
    try {
      const sigs = await this.resolvedSignalReader().latestPersistedForInstruments(ids);
      for (const s of sigs) map.set(String(s.instrument_id), { direction: s.direction, confidence: s.confidence });
    } catch {
      // Signals are an enrichment, never a hard dependency of the persisted calendar read.
    }
    return map;
  }

  /** Recent-price trend per listed IPO, keyed by symbol, from persisted closes (no external fetch). */
  private async trendMapFor(rows: any[], asOf: Date): Promise<Map<string, IpoTrend>> {
    const map = new Map<string, IpoTrend>();
    const symbols = [...new Set(rows.map((r) => r.symbol).filter(Boolean))];
    if (!symbols.length) return map;
    const since = new Date(asOf.getTime() - TREND_WINDOW_DAYS * DAY_MS);
    const closesBySymbol = await this.repository.recentClosesForSymbols(symbols, since);
    for (const sym of symbols) {
      const t = computeTrend(closesBySymbol.get(sym));
      if (t) map.set(sym, t);
    }
    return map;
  }

  // ---- READ: mappers ------------------------------------------------------

  private ipoToEvent(r: any, signal: IpoSignal | null, trend: IpoTrend | null): CalendarEvent {
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
        // "Health" = snapshot freshness (FRESH / PARTIAL / NO_DATA).
        freshness: r.freshness ?? null,
        // Recent-direction trend (read-time, persisted closes).
        trendDirection: trend?.direction ?? null,
        trendPct: trend?.pct ?? null,
        // Real signal-engine verdict (null = not yet available; never an error).
        signalDirection: signal?.direction ?? null,
        signalConfidence: signal?.confidence ?? null,
      },
      sourceUrl: null,
    };
  }

  private upcomingIpoToEvent(r: any): CalendarEvent {
    // Anchor date: soonest of close / expected-listing / open — whichever the issue is "next" on.
    const anchor: Date | null = r.closeDate ?? r.expectedListingDate ?? r.openDate ?? r.snapshotDate ?? null;
    const exch = r.exchange ?? r.source ?? null;
    const typeLabel = r.ipoType ? `${r.ipoType === 'SME' ? 'SME' : 'Mainboard'}` : null;
    return {
      id: `ipoU:${r.source}:${r.companyName}:${isoDay(new Date(r.snapshotDate))}`,
      eventType: 'IPO_UPCOMING',
      date: (anchor ? new Date(anchor) : new Date(r.snapshotDate)).toISOString(),
      region: r.scopeRegion,
      symbol: r.symbol ?? null,
      companyName: r.companyName ?? null,
      title: r.companyName ? `${r.companyName} — IPO ${r.status === 'ONGOING' ? '(open now)' : '(upcoming)'}` : 'IPO',
      detail: [exch, typeLabel].filter(Boolean).join(' · ') || null,
      metrics: {
        status: r.status ?? null,
        exchange: exch,
        ipoType: r.ipoType ?? null,
        openDate: isoOrNull(r.openDate),
        closeDate: isoOrNull(r.closeDate),
        priceBandMin: r.priceBandMin ?? null,
        priceBandMax: r.priceBandMax ?? null,
        issueSizeCr: r.issueSizeCr ?? null,
        lotSize: r.lotSize ?? null,
        expectedListingDate: isoOrNull(r.expectedListingDate),
      },
      sourceUrl: r.sourceUrl ?? null,
    };
  }

  // ---- REFRESH: ingest the NSE+BSE forthcoming-IPO feed -------------------

  /**
   * Fetch the NSE+BSE forthcoming/ongoing IPO feed and materialize it into upcoming_ipo_snapshots
   * for the snapshot date. The fetcher is self-guarding ([] on failure), so a flaky exchange
   * yields written:0 with a soft warning — never a refresh failure. India-scope only today.
   */
  async ingestUpcomingIpos(req: CalendarRefreshRequest): Promise<CalendarRefreshSourceResult> {
    if (req.region !== 'IN') {
      return {
        processed: 0,
        written: 0,
        skipped: true,
        warnings: [`Upcoming-IPO feed is NSE/BSE (India) only; skipped for region ${req.region}.`],
      };
    }

    const records = await this.upcomingIpoFetcher(req.snapshotDate);
    if (!records.length) {
      return {
        processed: 0,
        written: 0,
        skipped: false,
        warnings: ['No forthcoming IPOs returned by NSE/BSE (source empty or temporarily unreachable).'],
      };
    }

    let written = 0;
    for (const rec of records) {
      await this.repository.upsertUpcomingIpo(req.snapshotDate, req.region, req.assetType, rec);
      written += 1;
    }
    return { processed: records.length, written, skipped: false, warnings: [] };
  }
}
