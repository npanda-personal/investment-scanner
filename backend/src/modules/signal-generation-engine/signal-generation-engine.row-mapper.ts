/**
 * signal-generation-engine.row-mapper.ts
 *
 * Pure mapping between the SignalResult Prisma row and the SignalResultDto, plus the
 * same-day idempotency comparison. Extracted from the repository (which is over the
 * 500-line shrink-only cap) so the §17 persisted trigger fields can be mapped here
 * without growing the repository. No I/O — every function is a pure transform.
 *
 * The write-time `data` build derives the durable trigger fields via
 * triggerPersistFields(result.strategyMatches); createdAt/updatedAt are Prisma-managed
 * and are ONLY read (never written).
 */
import { Prisma } from '@prisma/client';
import type {
  ReliabilityTier,
  SignalLifecycleState,
  SignalResultDto,
  SignalWriteStatus,
} from './signal-generation-engine.types';
import { triggerPersistFields } from './signal-trigger-persist';

/** The persisted column payload for a SignalResult upsert (create === update). */
export function buildSignalResultData(
  result: SignalResultDto,
  derived: { generatedAt: Date; generatedDate: Date; modelVersion: string; rulesetVersion: string },
): Prisma.SignalResultUncheckedCreateInput {
  const trigger = triggerPersistFields(result.strategyMatches);
  return {
    instrumentId: result.instrument_id,
    generationRunId: result.generationRunId ?? null,
    symbol: result.symbol,
    companyName: result.company_name,
    sector: result.sector,
    country: result.country,
    score: result.score,
    direction: result.direction,
    confidence: result.confidence,
    triggeredSignals: result.triggered_signals as unknown as Prisma.InputJsonValue,
    negativeSignals: result.negative_signals as unknown as Prisma.InputJsonValue,
    explanation: result.explanation,
    generatedAt: derived.generatedAt,
    generatedDate: derived.generatedDate,
    modelVersion: derived.modelVersion,
    rulesetVersion: derived.rulesetVersion,
    sourceDataDate: result.sourceDataDate ? new Date(result.sourceDataDate) : null,
    sourcePriceDate: result.sourcePriceDate ? new Date(result.sourcePriceDate) : null,
    scoringInputSummary: result.scoringInputSummary as unknown as Prisma.InputJsonValue,
    dataQualityEligibilitySnapshot: result.dataQualityEligibility as unknown as Prisma.InputJsonValue,
    source: result.source,
    dataStatus: result.data_status,
    reliabilityTier: result.reliabilityTier ?? null,
    lifecycleState: result.lifecycleState ?? null,
    priorScore: result.priorScore ?? null,
    // ── §17 durable trigger fields (createdAt/updatedAt are Prisma-managed) ──
    triggerPrice: trigger.triggerPrice,
    triggerTimestamp: trigger.triggerTimestamp ? new Date(trigger.triggerTimestamp) : null,
    triggerTimeframe: trigger.triggerTimeframe,
    entryRuleId: trigger.entryRuleId,
    exitRuleId: trigger.exitRuleId,
    invalidationRuleId: trigger.invalidationRuleId,
    strategyId: trigger.strategyId,
    strategyVersion: trigger.strategyVersion,
  };
}

function dateValue(value: unknown): string | null {
  if (!value) return null;
  return new Date(value as any).toISOString();
}

/** Same-day write classification: CREATED (no prior), NO_OP (identical), UPDATED. */
export function signalWriteStatus(existing: any, data: Record<string, unknown>): SignalWriteStatus {
  if (!existing) return 'CREATED';
  const same =
    existing.symbol === data.symbol &&
    existing.companyName === data.companyName &&
    existing.sector === data.sector &&
    existing.country === data.country &&
    existing.score === data.score &&
    existing.direction === data.direction &&
    existing.confidence === data.confidence &&
    JSON.stringify(existing.triggeredSignals || []) === JSON.stringify(data.triggeredSignals || []) &&
    JSON.stringify(existing.negativeSignals || []) === JSON.stringify(data.negativeSignals || []) &&
    existing.explanation === data.explanation &&
    (existing.rulesetVersion || existing.modelVersion) === data.rulesetVersion &&
    dateValue(existing.sourceDataDate) === dateValue(data.sourceDataDate) &&
    dateValue(existing.sourcePriceDate) === dateValue(data.sourcePriceDate) &&
    JSON.stringify(existing.scoringInputSummary || null) === JSON.stringify(data.scoringInputSummary || null) &&
    JSON.stringify(existing.dataQualityEligibilitySnapshot || null) === JSON.stringify(data.dataQualityEligibilitySnapshot || null) &&
    existing.source === data.source &&
    existing.dataStatus === data.dataStatus &&
    (existing.reliabilityTier ?? null) === (data.reliabilityTier ?? null) &&
    (existing.lifecycleState ?? null) === (data.lifecycleState ?? null) &&
    (existing.priorScore ?? null) === (data.priorScore ?? null) &&
    // §17 durable trigger fields participate in idempotency.
    (existing.triggerPrice ?? null) === (data.triggerPrice ?? null) &&
    dateValue(existing.triggerTimestamp) === dateValue(data.triggerTimestamp) &&
    (existing.triggerTimeframe ?? null) === (data.triggerTimeframe ?? null) &&
    (existing.entryRuleId ?? null) === (data.entryRuleId ?? null) &&
    (existing.exitRuleId ?? null) === (data.exitRuleId ?? null) &&
    (existing.invalidationRuleId ?? null) === (data.invalidationRuleId ?? null) &&
    (existing.strategyId ?? null) === (data.strategyId ?? null) &&
    (existing.strategyVersion ?? null) === (data.strategyVersion ?? null);
  return same ? 'NO_OP' : 'UPDATED';
}

/** Maps a SignalResult Prisma row to the served DTO. */
export function signalRecordToDto(record: any): SignalResultDto {
  return {
    id: record.id,
    instrument_id: record.instrumentId,
    symbol: record.symbol,
    company_name: record.companyName,
    sector: record.sector,
    country: record.country,
    currentPrice: null,
    previousClose: null,
    dailyChange: null,
    dailyChangePercent: null,
    currency: null,
    priceTimestamp: null,
    score: record.score,
    direction: record.direction,
    confidence: record.confidence,
    triggered_signals: Array.isArray(record.triggeredSignals) ? record.triggeredSignals : [],
    negative_signals: Array.isArray(record.negativeSignals) ? record.negativeSignals : [],
    explanation: record.explanation,
    generated_at: record.generatedAt.toISOString(),
    generatedDate: record.generatedDate?.toISOString() ?? null,
    modelVersion: record.modelVersion || 'signal-engine-v1',
    rulesetVersion: record.rulesetVersion || record.modelVersion || 'signal-engine-v1',
    sourceDataDate: record.sourceDataDate?.toISOString() ?? null,
    sourcePriceDate: record.sourcePriceDate?.toISOString() ?? null,
    scoringInputSummary: record.scoringInputSummary || null,
    dataQualityEligibility: record.dataQualityEligibilitySnapshot || null,
    auditStatus: record.rulesetVersion && record.scoringInputSummary && record.dataQualityEligibilitySnapshot ? 'CURRENT' : 'LEGACY_MISSING',
    generationRunId: record.generationRunId ?? null,
    source: record.source,
    data_status: record.dataStatus,
    reliabilityTier: (record.reliabilityTier as ReliabilityTier | null) ?? null,
    // isSme is not persisted separately; callers should use reliabilityTier for read-filter decisions.
    // For freshly-generated DTOs it is set by generateForInstrument (instrument field is available there).
    lifecycleState: (record.lifecycleState as SignalLifecycleState | null) ?? null,
    priorScore: typeof record.priorScore === 'number' ? record.priorScore : null,
    // ── §17 durable trigger fields read back from the row ──
    triggerPrice: typeof record.triggerPrice === 'number' ? record.triggerPrice : null,
    triggerTimestamp: record.triggerTimestamp?.toISOString() ?? null,
    triggerTimeframe: record.triggerTimeframe ?? null,
    entryRuleId: record.entryRuleId ?? null,
    exitRuleId: record.exitRuleId ?? null,
    invalidationRuleId: record.invalidationRuleId ?? null,
    strategyId: record.strategyId ?? null,
    strategyVersion: record.strategyVersion ?? null,
    createdAt: record.createdAt?.toISOString() ?? null,
    updatedAt: record.updatedAt?.toISOString() ?? null,
  };
}
