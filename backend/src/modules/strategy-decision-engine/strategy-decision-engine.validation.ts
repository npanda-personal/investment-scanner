import type {
  DecisionConfidence,
  StrategyDecision,
  StrategyName,
  StrategyQuery,
  StrategyEvaluateRequest,
} from './strategy-decision-engine.types';
import { StrategyFrameworkService } from '../strategy-framework';
import type { StrategyDefinition } from '../strategy-framework';

type StrategyDecisionValidationService = Pick<StrategyFrameworkService, 'list'>;

let defaultStrategyFrameworkService: StrategyDecisionValidationService | null = null;
const DEFAULT_STRATEGY = 'TREND_MOMENTUM';
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

export async function parseStrategyQuery(
  query: Record<string, unknown>,
  strategyFrameworkService: StrategyDecisionValidationService = defaultValidationService()
): Promise<StrategyQuery> {
  const minScoreValue = Number(first(query.minScore));
  const limitValue = Number(first(query.limit));
  const offsetValue = Number(first(query.offset));

  return {
    strategy: await normalizeStrategy(query.strategy, strategyFrameworkService),
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

export async function parseEvaluateRequest(
  body: any,
  strategyFrameworkService: StrategyDecisionValidationService = defaultValidationService()
): Promise<StrategyEvaluateRequest> {
  const batchSize = Number(body?.batchSize);
  const offset = Number(body?.offset);
  const workerConcurrency = Number(body?.workerConcurrency);
  const strategy = body?.strategy === 'ALL'
    ? 'ALL'
    : await normalizeStrategy(body?.strategy, strategyFrameworkService) || DEFAULT_STRATEGY;

  return {
    strategy,
    instrumentId: typeof body?.instrumentId === 'string' ? body.instrumentId.trim() || undefined : undefined,
    // SF-1: accept an explicit instrument set so the documented scheduled-pipeline
    // bulk path works over HTTP, not only for in-process callers.
    instrumentIds: parseInstrumentIds(body?.instrumentIds),
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

async function normalizeStrategy(
  value: unknown,
  strategyFrameworkService: StrategyDecisionValidationService
): Promise<StrategyName | undefined> {
  const str = String(first(value as any) || '').trim().toUpperCase();
  if (!str) return undefined;
  const definition = (await reviewStrategyDefinitions(strategyFrameworkService)).find((strategy) => strategy.code === str);
  return definition?.code;
}

async function reviewStrategyDefinitions(strategyFrameworkService: StrategyDecisionValidationService): Promise<StrategyDefinition[]> {
  const strategies = await strategyFrameworkService.list({}).catch(() => []);
  return strategies.filter((strategy) => strategy.status === 'ACTIVE' && ['ENTRY', 'EXIT'].includes(strategy.category));
}

function defaultValidationService(): StrategyDecisionValidationService {
  defaultStrategyFrameworkService ??= new StrategyFrameworkService();
  return defaultStrategyFrameworkService;
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

function parseInstrumentIds(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const ids = [...new Set(value.map((id) => String(id ?? '').trim()).filter((id) => id.length > 0))];
  return ids.length > 0 ? ids : undefined;
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
