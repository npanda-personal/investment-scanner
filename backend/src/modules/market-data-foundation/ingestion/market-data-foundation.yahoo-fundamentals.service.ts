import { MarketDataFoundationRepository } from '../market-data-foundation.repository';
import type { CoreFundamentals } from '../market-data-foundation.types';
import { eachWithConcurrency, throttleIngestion } from '../util/market-data-foundation.util.concurrency';
import { Prisma } from '@prisma/client';
// yahoo-finance2 v3 ships a class as the default export (CJS/ESM interop).
import YahooFinance from 'yahoo-finance2';

/**
 * Region-parameterized fundamentals ingestion from the FREE keyless Yahoo
 * `quoteSummary` endpoint (cookie+crumb handshake handled by the yahoo-finance2
 * library — no API key, no paid entity). Defaults to region='EU' to preserve the
 * original EU behavior; the same code path serves any Yahoo-covered region.
 *
 * EU has no SEC-EDGAR analog and the official ESEF XBRL repository excludes
 * Germany & Ireland, so Yahoo quoteSummary is the only free source that covers
 * the whole eurozone universe (incl. XETRA .DE).  For US, SEC EDGAR companyfacts
 * supplies PAST filed financials but NOT a forward next-earnings date; Yahoo's
 * `calendarEvents.earnings.earningsDate` is the free source for the FORWARD date,
 * which lights up the Earnings page "Upcoming Results" for region='US'.
 *
 * This maps the response onto the SHARED `Fundamental` model and backfills
 * `Stock.sector / industry / marketCap` + `Fundamental.officialResultDate` (next
 * earnings date) so sector filters, cap-band screening, valuation and the earnings
 * calendar light up for the chosen region.  Sector strings are Yahoo's own
 * taxonomy (free), NOT licensed GICS.
 *
 * Provider-friendliness: a 1,000+ symbol run fetches with BOUNDED CONCURRENCY
 * (default 6) plus the process-wide ingestion throttle and a consecutive-failure
 * circuit breaker, mirroring the US price maintainer (`UsEquityIngestionService.
 * backfillPrices`), so a full-universe pass never hammers Yahoo or triggers bans.
 */

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

/** Min spacing between Yahoo quoteSummary calls (process-wide throttle). */
const YAHOO_FUNDAMENTALS_THROTTLE_MS = 250;

const QS_MODULES = [
  'assetProfile',
  'summaryDetail',
  'defaultKeyStatistics',
  'financialData',
  'calendarEvents',
] as const;

export interface YahooFundamentalsSummary {
  source: 'YAHOO_QUOTE_SUMMARY';
  region: string;
  processed: number;
  updated: number;
  noData: number;
  earningsDates: number;
  /** True if the circuit breaker paused the run (Yahoo likely throttling/banning). */
  aborted: boolean;
  warnings: string[];
}

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** First non-past earnings date (or the latest available) → upcoming result date. */
export function pickEarningsDate(raw: unknown): Date | null {
  const arr = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
  const dates = arr
    .map((d) => (d instanceof Date ? d : new Date(String(d))))
    .filter((d) => d instanceof Date && Number.isFinite(d.getTime()));
  if (!dates.length) return null;
  const now = Date.now();
  const future = dates.filter((d) => d.getTime() >= now).sort((a, b) => a.getTime() - b.getTime());
  return future[0] ?? dates.sort((a, b) => b.getTime() - a.getTime())[0];
}

export class YahooFundamentalsService {
  constructor(private readonly repo = new MarketDataFoundationRepository()) {}

  private async latestClose(symbol: string, region: string): Promise<number | null> {
    const row = await this.repo.prisma.priceTick.findFirst({
      where: { symbol, region },
      orderBy: { timestamp: 'desc' },
      select: { close: true, adjustedClose: true },
    });
    if (!row) return null;
    const v = row.adjustedClose ?? row.close;
    return v != null ? Number(v) : null;
  }

  /**
   * Ingest Yahoo fundamentals for the given region's stocks.
   *
   * - `region` (default 'EU') selects which region's active, non-delisted stocks
   *   to load (or the explicit `symbols` set, scoped to that region).
   * - `concurrency` bounds parallel Yahoo calls (default 6, clamped 1..16) so a
   *   full-universe run won't hammer the provider; a process-wide throttle spaces
   *   the calls and a consecutive-failure circuit breaker pauses the run on a
   *   sustained provider failure (likely throttle/ban), mirroring the US price
   *   maintainer.
   */
  async ingestForSymbols(
    options: {
      region?: string;
      symbols?: string[];
      limit?: number;
      concurrency?: number;
      maxConsecutiveFailures?: number;
      onSymbolComplete?: (symbol: string, info: { index: number; total: number; ok: boolean }) => void;
    } = {}
  ): Promise<YahooFundamentalsSummary> {
    const region = (options.region ?? 'EU').toUpperCase();
    const summary: YahooFundamentalsSummary = {
      source: 'YAHOO_QUOTE_SUMMARY',
      region,
      processed: 0,
      updated: 0,
      noData: 0,
      earningsDates: 0,
      aborted: false,
      warnings: [],
    };

    let stocks: Array<{ id: string; symbol: string; currency: string | null }>;
    if (options.symbols && options.symbols.length) {
      const wanted = options.symbols.map((s) => s.trim().toUpperCase());
      stocks = await this.repo.prisma.stock.findMany({
        where: { region, symbol: { in: wanted } },
        select: { id: true, symbol: true, currency: true },
      });
    } else {
      stocks = await this.repo.prisma.stock.findMany({
        where: { region, isActive: true, isDelisted: false },
        select: { id: true, symbol: true, currency: true },
        take: options.limit ?? 1000,
        orderBy: { symbol: 'asc' },
      });
    }

    // Bounded concurrency + throttle + circuit breaker (mirrors UsEquityIngestionService
    // .backfillPrices). consecutiveFailures is a failure-pressure signal across the
    // interleaved workers: any success resets it, so under a genuine provider ban it
    // climbs to the threshold and the abort predicate stops launching new fetches.
    const concurrency = Math.max(1, Math.min(options.concurrency ?? (Number(process.env.MARKET_DATA_US_FETCH_CONCURRENCY) || 6), 16));
    const maxConsecutiveFailures = Math.max(1, options.maxConsecutiveFailures ?? 25);
    const total = stocks.length;
    let index = 0;
    let consecutiveFailures = 0;
    let aborted = false;

    await eachWithConcurrency(
      stocks,
      concurrency,
      async (stock) => {
        if (aborted) return;
        const myIndex = (index += 1);
        summary.processed += 1;
        try {
          await throttleIngestion(YAHOO_FUNDAMENTALS_THROTTLE_MS);
          const ok = await this.processStock(stock, region, summary);
          consecutiveFailures = 0;
          options.onSymbolComplete?.(stock.symbol, { index: myIndex, total, ok });
        } catch (error) {
          consecutiveFailures += 1;
          summary.noData += 1;
          if (summary.warnings.length < 25) summary.warnings.push(`${stock.symbol}: ${(error as Error).message}`);
          options.onSymbolComplete?.(stock.symbol, { index: myIndex, total, ok: false });
          if (consecutiveFailures >= maxConsecutiveFailures && !aborted) {
            aborted = true;
            summary.aborted = true;
            summary.warnings.push(`Circuit breaker tripped after ${consecutiveFailures} consecutive failures — pausing ${region} fundamentals ingest to avoid provider bans.`);
          }
        }
      },
      () => aborted,
    );
    if (aborted) {
      summary.warnings.push(`${region} fundamentals ingest paused early after ~${index}/${total} symbols attempted (circuit breaker tripped on sustained provider failures).`);
    }
    return summary;
  }

  /**
   * Fetch + persist one stock's Yahoo fundamentals. Returns true when a row was
   * written, false when Yahoo returned nothing usable (counted as noData). Throws
   * on a provider/persistence error so the caller's circuit breaker can react.
   */
  private async processStock(
    stock: { id: string; symbol: string; currency: string | null },
    region: string,
    summary: YahooFundamentalsSummary,
  ): Promise<boolean> {
    const r = (await (yf.quoteSummary as any)(stock.symbol, { modules: QS_MODULES })) as Record<string, any>;
    const ap = r.assetProfile ?? {};
    const sd = r.summaryDetail ?? {};
    const ks = r.defaultKeyStatistics ?? {};
    const fd = r.financialData ?? {};
    const ce = r.calendarEvents ?? {};

    const sector: string | null = typeof ap.sector === 'string' && ap.sector.trim() ? ap.sector.trim() : null;
    const industry: string | null = typeof ap.industry === 'string' && ap.industry.trim() ? ap.industry.trim() : null;

    const eps = num(ks.trailingEps);
    const shares = num(ks.sharesOutstanding);
    const revenue = num(fd.totalRevenue);
    const close = await this.latestClose(stock.symbol, region);
    const marketCap = num(sd.marketCap) ?? (shares != null && close != null ? shares * close : null);
    const trailingPe = num(sd.trailingPE) ?? (eps != null && eps > 0 && close != null ? close / eps : null);
    const profitMargins = num(fd.profitMargins);
    const currency = (typeof fd.financialCurrency === 'string' && fd.financialCurrency) ||
      (typeof sd.currency === 'string' && sd.currency) || stock.currency || 'EUR';

    // Nothing usable from Yahoo for this symbol → count as noData, don't write empties.
    if (eps == null && revenue == null && marketCap == null && sector == null) {
      summary.noData += 1;
      return false;
    }

    const fundamentals: CoreFundamentals = {
      symbol: stock.symbol,
      revenue,
      eps,
      earnings: num(ks.netIncomeToCommon),
      dividendYield: num(sd.dividendYield),
      sharesOutstanding: shares,
      marketCap,
      currency,
      periodType: 'TTM',
      ratios: {
        trailingPe,
        forwardPe: num(sd.forwardPE),
        priceToBook: num(ks.priceToBook),
        profitMargins,
        returnOnEquity: num(fd.returnOnEquity),
        debtToEquity: num(fd.debtToEquity),
      },
      source: 'YAHOO_QUOTE_SUMMARY',
      asOf: new Date().toISOString().slice(0, 10),
    };

    const row = (await this.repo.upsertFundamentals(stock.id, fundamentals)) as { id: string };

    // Upcoming earnings date → Fundamental.officialResultDate (earnings calendar).
    const earningsDate = pickEarningsDate(ce?.earnings?.earningsDate);
    if (earningsDate && row?.id) {
      await this.repo.prisma.fundamental.update({
        where: { id: row.id },
        data: { officialResultDate: earningsDate },
      });
      summary.earningsDates += 1;
    }

    await this.repo.prisma.stock.update({
      where: { id: stock.id },
      data: {
        sector: sector ?? undefined,
        industry: industry ?? undefined,
        marketCap: marketCap != null ? new Prisma.Decimal(Math.round(marketCap)) : undefined,
      },
    });
    summary.updated += 1;
    return true;
  }
}

export const yahooFundamentalsService = new YahooFundamentalsService();
