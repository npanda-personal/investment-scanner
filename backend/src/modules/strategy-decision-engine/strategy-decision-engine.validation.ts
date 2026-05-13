import type {
  DecisionConfidence,
  StrategyDecision,
  StrategyName,
  StrategyQuery,
  StrategyEvaluateRequest,
} from './strategy-decision-engine.types';
import { StrategyFrameworkRegistry } from '../strategy-framework';

const registry = new StrategyFrameworkRegistry();
const DECISIONS: StrategyDecision[] = [
  'TRADE_CANDIDATE',
  'WATCH',
  'WAIT',
  'AVOID',
  'EXIT_CANDIDATE',
  'REDUCE_RISK',
  'HOLD',
  'INSUFFICIENT_DATA',
];
const CONFIDENCES: DecisionConfidence[] = ['LOW', 'MEDIUM', 'HIGH'];

export function parseStrategyQuery(query: Record<string, unknown>): StrategyQuery {
  const minScoreValue = Number(first(query.minScore));
  const limitValue = Number(first(query.limit));
  const offsetValue = Number(first(query.offset));

  return {
    strategy: normalizeStrategy(query.strategy),
    decision: normalizeDecision(query.decision),
    minScore: Number.isFinite(minScoreValue) ? Math.min(100, Math.max(0, minScoreValue)) : undefined,
    confidence: normalizeConfidence(query.confidence),
    frameworkBacked: normalizeBoolean(query.frameworkBacked),
    includeLegacy: normalizeBoolean(query.includeLegacy),
    includeHistory: normalizeBoolean(query.includeHistory),
    strategyRatingGrades: normalizeStringList(query.strategyRatingGrades || query.strategyRatingGrade),
    readinessLabels: normalizeStringList(query.readinessLabels || query.readinessLabel),
    sector: typeof first(query.sector) === 'string' ? String(first(query.sector)).trim() || undefined : undefined,
    country: typeof first(query.country) === 'string' ? String(first(query.country)).trim() || undefined : undefined,
    region: typeof first(query.region) === 'string' ? String(first(query.region)).trim() || undefined : undefined,
    assetType: typeof first(query.assetType) === 'string' ? String(first(query.assetType)).trim() || undefined : undefined,
    limit: Number.isFinite(limitValue) ? Math.min(100, Math.max(1, Math.floor(limitValue))) : 25,
    offset: Number.isFinite(offsetValue) ? Math.max(0, Math.floor(offsetValue)) : undefined,
    sortBy: typeof first(query.sortBy) === 'string' ? String(first(query.sortBy)).trim() || undefined : undefined,
    sortDirection: first(query.sortDirection) === 'asc' ? 'asc' : 'desc',
  };
}

export function parseEvaluateRequest(body: any): StrategyEvaluateRequest {
  const batchSize = Number(body?.batchSize);
  const offset = Number(body?.offset);
  const workerConcurrency = Number(body?.workerConcurrency);

  return {
    strategy: body?.strategy === 'ALL' ? 'ALL' : normalizeStrategy(body?.strategy) || 'TREND_MOMENTUM',
    instrumentId: typeof body?.instrumentId === 'string' ? body.instrumentId.trim() || undefined : undefined,
    symbol: typeof body?.symbol === 'string' ? body.symbol.trim().toUpperCase() || undefined : undefined,
    portfolioId: typeof body?.portfolioId === 'string' ? body.portfolioId.trim() || undefined : undefined,
    watchlistId: typeof body?.watchlistId === 'string' ? body.watchlistId.trim() || undefined : undefined,
    region: typeof body?.region === 'string' ? body.region.trim() || undefined : undefined,
    assetType: typeof body?.assetType === 'string' ? body.assetType.trim() || undefined : undefined,
    batchSize: Number.isFinite(batchSize) ? Math.min(100, Math.max(1, Math.floor(batchSize))) : 25,
    offset: Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0,
    workerConcurrency: Number.isFinite(workerConcurrency) ? Math.min(8, Math.max(1, Math.floor(workerConcurrency))) : undefined,
  };
}

function normalizeStrategy(value: unknown): StrategyName | undefined {
  const str = String(value || '').toUpperCase();
  const definition = registry.get(str);
  if (!definition || definition.status !== 'ACTIVE') return undefined;
  return ['ENTRY', 'EXIT'].includes(definition.category) ? definition.code : undefined;
}

function normalizeDecision(value: unknown): StrategyDecision | undefined {
  const str = String(value || '').toUpperCase() as StrategyDecision;
  return DECISIONS.includes(str) ? str : undefined;
}

function normalizeConfidence(value: unknown): DecisionConfidence | undefined {
  const str = String(value || '').toUpperCase() as DecisionConfidence;
  return CONFIDENCES.includes(str) ? str : undefined;
}

function normalizeBoolean(value: unknown): boolean | undefined {
  const str = String(first(value as any) || '').trim().toLowerCase();
  if (str === 'true') return true;
  if (str === 'false') return false;
  return undefined;
}

function normalizeStringList(value: unknown): string[] | undefined {
  const raw = first(value as any);
  if (typeof raw !== 'string') return undefined;
  const values = raw
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
  return values.length > 0 ? [...new Set(values)] : undefined;
}

function first<T>(value: T | T[] | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value;
}
