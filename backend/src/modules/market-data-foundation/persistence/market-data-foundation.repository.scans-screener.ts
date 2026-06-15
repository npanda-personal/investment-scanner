import { Prisma, PrismaClient } from '@prisma/client';
import { normalizeMarketRegion } from '../../../shared/utils/market-scope';
// Import the factor-family helper from the PURE leaf (documented dependency-free, cycle-safe),
// NOT the signal-generation-engine barrel: the barrel re-exports the engine service, which
// itself imports MarketDataFoundationService — importing it here would close a runtime init
// cycle (ScreenerRepository "is not a constructor"). The leaf imports only types.
import { familyForCode } from '../../signal-generation-engine/signal-evidence';

export class ScreenerRepository {
  constructor(private readonly prisma: PrismaClient) {}



  // ---------------------------------------------------------------------------
  // Multi-Factor Screener
  // ---------------------------------------------------------------------------

  /**
   * Multi-factor stock screener.
   * All filters are combinable; every field is honest-null when its source is absent.
   * Entirely persisted-read — no generation on GET.
   *
   * Cap-band thresholds (1 Cr = 1e7 INR, stocks.marketCap stored in INR):
   *   LARGE  >= 20 000 Cr (2e11)
   *   MID    5 000–20 000 Cr (5e10–2e11)
   *   SMALL  <  5 000 Cr (<5e10)
   */
  async screener(options: {
    region?: string;
    signalDirection?: string;
    minScore?: number;
    minRsPercentile?: number;
    sector?: string;
    capBand?: 'LARGE' | 'MID' | 'SMALL';
    minDeliveryPct?: number;
    min52wPositionPct?: number;
    excludeFnoBan?: boolean;
    onlyDerivativesEligible?: boolean;
    limit?: number;
  }): Promise<Array<{
    instrumentId: string;
    symbol: string;
    companyName: string;
    price: number | null;
    signalDirection: string | null;
    signalScore: number | null;
    rsPercentile: number | null;
    sector: string | null;
    capBand: string | null;
    deliveryPct: number | null;
    range52wPositionPct: number | null;
    inFnoBan: boolean;
    buildupLabel: string | null;
    oiChangePct: number | null;
    pcrOi: number | null;
    scoreDeltaPrev: number | null;
    isNewEntry: boolean;
    factorFamilies: Record<string, number> | null;
  }>> {
    const rowLimit = Math.max(1, Math.min(options.limit ?? 50, 500));
    const LARGE_CAP_THRESHOLD = 2e11; // 20 000 Cr in INR
    const MID_CAP_THRESHOLD = 5e10;   // 5 000 Cr in INR
    const LOOKBACK_DAYS = 365;

    const filters: Prisma.Sql[] = [
      Prisma.sql`s."isActive" = TRUE`,
      Prisma.sql`s."isDelisted" = FALSE`,
      Prisma.sql`UPPER(COALESCE(s."providerSupportStatus", 'UNSUPPORTED')) = 'SUPPORTED'`,
    ];

    const normalizedRegion = normalizeMarketRegion(options.region);
    if (normalizedRegion) {
      // Region-scope the universe (IN/US/EU). Without this the screener mixes regions.
      filters.push(Prisma.sql`UPPER(COALESCE(s."region", '')) = ${normalizedRegion}`);
    }
    // Push the same region scope INTO the latest_price CTE so the expensive
    // per-stock price lateral joins only run for the selected region's stocks
    // (otherwise the CTE scans every region's full price history before the
    // outer region filter applies — the root of the screener's slowness).
    const cteRegionFilter = normalizedRegion
      ? Prisma.sql`AND UPPER(COALESCE(s."region", '')) = ${normalizedRegion}`
      : Prisma.empty;

    if (options.signalDirection) {
      filters.push(Prisma.sql`ls."signalDirection" = UPPER(${options.signalDirection})`);
    }
    if (options.minScore != null) {
      filters.push(Prisma.sql`ls."signalScore" >= ${options.minScore}`);
    }
    if (options.sector) {
      filters.push(Prisma.sql`UPPER(COALESCE(s.sector, '')) = UPPER(${options.sector})`);
    }
    if (options.capBand) {
      if (options.capBand === 'LARGE') {
        filters.push(Prisma.sql`s."marketCap" >= ${LARGE_CAP_THRESHOLD}`);
      } else if (options.capBand === 'MID') {
        filters.push(Prisma.sql`s."marketCap" >= ${MID_CAP_THRESHOLD} AND s."marketCap" < ${LARGE_CAP_THRESHOLD}`);
      } else if (options.capBand === 'SMALL') {
        filters.push(Prisma.sql`(s."marketCap" IS NULL OR s."marketCap" < ${MID_CAP_THRESHOLD})`);
      }
    }
    if (options.minDeliveryPct != null) {
      // Alias is `ld` (latest_delivery) in both query shapes — `dd` was a stale alias that
      // would error whenever this filter was active.
      filters.push(Prisma.sql`ld."deliveryPct" >= ${options.minDeliveryPct}`);
    }
    if (options.min52wPositionPct != null) {
      filters.push(Prisma.sql`pr."range52wPositionPct" >= ${options.min52wPositionPct}`);
    }
    if (options.excludeFnoBan) {
      filters.push(Prisma.sql`COALESCE(fno."inBan", FALSE) = FALSE`);
    }
    if (options.onlyDerivativesEligible) {
      // Restrict the universe to F&O-eligible underlyings (the "Top F&O" view).
      filters.push(Prisma.sql`s."derivativesEligible" = TRUE`);
    }

    // rs percentile filter applied post-query in service layer (it's relative within the result set)

    const whereClause = Prisma.join(filters, ' AND ');

    // Normalized cash symbol for joining the F&O read-model tables (fo_oi_buildup /
    // fo_option_metrics key on the bare NSE symbol, e.g. RELIANCE). Mirrors the
    // price_symbol derivation used for price_ticks.
    const foJoinSymbol = Prisma.sql`UPPER(regexp_replace(
      COALESCE(NULLIF(s."sourceSymbol", ''), NULLIF(s.symbol, ''), NULLIF(s."providerSymbol", '')),
      '\\.(NS|BO)$', '', 'i'
    ))`;

    // Latest-date F&O positioning + option-sentiment read models (one row per
    // underlying; near-expiry PCR first). Used by the F&O readiness composite.
    const foCtes = Prisma.sql`
      fo_oi AS (
        SELECT DISTINCT ON (b.underlying)
          b.underlying, b.buildup_label AS "buildupLabel", b.oi_change_pct AS "oiChangePct"
        FROM fo_oi_buildup b
        WHERE b.trading_date = (SELECT MAX(trading_date) FROM fo_oi_buildup)
        ORDER BY b.underlying, b.instrument_type
      ),
      fo_opt AS (
        SELECT DISTINCT ON (m.underlying)
          m.underlying, m.pcr_oi AS "pcrOi"
        FROM fo_option_metrics m
        WHERE m.trading_date = (SELECT MAX(trading_date) FROM fo_option_metrics)
          AND m.is_market_aggregate = FALSE
        ORDER BY m.underlying, m.expiry_date ASC
      )`;

    type ScreenerRow = {
      instrumentId: string;
      symbol: string;
      companyName: string;
      price: Prisma.Decimal | null;
      signalDirection: string | null;
      signalScore: Prisma.Decimal | null;
      priorScore: Prisma.Decimal | null;
      triggeredSignals: unknown;
      sector: string | null;
      marketCap: Prisma.Decimal | null;
      deliveryPct: Prisma.Decimal | null;
      range52wPositionPct: Prisma.Decimal | null;
      inFnoBan: boolean;
      buildupLabel: string | null;
      oiChangePct: Prisma.Decimal | null;
      pcrOi: Prisma.Decimal | null;
    };

    // FAST PATH (no min52wPositionPct filter — the common case incl. the default no-filter load):
    // rank + LIMIT on the cheap columns first, then compute latest price + 52-week range ONLY for
    // the ~50 returned rows. The full query below computed the 52w range for the ENTIRE ~2900-stock
    // universe on every request (EXPLAIN ANALYZE: price_range = 4.2s of 6.9s; 20-35s under load),
    // even though price/52w are used only for OUTPUT, never as filter or sort keys. Limiting first
    // is therefore equivalent and cuts isolated time ~6.9s -> ~1.9s (no more LOADING_STUCK stalls).
    const fastQuery = Prisma.sql`
      WITH latest_signal AS MATERIALIZED (
        SELECT DISTINCT ON (sr."instrumentId")
          sr."instrumentId", sr.direction AS "signalDirection", sr.score AS "signalScore",
          sr."priorScore" AS "priorScore", sr."triggeredSignals" AS "triggeredSignals"
        FROM signal_results sr
        WHERE sr."generatedDate" IS NOT NULL
        ORDER BY sr."instrumentId", sr."generatedDate" DESC
      ),
      latest_delivery AS MATERIALIZED (
        SELECT DISTINCT ON (d.symbol) d.symbol, d."deliveryPercent" AS "deliveryPct"
        FROM market_delivery_snapshots d
        WHERE d."deliveryPercent" IS NOT NULL AND d."deliveryPercent" > 0
        ORDER BY d.symbol, d."tradingDate" DESC
      ),
      fno_ban AS (
        SELECT fbl.symbol, TRUE AS "inBan"
        FROM fno_ban_list fbl
        WHERE fbl.ban_date = (SELECT MAX(ban_date) FROM fno_ban_list)
      ),
      ${foCtes},
      ranked AS (
        SELECT
          s.id AS "instrumentId", s.symbol, COALESCE(s.name, s.symbol) AS "companyName",
          regexp_replace(
            COALESCE(NULLIF(s."sourceSymbol", ''), NULLIF(s.symbol, ''), NULLIF(s."providerSymbol", '')),
            '\\.(NS|BO)$', '', 'i'
          ) AS price_symbol,
          ls."signalDirection", ls."signalScore", ls."priorScore", ls."triggeredSignals", s.sector, s."marketCap",
          ld."deliveryPct", COALESCE(fno."inBan", FALSE) AS "inFnoBan",
          foi."buildupLabel", foi."oiChangePct", fopt."pcrOi"
        FROM stocks s
        LEFT JOIN latest_signal ls ON ls."instrumentId" = s.id
        LEFT JOIN latest_delivery ld ON ld.symbol = s.symbol
        LEFT JOIN fno_ban fno ON fno.symbol = s.symbol
        LEFT JOIN fo_oi foi ON foi.underlying = ${foJoinSymbol}
        LEFT JOIN fo_opt fopt ON fopt.underlying = ${foJoinSymbol}
        WHERE ${whereClause}
        ORDER BY COALESCE(ls."signalScore", 0) DESC
        LIMIT ${rowLimit}
      )
      SELECT
        r."instrumentId", r.symbol, r."companyName",
        lp.price AS price, r."signalDirection", r."signalScore", r."priorScore", r."triggeredSignals",
        r.sector, r."marketCap", r."deliveryPct",
        CASE
          WHEN rng."high52w" > rng."low52w"
          THEN ((lp.price - rng."low52w") / NULLIF(rng."high52w" - rng."low52w", 0) * 100)
          ELSE NULL
        END AS "range52wPositionPct",
        r."inFnoBan", r."buildupLabel", r."oiChangePct", r."pcrOi"
      FROM ranked r
      LEFT JOIN LATERAL (
        SELECT COALESCE(pt."adjustedClose", pt.close) AS price, pt.timestamp AS price_ts
        FROM price_ticks pt
        WHERE pt.symbol = r.price_symbol
          AND UPPER(COALESCE(pt."dataStatus", 'COMPLETE')) = 'COMPLETE'
          AND UPPER(COALESCE(pt.source, '')) NOT LIKE 'TEST\\_%'
        ORDER BY pt.timestamp DESC
        LIMIT 1
      ) lp ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          MAX(COALESCE(pt."adjustedClose", pt.close)) AS "high52w",
          MIN(COALESCE(pt."adjustedClose", pt.close)) AS "low52w"
        FROM price_ticks pt
        WHERE pt.symbol = r.price_symbol
          AND pt.timestamp >= lp.price_ts - (${LOOKBACK_DAYS} * INTERVAL '1 day')
          AND pt.timestamp < lp.price_ts
          AND UPPER(COALESCE(pt."dataStatus", 'COMPLETE')) = 'COMPLETE'
          AND UPPER(COALESCE(pt.source, '')) NOT LIKE 'TEST\\_%'
      ) rng ON TRUE
      ORDER BY COALESCE(r."signalScore", 0) DESC
    `;

    // FULL PATH (min52wPositionPct filter active): the 52w range must be known before filtering,
    // so it is computed for the universe up front. All heavy CTEs are MATERIALIZED so the planner
    // computes each once and HASH-joins them. Without this, the functional region/support predicates
    // make Postgres underestimate the stocks row count (rows=1) and pick a nested loop that
    // re-evaluates the full signal/delivery sorts PER stock (the cause of the screener's hang).
    const fullQuery = Prisma.sql`
      WITH latest_signal AS MATERIALIZED (
        SELECT DISTINCT ON (sr."instrumentId")
          sr."instrumentId",
          sr.direction AS "signalDirection",
          sr.score     AS "signalScore",
          sr."priorScore" AS "priorScore",
          sr."triggeredSignals" AS "triggeredSignals"
        FROM signal_results sr
        WHERE sr."generatedDate" IS NOT NULL
        ORDER BY sr."instrumentId", sr."generatedDate" DESC
      ),
      -- MATERIALIZED: compute the region-scoped latest price ONCE (small result)
      -- so the planner can't inline + re-evaluate it inside price_range and the
      -- final join (the cause of the screener's multi-minute pathological plan).
      latest_price AS MATERIALIZED (
        -- Latest price per stock via an index-backed LATERAL LIMIT 1 (no global
        -- DISTINCT-ON sort of millions of price rows — that sort was the second
        -- screener bottleneck for large universes like IN).
        SELECT
          s.id AS "instrumentId",
          lp.price,
          lp.price_ts,
          pid.price_symbol
        FROM stocks s
        CROSS JOIN LATERAL (
          SELECT regexp_replace(
            COALESCE(NULLIF(s."sourceSymbol", ''), NULLIF(s.symbol, ''), NULLIF(s."providerSymbol", '')),
            '\\.(NS|BO)$', '', 'i'
          ) AS price_symbol
        ) pid
        CROSS JOIN LATERAL (
          SELECT COALESCE(pt."adjustedClose", pt.close) AS price, pt.timestamp AS price_ts
          FROM price_ticks pt
          WHERE pt.symbol = pid.price_symbol
            AND UPPER(COALESCE(pt."dataStatus", 'COMPLETE')) = 'COMPLETE'
            AND UPPER(COALESCE(pt.source, '')) NOT LIKE 'TEST\\_%'
          ORDER BY pt.timestamp DESC
          LIMIT 1
        ) lp
        WHERE s."isActive" = TRUE AND s."isDelisted" = FALSE
          ${cteRegionFilter}
      ),
      price_range AS MATERIALIZED (
        SELECT
          lp."instrumentId",
          CASE
            WHEN rng."high52w" > rng."low52w"
            THEN ((lp.price - rng."low52w") / NULLIF(rng."high52w" - rng."low52w", 0) * 100)
            ELSE NULL
          END AS "range52wPositionPct"
        FROM latest_price lp
        CROSS JOIN LATERAL (
          SELECT
            MAX(COALESCE(pt."adjustedClose", pt.close)) AS "high52w",
            MIN(COALESCE(pt."adjustedClose", pt.close)) AS "low52w"
          FROM price_ticks pt
          WHERE pt.symbol = lp.price_symbol
            AND pt.timestamp >= lp.price_ts - (${LOOKBACK_DAYS} * INTERVAL '1 day')
            AND pt.timestamp < lp.price_ts
            AND UPPER(COALESCE(pt."dataStatus", 'COMPLETE')) = 'COMPLETE'
            AND UPPER(COALESCE(pt.source, '')) NOT LIKE 'TEST\\_%'
        ) rng
      ),
      latest_delivery AS MATERIALIZED (
        SELECT DISTINCT ON (d.symbol)
          d.symbol,
          d."deliveryPercent" AS "deliveryPct"
        FROM market_delivery_snapshots d
        WHERE d."deliveryPercent" IS NOT NULL AND d."deliveryPercent" > 0
        ORDER BY d.symbol, d."tradingDate" DESC
      ),
      fno_ban AS (
        SELECT
          fbl.symbol,
          TRUE AS "inBan"
        FROM fno_ban_list fbl
        WHERE fbl.ban_date = (SELECT MAX(ban_date) FROM fno_ban_list)
      ),
      ${foCtes}
      SELECT
        s.id            AS "instrumentId",
        s.symbol,
        COALESCE(s.name, s.symbol) AS "companyName",
        lp.price        AS price,
        ls."signalDirection",
        ls."signalScore",
        ls."priorScore",
        ls."triggeredSignals",
        s.sector,
        s."marketCap",
        ld."deliveryPct",
        pr."range52wPositionPct",
        COALESCE(fno."inBan", FALSE) AS "inFnoBan",
        foi."buildupLabel", foi."oiChangePct", fopt."pcrOi"
      FROM stocks s
      LEFT JOIN latest_signal ls ON ls."instrumentId" = s.id
      LEFT JOIN latest_price lp ON lp."instrumentId" = s.id
      LEFT JOIN price_range pr ON pr."instrumentId" = s.id
      LEFT JOIN latest_delivery ld ON ld.symbol = s.symbol
      LEFT JOIN fno_ban fno ON fno.symbol = s.symbol
      LEFT JOIN fo_oi foi ON foi.underlying = ${foJoinSymbol}
      LEFT JOIN fo_opt fopt ON fopt.underlying = ${foJoinSymbol}
      WHERE ${whereClause}
      ORDER BY COALESCE(ls."signalScore", 0) DESC
      LIMIT ${rowLimit}
    `;

    const rows = await this.prisma.$queryRaw<Array<ScreenerRow>>(
      options.min52wPositionPct == null ? fastQuery : fullQuery,
    );

    // Derive capBand from stored marketCap
    return rows.map((row) => {
      const mc = row.marketCap != null ? Number(row.marketCap) : null;
      let capBand: string | null = null;
      if (mc != null) {
        if (mc >= LARGE_CAP_THRESHOLD) capBand = 'LARGE';
        else if (mc >= MID_CAP_THRESHOLD) capBand = 'MID';
        else capBand = 'SMALL';
      }
      const signalScore = row.signalScore != null ? Number(row.signalScore) : null;
      const priorScore = row.priorScore != null ? Number(row.priorScore) : null;
      // Score movement vs the immediately prior persisted run for this instrument.
      // priorScore is null only when no earlier run is on record → genuine first appearance.
      const scoreDeltaPrev =
        signalScore != null && priorScore != null
          ? Math.round((signalScore - priorScore) * 10) / 10
          : null;
      const isNewEntry = signalScore != null && priorScore == null;
      return {
        instrumentId: row.instrumentId,
        symbol: row.symbol,
        companyName: row.companyName,
        price: row.price != null ? Number(row.price) : null,
        signalDirection: row.signalDirection ?? null,
        signalScore,
        rsPercentile: null, // computed in service layer
        sector: row.sector ?? null,
        capBand,
        deliveryPct: row.deliveryPct != null ? Number(row.deliveryPct) : null,
        range52wPositionPct: row.range52wPositionPct != null ? Number(row.range52wPositionPct) : null,
        inFnoBan: Boolean(row.inFnoBan),
        buildupLabel: row.buildupLabel ?? null,
        oiChangePct: row.oiChangePct != null ? Number(row.oiChangePct) : null,
        pcrOi: row.pcrOi != null ? Number(row.pcrOi) : null,
        scoreDeltaPrev,
        isNewEntry,
        factorFamilies: this.summarizeFactorFamilies(row.triggeredSignals),
      };
    });
  }

  /**
   * Decompose the persisted `triggeredSignals` (positive-evidence factor codes) into a
   * count per independent factor family (TREND / MOMENTUM / VOLUME / RELATIVE_STRENGTH …)
   * so the screener can show WHY a name scores, not just the single composite score.
   * Reuses `familyForCode` from the signal-generation-engine public surface (no recompute).
   */
  private summarizeFactorFamilies(raw: unknown): Record<string, number> | null {
    if (!Array.isArray(raw) || raw.length === 0) return null;
    const counts: Record<string, number> = {};
    for (const item of raw) {
      const code = item && typeof item === 'object' ? (item as { code?: unknown }).code : null;
      if (typeof code !== 'string' || code.length === 0) continue;
      const family = familyForCode(code);
      counts[family] = (counts[family] ?? 0) + 1;
    }
    return Object.keys(counts).length > 0 ? counts : null;
  }
}
