/**
 * pipeline-page-cache.ts
 *
 * Maps a MANUAL snapshot-producing pipeline command to the page-cache keys it makes stale.
 *
 * The full daily pipeline ends with the CACHE_WARM stage, so PIPELINE_RUN_ALL keeps the cache
 * fresh on its own. But individual manual commands (e.g. MARKET_PULSE_REFRESH) re-materialize a
 * single snapshot WITHOUT touching the cache — leaving the FE to serve a stale page until the
 * next full run or the 36h safety TTL. After such a command succeeds, the orchestration service
 * DELs the keys returned here so the next request repopulates them via read-through.
 *
 * Key derivation MUST mirror exactly what the controllers + CACHE_WARM stage build (cache-keys.ts
 * is the shared contract), or the deleted key won't be the one the FE looks up. Only the three
 * enabled manual commands that feed a cached endpoint are mapped; everything else returns [].
 *
 * (conviction / today-review / market-context-summary have no ENABLED manual command — they only
 * refresh via PIPELINE_RUN_ALL, which warms — so they need no manual invalidation.)
 */

import { marketPulseKey, stockInterestKey, sectorRotationKey } from '../../cache/cache-keys';
import { parseStockInterestScope } from '../market-intelligence';

export interface CommandCacheScope {
  region: string;
  assetType: string;
  timeframe: string;
}

export function pageCacheKeysForCommand(commandKey: string, scope: CommandCacheScope): string[] {
  switch (commandKey) {
    case 'MARKET_PULSE_REFRESH':
      return [
        marketPulseKey({
          region: scope.region || 'IN',
          assetType: scope.assetType || 'STOCK',
          timeframe: scope.timeframe || '1d',
        }),
      ];
    case 'STOCK_INTEREST_REFRESH':
      // parseStockInterestScope applies the same normalization (uppercase + IN/STOCK defaults)
      // the controller uses, so the key matches the one the FE reads.
      return [stockInterestKey(parseStockInterestScope({ region: scope.region, assetType: scope.assetType }))];
    case 'SECTOR_INTELLIGENCE_REFRESH':
      return [
        sectorRotationKey({
          region: scope.region || 'IN',
          assetType: scope.assetType || 'STOCK',
        }),
      ];
    default:
      return [];
  }
}
