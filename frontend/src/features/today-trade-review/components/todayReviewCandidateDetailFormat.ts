import type { TodayReviewCandidate, TodayReviewCandidateDataQualitySnapshot } from '../types';
import { formatCurrency, safeReviewText, stateLabel } from './todayReviewTableFormat';

export type DetailTierStatus = 'READY' | 'LIMITED' | 'BLOCKED' | 'MISSING';

export interface DetailTier {
  status: DetailTierStatus;
  reason: string | null;
}

export interface DetailTierContext {
  dailyReview: DetailTier;
  signal: DetailTier;
  backtest: DetailTier;
  calibration: DetailTier;
  automation: DetailTier;
  missingTierContext: boolean;
}

export function detailTierContext(dataQuality: TodayReviewCandidateDataQualitySnapshot | null): DetailTierContext {
  const tiers = dataQuality?.useCaseTiers;
  const missingTierContext = !tiers?.dailyReview || !tiers?.automation;

  const normalizeTier = (
    tier: { status: 'READY' | 'LIMITED' | 'BLOCKED'; reasons: string[] } | undefined,
  ): DetailTier => ({
    status: tier?.status || 'MISSING',
    reason: tier?.reasons?.[0] || (tier ? null : 'Missing from snapshot'),
  });

  const automationTier = normalizeTier(tiers?.automation);
  return {
    dailyReview: normalizeTier(tiers?.dailyReview),
    signal: normalizeTier(tiers?.signal),
    backtest: normalizeTier(tiers?.backtest),
    calibration: normalizeTier(tiers?.calibration),
    automation: {
      status: tiers?.automation ? 'BLOCKED' : 'MISSING',
      reason: !tiers?.automation
        ? 'Missing from snapshot; policy remains blocked.'
        : tiers.automation.status !== 'BLOCKED'
          ? `Upstream tier reported ${tiers.automation.status}; automated trading is not enabled in this phase.`
          : automationTier.reason || 'Automated trading is not enabled.',
    },
    missingTierContext,
  };
}

export function detailConfidenceDisplay(score: number, missingTierContext: boolean) {
  if (!missingTierContext) return String(score);
  const conservative = Math.max(0, Math.round(Number(score || 0) * 0.8));
  return `${conservative} (from ${score}; conservative view — data quality tiers missing)`;
}

export function tierDetailLabel(status: DetailTierStatus, reason: string | null) {
  return reason ? `${status} (${reason})` : status;
}

export function formatEntry(plan: any) {
  if (!plan?.entryZone) return 'Unavailable';
  return `${formatCurrency(Number(plan.entryZone.preferredEntryMin))} - ${formatCurrency(Number(plan.entryZone.preferredEntryMax))}`;
}

export function formatEntryTrigger(candidate: TodayReviewCandidate, plan: any) {
  const trigger = safeReviewText(plan?.entryTrigger || '');
  const entry = formatEntry(plan);
  if (trigger && entry !== 'Unavailable') return `${trigger}; entry context ${entry}`;
  if (trigger) return trigger;
  if (entry !== 'Unavailable') return `Entry context ${entry}`;
  return safeReviewText(candidate.reasonSummary || 'Unavailable');
}

export function formatExitCondition(plan: any) {
  const exitRule = plan?.exitRules?.[0] || plan?.exitConditions?.[0];
  return exitRule ? safeReviewText(exitRule) : 'Exit condition unavailable in this snapshot.';
}

export function formatInvalidationCondition(plan: any, candidate?: TodayReviewCandidate) {
  if (!plan?.stopLoss) return 'Unavailable';
  const stopPrice = Number(plan.stopLoss.price);
  const entryRef = Number(plan.entryZone?.preferredEntryMin || plan.entryZone?.preferredEntryMax || 0);
  const stopText = formatCurrency(stopPrice);
  const ruleText = safeReviewText(plan.invalidationRules?.[0] || 'Invalidation unavailable');
  const isLong = !candidate?.direction || candidate.direction === 'LONG' || String(candidate?.state).includes('LONG');
  const isShort = candidate?.direction === 'SHORT' || String(candidate?.state).includes('SHORT');
  const suspectStop =
    (isLong && entryRef > 0 && stopPrice > 0 && stopPrice < entryRef * 0.6) ||
    (isShort && entryRef > 0 && stopPrice > 0 && stopPrice > entryRef * 1.4);
  const warning = suspectStop ? ' ⚠ Possible unadjusted stop — verify' : '';
  return `${stopText}; ${ruleText}${warning}`;
}

export function dataQualityStatus(dataQuality: TodayReviewCandidateDataQualitySnapshot | null) {
  if (!dataQuality) return 'Missing';
  return [dataQuality.coverageStatus, dataQuality.signalReadinessStatus, dataQuality.liquidityStatus]
    .filter(Boolean)
    .join(' / ') || 'Unavailable';
}

export function formatReadinessLabel(value?: string | null) {
  return safeReviewText(value || 'Unavailable').replace(/_/g, ' ');
}

export function formatDecisionLabel(value?: string | null) {
  return safeReviewText(value || 'Unavailable')
    .replace(/TRADE_CANDIDATE/g, 'REVIEW_CANDIDATE')
    .replace(/_/g, ' ');
}

export function formatNumber(value?: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(1) : 'Unavailable';
}

export function formatPercent(value?: number) {
  return typeof value === 'number' && Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : 'Unavailable';
}

export function formatDateTime(value?: string | null) {
  if (!value) return 'Unavailable';
  return new Date(value).toLocaleString();
}

export function reasonCategoryLabel(category: string) {
  if (category === 'TRADE_PLAN_PROOF_CHAIN') return 'Exit/invalidation evidence';
  return stateLabel(category);
}

export function reasonSourceLabel(sourceModule: string) {
  if (/trade plan/i.test(sourceModule)) return 'Today Review evidence';
  return sourceModule;
}
