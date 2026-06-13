import type { QualityHorizon } from '../signal-quality-lab';
import type { CalibrationPolicy } from './signal-calibration-engine.config';
import { DEFAULT_CALIBRATION_POLICY } from './signal-calibration-engine.config';
import type {
  CalibrationConfidenceLevel,
  CalibrationDataStatus,
  CalibrationEvidence,
  CalibrationEvidenceBasis,
  CalibrationEvidenceStatus,
  CalibrationPageSummary,
  CalibrationQuery,
  CalibrationReadiness,
  QualitySummary,
  SignalCalibrationResultDto,
} from './signal-calibration-engine.types';

/**
 * Builds the calibration "evidence" and "readiness" envelopes — the trust
 * signals that tell downstream consumers how much authority a calibrated score
 * carries. Pure with respect to its {@link CalibrationPolicy}: given the same
 * policy + inputs it always produces the same envelope, which keeps it unit
 * testable and lets per-market policies change the gating thresholds.
 */
export class CalibrationEvidenceBuilder {
  constructor(private readonly policy: CalibrationPolicy = DEFAULT_CALIBRATION_POLICY) {}

  private get minOverall(): number { return this.policy.samples.minOverall; }
  private get minGroup(): number { return this.policy.samples.minGroup; }
  private get thresholds() { return this.policy.confidenceThresholds; }
  private get caps() { return this.policy.adjustmentCaps; }

  parseHorizon(value: unknown): QualityHorizon {
    const supported = this.policy.horizons.supported;
    return supported.includes(value as QualityHorizon) ? (value as QualityHorizon) : this.policy.horizons.default;
  }

  calibrationEvidence(input: {
    horizon: QualityHorizon | string;
    overallEvaluatedSamples: number;
    groupEvaluatedSamples: number;
    horizonAvailability: Record<string, { eligible: number; evaluated: number; insufficientFuturePrice: number }>;
    dataStatus: string;
    evidenceStatus: CalibrationEvidenceStatus;
    evidenceReasons: string[];
    evidenceWarnings: string[];
    evidenceBasis: CalibrationEvidenceBasis;
    metricsSource?: 'PERSISTED_OUTCOMES' | 'ON_DEMAND';
  }): CalibrationEvidence {
    return {
      horizon: input.horizon,
      overallEvaluatedSamples: input.overallEvaluatedSamples,
      groupEvaluatedSamples: input.groupEvaluatedSamples,
      minimumOverallSamples: this.minOverall,
      minimumGroupSamples: this.minGroup,
      requiredOverallSamples: this.minOverall,
      requiredGroupSamples: this.minGroup,
      horizonAvailability: input.horizonAvailability,
      dataStatus: input.dataStatus,
      evidenceStatus: input.evidenceStatus,
      evidenceReasons: input.evidenceReasons,
      evidenceWarnings: input.evidenceWarnings,
      warnings: input.evidenceWarnings,
      evidenceBasis: input.evidenceBasis,
      metricsSource: input.metricsSource,
    };
  }

  healthCalibrationEvidence(input: {
    dataStatus: CalibrationDataStatus;
    evidenceStatus: CalibrationEvidenceStatus;
    reason: string;
  }): CalibrationEvidence {
    return this.calibrationEvidence({
      horizon: this.policy.horizons.default,
      overallEvaluatedSamples: 0,
      groupEvaluatedSamples: 0,
      horizonAvailability: Object.fromEntries(this.policy.horizons.supported.map((horizon) => [
        horizon,
        { eligible: 0, evaluated: 0, insufficientFuturePrice: 0 },
      ])),
      dataStatus: input.dataStatus,
      evidenceStatus: input.evidenceStatus,
      evidenceReasons: [input.reason],
      evidenceWarnings: [input.reason],
      evidenceBasis: {
        status: 'MISSING_SIGNAL_QUALITY_EVIDENCE',
        signalQualityGeneratedAt: null,
        latestMeasurablePriceDate: null,
        nextEvaluableDate: null,
        reasonSummary: input.reason,
      },
    });
  }

  calibrationReadiness(input: {
    evidenceStatus: CalibrationEvidenceStatus;
    confidenceTier: CalibrationConfidenceLevel;
    calibrationApplied: boolean;
    adjustmentCapApplied: number;
    rawScoreAvailable: boolean;
    evaluatedForHorizon: number;
    overallEvaluatedSamples: number;
    groupEvaluatedSamples: number;
    evidenceWarnings: string[];
    dataGaps: string[];
  }): CalibrationReadiness {
    const blockers: string[] = [];
    const reasons: string[] = [];
    if (!input.rawScoreAvailable) blockers.push('Raw signal score is unavailable.');
    if (input.evidenceStatus === 'MISSING') blockers.push('Signal Quality evidence is missing.');
    if (input.evaluatedForHorizon === 0) blockers.push('Selected horizon has 0 evaluated outcome samples.');
    if (input.overallEvaluatedSamples < this.minOverall) blockers.push(`Overall evaluated samples ${input.overallEvaluatedSamples} are below required ${this.minOverall}.`);
    if (input.groupEvaluatedSamples > 0 && input.groupEvaluatedSamples < this.minGroup) reasons.push(`Group evaluated samples ${input.groupEvaluatedSamples} are below preferred ${this.minGroup}.`);
    reasons.push(...input.evidenceWarnings, ...input.dataGaps);

    if (!input.rawScoreAvailable) {
      return {
        status: 'UNAVAILABLE',
        confidenceTier: 'INSUFFICIENT_SAMPLE',
        calibrationApplied: false,
        adjustmentCapApplied: 0,
        downstreamInfluence: 'NONE',
        authoritativeScore: 'NO_SCORE',
        reasons: [...new Set(reasons)],
        blockers: [...new Set(blockers)],
      };
    }

    if (input.evidenceStatus === 'MISSING' || input.evidenceStatus === 'INSUFFICIENT' || input.confidenceTier === 'INSUFFICIENT_SAMPLE' || input.evaluatedForHorizon === 0) {
      return {
        status: 'UNAVAILABLE',
        confidenceTier: 'INSUFFICIENT_SAMPLE',
        calibrationApplied: false,
        adjustmentCapApplied: input.adjustmentCapApplied,
        downstreamInfluence: 'NONE',
        authoritativeScore: 'RAW_SCORE',
        reasons: [...new Set(reasons)],
        blockers: [...new Set(blockers)],
      };
    }

    if (input.evidenceStatus === 'LOW_SAMPLE' || input.confidenceTier === 'LOW') {
      return {
        status: 'LIMITED',
        confidenceTier: input.confidenceTier,
        calibrationApplied: input.calibrationApplied,
        adjustmentCapApplied: input.adjustmentCapApplied,
        downstreamInfluence: 'LIMITED',
        authoritativeScore: input.calibrationApplied ? 'CALIBRATED_SCORE' : 'RAW_SCORE',
        reasons: [...new Set(reasons)],
        blockers: [...new Set(blockers)],
      };
    }

    return {
      status: 'USABLE',
      confidenceTier: input.confidenceTier,
      calibrationApplied: input.calibrationApplied,
      adjustmentCapApplied: input.adjustmentCapApplied,
      downstreamInfluence: 'NORMAL',
      authoritativeScore: 'CALIBRATED_SCORE',
      reasons: [...new Set(reasons)],
      blockers: [],
    };
  }

  runEvidenceFromSummary(horizon: QualityHorizon, summary: QualitySummary | null, results: SignalCalibrationResultDto[]): CalibrationEvidence | null {
    if (!summary) {
      return this.calibrationEvidence({
        horizon,
        overallEvaluatedSamples: 0,
        groupEvaluatedSamples: 0,
        horizonAvailability: {},
        dataStatus: 'MISSING',
        evidenceStatus: 'MISSING',
        evidenceReasons: [],
        evidenceWarnings: ['Signal Quality diagnostics unavailable for this scope.'],
        evidenceBasis: this.calibrationEvidenceBasis(horizon, null),
      });
    }
    const overallEvaluatedSamples = summary.evaluationDiagnostics?.evaluatedSignals ?? 0;
    const evaluatedForHorizon = summary.horizonAvailability?.[horizon]?.evaluated ?? overallEvaluatedSamples;
    const groupEvaluatedSamples = Math.max(0, ...results.map((result) => result.groupEvaluatedSamples ?? 0));
    return this.calibrationEvidence({
      horizon,
      overallEvaluatedSamples,
      groupEvaluatedSamples,
      horizonAvailability: summary.horizonAvailability || {},
      dataStatus: summary.dataStatus || 'MISSING',
      evidenceStatus: this.evidenceStatusForSamples(overallEvaluatedSamples, evaluatedForHorizon, true),
      evidenceReasons: [],
      evidenceWarnings: this.sampleWarnings(horizon, overallEvaluatedSamples, groupEvaluatedSamples, evaluatedForHorizon),
      evidenceBasis: this.calibrationEvidenceBasis(horizon, summary),
    });
  }

  pageSummary(
    query: CalibrationQuery,
    horizon: QualityHorizon,
    summary: QualitySummary | null,
    items: SignalCalibrationResultDto[],
    totalScopedRows: number
  ): CalibrationPageSummary {
    const calibrationEvidence = this.runEvidenceFromSummary(horizon, summary, items) || this.healthCalibrationEvidence({
      dataStatus: 'MISSING',
      evidenceStatus: 'MISSING',
      reason: 'Signal Quality diagnostics unavailable for this scope.',
    });
    const calibrationReadiness = this.aggregateReadiness(items, horizon, calibrationEvidence, Boolean(summary));
    return {
      scope: {
        region: query.region || 'GLOBAL',
        assetType: query.assetType || 'ALL',
        horizon,
      },
      itemsOnPage: items.length,
      totalScopedRows,
      calibrationEvidence,
      calibrationReadiness,
    };
  }

  calibrationEvidenceBasis(
    horizon: QualityHorizon | string,
    summary: QualitySummary | null,
    opts?: { metricsSource?: 'PERSISTED_OUTCOMES' | 'ON_DEMAND' }
  ): CalibrationEvidenceBasis {
    const metricsSource = opts?.metricsSource;

    const latestMeasurablePriceDate = summary?.evaluationDiagnostics?.latestAvailablePriceDate ?? null;
    const nextEvaluableDate = summary?.evaluationDiagnostics?.nextEvaluableDate ?? null;
    const signalQualityGeneratedAt = summary?.generatedAt ?? null;
    const horizonAvailability = summary?.horizonAvailability?.[horizon];
    if (!summary || !latestMeasurablePriceDate) {
      // If metrics came from persisted outcomes, the summary will be null but evidence is still present
      if (metricsSource === 'PERSISTED_OUTCOMES') {
        return {
          status: 'MEASURED_FROM_PERSISTED_OUTCOMES',
          signalQualityGeneratedAt: null,
          latestMeasurablePriceDate: null,
          nextEvaluableDate: null,
          reasonSummary: `Quality metrics for ${horizon} are sourced from persisted signal outcome records (dataComplete=true).`,
        };
      }
      return {
        status: 'MISSING_SIGNAL_QUALITY_EVIDENCE',
        signalQualityGeneratedAt,
        latestMeasurablePriceDate,
        nextEvaluableDate,
        reasonSummary: `Signal Quality evidence basis is missing for ${horizon}.`,
      };
    }

    // If persisted metrics were used alongside a valid summary (e.g., both run), prefer persisted label
    if (metricsSource === 'PERSISTED_OUTCOMES') {
      return {
        status: 'MEASURED_FROM_PERSISTED_OUTCOMES',
        signalQualityGeneratedAt,
        latestMeasurablePriceDate,
        nextEvaluableDate,
        reasonSummary: `Quality metrics for ${horizon} are sourced from persisted signal outcome records (dataComplete=true); measured through ${latestMeasurablePriceDate}.`,
      };
    }

    const hasHorizonLimit = Number(horizonAvailability?.insufficientFuturePrice ?? 0) > 0
      || (Number(horizonAvailability?.eligible ?? 0) > Number(horizonAvailability?.evaluated ?? 0) && Boolean(nextEvaluableDate));
    if (hasHorizonLimit) {
      return {
        status: 'HORIZON_LIMITED',
        signalQualityGeneratedAt,
        latestMeasurablePriceDate,
        nextEvaluableDate,
        reasonSummary: `Selected horizon ${horizon} is still maturing; evidence currently measures outcomes through ${latestMeasurablePriceDate}.`,
      };
    }

    return {
      status: 'MEASURED',
      signalQualityGeneratedAt,
      latestMeasurablePriceDate,
      nextEvaluableDate,
      reasonSummary: `Measured evidence for ${horizon} is available through ${latestMeasurablePriceDate}.`,
    };
  }

  aggregateReadiness(results: SignalCalibrationResultDto[], horizon: QualityHorizon, evidence: CalibrationEvidence | null, hasSummary: boolean): CalibrationReadiness {
    if (results.length === 0) return this.noScoreReadiness(`No calibrated results were produced for ${horizon}.`);
    const resultReadiness = results.map((result) => result.calibrationReadiness).filter((item): item is CalibrationReadiness => Boolean(item));
    if (resultReadiness.some((item) => item.status === 'UNAVAILABLE')) {
      return this.calibrationReadiness({
        evidenceStatus: evidence?.evidenceStatus ?? (hasSummary ? 'INSUFFICIENT' : 'MISSING'),
        confidenceTier: 'INSUFFICIENT_SAMPLE',
        calibrationApplied: false,
        adjustmentCapApplied: this.caps.INSUFFICIENT_SAMPLE,
        rawScoreAvailable: true,
        evaluatedForHorizon: evidence?.horizonAvailability?.[horizon]?.evaluated ?? 0,
        overallEvaluatedSamples: evidence?.overallEvaluatedSamples ?? 0,
        groupEvaluatedSamples: evidence?.groupEvaluatedSamples ?? 0,
        evidenceWarnings: evidence?.warnings ?? [],
        dataGaps: ['At least one result has unavailable calibration evidence.'],
      });
    }
    if (resultReadiness.some((item) => item.status === 'LIMITED')) {
      return {
        ...resultReadiness.find((item) => item.status === 'LIMITED')!,
        status: 'LIMITED',
        downstreamInfluence: 'LIMITED',
      };
    }
    return resultReadiness[0] ?? this.noScoreReadiness(`No readiness evidence was attached for ${horizon}.`);
  }

  noScoreReadiness(reason: string): CalibrationReadiness {
    return {
      status: 'UNAVAILABLE',
      confidenceTier: 'INSUFFICIENT_SAMPLE',
      calibrationApplied: false,
      adjustmentCapApplied: 0,
      downstreamInfluence: 'NONE',
      authoritativeScore: 'NO_SCORE',
      reasons: [reason],
      blockers: [reason],
    };
  }

  missingPersistedReadiness(reason: string): CalibrationReadiness {
    return {
      status: 'UNAVAILABLE',
      confidenceTier: 'INSUFFICIENT_SAMPLE',
      calibrationApplied: false,
      adjustmentCapApplied: this.caps.INSUFFICIENT_SAMPLE,
      downstreamInfluence: 'NONE',
      authoritativeScore: 'RAW_SCORE',
      reasons: [reason],
      blockers: [reason],
    };
  }

  sampleConfidence(overall: number, group: number, evaluatedForHorizon: number): CalibrationConfidenceLevel {
    if (evaluatedForHorizon === 0 || overall < this.minOverall) return 'INSUFFICIENT_SAMPLE';
    if (group > 0 && group < this.minGroup) return 'INSUFFICIENT_SAMPLE';
    if (overall >= this.thresholds.HIGH.overall && (group === 0 || group >= this.thresholds.HIGH.group)) return 'HIGH';
    if (overall >= this.thresholds.MEDIUM.overall && (group === 0 || group >= this.thresholds.MEDIUM.group)) return 'MEDIUM';
    return 'LOW';
  }

  confidenceTier(overall: number, group: number, evaluatedForHorizon: number, evidenceStatus: CalibrationEvidenceStatus): CalibrationConfidenceLevel {
    if (evidenceStatus === 'MISSING' || evidenceStatus === 'INSUFFICIENT' || evaluatedForHorizon === 0 || overall < this.minOverall) return 'INSUFFICIENT_SAMPLE';
    if (group > 0 && group < this.minGroup) return 'INSUFFICIENT_SAMPLE';
    if (overall >= this.thresholds.HIGH.overall && (group === 0 || group >= this.thresholds.HIGH.group)) return 'HIGH';
    if (overall >= this.thresholds.MEDIUM.overall && (group === 0 || group >= this.thresholds.MEDIUM.group)) return 'MEDIUM';
    return 'LOW';
  }

  evidenceStatusForSamples(overall: number, evaluatedForHorizon: number, hasSummary: boolean): CalibrationEvidenceStatus {
    if (!hasSummary) return 'MISSING';
    if (evaluatedForHorizon === 0 || overall < this.minOverall) return 'INSUFFICIENT';
    if (overall < this.thresholds.MEDIUM.overall) return 'LOW_SAMPLE';
    return 'SUFFICIENT';
  }

  finalEvidenceStatus(status: CalibrationEvidenceStatus, groupEvaluatedSamples: number): CalibrationEvidenceStatus {
    if (status === 'SUFFICIENT' && groupEvaluatedSamples > 0 && groupEvaluatedSamples < this.minGroup) return 'LOW_SAMPLE';
    return status;
  }

  sampleWarnings(horizon: QualityHorizon, overall: number, group: number, evaluatedForHorizon: number): string[] {
    if (evaluatedForHorizon === 0) return [`Calibration is limited for ${horizon} because 0 signals have enough future price data. Scores are not aggressively adjusted.`];
    if (overall < this.minOverall || (group > 0 && group < this.minGroup)) {
      return [`${horizon} has ${overall} evaluated samples, below the recommended ${this.minOverall} overall / ${this.minGroup} per group minimum. Calibration confidence is low.`];
    }
    if (overall < this.thresholds.MEDIUM.overall) return [`${horizon} sample evidence is limited; score adjustments are capped conservatively.`];
    return [];
  }

  /**
   * Re-derive evidence + readiness for a persisted row that was stored without
   * an evidence envelope (older rows / DB has no evidence columns). Uses the
   * current scoped quality summary so a read agrees with what a fresh run would
   * produce for the same scope.
   */
  withEvidenceFromSummary(item: SignalCalibrationResultDto, horizon: QualityHorizon, summary: QualitySummary | null): SignalCalibrationResultDto {
    if (item.calibrationEvidence?.evidenceBasis && item.calibrationReadiness) return item;
    const overallEvaluatedSamples = summary?.evaluationDiagnostics?.evaluatedSignals ?? 0;
    const evaluatedForHorizon = summary?.horizonAvailability?.[horizon]?.evaluated ?? overallEvaluatedSamples;
    const groupEvaluatedSamples = Math.max(
      0,
      ...[...item.boosts, ...item.penalties].map((adjustment) => Number((adjustment.evidence as any)?.sampleSize || 0))
    ) || overallEvaluatedSamples;
    const confidence = this.sampleConfidence(overallEvaluatedSamples, groupEvaluatedSamples, evaluatedForHorizon);
    const evidenceStatus = this.finalEvidenceStatus(this.evidenceStatusForSamples(overallEvaluatedSamples, evaluatedForHorizon, Boolean(summary)), groupEvaluatedSamples);
    const warnings = summary ? this.sampleWarnings(horizon, overallEvaluatedSamples, groupEvaluatedSamples, evaluatedForHorizon) : ['Signal Quality diagnostics unavailable for this scope.'];
    const calibrationApplied = evidenceStatus === 'SUFFICIENT' || evidenceStatus === 'LOW_SAMPLE' ? item.scoreDelta !== 0 : false;
    const evidenceBasis = this.calibrationEvidenceBasis(horizon, summary);
    const calibrationEvidence = this.calibrationEvidence({
      horizon,
      overallEvaluatedSamples,
      groupEvaluatedSamples,
      horizonAvailability: summary?.horizonAvailability || {},
      dataStatus: summary?.dataStatus || 'MISSING',
      evidenceStatus,
      evidenceReasons: item.calibrationReasons,
      evidenceWarnings: warnings,
      evidenceBasis,
    });
    const calibrationReadiness = this.calibrationReadiness({
      evidenceStatus,
      confidenceTier: confidence,
      calibrationApplied,
      adjustmentCapApplied: this.caps[confidence],
      rawScoreAvailable: Number.isFinite(item.rawScore),
      evaluatedForHorizon,
      overallEvaluatedSamples,
      groupEvaluatedSamples,
      evidenceWarnings: warnings,
      dataGaps: item.dataGaps,
    });
    return {
      ...item,
      calibrationApplied,
      adjustmentCapApplied: this.caps[confidence],
      sampleSizePenaltyApplied: confidence === 'LOW' || confidence === 'INSUFFICIENT_SAMPLE',
      calibratedConfidence: confidence === 'INSUFFICIENT_SAMPLE' ? 'INSUFFICIENT_SAMPLE' : item.calibratedConfidence,
      overallEvaluatedSamples,
      groupEvaluatedSamples,
      evidenceStatus,
      confidenceTier: confidence,
      downstreamInfluence: calibrationReadiness.downstreamInfluence,
      authoritativeScore: calibrationReadiness.authoritativeScore,
      warningsCount: warnings.length + item.dataGaps.length,
      calibrationEvidence,
      calibrationReadiness,
    };
  }
}
