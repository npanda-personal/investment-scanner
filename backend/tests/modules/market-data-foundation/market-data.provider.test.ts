/// <reference types="@types/jest" />
import { YahooFinanceIngestionService } from '../../../src/modules/market-data-foundation';

describe('YahooFinanceIngestionService provider', () => {
  it('maps chart quotes into historical OHLCV rows without faking adjusted close', async () => {
    const provider = new YahooFinanceIngestionService(undefined, 0);
    const chart = jest.fn().mockResolvedValue({
      quotes: [
        {
          date: new Date('2026-01-02T00:00:00.000Z'),
          open: 100,
          high: 110,
          low: 95,
          close: 105,
          adjclose: 104,
          volume: 1000,
        },
        {
          date: new Date('2026-01-03T00:00:00.000Z'),
          open: 105,
          high: 112,
          low: 101,
          close: 110,
          volume: 1200,
        },
      ],
    });
    (provider as any).yahooFinance = { chart };

    const rows = await provider.fetchHistorical('AAPL', new Date('2026-01-01'), new Date('2026-01-04'));

    expect(chart).toHaveBeenCalledWith('AAPL', expect.objectContaining({ interval: '1d', return: 'array' }));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ symbol: 'AAPL', open: 100, high: 110, low: 95, close: 105, adjustedClose: 104, volume: 1000 });
    expect(rows[1]).toMatchObject({ close: 110, adjustedClose: null });
  });

  it('skips malformed chart rows safely', async () => {
    const provider = new YahooFinanceIngestionService(undefined, 0);
    (provider as any).yahooFinance = {
      chart: jest.fn().mockResolvedValue({
        quotes: [
          { date: new Date('2026-01-02T00:00:00.000Z'), open: 100, high: 110, low: 95, close: 105, volume: 1000 },
          { date: new Date('invalid'), open: 100, high: 90, low: 95, close: 105, volume: 1000 },
        ],
      }),
    };
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    const rows = await provider.fetchHistorical('AAPL');

    expect(rows).toHaveLength(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Skipped 1 malformed historical price rows for AAPL'));
    warn.mockRestore();
  });

  it('maps chart dividend and split events into corporate actions', async () => {
    const provider = new YahooFinanceIngestionService(undefined, 0);
    const chart = jest.fn().mockResolvedValue({
      quotes: [],
      events: {
        dividends: [{ date: new Date('2026-01-02T00:00:00.000Z'), amount: 0.25 }],
        splits: [{ date: new Date('2026-02-01T00:00:00.000Z'), numerator: 4, denominator: 1, splitRatio: '4:1' }],
      },
    });
    (provider as any).yahooFinance = { chart };

    const actions = await provider.fetchCorporateActions('AAPL');

    expect(chart).toHaveBeenCalledWith('AAPL', expect.objectContaining({ events: 'div|split', return: 'array' }));
    expect(actions).toEqual([
      expect.objectContaining({ type: 'dividend', amount: 0.25, value: 0.25 }),
      expect.objectContaining({ type: 'split', splitRatio: 4, value: '4:1' }),
    ]);
  });

  it('maps Indian equity metadata with deterministic fallbacks', async () => {
    const provider = new YahooFinanceIngestionService(undefined, 0);
    (provider as any).yahooFinance = {
      quoteSummary: jest.fn().mockResolvedValue({
        price: {
          longName: 'Reliance Industries Limited',
          exchangeName: 'NSE',
          quoteType: 'EQUITY',
          marketCap: 123,
        },
        summaryProfile: {},
      }),
    };

    const master = await provider.fetchCompanyMasterData('RELIANCE.NS');

    expect(master).toMatchObject({
      symbol: 'RELIANCE.NS',
      companyName: 'Reliance Industries Limited',
      exchange: 'NSE',
      country: 'India',
      currency: 'INR',
      marketCap: 123,
      assetType: 'STOCK',
    });
  });
});
