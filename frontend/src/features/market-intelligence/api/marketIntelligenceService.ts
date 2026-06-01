import type { MarketScope } from '@/contexts/MarketScopeContext';
import type {
  CompounderSnapshot,
  EarningsIntelligenceSnapshot,
  InstrumentContextSnapshot,
  MarketIntelligenceFixtureMap,
  MarketPulseSnapshot,
  RiskRadarSnapshot,
  SnapshotEnvelope,
  StockInterestSnapshot,
  TraderSetupSnapshot,
} from '../types';

function fixtureMap(): MarketIntelligenceFixtureMap {
  if (!import.meta.env.DEV || typeof window === 'undefined') return {};
  return window.__marketIntelligenceReadModelFixtures ?? {};
}

function unavailable<T>(scope: MarketScope, message: string): SnapshotEnvelope<T> {
  return {
    availability: 'BACKEND_UNAVAILABLE',
    scope,
    snapshot: null,
    message,
    warnings: ['Future persisted read API capability is required.'],
  };
}

function rowsEnvelope<T>(scope: MarketScope, rows: T[] | undefined, message: string): SnapshotEnvelope<T[]> {
  if (!rows) return unavailable<T[]>(scope, message);
  return {
    availability: rows.length > 0 ? 'READY' : 'EMPTY',
    scope,
    snapshot: rows,
    message: rows.length > 0 ? 'Persisted snapshot rows loaded.' : 'No persisted rows for this scope/date.',
    warnings: rows.length > 0 ? [] : ['No fake rows are shown.'],
  };
}

function snapshotEnvelope<T>(scope: MarketScope, snapshot: T | undefined, message: string): SnapshotEnvelope<T> {
  if (!snapshot) return unavailable<T>(scope, message);
  return {
    availability: 'READY',
    scope,
    snapshot,
    message: 'Persisted snapshot loaded.',
    warnings: [],
  };
}

export async function fetchMarketPulseSnapshot(scope: MarketScope): Promise<SnapshotEnvelope<MarketPulseSnapshot>> {
  return snapshotEnvelope(scope, fixtureMap().marketPulse, 'Market Pulse backend not available yet.');
}

export async function fetchStockInterestRadarSnapshot(scope: MarketScope): Promise<SnapshotEnvelope<StockInterestSnapshot[]>> {
  return rowsEnvelope(scope, fixtureMap().stockInterest, 'Stock Interest Radar backend not available yet.');
}

export async function fetchEarningsIntelligenceSnapshot(scope: MarketScope): Promise<SnapshotEnvelope<EarningsIntelligenceSnapshot[]>> {
  return rowsEnvelope(scope, fixtureMap().earningsIntelligence, 'Earnings Intelligence backend not available yet.');
}

export async function fetchCompounderRadarSnapshot(scope: MarketScope): Promise<SnapshotEnvelope<CompounderSnapshot[]>> {
  return rowsEnvelope(scope, fixtureMap().compounderRadar, 'Compounder Radar backend not available yet.');
}

export async function fetchTraderSetupRadarSnapshot(scope: MarketScope): Promise<SnapshotEnvelope<TraderSetupSnapshot[]>> {
  return rowsEnvelope(scope, fixtureMap().traderSetupRadar, 'Trader Setup Radar backend not available yet.');
}

export async function fetchRiskRadarSnapshot(scope: MarketScope): Promise<SnapshotEnvelope<RiskRadarSnapshot[]>> {
  return rowsEnvelope(scope, fixtureMap().riskRadar, 'Risk Radar backend not available yet.');
}

export async function fetchInstrumentContextSnapshot(scope: MarketScope): Promise<SnapshotEnvelope<InstrumentContextSnapshot>> {
  return snapshotEnvelope(scope, fixtureMap().instrumentContext, 'Instrument Context backend not available yet.');
}
