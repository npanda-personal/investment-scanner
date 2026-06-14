/**
 * signal-confidence.ts
 *
 * SG-6: confidence that reflects CONVICTION, not just data sufficiency.
 *
 * The v3 `confidenceFor` graded purely on data completeness (bars / fundamentals /
 * signal count / staleness) — so a no-conviction score sitting at 51 could still be
 * labelled HIGH.  This module folds the v4 composite's displacement (|rawLean − 0.5|,
 * i.e. how far the lean sits from neutral) into the tier, and surfaces a separate
 * `dataComplete` flag so the UI can distinguish "thin data" from "low conviction".
 *
 * Pure / dependency-free apart from the shared confidence type.  When displacement is
 * unknown (the v3 path), it reproduces the legacy data-sufficiency tiers exactly.
 */
import type { SignalConfidence } from './signal-generation-engine.types';

export interface ConfidenceInputs {
  priceBars: number;
  hasFundamental: boolean;
  signalCount: number;
  isStale: boolean;
  /** |rawLean − 0.5| proxy from v4 components, in [0, 0.5]; null/undefined on the v3 path. */
  displacement?: number | null;
}

export interface ConfidenceOutcome {
  confidence: SignalConfidence;
  /** Data-sufficiency flag, reported alongside confidence so they are not conflated. */
  dataComplete: boolean;
}

/** Minimum |displacement| for each conviction tier (composite ~ 50 ± displacement·spread). */
export const CONVICTION_HIGH = 0.18;
export const CONVICTION_MEDIUM = 0.08;

export function resolveConfidence(inputs: ConfidenceInputs): ConfidenceOutcome {
  const dataComplete = inputs.priceBars >= 200 && inputs.hasFundamental && !inputs.isStale;
  const dataHigh = dataComplete && inputs.signalCount >= 6;
  const dataMedium = inputs.priceBars >= 50 && inputs.signalCount >= 3 && !inputs.isStale;

  const displacement = inputs.displacement;
  if (displacement === null || displacement === undefined) {
    // v3 / conviction unknown → legacy data-sufficiency tiers, byte-identical.
    if (dataHigh) return { confidence: 'HIGH', dataComplete };
    if (dataMedium) return { confidence: 'MEDIUM', dataComplete };
    return { confidence: 'LOW', dataComplete };
  }

  // v4: BOTH data sufficiency AND conviction must clear the bar.
  const conviction = Math.abs(displacement);
  if (dataHigh && conviction >= CONVICTION_HIGH) return { confidence: 'HIGH', dataComplete };
  if (dataMedium && conviction >= CONVICTION_MEDIUM) return { confidence: 'MEDIUM', dataComplete };
  return { confidence: 'LOW', dataComplete };
}
