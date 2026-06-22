import {
  fetchCryptoUniverse,
  fetchCryptoHistory,
} from '../../../src/modules/market-data-foundation/ingestion/crypto/market-data-foundation.crypto-provider';

/**
 * Fixture-based tests — global fetch is mocked so NO live network calls are made.
 * Universe source is CoinPaprika (commercial-OK, keyless); coins are kept only
 * when tradable on Binance, with quote-asset preference USDT→USDC→…
 */

const COINPAPRIKA_TICKERS = [
  { id: 'btc-bitcoin', symbol: 'BTC', name: 'Bitcoin', rank: 1, quotes: { USD: { market_cap: 1_300_000_000_000 } } },
  { id: 'eth-ethereum', symbol: 'ETH', name: 'Ethereum', rank: 2, quotes: { USD: { market_cap: 400_000_000_000 } } },
  // Tether: only pair would be USDTUSDT which is not TRADING → excluded.
  { id: 'usdt-tether', symbol: 'USDT', name: 'Tether', rank: 3, quotes: { USD: { market_cap: 100_000_000_000 } } },
  // USDC-only listing → must be kept as XYZUSDC via quote fallback.
  { id: 'xyz-project', symbol: 'XYZ', name: 'Xyz Project', rank: 50, quotes: { USD: { market_cap: 5_000_000_000 } } },
  // No Binance pair at all → skipped, scanning continues deeper.
  { id: 'obscurecoin', symbol: 'OBSCURE', name: 'Obscure', rank: 250, quotes: { USD: { market_cap: 50_000_000 } } },
];

const BINANCE_EXCHANGE_INFO = {
  symbols: [
    { symbol: 'BTCUSDT', status: 'TRADING', baseAsset: 'BTC', quoteAsset: 'USDT', isSpotTradingAllowed: true },
    // ETH on both USDT and USDC → USDT must win on priority.
    { symbol: 'ETHUSDC', status: 'TRADING', baseAsset: 'ETH', quoteAsset: 'USDC', isSpotTradingAllowed: true },
    { symbol: 'ETHUSDT', status: 'TRADING', baseAsset: 'ETH', quoteAsset: 'USDT', isSpotTradingAllowed: true },
    { symbol: 'XYZUSDC', status: 'TRADING', baseAsset: 'XYZ', quoteAsset: 'USDC', isSpotTradingAllowed: true },
    // Tradable on Binance but absent from CoinPaprika ranking → still included.
    { symbol: 'ABCUSDT', status: 'TRADING', baseAsset: 'ABC', quoteAsset: 'USDT', isSpotTradingAllowed: true },
    { symbol: 'USDTUSDT', status: 'BREAK', baseAsset: 'USDT', quoteAsset: 'USDT', isSpotTradingAllowed: true },
  ],
};

const BINANCE_KLINES = [
  // [openTime, open, high, low, close, volume, closeTime, quoteVolume, ...]
  [1700000000000, '100.0', '110.0', '95.0', '105.0', '1000', 1700086399999, '105000.0', 50, '0', '0'],
  [1700086400000, '105.0', '120.0', '104.0', '118.0', '2000', 1700172799999, '236000.0', 80, '0', '0'],
];

function mockFetchRouter() {
  return jest.fn(async (url: string) => {
    const u = String(url);
    let body: unknown = [];
    if (u.includes('/tickers')) body = COINPAPRIKA_TICKERS;
    else if (u.includes('/exchangeInfo')) body = BINANCE_EXCHANGE_INFO;
    else if (u.includes('/klines')) body = BINANCE_KLINES;
    return { ok: true, status: 200, statusText: 'OK', json: async () => body } as unknown as Response;
  });
}

describe('crypto-provider (fixture-based)', () => {
  const originalFetch = global.fetch;
  beforeEach(() => {
    process.env.MARKET_DATA_CRYPTO_PROVIDER_ENABLED = 'true';
    process.env.CRYPTO_UNIVERSE_SOURCE = 'coinpaprika';
    process.env.CRYPTO_COINPAPRIKA_THROTTLE_MS = '0';
    process.env.CRYPTO_BINANCE_THROTTLE_MS = '0';
    global.fetch = mockFetchRouter() as unknown as typeof fetch;
  });
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('fetchCryptoUniverse', () => {
    it('keeps every Binance-tradable coin; excludes non-Binance and non-TRADING', async () => {
      const { candidates } = await fetchCryptoUniverse({ limit: 500 });
      const symbols = candidates.map((c) => c.symbol);
      expect(symbols).toContain('BTCUSDT');
      expect(symbols).toContain('ETHUSDT');
      expect(symbols).toContain('XYZUSDC'); // USDC fallback
      // tether → USDTUSDT not TRADING; obscure → not on Binance at all. Both excluded.
      expect(symbols).not.toContain('USDTUSDT');
      expect(symbols).not.toContain('OBSCUREUSDT');
      expect(symbols).not.toContain('OBSCUREUSDC');
    });

    it('includes Binance coins missing from CoinPaprika ranking (BINANCE_SPOT, null rank)', async () => {
      const { candidates } = await fetchCryptoUniverse({ limit: 500 });
      const abc = candidates.find((c) => c.symbol === 'ABCUSDT')!;
      expect(abc).toBeTruthy();
      expect(abc.marketCap).toBeNull();
      expect(abc.rank).toBeNull();
      expect(abc.catalogSource).toBe('BINANCE_SPOT');
    });

    it('prefers USDT over USDC when both pairs exist', async () => {
      const { candidates } = await fetchCryptoUniverse({ limit: 500 });
      const eth = candidates.find((c) => c.baseAsset === 'ETH')!;
      expect(eth.symbol).toBe('ETHUSDT');
      expect(eth.quoteAsset).toBe('USDT');
    });

    it('honors the requested limit (top-N tradable by rank)', async () => {
      const { candidates } = await fetchCryptoUniverse({ limit: 2 });
      expect(candidates).toHaveLength(2);
      // Highest market-cap rank first.
      expect(candidates[0].symbol).toBe('BTCUSDT');
      expect(candidates[1].symbol).toBe('ETHUSDT');
    });

    it('carries display/source symbols, rank, market cap and CoinPaprika catalog source', async () => {
      const { candidates } = await fetchCryptoUniverse({ limit: 500 });
      const btc = candidates.find((c) => c.symbol === 'BTCUSDT')!;
      expect(btc.displaySymbol).toBe('BTC');
      expect(btc.sourceSymbol).toBe('btc-bitcoin');
      expect(btc.rank).toBe(1);
      expect(btc.marketCap).toBe(1_300_000_000_000);
      expect(btc.currency).toBe('USD');
      expect(btc.catalogSource).toBe('COINPAPRIKA_CRYPTO_UNIVERSE');
    });
  });

  describe('fetchCryptoHistory', () => {
    it('maps Binance klines to ascending CryptoHistoricalPrice with adjustedClose===close', async () => {
      const bars = await fetchCryptoHistory('BTCUSDT', { limit: 2 });
      expect(bars).toHaveLength(2);
      expect(bars[0].date.getTime()).toBeLessThan(bars[1].date.getTime());
      expect(bars[0].open).toBe(100);
      expect(bars[0].close).toBe(105);
      expect(bars[0].adjustedClose).toBe(105);
      expect(bars[0].volume).toBe(1000);
      expect(bars[0].quoteVolume).toBe(105000);
      expect(bars[0].source).toBe('BINANCE_KLINES');
    });
  });

  describe('disabled provider', () => {
    it('throws when MARKET_DATA_CRYPTO_PROVIDER_ENABLED=false', async () => {
      process.env.MARKET_DATA_CRYPTO_PROVIDER_ENABLED = 'false';
      await expect(fetchCryptoUniverse({ limit: 10 })).rejects.toThrow(/disabled/i);
    });
  });
});
