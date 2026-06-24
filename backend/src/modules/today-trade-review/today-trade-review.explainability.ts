/**
 * today-trade-review.explainability.ts — single source of truth for deriving an
 * explainability ranking-component breakdown from a candidate's persisted snapshots.
 *
 * Two call sites need the SAME breakdown and must not drift:
 *   - the SERVICE (write path) computes it at run time; when the precise in-memory
 *     source (`__sourceForExplainability`) is present it uses that, otherwise it
 *     falls back to these snapshot-derived scores.
 *   - the REPOSITORY (read path) reconstructs it for already-persisted candidates,
 *     which never carry the transient source object, so it ALWAYS uses these scores.
 *
 * Previously the read path fabricated the breakdown from presence flags (every
 * component a fixed 5/8 whenever its snapshot existed) and read phantom keys
 * (`signalCalibration`/`smartMoney` off nested fields that are never populated, so
 * they were always 0). That made the trader-facing breakdown meaningless. Both
 * paths now share this one honest, snapshot-grounded formula.
 */

export interface ExplainabilityCandidateSnapshots {
  strategyProofSnapshot?: unknown;
  tradePlanSnapshot?: unknown;
  marketContextSnapshot?: unknown;
  dataQualitySnapshot?: unknown;
  sourceSignalSnapshot?: unknown;
}

export interface ExplainabilityRankingComponentScores {
  strategyProof: number;
  tradePlan: number;
  marketRegime: number;
  sectorAlignment: number;
  signalCalibration: number;
  dataQuality: number;
  smartMoney: number;
}

/**
 * Derive the per-component scores purely from a candidate's persisted snapshots.
 * Mirrors the strategy-decision scoring weights (strategyProof ≤25, tradePlan ≤20,
 * marketRegime ≤10, sectorAlignment ≤10, dataQuality ≤15, signal/smartMoney ≤5).
 */
export function snapshotComponentScores(
  candidate: ExplainabilityCandidateSnapshots,
): ExplainabilityRankingComponentScores {
  const proof = candidate.strategyProofSnapshot as any;
  const plan = candidate.tradePlanSnapshot as any;
  const dataQuality = candidate.dataQualitySnapshot as any;
  const signal = candidate.sourceSignalSnapshot as any;

  return {
    strategyProof:
      proof?.evidenceLabel === 'STRONG'
        ? 25
        : proof?.frameworkBacked
          ? 22
          : proof?.evidenceLabel === 'UNPROVEN'
            ? 0
            : proof
              ? 8
              : 0,
    tradePlan:
      plan?.planStatus === 'VALID'
        ? Math.min(20, 10 + Number(plan.rewardRiskRatio || 0) * 4)
        : 0,
    marketRegime: candidate.marketContextSnapshot ? 10 : 0,
    sectorAlignment: dataQuality?.sector ? 10 : dataQuality ? 5 : 0,
    signalCalibration: signal?.calibration || signal?.setup ? 5 : 0,
    dataQuality:
      dataQuality?.coverageStatus === 'GOOD' || dataQuality?.dataStatus === 'PRICE_ACTION_READY'
        ? 15
        : dataQuality
          ? 6
          : 0,
    smartMoney: signal?.smartMoney ? 5 : 0,
  };
}
