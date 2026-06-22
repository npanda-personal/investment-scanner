import { fetchDefiLlamaFundamentals } from '../../../src/modules/market-data-foundation/ingestion/crypto/market-data-foundation.crypto-feeds-provider';

/**
 * Fixture-based tests for fetchDefiLlamaFundamentals — global fetch is mocked
 * so NO live network calls are made. Covers the protocols + fees + revenue +
 * yields join path, including the cross-API slug assumption (pool.project ===
 * protocol.slug from api.llama.fi/protocols).
 */

const PROTOCOLS = [
  { slug: 'aave-v3', name: 'Aave V3', symbol: 'AAVE', category: 'Lending', chains: ['Ethereum', 'Polygon'], tvl: 10_000_000_000, change_1d: 1.2, change_7d: -0.5 },
  { slug: 'uniswap', name: 'Uniswap', symbol: 'UNI', category: 'Dexes', chains: ['Ethereum'], tvl: 5_000_000_000, change_1d: 0.3, change_7d: 2.1 },
  // Junk protocol sharing AAVE symbol but lower TVL — should lose to aave-v3.
  { slug: 'fake-aave', name: 'Fake Aave', symbol: 'AAVE', category: 'Yield', chains: ['BSC'], tvl: 100, change_1d: 0, change_7d: 0 },
];

const FEES = {
  protocols: [
    { name: 'Aave V3', total24h: 500_000, total7d: 3_500_000, total30d: 15_000_000 },
    { name: 'Uniswap', total24h: 1_200_000, total7d: 8_400_000, total30d: 36_000_000 },
  ],
};

const REVENUE = {
  protocols: [
    { name: 'Aave V3', total24h: 200_000, total7d: 1_400_000, total30d: 6_000_000 },
  ],
};

const YIELDS = {
  data: [
    // aave-v3 pools — highest TVL pool wins as canonical APY.
    { project: 'aave-v3', symbol: 'AAVE', apy: 4.5, tvlUsd: 2_000_000_000 },
    { project: 'aave-v3', symbol: 'USDC', apy: 3.1, tvlUsd: 500_000_000 },
    // uniswap has no staking pool → APY should be null.
    // Dust pool with negligible TVL — should NOT win.
    { project: 'some-dust', symbol: 'DUST', apy: 0.001, tvlUsd: 100 },
  ],
};

function mockFetchRouter() {
  return jest.fn(async (url: string) => {
    const u = String(url);
    let body: unknown = [];
    if (u.includes('/protocols')) body = PROTOCOLS;
    else if (u.includes('dataType=dailyRevenue')) body = REVENUE;
    else if (u.includes('/overview/fees')) body = FEES;
    else if (u.includes('/pools')) body = YIELDS;
    return { ok: true, status: 200, statusText: 'OK', json: async () => body } as unknown as Response;
  });
}

describe('fetchDefiLlamaFundamentals (fixture-based)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = mockFetchRouter() as unknown as typeof fetch;
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns fundamentals for matched DeFi protocols with correct slug join', async () => {
    const { rows, warnings } = await fetchDefiLlamaFundamentals(['AAVEUSDT', 'UNIUSDT']);
    expect(warnings).toHaveLength(0);
    expect(rows).toHaveLength(2);

    const aave = rows.find((r) => r.symbol === 'AAVEUSDT');
    expect(aave).toBeDefined();
    expect(aave!.defillamaSlug).toBe('aave-v3');
    expect(aave!.category).toBe('Lending');
    expect(aave!.chains).toEqual(['Ethereum', 'Polygon']);
    expect(aave!.tvlUsd).toBe(10_000_000_000);
    expect(aave!.tvlChange1dPct).toBe(1.2);
    expect(aave!.fees24hUsd).toBe(500_000);
    expect(aave!.revenue24hUsd).toBe(200_000);
    expect(aave!.coverageStatus).toBe('FULL');
  });

  it('populates stakingApyPct via yields API cross-join (pool.project === protocol.slug)', async () => {
    const { rows } = await fetchDefiLlamaFundamentals(['AAVEUSDT']);
    const aave = rows.find((r) => r.symbol === 'AAVEUSDT');
    // aave-v3 has a pool in YIELDS with project='aave-v3' and APY 4.5
    expect(aave!.stakingApyPct).toBe(4.5);
  });

  it('returns null stakingApyPct when protocol has no matching yields pool', async () => {
    const { rows } = await fetchDefiLlamaFundamentals(['UNIUSDT']);
    const uni = rows.find((r) => r.symbol === 'UNIUSDT');
    expect(uni).toBeDefined();
    expect(uni!.stakingApyPct).toBeNull();
  });

  it('skips NON_DEFI_BASE coins (BTC, ETH) — no row emitted', async () => {
    const { rows } = await fetchDefiLlamaFundamentals(['BTCUSDT', 'ETHUSDT', 'AAVEUSDT']);
    // BTC and ETH are in the NON_DEFI_BASE exclusion set.
    expect(rows.map((r) => r.symbol)).toEqual(['AAVEUSDT']);
  });

  it('returns empty rows with warning when yields endpoint fails', async () => {
    const failFetch = jest.fn(async (url: string) => {
      const u = String(url);
      if (u.includes('/pools')) throw new Error('yields API down');
      let body: unknown = [];
      if (u.includes('/protocols')) body = PROTOCOLS;
      else if (u.includes('dataType=dailyRevenue')) body = REVENUE;
      else if (u.includes('/overview/fees')) body = FEES;
      return { ok: true, status: 200, statusText: 'OK', json: async () => body } as unknown as Response;
    });
    global.fetch = failFetch as unknown as typeof fetch;

    const { rows, warnings } = await fetchDefiLlamaFundamentals(['AAVEUSDT']);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('yields');
    // Other fields still populated despite yields failure.
    const aave = rows.find((r) => r.symbol === 'AAVEUSDT');
    expect(aave).toBeDefined();
    expect(aave!.tvlUsd).toBe(10_000_000_000);
    expect(aave!.stakingApyPct).toBeNull();
  });

  it('picks the highest-TVL protocol match when multiple share a ticker', async () => {
    const { rows } = await fetchDefiLlamaFundamentals(['AAVEUSDT']);
    const aave = rows.find((r) => r.symbol === 'AAVEUSDT');
    // aave-v3 (tvl=10B) beats fake-aave (tvl=100).
    expect(aave!.defillamaSlug).toBe('aave-v3');
    expect(aave!.tvlUsd).toBe(10_000_000_000);
  });

  it('returns empty rows for unknown symbols without warnings', async () => {
    const { rows, warnings } = await fetchDefiLlamaFundamentals(['UNKNOWNUSDT']);
    expect(rows).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });
});
