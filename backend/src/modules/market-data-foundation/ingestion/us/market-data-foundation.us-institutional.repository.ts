/**
 * US Institutional / Insider read-model repository — PERSISTED-READ ONLY.
 *
 * GET-only getters over the raw-SQL landing tables populated by the Form 4 and
 * 13F ingest services (us_insider_trades, us_institutional_holdings). These
 * NEVER ingest, fetch from SEC, or write — they only read what ingestion has
 * already persisted, mirroring the persisted-read shape of the India
 * smart-money-intelligence module so US data can surface in the same UI panel.
 *
 * Research-support only: observed regulatory-filing data, not advice.
 */

import { Prisma } from '@prisma/client';
import prisma from '../../../../db/prisma';
import { ensureInsiderTradesTable } from './market-data-foundation.sec-form4.service';
import { ensureInstitutionalHoldingsTable, type TopHolder } from './market-data-foundation.sec-13f.service';

// ---------------------------------------------------------------------------
// Read-model types
// ---------------------------------------------------------------------------

export interface UsInsiderTrade {
  symbol: string;
  insiderName: string;
  insiderTitle: string | null;
  transactionCode: string;
  transactionDate: string; // YYYY-MM-DD
  shares: number | null;
  pricePerShare: number | null;
  value: number | null;
  accession: string | null;
  source: string;
}

export interface UsInstitutionalHolding {
  symbol: string | null;
  cusip: string;
  quarter: string;
  totalValue: number;
  totalShares: number;
  holderCount: number;
  topHolders: TopHolder[];
  source: string;
}

export interface UsSmartMoneySummary {
  symbol: string;
  netInsiderBuys: number;
  netInsiderSells: number;
  lastInsiderDate: string | null;
  institutionalHolderCount: number | null;
  institutionalValue: number | null;
  source: string;
  explanation: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toIsoDate(d: Date | string | null): string | null {
  if (d === null) return null;
  if (typeof d === 'string') return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'bigint' ? Number(v) : Number(v as never);
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// Getters (persisted-read only)
// ---------------------------------------------------------------------------

/** Recent insider (Form 4) transactions for a symbol, newest first. */
export async function getInsiderTradesForSymbol(
  symbol: string,
  limit = 100,
): Promise<UsInsiderTrade[]> {
  await ensureInsiderTradesTable();
  const sym = symbol.trim().toUpperCase();
  const rows = await prisma.$queryRaw<
    Array<{
      symbol: string;
      insider_name: string;
      insider_title: string | null;
      transaction_code: string;
      transaction_date: Date;
      shares: Prisma.Decimal | null;
      price_per_share: Prisma.Decimal | null;
      value: Prisma.Decimal | null;
      accession: string | null;
      source: string;
    }>
  >(Prisma.sql`
    SELECT symbol, insider_name, insider_title, transaction_code, transaction_date,
           shares, price_per_share, value, accession, source
    FROM us_insider_trades
    WHERE symbol = ${sym}
    ORDER BY transaction_date DESC, ingested_at DESC
    LIMIT ${limit}
  `);
  return rows.map((r) => ({
    symbol: r.symbol,
    insiderName: r.insider_name,
    insiderTitle: r.insider_title,
    transactionCode: r.transaction_code,
    transactionDate: toIsoDate(r.transaction_date)!,
    shares: toNumberOrNull(r.shares),
    pricePerShare: toNumberOrNull(r.price_per_share),
    value: toNumberOrNull(r.value),
    accession: r.accession,
    source: r.source,
  }));
}

/** The most recent quarter's institutional (13F) holding aggregate for a symbol. */
export async function getLatestInstitutionalHolding(
  symbol: string,
): Promise<UsInstitutionalHolding | null> {
  await ensureInstitutionalHoldingsTable();
  const sym = symbol.trim().toUpperCase();
  const rows = await prisma.$queryRaw<
    Array<{
      symbol: string | null;
      cusip: string;
      quarter: string;
      total_value: Prisma.Decimal | null;
      total_shares: Prisma.Decimal | null;
      holder_count: number;
      top_holders: unknown;
      source: string;
    }>
  >(Prisma.sql`
    SELECT symbol, cusip, quarter, total_value, total_shares, holder_count, top_holders, source
    FROM us_institutional_holdings
    WHERE symbol = ${sym}
    ORDER BY quarter DESC, ingested_at DESC
    LIMIT 1
  `);
  if (rows.length === 0) return null;
  const r = rows[0];
  const topHolders = Array.isArray(r.top_holders) ? (r.top_holders as TopHolder[]) : [];
  return {
    symbol: r.symbol,
    cusip: r.cusip,
    quarter: r.quarter,
    totalValue: toNumberOrNull(r.total_value) ?? 0,
    totalShares: toNumberOrNull(r.total_shares) ?? 0,
    holderCount: Number(r.holder_count) || 0,
    topHolders,
    source: r.source,
  };
}

/**
 * Compact US "smart money" aggregate for a symbol, shaped to align with the
 * India smart-money panel. Persisted-read only.
 *  - netInsiderBuys  = count of P (purchase) transactions
 *  - netInsiderSells = count of S (sale) transactions
 */
export async function getUsSmartMoneySummary(symbol: string): Promise<UsSmartMoneySummary> {
  await ensureInsiderTradesTable();
  const sym = symbol.trim().toUpperCase();

  const insiderRows = await prisma.$queryRaw<
    Array<{ buys: bigint; sells: bigint; last_date: Date | null }>
  >(Prisma.sql`
    SELECT
      COUNT(*) FILTER (WHERE transaction_code = 'P')::bigint AS buys,
      COUNT(*) FILTER (WHERE transaction_code = 'S')::bigint AS sells,
      MAX(transaction_date) AS last_date
    FROM us_insider_trades
    WHERE symbol = ${sym}
  `);
  const insider = insiderRows[0] ?? { buys: 0n, sells: 0n, last_date: null };

  const holding = await getLatestInstitutionalHolding(sym);

  return {
    symbol: sym,
    netInsiderBuys: Number(insider.buys) || 0,
    netInsiderSells: Number(insider.sells) || 0,
    lastInsiderDate: toIsoDate(insider.last_date),
    institutionalHolderCount: holding ? holding.holderCount : null,
    institutionalValue: holding ? holding.totalValue : null,
    source: 'SEC_EDGAR',
    explanation:
      'Research support only. Aggregated from observed SEC Form 4 (insider) and Form 13F ' +
      '(institutional) regulatory filings; not investment advice.',
  };
}
