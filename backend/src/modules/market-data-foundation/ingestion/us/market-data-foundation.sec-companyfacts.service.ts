import { Prisma } from '@prisma/client';
import { MarketDataFoundationRepository } from '../../market-data-foundation.repository';
import {
  loadTickerCikMap,
  fetchSubmission,
  fetchCompanyFacts,
  latestFact,
  annualSeries,
  quarterlySeries,
} from './market-data-foundation.sec-edgar-client';
import type { CoreFundamentals } from '../../market-data-foundation.types';

/**
 * US fundamentals ingestion from SEC EDGAR (FREE, official).
 *
 * Maps SEC company facts onto the SHARED equity `Fundamental` model and
 * backfills `Stock.sector` / `Stock.industry` / `Stock.marketCap` for region='US'
 * stocks, so the Business Intelligence / Valuation dimensions, sector filters and
 * cap-band screening light up for US.  No paid data source.
 */

/** Free, hand-rolled SIC-range → broad sector mapping (NOT licensed GICS). */
export function sicToSector(sic?: string | null): string | null {
  const n = Number(String(sic || '').trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n >= 100 && n <= 999) return 'Agriculture';
  if (n >= 1000 && n <= 1499) return 'Mining & Metals';
  if (n >= 1500 && n <= 1799) return 'Construction';
  if (n >= 2800 && n <= 2899) return 'Chemicals';
  if (n >= 2833 && n <= 2836) return 'Healthcare';
  if (n >= 3570 && n <= 3579) return 'Technology';
  if (n >= 3600 && n <= 3699) return 'Technology';
  if (n >= 7370 && n <= 7379) return 'Technology';
  if (n >= 3674 && n <= 3674) return 'Technology';
  if (n >= 2000 && n <= 3999) return 'Manufacturing';
  if (n >= 4000 && n <= 4799) return 'Transportation';
  if (n >= 4800 && n <= 4899) return 'Communication';
  if (n >= 4900 && n <= 4999) return 'Utilities';
  if (n >= 5000 && n <= 5199) return 'Wholesale';
  if (n >= 5200 && n <= 5999) return 'Retail';
  if (n >= 6000 && n <= 6199) return 'Financials';
  if (n >= 6200 && n <= 6299) return 'Financials';
  if (n >= 6300 && n <= 6499) return 'Insurance';
  if (n >= 6500 && n <= 6799) return 'Real Estate';
  if (n >= 7000 && n <= 8999) return 'Services';
  return 'Other';
}

export interface UsFundamentalsSummary {
  source: 'SEC_EDGAR';
  processed: number;
  updated: number;
  noCik: number;
  noFacts: number;
  /** Total ANNUAL fiscal-year Fundamental rows written across all stocks. */
  annualPeriods: number;
  /** Total QUARTERLY fiscal-quarter Fundamental rows written across all stocks. */
  quarterlyPeriods: number;
  warnings: string[];
}

/** How many most-recent fiscal years of ANNUAL history to persist per stock. */
const MAX_ANNUAL_YEARS = 6;

/**
 * How many most-recent standalone fiscal quarters of QUARTERLY history to
 * persist per stock. 8 spans ~3 fiscal years of Q1/Q2/Q3 filings (no standalone
 * Q4 10-Q exists), giving the signal engine multiple same-quarter year-over-year
 * pairs while keeping the per-stock row count bounded.
 */
const MAX_QUARTERS = 8;

export class SecCompanyFactsService {
  constructor(private readonly repo = new MarketDataFoundationRepository()) {}

  private async latestClose(symbol: string): Promise<number | null> {
    const row = await this.repo.prisma.priceTick.findFirst({
      // region: 'US' prevents a cross-region symbol collision from picking an IN
      // price tick for a symbol that happens to share a name with a US ticker.
      // This service is US-only (all callers pass region='US' stocks from Stock.region='US').
      where: { symbol, region: 'US' },
      orderBy: { timestamp: 'desc' },
      select: { close: true, adjustedClose: true },
    });
    if (!row) return null;
    const v = row.adjustedClose ?? row.close;
    return v != null ? Number(v) : null;
  }

  /** Ingest SEC fundamentals for the given US symbols (or all priced US stocks). */
  async ingestForSymbols(options: { symbols?: string[]; limit?: number } = {}): Promise<UsFundamentalsSummary> {
    const summary: UsFundamentalsSummary = { source: 'SEC_EDGAR', processed: 0, updated: 0, noCik: 0, noFacts: 0, annualPeriods: 0, quarterlyPeriods: 0, warnings: [] };
    const cikMap = await loadTickerCikMap();

    let stocks: Array<{ id: string; symbol: string }>;
    if (options.symbols && options.symbols.length) {
      const wanted = options.symbols.map((s) => s.trim().toUpperCase());
      stocks = await this.repo.prisma.stock.findMany({
        where: { region: 'US', symbol: { in: wanted } },
        select: { id: true, symbol: true },
      });
    } else {
      stocks = await this.repo.prisma.stock.findMany({
        where: { region: 'US', isActive: true, isDelisted: false },
        select: { id: true, symbol: true },
        take: options.limit ?? 200,
        orderBy: { symbol: 'asc' },
      });
    }

    for (const stock of stocks) {
      summary.processed += 1;
      const cik = cikMap.get(stock.symbol.toUpperCase());
      if (!cik) { summary.noCik += 1; continue; }
      try {
        const [submission, facts] = await Promise.all([fetchSubmission(cik), fetchCompanyFacts(cik)]);
        const sector = sicToSector(submission.sic);
        const industry = submission.sicDescription;

        const revenueFact = latestFact(facts, ['RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenues', 'SalesRevenueNet'], 'USD');
        const netIncomeFact = latestFact(facts, ['NetIncomeLoss', 'ProfitLoss'], 'USD');
        const revenue = revenueFact?.val ?? null;
        const netIncome = netIncomeFact?.val ?? null;
        const eps = latestFact(facts, ['EarningsPerShareDiluted', 'EarningsPerShareBasic'], 'USD/shares')?.val ?? null;
        const shares =
          latestFact(facts, ['EntityCommonStockSharesOutstanding'], 'shares', 'dei')?.val ??
          latestFact(facts, ['CommonStockSharesOutstanding', 'WeightedAverageNumberOfDilutedSharesOutstanding'], 'shares')?.val ??
          null;

        // Derive the real fiscal period-end from the most-recent fact's `.end` field.
        // Falling back to today only when no fact carries an end date (should be rare).
        const periodEnd: string =
          netIncomeFact?.end ?? revenueFact?.end ?? new Date().toISOString().slice(0, 10);

        const close = await this.latestClose(stock.symbol);
        const marketCap = shares != null && close != null ? shares * close : null;
        const trailingPe = eps != null && eps > 0 && close != null ? close / eps : null;
        const profitMargins = revenue != null && revenue !== 0 && netIncome != null ? netIncome / revenue : null;

        const fundamentals: CoreFundamentals = {
          symbol: stock.symbol,
          revenue,
          eps,
          earnings: netIncome,
          dividendYield: null,
          sharesOutstanding: shares,
          marketCap,
          currency: 'USD',
          periodType: 'TTM',
          ratios: {
            trailingPe,
            forwardPe: null,
            priceToBook: null,
            profitMargins,
            returnOnEquity: null,
            debtToEquity: null,
          },
          source: 'SEC_EDGAR',
          asOf: periodEnd,
        };

        await this.repo.upsertFundamentals(stock.id, fundamentals);
        summary.annualPeriods += await this.persistAnnualHistory(stock.id, stock.symbol, facts);
        summary.quarterlyPeriods += await this.persistQuarterlyHistory(stock.id, stock.symbol, facts);
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
        summary.noFacts += 1;
        if (summary.warnings.length < 25) summary.warnings.push(`${stock.symbol}: ${(error as Error).message}`);
      }
    }
    return summary;
  }

  /**
   * Persist up to MAX_ANNUAL_YEARS fiscal-year ANNUAL Fundamental rows from the
   * already-fetched company facts, so US stocks gain the year-over-year
   * comparable the signal engine needs for revenue/EPS/margin GROWTH votes
   * (the single TTM snapshot has no prior-year same-period row to diff against).
   *
   * Each row carries the real fiscal year-end as periodEndDate; revenue / net
   * income / EPS are merged by shared year-end (one 10-K reports all three for
   * the same period). peRatio / marketCap are left null for historical periods
   * (no point-in-time price is available). Distinct from the TTM row via the
   * (stockId, periodType, periodEndDate, source) unique key. Returns the count
   * of ANNUAL rows written.
   */
  private async persistAnnualHistory(
    stockId: string,
    symbol: string,
    facts: Parameters<typeof annualSeries>[0],
  ): Promise<number> {
    const revenueByEnd = new Map(
      annualSeries(facts, ['RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenues', 'SalesRevenueNet'], 'USD').map((f) => [f.end, f.val]),
    );
    const netIncomeByEnd = new Map(annualSeries(facts, ['NetIncomeLoss', 'ProfitLoss'], 'USD').map((f) => [f.end, f.val]));
    const epsByEnd = new Map(annualSeries(facts, ['EarningsPerShareDiluted', 'EarningsPerShareBasic'], 'USD/shares').map((f) => [f.end, f.val]));

    // Fiscal year-ends that carry at least revenue or net income (EPS alone is
    // too thin to anchor a period), most-recent-first, capped to MAX_ANNUAL_YEARS.
    const ends = [...new Set([...revenueByEnd.keys(), ...netIncomeByEnd.keys()])]
      .sort((a, b) => (a < b ? 1 : -1))
      .slice(0, MAX_ANNUAL_YEARS);

    let written = 0;
    for (const end of ends) {
      const revenue = revenueByEnd.get(end) ?? null;
      const netIncome = netIncomeByEnd.get(end) ?? null;
      const eps = epsByEnd.get(end) ?? null;
      if (revenue == null && netIncome == null && eps == null) continue;
      const profitMargins = revenue != null && revenue !== 0 && netIncome != null ? netIncome / revenue : null;

      const annual: CoreFundamentals = {
        symbol,
        revenue,
        eps,
        earnings: netIncome,
        dividendYield: null,
        sharesOutstanding: null,
        marketCap: null,
        currency: 'USD',
        periodType: 'ANNUAL',
        ratios: {
          trailingPe: null,
          forwardPe: null,
          priceToBook: null,
          profitMargins,
          returnOnEquity: null,
          debtToEquity: null,
        },
        source: 'SEC_EDGAR',
        asOf: end,
      };
      await this.repo.upsertFundamentals(stockId, annual);
      written += 1;
    }
    return written;
  }

  /**
   * Persist up to MAX_QUARTERS standalone-quarter QUARTERLY Fundamental rows from
   * the already-fetched company facts. US stocks previously had only the single
   * TTM snapshot plus ANNUAL history; the signal engine's GROWTH / margin-trend
   * votes prefer the most-recent non-TTM fiscal record and compare it to the
   * same period one year prior, so persisting standalone quarters lets US fire
   * the more-timely quarter-over-prior-year-quarter comparison (instead of only
   * the annual one) — the same path IN already exercises with its QUARTERLY rows.
   *
   * Each row carries the real fiscal quarter-end as periodEndDate; revenue / net
   * income / EPS are merged by shared quarter-end. peRatio / marketCap are left
   * null (no point-in-time price for a historical quarter). Distinct from the
   * TTM and ANNUAL rows via the (stockId, periodType, periodEndDate, source)
   * unique key. Returns the count of QUARTERLY rows written.
   */
  private async persistQuarterlyHistory(
    stockId: string,
    symbol: string,
    facts: Parameters<typeof quarterlySeries>[0],
  ): Promise<number> {
    const revenueByEnd = new Map(
      quarterlySeries(facts, ['RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenues', 'SalesRevenueNet'], 'USD').map((f) => [f.end, f.val]),
    );
    const netIncomeByEnd = new Map(quarterlySeries(facts, ['NetIncomeLoss', 'ProfitLoss'], 'USD').map((f) => [f.end, f.val]));
    const epsByEnd = new Map(quarterlySeries(facts, ['EarningsPerShareDiluted', 'EarningsPerShareBasic'], 'USD/shares').map((f) => [f.end, f.val]));

    // Quarter-ends that carry at least revenue or net income (EPS alone is too
    // thin to anchor a period), most-recent-first, capped to MAX_QUARTERS.
    const ends = [...new Set([...revenueByEnd.keys(), ...netIncomeByEnd.keys()])]
      .sort((a, b) => (a < b ? 1 : -1))
      .slice(0, MAX_QUARTERS);

    let written = 0;
    for (const end of ends) {
      const revenue = revenueByEnd.get(end) ?? null;
      const netIncome = netIncomeByEnd.get(end) ?? null;
      const eps = epsByEnd.get(end) ?? null;
      if (revenue == null && netIncome == null && eps == null) continue;
      const profitMargins = revenue != null && revenue !== 0 && netIncome != null ? netIncome / revenue : null;

      const quarterly: CoreFundamentals = {
        symbol,
        revenue,
        eps,
        earnings: netIncome,
        dividendYield: null,
        sharesOutstanding: null,
        marketCap: null,
        currency: 'USD',
        periodType: 'QUARTERLY',
        ratios: {
          trailingPe: null,
          forwardPe: null,
          priceToBook: null,
          profitMargins,
          returnOnEquity: null,
          debtToEquity: null,
        },
        source: 'SEC_EDGAR',
        asOf: end,
      };
      await this.repo.upsertFundamentals(stockId, quarterly);
      written += 1;
    }
    return written;
  }
}

export const secCompanyFactsService = new SecCompanyFactsService();
