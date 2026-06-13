import { MarketDataFoundationRepository } from '../market-data-foundation.repository';
import type { CoreFundamentals } from '../market-data-foundation.types';
import { Prisma } from '@prisma/client';
// yahoo-finance2 v3 ships a class as the default export (CJS/ESM interop).
import YahooFinance from 'yahoo-finance2';

/**
 * EU (and any Yahoo-served region) fundamentals ingestion from the FREE keyless
 * Yahoo `quoteSummary` endpoint (cookie+crumb handshake handled by the
 * yahoo-finance2 library — no API key, no paid entity).
 *
 * EU has no SEC-EDGAR analog and the official ESEF XBRL repository excludes
 * Germany & Ireland, so Yahoo quoteSummary is the only free source that covers
 * the whole eurozone universe (incl. XETRA .DE).  This maps the response onto
 * the SHARED `Fundamental` model and backfills `Stock.sector / industry /
 * marketCap` + `Fundamental.officialResultDate` (next earnings date) so sector
 * filters, cap-band screening, valuation and the earnings calendar light up for
 * region='EU'.  Sector strings are Yahoo's own taxonomy (free), NOT licensed GICS.
 */

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

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
  warnings: string[];
}

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** First non-past earnings date (or the latest available) → upcoming result date. */
function pickEarningsDate(raw: unknown): Date | null {
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

  /** Ingest Yahoo fundamentals for the given region's stocks (default region 'EU'). */
  async ingestForSymbols(
    options: { region?: string; symbols?: string[]; limit?: number } = {}
  ): Promise<YahooFundamentalsSummary> {
    const region = (options.region ?? 'EU').toUpperCase();
    const summary: YahooFundamentalsSummary = {
      source: 'YAHOO_QUOTE_SUMMARY',
      region,
      processed: 0,
      updated: 0,
      noData: 0,
      earningsDates: 0,
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

    for (const stock of stocks) {
      summary.processed += 1;
      try {
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
          continue;
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
      } catch (error) {
        summary.noData += 1;
        if (summary.warnings.length < 25) summary.warnings.push(`${stock.symbol}: ${(error as Error).message}`);
      }
    }
    return summary;
  }
}

export const yahooFundamentalsService = new YahooFundamentalsService();
