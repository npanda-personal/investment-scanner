import type {
  NoisySignalItem,
  QualityHorizon,
  QualityMetricGroup,
  SignalQualityLabService,
  SignalTypePerformance,
  PersistedQualityMetrics,
} from '../signal-quality-lab';
import type { CalibrationPolicy } from './signal-calibration-engine.config';
import { DEFAULT_CALIBRATION_POLICY } from './signal-calibration-engine.config';
import type { BatchQualityMetrics, MetricsSource, QualitySummary } from './signal-calibration-engine.types';

export interface QualityMetricsQuery {
  horizon: QualityHorizon;
  limit: number;
  minSampleSize: number;
  sector?: string;
  country?: string;
  region?: string;
  assetType?: string;
}

/** Noisy-signal fetch limits: large for batch runs, small for per-signal context. */
const NOISY_LIMIT_BATCH = 5000;
const NOISY_LIMIT_SIGNAL = 250;

/**
 * Acquires Signal Quality metrics for calibration, preferring the persisted
 * signal_outcomes corpus when it is statistically meaningful and falling back to
 * on-demand recomputation otherwise. Indexes results for O(1) per-signal lookup.
 */
export class CalibrationMetricsProvider {
  constructor(
    private readonly qualityService: SignalQualityLabService,
    private readonly policy: CalibrationPolicy = DEFAULT_CALIBRATION_POLICY
  ) {}

  /** Metrics for a whole batch run (wide noisy scan). */
  batchQualityMetrics(query: QualityMetricsQuery): Promise<BatchQualityMetrics> {
    return this.load(query, NOISY_LIMIT_BATCH);
  }

  /** Metrics for a single signal's context (narrow noisy scan). */
  qualityMetrics(query: QualityMetricsQuery): Promise<BatchQualityMetrics> {
    return this.load(query, NOISY_LIMIT_SIGNAL);
  }

  private async load(query: QualityMetricsQuery, noisyLimit: number): Promise<BatchQualityMetrics> {
    const persisted = await this.tryPersistedMetrics(query.horizon);
    if (persisted) return persisted;

    const [byType, byScore, bySector, noisy] = await Promise.all([
      this.qualityService.byType(query).catch(() => []),
      this.qualityService.byScoreBucket(query).catch(() => []),
      this.qualityService.bySector(query).catch(() => []),
      this.qualityService.noisy({ ...query, limit: noisyLimit }).catch(() => []),
    ]);
    return this.prepareQualityMetrics(byType as SignalTypePerformance[], byScore as QualityMetricGroup[], bySector as QualityMetricGroup[], noisy as NoisySignalItem[], 'ON_DEMAND');
  }

  /**
   * Build quality metrics from persisted signal_outcomes when the mature count
   * meets the policy minimum; returns null to trigger the on-demand fallback.
   * Scoped to the policy's signalModelVersion so v1/v2/v3 rows never blend.
   */
  async tryPersistedMetrics(horizon: QualityHorizon): Promise<(BatchQualityMetrics & { persistedMatureCount: number }) | null> {
    try {
      const modelVersion = this.policy.signalModelVersion;
      const matureCount = await this.qualityService.countMatureByHorizon(horizon, modelVersion);
      if (matureCount < this.policy.samples.minPersisted) return null;

      const metrics: PersistedQualityMetrics = await this.qualityService.qualityMetricsFromPersistedOutcomes({ horizon, modelVersion });
      return {
        ...this.prepareQualityMetrics(metrics.byType, metrics.byScore, metrics.bySector, metrics.noisy, 'PERSISTED_OUTCOMES'),
        persistedMatureCount: matureCount,
      };
    } catch {
      return null;
    }
  }

  prepareQualityMetrics(
    byType: SignalTypePerformance[],
    byScore: QualityMetricGroup[],
    bySector: QualityMetricGroup[],
    noisy: NoisySignalItem[],
    metricsSource: MetricsSource = 'ON_DEMAND'
  ): BatchQualityMetrics {
    const signalTypeMetrics = new Map<string, { winRate: number | null; averageForwardReturn: number | null; sampleSize: number }>();
    for (const metric of byType) signalTypeMetrics.set(metric.signalType, metric);
    const scoreBucketMetrics = new Map(byScore.map((item) => [item.group, item]));
    const sectorMetrics = new Map(bySector.map((item) => [item.group, item]));
    const noisyIssueTypesByInstrumentId = new Map<string, string[]>();
    for (const item of noisy) {
      const existing = noisyIssueTypesByInstrumentId.get(item.instrumentId) || [];
      existing.push(item.issueType);
      noisyIssueTypesByInstrumentId.set(item.instrumentId, existing);
    }
    return { byType, byScore, bySector, noisy, signalTypeMetrics, scoreBucketMetrics, sectorMetrics, noisyIssueTypesByInstrumentId, metricsSource };
  }

  emptyQualityMetrics(): BatchQualityMetrics {
    return this.prepareQualityMetrics([], [], [], [], 'ON_DEMAND');
  }

  /** True when the on-demand summary has no evaluated outcomes for the horizon. */
  shouldSkipCalibrationEvidenceWork(summary: QualitySummary | null, horizon: QualityHorizon): boolean {
    if (!summary) return true;
    const evaluatedForHorizon = Number(summary?.horizonAvailability?.[horizon]?.evaluated ?? summary?.evaluationDiagnostics?.evaluatedSignals ?? 0);
    return !Number.isFinite(evaluatedForHorizon) || evaluatedForHorizon <= 0;
  }

  /**
   * Build a minimal summary from persisted metrics so calibrate() sees non-zero
   * evaluatedForHorizon and does not short-circuit to passthrough. Uses the REAL
   * matureCount; returns null when it is 0 so the on-demand path runs instead.
   */
  syntheticSummaryFromPersistedMetrics(
    horizon: QualityHorizon,
    metrics: BatchQualityMetrics & { persistedMatureCount?: number },
    onDemandSummary: QualitySummary | null
  ): QualitySummary | null {
    const matureCount = metrics.persistedMatureCount ?? Math.max(
      0,
      ...metrics.byScore.map((item) => item.sampleSize),
      ...metrics.bySector.map((item) => item.sampleSize),
      ...metrics.byType.map((item) => item.sampleSize),
    );
    if (matureCount === 0) return null;

    const horizonEntry = { eligible: matureCount, evaluated: matureCount, insufficientFuturePrice: 0 };
    const baseHorizonAvailability = this.policy.horizons.supported.reduce((acc, h) => {
      acc[h] = h === horizon ? horizonEntry : { eligible: 0, evaluated: 0, insufficientFuturePrice: 0 };
      return acc;
    }, {} as Record<string, { eligible: number; evaluated: number; insufficientFuturePrice: number }>);

    return {
      ...(onDemandSummary ?? {}),
      evaluationDiagnostics: {
        ...(onDemandSummary?.evaluationDiagnostics ?? {}),
        evaluatedSignals: matureCount,
        latestAvailablePriceDate: onDemandSummary?.evaluationDiagnostics?.latestAvailablePriceDate ?? null,
        nextEvaluableDate: null,
      },
      horizonAvailability: {
        ...(onDemandSummary?.horizonAvailability ?? {}),
        ...baseHorizonAvailability,
        [horizon]: horizonEntry,
      },
      dataStatus: 'PARTIAL',
      generatedAt: onDemandSummary?.generatedAt ?? new Date().toISOString(),
    };
  }
}
