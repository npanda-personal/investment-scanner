/**
 * Macro snapshot read-model — PERSISTED-READ ONLY.
 *
 * GET-only getter over the raw-SQL landing table `macro_snapshots` populated by
 * the FRED macro ingest service. NEVER ingests, fetches, or writes — it only
 * reads what ingestion has already persisted, so it surfaces on trader-facing
 * market-context reads as a persisted read (no live FRED fetch on a GET).
 *
 * Returns the latest row for the GLOBAL region mapped to a MacroSnapshot, or
 * null when no row exists (callers fall back to the legacy UNKNOWN/MISSING
 * stub). Research support only — a macro regime read, not advice.
 */

import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';
import type { MacroSnapshot, MacroStatus } from './market-context-intelligence.types';
import type { MarketDataStatus } from '../market-data-foundation';

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'bigint' ? Number(v) : Number(v as never);
  return Number.isFinite(n) ? n : null;
}

interface MacroSnapshotRow {
  interest_rate_proxy: Prisma.Decimal | null;
  inflation_proxy: Prisma.Decimal | null;
  usd_strength_proxy: Prisma.Decimal | null;
  commodity_proxy: Prisma.Decimal | null;
  macro_status: string;
  data_status: string;
  explanation: string | null;
}

/**
 * Latest persisted GLOBAL macro snapshot mapped to MacroSnapshot, or null when
 * none exists. Reads only — never creates the table or ingests. When the table
 * does not exist yet (FRED never ingested), the query throws; the caller treats
 * that as "no macro row" via the returned null.
 */
export async function getLatestMacroSnapshot(region: string = 'GLOBAL'): Promise<MacroSnapshot | null> {
  let rows: MacroSnapshotRow[];
  try {
    rows = await prisma.$queryRaw<MacroSnapshotRow[]>(Prisma.sql`
      SELECT interest_rate_proxy, inflation_proxy, usd_strength_proxy,
             commodity_proxy, macro_status, data_status, explanation
      FROM macro_snapshots
      WHERE region = ${region}
      ORDER BY snapshot_date DESC
      LIMIT 1
    `);
  } catch {
    // Table not created yet (FRED ingest has never run) → no macro row.
    return null;
  }
  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    interestRateProxy: toNumberOrNull(row.interest_rate_proxy),
    inflationProxy: toNumberOrNull(row.inflation_proxy),
    usdStrengthProxy: toNumberOrNull(row.usd_strength_proxy),
    commodityProxy: toNumberOrNull(row.commodity_proxy),
    macroStatus: (row.macro_status as MacroStatus) || 'UNKNOWN',
    dataStatus: (row.data_status as MarketDataStatus) || 'MISSING',
    explanation: row.explanation || 'Macro regime read from persisted FRED data.',
  };
}
