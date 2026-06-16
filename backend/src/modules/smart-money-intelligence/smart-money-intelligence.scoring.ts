import {
  CLOSE_NEAR_HIGH_THRESHOLD,
  CLOSE_NEAR_LOW_THRESHOLD,
  MULTI_DAY_MIN_DAYS,
  MULTI_DAY_WINDOW,
  SCORE_BASELINE,
  SCORE_STRENGTH_COEFFICIENT,
  SIGNAL_STRENGTHS,
} from './smart-money-intelligence.constants';
import type { SmartMoneyScoringConfig } from './smart-money-intelligence.config';
import { DEFAULT_SMART_MONEY_CONFIG } from './smart-money-intelligence.config';
import type {
  SectorSmartMoneyStatus,
  SectorSmartMoneySummary,
  SmartMoneyDataStatus,
  SmartMoneyPriceBar,
  SmartMoneyRange,
  SmartMoneySignal,
  SmartMoneyStatus,
  SmartMoneyStockSummary,
} from './smart-money-intelligence.types';

/**
 * Pure smart-money scoring functions — no DB, no IO, no presentation. Every market
 * threshold is taken from the injected `SmartMoneyScoringConfig` (defaulting to the
 * India-equity baseline) so the same engine scores any region correctly.
 */

// ── Volume helpers ────────────────────────────────────────────────────────────

export function averageVolume(bars: SmartMoneyPriceBar[]): number | null {
  const volumes = bars.map((bar) => bar.volume).filter((volume): volume is number => Number.isFinite(volume));
  return volumes.length > 0 ? volumes.reduce((sum, volume) => sum + volume, 0) / volumes.length : null;
}

/** The 20-day prior window must have enough usable observations to trust the average. */
export function hasUsableVolumeHistory(
  bars: SmartMoneyPriceBar[],
  config: SmartMoneyScoringConfig = DEFAULT_SMART_MONEY_CONFIG,
): boolean {
  const priorWindow = bars.slice(-21, -1);
  const priorVolumeCount = priorWindow.filter((bar) => Number.isFinite(bar.volume) && Number(bar.volume) > 0).length;
  const latestVolumeUsable = Number.isFinite(bars.at(-1)?.volume) && Number(bars.at(-1)?.volume) > 0;
  return latestVolumeUsable && priorVolumeCount >= config.minPriorVolumeObservations;
}

// ── Daily change ──────────────────────────────────────────────────────────────

/**
 * Max calendar-day gap between two daily bars that still counts as consecutive trading
 * sessions. Covers weekends plus holiday clusters (long weekends, Diwali-style multi-day
 * breaks). A larger gap means missing history, so a "day-over-day" change across it is not
 * a real daily move.
 */
export const MAX_ADJACENT_SESSION_GAP_DAYS = 7;

/**
 * Day-over-day change as a FRACTION (e.g. -0.012 = -1.2%; the UI multiplies by 100),
 * computed ONLY when `previous` is the trading session immediately preceding `latest`.
 * Returns null when there is no usable prior close, the bar dates are unparseable, or a
 * data gap separates the two bars — so a stale prior bar (e.g. a year-old close from a
 * gapped instrument) can never masquerade as a one-day move.
 */
export function dailyChangePercentBetweenSessions(
  previous: SmartMoneyPriceBar | undefined,
  latest: SmartMoneyPriceBar | undefined,
): number | null {
  if (!previous || !latest || !(previous.close > 0)) return null;
  const prevMs = Date.parse(previous.date);
  const latestMs = Date.parse(latest.date);
  if (!Number.isFinite(prevMs) || !Number.isFinite(latestMs)) return null;
  const gapDays = (latestMs - prevMs) / 86_400_000;
  if (gapDays <= 0 || gapDays > MAX_ADJACENT_SESSION_GAP_DAYS) return null;
  return (latest.close - previous.close) / previous.close;
}

// ── Score + status ──────────────────────────────────────────────────────────

export function calculateScore(accumulationStrength: number, distributionStrength: number): number {
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(SCORE_BASELINE + accumulationStrength * SCORE_STRENGTH_COEFFICIENT - distributionStrength * SCORE_STRENGTH_COEFFICIENT),
    ),
  );
}

export function classifyStockStatus(
  score: number,
  config: SmartMoneyScoringConfig = DEFAULT_SMART_MONEY_CONFIG,
): SmartMoneyStatus {
  if (score >= config.accumulationScoreThreshold) return 'ACCUMULATION';
  if (score <= config.distributionScoreThreshold) return 'DISTRIBUTION';
  return 'NEUTRAL';
}

// ── Signal detection ──────────────────────────────────────────────────────────

export function detectSignals(
  bars: SmartMoneyPriceBar[],
  averageVolume20: number | null,
  config: SmartMoneyScoringConfig = DEFAULT_SMART_MONEY_CONFIG,
): SmartMoneySignal[] {
  const signals: SmartMoneySignal[] = [];
  const latest = bars[bars.length - 1];
  const previous = bars[bars.length - 2];
  if (!latest || !previous || !averageVolume20 || !latest.volume) return signals;

  const volumeRatio = latest.volume / averageVolume20;
  const highVolume = volumeRatio >= config.highVolumeRatio;
  const unusualVolume = volumeRatio >= config.unusualVolumeRatio;
  const priceChange = previous.close > 0 ? (latest.close - previous.close) / previous.close : 0;
  const closePosition = latest.high !== null && latest.low !== null && latest.high > latest.low
    ? (latest.close - latest.low) / (latest.high - latest.low)
    : null;

  if (unusualVolume) {
    signals.push({
      type: 'UNUSUAL_VOLUME',
      label: 'Unusual volume',
      direction: priceChange >= 0 ? 'ACCUMULATION' : 'DISTRIBUTION',
      strength: SIGNAL_STRENGTHS.unusualVolume,
      details: `Latest volume is ${volumeRatio.toFixed(1)}x the 20-day average.`,
    });
  }
  if (highVolume && priceChange > 0) signals.push({ type: 'PRICE_UP_HIGH_VOLUME', label: 'Price up on high volume', direction: 'ACCUMULATION', strength: SIGNAL_STRENGTHS.priceUpHighVolume, details: 'Price rose on above-average volume.' });
  if (highVolume && priceChange < 0) signals.push({ type: 'PRICE_DOWN_HIGH_VOLUME', label: 'Price down on high volume', direction: 'DISTRIBUTION', strength: SIGNAL_STRENGTHS.priceDownHighVolume, details: 'Price fell on above-average volume.' });
  if (highVolume && closePosition !== null && closePosition >= CLOSE_NEAR_HIGH_THRESHOLD) signals.push({ type: 'CLOSE_NEAR_HIGH', label: 'Close near high on volume', direction: 'ACCUMULATION', strength: SIGNAL_STRENGTHS.closeNearHigh, details: 'Close finished near the session high while volume was elevated.' });
  if (highVolume && closePosition !== null && closePosition <= CLOSE_NEAR_LOW_THRESHOLD) signals.push({ type: 'CLOSE_NEAR_LOW', label: 'Close near low on volume', direction: 'DISTRIBUTION', strength: SIGNAL_STRENGTHS.closeNearLow, details: 'Close finished near the session low while volume was elevated.' });

  const recent = bars.slice(-MULTI_DAY_WINDOW);
  const elevated = (bar: SmartMoneyPriceBar) => Boolean(bar.volume && averageVolume20 && bar.volume >= averageVolume20 * config.elevatedVolumeRatio);
  const accumulationDays = recent.slice(1).filter((bar, index) => bar.close > recent[index].close && elevated(bar)).length;
  const distributionDays = recent.slice(1).filter((bar, index) => bar.close < recent[index].close && elevated(bar)).length;
  if (accumulationDays >= MULTI_DAY_MIN_DAYS) signals.push({ type: 'MULTI_DAY_ACCUMULATION', label: 'Multi-day accumulation', direction: 'ACCUMULATION', strength: SIGNAL_STRENGTHS.multiDayAccumulation, details: `${accumulationDays} recent up days had above-average volume.` });
  if (distributionDays >= MULTI_DAY_MIN_DAYS) signals.push({ type: 'MULTI_DAY_DISTRIBUTION', label: 'Multi-day distribution', direction: 'DISTRIBUTION', strength: SIGNAL_STRENGTHS.multiDayDistribution, details: `${distributionDays} recent down days had above-average volume.` });

  return signals;
}

export function detectRangeSignals(
  bars: SmartMoneyPriceBar[],
  range: SmartMoneyRange,
  config: SmartMoneyScoringConfig = DEFAULT_SMART_MONEY_CONFIG,
): SmartMoneySignal[] {
  const signals: SmartMoneySignal[] = [];
  if (bars.length < 30) return signals;
  const usableVolumeCount = bars.filter((bar) => Number.isFinite(bar.volume)).length;
  if (usableVolumeCount < Math.min(20, Math.floor(bars.length * 0.75))) return signals;

  const first = bars[0];
  const latest = bars[bars.length - 1];
  if (!first?.close || !latest?.close || first.close <= 0) return signals;

  const rangeReturn = (latest.close - first.close) / first.close;
  const rangeVolume = averageVolume(bars);
  let upVolume = 0;
  let downVolume = 0;
  let upDays = 0;
  let downDays = 0;
  let highVolumeUpDays = 0;
  let highVolumeDownDays = 0;

  for (let index = 1; index < bars.length; index += 1) {
    const current = bars[index];
    const previous = bars[index - 1];
    const volume = Number.isFinite(current.volume) ? current.volume as number : null;
    const change = current.close - previous.close;
    if (change > 0) {
      upDays += 1;
      if (volume !== null) upVolume += volume;
      if (rangeVolume && volume !== null && volume >= rangeVolume * config.elevatedVolumeRatio) highVolumeUpDays += 1;
    } else if (change < 0) {
      downDays += 1;
      if (volume !== null) downVolume += volume;
      if (rangeVolume && volume !== null && volume >= rangeVolume * config.elevatedVolumeRatio) highVolumeDownDays += 1;
    }
  }

  const directionalVolume = upVolume + downVolume;
  const upVolumeShare = directionalVolume > 0 ? upVolume / directionalVolume : 0.5;
  const downVolumeShare = directionalVolume > 0 ? downVolume / directionalVolume : 0.5;
  const dayCount = Math.max(1, upDays + downDays);
  const upDayShare = upDays / dayCount;
  const downDayShare = downDays / dayCount;

  if (upVolumeShare >= 0.58 && upDayShare >= 0.52 && rangeReturn >= 0.02) {
    const strength = Math.min(SIGNAL_STRENGTHS.rangePressureMax, Math.round(SIGNAL_STRENGTHS.rangePressureBase + (upVolumeShare - 0.58) * 60 + Math.min(0.2, rangeReturn) * 60));
    signals.push({
      type: `RANGE_ACCUMULATION_${range}`,
      label: `${range} accumulation pressure`,
      direction: 'ACCUMULATION',
      strength,
      details: `${range} window has ${(upVolumeShare * 100).toFixed(0)}% of directional volume on up days and ${(rangeReturn * 100).toFixed(1)}% price change.`,
    });
  }

  if (downVolumeShare >= 0.58 && downDayShare >= 0.52 && rangeReturn <= -0.02) {
    const strength = Math.min(SIGNAL_STRENGTHS.rangePressureMax, Math.round(SIGNAL_STRENGTHS.rangePressureBase + (downVolumeShare - 0.58) * 60 + Math.min(0.2, Math.abs(rangeReturn)) * 60));
    signals.push({
      type: `RANGE_DISTRIBUTION_${range}`,
      label: `${range} distribution pressure`,
      direction: 'DISTRIBUTION',
      strength,
      details: `${range} window has ${(downVolumeShare * 100).toFixed(0)}% of directional volume on down days and ${(rangeReturn * 100).toFixed(1)}% price change.`,
    });
  }

  if (highVolumeUpDays >= highVolumeDownDays + 3 && rangeReturn > 0) {
    signals.push({
      type: `RANGE_HIGH_VOLUME_UP_DAYS_${range}`,
      label: `${range} high-volume up-day skew`,
      direction: 'ACCUMULATION',
      strength: Math.min(SIGNAL_STRENGTHS.highVolumeSkewMax, SIGNAL_STRENGTHS.highVolumeSkewBase + Math.min(7, highVolumeUpDays - highVolumeDownDays)),
      details: `${range} window has ${highVolumeUpDays} high-volume up days versus ${highVolumeDownDays} high-volume down days.`,
    });
  }

  if (highVolumeDownDays >= highVolumeUpDays + 3 && rangeReturn < 0) {
    signals.push({
      type: `RANGE_HIGH_VOLUME_DOWN_DAYS_${range}`,
      label: `${range} high-volume down-day skew`,
      direction: 'DISTRIBUTION',
      strength: Math.min(SIGNAL_STRENGTHS.highVolumeSkewMax, SIGNAL_STRENGTHS.highVolumeSkewBase + Math.min(7, highVolumeDownDays - highVolumeUpDays)),
      details: `${range} window has ${highVolumeDownDays} high-volume down days versus ${highVolumeUpDays} high-volume up days.`,
    });
  }

  return signals;
}

// ── Sector classification ─────────────────────────────────────────────────────

/**
 * Classify a sector's average smart-money score into a 5-band status using the
 * market-calibrated bands. (The India baseline bands are tuned to the observed NSE
 * 41–59 spread; other markets inherit the default until calibrated — see config.)
 */
export function classifySectorScore(
  score: number,
  config: SmartMoneyScoringConfig = DEFAULT_SMART_MONEY_CONFIG,
): SectorSmartMoneyStatus {
  const { sectorBands } = config;
  if (score >= sectorBands.strongAccumulation) return 'STRONG_ACCUMULATION';
  if (score >= sectorBands.accumulating) return 'ACCUMULATING';
  if (score >= sectorBands.neutralFloor) return 'NEUTRAL';
  if (score >= sectorBands.distributing) return 'DISTRIBUTING';
  return 'STRONG_DISTRIBUTION';
}

/**
 * A 1–2 stock "sector" cannot honestly be called STRONG_*; soften the extreme
 * verdict to its non-extreme neighbour when the universe is too thin.
 */
export function softenStrongVerdictForThinUniverse(
  status: SectorSmartMoneyStatus,
  instrumentCount: number,
  config: SmartMoneyScoringConfig = DEFAULT_SMART_MONEY_CONFIG,
): SectorSmartMoneyStatus {
  if (instrumentCount >= config.minUniverseForStrongVerdict) return status;
  if (status === 'STRONG_ACCUMULATION') return 'ACCUMULATING';
  if (status === 'STRONG_DISTRIBUTION') return 'DISTRIBUTING';
  return status;
}

/**
 * Aggregate per-stock summaries into per-sector summaries. Single shared
 * implementation for both the persisted-read path (repository) and the on-the-fly
 * path (service) so the two can never diverge. INSUFFICIENT_DATA stocks are excluded;
 * thin-universe softening is applied consistently.
 */
export function aggregateSectorSummaries(
  summaries: SmartMoneyStockSummary[],
  config: SmartMoneyScoringConfig = DEFAULT_SMART_MONEY_CONFIG,
): SectorSmartMoneySummary[] {
  const groups = new Map<string, SmartMoneyStockSummary[]>();
  summaries
    .filter((summary) => summary.status !== 'INSUFFICIENT_DATA')
    .forEach((summary) => {
      const sector = summary.sector || 'Unknown';
      groups.set(sector, [...(groups.get(sector) || []), summary]);
    });

  return [...groups.entries()]
    .map(([sector, items]) => {
      const average = Math.round(items.reduce((sum, item) => sum + item.smartMoneyScore, 0) / Math.max(1, items.length));
      const sectorStatus = softenStrongVerdictForThinUniverse(classifySectorScore(average, config), items.length, config);
      const dataStatus: SmartMoneyDataStatus = items.some((item) => item.dataStatus === 'PARTIAL' || item.dataStatus === 'ERROR') ? 'PARTIAL' : 'COMPLETE';
      const updatedAt = items.map((item) => item.updatedAt).sort().at(-1) || new Date(0).toISOString();
      // The DATA date (snapshotDate) drives the screen's "as of" badge — not updatedAt
      // (the compute timestamp, which a no-op unchanged refresh leaves stale).
      const dataThroughDate = items.map((item) => item.snapshotDate).filter(Boolean).sort().at(-1) || null;
      return {
        sector,
        averageSmartMoneyScore: average,
        accumulationCount: items.filter((item) => item.status === 'ACCUMULATION').length,
        distributionCount: items.filter((item) => item.status === 'DISTRIBUTION').length,
        unusualVolumeCount: items.filter((item) => item.signals.some((signal) => signal.type === 'UNUSUAL_VOLUME')).length,
        instrumentCount: items.length,
        sectorStatus,
        dataStatus,
        snapshotDate: dataThroughDate,
        dataThroughDate,
        updatedAt,
      };
    })
    .sort((a, b) => b.averageSmartMoneyScore - a.averageSmartMoneyScore);
}
