import type { TradePlanResultDto } from './trade-plan-risk-engine.types';

const STOP_INSIDE_LONG_ENTRY_ZONE = 'Stop loss is inside or above the long entry zone; plan is blocked until the stop is below the planned entry floor.';
const CURRENT_BELOW_ENTRY_ZONE = 'Current price is below the entry zone; sizing and target assume waiting for the entry-zone floor.';
const PLAN_STATUS_BLOCKED = 'Plan status is BLOCKED; VALID is required.';
const ACTIVE_BLOCKERS = 'Trade plan has active blockers.';
const STOP_RATIONALE_REPAIR = 'Geometry blocked: stop must sit below the long entry-zone floor.';

export const tradePlanGeometryMessages = {
  STOP_INSIDE_LONG_ENTRY_ZONE,
  CURRENT_BELOW_ENTRY_ZONE,
  PLAN_STATUS_BLOCKED,
  ACTIVE_BLOCKERS,
  STOP_RATIONALE_REPAIR,
};

export function applyLongPlanGeometryGuards(
  plan: TradePlanResultDto,
  options: { currentPrice?: number | null; plannedEntry?: number | null } = {}
): TradePlanResultDto {
  if (!plan.entryZone || !plan.stopLoss) return plan;
  const entryMin = Number(plan.entryZone.preferredEntryMin);
  const entryMax = Number(plan.entryZone.preferredEntryMax);
  const reference = Number(plan.entryZone.referencePrice);
  const latest = Number(options.currentPrice ?? plan.latestPrice ?? plan.marketDataSnapshot?.latestPrice);
  const plannedEntry = Number(options.plannedEntry ?? planningEntryPrice(latest, entryMin, entryMax, reference));
  const stop = Number(plan.stopLoss.price);
  if (![entryMin, entryMax, plannedEntry, stop].every(Number.isFinite)) return plan;

  if (Number.isFinite(latest) && latest < entryMin) addUnique(plan.warnings, CURRENT_BELOW_ENTRY_ZONE);

  if (stop >= entryMin || stop >= plannedEntry) {
    plan.planStatus = 'BLOCKED';
    plan.riskGrade = 'HIGH';
    addUnique(plan.blockers, STOP_INSIDE_LONG_ENTRY_ZONE);
    addUnique(plan.paperReadinessBlockers, PLAN_STATUS_BLOCKED);
    addUnique(plan.paperReadinessBlockers, ACTIVE_BLOCKERS);
    plan.stopLoss = {
      ...plan.stopLoss,
      quality: 'WEAK',
      percentBelowEntry: plannedEntry > 0 ? ((plannedEntry - stop) / plannedEntry) * 100 : plan.stopLoss.percentBelowEntry,
      rationale: appendOnce(plan.stopLoss.rationale, STOP_RATIONALE_REPAIR),
    };
  }

  return canonicalizeTradePlanReadiness(plan);
}

export function canonicalizeTradePlanReadiness(plan: TradePlanResultDto): TradePlanResultDto {
  plan.blockers = unique(plan.blockers || []);
  plan.warnings = unique(plan.warnings || []);
  plan.paperReadinessBlockers = unique(plan.paperReadinessBlockers || []);
  plan.paperReadinessReasons = unique(plan.paperReadinessReasons || []);

  if (plan.planStatus === 'INSUFFICIENT_DATA') {
    plan.riskGrade = 'UNDEFINED';
    plan.paperReadinessStatus = 'INSUFFICIENT_DATA';
    plan.paperReadinessReasons = [];
    return plan;
  }

  const hasHardBlockers = plan.planStatus === 'BLOCKED' || plan.blockers.includes(STOP_INSIDE_LONG_ENTRY_ZONE);
  if (hasHardBlockers) {
    plan.planStatus = 'BLOCKED';
    plan.riskGrade = 'HIGH';
    if (plan.planStatus === 'BLOCKED') addUnique(plan.paperReadinessBlockers, PLAN_STATUS_BLOCKED);
    if (plan.blockers.length > 0) addUnique(plan.paperReadinessBlockers, ACTIVE_BLOCKERS);
    for (const blocker of plan.blockers) addUnique(plan.paperReadinessBlockers, blocker);
    plan.paperReadinessStatus = 'BLOCKED';
    plan.paperReadinessReasons = [];
  }

  if (plan.paperReadinessStatus !== 'READY_FOR_PAPER_REVIEW') {
    plan.paperReadinessReasons = [];
  }

  return plan;
}

function planningEntryPrice(currentPrice: number, entryMin: number, entryMax: number, reference: number) {
  if (Number.isFinite(currentPrice)) {
    if (currentPrice < entryMin) return entryMin;
    if (currentPrice > entryMax) return currentPrice;
    return currentPrice;
  }
  if (Number.isFinite(reference)) return Math.min(Math.max(reference, entryMin), entryMax);
  return entryMin;
}

function addUnique(list: string[] | undefined, value: string) {
  if (!list) return;
  if (!list.includes(value)) list.push(value);
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function appendOnce(base: string | undefined, suffix: string) {
  const value = String(base || '').trim();
  const baseWithoutDuplicates = value
    .split(suffix)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ');
  return [baseWithoutDuplicates, suffix].filter(Boolean).join(' ');
}
