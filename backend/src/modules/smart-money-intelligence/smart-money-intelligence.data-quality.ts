import type { DataQualityEvaluationDto, InstrumentEligibilityRow } from '../data-quality-engine';
import type { SmartMoneyDataStatus } from './smart-money-intelligence.types';

/**
 * Data-quality gating for smart-money scoring. Pure functions: given a Data Quality
 * Engine evaluation (or the newer instrument-eligibility row), decide whether scoring
 * is READY, LIMITED, BLOCKED, or UNAVAILABLE. No DB, no IO.
 */
export interface SmartMoneyDataQualityGate {
  status: 'READY' | 'LIMITED' | 'BLOCKED' | 'UNAVAILABLE';
  dataStatus: SmartMoneyDataStatus;
  reason: string;
  warnings: string[];
}

const COVERAGE_UNUSABLE_CODES: string[] = ['COVERAGE_UNUSABLE'];
const LIQUIDITY_CODES: string[] = ['ILLIQUID', 'LOW_VOLUME_COVERAGE'];

/**
 * Derive the gate from an instrument_eligibility row (Phase-1 spec). Returns null
 * when no row is available so the caller can fall back to {@link evaluateDataQuality}.
 *
 *   BLOCKED  — signalEligible=false with COVERAGE_UNUSABLE-class reasons OR readiness NOT_READY
 *   LIMITED  — readiness LIMITED OR liquidity-class reasons (ILLIQUID)
 *   READY    — otherwise
 */
export function evaluateDataQualityFromEligibility(row: InstrumentEligibilityRow | null): SmartMoneyDataQualityGate | null {
  if (!row) return null;

  const hasCoverageUnusable = row.verdicts.signalReasons.some((code) => COVERAGE_UNUSABLE_CODES.includes(code));
  const hasLiquidityIssue = row.verdicts.signalReasons.some((code) => LIQUIDITY_CODES.includes(code));
  const isNotReady = row.readinessStatus === 'NOT_READY';
  const isLimited = row.readinessStatus === 'LIMITED';

  if (!row.verdicts.signalEligible && (hasCoverageUnusable || isNotReady)) {
    const reason = hasCoverageUnusable
      ? 'Coverage is UNUSABLE; smart-money scoring blocked.'
      : 'Signal readiness is NOT_READY; smart-money scoring blocked.';
    return { status: 'BLOCKED', dataStatus: 'ERROR', reason, warnings: row.verdicts.signalReasons.map((code) => code as string) };
  }

  if (isLimited || (hasLiquidityIssue && !row.verdicts.signalEligible)) {
    const reason = isLimited
      ? 'Signal readiness is LIMITED; smart-money evidence is limited.'
      : 'Liquidity issue; smart-money evidence is limited.';
    return { status: 'LIMITED', dataStatus: 'PARTIAL', reason, warnings: row.verdicts.signalReasons.map((code) => code as string) };
  }

  return { status: 'READY', dataStatus: 'COMPLETE', reason: 'Eligibility row is ready for smart-money scoring.', warnings: [] };
}

/** Legacy gate derived from the Data Quality Engine diagnostics DTO. */
export function evaluateDataQuality(dataQuality: DataQualityEvaluationDto | null): SmartMoneyDataQualityGate {
  if (!dataQuality) {
    return {
      status: 'UNAVAILABLE',
      dataStatus: 'PARTIAL',
      reason: 'Data quality evaluation is unavailable; smart-money evidence is limited.',
      warnings: ['Data quality evaluation is unavailable.'],
    };
  }

  const warnings = [
    ...(dataQuality.dataGaps || []),
    ...(dataQuality.warnings || []),
    ...(dataQuality.readinessBlockers || []),
  ];
  const blocked = dataQuality.coverageStatus === 'UNUSABLE'
    || dataQuality.signalReadinessStatus === 'NOT_READY'
    || dataQuality.useCaseTiers?.signal?.status === 'BLOCKED';
  if (blocked) {
    return {
      status: 'BLOCKED',
      dataStatus: 'ERROR',
      reason: `Data quality blocks smart-money scoring: ${warnings[0] || dataQuality.signalReadinessStatus || dataQuality.coverageStatus}.`,
      warnings,
    };
  }

  const limited = dataQuality.coverageStatus !== 'GOOD'
    || dataQuality.signalReadinessStatus !== 'READY'
    || dataQuality.liquidityStatus === 'ILLIQUID'
    || dataQuality.liquidityStatus === 'THIN'
    || dataQuality.useCaseTiers?.signal?.status === 'LIMITED';
  if (limited) {
    return {
      status: 'LIMITED',
      dataStatus: 'PARTIAL',
      reason: `Data quality limits smart-money evidence: ${warnings[0] || dataQuality.signalReadinessStatus || dataQuality.coverageStatus}.`,
      warnings,
    };
  }

  return {
    status: 'READY',
    dataStatus: 'COMPLETE',
    reason: 'Data quality is ready for smart-money scoring.',
    warnings: [],
  };
}
