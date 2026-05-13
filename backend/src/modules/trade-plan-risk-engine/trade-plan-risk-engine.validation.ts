import type { GenerateTradePlanRequest, BatchGenerateTradePlanRequest, TradePlanListQuery, TradePlanFunnelQuery } from './trade-plan-risk-engine.types';

const MAX_BATCH_GENERATE_BATCH_SIZE = 100;
const MAX_BATCH_GENERATE_WORKER_CONCURRENCY = 10;

export function parseGenerateRequest(body: unknown): GenerateTradePlanRequest {
  const req = body as any;
  if (!req || typeof req !== 'object') throw new Error('Invalid request body');
  if (!req.instrumentId || typeof req.instrumentId !== 'string') throw new Error('instrumentId is required and must be a string');
  if (!req.symbol || typeof req.symbol !== 'string') throw new Error('symbol is required and must be a string');

  return {
    instrumentId: req.instrumentId,
    symbol: req.symbol,
    strategyDecisionId: typeof req.strategyDecisionId === 'string' ? req.strategyDecisionId : undefined,
    portfolioId: typeof req.portfolioId === 'string' ? req.portfolioId : undefined,
    region: typeof req.region === 'string' ? req.region : undefined,
    assetType: typeof req.assetType === 'string' ? req.assetType : undefined,
    backtestTimeframe: typeof req.backtestTimeframe === 'string' ? req.backtestTimeframe : undefined,
    riskPercent: typeof req.riskPercent === 'number' ? req.riskPercent : undefined,
    capitalBase: typeof req.capitalBase === 'number' ? req.capitalBase : undefined,
    targetRewardRisk: typeof req.targetRewardRisk === 'number' ? req.targetRewardRisk : undefined,
  };
}

export function parseBatchGenerateRequest(body: unknown): BatchGenerateTradePlanRequest {
  const req = (body || {}) as any;
  return {
    batchSize: typeof req.batchSize === 'number' ? Math.max(1, Math.min(Math.floor(req.batchSize), MAX_BATCH_GENERATE_BATCH_SIZE)) : 25,
    offset: typeof req.offset === 'number' ? Math.max(0, Math.floor(req.offset)) : 0,
    region: typeof req.region === 'string' ? req.region : undefined,
    assetType: typeof req.assetType === 'string' ? req.assetType : undefined,
    strategyCode: typeof req.strategyCode === 'string' ? req.strategyCode : undefined,
    backtestTimeframe: typeof req.backtestTimeframe === 'string' ? req.backtestTimeframe : undefined,
    workerConcurrency: typeof req.workerConcurrency === 'number'
      ? Math.max(1, Math.min(Math.floor(req.workerConcurrency), MAX_BATCH_GENERATE_WORKER_CONCURRENCY))
      : undefined,
  };
}

export function parseListQuery(query: any): TradePlanListQuery {
  return {
    region: typeof query.region === 'string' ? query.region : undefined,
    assetType: typeof query.assetType === 'string' ? query.assetType : undefined,
    strategyCode: typeof query.strategyCode === 'string' ? query.strategyCode : undefined,
    planStatus: typeof query.planStatus === 'string' ? query.planStatus : undefined,
    riskGrade: typeof query.riskGrade === 'string' ? query.riskGrade : undefined,
    minRewardRisk: typeof query.minRewardRisk === 'string' && !isNaN(Number(query.minRewardRisk)) ? Number(query.minRewardRisk) : undefined,
    paperReadyOnly: query.paperReadyOnly === 'true' || query.paperReadyOnly === true,
    paperReadinessStatus: typeof query.paperReadinessStatus === 'string' ? query.paperReadinessStatus : undefined,
    backtestTimeframe: typeof query.backtestTimeframe === 'string' ? query.backtestTimeframe : undefined,
    strategyRating: typeof query.strategyRating === 'string' ? query.strategyRating : undefined,
    readinessLabel: typeof query.readinessLabel === 'string' ? query.readinessLabel : undefined,
    portfolioId: typeof query.portfolioId === 'string' ? query.portfolioId : undefined,
    includeLegacy: query.includeLegacy === 'true' || query.includeLegacy === true,
    limit: typeof query.limit === 'string' && !isNaN(Number(query.limit)) ? Number(query.limit) : 50,
    offset: typeof query.offset === 'string' && !isNaN(Number(query.offset)) ? Number(query.offset) : 0,
    sortBy: typeof query.sortBy === 'string' ? query.sortBy : 'generatedAt',
    sortDirection: query.sortDirection === 'asc' ? 'asc' : 'desc',
  };
}

export function parseFunnelQuery(query: any): TradePlanFunnelQuery {
  return {
    region: typeof query.region === 'string' ? query.region : undefined,
    assetType: typeof query.assetType === 'string' ? query.assetType : undefined,
    strategyCode: typeof query.strategyCode === 'string' ? query.strategyCode : undefined,
    generatedDate: typeof query.generatedDate === 'string' ? query.generatedDate : undefined,
    from: typeof query.from === 'string' ? query.from : undefined,
    to: typeof query.to === 'string' ? query.to : undefined,
    backtestTimeframe: typeof query.backtestTimeframe === 'string' ? query.backtestTimeframe : undefined,
    includeLegacy: query.includeLegacy === 'true' || query.includeLegacy === true,
  };
}
