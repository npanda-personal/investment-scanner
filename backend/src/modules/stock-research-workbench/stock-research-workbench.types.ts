import type { MarketDataStatus } from '../market-data-foundation';

export type ResearchRange = '1W' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | '3Y' | '5Y' | 'MAX';

export interface ResearchPricePoint {
  date: string;
  close: number;
  adjusted_close: number;
  volume: number | null;
}

export interface ResearchPerformanceMetrics {
  selected_range_return: number | null;
  return_1d: number | null;
  return_1w: number | null;
  return_1m: number | null;
  return_ytd: number | null;
  return_1y: number | null;
  cagr_3y: number | null;
  max_drawdown: number | null;
  volatility: number | null;
}

/**
 * Signal evidence section on the stock-research workbench.
 * All fields are sourced from PERSISTED reads only (no live recompute).
 * status='NO_TRACK_RECORD' means no mature outcomes exist yet — never fabricated.
 */
export interface SignalEvidenceSection {
  /**
   * 'AVAILABLE'      — at least one mature (dataComplete=true) outcome row exists.
   * 'NO_TRACK_RECORD' — zero mature outcomes persisted; track record not yet established.
   * 'CALIBRATION_PENDING' — calibration row absent even though outcomes may exist.
   */
  status: 'AVAILABLE' | 'NO_TRACK_RECORD' | 'CALIBRATION_PENDING';
  /** Reliability tier from the latest signal result for this instrument ('FULL' | 'PARTIAL' | null). */
  reliabilityTier: 'FULL' | 'PARTIAL' | null;
  /**
   * Number of mature (dataComplete=true) outcome rows for the default horizon (20D).
   * null when no outcomes exist.
   */
  outcomeDepth: number | null;
  /**
   * Evaluation horizon used for the track-record metrics below (e.g. '20D').
   * Sourced from the calibration row's evidence when available; otherwise the
   * default horizon used by the calibration engine.
   */
  trackRecordHorizon: string | null;
  /**
   * Win rate over directional (BULLISH + BEARISH, NEUTRAL excluded) mature outcomes
   * for this instrument at the selected horizon.
   * BULLISH win = forwardReturnPercent > 0; BEARISH win = forwardReturnPercent < 0.
   * null when insufficient data.
   */
  winRate: number | null;
  /** Average forward-return percent over directional mature outcomes. null when absent. */
  avgForwardReturn: number | null;
  /**
   * Calibrated score from the latest persisted SignalCalibrationResult.
   * null when no calibration row exists.
   */
  calibratedScore: number | null;
  /**
   * Calibrated direction from the latest persisted SignalCalibrationResult.
   * null when no calibration row exists.
   */
  calibratedDirection: string | null;
  /**
   * Human-readable note explaining the evidence status.
   * E.g. "No track record yet — outcomes will populate as signals mature."
   */
  note: string;
}

export interface ResearchWorkbenchResponse {
  overview: Record<string, unknown>;
  chart: {
    range: ResearchRange;
    prices: ResearchPricePoint[];
    adjusted_close_fallback: boolean;
    /** True when fewer than 2 bars exist in the selected range (e.g. price-history gap). */
    insufficient_range_bars: boolean;
    source: string;
    last_updated_timestamp: string | null;
    data_status: MarketDataStatus;
  };
  performance: ResearchPerformanceMetrics;
  fundamentals: Record<string, unknown> | null;
  valuation: Record<string, unknown>;
  peers: Array<Record<string, unknown>>;
  relative_strength: Record<string, unknown>;
  corporate_actions: Array<Record<string, unknown>>;
  trust: {
    source: string;
    last_updated_timestamp: string | null;
    data_status: MarketDataStatus;
  };
  /** Signal evidence section — reliability, track record and calibration (persisted-read only). */
  signalEvidence: SignalEvidenceSection;
}
