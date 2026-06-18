/**
 * FRED Macro Ingest Service — FREE, public St. Louis Fed (FRED) macro series.
 *
 * Replaces the hardcoded "Macro status UNKNOWN" stub with real macro context
 * derived from a small set of free FRED series. One light fetch per series; no
 * per-symbol calls. The result is a single GLOBAL macro regime read, persisted
 * into the raw-SQL landing table `macro_snapshots` (created idempotently via raw
 * SQL — schema.prisma is NOT touched), upserted on the natural key
 * (snapshot_date, region).
 *
 * Series → field (see market-context-intelligence.macro-derivation.ts):
 *   DFF        → interestRateProxy  (effective fed funds rate, %, latest)
 *   CPIAUCSL   → inflationProxy     (CPI YoY %, computed from ~14 monthly obs)
 *   DTWEXBGS   → usdStrengthProxy   (broad trade-weighted USD index, latest)
 *   DCOILWTICO → commodityProxy     (WTI crude oil $/bbl, latest)
 *   T10Y2Y     → yieldCurve         (10y–2y spread, status-only, not stored)
 *
 * API key: read ONLY from process.env.FRED_API_KEY — never hardcoded. When the
 * key is unset the service returns null (skips) rather than throwing, so a
 * missing key degrades gracefully to the existing UNKNOWN/MISSING stub.
 *
 * Research support only — a macro regime characterization, never advice.
 * FRED updates slowly (daily/monthly); ingestion is explicit (service/script/
 * scheduler) and NEVER runs on a GET.
 */

import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';
import {
  deriveMacroStatus,
  computeCpiYoY,
  type MacroInputs,
} from './market-context-intelligence.macro-derivation';
import type { MacroSnapshot } from './market-context-intelligence.types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';
const SOURCE_TAG = 'FRED';
const REGION = 'GLOBAL';
const HTTP_TIMEOUT_MS = Number(process.env.FRED_HTTP_TIMEOUT_MS || 20000);
const HTTP_MAX_ATTEMPTS = Number(process.env.FRED_HTTP_MAX_ATTEMPTS || 3);
const HTTP_BACKOFF_BASE_MS = Number(process.env.FRED_HTTP_BACKOFF_BASE_MS || 800);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FredObservation {
  date: string;
  value: string;
}

export interface FredMacroIngestResult {
  status: 'INGESTED' | 'SKIPPED';
  snapshotDate: string | null;
  snapshot: MacroSnapshot | null;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Raw-SQL landing table (schema.prisma NOT touched)
// ---------------------------------------------------------------------------

export async function ensureMacroSnapshotsTable(): Promise<void> {
  await prisma.$executeRaw(Prisma.sql`
    CREATE TABLE IF NOT EXISTS macro_snapshots (
      snapshot_date       DATE          NOT NULL,
      region              TEXT          NOT NULL DEFAULT 'GLOBAL',
      interest_rate_proxy NUMERIC(12,4),
      inflation_proxy     NUMERIC(12,4),
      usd_strength_proxy  NUMERIC(12,4),
      commodity_proxy     NUMERIC(12,4),
      macro_status        TEXT          NOT NULL,
      data_status         TEXT          NOT NULL,
      explanation         TEXT,
      source              TEXT          NOT NULL DEFAULT 'FRED',
      ingested_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      PRIMARY KEY (snapshot_date, region)
    )
  `);
  await prisma.$executeRaw(Prisma.sql`
    CREATE INDEX IF NOT EXISTS idx_macro_snapshots_region_date
      ON macro_snapshots (region, snapshot_date DESC)
  `);
}

// ---------------------------------------------------------------------------
// Network helpers
// ---------------------------------------------------------------------------

/** Returns the FRED API key from env, or null when unset/blank. NEVER hardcoded. */
export function getFredApiKey(): string | null {
  const key = (process.env.FRED_API_KEY || '').trim();
  return key.length > 0 ? key : null;
}

function buildObservationsUrl(seriesId: string, apiKey: string, limit: number): string {
  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: 'json',
    sort_order: 'desc',
    limit: String(limit),
  });
  return `${FRED_BASE}?${params.toString()}`;
}

async function fetchObservationsOnce(url: string): Promise<FredObservation[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'investment-scanner/fred-macro' },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
    const json = (await response.json()) as { observations?: FredObservation[] };
    return Array.isArray(json.observations) ? json.observations : [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch FRED observations for a series with bounded retry on transient failures.
 * Mirrors the crypto-provider fetch helper. Newest-first (sort_order=desc).
 */
async function fetchObservations(seriesId: string, apiKey: string, limit: number): Promise<FredObservation[]> {
  const url = buildObservationsUrl(seriesId, apiKey, limit);
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= HTTP_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await fetchObservationsOnce(url);
    } catch (error) {
      lastError = error as Error;
      if (attempt === HTTP_MAX_ATTEMPTS) throw lastError;
      await sleep(HTTP_BACKOFF_BASE_MS * 2 ** (attempt - 1) + attempt * 113);
    }
  }
  throw lastError ?? new Error(`FRED fetch failed for ${seriesId}`);
}

/**
 * Parse a FRED numeric observation value. FRED returns "." for missing obs —
 * treated as null. Pure helper, exported for tests.
 */
export function parseFredValue(value: string | null | undefined): number | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (trimmed === '' || trimmed === '.') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/** Latest finite observation value, or null. Observations are newest-first. */
function latestValue(observations: FredObservation[]): number | null {
  for (const obs of observations) {
    const v = parseFredValue(obs.value);
    if (v !== null) return v;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class FredMacroIngestService {
  /**
   * Fetch the macro series from FRED, derive the regime read, and upsert one
   * GLOBAL row into macro_snapshots for today (UTC). When FRED_API_KEY is unset
   * the call SKIPS (returns null snapshot) rather than throwing. A per-series
   * fetch failure is caught and recorded as a warning; the row is still written
   * from whatever inputs succeeded (deriveMacroStatus handles partial inputs).
   */
  async ingest(): Promise<FredMacroIngestResult> {
    const warnings: string[] = [];
    const apiKey = getFredApiKey();
    if (!apiKey) {
      return {
        status: 'SKIPPED',
        snapshotDate: null,
        snapshot: null,
        warnings: ['FRED_API_KEY is not set; macro ingest skipped (macro context stays UNKNOWN/MISSING).'],
      };
    }

    await ensureMacroSnapshotsTable();

    // DFF / DTWEXBGS / DCOILWTICO / T10Y2Y: take the latest finite obs.
    // CPIAUCSL: fetch ~14 monthly obs to compute YoY from the ~12-month prior value.
    const dff = await this.safeLatest('DFF', apiKey, 10, warnings);
    const usd = await this.safeLatest('DTWEXBGS', apiKey, 10, warnings);
    const oil = await this.safeLatest('DCOILWTICO', apiKey, 10, warnings);
    const curve = await this.safeLatest('T10Y2Y', apiKey, 10, warnings);
    const cpi = await this.safeCpiYoY('CPIAUCSL', apiKey, 14, warnings);

    const inputs: MacroInputs = {
      interestRateProxy: dff,
      inflationProxy: cpi,
      usdStrengthProxy: usd,
      commodityProxy: oil,
      yieldCurve: curve,
    };
    const derived = deriveMacroStatus(inputs);
    const snapshot: MacroSnapshot = {
      interestRateProxy: inputs.interestRateProxy,
      inflationProxy: inputs.inflationProxy,
      usdStrengthProxy: inputs.usdStrengthProxy,
      commodityProxy: inputs.commodityProxy,
      macroStatus: derived.macroStatus,
      dataStatus: derived.dataStatus,
      explanation: derived.explanation,
    };

    const snapshotDate = await this.upsert(snapshot);
    return { status: 'INGESTED', snapshotDate, snapshot, warnings };
  }

  private async safeLatest(
    seriesId: string,
    apiKey: string,
    limit: number,
    warnings: string[],
  ): Promise<number | null> {
    try {
      const obs = await fetchObservations(seriesId, apiKey, limit);
      return latestValue(obs);
    } catch (error) {
      warnings.push(`${seriesId}: ${(error as Error).message}`);
      return null;
    }
  }

  private async safeCpiYoY(
    seriesId: string,
    apiKey: string,
    limit: number,
    warnings: string[],
  ): Promise<number | null> {
    try {
      const obs = await fetchObservations(seriesId, apiKey, limit);
      return computeCpiYoY(obs.map((o) => parseFredValue(o.value)));
    } catch (error) {
      warnings.push(`${seriesId}: ${(error as Error).message}`);
      return null;
    }
  }

  /** Upsert today's GLOBAL macro row; returns the ISO snapshot date written. */
  private async upsert(snapshot: MacroSnapshot): Promise<string> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const isoDate = today.toISOString().slice(0, 10);

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO macro_snapshots (
        snapshot_date, region, interest_rate_proxy, inflation_proxy,
        usd_strength_proxy, commodity_proxy, macro_status, data_status,
        explanation, source, ingested_at
      )
      VALUES (
        ${today}, ${REGION}, ${snapshot.interestRateProxy}, ${snapshot.inflationProxy},
        ${snapshot.usdStrengthProxy}, ${snapshot.commodityProxy}, ${snapshot.macroStatus},
        ${snapshot.dataStatus}, ${snapshot.explanation}, ${SOURCE_TAG}, NOW()
      )
      ON CONFLICT (snapshot_date, region) DO UPDATE SET
        interest_rate_proxy = EXCLUDED.interest_rate_proxy,
        inflation_proxy     = EXCLUDED.inflation_proxy,
        usd_strength_proxy  = EXCLUDED.usd_strength_proxy,
        commodity_proxy     = EXCLUDED.commodity_proxy,
        macro_status        = EXCLUDED.macro_status,
        data_status         = EXCLUDED.data_status,
        explanation         = EXCLUDED.explanation,
        source              = EXCLUDED.source,
        ingested_at         = EXCLUDED.ingested_at
    `);
    return isoDate;
  }
}

export const fredMacroIngestService = new FredMacroIngestService();
