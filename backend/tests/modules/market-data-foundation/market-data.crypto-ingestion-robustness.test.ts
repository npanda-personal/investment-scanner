/// <reference types="@types/jest" />

// Mock the crypto provider so fetchCryptoHistory can be driven without hitting Binance.
const mockFetchCrypto = jest.fn();
jest.mock('../../../src/modules/market-data-foundation/ingestion/crypto/market-data-foundation.crypto-provider', () => ({
  fetchCryptoHistory: mockFetchCrypto,
  fetchCryptoUniverse: jest.fn(),
  isCryptoProviderEnabled: () => true,
}));

import { CryptoIngestionService } from '../../../src/modules/market-data-foundation/ingestion/crypto/market-data-foundation.crypto-ingestion.service';

function repoStub() {
  return {
    listAssets: jest.fn().mockResolvedValue([]),
    latestStoredCandleDate: jest.fn().mockResolvedValue(null),
    storeHistoricalPrices: jest.fn().mockImplementation((bars: any[]) => ({
      rowsReceived: bars.length, rowsInserted: bars.length, rowsUpdated: 0, rowsSkipped: 0, warnings: [],
    })),
  };
}

describe('Crypto ingestion robustness', () => {
  it('circuit breaker trips on sustained failures and halts the run', async () => {
    mockFetchCrypto.mockReset().mockRejectedValue(new Error('HTTP 503 Service Unavailable'));
    const repo = repoStub();
    const symbols = Array.from({ length: 50 }, (_, i) => `C${i}USDT`);

    const summary = await new CryptoIngestionService(repo as any).backfillPrices({ symbols, maxConsecutiveFailures: 3 });

    expect(summary.aborted).toBe(true);
    expect(summary.symbolsFailed).toBeGreaterThanOrEqual(3);
    // Halted early — nowhere near all 50 were fetched.
    expect(mockFetchCrypto.mock.calls.length).toBeLessThan(20);
    expect(repo.storeHistoricalPrices).not.toHaveBeenCalled();
  });

  it('drops OHLC-invalid bars at ingest (low>high, non-positive) and stores only valid ones', async () => {
    mockFetchCrypto.mockReset().mockResolvedValue([
      { symbol: 'BTCUSDT', date: new Date('2026-06-12T00:00:00Z'), open: 100, high: 110, low: 95, close: 105, volume: 1 }, // valid
      { symbol: 'BTCUSDT', date: new Date('2026-06-11T00:00:00Z'), open: 100, high: 90, low: 95, close: 105, volume: 1 },  // low>high
      { symbol: 'BTCUSDT', date: new Date('2026-06-10T00:00:00Z'), open: 0, high: 110, low: 95, close: 105, volume: 1 },   // non-positive open
    ]);
    const repo = repoStub();

    const summary = await new CryptoIngestionService(repo as any).backfillPrices({ symbols: ['BTCUSDT'] });

    expect(summary.aborted).toBe(false);
    expect(summary.barsDropped).toBe(2);
    expect(repo.storeHistoricalPrices).toHaveBeenCalledWith(
      [expect.objectContaining({ open: 100, high: 110, low: 95, close: 105 })],
      expect.anything(),
    );
  });
});
