import { sma } from './calculations/sma';
import { rsi, stochRsi } from './calculations/rsi';
import { pivotPointsStandard } from './calculations/pivotPoints';
import type { IndicatorDef, IndicatorId, IndicatorPoint, IndicatorResult, OHLCVBar } from './types';

// ─── helpers ────────────────────────────────────────────────────────────────

function toPoints(bars: OHLCVBar[], vals: (number | null)[]): IndicatorPoint[] {
  return bars
    .map((b, i) => (vals[i] != null ? { time: b.time, value: vals[i] as number } : null))
    .filter((p): p is IndicatorPoint => p !== null);
}

// ─── indicator definitions ───────────────────────────────────────────────────

const SMA50: IndicatorDef = {
  id: 'sma50',
  label: '50 DMA',
  pane: 'overlay',
  defaultEnabled: false,
  calculate(bars): IndicatorResult {
    const data = toPoints(bars, sma(bars.map((b) => b.close), 50));
    return {
      id: 'sma50',
      pane: 'overlay',
      series: [{ id: 'line', label: '50 DMA', color: '#2196f3', lineWidth: 1, data }],
    };
  },
};

const SMA200: IndicatorDef = {
  id: 'sma200',
  label: '200 DMA',
  pane: 'overlay',
  defaultEnabled: false,
  calculate(bars): IndicatorResult {
    const data = toPoints(bars, sma(bars.map((b) => b.close), 200));
    return {
      id: 'sma200',
      pane: 'overlay',
      series: [{ id: 'line', label: '200 DMA', color: '#ff9800', lineWidth: 1, data }],
    };
  },
};

const RSI: IndicatorDef = {
  id: 'rsi',
  label: 'RSI (14)',
  pane: 'oscillator',
  defaultEnabled: false,
  calculate(bars): IndicatorResult {
    const data = toPoints(bars, rsi(bars.map((b) => b.close), 14));
    return {
      id: 'rsi',
      pane: 'oscillator',
      series: [{ id: 'rsi', label: 'RSI (14)', color: '#9c27b0', lineWidth: 2, data }],
      referenceLevels: [
        { value: 70, color: 'rgba(239,83,80,0.45)', label: 'Overbought' },
        { value: 50, color: 'rgba(150,150,150,0.35)' },
        { value: 30, color: 'rgba(38,166,154,0.45)', label: 'Oversold' },
      ],
    };
  },
};

const STOCH_RSI: IndicatorDef = {
  id: 'stoch_rsi',
  label: 'Stoch RSI',
  pane: 'oscillator',
  defaultEnabled: false,
  calculate(bars): IndicatorResult {
    const { k, d } = stochRsi(bars.map((b) => b.close));
    // Scale 0-1 → 0-100 for readability
    const scale = (v: number | null) => (v === null ? null : v * 100);
    const kData = toPoints(bars, k.map(scale));
    const dData = toPoints(bars, d.map(scale));
    return {
      id: 'stoch_rsi',
      pane: 'oscillator',
      series: [
        { id: 'k', label: '%K', color: '#2196f3', lineWidth: 2, data: kData },
        { id: 'd', label: '%D', color: '#ff9800', lineWidth: 2, data: dData, dashed: true },
      ],
      referenceLevels: [
        { value: 80, color: 'rgba(239,83,80,0.45)', label: 'Overbought' },
        { value: 20, color: 'rgba(38,166,154,0.45)', label: 'Oversold' },
      ],
    };
  },
};

const PIVOT_STANDARD: IndicatorDef = {
  id: 'pivot_standard',
  label: 'Pivot Points',
  pane: 'overlay',
  defaultEnabled: false,
  calculate(bars): IndicatorResult {
    const levels = pivotPointsStandard(bars);
    if (!levels || bars.length === 0) {
      return { id: 'pivot_standard', pane: 'overlay', series: [] };
    }
    const mkSeries = (
      id: string,
      label: string,
      color: string,
      val: number,
      dashed = false,
    ) => ({
      id,
      label,
      color,
      lineWidth: 1 as const,
      dashed,
      // Only draw over the most recent ~60 bars so lines don't span years of history.
      data: bars.slice(-60).map((b) => ({ time: b.time, value: val })),
    });
    return {
      id: 'pivot_standard',
      pane: 'overlay',
      series: [
        mkSeries('pp', 'PP',   '#9e9e9e', levels.pp),
        mkSeries('r1', 'R1',   '#ef5350', levels.r1, true),
        mkSeries('r2', 'R2',   '#ef5350', levels.r2, true),
        mkSeries('r3', 'R3',   '#ef5350', levels.r3, true),
        mkSeries('s1', 'S1',   '#26a69a', levels.s1, true),
        mkSeries('s2', 'S2',   '#26a69a', levels.s2, true),
        mkSeries('s3', 'S3',   '#26a69a', levels.s3, true),
      ],
    };
  },
};

// ─── registry ────────────────────────────────────────────────────────────────

export const INDICATOR_REGISTRY: Record<IndicatorId, IndicatorDef> = {
  sma50: SMA50,
  sma200: SMA200,
  rsi: RSI,
  stoch_rsi: STOCH_RSI,
  pivot_standard: PIVOT_STANDARD,
};

/** Display order for the toolbar. */
export const INDICATOR_ORDER: IndicatorId[] = [
  'sma50',
  'sma200',
  'rsi',
  'stoch_rsi',
  'pivot_standard',
];

/** Indicators active by default on first load. */
export const DEFAULT_INDICATORS: IndicatorId[] = [];
