import type {
  PipelineCommandCatalogQuery,
  PipelineCommandKey,
  PipelineCommandRequest,
  PipelineStatusQuery,
} from './pipeline-orchestration.types';
import { PIPELINE_COMMAND_KEYS } from './pipeline-orchestration.types';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MAX_STAGE_KEYS = 25;
const DEFAULT_BATCH_SIZE = 25;
const MAX_BATCH_SIZE = 100;

export function parsePipelineStatusQuery(query: Record<string, unknown>): PipelineStatusQuery {
  const stageKeys = parseStageKeys(query.stageKeys);
  return {
    region: normalizeText(query.region, 'IN').toUpperCase(),
    assetType: normalizeText(query.assetType, 'STOCK').toUpperCase(),
    timeframe: normalizeText(query.timeframe, '1d').toLowerCase(),
    pipelineKey: normalizeText(query.pipelineKey, 'market-intelligence'),
    limit: parseLimit(query.limit),
    ...(stageKeys.length ? { stageKeys } : {}),
  };
}

export function parsePipelineCommandCatalogQuery(query: Record<string, unknown>): PipelineCommandCatalogQuery {
  return {
    region: normalizeText(first(query.region), 'IN').toUpperCase(),
    assetType: normalizeText(first(query.assetType), 'STOCK').toUpperCase(),
    timeframe: normalizeText(first(query.timeframe), '1d').toLowerCase(),
    pipelineKey: normalizeText(first(query.pipelineKey), 'market-intelligence'),
  };
}

export function parsePipelineCommandRequest(input: Record<string, unknown>): PipelineCommandRequest {
  return {
    commandKey: parseCommandKey(input.commandKey),
    region: normalizeText(first(input.region), 'IN').toUpperCase(),
    assetType: normalizeText(first(input.assetType), 'STOCK').toUpperCase(),
    timeframe: normalizeText(first(input.timeframe), '1d').toLowerCase(),
    pipelineKey: normalizeText(first(input.pipelineKey), 'market-intelligence'),
    runMode: parseRunMode(first(input.runMode)),
    batchSize: parseBatchSize(first(input.batchSize)),
    offset: parseOffset(first(input.offset)),
    idempotencyKey: String(first(input.idempotencyKey) ?? '').trim(),
    reason: parseOptionalText(first(input.reason)),
    params: parseOptionalParams(input.params),
    force: parseForceFlag(first(input.force)),
  };
}

export function isPipelineCommandKey(value: string): value is PipelineCommandKey {
  return (PIPELINE_COMMAND_KEYS as readonly string[]).includes(value);
}

function first(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeText(value: unknown, fallback: string): string {
  const text = String(value ?? fallback).trim();
  if (!text) return fallback;
  return text;
}

function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === '') return DEFAULT_LIMIT;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_LIMIT) {
    throw new Error(`limit must be an integer between 1 and ${MAX_LIMIT}`);
  }
  return parsed;
}

function parseStageKeys(value: unknown): string[] {
  if (value === undefined || value === null || value === '') return [];
  const parts = Array.isArray(value) ? value : String(value).split(',');
  const keys = parts.map((part) => String(part).trim()).filter(Boolean);
  if (keys.length > MAX_STAGE_KEYS) throw new Error(`stageKeys must include ${MAX_STAGE_KEYS} or fewer values`);
  return [...new Set(keys)];
}

function parseCommandKey(value: unknown): PipelineCommandKey {
  const key = String(value ?? '').trim().toUpperCase();
  if (!isPipelineCommandKey(key)) throw new Error('commandKey is required and must be a supported command');
  return key;
}

function parseRunMode(value: unknown): PipelineCommandRequest['runMode'] {
  const normalized = String(value ?? '').trim();
  if (normalized === 'single_batch' || normalized === 'incremental_changed_only' || normalized === 'full_latest_trading_date') {
    return normalized;
  }
  throw new Error('runMode must be single_batch, incremental_changed_only, or full_latest_trading_date');
}

function parseBatchSize(value: unknown): number {
  if (value === undefined || value === null || value === '') return DEFAULT_BATCH_SIZE;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_BATCH_SIZE) {
    throw new Error(`batchSize must be an integer between 1 and ${MAX_BATCH_SIZE}`);
  }
  return parsed;
}

function parseOffset(value: unknown): number {
  if (value === undefined || value === null || value === '') return 0;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error('offset must be a non-negative integer');
  return parsed;
}

function parseOptionalText(value: unknown): string | undefined {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : undefined;
}

function parseOptionalParams(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('params must be an object when provided');
  }
  return { ...(value as Record<string, unknown>) };
}

function parseForceFlag(value: unknown): false {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    throw new Error('force=true is not allowed for manual commands');
  }
  if (value === true) throw new Error('force=true is not allowed for manual commands');
  return false;
}
