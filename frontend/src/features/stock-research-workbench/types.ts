export type ResearchRange = '1W' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | '3Y' | '5Y' | 'MAX';

export interface ResearchPricePoint {
  date: string;
  close: number;
  adjusted_close: number;
  volume: number | null;
}

/**
 * Signal evidence section as returned by the backend workbench endpoint.
 * All values come from persisted reads only — nothing is live-recomputed on GET.
 */
export interface SignalEvidenceSection {
  /** Overall evidence status. */
  status: 'AVAILABLE' | 'NO_TRACK_RECORD' | 'CALIBRATION_PENDING';
  /** Reliability tier from the latest signal result ('FULL' | 'PARTIAL' | null). */
  reliabilityTier: 'FULL' | 'PARTIAL' | null;
  /** Number of mature outcome rows for the primary horizon. null = none yet. */
  outcomeDepth: number | null;
  /** Horizon string used for the metrics below (e.g. '20D'). */
  trackRecordHorizon: string | null;
  /** Win rate over directional mature outcomes. null = insufficient data. */
  winRate: number | null;
  /** Average forward-return percent over directional mature outcomes. */
  avgForwardReturn: number | null;
  /** Calibrated score from the latest persisted calibration result. */
  calibratedScore: number | null;
  /** Calibrated direction from the latest persisted calibration result. */
  calibratedDirection: string | null;
  /** Human-readable explanation of the evidence status. */
  note: string;
}

export interface ResearchWorkbenchResponse {
  overview: {
    instrument_id: string;
    company_name: string;
    symbol: string;
    exchange: string | null;
    country: string | null;
    sector: string | null;
    industry: string | null;
    currency: string;
    market_cap: number | null;
    latest_price: number | null;
    daily_change: number | null;
    daily_change_percent: number | null;
    last_updated_timestamp: string | null;
    source: string;
    data_status: string;
  };
  chart: {
    range: ResearchRange;
    prices: ResearchPricePoint[];
    adjusted_close_fallback: boolean;
    /** True when fewer than 2 bars exist in the selected range (e.g. price-history gap). */
    insufficient_range_bars?: boolean;
    source: string;
    last_updated_timestamp: string | null;
    data_status: string;
  };
  performance: Record<string, number | null>;
  fundamentals: Record<string, any> | null;
  valuation: Record<string, any>;
  peers: Array<Record<string, any>>;
  relative_strength: Record<string, any>;
  corporate_actions: Array<Record<string, any>>;
  trust: {
    source: string;
    last_updated_timestamp: string | null;
    data_status: string;
  };
  /** Signal evidence / track record section. Present on all successful workbench responses. */
  signalEvidence?: SignalEvidenceSection;
}
