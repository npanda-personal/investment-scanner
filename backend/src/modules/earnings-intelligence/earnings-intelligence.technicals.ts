/**
 * Numeric technicals bundle for Earnings Intelligence (Phase 3).
 *
 * Computed at REFRESH time from the price/delivery history already loaded for the
 * price-reaction maths — no extra reads, no live fetch (persisted-read rule).  The
 * indicator maths is reused from the signal-generation-engine's pure functions via
 * its public index so there is one source of truth for RSI/SMA/ADX/period highs;
 * this module only adapts the earnings price shape and derives the SMA posture /
 * 52-week position from them.
 *
 * Research-support framing: these are descriptive posture readings shown alongside
 * a result, never a buy/sell call.
 */
import { adx, periodHigh, periodLow, rsi, sma, type SignalPricePoint } from '../signal-generation-engine';
import { round2 } from './earnings-intelligence.date-utils';
import type { EarningsDeliveryInput, EarningsPricePointInput } from './earnings-intelligence.types';

/** Posture of the latest close relative to its 50- and 200-bar simple moving averages. */
export type EarningsSmaPosture =
  | 'ABOVE_50_200' // above both — constructive
  | 'BELOW_50_200' // below both — weak
  | 'ABOVE_50_BELOW_200' // reclaimed the short MA, still under the long — recovering
  | 'BELOW_50_ABOVE_200' // lost the short MA, still over the long — cooling
  | 'ABOVE_50' // only the 50-bar MA is available
  | 'BELOW_50'
  | 'ABOVE_200' // only the 200-bar MA is available
  | 'BELOW_200';

export interface EarningsTechnicals {
  /** Wilder RSI(14) on adjusted closes (0–100). */
  rsi14: number | null;
  /** Categorical 50/200 SMA posture (see EarningsSmaPosture). */
  smaPosture: EarningsSmaPosture | null;
  /** Position of the latest close within its trailing 52-week range (0–100 %). */
  pricePosition52w: number | null;
  /** Wilder ADX(14) trend-strength reading (0–100). */
  adx14: number | null;
  /** Most recent delivery % (NSE delivery-based volume share); null outside India. */
  deliveryPercent: number | null;
}

const RSI_PERIOD = 14;
const ADX_PERIOD = 14;
const SMA_FAST = 50;
const SMA_SLOW = 200;
// ~one trading year; periodHigh/Low cap at the available bar count.
const WEEKS_52_SESSIONS = 252;

/**
 * Compute the numeric technicals bundle for one instrument.  Returns all-null when
 * there is no usable price history; each field independently degrades to null when
 * its own warm-up window is not met, so a short history still yields what it can.
 */
export function computeEarningsTechnicals(
  prices: EarningsPricePointInput[],
  deliverySnapshots: EarningsDeliveryInput[],
): EarningsTechnicals {
  const points = toSignalPricePoints(prices);
  return {
    rsi14: roundOrNull(rsi(points, RSI_PERIOD)),
    smaPosture: smaPosture(points),
    pricePosition52w: pricePosition52w(points),
    adx14: roundOrNull(adx(points, ADX_PERIOD)),
    deliveryPercent: latestDeliveryPercent(deliverySnapshots),
  };
}

/**
 * Adapt the earnings price shape to the indicator price-point contract, newest
 * first (index 0 = latest bar).  Sorted defensively so the result never depends on
 * the caller's ordering.  Adjusted high/low are not loaded for earnings, so the
 * indicators fall back to raw high/low (their documented safe fallback).
 */
function toSignalPricePoints(prices: EarningsPricePointInput[]): SignalPricePoint[] {
  return [...prices]
    .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())
    .map((price) => ({
      date: price.timestamp.toISOString().slice(0, 10),
      open: null,
      high: price.high ?? null,
      low: price.low ?? null,
      close: price.close,
      adjusted_close: price.adjustedClose ?? price.close,
      volume: price.volume,
    }));
}

function smaPosture(points: SignalPricePoint[]): EarningsSmaPosture | null {
  if (points.length === 0) return null;
  const close = points[0].adjusted_close;
  const fast = sma(points, SMA_FAST);
  const slow = sma(points, SMA_SLOW);
  const aboveFast = fast !== null ? close >= fast : null;
  const aboveSlow = slow !== null ? close >= slow : null;
  if (aboveFast !== null && aboveSlow !== null) {
    if (aboveFast && aboveSlow) return 'ABOVE_50_200';
    if (!aboveFast && !aboveSlow) return 'BELOW_50_200';
    return aboveFast ? 'ABOVE_50_BELOW_200' : 'BELOW_50_ABOVE_200';
  }
  if (aboveFast !== null) return aboveFast ? 'ABOVE_50' : 'BELOW_50';
  if (aboveSlow !== null) return aboveSlow ? 'ABOVE_200' : 'BELOW_200';
  return null;
}

function pricePosition52w(points: SignalPricePoint[]): number | null {
  if (points.length === 0) return null;
  const window = Math.min(points.length, WEEKS_52_SESSIONS);
  const high = periodHigh(points, window);
  const low = periodLow(points, window);
  if (high === null || low === null || high === low) return null;
  const close = points[0].adjusted_close;
  return round2(((close - low) / (high - low)) * 100);
}

function latestDeliveryPercent(deliverySnapshots: EarningsDeliveryInput[]): number | null {
  const latest = [...deliverySnapshots]
    .filter((snapshot) => snapshot.deliveryPercent !== null)
    .sort((left, right) => right.tradingDate.getTime() - left.tradingDate.getTime())[0];
  return latest ? round2(latest.deliveryPercent as number) : null;
}

function roundOrNull(value: number | null): number | null {
  return value === null ? null : round2(value);
}
