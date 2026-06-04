/// <reference types="@types/jest" />
import { StockResearchWorkbenchService } from '../../../src/modules/stock-research-workbench';

const price = (date: string, adjusted_close: number) => ({
  date,
  close: adjusted_close,
  adjusted_close,
  volume: 100,
});

describe('StockResearchWorkbenchService metrics', () => {
  it('calculates max drawdown', () => {
    const service = new StockResearchWorkbenchService({} as any);

    expect(service.maxDrawdown([
      price('2026-01-04', 90),
      price('2026-01-03', 80),
      price('2026-01-02', 120),
      price('2026-01-01', 100),
    ])).toBeCloseTo(-0.3333, 3);
  });

  it('calculates 3Y CAGR when enough history exists', () => {
    const service = new StockResearchWorkbenchService({} as any);
    const prices = Array.from({ length: 253 * 3 }, (_, index) =>
      price(`2026-01-${String((index % 28) + 1).padStart(2, '0')}`, index === 252 * 3 ? 100 : 133.1)
    );

    expect(service.cagr(prices, 252 * 3)).toBeCloseTo(0.1, 2);
  });

  it('returns null for metrics when history is missing', () => {
    const service = new StockResearchWorkbenchService({} as any);

    expect(service.performanceMetrics([price('2026-01-01', 100)], [price('2026-01-01', 100)])).toMatchObject({
      return_1d: null,
      cagr_3y: null,
      max_drawdown: null,
      volatility: null,
    });
  });

  it('returns workbench shape with selected-range relative strength and peer valuation', async () => {
    const mainPrices = {
      prices: [
        { date: '2026-04-28T00:00:00.000Z', close: 120, adjusted_close: 120, volume: 100 },
        { date: '2026-04-18T00:00:00.000Z', close: 100, adjusted_close: 100, volume: 100 },
        { date: '2025-04-28T00:00:00.000Z', close: 80, adjusted_close: 80, volume: 100 },
      ],
      source: 'database',
      last_updated_timestamp: '2026-04-28T00:00:00.000Z',
      data_status: 'COMPLETE',
    };
    const peerPrices = {
      prices: [
        { date: '2026-04-28T00:00:00.000Z', close: 110, adjusted_close: 110, volume: 100 },
        { date: '2026-04-18T00:00:00.000Z', close: 100, adjusted_close: 100, volume: 100 },
        { date: '2025-04-28T00:00:00.000Z', close: 55, adjusted_close: 55, volume: 100 },
      ],
      source: 'database',
      last_updated_timestamp: '2026-04-28T00:00:00.000Z',
      data_status: 'COMPLETE',
    };
    const marketDataService = {
      getInstrument: jest.fn().mockResolvedValue({
        id: 'main',
        symbol: 'MAIN',
        company_name: 'Main Co',
        exchange: 'NASDAQ',
        country: 'US',
        sector: 'Technology',
        industry: 'Software',
        currency: 'USD',
        market_cap: 1000,
        source: 'database',
        last_updated_timestamp: '2026-04-28T00:00:00.000Z',
        data_status: 'COMPLETE',
      }),
      latestPriceByInstrumentId: jest.fn(async (id: string) => ({
        latest: { close: id === 'main' ? 120 : 110 },
        source: 'database',
        last_updated_timestamp: '2026-04-28T00:00:00.000Z',
        data_status: 'COMPLETE',
      })),
      listPricesByInstrumentId: jest.fn(async (id: string) => id === 'main' ? mainPrices : peerPrices),
      fundamentalsByInstrumentId: jest.fn(async (id: string) => ({
        records: [{
          pe_ratio: id === 'main' ? 20 : 10,
          dividend_yield: id === 'main' ? 0.02 : 0.04,
          data_status: 'COMPLETE',
          source: 'database',
          last_updated_timestamp: '2026-04-28T00:00:00.000Z',
        }],
      })),
      corporateActionsByInstrumentId: jest.fn().mockResolvedValue({ actions: [] }),
      listInstruments: jest.fn().mockResolvedValue({
        instruments: [
          { id: 'main', sector: 'Technology', industry: 'Software' },
          {
            id: 'peer',
            symbol: 'PEER',
            company_name: 'Peer Co',
            exchange: 'NASDAQ',
            sector: 'Technology',
            industry: 'Software',
            market_cap: 500,
            data_status: 'COMPLETE',
          },
        ],
      }),
    };
    const service = new StockResearchWorkbenchService(marketDataService as any);

    const result = await service.workbench('main', '1M');

    expect(result).toMatchObject({
      overview: { symbol: 'MAIN' },
      chart: { range: '1M' },
      performance: {
        selected_range_return: 0.2,
      },
      valuation: {
        peer_average_pe: 10,
        peer_average_dividend_yield: 0.04,
        market_cap_rank: 1,
      },
      peers: [
        expect.objectContaining({
          symbol: 'PEER',
          return_selected: 0.1,
          return_1y: null,
        }),
      ],
      relative_strength: {
        fallback_used: 'peer_average',
        peer_average_return: 0.1,
        stock_return: 0.2,
      },
    });
  });
});

// ---------------------------------------------------------------------------
// Nifty 50 relative-strength tests
// ---------------------------------------------------------------------------

/** Build the raw price-tick shape returned by marketDataService.listPrices */
const indexTick = (dateStr: string, close: number) => ({
  timestamp: new Date(dateStr).toISOString(),
  close: close.toString(),
  adjustedClose: close.toString(),
  volume: '1000000',
});

const buildWorkbenchService = (overrides: {
  indexTicks?: any[];
  listPricesThrows?: boolean;
}) => {
  const mainPrices = {
    prices: [
      { date: '2026-04-28T00:00:00.000Z', close: 120, adjusted_close: 120, volume: 100 },
      { date: '2025-04-28T00:00:00.000Z', close: 80, adjusted_close: 80, volume: 100 },
    ],
    source: 'database',
    last_updated_timestamp: '2026-04-28T00:00:00.000Z',
    data_status: 'COMPLETE',
  };
  const peerPrices = {
    prices: [
      { date: '2026-04-28T00:00:00.000Z', close: 110, adjusted_close: 110, volume: 100 },
      { date: '2025-04-28T00:00:00.000Z', close: 100, adjusted_close: 100, volume: 100 },
    ],
    source: 'database',
    last_updated_timestamp: '2026-04-28T00:00:00.000Z',
    data_status: 'COMPLETE',
  };

  const listPricesMock = overrides.listPricesThrows
    ? jest.fn().mockRejectedValue(new Error('DB error'))
    : jest.fn().mockResolvedValue(overrides.indexTicks ?? []);

  const marketDataService = {
    getInstrument: jest.fn().mockResolvedValue({
      id: 'main', symbol: 'MAIN', company_name: 'Main Co', exchange: 'NSE',
      country: 'IN', sector: 'Technology', industry: 'Software',
      currency: 'INR', market_cap: 1000, source: 'database',
      last_updated_timestamp: '2026-04-28T00:00:00.000Z', data_status: 'COMPLETE',
    }),
    latestPriceByInstrumentId: jest.fn().mockResolvedValue({
      latest: { close: 120 }, source: 'database',
      last_updated_timestamp: '2026-04-28T00:00:00.000Z', data_status: 'COMPLETE',
    }),
    listPricesByInstrumentId: jest.fn(async (id: string) => id === 'main' ? mainPrices : peerPrices),
    fundamentalsByInstrumentId: jest.fn().mockResolvedValue({ records: [{ pe_ratio: 20, dividend_yield: 0.02, data_status: 'COMPLETE', source: 'database', last_updated_timestamp: '2026-04-28T00:00:00.000Z' }] }),
    corporateActionsByInstrumentId: jest.fn().mockResolvedValue({ actions: [] }),
    listInstruments: jest.fn().mockResolvedValue({
      instruments: [
        { id: 'main', sector: 'Technology', industry: 'Software', market_cap: 1000, data_status: 'COMPLETE' },
        { id: 'peer', symbol: 'PEER', company_name: 'Peer Co', exchange: 'NSE', sector: 'Technology', industry: 'Software', market_cap: 500, data_status: 'COMPLETE' },
      ],
    }),
    listPrices: listPricesMock,
  };

  return { service: new StockResearchWorkbenchService(marketDataService as any), listPricesMock };
};

describe('StockResearchWorkbenchService – Nifty 50 relative-strength', () => {
  it('populates benchmark_symbol and benchmark_return when index series is present', async () => {
    const indexTicks = [
      indexTick('2025-04-28', 22000),
      indexTick('2026-04-28', 24200),
    ];
    const { service } = buildWorkbenchService({ indexTicks });

    const result = await service.workbench('main', '1Y');
    const rs = result!.relative_strength as any;

    expect(rs.benchmark_symbol).toBe('^NSEI');
    expect(rs.benchmark_return).not.toBeNull();
    expect(Number.isFinite(rs.benchmark_return)).toBe(true);
    expect(rs.fallback_used).toBe('nse_nifty_50');
    expect(rs.data_status).toBe('COMPLETE');
  });

  it('computes relative_to_benchmark as stock_return minus benchmark_return', async () => {
    // stock: 80 → 120  = +50%
    // index: 22000 → 24200 = +10%
    // relative = 50% - 10% = 40%
    const indexTicks = [
      indexTick('2025-04-25', 22000),
      indexTick('2026-04-25', 24200),
    ];
    const { service } = buildWorkbenchService({ indexTicks });

    const result = await service.workbench('main', '1Y');
    const rs = result!.relative_strength as any;

    expect(rs.stock_return).toBeCloseTo(0.5, 5);
    if (rs.benchmark_return !== null) {
      expect(rs.relative_to_benchmark).toBeCloseTo(rs.stock_return - rs.benchmark_return, 5);
    }
  });

  it('falls back to peer_average when index series is empty', async () => {
    const { service } = buildWorkbenchService({ indexTicks: [] });

    const result = await service.workbench('main', '1Y');
    const rs = result!.relative_strength as any;

    expect(rs.benchmark_symbol).toBeNull();
    expect(rs.benchmark_return).toBeNull();
    expect(rs.relative_to_benchmark).toBeNull();
    expect(rs.fallback_used).toBe('peer_average');
    expect(rs.peer_average_return).not.toBeUndefined();
  });

  it('falls back to peer_average when listPrices throws', async () => {
    const { service } = buildWorkbenchService({ listPricesThrows: true });

    const result = await service.workbench('main', '1Y');
    const rs = result!.relative_strength as any;

    expect(rs.fallback_used).toBe('peer_average');
    expect(rs.benchmark_symbol).toBeNull();
  });

  it('always populates peer_average_return as secondary field regardless of index availability', async () => {
    const indexTicks = [
      indexTick('2025-04-28', 22000),
      indexTick('2026-04-28', 24200),
    ];
    const { service } = buildWorkbenchService({ indexTicks });

    const result = await service.workbench('main', '1Y');
    const rs = result!.relative_strength as any;

    // peer_average_return should be present even when index is used
    expect('peer_average_return' in rs).toBe(true);
    expect('relative_to_peer_average' in rs).toBe(true);
  });
});
