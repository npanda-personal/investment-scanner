/**
 * Thin re-export bridge for Research Hub drilldown tabs.
 *
 * Pulls from market-intelligence api directly to avoid depending on
 * market-intelligence/index.ts barrel (which only exports types today).
 */
export {
  fetchMarketPulseSnapshot,
  fetchSectorIntelligenceSnapshot,
} from '@/features/market-intelligence/api/marketIntelligenceService';

export type {
  MarketPulseSnapshot,
  SectorIntelligenceSnapshot,
} from '@/features/market-intelligence/types';
