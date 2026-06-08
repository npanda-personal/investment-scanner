/**
 * Futures OI Buildup — Derivatives Intelligence
 *
 * Derives, per underlying per trading day, the classic 4-quadrant open-interest
 * buildup classification from the persisted F&O bhavcopy futures rows:
 *
 *   price ↑ + OI ↑  → LONG_BUILDUP     (fresh longs)
 *   price ↓ + OI ↑  → SHORT_BUILDUP    (fresh shorts)
 *   price ↑ + OI ↓  → SHORT_COVERING   (shorts exiting)
 *   price ↓ + OI ↓  → LONG_UNWINDING   (longs exiting)
 *
 * OI is AGGREGATED across all active futures expiries for the underlying so an
 * expiry-day roll (near-month OI collapsing) is NOT misread as unwinding. Price
 * change uses the rollover-immune underlying spot (UndrlygPric) rather than a
 * single contract's settle.
 *
 * Research-support only: labels are descriptive, never buy/sell instructions.
 * Computed at ingest-time (cheap single-pass, ~220 underlyings). Reads are
 * strictly persisted (no computation on GET).
 */

import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';

export type OiBuildupLabel =
  | 'LONG_BUILDUP'
  | 'SHORT_BUILDUP'
  | 'SHORT_COVERING'
  | 'LONG_UNWINDING'
  | 'NEUTRAL';

export interface OiBuildupRow {
  underlying: string;
  instrumentType: 'FUTSTK' | 'FUTIDX';
  totalOi: number;
  oiChange: number;
  oiChangePct: number | null;
  price: number | null;
  priceChangePct: number | null;
  buildupLabel: OiBuildupLabel;
  derivativesEligible: boolean;
}

export interface OiBuildupResponse {
  status: 'ready' | 'missing' | 'error';
  tradingDate: string | null;
  fetchedAt: string;
  rows: OiBuildupRow[];
  message?: string;
}

export interface OiBuildupComputeResult {
  status: 'success' | 'no_data' | 'error';
  tradingDate: string | null;
  underlyingsComputed: number;
  message?: string;
}

// Below this absolute spot move (%) we treat price as flat → NEUTRAL unless OI
// move is itself negligible. Keeps tiny noise out of the buildup quadrants.
const PRICE_EPSILON_PCT = 0.1;

function classify(priceChangePct: number | null, oiChange: number): OiBuildupLabel {
  if (priceChangePct === null) return 'NEUTRAL';
  const priceUp = priceChangePct > PRICE_EPSILON_PCT;
  const priceDown = priceChangePct < -PRICE_EPSILON_PCT;
  const oiUp = oiChange > 0;
  const oiDown = oiChange < 0;
  if (!priceUp && !priceDown) return 'NEUTRAL';
  if (oiUp && priceUp) return 'LONG_BUILDUP';
  if (oiUp && priceDown) return 'SHORT_BUILDUP';
  if (oiDown && priceUp) return 'SHORT_COVERING';
  if (oiDown && priceDown) return 'LONG_UNWINDING';
  return 'NEUTRAL';
}

async function ensureOiBuildupTable(): Promise<void> {
  await prisma.$executeRaw(Prisma.sql`
    CREATE TABLE IF NOT EXISTS fo_oi_buildup (
      trading_date         DATE          NOT NULL,
      underlying           TEXT          NOT NULL,
      instrument_type      TEXT          NOT NULL,
      total_oi             BIGINT        NOT NULL DEFAULT 0,
      oi_change            BIGINT        NOT NULL DEFAULT 0,
      oi_change_pct        NUMERIC(10,2),
      price                NUMERIC(14,2),
      price_change_pct     NUMERIC(10,2),
      buildup_label        TEXT          NOT NULL DEFAULT 'NEUTRAL',
      derivatives_eligible BOOLEAN       NOT NULL DEFAULT FALSE,
      computed_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      PRIMARY KEY (trading_date, underlying, instrument_type)
    )
  `);
}

interface AggRow {
  underlying: string;
  instrument_type: 'FUTSTK' | 'FUTIDX';
  total_oi: bigint | number;
  oi_change: bigint | number;
  price: number | string | null;
}

/**
 * Compute and persist the OI-buildup rows for the given trading date.
 * If `tradingDate` is omitted, uses the latest date present in
 * fo_bhavcopy_contracts.
 */
export async function computeOiBuildup(tradingDate?: string): Promise<OiBuildupComputeResult> {
  try {
    await ensureOiBuildupTable();

    // Resolve the target date.
    let targetDate = tradingDate ?? null;
    if (!targetDate) {
      const latest = await prisma.$queryRaw<Array<{ d: Date }>>(Prisma.sql`
        SELECT MAX(trading_date) AS d FROM fo_bhavcopy_contracts
      `);
      if (!latest[0]?.d) {
        return { status: 'no_data', tradingDate: null, underlyingsComputed: 0, message: 'No bhavcopy rows to compute from.' };
      }
      targetDate = latest[0].d.toISOString().slice(0, 10);
    }
    const td = new Date(`${targetDate}T00:00:00.000Z`);

    // Prior trading date with data (for spot price change).
    const priorRows = await prisma.$queryRaw<Array<{ d: Date }>>(Prisma.sql`
      SELECT MAX(trading_date) AS d FROM fo_bhavcopy_contracts WHERE trading_date < ${td}
    `);
    const priorDate = priorRows[0]?.d ?? null;

    // Aggregate futures OI across all active expiries per underlying.
    const agg = await prisma.$queryRaw<AggRow[]>(Prisma.sql`
      SELECT underlying,
             instrument_type,
             SUM(open_interest)::bigint AS total_oi,
             SUM(change_in_oi)::bigint  AS oi_change,
             MAX(underlying_price)      AS price
      FROM fo_bhavcopy_contracts
      WHERE trading_date = ${td}
        AND instrument_type IN ('FUTSTK', 'FUTIDX')
      GROUP BY underlying, instrument_type
    `);
    if (agg.length === 0) {
      return { status: 'no_data', tradingDate: targetDate, underlyingsComputed: 0, message: 'No futures rows for this date.' };
    }

    // Prior-day spot per underlying.
    const priorSpot = new Map<string, number>();
    if (priorDate) {
      const priorAgg = await prisma.$queryRaw<Array<{ underlying: string; price: number | string | null }>>(Prisma.sql`
        SELECT underlying, MAX(underlying_price) AS price
        FROM fo_bhavcopy_contracts
        WHERE trading_date = ${priorDate}
          AND instrument_type IN ('FUTSTK', 'FUTIDX')
        GROUP BY underlying
      `);
      for (const r of priorAgg) {
        const p = r.price === null ? null : Number(r.price);
        if (p !== null && Number.isFinite(p)) priorSpot.set(r.underlying, p);
      }
    }

    // Which underlyings are F&O/derivatives eligible (for the eligibleOnly filter).
    const eligibleStocks = await prisma.stock.findMany({
      where: { derivativesEligible: true },
      select: { symbol: true, underlyingSymbol: true },
    });
    const eligibleSet = new Set<string>();
    for (const s of eligibleStocks) {
      if (s.symbol) eligibleSet.add(s.symbol.toUpperCase());
      if (s.underlyingSymbol) eligibleSet.add(s.underlyingSymbol.toUpperCase());
    }

    // Build and upsert rows.
    let computed = 0;
    for (const r of agg) {
      const totalOi = Number(r.total_oi);
      const oiChange = Number(r.oi_change);
      const price = r.price === null ? null : Number(r.price);
      const prior = priorSpot.get(r.underlying) ?? null;
      const priceChangePct = (price !== null && prior !== null && prior !== 0)
        ? ((price - prior) / prior) * 100
        : null;
      const priorOi = totalOi - oiChange;
      const oiChangePct = priorOi > 0 ? (oiChange / priorOi) * 100 : null;
      const label = classify(priceChangePct, oiChange);
      const eligible = eligibleSet.has(r.underlying) || r.instrument_type === 'FUTIDX';

      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO fo_oi_buildup (
          trading_date, underlying, instrument_type, total_oi, oi_change,
          oi_change_pct, price, price_change_pct, buildup_label, derivatives_eligible, computed_at
        )
        VALUES (
          ${td}, ${r.underlying}, ${r.instrument_type}, ${totalOi}, ${oiChange},
          ${oiChangePct}, ${price}, ${priceChangePct}, ${label}, ${eligible}, NOW()
        )
        ON CONFLICT (trading_date, underlying, instrument_type) DO UPDATE SET
          total_oi             = EXCLUDED.total_oi,
          oi_change            = EXCLUDED.oi_change,
          oi_change_pct        = EXCLUDED.oi_change_pct,
          price                = EXCLUDED.price,
          price_change_pct     = EXCLUDED.price_change_pct,
          buildup_label        = EXCLUDED.buildup_label,
          derivatives_eligible = EXCLUDED.derivatives_eligible,
          computed_at          = EXCLUDED.computed_at
      `);
      computed += 1;
    }

    return { status: 'success', tradingDate: targetDate, underlyingsComputed: computed };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 'error', tradingDate: tradingDate ?? null, underlyingsComputed: 0, message: msg };
  }
}

/**
 * Persisted-read of the latest OI-buildup rows. NEVER computes or ingests.
 * Sorted by absolute OI change (largest positioning shifts first).
 */
export async function getLatestOiBuildup(
  opts: { limit?: number; eligibleOnly?: boolean } = {},
): Promise<OiBuildupResponse> {
  const fetchedAt = new Date().toISOString();
  const limit = Math.max(1, Math.min(opts.limit ?? 50, 500));
  const eligibleOnly = opts.eligibleOnly ?? false;
  try {
    await ensureOiBuildupTable();
    const dateRows = await prisma.$queryRaw<Array<{ d: Date }>>(Prisma.sql`
      SELECT MAX(trading_date) AS d FROM fo_oi_buildup
    `);
    const latest = dateRows[0]?.d ?? null;
    if (!latest) {
      return {
        status: 'missing',
        tradingDate: null,
        fetchedAt,
        rows: [],
        message: 'No OI-buildup data persisted yet. Run POST /api/v1/derivatives/fo-bhavcopy/ingest.',
      };
    }

    const rows = await prisma.$queryRaw<Array<{
      underlying: string;
      instrument_type: 'FUTSTK' | 'FUTIDX';
      total_oi: bigint | number;
      oi_change: bigint | number;
      oi_change_pct: number | string | null;
      price: number | string | null;
      price_change_pct: number | string | null;
      buildup_label: OiBuildupLabel;
      derivatives_eligible: boolean;
    }>>(Prisma.sql`
      SELECT underlying, instrument_type, total_oi, oi_change, oi_change_pct,
             price, price_change_pct, buildup_label, derivatives_eligible
      FROM fo_oi_buildup
      WHERE trading_date = ${latest}
        ${eligibleOnly ? Prisma.sql`AND derivatives_eligible = TRUE` : Prisma.empty}
      ORDER BY ABS(oi_change) DESC
      LIMIT ${limit}
    `);

    return {
      status: 'ready',
      tradingDate: latest.toISOString().slice(0, 10),
      fetchedAt,
      rows: rows.map((r) => ({
        underlying: r.underlying,
        instrumentType: r.instrument_type,
        totalOi: Number(r.total_oi),
        oiChange: Number(r.oi_change),
        oiChangePct: r.oi_change_pct === null ? null : Number(r.oi_change_pct),
        price: r.price === null ? null : Number(r.price),
        priceChangePct: r.price_change_pct === null ? null : Number(r.price_change_pct),
        buildupLabel: r.buildup_label,
        derivativesEligible: r.derivatives_eligible,
      })),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 'error', tradingDate: null, fetchedAt, rows: [], message: msg };
  }
}
