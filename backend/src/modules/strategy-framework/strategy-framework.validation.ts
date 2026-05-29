import type { RegisteredBacktestInput, StrategyCategory, StrategyListQuery, StrategyPerformanceQuery, StrategyRankingsQuery, StrategyStatus, StrategyTimeframe } from './strategy-framework.types';

const TIMEFRAMES: StrategyTimeframe[] = ['1Y', '3Y', '5Y', '10Y', '15Y'];
const STATUSES: StrategyStatus[] = ['DRAFT', 'ACTIVE', 'DISABLED', 'DEPRECATED'];
const CATEGORIES: StrategyCategory[] = ['ENTRY', 'EXIT', 'FILTER', 'GATE', 'RISK', 'CALIBRATION', 'DIAGNOSTIC'];

const first = (value: unknown) => Array.isArray(value) ? value[0] : value;
const text = (value: unknown) => typeof first(value) === 'string' ? String(first(value)).trim() || undefined : undefined;

export function parseListQuery(query: Record<string, unknown>): StrategyListQuery {
  const status = String(text(query.status) || '').toUpperCase() as StrategyStatus;
  const category = String(text(query.category) || '').toUpperCase() as StrategyCategory;
  return {
    status: STATUSES.includes(status) ? status : undefined,
    category: CATEGORIES.includes(category) ? category : undefined,
    style: text(query.style),
    region: text(query.region),
    assetType: text(query.assetType) || 'STOCK',
  };
}

export function parsePerformanceQuery(query: Record<string, unknown>): StrategyPerformanceQuery {
  const timeframe = String(text(query.timeframe) || '').toUpperCase() as StrategyTimeframe;
  return {
    timeframe: TIMEFRAMES.includes(timeframe) ? timeframe : undefined,
    region: text(query.region) || 'IN',
    assetType: text(query.assetType) || 'STOCK',
    universeKey: text(query.universeKey),
  };
}

export function parseProofQuery(query: Record<string, unknown>): StrategyPerformanceQuery {
  const parsed = parsePerformanceQuery(query);
  return {
    ...parsed,
    timeframe: parsed.timeframe || '3Y',
    universeKey: text(query.universeKey) || 'ALL_ELIGIBLE',
  };
}

export function parseRankingsQuery(query: Record<string, unknown>): StrategyRankingsQuery {
  return { ...parsePerformanceQuery(query), minRating: text(query.minRating) as any };
}

export function parseBacktestRequest(code: string, body: any): RegisteredBacktestInput {
  const timeframe = String(body?.timeframe || '1Y').toUpperCase() as StrategyTimeframe;
  const initialCapital = Number(body?.initialCapital);
  const maxPositions = Number(body?.maxPositions);
  const transactionCostPercent = Number(body?.transactionCostPercent);
  return {
    strategyCode: code,
    timeframe: TIMEFRAMES.includes(timeframe) ? timeframe : '1Y',
    region: typeof body?.region === 'string' ? body.region : 'IN',
    assetType: typeof body?.assetType === 'string' ? body.assetType : 'STOCK',
    universe: body?.universe || { type: 'ALL' },
    initialCapital: Number.isFinite(initialCapital) ? Math.max(1000, initialCapital) : undefined,
    maxPositions: Number.isFinite(maxPositions) ? Math.max(1, Math.floor(maxPositions)) : undefined,
    transactionCostPercent: Number.isFinite(transactionCostPercent) ? Math.max(0, transactionCostPercent) : undefined,
    positionSizeType: body?.positionSizeType === 'FIXED_AMOUNT' ? 'FIXED_AMOUNT' : 'EQUAL_WEIGHT',
    fixedAmountPerTrade: Number.isFinite(Number(body?.fixedAmountPerTrade)) ? Number(body.fixedAmountPerTrade) : undefined,
  };
}

export function parseEvaluateRequest(body: any) {
  return {
    strategyCode: typeof body?.strategyCode === 'string' ? body.strategyCode.toUpperCase() : 'ALL',
    instrumentId: typeof body?.instrumentId === 'string' ? body.instrumentId : undefined,
    symbol: typeof body?.symbol === 'string' ? body.symbol.toUpperCase() : undefined,
    region: typeof body?.region === 'string' ? body.region : 'IN',
    assetType: typeof body?.assetType === 'string' ? body.assetType : 'STOCK',
  };
}

export function getCode(value: unknown): string {
  const code = String(first(value) || '').trim().toUpperCase();
  if (!code) throw new Error('strategy code is required');
  return code;
}
