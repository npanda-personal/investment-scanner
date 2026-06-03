import axios from 'axios';
import type { MarketScope } from '@/contexts/MarketScopeContext';
import type {
  CompounderSnapshot,
  EarningsIntelligenceSnapshot,
  InstrumentContextSnapshot,
  MarketPulseSnapshot,
  RiskRadarSnapshot,
  SectorIntelligenceSnapshot,
  SnapshotAvailability,
  SnapshotEnvelope,
  StockInterestSnapshot,
  TraderSetupSnapshot,
} from '../types';

const API_BASE = '/api/v1/market-intelligence';

type BackendMarketPulseResponse = {
  availability?: string;
  scope?: { region?: string; assetType?: string; timeframe?: string };
  snapshot?: (MarketPulseSnapshot & {
    marketHealthLabel?: string;
    status?: string;
  }) | null;
  message?: string;
  warnings?: string[];
};

type BackendSectorResponse = {
  status?: string;
  scope?: { region?: string; assetType?: string };
  snapshotDate?: string | null;
  dataThroughDate?: string | null;
  generatedAt?: string | null;
  warnings?: string[];
  sectors?: SectorIntelligenceSnapshot[];
};

type BackendEarningsRow = Omit<EarningsIntelligenceSnapshot, 'marginTrend' | 'resultDateSource' | 'categories'> & {
  id?: string;
  marginTrend?: number | null;
  resultDateSource?: string | null;
  categories?: string[];
};

type BackendEarningsResponse = {
  scope?: { region?: string; assetType?: string };
  snapshotDate?: string | null;
  dataThroughDate?: string | null;
  generatedAt?: string | null;
  freshness?: string | null;
  items?: BackendEarningsRow[];
  categories?: Record<string, BackendEarningsRow[]>;
  warnings?: string[];
};

type BackendStockInterestResponse = {
  availability?: string;
  scope?: { region?: string; assetType?: string };
  snapshot?: StockInterestSnapshot[] | null;
  message?: string;
  warnings?: string[];
};

function params(scope: MarketScope) {
  return {
    region: scope.region,
    assetType: scope.assetType,
  };
}

function scopeFromBackend(scope: MarketScope, backend?: { region?: string; assetType?: string }): MarketScope {
  return {
    region: (backend?.region || scope.region) as MarketScope['region'],
    assetType: (backend?.assetType || scope.assetType) as MarketScope['assetType'],
  };
}

function unavailable<T>(scope: MarketScope, message: string): SnapshotEnvelope<T> {
  return {
    availability: 'BACKEND_UNAVAILABLE',
    scope,
    snapshot: null,
    message,
    warnings: ['Persisted backend read API capability is not implemented for this snapshot yet.'],
  };
}

function errorEnvelope<T>(scope: MarketScope, message: string, caught: unknown): SnapshotEnvelope<T> {
  return {
    availability: 'ERROR',
    scope,
    snapshot: null,
    message,
    warnings: [errorMessage(caught, message)],
  };
}

function errorMessage(caught: unknown, fallback: string): string {
  if (axios.isAxiosError(caught)) {
    const data = caught.response?.data as { error?: string; message?: string } | undefined;
    return data?.error || data?.message || caught.message || fallback;
  }
  return caught instanceof Error ? caught.message : fallback;
}

function availabilityFromStatus(status: string | null | undefined, hasRows: boolean): SnapshotAvailability {
  const normalized = String(status || '').toUpperCase();
  if (!hasRows && (normalized === 'NO_SNAPSHOT' || normalized === 'MISSING')) return 'EMPTY';
  if (normalized === 'EMPTY' || normalized === 'NO_SNAPSHOT' || normalized === 'MISSING') return 'EMPTY';
  if (normalized === 'PARTIAL') return 'PARTIAL';
  if (normalized === 'STALE') return 'STALE';
  if (normalized === 'FAILED' || normalized === 'ERROR') return 'ERROR';
  return hasRows ? 'READY' : 'EMPTY';
}

function displayEnum(value: string | null | undefined): string {
  if (!value) return 'Unavailable';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : part)
    .join(' ');
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function firstSnapshotDate<T extends { snapshotDate?: string | null }>(rows: T[]): string | null {
  return rows.find((row) => row.snapshotDate)?.snapshotDate ?? null;
}

function firstDataThroughDate<T extends { dataThroughDate?: string | null }>(rows: T[]): string | null {
  return rows.find((row) => row.dataThroughDate)?.dataThroughDate ?? null;
}

function strongestRowFreshness(rows: Array<{ freshness?: string | null }>): SnapshotAvailability {
  const statuses = rows.map((row) => String(row.freshness || '').toUpperCase());
  if (statuses.includes('STALE')) return 'STALE';
  if (statuses.includes('PARTIAL') || statuses.includes('MISSING')) return 'PARTIAL';
  return rows.length > 0 ? 'READY' : 'EMPTY';
}

function dedupeById<T extends { id?: string; symbol?: string; categories?: string[] }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((row, index) => {
    const key = row.id || `${row.symbol || 'row'}:${index}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function fetchMarketPulseSnapshot(scope: MarketScope): Promise<SnapshotEnvelope<MarketPulseSnapshot>> {
  try {
    const response = await axios.get<BackendMarketPulseResponse>(`${API_BASE}/market-pulse`, {
      params: { ...params(scope), timeframe: '1d' },
    });
    const body = response.data;
    const snapshot = body.snapshot
      ? {
          ...body.snapshot,
          marketHealthLabel: displayEnum(body.snapshot.marketHealthLabel),
        }
      : null;
    const availability = body.availability === 'READY'
      ? availabilityFromStatus(snapshot?.status, Boolean(snapshot))
      : availabilityFromStatus(body.availability, Boolean(snapshot));

    return {
      availability,
      scope: scopeFromBackend(scope, body.scope),
      snapshot,
      message: body.message || (snapshot ? 'Persisted Market Pulse snapshot loaded.' : 'Market Pulse snapshot is not available for this scope.'),
      warnings: body.warnings || snapshot?.warnings || [],
      status: snapshot?.status || null,
      freshness: snapshot?.sourceSummary?.status || snapshot?.status || null,
      snapshotDate: snapshot?.snapshotDate || null,
      dataThroughDate: snapshot?.dataThroughDate || null,
      generatedAt: snapshot?.generatedAt || null,
    };
  } catch (caught) {
    return errorEnvelope(scope, 'Failed to load Market Pulse snapshot.', caught);
  }
}

export async function fetchSectorIntelligenceSnapshot(scope: MarketScope): Promise<SnapshotEnvelope<SectorIntelligenceSnapshot[]>> {
  try {
    const response = await axios.get<BackendSectorResponse>(`${API_BASE}/sectors`, { params: params(scope) });
    const body = response.data;
    const rows = body.sectors || [];
    return {
      availability: body.status === 'ready' && rows.length > 0 ? 'READY' : 'EMPTY',
      scope: scopeFromBackend(scope, body.scope),
      snapshot: rows,
      message: rows.length > 0 ? 'Persisted Sector Intelligence snapshot rows loaded.' : 'Sector Intelligence snapshot is not available for this scope.',
      warnings: body.warnings || [],
      status: body.status || null,
      freshness: body.status || null,
      snapshotDate: body.snapshotDate || firstSnapshotDate(rows),
      dataThroughDate: body.dataThroughDate || firstDataThroughDate(rows),
      generatedAt: body.generatedAt || null,
    };
  } catch (caught) {
    return errorEnvelope(scope, 'Failed to load Sector Intelligence snapshot.', caught);
  }
}

export async function fetchStockInterestRadarSnapshot(scope: MarketScope): Promise<SnapshotEnvelope<StockInterestSnapshot[]>> {
  try {
    const response = await axios.get<BackendStockInterestResponse>(`${API_BASE}/stock-interest`, { params: params(scope) });
    const body = response.data;
    const rows = body.snapshot || [];
    const availability = body.availability === 'READY'
      ? strongestRowFreshness(rows)
      : availabilityFromStatus(body.availability, rows.length > 0);

    return {
      availability,
      scope: scopeFromBackend(scope, body.scope),
      snapshot: rows,
      message: body.message || (rows.length > 0 ? 'Persisted Stock Interest snapshot rows loaded.' : 'Stock Interest snapshot is not available for this scope.'),
      warnings: body.warnings?.slice(0, 1) || [],
      status: body.availability || null,
      freshness: rows.find((row) => row.freshness)?.freshness || null,
      snapshotDate: firstSnapshotDate(rows),
      dataThroughDate: firstDataThroughDate(rows),
      generatedAt: rows.find((row) => row.generatedAt)?.generatedAt || null,
    };
  } catch (caught) {
    return errorEnvelope(scope, 'Failed to load Stock Interest snapshot.', caught);
  }
}

export async function fetchEarningsIntelligenceSnapshot(scope: MarketScope): Promise<SnapshotEnvelope<EarningsIntelligenceSnapshot[]>> {
  try {
    const response = await axios.get<BackendEarningsResponse>(`${API_BASE}/earnings`, { params: params(scope) });
    const body = response.data;
    const categoryRows = Object.values(body.categories || {}).flat();
    const sourceRows = categoryRows.length > 0 ? categoryRows : body.items || [];
    const rows = dedupeById(sourceRows).map((row) => ({
      ...row,
      dataThroughDate: row.dataThroughDate ?? body.dataThroughDate ?? null,
      generatedAt: row.generatedAt ?? body.generatedAt ?? null,
      resultDateSource: row.resultDateSource || 'UNKNOWN',
      periodEndDate: row.periodEndDate ?? null,
      validatedAt: row.validatedAt ?? null,
      marginTrend: typeof row.marginTrend === 'number' ? row.marginTrend : null,
      categories: arrayOfStrings(row.categories),
      reasonTags: arrayOfStrings(row.reasonTags),
      riskTags: arrayOfStrings(row.riskTags),
      warnings: arrayOfStrings(row.warnings),
    }));

    return {
      availability: availabilityFromStatus(body.freshness, rows.length > 0),
      scope: scopeFromBackend(scope, body.scope),
      snapshot: rows,
      message: rows.length > 0 ? 'Persisted Earnings Intelligence snapshot rows loaded.' : 'Earnings Intelligence snapshot is not available for this scope.',
      warnings: body.warnings || [],
      status: body.freshness || null,
      freshness: body.freshness || null,
      snapshotDate: body.snapshotDate || firstSnapshotDate(rows),
      dataThroughDate: body.dataThroughDate || firstDataThroughDate(rows),
      generatedAt: body.generatedAt || rows.find((row) => row.generatedAt)?.generatedAt || null,
    };
  } catch (caught) {
    return errorEnvelope(scope, 'Failed to load Earnings Intelligence snapshot.', caught);
  }
}

export async function fetchCompounderRadarSnapshot(scope: MarketScope): Promise<SnapshotEnvelope<CompounderSnapshot[]>> {
  return unavailable(scope, 'Compounder Radar backend not available yet.');
}

export async function fetchTraderSetupRadarSnapshot(scope: MarketScope): Promise<SnapshotEnvelope<TraderSetupSnapshot[]>> {
  return unavailable(scope, 'Trader Setup Radar backend not available yet.');
}

export async function fetchRiskRadarSnapshot(scope: MarketScope): Promise<SnapshotEnvelope<RiskRadarSnapshot[]>> {
  return unavailable(scope, 'Risk Radar backend not available yet.');
}

export async function fetchInstrumentContextSnapshot(scope: MarketScope): Promise<SnapshotEnvelope<InstrumentContextSnapshot>> {
  return unavailable(scope, 'Instrument Context backend not available yet.');
}
