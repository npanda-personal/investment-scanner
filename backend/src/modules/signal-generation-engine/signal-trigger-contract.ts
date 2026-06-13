/**
 * signal-trigger-contract.ts
 *
 * Pure builder for the TriggerObjectV1 contract projection attached to each served
 * signal.  Operates only on a SignalResultDto plus the (optional) instrument record —
 * no I/O, no service state — so it is trivially unit-testable and reusable.
 *
 * Extracted verbatim from the service; the field-availability marking, contract
 * status derivation and price-evidence projection are preserved byte-for-byte.
 */
import type {
  SignalDirection,
  SignalResultDto,
  SignalTriggerContractDto,
  SignalTriggerPriceEvidence,
  SignalTriggerType,
} from './signal-generation-engine.types';

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

export function triggerTypeFor(direction: SignalDirection, derivativesEligible?: boolean | null, regimeGateSuppressed?: boolean): SignalTriggerType {
  if (direction === 'BULLISH') return 'bullish_entry_trigger';
  if (direction === 'BEARISH') {
    // Short entries require F&O eligibility; cash-only stocks cannot be shorted — classify as risk_warning.
    // Additionally: when the regime gate suppressed this short (RISK_ON regime), force risk_warning
    // even for F&O-eligible names — tradable short is not appropriate contra-trend.
    if (regimeGateSuppressed === true) return 'risk_warning';
    return derivativesEligible === true ? 'bearish_trigger' : 'risk_warning';
  }
  return 'risk_warning';
}

function toTriggerPriceEvidenceDto(sourceProven: SignalTriggerPriceEvidence | null, attempted: SignalTriggerPriceEvidence | null) {
  const evidence = sourceProven ?? attempted;
  return {
    status: evidence?.status ?? 'UNAVAILABLE',
    source_module: evidence?.status === 'SOURCE_PROVEN' ? evidence.sourceModule : null,
    source_field: evidence?.status === 'SOURCE_PROVEN' ? evidence.sourceField : null,
    source_timestamp: evidence?.status === 'SOURCE_PROVEN' ? evidence.triggerTimestamp : null,
    strategy_id: evidence?.strategyCode ?? null,
    strategy_version: evidence?.strategyVersion ?? null,
    timeframe: evidence?.timeframe ?? null,
    entry_rule_ids: evidence?.entryRuleIds ?? [],
    compatibility_only: evidence?.compatibilityOnly ?? true,
    unavailable_reason: evidence?.status === 'UNAVAILABLE' ? evidence.unavailableReason : undefined,
  };
}

export function buildTriggerContract(signal: SignalResultDto, instrument?: any): SignalTriggerContractDto {
  const unavailable = new Set<string>();
  const incompleteReasons: string[] = [];
  const primaryStrategy = signal.strategyMatches?.[0] || (signal.blockedStrategies?.length === 1 ? signal.blockedStrategies[0] : null);
  const assetClass = stringOrNull(instrument?.assetType ?? instrument?.asset_type);
  const region = stringOrNull(instrument?.region);
  const strategyId = primaryStrategy?.strategyCode ?? null;
  const strategyVersion = primaryStrategy?.strategyVersion ?? null;
  const sourceProvenPriceEvidence = primaryStrategy?.triggerPriceEvidence?.status === 'SOURCE_PROVEN'
    ? primaryStrategy.triggerPriceEvidence
    : null;
  const attemptedPriceEvidence = primaryStrategy?.triggerPriceEvidence ?? null;
  const triggerTimestamp = primaryStrategy
    ? sourceProvenPriceEvidence?.triggerTimestamp ?? null
    : signal.sourcePriceDate ?? signal.sourceDataDate ?? null;
  const dataQualityStatus = signal.dataQualityEligibility?.signalReadinessStatus ?? null;
  const entryRuleId = sourceProvenPriceEvidence?.entryRuleIds[0] ?? null;
  const timeframe = sourceProvenPriceEvidence?.timeframe ?? primaryStrategy?.timeframe ?? null;

  const mark = (field: string, reason: string) => {
    unavailable.add(field);
    incompleteReasons.push(`${field}: ${reason}`);
  };

  if (!signal.id) mark('signal_id', 'persisted signal id is unavailable in this DTO.');
  if (!assetClass) mark('asset_class', 'instrument asset class is unavailable from the current signal record.');
  if (!region) mark('region', 'instrument market region is unavailable from the current signal record.');
  if (!strategyId) mark('strategy_id', 'no Strategy Framework match is attached to this signal.');
  if (!strategyVersion) mark('strategy_version', 'no Strategy Framework version is attached to this signal.');
  if (!sourceProvenPriceEvidence) {
    mark('trigger_price', primaryStrategy?.triggerPriceEvidence?.unavailableReason || 'source-proven rule-trigger price is unavailable from attached Strategy Framework context.');
  }
  if (!triggerTimestamp) {
    mark('trigger_timestamp', attemptedPriceEvidence?.unavailableReason || 'source-proven trigger timestamp is unavailable from attached Strategy Framework context.');
  }
  if (!timeframe) mark('timeframe', 'rule timeframe is unavailable from attached Strategy Framework context.');
  if (!entryRuleId) mark('entry_rule_id', 'source-proven entry rule id is unavailable from attached Strategy Framework context.');
  mark('exit_rule_id', 'exit rule id is not persisted in the current signal record.');
  mark('invalidation_rule_id', 'invalidation rule id is not persisted in the current signal record.');
  if (!dataQualityStatus) mark('data_quality_status', 'Data Quality readiness snapshot is unavailable from the current signal record.');
  mark('lifecycle_status', 'trigger lifecycle state is not persisted in the current signal record.');
  mark('created_at', 'persistence created timestamp is not exposed by the current signal record.');
  mark('updated_at', 'persistence updated timestamp is not exposed by the current signal record.');

  const contractStatus = signal.auditStatus === 'LEGACY_MISSING'
    ? 'LEGACY_INCOMPLETE'
    : (unavailable.size > 0 ? 'CONTRACT_INCOMPLETE' : 'COMPLETE');

  return {
    contractVersion: 'TriggerObjectV1',
    contractStatus,
    signal_id: signal.id ?? null,
    instrument_id: signal.instrument_id,
    symbol: signal.symbol,
    asset_class: assetClass,
    region,
    strategy_id: strategyId,
    strategy_version: strategyVersion,
    trigger_type: triggerTypeFor(signal.direction, instrument?.derivatives_eligible ?? instrument?.derivativesEligible, signal.regimeGateSuppressed),
    trigger_price: sourceProvenPriceEvidence?.triggerPrice ?? null,
    trigger_timestamp: triggerTimestamp,
    timeframe,
    entry_rule_id: entryRuleId,
    exit_rule_id: null,
    invalidation_rule_id: null,
    reason_summary: signal.explanation,
    passed_conditions: signal.triggered_signals.map((item) => ({ code: item.code, label: item.label, category: item.category })),
    failed_conditions: signal.negative_signals.map((item) => ({ code: item.code, label: item.label, category: item.category })),
    data_quality_status: dataQualityStatus,
    lifecycle_status: null,
    created_at: null,
    updated_at: null,
    audit: {
      auditStatus: signal.auditStatus,
      generationRunId: signal.generationRunId ?? null,
      modelVersion: signal.modelVersion ?? null,
      rulesetVersion: signal.rulesetVersion ?? null,
    },
    trigger_price_evidence: toTriggerPriceEvidenceDto(sourceProvenPriceEvidence, attemptedPriceEvidence),
    unavailable_fields: Array.from(unavailable),
    incomplete_reasons: incompleteReasons,
  };
}

/** Returns a copy of the signal with its TriggerObjectV1 contract projection attached. */
export function withTriggerContract(signal: SignalResultDto, instrument?: any): SignalResultDto {
  return {
    ...signal,
    triggerContract: buildTriggerContract(signal, instrument),
  };
}
