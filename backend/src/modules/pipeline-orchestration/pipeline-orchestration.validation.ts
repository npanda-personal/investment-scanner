import type { PipelineStatusQuery } from './pipeline-orchestration.types';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MAX_STAGE_KEYS = 25;

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
