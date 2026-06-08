/**
 * Market Events Feed — NR-105
 *
 * Composes four ALREADY-PERSISTED datasets into a single time-ordered
 * morning-briefing feed.  This is a pure persisted-read service —
 * no ingestion, no generation, no writes.
 *
 * Sources (raw SQL / Prisma against the shared client — no foreign imports):
 *   1. bulk_block_deals           – last N days
 *   2. fno_ban_list               – latest date + new additions vs prior date
 *   3. price_ticks                – 52-week HIGH / LOW breakouts on latest session
 *   4. fii_dii_snapshots          – latest trading date flows
 */

import prisma from '../../db/prisma';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EventTone = 'info' | 'positive' | 'negative' | 'risk';

export type EventType =
  | 'BULK_DEAL'
  | 'BLOCK_DEAL'
  | 'FNO_BAN_ENTRY'
  | 'FNO_BAN_BATCH'
  | 'BREAKOUT_52W_HIGH'
  | 'BREAKOUT_52W_LOW'
  | 'FII_DII_FLOWS';

export interface MarketEvent {
  /** Stable key for React list rendering */
  id: string;
  type: EventType;
  /** ISO date string (YYYY-MM-DD or full ISO) */
  date: string;
  /** Primary symbol(s) involved */
  symbols: string[];
  /** Human-readable one-liner for the event card */
  description: string;
  tone: EventTone;
  /** Optional structured metadata for richer rendering */
  meta?: Record<string, unknown>;
}

export interface EventFeedEnvelope {
  availability: 'READY' | 'EMPTY' | 'ERROR';
  generatedAt: string;
  asOf: string | null;
  days: number;
  events: MarketEvent[];
  eventCount: number;
  message: string;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isoDate(d: Date | string): string {
  if (typeof d === 'string') return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

/** Format qty in Indian compact notation (Cr / L / plain) */
function fmtQty(qty: number): string {
  if (qty >= 1e7) return `${(qty / 1e7).toLocaleString('en-IN', { maximumFractionDigits: 1 })}Cr`;
  if (qty >= 1e5) return `${(qty / 1e5).toLocaleString('en-IN', { maximumFractionDigits: 1 })}L`;
  return qty.toLocaleString('en-IN');
}

/** Region currency symbol for price formatting (breakout events are region-scoped). */
function currencySymbolForRegion(region: string): string {
  switch (String(region || '').trim().toUpperCase()) {
    case 'US': return '$';
    case 'EU': return '€';
    case 'IN': default: return '₹';
  }
}

/** Format price with the region currency symbol, e.g. $1,234.50 / ₹1,234.50 */
function fmtPrice(price: number, symbol = '₹'): string {
  const locale = symbol === '₹' ? 'en-IN' : 'en-US';
  return `${symbol}${price.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Format net flows in ₹ Cr with sign */
function fmtFlows(cr: number): string {
  const sign = cr >= 0 ? '+' : '';
  return `${sign}₹${Math.abs(cr).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Cr`;
}

// ---------------------------------------------------------------------------
// Sub-queries
// ---------------------------------------------------------------------------

async function fetchBulkBlockEvents(cutoffDate: string): Promise<MarketEvent[]> {
  const rows = await prisma.$queryRawUnsafe<
    {
      id: string;
      trade_date: string;
      deal_type: string;
      symbol: string;
      name: string;
      client_name: string;
      buy_sell: string;
      qty: string;
      avg_price: string;
    }[]
  >(
    `SELECT id, trade_date::text, deal_type, symbol, name, client_name, buy_sell,
            qty::text, avg_price::text
     FROM bulk_block_deals
     WHERE trade_date >= $1::date
     ORDER BY trade_date DESC, deal_type, symbol`,
    cutoffDate,
  );

  return rows.map((r) => {
    const qty = Number(r.qty);
    const price = Number(r.avg_price);
    const side = r.buy_sell === 'BUY' ? 'bought' : 'sold';
    const shortClient = r.client_name.length > 30 ? r.client_name.slice(0, 28) + '…' : r.client_name;
    const desc = `${r.deal_type}: ${shortClient} ${side} ${fmtQty(qty)} ${r.symbol} @${fmtPrice(price)}`;
    const tone: EventTone = r.buy_sell === 'BUY' ? 'positive' : 'negative';
    return {
      id: `bulk-${r.id}`,
      type: (r.deal_type === 'BLOCK' ? 'BLOCK_DEAL' : 'BULK_DEAL') as EventType,
      date: isoDate(r.trade_date),
      symbols: [r.symbol],
      description: desc,
      tone,
      meta: {
        dealType: r.deal_type,
        clientName: r.client_name,
        companyName: r.name,
        buySell: r.buy_sell,
        qty,
        avgPrice: price,
      },
    };
  });
}

async function fetchFnoBanEvents(): Promise<MarketEvent[]> {
  // Get two most recent distinct ban dates
  const recentDates = await prisma.$queryRawUnsafe<{ ban_date: string }[]>(
    `SELECT DISTINCT ban_date::text as ban_date FROM fno_ban_list ORDER BY ban_date DESC LIMIT 2`,
  );

  if (recentDates.length === 0) return [];

  const latestDate = recentDates[0].ban_date;
  const priorDate = recentDates[1]?.ban_date ?? null;

  // All symbols on latest date
  const latestSymbols = await prisma.$queryRawUnsafe<{ symbol: string }[]>(
    `SELECT symbol FROM fno_ban_list WHERE ban_date = $1::date ORDER BY symbol`,
    latestDate,
  );

  if (latestSymbols.length === 0) return [];

  const latestSet = new Set(latestSymbols.map((s) => s.symbol));

  // Find newly added symbols (present in latest but not prior)
  let newlyAdded: string[] = [];
  if (priorDate) {
    const priorSymbols = await prisma.$queryRawUnsafe<{ symbol: string }[]>(
      `SELECT symbol FROM fno_ban_list WHERE ban_date = $1::date ORDER BY symbol`,
      priorDate,
    );
    const priorSet = new Set(priorSymbols.map((s) => s.symbol));
    newlyAdded = [...latestSet].filter((s) => !priorSet.has(s));
  } else {
    newlyAdded = [...latestSet];
  }

  const events: MarketEvent[] = [];

  // Batch event for the full ban list
  const allSyms = latestSymbols.map((s) => s.symbol);
  const banDesc =
    allSyms.length === 1
      ? `F&O BAN: ${allSyms[0]} is in F&O ban period`
      : `F&O BAN: ${allSyms.slice(0, 4).join(', ')}${allSyms.length > 4 ? ` +${allSyms.length - 4} more` : ''} in F&O ban period`;

  events.push({
    id: `fno-ban-batch-${latestDate}`,
    type: 'FNO_BAN_BATCH',
    date: latestDate,
    symbols: allSyms,
    description: banDesc,
    tone: 'risk',
    meta: { banDate: latestDate, totalInBan: allSyms.length, allSymbols: allSyms },
  });

  // New entries event (if any)
  if (newlyAdded.length > 0) {
    const entryDesc =
      newlyAdded.length === 1
        ? `F&O BAN: ${newlyAdded[0]} entered ban (new addition)`
        : `F&O BAN: ${newlyAdded.join(', ')} entered ban (new additions)`;

    events.push({
      id: `fno-ban-entry-${latestDate}`,
      type: 'FNO_BAN_ENTRY',
      date: latestDate,
      symbols: newlyAdded,
      description: entryDesc,
      tone: 'risk',
      meta: { banDate: latestDate, newlyAdded, totalInBan: allSyms.length },
    });
  }

  return events;
}

/**
 * Snapshot row shape returned from market_scan_snapshots.payloadJson.
 * All numeric fields are stored as JSON numbers; latestDate is an ISO string.
 */
interface SnapshotPayload {
  symbol: string;
  currentPrice: number;
  high52w: number;
  low52w: number;
  pctFromHigh: number;
  pctFromLow: number;
  latestDate: string;
  companyName?: string | null;
}

/**
 * Reads the latest persisted 52W_HIGH / 52W_LOW snapshot rows for the given
 * region from `market_scan_snapshots` instead of scanning ~15 M price_ticks
 * rows.  The snapshots are computed nightly by MARKET_SCAN_REFRESH so this
 * becomes a tiny index-seek (~100 rows) and completes in <50 ms.
 */
async function fetchBreakoutEvents(region: string): Promise<MarketEvent[]> {
  // One query: grab both scan types for the region, each scoped to its own
  // latest tradingDate, ordered by rank, capped to 25 rows per type.
  const rows = await prisma.$queryRawUnsafe<
    {
      scan_type: string;
      trading_date: string;
      rank: number;
      payload: SnapshotPayload;
    }[]
  >(
    `SELECT s."scanType"     AS scan_type,
            s."tradingDate"::text AS trading_date,
            s.rank,
            s."payloadJson"  AS payload
     FROM market_scan_snapshots s
     INNER JOIN (
       SELECT "scanType", MAX("tradingDate") AS max_date
       FROM market_scan_snapshots
       WHERE region = $1
         AND "scanType" IN ('52W_HIGH', '52W_LOW')
       GROUP BY "scanType"
     ) latest ON s."scanType" = latest."scanType"
               AND s."tradingDate" = latest.max_date
     WHERE s.region = $1
       AND s."scanType" IN ('52W_HIGH', '52W_LOW')
     ORDER BY s."scanType", s.rank
     LIMIT 50`,
    region,
  );

  if (rows.length === 0) return [];

  const currencySymbol = currencySymbolForRegion(region);
  return rows
    // Exclude par-stuck shells (SPAC units, etc.) whose 52-week range is degenerate
    // (high ≈ low): they sit "at their 52-week high" only because they never move.
    // A real breakout has a meaningful yearly range.
    .filter((r) => {
      const hi = Number(r.payload?.high52w);
      const lo = Number(r.payload?.low52w);
      if (!Number.isFinite(hi) || !Number.isFinite(lo) || lo <= 0) return true;
      return hi / lo >= 1.10; // require ≥10% yearly range
    })
    .map((r) => {
    const p = r.payload;
    const isHigh = r.scan_type === '52W_HIGH';
    const price = p.currentPrice;
    const snapshotDate = isoDate(r.trading_date);
    const desc = isHigh
      ? `52W HIGH: ${p.symbol} at ${fmtPrice(price, currencySymbol)} (near 52-week high)`
      : `52W LOW: ${p.symbol} at ${fmtPrice(price, currencySymbol)} (near 52-week low)`;
    const tone: EventTone = isHigh ? 'positive' : 'negative';
    return {
      id: `breakout-${isHigh ? 'high' : 'low'}-${p.symbol}-${snapshotDate}`,
      type: (isHigh ? 'BREAKOUT_52W_HIGH' : 'BREAKOUT_52W_LOW') as EventType,
      date: snapshotDate,
      symbols: [p.symbol],
      description: desc,
      tone,
      meta: {
        sessionPrice: price,
        yearlyHigh: p.high52w,
        yearlyLow: p.low52w,
        pctFromHigh: p.pctFromHigh,
        pctFromLow: p.pctFromLow,
        direction: isHigh ? 'HIGH' : 'LOW',
        companyName: p.companyName ?? null,
      },
    };
  });
}

async function fetchFiiDiiFlowEvents(): Promise<MarketEvent[]> {
  const rows = await prisma.$queryRawUnsafe<
    {
      trading_date: string;
      category: string;
      buy_value_cr: string;
      sell_value_cr: string;
      net_value_cr: string;
    }[]
  >(
    `SELECT trading_date::text, category, buy_value_cr::text, sell_value_cr::text, net_value_cr::text
     FROM fii_dii_snapshots
     WHERE trading_date = (SELECT MAX(trading_date) FROM fii_dii_snapshots)
     ORDER BY category`,
  );

  if (rows.length === 0) return [];

  const events: MarketEvent[] = [];
  const tradingDate = rows[0].trading_date;

  for (const r of rows) {
    const net = Number(r.net_value_cr);
    const isFii = r.category === 'FII';
    const label = isFii ? 'FII' : 'DII';
    const side = net >= 0 ? 'net buyers' : 'net sellers';
    const desc = `FLOWS: ${label} ${side} ${fmtFlows(net)} on ${tradingDate}`;
    const tone: EventTone = isFii
      ? net >= 0 ? 'positive' : 'negative'
      : net >= 0 ? 'info' : 'info';

    events.push({
      id: `flows-${r.category}-${tradingDate}`,
      type: 'FII_DII_FLOWS',
      date: isoDate(tradingDate),
      symbols: [],
      description: desc,
      tone,
      meta: {
        category: r.category,
        buyValueCr: Number(r.buy_value_cr),
        sellValueCr: Number(r.sell_value_cr),
        netValueCr: net,
      },
    });
  }

  return events;
}

// ---------------------------------------------------------------------------
// Public service function
// ---------------------------------------------------------------------------

export async function getEventFeed(days: number = 5, region: string = 'IN'): Promise<EventFeedEnvelope> {
  const clampedDays = Math.min(30, Math.max(1, Math.floor(days)));
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - clampedDays);
  const cutoffStr = cutoffDate.toISOString().slice(0, 10);

  // Normalise to uppercase for DB comparison; default to IN (historical behaviour).
  const normalizedRegion = (region || 'IN').toUpperCase();
  const isIndia = normalizedRegion === 'IN';

  const warnings: string[] = [];

  // India-only sub-queries (bulk/block deals, F&O ban, FII/DII flows) only run
  // when the region is IN.  fetchBreakoutEvents always runs but is now scoped to
  // the requested region via the price_ticks.region column so it only surfaces
  // breakouts for the active region.
  const breakoutsPromise = fetchBreakoutEvents(normalizedRegion);

  const [bulkBlock, fnoBan, breakouts, flows] = await Promise.allSettled([
    isIndia ? fetchBulkBlockEvents(cutoffStr) : Promise.resolve([] as MarketEvent[]),
    isIndia ? fetchFnoBanEvents() : Promise.resolve([] as MarketEvent[]),
    breakoutsPromise,
    isIndia ? fetchFiiDiiFlowEvents() : Promise.resolve([] as MarketEvent[]),
  ]);

  const events: MarketEvent[] = [];

  if (isIndia) {
    if (bulkBlock.status === 'fulfilled') {
      events.push(...bulkBlock.value);
    } else {
      warnings.push(`Bulk/block deals unavailable: ${String(bulkBlock.reason)}`);
    }

    if (fnoBan.status === 'fulfilled') {
      events.push(...fnoBan.value);
    } else {
      warnings.push(`F&O ban data unavailable: ${String(fnoBan.reason)}`);
    }
  }

  if (breakouts.status === 'fulfilled') {
    events.push(...breakouts.value);
  } else {
    warnings.push(`52-week breakout data unavailable: ${String(breakouts.reason)}`);
  }

  if (isIndia) {
    if (flows.status === 'fulfilled') {
      events.push(...flows.value);
    } else {
      warnings.push(`FII/DII flow data unavailable: ${String(flows.reason)}`);
    }
  }

  // Sort newest-first, bounded to 50
  events.sort((a, b) => {
    const dateDiff = b.date.localeCompare(a.date);
    if (dateDiff !== 0) return dateDiff;
    return a.type.localeCompare(b.type);
  });

  const bounded = events.slice(0, 50);
  const asOf = bounded.length > 0 ? bounded[0].date : null;

  if (bounded.length === 0) {
    return {
      availability: 'EMPTY',
      generatedAt: new Date().toISOString(),
      asOf: null,
      days: clampedDays,
      events: [],
      eventCount: 0,
      message: `No market events found in the last ${clampedDays} day(s). Data may not have been ingested yet.`,
      warnings,
    };
  }

  return {
    availability: 'READY',
    generatedAt: new Date().toISOString(),
    asOf,
    days: clampedDays,
    events: bounded,
    eventCount: bounded.length,
    message: `${bounded.length} market event(s) across ${clampedDays} day(s) as of ${asOf}.`,
    warnings,
  };
}
