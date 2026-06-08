/**
 * US Earnings-Date Adapter — SEC EDGAR company-facts approach (FREE, official).
 *
 * Strategy: use the already-present XbrlFact.filed date from the SEC EDGAR
 * company-facts endpoint as the "earnings announcement date" (officialResultDate)
 * for US fundamentals.  The `filed` field on each XBRL fact point is the date
 * the filing was submitted to EDGAR — for 10-Q and 10-K filings this is the
 * closest publicly-available proxy for the earnings announcement date available
 * without scraping 8-K filings individually.
 *
 * Matching logic (idempotent, additive):
 *  1. For each US Stock that has at least one Fundamental row, look up the CIK.
 *  2. Fetch company-facts from SEC EDGAR (reuses the existing sec-edgar-client).
 *  3. Collect ALL fact datapoints (across the revenue/net-income concepts below)
 *     whose `form` is '10-Q', '10-K', '10-Q/A' or '10-K/A' and that carry a
 *     non-empty `filed` date.
 *  4. Pick the datapoint with the MAX `filed` date (most recent SEC submission).
 *  5. Write that `filed` date to EVERY Fundamental row for this stock that
 *     currently has officialResultDate = NULL, or where the stored date differs
 *     (fully idempotent, only writes on change).
 *
 * NOTE: this approach does NOT depend on Fundamental.periodEndDate at all.
 * The previous implementation matched `periodEndDate` against fact `.end` dates
 * within ±5 days; that broke when periodEndDate was incorrectly stored as
 * today's date (a bug in sec-companyfacts.service.ts that is also fixed in this
 * PR).  The new approach derives officialResultDate solely from the SEC facts.
 *
 * Limitations / owner notes:
 *  - The `filed` date of a 10-Q/10-K is the SEC submission date, NOT the
 *    earnings-call date.  For most companies the 10-Q is filed within 1–2 days
 *    of the earnings call; for a precise earnings-call date the owner should
 *    integrate an earnings-calendar provider (e.g. Yahoo Finance /calendar/earnings
 *    or a free scrape of SEC 8-K Item 2.02 filings).  This adapter is intentionally
 *    conservative — it uses the filing date rather than guessing.
 *  - Run via `scripts/seed-us-earnings.ts` (do NOT run prisma migrate).
 *  - EARN_LIMIT env var (or --limit CLI arg) caps the number of stocks processed.
 */

import prisma from '../../db/prisma';
import {
  loadTickerCikMap,
  fetchCompanyFacts,
  type CompanyFacts,
  type XbrlFact,
} from '../market-data-foundation/market-data-foundation.sec-edgar-client';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface UsEarningsDateIngestOptions {
  /** Only process these symbols (uppercase). If omitted, all US stocks. */
  symbols?: string[];
  /** Max number of stocks to process. Reads EARN_LIMIT env var. Default 100. */
  limit?: number;
}

export interface UsEarningsDateIngestSummary {
  source: 'SEC_EDGAR_FILING_DATE';
  processed: number;
  updated: number;
  noCik: number;
  noFacts: number;
  alreadySet: number;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Concepts and form types searched for the most-recent filing date
// ---------------------------------------------------------------------------

const EARNINGS_CONCEPTS = ['NetIncomeLoss', 'ProfitLoss', 'Revenues', 'SalesRevenueNet'] as const;
const EARNINGS_FORMS = new Set(['10-Q', '10-K', '10-Q/A', '10-K/A']);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse an ISO date string (YYYY-MM-DD) to UTC-midnight Date, or null. */
function parseIsoDate(raw: string | null | undefined): Date | null {
  const text = (raw ?? '').trim();
  const m = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Absolute day difference between two dates. */
function daysDiff(a: Date, b: Date): number {
  return Math.round(Math.abs(a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * From the SEC EDGAR company-facts for a given CIK, find the MOST RECENT
 * filing date across all 10-Q / 10-K fact datapoints for the canonical
 * earnings concepts (NetIncomeLoss, ProfitLoss, Revenues, SalesRevenueNet).
 *
 * Returns the `filed` date string (YYYY-MM-DD) of the datapoint with the
 * maximum filed value, or null if no qualifying datapoint exists.
 *
 * This does NOT require a periodEndDate match — it simply picks the latest
 * annual/quarterly filing that carried any of the target concepts, which
 * represents the most recent earnings disclosure by the company.
 */
export function findMostRecentFilingDate(facts: CompanyFacts): string | null {
  let bestFiled: string | null = null;

  for (const concept of EARNINGS_CONCEPTS) {
    const units = facts.usGaap[concept];
    if (!units) continue;
    const points: XbrlFact[] = units['USD'] ?? [];
    for (const point of points) {
      if (!point.filed) continue;
      if (!EARNINGS_FORMS.has(point.form ?? '')) continue;
      // Lexicographic comparison is safe for ISO date strings (YYYY-MM-DD).
      if (bestFiled === null || point.filed > bestFiled) {
        bestFiled = point.filed;
      }
    }
  }

  return bestFiled;
}

// ---------------------------------------------------------------------------
// Legacy export kept for any callers that still reference it
// (it is no longer used by UsEarningsDateAdapter.ingest but may be referenced
//  in tests or other modules; retaining avoids breaking changes).
// ---------------------------------------------------------------------------

/** @deprecated Use findMostRecentFilingDate instead. */
export function findFilingDateForPeriodEnd(
  facts: CompanyFacts,
  _periodEndDate: Date
): string | null {
  // Delegate to the new period-end-independent implementation so that any
  // residual callers still get a meaningful result.
  return findMostRecentFilingDate(facts);
}

// ---------------------------------------------------------------------------
// Main service class
// ---------------------------------------------------------------------------

export class UsEarningsDateAdapter {
  constructor(private readonly db = prisma as any) {}

  /**
   * Ingest officialResultDate into Fundamental rows for US tickers.
   * Uses SEC EDGAR company-facts (free, official).
   *
   * For each stock the most-recent 10-Q/10-K `filed` date (across
   * NetIncomeLoss / ProfitLoss / Revenues / SalesRevenueNet concepts) is
   * written to ALL of that stock's Fundamental rows.  The adapter does NOT
   * depend on Fundamental.periodEndDate, so it works regardless of whether
   * the fundamentals ingest stored a real quarter-end or today's date.
   *
   * Idempotent: only writes when the stored value is null or differs.
   */
  async ingest(options: UsEarningsDateIngestOptions = {}): Promise<UsEarningsDateIngestSummary> {
    const summary: UsEarningsDateIngestSummary = {
      source: 'SEC_EDGAR_FILING_DATE',
      processed: 0,
      updated: 0,
      noCik: 0,
      noFacts: 0,
      alreadySet: 0,
      warnings: [],
    };

    const effectiveLimit = options.limit
      ?? (Number(process.env.EARN_LIMIT || '100') || 100);

    const cikMap = await loadTickerCikMap();

    // Load US stocks that have at least one Fundamental row
    let stocks: Array<{ id: string; symbol: string }>;
    if (options.symbols && options.symbols.length > 0) {
      const wanted = options.symbols.map((s) => s.trim().toUpperCase());
      stocks = await this.db.stock.findMany({
        where: { region: 'US', symbol: { in: wanted } },
        select: { id: true, symbol: true },
      });
    } else {
      stocks = await this.db.stock.findMany({
        where: {
          region: 'US',
          isActive: true,
          isDelisted: false,
          fundamentals: { some: {} },
        },
        select: { id: true, symbol: true },
        take: effectiveLimit,
        orderBy: { symbol: 'asc' },
      });
    }

    for (const stock of stocks) {
      summary.processed += 1;
      const cik = cikMap.get(stock.symbol.toUpperCase());
      if (!cik) {
        summary.noCik += 1;
        continue;
      }

      try {
        const facts = await fetchCompanyFacts(cik);

        // Derive the most-recent filing date directly from facts — no periodEndDate needed.
        const filedDateStr = findMostRecentFilingDate(facts);
        if (!filedDateStr) {
          summary.noFacts += 1;
          continue;
        }

        const parsedFiled = parseIsoDate(filedDateStr);
        if (!parsedFiled) {
          summary.noFacts += 1;
          continue;
        }

        // Load all Fundamental rows for this stock
        const fundamentalRows: Array<{ id: string; officialResultDate: Date | null }> =
          await this.db.fundamental.findMany({
            where: { stockId: stock.id },
            select: { id: true, officialResultDate: true },
          });

        for (const row of fundamentalRows) {
          // Idempotent: skip if already set to the same value
          if (row.officialResultDate) {
            const existingDiff = daysDiff(row.officialResultDate, parsedFiled);
            if (existingDiff === 0) {
              summary.alreadySet += 1;
              continue;
            }
          }

          await this.db.fundamental.update({
            where: { id: row.id },
            data: { officialResultDate: parsedFiled },
          });
          summary.updated += 1;
        }
      } catch (error) {
        summary.noFacts += 1;
        if (summary.warnings.length < 25) {
          summary.warnings.push(`${stock.symbol}: ${(error as Error).message}`);
        }
      }
    }

    return summary;
  }
}

export const usEarningsDateAdapter = new UsEarningsDateAdapter();
