export type IndicatorId = 'sma50' | 'sma200' | 'rsi' | 'stoch_rsi' | 'pivot_standard';

export type IndicatorPane = 'overlay' | 'oscillator';

export interface OHLCVBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
}

export interface IndicatorPoint {
  time: string;
  value: number;
}

export interface IndicatorSeries {
  id: string;
  label: string;
  color: string;
  lineWidth?: 1 | 2 | 3 | 4;
  data: IndicatorPoint[];
  dashed?: boolean;
}

export interface ReferenceLevel {
  value: number;
  color: string;
  label?: string;
}

export interface IndicatorResult {
  id: IndicatorId;
  pane: IndicatorPane;
  series: IndicatorSeries[];
  referenceLevels?: ReferenceLevel[];
}

export interface IndicatorDef {
  id: IndicatorId;
  label: string;
  pane: IndicatorPane;
  defaultEnabled: boolean;
  calculate(bars: OHLCVBar[]): IndicatorResult;
}
