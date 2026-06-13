import {
  DIRECTION_BULLISH_THRESHOLD,
  DIRECTION_BEARISH_THRESHOLD,
} from '../signal-generation-engine';
import { SCORE_BUCKETS } from '../signal-quality-lab';
import { SIGNAL_HISTORY_MIN_BARS, type EligibilityFacts } from '../../shared/types/eligibility-policy';
import type { CalibrationPolicy } from './signal-calibration-engine.config';
import { DEFAULT_CALIBRATION_POLICY } from './signal-calibration-engine.config';
import { CalibrationEvidenceBuilder } from './signal-calibration-engine.evidence';
import { clamp } from './signal-calibration-engine.util';
import type {
  CalibrationAdjustment,
  CalibrationConfidenceLevel,
  CalibrationContext,
  SignalCalibrationResultDto,
  SignalLikeForCalibration,
} from './signal-calibration-engine.types';

type QualityMetric = { winRate: number | null; averageForwardReturn: number | null; sampleSize: number };

/**
 * The pure calibration core: turns a raw signal + its measured context into a
 * calibrated result with bounded, explainable adjustments. All thresholds,
 * caps, and adjustment deltas come from the injected {@link CalibrationPolicy},
 * so behaviour is fully configurable per market without editing this logic.
 *
 * Raw scores are never overwritten — the calibrated score is a separate, capped
 * delta off the raw score.
 */
export class CalibrationScorer {
  constructor(
    private readonly policy: CalibrationPolicy = DEFAULT_CALIBRATION_POLICY,
    private readonly evidence: CalibrationEvidenceBuilder = new CalibrationEvidenceBuilder(policy)
  ) {}

  calibrate(signal: SignalLikeForCalibration, context: CalibrationContext): SignalCalibrationResultDto {
    const policy = this.policy;
    const { minGroup } = policy.samples;
    const caps = policy.adjustmentCaps;

    const boosts: CalibrationAdjustment[] = [];
    const penalties: CalibrationAdjustment[] = [];
    const reasons: string[] = [];
    const evidenceWarnings: string[] = [];

    const overallEvaluatedSamples = context.evaluationDiagnostics?.evaluatedSignals ?? 0;
    const evaluatedForHorizon = context.horizonAvailability?.[context.horizon]?.evaluated ?? overallEvaluatedSamples;
    // NOTE (§1b): overallEvaluatedSamples is deliberately NOT back-filled from a
    // single score-bucket's sampleSize — one bucket's N is not the corpus N and
    // conflating them mis-states overall confidence. A bucket's samples still
    // contribute to groupEvaluatedSamples below, which is the correct channel.

    let evidenceStatus = this.classifyEvidenceStatus(context, overallEvaluatedSamples, evaluatedForHorizon);
    let baseConfidence = this.classifyBaseConfidence(overallEvaluatedSamples);

    if (evidenceStatus === 'MISSING') {
      baseConfidence = 'INSUFFICIENT_SAMPLE';
      evidenceWarnings.push('Using raw score because calibration evidence is missing.');
    } else if (evaluatedForHorizon === 0) {
      baseConfidence = 'INSUFFICIENT_SAMPLE';
      evidenceWarnings.push(`Using raw score because calibration evidence is insufficient. Calibration skipped because selected horizon ${context.horizon} has insufficient evaluated outcomes.`);
    } else if (evidenceStatus === 'LOW_SAMPLE' || evidenceStatus === 'INSUFFICIENT') {
      evidenceWarnings.push(`Horizon ${context.horizon} has ${overallEvaluatedSamples} evaluated samples overall. Calibration confidence is ${baseConfidence}.`);
    }

    let adjustmentCap = caps[baseConfidence] || caps.INSUFFICIENT_SAMPLE;

    const add = (adjustment: CalibrationAdjustment, groupSampleSize?: number) => {
      if (baseConfidence === 'INSUFFICIENT_SAMPLE') {
        reasons.push(`Skipped ${adjustment.type} adjustment because selected horizon has insufficient evaluated outcomes.`);
        return;
      }
      if (groupSampleSize !== undefined && groupSampleSize < minGroup) {
        reasons.push(`Skipped ${adjustment.type} adjustment due to low group sample (${groupSampleSize} < ${minGroup}).`);
        return;
      }

      const boundedDelta = Math.sign(adjustment.delta) * Math.min(Math.abs(adjustment.delta), adjustmentCap);
      const bounded = { ...adjustment, delta: boundedDelta };

      if (bounded.delta > 0) boosts.push(bounded);
      else if (bounded.delta < 0) penalties.push(bounded);

      reasons.push(bounded.label);
    };

    let groupEvaluatedSamples = 0;
    const cutoffs = policy.qualityCutoffs;

    for (const item of signal.triggered_signals || []) {
      const metric = context.signalTypeMetrics.get(item.code);
      if (metric) groupEvaluatedSamples = Math.max(groupEvaluatedSamples, metric.sampleSize);

      if (!metric || metric.sampleSize < minGroup) {
        context.dataGaps.push(`Low sample size for signal type ${item.code}.`);
        continue;
      }
      if ((metric.winRate ?? 0) >= cutoffs.signalType.boostWinRate && (metric.averageForwardReturn ?? 0) > 0) {
        add({ type: 'SIGNAL_TYPE', label: `${item.code} has favorable historical quality.`, delta: cutoffs.signalType.boostDelta, evidence: metric }, metric.sampleSize);
      }
      if ((metric.winRate ?? 1) <= cutoffs.signalType.penaltyWinRate || (metric.averageForwardReturn ?? 0) < 0) {
        add({ type: 'SIGNAL_TYPE', label: `${item.code} has weak historical quality.`, delta: cutoffs.signalType.penaltyDelta, evidence: metric }, metric.sampleSize);
      }
    }
    groupEvaluatedSamples = Math.max(
      groupEvaluatedSamples,
      context.scoreBucketMetric?.sampleSize ?? 0,
      context.sectorMetric?.sampleSize ?? 0
    );

    const sourceEvidenceStatus = this.evidence.finalEvidenceStatus(evidenceStatus, groupEvaluatedSamples);
    const sourceConfidenceTier = this.evidence.confidenceTier(overallEvaluatedSamples, groupEvaluatedSamples, evaluatedForHorizon, sourceEvidenceStatus);
    adjustmentCap = caps[sourceConfidenceTier] || caps.INSUFFICIENT_SAMPLE;

    this.metricAdjustment(context.scoreBucketMetric, 'SCORE_BUCKET', 'Raw score bucket', add);
    this.metricAdjustment(context.sectorMetric, 'SECTOR', 'Sector history', add);

    this.regimeAdjustment(signal, context.regime, add, context.dataGaps);
    this.sectorLeadershipAdjustment(signal, context.sectorLeadership, add, context.dataGaps);
    this.smartMoneyAdjustment(signal, context.smartMoneyStatus, add, context.dataGaps);
    // DQE is authoritative: apply it when present and skip the historical-snapshot
    // path so data-quality penalties never stack from two sources.
    if (context.dataQualityEvaluation) {
      this.persistedDataQualityAdjustment(context.dataQualityEvaluation, add, context.dataGaps);
    } else {
      this.dataQualityAdjustment(signal, context.dataQuality, add, context.dataGaps, context.eligibilityFacts ?? null);
    }

    for (const issue of context.noisyIssueTypes) {
      add({ type: 'NOISE', label: `Noise flag detected: ${issue}.`, delta: issue.includes('FAILED') ? policy.contextDeltas.noise.failed : policy.contextDeltas.noise.other, evidence: { issue } });
    }

    const rawDelta = [...boosts, ...penalties].reduce((sum, adjustment) => sum + adjustment.delta, 0);
    const scoreDelta = Math.round(clamp(rawDelta, -policy.totalDeltaCap, policy.totalDeltaCap));
    const calibratedScore = clamp(Math.round(signal.score + scoreDelta), 0, 100);
    const calibratedDirection = this.directionForScore(calibratedScore);
    const finalEvidenceStatus = this.evidence.finalEvidenceStatus(evidenceStatus, groupEvaluatedSamples);
    const confidenceTier = this.evidence.confidenceTier(overallEvaluatedSamples, groupEvaluatedSamples, evaluatedForHorizon, finalEvidenceStatus);
    const calibratedConfidence = this.confidence(signal.confidence, confidenceTier, boosts, penalties, context);

    const calibrationApplied = boosts.length > 0 || penalties.length > 0;
    const sampleSizePenaltyApplied = confidenceTier === 'INSUFFICIENT_SAMPLE' || confidenceTier === 'LOW';
    const evidenceBasis = this.evidence.calibrationEvidenceBasis(
      context.horizon,
      {
        generatedAt: context.signalQualityGeneratedAt ?? null,
        evaluationDiagnostics: context.evaluationDiagnostics || null,
        horizonAvailability: context.horizonAvailability || null,
      },
      { metricsSource: context.metricsSource }
    );
    const calibrationEvidence = this.evidence.calibrationEvidence({
      horizon: context.horizon,
      overallEvaluatedSamples,
      groupEvaluatedSamples,
      horizonAvailability: context.horizonAvailability || {},
      dataStatus: context.dataGaps.length > 0 ? 'PARTIAL' : 'COMPLETE',
      evidenceStatus: finalEvidenceStatus,
      evidenceReasons: reasons,
      evidenceWarnings,
      evidenceBasis,
      metricsSource: context.metricsSource,
    });
    const calibrationReadiness = this.evidence.calibrationReadiness({
      evidenceStatus: finalEvidenceStatus,
      confidenceTier,
      calibrationApplied,
      adjustmentCapApplied: adjustmentCap,
      rawScoreAvailable: Number.isFinite(signal.score),
      evaluatedForHorizon,
      overallEvaluatedSamples,
      groupEvaluatedSamples,
      evidenceWarnings,
      dataGaps: context.dataGaps,
    });

    return {
      signalResultId: signal.id || '',
      instrumentId: signal.instrument_id,
      symbol: signal.symbol,
      companyName: signal.company_name,
      sector: signal.sector,
      country: signal.country,
      rawScore: signal.score,
      calibratedScore,
      scoreDelta,
      rawDirection: signal.direction,
      calibratedDirection,
      rawConfidence: signal.confidence,
      calibratedConfidence,
      boosts,
      penalties,
      calibrationReasons: reasons,
      dataGaps: [...new Set(context.dataGaps)],
      calibrationModelVersion: policy.calibrationModelVersion,
      rawSignalModelVersion: signal.modelVersion || null,
      generatedAt: new Date().toISOString(),
      dataStatus: context.dataGaps.length > 0 ? 'PARTIAL' : 'COMPLETE',
      dataQuality: context.dataQualityEvaluation ? {
        coverageScore: context.dataQualityEvaluation.coverageScore,
        coverageStatus: context.dataQualityEvaluation.coverageStatus,
        signalReadinessScore: context.dataQualityEvaluation.signalReadinessScore,
        signalReadinessStatus: context.dataQualityEvaluation.signalReadinessStatus,
        liquidityScore: context.dataQualityEvaluation.liquidityScore,
        liquidityStatus: context.dataQualityEvaluation.liquidityStatus,
        eligibleForSignals: context.dataQualityEvaluation.eligibleForSignals,
        eligibleForCalibration: context.dataQualityEvaluation.eligibleForCalibration,
        warnings: context.dataQualityEvaluation.warnings,
        readinessBlockers: context.dataQualityEvaluation.readinessBlockers,
      } : null,
      researchUrl: `/research/stocks/${signal.instrument_id}`,

      calibrationApplied,
      adjustmentCapApplied: adjustmentCap,
      sampleSizePenaltyApplied,
      overallEvaluatedSamples,
      groupEvaluatedSamples,
      evidenceStatus: finalEvidenceStatus,
      confidenceTier,
      downstreamInfluence: calibrationReadiness.downstreamInfluence,
      authoritativeScore: calibrationReadiness.authoritativeScore,
      warningsCount: evidenceWarnings.length + context.dataGaps.length,
      calibrationEvidence,
      calibrationReadiness,
    };
  }

  private classifyEvidenceStatus(context: CalibrationContext, overallEvaluatedSamples: number, evaluatedForHorizon: number) {
    const { minOverall } = this.policy.samples;
    if (!context.evaluationDiagnostics && !context.horizonAvailability) return 'MISSING' as const;
    if (evaluatedForHorizon === 0) return 'INSUFFICIENT' as const;
    if (overallEvaluatedSamples < minOverall) return 'INSUFFICIENT' as const;
    if (overallEvaluatedSamples < this.policy.confidenceThresholds.MEDIUM.overall) return 'LOW_SAMPLE' as const;
    return 'SUFFICIENT' as const;
  }

  private classifyBaseConfidence(overallEvaluatedSamples: number): CalibrationConfidenceLevel {
    const { minOverall } = this.policy.samples;
    const thresholds = this.policy.confidenceThresholds;
    if (overallEvaluatedSamples >= thresholds.HIGH.overall) return 'HIGH';
    if (overallEvaluatedSamples >= thresholds.MEDIUM.overall) return 'MEDIUM';
    if (overallEvaluatedSamples >= minOverall) return 'LOW';
    return 'INSUFFICIENT_SAMPLE';
  }

  private metricAdjustment(metric: QualityMetric | null, type: CalibrationAdjustment['type'], label: string, add: (adjustment: CalibrationAdjustment, groupSize?: number) => void) {
    if (!metric) return;
    const cut = this.policy.qualityCutoffs.group;
    if ((metric.winRate ?? 0) >= cut.boostWinRate && (metric.averageForwardReturn ?? 0) > 0) add({ type, label: `${label} has favorable measured outcomes.`, delta: cut.boostDelta, evidence: metric }, metric.sampleSize);
    if ((metric.winRate ?? 1) <= cut.penaltyWinRate || (metric.averageForwardReturn ?? 0) < 0) add({ type, label: `${label} has weak measured outcomes.`, delta: cut.penaltyDelta, evidence: metric }, metric.sampleSize);
  }

  private regimeAdjustment(signal: SignalLikeForCalibration, regime: string | null, add: (adjustment: CalibrationAdjustment) => void, gaps: string[]): void {
    if (!regime) {
      gaps.push('Missing regime context.');
      return;
    }
    const d = this.policy.contextDeltas.regime;
    if (signal.direction === 'BULLISH' && regime === 'RISK_ON') add({ type: 'REGIME', label: 'Bullish signal aligns with risk-on regime.', delta: d.bullishAligned });
    if (signal.direction === 'BULLISH' && regime === 'RISK_OFF') add({ type: 'REGIME', label: 'Bullish signal conflicts with risk-off regime.', delta: d.bullishConflict });
    if (signal.direction === 'BEARISH' && regime === 'RISK_OFF') add({ type: 'REGIME', label: 'Bearish signal aligns with risk-off regime.', delta: d.bearishAligned });
    if (signal.direction === 'BEARISH' && regime === 'RISK_ON') add({ type: 'REGIME', label: 'Bearish signal conflicts with risk-on regime.', delta: d.bearishConflict });
  }

  private sectorLeadershipAdjustment(signal: SignalLikeForCalibration, leadership: string | null, add: (adjustment: CalibrationAdjustment) => void, gaps: string[]): void {
    if (!leadership) {
      gaps.push('Missing sector leadership context.');
      return;
    }
    const d = this.policy.contextDeltas.sectorLeadership;
    if (signal.direction === 'BULLISH' && ['LEADING', 'IMPROVING'].includes(leadership)) add({ type: 'SECTOR', label: `Bullish signal aligns with ${leadership.toLowerCase()} sector context.`, delta: d.bullishAligned });
    if (signal.direction === 'BULLISH' && ['LAGGING', 'WEAKENING'].includes(leadership)) add({ type: 'SECTOR', label: `Bullish signal conflicts with ${leadership.toLowerCase()} sector context.`, delta: d.bullishConflict });
    if (signal.direction === 'BEARISH' && leadership === 'LAGGING') add({ type: 'SECTOR', label: 'Bearish signal aligns with lagging sector context.', delta: d.bearishAligned });
  }

  private smartMoneyAdjustment(signal: SignalLikeForCalibration, status: string | null, add: (adjustment: CalibrationAdjustment) => void, gaps: string[]): void {
    if (!status || status === 'INSUFFICIENT_DATA') {
      gaps.push('Missing or insufficient smart-money context.');
      return;
    }
    const d = this.policy.contextDeltas.smartMoney;
    if (signal.direction === 'BULLISH' && status === 'ACCUMULATION') add({ type: 'SMART_MONEY', label: 'Smart-money accumulation supports bullish signal.', delta: d.bullishAligned });
    if (signal.direction === 'BULLISH' && status === 'DISTRIBUTION') add({ type: 'SMART_MONEY', label: 'Smart-money distribution conflicts with bullish signal.', delta: d.bullishConflict });
    if (signal.direction === 'BEARISH' && status === 'DISTRIBUTION') add({ type: 'SMART_MONEY', label: 'Smart-money distribution supports bearish signal.', delta: d.bearishAligned });
    if (signal.direction === 'BEARISH' && status === 'ACCUMULATION') add({ type: 'SMART_MONEY', label: 'Smart-money accumulation conflicts with bearish signal.', delta: d.bearishConflict });
  }

  private dataQualityAdjustment(signal: SignalLikeForCalibration, dataQuality: any, add: (adjustment: CalibrationAdjustment) => void, gaps: string[], eligibilityFacts?: EligibilityFacts | null): void {
    if (!dataQuality) {
      gaps.push('Missing data-quality snapshot.');
      return;
    }
    const d = this.policy.contextDeltas.dataQuality;
    if (!dataQuality.hasLatestPrice) add({ type: 'DATA_QUALITY', label: 'Missing latest price lowers calibration confidence.', delta: d.missingLatestPrice });
    // Use canonical priceBars from instrument_eligibility when available; fall back to snapshot field.
    const priceBars = eligibilityFacts != null ? eligibilityFacts.priceBars : (dataQuality.priceHistoryDays ?? 0);
    if (priceBars < SIGNAL_HISTORY_MIN_BARS) add({ type: 'DATA_QUALITY', label: 'Insufficient price history for robust calibration.', delta: d.insufficientHistory });
    const usesFundamentals = [...signal.triggered_signals, ...signal.negative_signals].some((item) => item.category === 'FUNDAMENTAL');
    if (usesFundamentals && !dataQuality.hasFundamentals) add({ type: 'DATA_QUALITY', label: 'Fundamental signal exists but fundamentals are missing.', delta: d.missingFundamentals });
  }

  private persistedDataQualityAdjustment(dataQuality: CalibrationContext['dataQualityEvaluation'], add: (adjustment: CalibrationAdjustment) => void, gaps: string[]): void {
    if (!dataQuality) {
      gaps.push('Missing latest Data Quality Engine evaluation.');
      return;
    }
    const d = this.policy.contextDeltas.persistedDataQuality;
    if (dataQuality.coverageStatus === 'UNUSABLE') add({ type: 'DATA_QUALITY', label: 'Data quality coverage is unusable.', delta: d.coverageUnusable, evidence: dataQuality as any });
    else if (dataQuality.coverageStatus === 'POOR') add({ type: 'DATA_QUALITY', label: 'Data quality coverage is poor.', delta: d.coveragePoor, evidence: dataQuality as any });
    if (dataQuality.signalReadinessStatus === 'NOT_READY') add({ type: 'DATA_QUALITY', label: 'Signal readiness is not ready.', delta: d.readinessNotReady, evidence: dataQuality as any });
    else if (dataQuality.signalReadinessStatus === 'LIMITED') add({ type: 'DATA_QUALITY', label: 'Signal readiness is limited.', delta: d.readinessLimited, evidence: dataQuality as any });
    if (dataQuality.liquidityStatus === 'ILLIQUID') add({ type: 'DATA_QUALITY', label: 'Liquidity quality is illiquid.', delta: d.liquidityIlliquid, evidence: dataQuality as any });
    else if (dataQuality.liquidityStatus === 'UNKNOWN') add({ type: 'DATA_QUALITY', label: 'Liquidity quality is unknown.', delta: d.liquidityUnknown, evidence: dataQuality as any });
  }

  private confidence(raw: SignalCalibrationResultDto['rawConfidence'], baseConfidence: CalibrationConfidenceLevel, boosts: CalibrationAdjustment[], penalties: CalibrationAdjustment[], context: CalibrationContext): SignalCalibrationResultDto['calibratedConfidence'] {
    if (baseConfidence === 'INSUFFICIENT_SAMPLE') return 'INSUFFICIENT_SAMPLE';

    const evidence = boosts.length - penalties.length;
    if (context.dataGaps.length > 2 || context.noisyIssueTypes.length > 0 || penalties.some((item) => item.delta <= -6)) return 'LOW';
    if (raw === 'HIGH' && evidence >= 2 && penalties.length === 0 && baseConfidence === 'HIGH') return 'HIGH';
    if (raw !== 'LOW' && evidence >= 0 && baseConfidence !== 'LOW') return 'MEDIUM';
    return 'LOW';
  }

  private directionForScore(score: number): SignalCalibrationResultDto['calibratedDirection'] {
    // Unified with signal-generation-engine constants (BULLISH>=60 / BEARISH<=40).
    if (score >= DIRECTION_BULLISH_THRESHOLD) return 'BULLISH';
    if (score > DIRECTION_BEARISH_THRESHOLD) return 'NEUTRAL';
    return 'BEARISH';
  }

  /** Canonical score bucket from the shared signal-quality-lab definition. */
  scoreBucket(score: number): string {
    return SCORE_BUCKETS.find((bucket) => score >= bucket.min && score <= bucket.max)?.label ?? 'UNKNOWN';
  }
}
