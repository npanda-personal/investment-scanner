/**
 * Macro regime derivation — PURE, no network, no DB (unit-tested standalone).
 *
 * Reads a small set of free FRED macro series into a single research-support
 * "regime read": SUPPORTIVE / MIXED / HEADWIND / UNKNOWN. This is a regime
 * characterization, NOT advice and NOT a forecast — it counts how many of the
 * observable macro inputs lean restrictive vs. accommodative and summarizes the
 * drivers in plain language. Every status is explainable from the inputs.
 *
 * Inputs (FRED series → field):
 *   interestRateProxy ← DFF       (effective federal funds rate, %)
 *   inflationProxy    ← CPIAUCSL  (CPI YoY %, computed from ~12-month lookback)
 *   usdStrengthProxy  ← DTWEXBGS  (broad trade-weighted USD index, level)
 *   commodityProxy    ← DCOILWTICO(WTI crude oil, $/bbl)
 *   yieldCurve        ← T10Y2Y    (10y–2y spread, %; used only for status,
 *                                  NOT stored as a proxy field)
 *
 * Signal-counting thresholds (regime read, honest research-support):
 *   HEADWIND signals:   DFF >= 5,  CPI YoY >= 4,  T10Y2Y < 0 (inverted), oil > 120
 *   SUPPORTIVE signals: DFF <= 4,  CPI YoY <= 3,  T10Y2Y >= 0.5,         oil < 90
 *   HEADWIND   if >= 2 headwind signals
 *   else SUPPORTIVE if >= 2 supportive signals
 *   else MIXED
 *   UNKNOWN    if fewer than 2 of the five inputs are available
 */

import type { MacroStatus } from './market-context-intelligence.types';
import type { MarketDataStatus } from '../market-data-foundation';

/** Raw macro inputs after FRED parsing (any field may be null when unavailable). */
export interface MacroInputs {
  /** DFF — effective federal funds rate, % (latest). */
  interestRateProxy: number | null;
  /** CPIAUCSL — CPI year-over-year %, computed. */
  inflationProxy: number | null;
  /** DTWEXBGS — broad trade-weighted USD index level (latest). */
  usdStrengthProxy: number | null;
  /** DCOILWTICO — WTI crude oil $/bbl (latest). */
  commodityProxy: number | null;
  /** T10Y2Y — 10y–2y Treasury spread, % (latest). Status-only, not stored as a proxy. */
  yieldCurve: number | null;
}

export interface MacroDerivation {
  macroStatus: MacroStatus;
  dataStatus: MarketDataStatus;
  explanation: string;
}

const isNum = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Compute CPI year-over-year % from a newest-first list of monthly CPI index
 * levels. Uses the latest observation vs. the one ~12 months prior (index 12).
 * Returns null when fewer than ~13 valid monthly observations are available or
 * the base value is non-positive. Pure — no network.
 */
export function computeCpiYoY(monthlyNewestFirst: Array<number | null>): number | null {
  const valid = monthlyNewestFirst.filter(isNum);
  if (valid.length < 13) return null;
  const latest = valid[0];
  const yearAgo = valid[12];
  if (!isNum(latest) || !isNum(yearAgo) || yearAgo <= 0) return null;
  return Number((((latest - yearAgo) / yearAgo) * 100).toFixed(2));
}

/** Format a number for the explanation, or "n/a" when missing. */
function fmt(v: number | null, opts: { suffix?: string; prefix?: string; decimals?: number } = {}): string {
  if (!isNum(v)) return 'n/a';
  const { suffix = '', prefix = '', decimals = 2 } = opts;
  return `${prefix}${v.toFixed(decimals)}${suffix}`;
}

/**
 * Derive the macro regime read from the raw inputs. Pure function — fully
 * determined by its arguments, so it is exhaustively unit-tested without any
 * network or DB. Research-support language only.
 */
export function deriveMacroStatus(inputs: MacroInputs): MacroDerivation {
  const { interestRateProxy: dff, inflationProxy: cpi, usdStrengthProxy: usd, commodityProxy: oil, yieldCurve: curve } = inputs;

  const availableCount = [dff, cpi, usd, oil, curve].filter(isNum).length;

  let headwind = 0;
  let supportive = 0;

  if (isNum(dff)) {
    if (dff >= 5) headwind += 1;
    else if (dff <= 4) supportive += 1;
  }
  if (isNum(cpi)) {
    if (cpi >= 4) headwind += 1;
    else if (cpi <= 3) supportive += 1;
  }
  if (isNum(curve)) {
    if (curve < 0) headwind += 1;
    else if (curve >= 0.5) supportive += 1;
  }
  if (isNum(oil)) {
    if (oil > 120) headwind += 1;
    else if (oil < 90) supportive += 1;
  }

  let macroStatus: MacroStatus;
  if (availableCount < 2) {
    macroStatus = 'UNKNOWN';
  } else if (headwind >= 2) {
    macroStatus = 'HEADWIND';
  } else if (supportive >= 2) {
    macroStatus = 'SUPPORTIVE';
  } else {
    macroStatus = 'MIXED';
  }

  // dataStatus reflects how many of the FIVE inputs (4 proxies + curve) are present.
  const dataStatus: MarketDataStatus =
    availableCount === 0 ? 'MISSING' : availableCount === 5 ? 'COMPLETE' : 'PARTIAL';

  const explanation = buildExplanation(macroStatus, { dff, cpi, usd, oil, curve });

  return { macroStatus, dataStatus, explanation };
}

function buildExplanation(
  status: MacroStatus,
  vals: { dff: number | null; cpi: number | null; usd: number | null; oil: number | null; curve: number | null },
): string {
  if (status === 'UNKNOWN') {
    return 'Macro regime is unknown: fewer than two FRED macro inputs are currently available.';
  }
  const drivers = [
    `Fed funds ${fmt(vals.dff, { suffix: '%', decimals: 2 })}`,
    `CPI ${fmt(vals.cpi, { suffix: '% YoY', decimals: 1 })}`,
    `yield curve ${fmt(vals.curve, { decimals: 2, prefix: isNum(vals.curve) && vals.curve >= 0 ? '+' : '' })}`,
    `WTI ${fmt(vals.oil, { prefix: '$', decimals: 0 })}`,
    `USD index ${fmt(vals.usd, { decimals: 1 })}`,
  ].join(', ');
  const word =
    status === 'SUPPORTIVE' ? 'supportive' : status === 'HEADWIND' ? 'a headwind' : 'mixed';
  return `${drivers} — macro backdrop reads as ${word}. Regime characterization for research support only, not advice.`;
}
