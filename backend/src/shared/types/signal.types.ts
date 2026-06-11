export type SignalDirection = 'BULLISH' | 'NEUTRAL' | 'BEARISH';
export type SignalConfidence = 'LOW' | 'MEDIUM' | 'HIGH';
export type SignalLifecycleState = 'ENTRY' | 'ACTIVE' | 'EXIT' | 'EXPIRED';

// CB-4: exported so signal-calibration-engine can import and reuse these values
// rather than re-encoding its own cut-points (which caused a 60/70 mismatch).
export const DIRECTION_BULLISH_THRESHOLD = 60;
export const DIRECTION_BEARISH_THRESHOLD = 40;
