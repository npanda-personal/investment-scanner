/**
 * Market-gate derivation for the Strategy Decision Engine.
 *
 * Extracted from the service (audit) so the gate mapping is a single pure
 * function, independently testable and reusable. The service keeps thin
 * delegating methods (`marketGateFromSummary`, `canBuildMarketGateFromSummary`)
 * so existing call sites and tests are unaffected.
 *
 * Thresholds come from Capital Posture (capital-posture.types.ts) — the single
 * source of truth for regime/breadth gate boundaries — so tuning there
 * propagates here automatically.
 *
 * Gate mapping (mirrors Capital Posture posture derivation):
 *   OPEN      ← RISK_ON regime AND breadth ≥ BREADTH_WEAK_THRESHOLD (0.40)
 *   CLOSED    ← RISK_OFF regime OR breadth < BREADTH_VERY_WEAK_THRESHOLD (0.25)
 *   SELECTIVE ← everything else (NEUTRAL / weak-breadth RISK_ON)
 *   UNKNOWN   ← regime or breadth evidence is missing (audit BL-1): missing
 *               breadth must NOT be reported as an active bearish (CLOSED/BAD)
 *               signal — it is a genuine data gap, surfaced conservatively.
 */
import {
  BREADTH_WEAK_THRESHOLD,
  BREADTH_VERY_WEAK_THRESHOLD,
} from '../market-context-intelligence/capital-posture.types';
import type {
  AllowedAction,
  MarketCondition,
  MarketGate,
  MarketGateResponse,
} from './strategy-decision-engine.types';

/** True when a summary carries enough evidence to derive a concrete gate. */
export function canBuildMarketGate(summary: any): boolean {
  return Boolean(summary && summary.dataStatus !== 'MISSING' && summary.regime && summary.breadth);
}

function unknownGate(summary: any, score: number): MarketGateResponse {
  return {
    marketCondition: 'UNKNOWN',
    marketGate: 'UNKNOWN',
    allowedActions: ['MANAGE_EXISTING_POSITIONS_ONLY'],
    marketScore: score,
    reasons: [],
    blockers: [],
    dataStatus: summary?.dataStatus || 'MISSING',
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Derive a MarketGateResponse from a market summary, regime and breadth
 * snapshot. Returns an explicit UNKNOWN gate (not BAD/CLOSED) when regime or
 * breadth evidence is absent.
 */
export function deriveMarketGate(summary: any, regime: any, breadth: any): MarketGateResponse {
  const score = regime?.score ?? 0;

  // BL-1: without regime AND breadth we cannot classify; surface UNKNOWN rather
  // than letting a default breadth of 0 trip the CLOSED/BAD branch below.
  if (!regime || !breadth) {
    return unknownGate(summary, score);
  }

  const reasons: string[] = [];
  const blockers: string[] = [];
  let marketCondition: MarketCondition;
  let marketGate: MarketGate;
  let allowedActions: AllowedAction[];

  const isRiskOn = regime?.regime === 'RISK_ON';
  const isRiskOff = regime?.regime === 'RISK_OFF';
  // breadthAbove50 is a fraction in [0, 1]; thresholds come from Capital Posture.
  const breadthAbove50 = breadth?.percentAboveSma50 ?? 0;

  if (isRiskOn && breadthAbove50 >= BREADTH_WEAK_THRESHOLD) {
    // Capital Posture: RISK_ON posture requires RISK_ON regime AND breadth ≥ BREADTH_WEAK_THRESHOLD.
    marketCondition = 'HEALTHY';
    marketGate = 'OPEN';
    allowedActions = ['NEW_LONG_TRADES_ALLOWED', 'ONLY_HIGH_QUALITY_SETUPS'];
    reasons.push('Market regime is Risk-On and breadth is healthy.');
  } else if (isRiskOff || breadthAbove50 < BREADTH_VERY_WEAK_THRESHOLD) {
    // Capital Posture: RISK_OFF posture from RISK_OFF regime OR breadth below BREADTH_VERY_WEAK_THRESHOLD.
    marketCondition = 'BAD';
    marketGate = 'CLOSED';
    allowedActions = ['MANAGE_EXISTING_POSITIONS_ONLY'];
    blockers.push('Market regime is Risk-Off or breadth is weak.');
    if (isRiskOff) reasons.push('High bearish risk detected.');
  } else {
    // Capital Posture: NEUTRAL posture — selective deployment.
    marketCondition = 'MIXED';
    marketGate = 'SELECTIVE';
    allowedActions = ['ONLY_HIGH_QUALITY_SETUPS', 'MANAGE_EXISTING_POSITIONS_ONLY'];
    reasons.push('Market conditions are mixed; selectivity is required.');
  }

  return {
    marketCondition,
    marketGate,
    allowedActions,
    marketScore: score,
    reasons,
    blockers,
    dataStatus: summary?.dataStatus || 'MISSING',
    updatedAt: new Date().toISOString(),
  };
}
