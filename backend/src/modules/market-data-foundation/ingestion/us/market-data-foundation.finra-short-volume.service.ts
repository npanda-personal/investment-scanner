/**
 * US Daily Short-Volume Ingest Service — FREE, public FINRA Reg SHO data.
 *
 * FINRA publishes one consolidated daily short-sale volume file per trading
 * day at:
 *   https://cdn.finra.org/equity/regsho/daily/CNMSshvol<YYYYMMDD>.txt
 *
 * The file is pipe-delimited with the header
 *   Date|Symbol|ShortVolume|ShortExemptVolume|TotalVolume|Market
 * one row per US symbol (~all consolidated-tape names, ~500KB), and a trailing
 * footer line. Volumes can be FRACTIONAL on the consolidated tape.
 *
 * IMPORTANT — what this metric is (and is NOT):
 *   This is the DAILY SHORT-SALE VOLUME SHARE (ShortVolume / TotalVolume), a
 *   short-pressure PROXY. It is NOT bi-monthly short-interest (the outstanding
 *   short *position*). Label it "Short Volume %" / "Daily Short Pressure"
 *   everywhere — never "Short Interest". Research support only, not advice.
 *
 * The US analogue to India's delivery% / F&O participation: an observed
 * order-flow texture, surfaced on the existing US smart-money panel.
 *
 * Persisted into the raw-SQL landing table `us_short_volume` (created
 * idempotently via raw SQL — schema.prisma is NOT touched), upserted on the
 * natural key (symbol, trading_date) so re-ingesting a day is safe. Restricted
 * to tracked US symbols (region='US', isActive). One light file fetch per day;
 * NO per-symbol calls.
 *
 * Persisted-read getters live in market-data-foundation.us-short-volume.repository.ts;
 * ingestion here is explicit (service/script) and NEVER runs on a GET.
 */

import { Prisma } from '@prisma/client';
import prisma from '../../../../db/prisma';
import { finraRegShoDailyUrl, getFinraEndpoints } from '../market-data-foundation.endpoints';
import { US_NYSE_HOLIDAYS } from './market-data-foundation.us-holidays';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SOURCE_TAG = 'FINRA_REGSHO';
const UPSERT_CHUNK = 1000;
/** How many calendar days back to probe for the most recent published file. */
const MAX_DATE_PROBE = 7;
const HTTP_TIMEOUT_MS = Number(process.env.FINRA_HTTP_TIMEOUT_MS || 25000);
/**
 * FINRA's CDN rejects non-browser agents; send a browser-like User-Agent.
 * Overridable via env for ops.
 */
const FINRA_USER_AGENT =
  process.env.FINRA_USER_AGENT ||
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const FINRA_THROTTLE_MS = Number(process.env.FINRA_THROTTLE_MS || 250);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single parsed row from a Reg SHO daily short-volume file. */
export interface FinraShortVolumeRow {
  tradingDate: string; // YYYY-MM-DD
  symbol: string;
  shortVolume: number;
  shortExemptVolume: number;
  totalVolume: number;
  /** ShortVolume/TotalVolume*100, or null when TotalVolume is 0 (div-0 guard). */
  shortVolumePct: number | null;
  market: string;
}

export interface FinraShortVolumeIngestOptions {
  /** Explicit ISO dates (YYYY-MM-DD) to ingest. Takes precedence over lookback. */
  dates?: string[];
  /** Backfill the last N TRADING days ending at the most recent available file. */
  lookbackDays?: number;
}

export interface FinraShortVolumeIngestSummary {
  source: typeof SOURCE_TAG;
  /** ISO dates whose files were successfully fetched + parsed. */
  dates: string[];
  rowsParsed: number;
  rowsUpserted: number;
  symbolsMatched: number;
  warnings: string[];
}

interface ShortVolumeUpsertRow {
  symbol: string;
  tradingDate: string;
  shortVolume: number;
  shortExemptVolume: number;
  totalVolume: number;
  shortVolumePct: number | null;
  market: string;
}

// ---------------------------------------------------------------------------
// Pure helpers (exported for unit tests — no network, no DB)
// ---------------------------------------------------------------------------

/** True when the ISO date (YYYY-MM-DD) is a weekday and not a NYSE holiday. */
export function isUsTradingDay(isoDate: string): boolean {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  const dow = d.getUTCDay(); // 0=Sun, 6=Sat
  if (dow === 0 || dow === 6) return false;
  return !US_NYSE_HOLIDAYS.includes(isoDate);
}

/** ISO date string (YYYY-MM-DD) for a Date in UTC. */
export function toIsoDateUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** The most recent US trading day on or before `from` (default: today, UTC). */
export function mostRecentTradingDayOnOrBefore(from = new Date()): string {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  for (let i = 0; i < 14; i += 1) {
    const iso = toIsoDateUtc(d);
    if (isUsTradingDay(iso)) return iso;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return toIsoDateUtc(d);
}

/** The previous US trading day strictly before the given ISO date. */
export function previousTradingDay(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  for (let i = 0; i < 14; i += 1) {
    const iso = toIsoDateUtc(d);
    if (isUsTradingDay(iso)) return iso;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return toIsoDateUtc(d);
}

/** The last N trading days ending at (and including) `endIso`, oldest first. */
export function tradingDaysEndingAt(endIso: string, n: number): string[] {
  const out: string[] = [];
  let cursor = isUsTradingDay(endIso) ? endIso : previousTradingDay(endIso);
  for (let i = 0; i < Math.max(1, n); i += 1) {
    out.push(cursor);
    cursor = previousTradingDay(cursor);
  }
  return out.reverse();
}

/** Compute the short-volume percentage with a divide-by-zero guard. */
export function computeShortVolumePct(shortVolume: number, totalVolume: number): number | null {
  if (!Number.isFinite(totalVolume) || totalVolume <= 0) return null;
  return Number(((shortVolume / totalVolume) * 100).toFixed(4));
}

/**
 * Parse the pipe-delimited Reg SHO daily file body into rows. Pure — no
 * network, no DB. Skips the header line and any non-data/footer lines (FINRA
 * appends a trailing "Date|...|Records|..." summary line that does not match
 * the column shape). Tolerates fractional consolidated volumes and applies the
 * divide-by-zero guard for the percentage. Restriction to tracked symbols is
 * the caller's job (pass `allowedSymbols` to filter here, or filter after).
 */
export function parseFinraShortVolumeFile(
  body: string,
  allowedSymbols?: Set<string>,
): FinraShortVolumeRow[] {
  const rows: FinraShortVolumeRow[] = [];
  const lines = body.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split('|');
    if (parts.length < 6) continue; // footer / malformed line
    const [dateRaw, symbolRaw, shortRaw, shortExemptRaw, totalRaw, marketRaw] = parts;

    // Header line: skip.
    if (/^date$/i.test(dateRaw.trim()) || /^symbol$/i.test(symbolRaw.trim())) continue;

    // Date must look like YYYYMMDD (FINRA footer summary lines won't).
    const dm = dateRaw.trim().match(/^(\d{4})(\d{2})(\d{2})$/);
    if (!dm) continue;
    const tradingDate = `${dm[1]}-${dm[2]}-${dm[3]}`;

    const symbol = symbolRaw.trim().toUpperCase();
    if (!symbol) continue;
    if (allowedSymbols && !allowedSymbols.has(symbol)) continue;

    const shortVolume = Number(shortRaw.trim());
    const shortExemptVolume = Number(shortExemptRaw.trim());
    const totalVolume = Number(totalRaw.trim());
    if (!Number.isFinite(shortVolume) || !Number.isFinite(totalVolume)) continue;

    rows.push({
      tradingDate,
      symbol,
      shortVolume,
      shortExemptVolume: Number.isFinite(shortExemptVolume) ? shortExemptVolume : 0,
      totalVolume,
      shortVolumePct: computeShortVolumePct(shortVolume, totalVolume),
      market: (marketRaw ?? '').trim(),
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// DB helper (raw-SQL ensureTable; schema.prisma NOT touched)
// ---------------------------------------------------------------------------

export async function ensureShortVolumeTable(): Promise<void> {
  await prisma.$executeRaw(Prisma.sql`
    CREATE TABLE IF NOT EXISTS us_short_volume (
      symbol              TEXT          NOT NULL,
      trading_date        DATE          NOT NULL,
      short_volume        NUMERIC(20,2),
      short_exempt_volume NUMERIC(20,2),
      total_volume        NUMERIC(20,2),
      short_volume_pct    NUMERIC(8,4),
      market              TEXT,
      source              TEXT          NOT NULL DEFAULT 'FINRA_REGSHO',
      ingested_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      PRIMARY KEY (symbol, trading_date)
    )
  `);
  await prisma.$executeRaw(Prisma.sql`
    CREATE INDEX IF NOT EXISTS idx_us_short_volume_symbol_date
      ON us_short_volume (symbol, trading_date DESC)
  `);
}

// ---------------------------------------------------------------------------
// Network helper
// ---------------------------------------------------------------------------

/**
 * Fetch the Reg SHO daily file for an ISO date. Returns the body text, or null
 * if the file is not (yet) published for that date (HTTP 403/404 — FINRA
 * returns these for not-yet-available / non-trading dates).
 */
export async function fetchRegShoDailyFile(isoDate: string): Promise<string | null> {
  const url = finraRegShoDailyUrl(isoDate);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'text/plain,*/*', 'User-Agent': FINRA_USER_AGENT },
    });
    if (response.status === 403 || response.status === 404) return null;
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class FinraShortVolumeService {
  constructor(private readonly db = prisma as any) {}

  /** Load the tracked US symbol set once (region='US', active, not delisted). */
  private async loadTrackedUsSymbols(): Promise<Set<string>> {
    const stocks: Array<{ symbol: string }> = await this.db.stock.findMany({
      where: { region: 'US', isActive: true, isDelisted: false },
      select: { symbol: true },
    });
    return new Set(stocks.map((s) => s.symbol.trim().toUpperCase()));
  }

  /**
   * Resolve the set of ISO dates to ingest from the options:
   *  - explicit `dates` win,
   *  - otherwise the last `lookbackDays` trading days ending at the most recent
   *    AVAILABLE file (probing back up to MAX_DATE_PROBE days for weekends /
   *    holidays / not-yet-published).
   */
  private async resolveTargetDates(
    options: FinraShortVolumeIngestOptions,
  ): Promise<{ dates: string[]; warnings: string[] }> {
    const warnings: string[] = [];
    if (options.dates && options.dates.length > 0) {
      return { dates: [...new Set(options.dates.map((d) => d.trim()))].sort(), warnings };
    }

    // Find the most recent date whose file actually exists.
    let anchor: string | null = null;
    let probe = mostRecentTradingDayOnOrBefore(new Date());
    for (let i = 0; i < MAX_DATE_PROBE; i += 1) {
      // HEAD-style probe via a cheap GET (FINRA has no HEAD); fetch + discard.
      const body = await fetchRegShoDailyFile(probe);
      await sleep(FINRA_THROTTLE_MS);
      if (body !== null && body.trim().length > 0) {
        anchor = probe;
        break;
      }
      probe = previousTradingDay(probe);
    }
    if (!anchor) {
      warnings.push(
        `No published Reg SHO file found in the last ${MAX_DATE_PROBE} trading-day probes.`,
      );
      return { dates: [], warnings };
    }

    const lookback = Math.max(1, options.lookbackDays ?? 1);
    return { dates: tradingDaysEndingAt(anchor, lookback), warnings };
  }

  /**
   * Ingest FINRA Reg SHO daily short-volume for the requested date(s),
   * restricted to tracked US symbols. Idempotent (upsert on symbol+date). One
   * light file fetch per day; never per-symbol. Explicit call — never a GET.
   */
  async ingest(
    options: FinraShortVolumeIngestOptions = {},
  ): Promise<FinraShortVolumeIngestSummary> {
    const summary: FinraShortVolumeIngestSummary = {
      source: SOURCE_TAG,
      dates: [],
      rowsParsed: 0,
      rowsUpserted: 0,
      symbolsMatched: 0,
      warnings: [],
    };

    await ensureShortVolumeTable();

    const tracked = await this.loadTrackedUsSymbols();
    if (tracked.size === 0) {
      summary.warnings.push('No tracked US symbols (region=US, active) found; nothing to match.');
    }

    const { dates, warnings } = await this.resolveTargetDates(options);
    summary.warnings.push(...warnings);

    const matchedSymbols = new Set<string>();

    for (const isoDate of dates) {
      try {
        const body = await fetchRegShoDailyFile(isoDate);
        await sleep(FINRA_THROTTLE_MS);
        if (body === null || body.trim().length === 0) {
          summary.warnings.push(`No Reg SHO file published for ${isoDate} (skipped).`);
          continue;
        }
        const rows = parseFinraShortVolumeFile(body, tracked.size > 0 ? tracked : undefined);
        summary.rowsParsed += rows.length;
        for (const r of rows) matchedSymbols.add(r.symbol);

        if (rows.length > 0) {
          summary.rowsUpserted += await this.upsertRows(
            rows.map((r) => ({
              symbol: r.symbol,
              tradingDate: r.tradingDate,
              shortVolume: r.shortVolume,
              shortExemptVolume: r.shortExemptVolume,
              totalVolume: r.totalVolume,
              shortVolumePct: r.shortVolumePct,
              market: r.market,
            })),
          );
          summary.dates.push(isoDate);
        }
      } catch (err) {
        if (summary.warnings.length < 25) {
          summary.warnings.push(`${isoDate}: ${(err as Error).message}`);
        }
      }
    }

    summary.symbolsMatched = matchedSymbols.size;
    return summary;
  }

  private async upsertRows(rows: ShortVolumeUpsertRow[]): Promise<number> {
    let upserted = 0;
    for (let start = 0; start < rows.length; start += UPSERT_CHUNK) {
      const chunk = rows.slice(start, start + UPSERT_CHUNK);
      const values = chunk.map((r) => {
        const td = new Date(`${r.tradingDate}T00:00:00.000Z`);
        return Prisma.sql`(
          ${r.symbol}, ${td}, ${r.shortVolume}, ${r.shortExemptVolume}, ${r.totalVolume},
          ${r.shortVolumePct}, ${r.market}, ${SOURCE_TAG}, NOW()
        )`;
      });
      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO us_short_volume (
          symbol, trading_date, short_volume, short_exempt_volume, total_volume,
          short_volume_pct, market, source, ingested_at
        )
        VALUES ${Prisma.join(values)}
        ON CONFLICT (symbol, trading_date) DO UPDATE SET
          short_volume        = EXCLUDED.short_volume,
          short_exempt_volume = EXCLUDED.short_exempt_volume,
          total_volume        = EXCLUDED.total_volume,
          short_volume_pct    = EXCLUDED.short_volume_pct,
          market              = EXCLUDED.market,
          source              = EXCLUDED.source,
          ingested_at         = EXCLUDED.ingested_at
      `);
      upserted += chunk.length;
    }
    return upserted;
  }
}

export const finraShortVolumeService = new FinraShortVolumeService();

/** Re-export the resolved FINRA base for diagnostics callers. */
export const finraCdnBase = () => getFinraEndpoints().cdnBase;
