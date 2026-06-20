import type { ReactNode } from 'react';
import { humanizeCode } from '@/shared/format/enumLabels';
import { money } from '@/shared/format/money';
import type {
  TodayReviewCandidate,
  TodayReviewCandidateDataQualitySnapshot,
  TodayReviewGroups,
  TodayReviewRun,
  TodayReviewSourceSnapshot,
} from '../types';

// --- Table sorting / column types (shared by columns + table) ---
export type SortDirection = 'asc' | 'desc';

export type SortKey =
  | 'rank'
  | 'symbol'
  | 'company'
  | 'state'
  | 'setup'
  | 'board'
  | 'entry'
  | 'exit'
  | 'confidence'
  | 'grade'
  | 'dailyReview'
  | 'automation'
  | 'dataFreshness'
  | 'dataQuality'
  | 'proof'
  | 'market'
  | 'sector'
  | 'reason'
  | 'blocker'
  | 'earnings'
  | 'smartMoney'
  | 'fnoBan'
  | 'range52w'
  | 'price'
  | 'dayChange'
  | 'volume'
  | 'subState';

export interface CandidateColumn {
  id: SortKey;
  label: string;
  width: number;
  align?: 'left' | 'right' | 'center';
  primary?: boolean; // shown by default; false = in "More" secondary set
  value: (candidate: TodayReviewCandidate) => string | number;
  render: (candidate: TodayReviewCandidate) => ReactNode;
}

export type TierStatus = 'READY' | 'LIMITED' | 'BLOCKED' | 'MISSING';

export interface TierCellContext {
  status: TierStatus;
  label: string;
  reason: string | null;
}

export interface CandidateTierContext {
  dailyReview: TierCellContext;
  automation: TierCellContext;
  blocker: string | null;
}

export type SectorLeadershipStatus = 'LEADING' | 'IMPROVING' | 'NEUTRAL' | 'WEAKENING' | 'LAGGING';

// --- Run / group helpers ---
export function sourceSnapshotForRun(run: TodayReviewRun): TodayReviewSourceSnapshot {
  return (run.sourceSnapshot || {}) as TodayReviewSourceSnapshot;
}

export function candidatesForTab(groups: TodayReviewGroups, tab: keyof TodayReviewGroups) {
  if (tab === 'exitRiskReview') return [...groups.exitRiskReview, ...groups.shortReview];
  if (tab === 'watchOnly') return [...groups.watchOnly, ...groups.unproven, ...groups.insufficientData];
  if (tab === 'specialCases') return groups.specialCases;
  if (tab === 'blocked') return [...groups.blocked, ...groups.avoid];
  return groups[tab] || [];
}

export function emptyGroups(): TodayReviewGroups {
  return {
    longReview: [],
    shortReview: [],
    exitRiskReview: [],
    watchOnly: [],
    specialCases: [],
    blocked: [],
    avoid: [],
    insufficientData: [],
    unproven: [],
  };
}

export function hasMissingTierContext(candidate: TodayReviewCandidate) {
  const dq = candidate.dataQualitySnapshot as TodayReviewCandidateDataQualitySnapshot | null;
  return !dq?.useCaseTiers?.dailyReview || !dq?.useCaseTiers?.automation;
}

/** Derives a plain-English posture strip label from persisted regime + capital posture. */
export function derivePostureStripText(regime: string | null, postureLabel: string | null): string {
  const label = postureLabel || regime;
  if (!label) return 'Market context unavailable';
  if (label === 'RISK_ON') return 'Risk-on — broad participation supported';
  if (label === 'RISK_OFF') return 'Risk-off — favor caution; selective entries only';
  if (label === 'NEUTRAL') return 'Neutral — selective participation';
  // Fallback: humanize whatever code we have
  return humanizeCode(label);
}

export function coverageValue(run: TodayReviewRun, key: 'mode' | 'trustedCount' | 'catalogCount') {
  const reviewUniverse = sourceSnapshotForRun(run).reviewUniverse || {};
  if (key === 'mode') return run.reviewUniverseMode || reviewUniverse.mode || 'NO_REVIEW';
  if (key === 'trustedCount') return run.trustedUniverseCount ?? reviewUniverse.trustedCount ?? 0;
  return run.catalogCount ?? reviewUniverse.catalogCount ?? 0;
}

// --- Formatting ---
export function formatDate(value?: string | null) {
  if (!value) return 'Unavailable';
  return new Date(value).toLocaleDateString();
}

export function formatDateTime(value?: string | null) {
  if (!value) return 'Unavailable';
  return new Date(value).toLocaleString();
}

export function formatNumber(value?: number | null) {
  return new Intl.NumberFormat().format(Number(value || 0));
}

export function formatCurrency(value?: number | null, currency?: string | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Unavailable';
  return money(value, currency);
}

export function formatEntry(plan: any, currency?: string | null) {
  if (!plan?.entryZone) return 'Unavailable';
  const min = formatCurrency(Number(plan.entryZone.preferredEntryMin), currency);
  const max = formatCurrency(Number(plan.entryZone.preferredEntryMax), currency);
  return `${min} - ${max}`;
}

export function formatStop(plan: any, candidate?: TodayReviewCandidate, currency?: string | null) {
  if (candidate?.blockers?.[0]) return safeReviewText(candidate.blockers[0]);
  if (!plan?.stopLoss) return 'Unavailable';
  const stopPrice = Number(plan.stopLoss.price);
  const entryRef = Number(plan.entryZone?.preferredEntryMin || plan.entryZone?.preferredEntryMax || 0);
  const stopText = formatCurrency(stopPrice, currency);
  const ruleText = safeReviewText(plan.invalidationRules?.[0] || 'Invalidation unavailable');
  const isLong = !candidate?.direction || candidate.direction === 'LONG' || String(candidate?.state ?? '').includes('LONG');
  const isShort = candidate?.direction === 'SHORT' || String(candidate?.state ?? '').includes('SHORT');
  const suspectStop =
    (isLong && entryRef > 0 && stopPrice > 0 && stopPrice < entryRef * 0.6) ||
    (isShort && entryRef > 0 && stopPrice > 0 && stopPrice > entryRef * 1.4);
  const warning = suspectStop ? ' ⚠ Possible unadjusted stop — verify' : '';
  return `${stopText}; ${ruleText}${warning}`;
}

export function stateLabel(state: string) {
  return state.toLowerCase().split('_').map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' ');
}

export function boardSectionLabel(candidate: TodayReviewCandidate) {
  return candidate.boardSection ? stateLabel(candidate.boardSection) : 'Legacy';
}

export function boardSourceLabel(candidate: TodayReviewCandidate) {
  if (!candidate.boardSourceType) return 'Unknown source';
  if (candidate.boardSourceType === 'STRATEGY_BACKED') return 'Strategy-backed';
  if (candidate.boardSourceType === 'LITE') return 'Lite';
  if (candidate.boardSourceType === 'MIXED') return 'Mixed';
  return 'Other';
}

// --- Sorting / value accessors ---
export function compareValues(a: string | number, b: string | number, direction: SortDirection) {
  const modifier = direction === 'asc' ? 1 : -1;
  if (typeof a === 'number' && typeof b === 'number') return (a - b) * modifier;
  return String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true, sensitivity: 'base' }) * modifier;
}

export function gradeSortValue(grade: string) {
  const order: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, UNPROVEN: 5 };
  return order[grade] ?? 99;
}

export function gradeColor(grade: string) {
  if (grade === 'A') return 'success';
  if (grade === 'B') return 'primary';
  if (grade === 'C' || grade === 'UNPROVEN') return 'warning';
  return 'error';
}

export function latestDataDate(candidate: TodayReviewCandidate) {
  const plan = candidate.tradePlanSnapshot as any;
  return plan?.marketDataSnapshot?.latestStoredTradingDate || plan?.latestPriceTimestamp || '';
}

export function dataQualityLabel(candidate: TodayReviewCandidate) {
  const dq = candidate.dataQualitySnapshot as TodayReviewCandidateDataQualitySnapshot | null;
  return dq?.coverageStatus || dq?.signalReadinessStatus || '—';
}

export function proofLabel(candidate: TodayReviewCandidate) {
  const plan = candidate.tradePlanSnapshot as any;
  const proof = candidate.strategyProofSnapshot as any;
  return proof?.strategyRating?.ratingGrade || plan?.strategyRating || '—';
}

export function marketLabel(candidate: TodayReviewCandidate, runRegime?: string | null) {
  const market = candidate.marketContextSnapshot as any;
  const regime = market?.regime?.regime || runRegime || null;
  return regime ? humanizeCode(regime) : '—';
}

export function blockerLabel(candidate: TodayReviewCandidate) {
  return tierContextForCandidate(candidate).blocker || candidate.blockers[0] || '-';
}

export function sectorAlignment(candidate: TodayReviewCandidate) {
  const dq = candidate.dataQualitySnapshot as TodayReviewCandidateDataQualitySnapshot | null;
  const signal = candidate.sourceSignalSnapshot as any;
  const sector = candidate.catalogSector
    || dq?.sector
    || signal?.rawSignal?.sector
    || signal?.priceBehaviour?.sector
    || null;
  return sector ? humanizeCode(sector) : '—';
}

export function tierColor(status: TierStatus): 'success' | 'warning' | 'error' | 'default' {
  if (status === 'READY') return 'success';
  if (status === 'LIMITED') return 'warning';
  if (status === 'BLOCKED' || status === 'MISSING') return 'error';
  return 'default';
}

export function sectorLeadershipColor(status: SectorLeadershipStatus | null): 'success' | 'warning' | 'error' | 'default' {
  if (status === 'LEADING' || status === 'IMPROVING') return 'success';
  if (status === 'WEAKENING' || status === 'LAGGING') return 'error';
  return 'default';
}

/**
 * NR-85 / NR-95: Reads 52-week range position from read-time fields, falling back
 * to the source-signal price-behaviour snapshot.
 */
export function range52wFromCandidate(candidate: TodayReviewCandidate): { positionPct: number; high: number; low: number; current: number } | null {
  if (
    typeof candidate.range52wPositionPct === 'number' &&
    typeof candidate.range52wHigh === 'number' &&
    typeof candidate.range52wLow === 'number' &&
    typeof candidate.range52wCurrentClose === 'number'
  ) {
    return {
      positionPct: candidate.range52wPositionPct,
      high: candidate.range52wHigh,
      low: candidate.range52wLow,
      current: candidate.range52wCurrentClose,
    };
  }
  const signal = candidate.sourceSignalSnapshot as any;
  const pb = signal?.priceBehaviour;
  if (!pb) return null;
  const positionPct = typeof pb.price52wPositionPct === 'number' ? pb.price52wPositionPct : null;
  const high = typeof pb.price52wHigh === 'number' ? pb.price52wHigh : null;
  const low = typeof pb.price52wLow === 'number' ? pb.price52wLow : null;
  const current = typeof pb.price52wCurrentClose === 'number' ? pb.price52wCurrentClose : null;
  if (positionPct === null || high === null || low === null || current === null) return null;
  return { positionPct, high, low, current };
}

export function tierContextForCandidate(candidate: TodayReviewCandidate): CandidateTierContext {
  const dq = candidate.dataQualitySnapshot as TodayReviewCandidateDataQualitySnapshot | null;
  const tiers = dq?.useCaseTiers;
  const dailyReview = tiers?.dailyReview;
  const automation = tiers?.automation;

  const dailyReviewStatus: TierStatus = dailyReview?.status || 'MISSING';
  const automationStatus: TierStatus = automation?.status || 'MISSING';
  const missingTierBlocker = 'Data quality tier context is missing; confidence is shown conservatively.';

  return {
    dailyReview: {
      status: dailyReviewStatus,
      label: dailyReview ? `Daily: ${dailyReview.status}` : '—',
      reason: dailyReview?.reasons?.[0] || (dailyReview ? null : 'Daily review tier not available for this session.'),
    },
    automation: {
      status: automationStatus,
      label: automation ? `Automation: ${automationStatus}` : '—',
      reason: automation?.reasons?.[0] || (automation ? null : 'Automation tier not available; trading is not enabled.'),
    },
    blocker: !tiers
      ? missingTierBlocker
      : dailyReviewStatus === 'LIMITED' || dailyReviewStatus === 'BLOCKED'
        ? dailyReview?.reasons?.[0] || `Daily review tier is ${dailyReviewStatus}.`
        : null,
  };
}

export function confidenceDisplay(candidate: TodayReviewCandidate) {
  // Show the real per-stock score. The data-quality tier-context caveat is a
  // pipeline-wide condition surfaced once as a banner — not a fake per-row
  // "(from N)" penalty repeated identically on every row (G-IN1).
  const score = Number(candidate.confidenceScore || 0);
  return { label: String(score), note: null as string | null };
}

/**
 * Search text for the single symbol/company search field. Deliberately scoped to
 * symbol + company only (the filter bar carries every other facet as a structured
 * dropdown/toggle, so free-text is reserved for ticker/company lookup).
 */
export function symbolSearchText(candidate: TodayReviewCandidate) {
  return `${candidate.symbol} ${candidate.companyName || ''}`.toLowerCase();
}

export function safeReviewText(value: string) {
  return String(value || '')
    .replace(/PAPER_TEST_CANDIDATE/g, 'RESEARCH_REVIEW_CANDIDATE')
    .replace(/READY_FOR_PAPER_REVIEW/g, 'RESEARCH_REVIEW_READY')
    .replace(/Trade-plan proof-chain snapshot supports paper-review research\./gi, 'Exit and invalidation evidence is available for research review.')
    .replace(/Paper review readiness is BLOCKED by the trade-plan snapshot\./gi, 'Exit/invalidation evidence is BLOCKED by the risk snapshot.')
    .replace(/Reward\/risk is below the paper review threshold\./gi, 'Exit/invalidation evidence is incomplete for research review.')
    .replace(/Reward\/risk is incomplete for paper review\./gi, 'Exit/invalidation evidence is incomplete for research review.')
    .replace(/Trade-plan snapshot/gi, 'Exit/invalidation evidence snapshot')
    .replace(/Trade plan has active blockers/gi, 'Exit/invalidation evidence has active blockers')
    .replace(/Trade plan status/gi, 'Risk snapshot status')
    .replace(/Trade plan/gi, 'Risk evidence')
    .replace(/trade plan/gi, 'risk evidence')
    .replace(/trade-plan/gi, 'risk-evidence')
    .replace(/Stop loss/gi, 'Invalidation level')
    .replace(/stop loss/gi, 'invalidation level')
    .replace(/stop level/gi, 'invalidation level')
    .replace(/paper-readiness/gi, 'research-readiness')
    .replace(/paper review/gi, 'research review')
    .replace(/paper-review/gi, 'research-review')
    .replace(/reward\/risk/gi, 'exit/invalidation evidence')
    .replace(/modeled reward/gi, 'modeled compatibility range')
    .replace(/target\/reward/gi, 'exit/invalidation')
    .replace(/target price/gi, 'compatibility price')
    .replace(/price target/gi, 'compatibility price');
}
