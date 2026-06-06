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

/** Format price as ₹1,234.50 */
function fmtPrice(price: number): string {
  return `₹${price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

async function fetchBreakoutEvents(): Promise<MarketEvent[]> {
  const rows = await prisma.$queryRawUnsafe<
    {
      symbol: string;
      session_high: string;
      session_low: string;
      yr_high: string;
      yr_low: string;
      breakout: string | null;
      latest_date: string;
    }[]
  >(
    `WITH latest_date AS (
       SELECT DATE(MAX(timestamp)) AS d FROM price_ticks WHERE symbol NOT LIKE '%^%'
     ),
     latest_session AS (
       SELECT symbol,
              MAX(high)  AS session_high,
              MIN(low)   AS session_low,
              MAX(close) AS session_close
       FROM price_ticks
       WHERE DATE(timestamp) = (SELECT d FROM latest_date)
         AND symbol NOT LIKE '%^%'
       GROUP BY symbol
     ),
     yearly_range AS (
       SELECT symbol,
              MAX(high) AS yr_high,
              MIN(low)  AS yr_low
       FROM price_ticks
       WHERE timestamp >= NOW() - INTERVAL '365 days'
         AND symbol NOT LIKE '%^%'
       GROUP BY symbol
     )
     SELECT ls.symbol,
            ls.session_high::text,
            ls.session_low::text,
            yr.yr_high::text,
            yr.yr_low::text,
            CASE
              WHEN ls.session_high >= yr.yr_high THEN 'HIGH'
              WHEN ls.session_low  <= yr.yr_low  THEN 'LOW'
            END AS breakout,
            (SELECT d::text FROM latest_date) AS latest_date
     FROM latest_session  ls
     JOIN yearly_range    yr ON ls.symbol = yr.symbol
     WHERE ls.session_high >= yr.yr_high OR ls.session_low <= yr.yr_low
     ORDER BY ls.symbol`,
  );

  if (rows.length === 0) return [];
  const latestDate = rows[0].latest_date;

  return rows
    .filter((r) => r.breakout !== null)
    .map((r) => {
      const isHigh = r.breakout === 'HIGH';
      const price = isHigh ? Number(r.session_high) : Number(r.session_low);
      const desc = isHigh
        ? `52W HIGH: ${r.symbol} broke out to ${fmtPrice(price)}`
        : `52W LOW: ${r.symbol} hit 52-week low at ${fmtPrice(price)}`;
      const tone: EventTone = isHigh ? 'positive' : 'negative';
      return {
        id: `breakout-${isHigh ? 'high' : 'low'}-${r.symbol}-${latestDate}`,
        type: (isHigh ? 'BREAKOUT_52W_HIGH' : 'BREAKOUT_52W_LOW') as EventType,
        date: isoDate(latestDate),
        symbols: [r.symbol],
        description: desc,
        tone,
        meta: {
          sessionPrice: price,
          yearlyHigh: Number(r.yr_high),
          yearlyLow: Number(r.yr_low),
          direction: r.breakout,
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

export async function getEventFeed(days: number = 5): Promise<EventFeedEnvelope> {
  const clampedDays = Math.min(30, Math.max(1, Math.floor(days)));
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - clampedDays);
  const cutoffStr = cutoffDate.toISOString().slice(0, 10);

  const warnings: string[] = [];

  const [bulkBlock, fnoBan, breakouts, flows] = await Promise.allSettled([
    fetchBulkBlockEvents(cutoffStr),
    fetchFnoBanEvents(),
    fetchBreakoutEvents(),
    fetchFiiDiiFlowEvents(),
  ]);

  const events: MarketEvent[] = [];

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

  if (breakouts.status === 'fulfilled') {
    events.push(...breakouts.value);
  } else {
    warnings.push(`52-week breakout data unavailable: ${String(breakouts.reason)}`);
  }

  if (flows.status === 'fulfilled') {
    events.push(...flows.value);
  } else {
    warnings.push(`FII/DII flow data unavailable: ${String(flows.reason)}`);
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
