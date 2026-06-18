/**
 * US Daily Short-Volume read-model repository — PERSISTED-READ ONLY.
 *
 * GET-only getter over the raw-SQL landing table `us_short_volume` populated by
 * the FINRA Reg SHO ingest service. NEVER ingests, fetches, or writes — it only
 * reads what ingestion has already persisted, so it can surface on the
 * trader-facing US smart-money panel as a persisted read.
 *
 * Metric honesty: this is the DAILY SHORT-SALE VOLUME SHARE
 * (short_volume / total_volume), a short-pressure PROXY — NOT bi-monthly short
 * interest (the outstanding short position). Labelled "Short Volume %" /
 * "Daily Short Pressure". Research support only, not advice.
 */

import { Prisma } from '@prisma/client';
import prisma from '../../../../db/prisma';
import { ensureShortVolumeTable } from './market-data-foundation.finra-short-volume.service';

export interface UsShortPressure {
  symbol: string;
  /** Latest session's short-sale volume share (%), or null if total volume was 0. */
  shortVolumePct: number | null;
  /** ISO date (YYYY-MM-DD) of the latest session. */
  tradingDate: string;
  /** Average short volume % across the latest up-to-5 sessions (nulls skipped). */
  avg5dPct: number | null;
  /** Number of sessions backing the 5-day average. */
  sessionsInAvg: number;
  source: string;
}

function toIsoDate(d: Date | string): string {
  if (typeof d === 'string') return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'bigint' ? Number(v) : Number(v as never);
  return Number.isFinite(n) ? n : null;
}

/**
 * Latest persisted short-pressure (daily short-volume %) for a symbol, plus the
 * trailing 5-session average. Returns null when no rows exist for the symbol.
 * Persisted-read only; ensures the landing table exists first (safe no-op if
 * already created by ingestion).
 */
export async function getShortPressureForSymbol(symbol: string): Promise<UsShortPressure | null> {
  await ensureShortVolumeTable();
  const sym = symbol.trim().toUpperCase();
  const rows = await prisma.$queryRaw<
    Array<{
      symbol: string;
      trading_date: Date;
      short_volume_pct: Prisma.Decimal | null;
      source: string;
    }>
  >(Prisma.sql`
    SELECT symbol, trading_date, short_volume_pct, source
    FROM us_short_volume
    WHERE symbol = ${sym}
    ORDER BY trading_date DESC
    LIMIT 5
  `);
  if (rows.length === 0) return null;

  const latest = rows[0];
  const pcts = rows
    .map((r) => toNumberOrNull(r.short_volume_pct))
    .filter((n): n is number => n !== null);
  const avg5dPct =
    pcts.length > 0 ? Number((pcts.reduce((a, b) => a + b, 0) / pcts.length).toFixed(4)) : null;

  return {
    symbol: latest.symbol,
    shortVolumePct: toNumberOrNull(latest.short_volume_pct),
    tradingDate: toIsoDate(latest.trading_date),
    avg5dPct,
    sessionsInAvg: pcts.length,
    source: latest.source,
  };
}
