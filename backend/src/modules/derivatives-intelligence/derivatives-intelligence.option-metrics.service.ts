/**
 * Option Metrics — PCR, Max Pain, Support/Resistance — Derivatives Intelligence
 *
 * Derived entirely from the already-persisted F&O bhavcopy OPTION rows
 * (OPTIDX / OPTSTK) — NO new network fetch. Computed per underlying per expiry,
 * plus a market-wide index-options aggregate row (underlying = '_MARKET_').
 *
 *   PCR (OI)        = Σ put OI / Σ call OI    (sentiment; >1 = put-heavy)
 *   Resistance      = strike with the highest CALL open interest
 *   Support         = strike with the highest PUT open interest
 *   Max Pain        = settlement strike that minimizes total option-writer payout
 *                     Σ_callK CallOI(K)·max(0, S−K) + Σ_putK PutOI(K)·max(0, K−S)
 *
 * Research-support only — descriptive, never trade advice. OI is in contracts.
 * Persisted-read on GET; computation happens at ingest-time (chained after the
 * bhavcopy ingest) or via the explicit POST/compute path.
 */

import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';

const MARKET_KEY = '_MARKET_';

export interface OptionMetricsRow {
  underlying: string;
  expiryDate: string;        // YYYY-MM-DD ('_MARKET_' aggregate uses trading date sentinel)
  isMarketAggregate: boolean;
  pcrOi: number | null;
  totalCallOi: number;
  totalPutOi: number;
  maxCallOiStrike: number | null;   // resistance
  maxPutOiStrike: number | null;    // support
  maxPainStrike: number | null;
}

export interface OptionMetricsResponse {
  status: 'ready' | 'missing' | 'error';
  tradingDate: string | null;
  fetchedAt: string;
  marketPcr: number | null;
  rows: OptionMetricsRow[];
  message?: string;
}

export interface OptionMetricsComputeResult {
  status: 'success' | 'no_data' | 'error';
  tradingDate: string | null;
  groupsComputed: number;
  message?: string;
}

async function ensureOptionMetricsTable(): Promise<void> {
  await prisma.$executeRaw(Prisma.sql`
    CREATE TABLE IF NOT EXISTS fo_option_metrics (
      trading_date         DATE          NOT NULL,
      underlying           TEXT          NOT NULL,
      expiry_date          DATE          NOT NULL,
      is_market_aggregate  BOOLEAN       NOT NULL DEFAULT FALSE,
      pcr_oi               NUMERIC(12,4),
      total_call_oi        BIGINT        NOT NULL DEFAULT 0,
      total_put_oi         BIGINT        NOT NULL DEFAULT 0,
      max_call_oi_strike   NUMERIC(14,2),
      max_put_oi_strike    NUMERIC(14,2),
      max_pain_strike      NUMERIC(14,2),
      computed_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      PRIMARY KEY (trading_date, underlying, expiry_date)
    )
  `);
  await prisma.$executeRaw(Prisma.sql`
    CREATE INDEX IF NOT EXISTS idx_fo_optmetrics_date_underlying
      ON fo_option_metrics (trading_date, underlying)
  `);
}

interface OptRow {
  underlying: string;
  expiry_date: Date;
  strike_price: number | string;
  option_type: string;
  open_interest: bigint | number;
}

interface StrikeAgg { callOi: number; putOi: number }

/** Max pain = settlement strike minimizing total writer payout across all OI. */
function computeMaxPain(byStrike: Map<number, StrikeAgg>): number | null {
  const strikes = [...byStrike.keys()].sort((a, b) => a - b);
  if (strikes.length === 0) return null;
  let best: number | null = null;
  let bestPayout = Infinity;
  for (const settle of strikes) {
    let payout = 0;
    for (const k of strikes) {
      const agg = byStrike.get(k)!;
      if (settle > k) payout += agg.callOi * (settle - k); // calls ITM
      if (settle < k) payout += agg.putOi * (k - settle);  // puts ITM
    }
    if (payout < bestPayout) { bestPayout = payout; best = settle; }
  }
  return best;
}

/**
 * Compute and persist option metrics for the given trading date (latest in the
 * bhavcopy table if omitted). Reads persisted OPT* rows only.
 */
export async function computeOptionMetrics(tradingDate?: string): Promise<OptionMetricsComputeResult> {
  try {
    await ensureOptionMetricsTable();

    let targetDate = tradingDate ?? null;
    if (!targetDate) {
      const latest = await prisma.$queryRaw<Array<{ d: Date }>>(Prisma.sql`
        SELECT MAX(trading_date) AS d FROM fo_bhavcopy_contracts
      `);
      if (!latest[0]?.d) {
        return { status: 'no_data', tradingDate: null, groupsComputed: 0, message: 'No bhavcopy rows to compute from.' };
      }
      targetDate = latest[0].d.toISOString().slice(0, 10);
    }
    const td = new Date(`${targetDate}T00:00:00.000Z`);

    const optionRows = await prisma.$queryRaw<OptRow[]>(Prisma.sql`
      SELECT underlying, expiry_date, strike_price, option_type, open_interest
      FROM fo_bhavcopy_contracts
      WHERE trading_date = ${td}
        AND instrument_type IN ('OPTIDX', 'OPTSTK')
        AND option_type IN ('CE', 'PE')
    `);
    if (optionRows.length === 0) {
      return { status: 'no_data', tradingDate: targetDate, groupsComputed: 0, message: 'No option rows for this date.' };
    }

    // Group by underlying|expiry → per-strike CE/PE OI.
    const groups = new Map<string, { underlying: string; expiry: string; byStrike: Map<number, StrikeAgg> }>();
    // Index-options market aggregate.
    let mktCall = 0;
    let mktPut = 0;

    for (const r of optionRows) {
      const underlying = r.underlying;
      const expiry = r.expiry_date.toISOString().slice(0, 10);
      const strike = Number(r.strike_price);
      const oi = Number(r.open_interest);
      const key = `${underlying}|${expiry}`;
      let g = groups.get(key);
      if (!g) { g = { underlying, expiry, byStrike: new Map() }; groups.set(key, g); }
      let agg = g.byStrike.get(strike);
      if (!agg) { agg = { callOi: 0, putOi: 0 }; g.byStrike.set(strike, agg); }
      if (r.option_type === 'CE') agg.callOi += oi; else agg.putOi += oi;
    }

    // Build per-group metric rows.
    const metricRows: OptionMetricsRow[] = [];
    for (const g of groups.values()) {
      let totalCall = 0;
      let totalPut = 0;
      let maxCallOi = -1;
      let maxPutOi = -1;
      let resistance: number | null = null;
      let support: number | null = null;
      for (const [strike, agg] of g.byStrike) {
        totalCall += agg.callOi;
        totalPut += agg.putOi;
        if (agg.callOi > maxCallOi) { maxCallOi = agg.callOi; resistance = strike; }
        if (agg.putOi > maxPutOi) { maxPutOi = agg.putOi; support = strike; }
      }
      const pcr = totalCall > 0 ? totalPut / totalCall : null;
      metricRows.push({
        underlying: g.underlying,
        expiryDate: g.expiry,
        isMarketAggregate: false,
        pcrOi: pcr,
        totalCallOi: totalCall,
        totalPutOi: totalPut,
        maxCallOiStrike: resistance,
        maxPutOiStrike: support,
        maxPainStrike: computeMaxPain(g.byStrike),
      });
    }

    // Market aggregate (index options only) — computed directly in SQL.
    const idxAgg = await prisma.$queryRaw<Array<{ call_oi: bigint | number; put_oi: bigint | number }>>(Prisma.sql`
      SELECT
        COALESCE(SUM(CASE WHEN option_type = 'CE' THEN open_interest ELSE 0 END), 0)::bigint AS call_oi,
        COALESCE(SUM(CASE WHEN option_type = 'PE' THEN open_interest ELSE 0 END), 0)::bigint AS put_oi
      FROM fo_bhavcopy_contracts
      WHERE trading_date = ${td} AND instrument_type = 'OPTIDX' AND option_type IN ('CE','PE')
    `);
    mktCall = Number(idxAgg[0]?.call_oi ?? 0);
    mktPut = Number(idxAgg[0]?.put_oi ?? 0);
    const marketPcr = mktCall > 0 ? mktPut / mktCall : null;
    metricRows.push({
      underlying: MARKET_KEY,
      expiryDate: targetDate,   // sentinel (trading date — never a real future expiry)
      isMarketAggregate: true,
      pcrOi: marketPcr,
      totalCallOi: mktCall,
      totalPutOi: mktPut,
      maxCallOiStrike: null,
      maxPutOiStrike: null,
      maxPainStrike: null,
    });

    // Chunked upsert (groups can number a few thousand).
    const CHUNK = 500;
    for (let start = 0; start < metricRows.length; start += CHUNK) {
      const chunk = metricRows.slice(start, start + CHUNK);
      const values = chunk.map((m) => Prisma.sql`(
        ${td}, ${m.underlying}, ${new Date(`${m.expiryDate}T00:00:00.000Z`)}, ${m.isMarketAggregate},
        ${m.pcrOi}, ${m.totalCallOi}, ${m.totalPutOi}, ${m.maxCallOiStrike}, ${m.maxPutOiStrike},
        ${m.maxPainStrike}, NOW()
      )`);
      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO fo_option_metrics (
          trading_date, underlying, expiry_date, is_market_aggregate,
          pcr_oi, total_call_oi, total_put_oi, max_call_oi_strike, max_put_oi_strike,
          max_pain_strike, computed_at
        )
        VALUES ${Prisma.join(values)}
        ON CONFLICT (trading_date, underlying, expiry_date) DO UPDATE SET
          is_market_aggregate = EXCLUDED.is_market_aggregate,
          pcr_oi              = EXCLUDED.pcr_oi,
          total_call_oi       = EXCLUDED.total_call_oi,
          total_put_oi        = EXCLUDED.total_put_oi,
          max_call_oi_strike  = EXCLUDED.max_call_oi_strike,
          max_put_oi_strike   = EXCLUDED.max_put_oi_strike,
          max_pain_strike     = EXCLUDED.max_pain_strike,
          computed_at         = EXCLUDED.computed_at
      `);
    }

    return { status: 'success', tradingDate: targetDate, groupsComputed: metricRows.length };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 'error', tradingDate: tradingDate ?? null, groupsComputed: 0, message: msg };
  }
}

/**
 * Persisted-read of the latest option metrics. Optionally filter to one
 * underlying. NEVER computes. Returns the near-expiry row first per underlying.
 */
export async function getLatestOptionMetrics(
  opts: { underlying?: string; limit?: number } = {},
): Promise<OptionMetricsResponse> {
  const fetchedAt = new Date().toISOString();
  const limit = Math.max(1, Math.min(opts.limit ?? 200, 2000));
  try {
    await ensureOptionMetricsTable();
    const dateRows = await prisma.$queryRaw<Array<{ d: Date }>>(Prisma.sql`
      SELECT MAX(trading_date) AS d FROM fo_option_metrics
    `);
    const latest = dateRows[0]?.d ?? null;
    if (!latest) {
      return {
        status: 'missing', tradingDate: null, fetchedAt, marketPcr: null, rows: [],
        message: 'No option metrics persisted yet. Run POST /api/v1/derivatives/fo-bhavcopy/ingest.',
      };
    }

    const underlyingFilter = opts.underlying ? opts.underlying.trim().toUpperCase() : null;
    const rows = await prisma.$queryRaw<Array<{
      underlying: string; expiry_date: Date; is_market_aggregate: boolean;
      pcr_oi: number | string | null; total_call_oi: bigint | number; total_put_oi: bigint | number;
      max_call_oi_strike: number | string | null; max_put_oi_strike: number | string | null;
      max_pain_strike: number | string | null;
    }>>(Prisma.sql`
      SELECT underlying, expiry_date, is_market_aggregate, pcr_oi, total_call_oi, total_put_oi,
             max_call_oi_strike, max_put_oi_strike, max_pain_strike
      FROM fo_option_metrics
      WHERE trading_date = ${latest}
        ${underlyingFilter ? Prisma.sql`AND underlying = ${underlyingFilter}` : Prisma.sql`AND is_market_aggregate = FALSE`}
      ORDER BY underlying ASC, expiry_date ASC
      LIMIT ${limit}
    `);

    const marketRow = await prisma.$queryRaw<Array<{ pcr_oi: number | string | null }>>(Prisma.sql`
      SELECT pcr_oi FROM fo_option_metrics
      WHERE trading_date = ${latest} AND underlying = ${MARKET_KEY}
      LIMIT 1
    `);
    const marketPcr = marketRow[0]?.pcr_oi == null ? null : Number(marketRow[0].pcr_oi);

    return {
      status: 'ready',
      tradingDate: latest.toISOString().slice(0, 10),
      fetchedAt,
      marketPcr,
      rows: rows.map((r) => ({
        underlying: r.underlying,
        expiryDate: r.expiry_date.toISOString().slice(0, 10),
        isMarketAggregate: r.is_market_aggregate,
        pcrOi: r.pcr_oi == null ? null : Number(r.pcr_oi),
        totalCallOi: Number(r.total_call_oi),
        totalPutOi: Number(r.total_put_oi),
        maxCallOiStrike: r.max_call_oi_strike == null ? null : Number(r.max_call_oi_strike),
        maxPutOiStrike: r.max_put_oi_strike == null ? null : Number(r.max_put_oi_strike),
        maxPainStrike: r.max_pain_strike == null ? null : Number(r.max_pain_strike),
      })),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 'error', tradingDate: null, fetchedAt, marketPcr: null, rows: [], message: msg };
  }
}
