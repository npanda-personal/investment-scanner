import axios from 'axios';
import type { MarketScope } from '@/contexts/MarketScopeContext';
import type {
  CompounderSnapshot,
  EarningsIntelligenceSnapshot,
  IndexConstituentsEnvelope,
  InstrumentContextSnapshot,
  MarketPulseSnapshot,
  RiskRadarSnapshot,
  SectorConstituentRow,
  SectorConstituentsEnvelope,
  SectorIntelligenceSnapshot,
  SectorRotationEnvelope,
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
  resultDateLabel?: 'Official' | 'Estimated' | null;
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

/**
 * Derive a freshness label from actual dates rather than trusting the backend's
 * cached status string.  Compares dataThroughDate against the expected latest
 * trading date (latestCompletedTradingDate from sourceSummary, if present).
 * If >1 calendar day behind the expected latest, the snapshot is Stale.
 * Returns null when there is insufficient information to decide.
 */
function deriveFreshness(
  dataThroughDate: string | null | undefined,
  latestCompletedTradingDate: string | null | undefined,
): string | null {
  if (!dataThroughDate || !latestCompletedTradingDate) return null;
  const dtMs = new Date(dataThroughDate).getTime();
  const latestMs = new Date(latestCompletedTradingDate).getTime();
  if (!Number.isFinite(dtMs) || !Number.isFinite(latestMs)) return null;
  const diffDays = Math.round((latestMs - dtMs) / 86_400_000);
  if (diffDays > 1) return `Stale (${diffDays}d behind)`;
  return 'Fresh';
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
      // Fix 3: derive freshness from actual dates so a stale snapshot cannot
      // self-report as "Fresh" if the backend's cached status field is wrong.
      freshness:
        deriveFreshness(snapshot?.dataThroughDate, snapshot?.sourceSummary?.latestCompletedTradingDate)
        ?? snapshot?.sourceSummary?.status
        ?? snapshot?.status
        ?? null,
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
      resultDateLabel: row.resultDateLabel ?? null,
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

export async function fetchInstrumentContextSnapshot(
  scope: MarketScope,
  instrumentId?: string,
): Promise<SnapshotEnvelope<InstrumentContextSnapshot>> {
  if (!instrumentId) {
    return unavailable(scope, 'No instrument selected.');
  }
  try {
    const response = await axios.get<{ status: string; context: InstrumentContextSnapshot; message?: string }>(
      `${API_BASE}/instrument-context/${encodeURIComponent(instrumentId)}`,
    );
    const body = response.data;
    if (body.status === 'not_found' || !body.context) {
      return {
        availability: 'EMPTY',
        scope,
        snapshot: null,
        message: body.message || 'Instrument not found.',
        warnings: [],
      };
    }
    return {
      availability: 'READY',
      scope,
      snapshot: body.context,
      message: 'Instrument context assembled from persisted read models.',
      warnings: [],
      snapshotDate: body.context.assembledAt?.slice(0, 10) ?? null,
      generatedAt: body.context.assembledAt ?? null,
    };
  } catch (caught) {
    return errorEnvelope(scope, 'Failed to load instrument context snapshot.', caught);
  }
}

export async function fetchSectorRotation(
  scope: Pick<MarketScope, 'region' | 'assetType'>,
): Promise<SectorRotationEnvelope> {
  try {
    const response = await axios.get<SectorRotationEnvelope>(
      `${API_BASE}/sector-rotation`,
      { params: { region: scope.region, assetType: scope.assetType } },
    );
    const body = response.data;
    return {
      availability: body.availability ?? 'ERROR',
      scope: body.scope ?? { region: scope.region, assetType: scope.assetType },
      snapshotDate: body.snapshotDate ?? null,
      dataThroughDate: body.dataThroughDate ?? null,
      generatedAt: body.generatedAt ?? new Date().toISOString(),
      sectors: (body.sectors ?? []).map((row) => ({
        ...row,
        return1W: typeof row.return1W === 'number' ? row.return1W : null,
        return1M: typeof row.return1M === 'number' ? row.return1M : null,
        return3M: typeof row.return3M === 'number' ? row.return3M : null,
        reasonTags: Array.isArray(row.reasonTags) ? row.reasonTags : [],
        warnings: Array.isArray(row.warnings) ? row.warnings : [],
      })),
      quadrantCounts: body.quadrantCounts ?? { LEADING: 0, IMPROVING: 0, WEAKENING: 0, LAGGING: 0 },
      message: body.message ?? '',
      warnings: body.warnings ?? [],
    };
  } catch (caught) {
    const msg = errorMessage(caught, 'Failed to load sector rotation data.');
    return {
      availability: 'ERROR',
      scope: { region: scope.region, assetType: scope.assetType },
      snapshotDate: null,
      dataThroughDate: null,
      generatedAt: new Date().toISOString(),
      sectors: [],
      quadrantCounts: { LEADING: 0, IMPROVING: 0, WEAKENING: 0, LAGGING: 0 },
      message: msg,
      warnings: [msg],
    };
  }
}

export async function fetchSectorConstituents(
  sector: string,
  scope: Pick<MarketScope, 'region' | 'assetType'>,
): Promise<SectorConstituentsEnvelope> {
  try {
    const response = await axios.get<SectorConstituentsEnvelope>(
      `${API_BASE}/sector-constituents`,
      { params: { sector, region: scope.region, assetType: scope.assetType } },
    );
    const body = response.data;
    return {
      availability: body.availability ?? 'ERROR',
      sector: body.sector ?? sector,
      region: body.region ?? scope.region,
      assetType: body.assetType ?? scope.assetType,
      constituents: (body.constituents ?? []).map((row: SectorConstituentRow) => ({
        instrumentId: row.instrumentId,
        symbol: row.symbol,
        companyName: row.companyName ?? null,
        marketCap: row.marketCap ?? null,
        latestPrice: row.latestPrice ?? null,
        latestPriceTimestamp: row.latestPriceTimestamp ?? null,
        return1W: typeof row.return1W === 'number' ? row.return1W : null,
        return1M: typeof row.return1M === 'number' ? row.return1M : null,
        signalDirection: row.signalDirection ?? null,
        signalScore: typeof row.signalScore === 'number' ? row.signalScore : null,
        relativeStrength: typeof row.relativeStrength === 'number' ? row.relativeStrength : null,
      })),
      count: body.count ?? 0,
      message: body.message ?? '',
      warnings: body.warnings ?? [],
    };
  } catch (caught) {
    const msg = errorMessage(caught, `Failed to load constituents for sector "${sector}".`);
    return {
      availability: 'ERROR',
      sector,
      region: scope.region,
      assetType: scope.assetType,
      constituents: [],
      count: 0,
      message: msg,
      warnings: [msg],
    };
  }
}

// ---------------------------------------------------------------------------
// Event Feed  (NR-105)
// ---------------------------------------------------------------------------

export type EventTone = 'info' | 'positive' | 'negative' | 'risk';

export type EventType =
  | 'BULK_DEAL'
  | 'BLOCK_DEAL'
  | 'FNO_BAN_ENTRY'
  | 'FNO_BAN_BATCH'
  | 'BREAKOUT_52W_HIGH'
  | 'BREAKOUT_52W_LOW'
  | 'FII_DII_FLOWS';

export interface MarketEvent {
  id: string;
  type: EventType;
  date: string;
  symbols: string[];
  description: string;
  tone: EventTone;
  meta?: Record<string, unknown>;
}

export interface EventFeedEnvelope {
  availability: 'READY' | 'EMPTY' | 'ERROR';
  generatedAt: string;
  asOf: string | null;
  days: number;
  events: MarketEvent[];
  eventCount: number;
  message: string;
  warnings: string[];
}

export async function fetchEventFeed(days: number = 5): Promise<EventFeedEnvelope> {
  const response = await axios.get<EventFeedEnvelope>(`${API_BASE}/event-feed`, {
    params: { days },
  });
  return response.data;
}

// ─── Index Constituents (NR-103) ────────────────────────────────────────────

export async function fetchIndexConstituents(index: string): Promise<IndexConstituentsEnvelope> {
  try {
    const response = await axios.get<IndexConstituentsEnvelope>(
      `${API_BASE}/index-constituents`,
      { params: { index } },
    );
    const body = response.data;
    return {
      availability: body.availability ?? 'ERROR',
      index: body.index ?? index,
      indexLabel: body.indexLabel ?? index,
      membershipSource: body.membershipSource ?? 'CURATED_STATIC',
      membershipAsOf: body.membershipAsOf ?? '',
      constituents: (body.constituents ?? []).map((row) => ({
        instrumentId: row.instrumentId ?? null,
        symbol: row.symbol,
        companyName: row.companyName ?? null,
        sector: row.sector ?? null,
        marketCap: typeof row.marketCap === 'number' ? row.marketCap : null,
        latestPrice: typeof row.latestPrice === 'number' ? row.latestPrice : null,
        latestPriceTimestamp: row.latestPriceTimestamp ?? null,
        change1D: typeof row.change1D === 'number' ? row.change1D : null,
        signalDirection: row.signalDirection ?? null,
        signalScore: typeof row.signalScore === 'number' ? row.signalScore : null,
      })),
      count: body.count ?? 0,
      breadth: body.breadth ?? {
        total: 0,
        bullishCount: 0,
        bearishCount: 0,
        neutralCount: 0,
        noSignalCount: 0,
        headline: '',
      },
      message: body.message ?? '',
      warnings: body.warnings ?? [],
    };
  } catch (caught) {
    const msg = errorMessage(caught, `Failed to load index constituents for ${index}.`);
    return {
      availability: 'ERROR',
      index,
      indexLabel: index,
      membershipSource: 'CURATED_STATIC',
      membershipAsOf: '',
      constituents: [],
      count: 0,
      breadth: { total: 0, bullishCount: 0, bearishCount: 0, neutralCount: 0, noSignalCount: 0, headline: '' },
      message: msg,
      warnings: [msg],
    };
  }
}
