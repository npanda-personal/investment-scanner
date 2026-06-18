import { pageCacheKeysForCommand } from '../../../src/modules/pipeline-orchestration/pipeline-page-cache';
import { marketPulseKey, stockInterestKey, sectorRotationKey } from '../../../src/cache/cache-keys';
import { parseStockInterestScope } from '../../../src/modules/market-intelligence';

describe('pageCacheKeysForCommand', () => {
  const scope = { region: 'IN', assetType: 'STOCK', timeframe: '1d' };

  it('maps MARKET_PULSE_REFRESH to the market-pulse key (same builder the FE/warm use)', () => {
    expect(pageCacheKeysForCommand('MARKET_PULSE_REFRESH', scope)).toEqual([marketPulseKey(scope)]);
  });

  it('maps STOCK_INTEREST_REFRESH via parseStockInterestScope so the key matches the controller', () => {
    // lowercase scope must normalize to the same uppercased key the controller produces.
    expect(pageCacheKeysForCommand('STOCK_INTEREST_REFRESH', { region: 'in', assetType: 'stock', timeframe: '1d' })).toEqual([
      stockInterestKey(parseStockInterestScope({ region: 'in', assetType: 'stock' })),
    ]);
  });

  it('maps SECTOR_INTELLIGENCE_REFRESH to the sector-rotation key', () => {
    expect(pageCacheKeysForCommand('SECTOR_INTELLIGENCE_REFRESH', scope)).toEqual([
      sectorRotationKey({ region: 'IN', assetType: 'STOCK' }),
    ]);
  });

  it('returns [] for commands with no cached endpoint', () => {
    expect(pageCacheKeysForCommand('EARNINGS_INTELLIGENCE_REFRESH', scope)).toEqual([]);
    expect(pageCacheKeysForCommand('MARKET_SCAN_REFRESH', scope)).toEqual([]);
    expect(pageCacheKeysForCommand('PIPELINE_RUN_ALL', scope)).toEqual([]);
  });

  it('applies IN / STOCK / 1d defaults for empty scope values', () => {
    expect(pageCacheKeysForCommand('MARKET_PULSE_REFRESH', { region: '', assetType: '', timeframe: '' })).toEqual([
      marketPulseKey({ region: 'IN', assetType: 'STOCK', timeframe: '1d' }),
    ]);
  });
});
