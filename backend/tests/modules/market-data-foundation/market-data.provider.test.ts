/// <reference types="@types/jest" />
import { AngelOneMarketDataProvider, YahooFinanceIngestionService, readAngelOneProviderConfig } from '../../../src/modules/market-data-foundation';

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

  it('does not classify Indian cash symbols containing FUT as futures', async () => {
    const provider = new YahooFinanceIngestionService(undefined, 0);
    (provider as any).yahooFinance = {
      quoteSummary: jest.fn().mockResolvedValue({
        price: {
          longName: 'BF Utilities Limited',
          exchangeName: 'NSE',
          quoteType: '',
        },
        summaryProfile: {},
      }),
    };

    const master = await provider.fetchCompanyMasterData('BFUTILITIE.NS');

    expect(master).toMatchObject({
      symbol: 'BFUTILITIE.NS',
      exchange: 'NSE',
      country: 'India',
      currency: 'INR',
      assetType: 'STOCK',
    });
  });

  it('classifies Indian stock Yahoo no-candle validation as free fallback required', async () => {
    const provider = new YahooFinanceIngestionService(undefined, 0);
    const chart = jest.fn().mockResolvedValue({ quotes: [] });
    (provider as any).yahooFinance = { chart };

    const result = await provider.validateProviderSymbol('NODATA.NS', {
      region: 'IN',
      assetType: 'STOCK',
      validationWindowStartDate: new Date('2026-03-28T00:00:00.000Z'),
      validationWindowEndDate: new Date('2026-05-12T23:59:59.999Z'),
    });

    expect(chart).toHaveBeenCalledWith('NODATA.NS', expect.objectContaining({
      period1: new Date('2026-03-28T00:00:00.000Z'),
      period2: new Date('2026-05-12T23:59:59.999Z'),
      interval: '1d',
      return: 'array',
    }));
    expect(result).toMatchObject({
      supported: false,
      failed: true,
      classification: 'FREE_FALLBACK_REQUIRED',
      freeFallbackRequired: true,
      candlesFound: 0,
      validationWindowStartDate: '2026-03-28',
      validationWindowEndDate: '2026-05-12',
    });
  });

  it('classifies slow provider validation as retryable timeout', async () => {
    jest.useFakeTimers();
    const provider = new YahooFinanceIngestionService(undefined, 0);
    (provider as any).yahooFinance = {
      chart: jest.fn().mockReturnValue(new Promise(() => undefined)),
    };

    const promise = provider.validateProviderSymbol('SLOW.NS', {
      region: 'IN',
      assetType: 'STOCK',
      timeoutMs: 1000,
    });
    await jest.advanceTimersByTimeAsync(1000);
    const result = await promise;

    expect(result).toMatchObject({
      supported: false,
      failed: true,
      classification: 'RETRYABLE_TIMEOUT',
    });
    jest.useRealTimers();
  });
});

describe('AngelOneMarketDataProvider', () => {
  const config = {
    enabled: true,
    apiKey: 'api-key',
    clientCode: 'client-code',
    pin: '1234',
    totpSecret: 'JBSWY3DPEHPK3PXP',
    baseUrl: 'https://apiconnect.test',
    scripMasterUrl: 'https://scrip-master.test/OpenAPIScripMaster.json',
    clientLocalIp: '127.0.0.1',
    clientPublicIp: '1.2.3.4',
    clientMacAddress: '00:11:22:33:44:55',
    historicalThrottleMs: 0,
    historicalMaxDays: 3,
    failClosed: true,
  };

  const jsonResponse = (payload: unknown) => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: jest.fn().mockResolvedValue(payload),
    text: jest.fn().mockResolvedValue(JSON.stringify(payload)),
  } as any);

  it('defaults historical throttling below Angel One published rate limits', () => {
    const providerConfig = readAngelOneProviderConfig({
      ANGEL_ONE_ENABLE_MARKET_DATA: 'true',
      ANGEL_ONE_API_KEY: 'api-key',
      ANGEL_ONE_CLIENT_CODE: 'client-code',
      ANGEL_ONE_PIN: '1234',
      ANGEL_ONE_TOTP_SECRET: 'JBSWY3DPEHPK3PXP',
    } as NodeJS.ProcessEnv);

    expect(providerConfig.historicalThrottleMs).toBe(750);
  });

  it('fetches Angel One daily candles in bounded date chunks using the scrip master token', async () => {
    const fetchFn = jest.fn()
      .mockResolvedValueOnce(jsonResponse([
        { token: '3045', symbol: 'SBIN-EQ', name: 'SBIN', exch_seg: 'NSE' },
      ]))
      .mockResolvedValueOnce(jsonResponse({
        status: true,
        data: { jwtToken: 'jwt-token', refreshToken: 'refresh-token', feedToken: 'feed-token' },
      }))
      .mockResolvedValueOnce(jsonResponse({
        status: true,
        data: [
          ['2026-05-01T00:00:00+05:30', 800, 820, 790, 810, 1000],
          ['2026-05-02T00:00:00+05:30', 810, 830, 805, 825, 1200],
        ],
      }))
      .mockResolvedValueOnce(jsonResponse({
        status: true,
        data: [
          ['2026-05-04T00:00:00+05:30', 825, 840, 820, 835, 900],
        ],
      }));
    const provider = new AngelOneMarketDataProvider(config, fetchFn);

    const rows = await provider.fetchHistorical(
      'SBIN.NS',
      new Date('2026-05-01T00:00:00.000Z'),
      new Date('2026-05-04T00:00:00.000Z'),
      { region: 'IN', assetType: 'STOCK' }
    );

    expect(rows).toEqual([
      expect.objectContaining({ symbol: 'SBIN.NS', date: new Date('2026-05-01T00:00:00.000Z'), close: 810, source: 'angel_one' }),
      expect.objectContaining({ symbol: 'SBIN.NS', date: new Date('2026-05-02T00:00:00.000Z'), close: 825, source: 'angel_one' }),
      expect.objectContaining({ symbol: 'SBIN.NS', date: new Date('2026-05-04T00:00:00.000Z'), close: 835, source: 'angel_one' }),
    ]);
    const candleBodies = fetchFn.mock.calls
      .filter(([url]) => String(url).includes('/historical/v1/getCandleData'))
      .map(([, init]) => JSON.parse(String(init.body)));
    expect(candleBodies).toEqual([
      expect.objectContaining({ exchange: 'NSE', symboltoken: '3045', interval: 'ONE_DAY', fromdate: '2026-05-01 00:00', todate: '2026-05-03 23:59' }),
      expect.objectContaining({ exchange: 'NSE', symboltoken: '3045', interval: 'ONE_DAY', fromdate: '2026-05-04 00:00', todate: '2026-05-04 23:59' }),
    ]);
  });

  it('deduplicates concurrent Angel One login requests on one provider instance', async () => {
    const fetchFn = jest.fn()
      .mockResolvedValueOnce(jsonResponse([
        { token: '3045', symbol: 'SBIN-EQ', name: 'SBIN', exch_seg: 'NSE' },
        { token: '1333', symbol: 'HDFCBANK-EQ', name: 'HDFCBANK', exch_seg: 'NSE' },
      ]))
      .mockResolvedValueOnce(jsonResponse({
        status: true,
        data: { jwtToken: 'jwt-token', refreshToken: 'refresh-token', feedToken: 'feed-token' },
      }))
      .mockResolvedValue(jsonResponse({
        status: true,
        data: [
          ['2026-05-01T00:00:00+05:30', 800, 820, 790, 810, 1000],
        ],
      }));
    const provider = new AngelOneMarketDataProvider(config, fetchFn);

    await Promise.all([
      provider.fetchHistorical('SBIN.NS', new Date('2026-05-01T00:00:00.000Z'), new Date('2026-05-01T00:00:00.000Z'), { region: 'IN', assetType: 'STOCK' }),
      provider.fetchHistorical('HDFCBANK.NS', new Date('2026-05-01T00:00:00.000Z'), new Date('2026-05-01T00:00:00.000Z'), { region: 'IN', assetType: 'STOCK' }),
    ]);

    const loginCalls = fetchFn.mock.calls.filter(([url]) => String(url).includes('/loginByPassword'));
    const candleCalls = fetchFn.mock.calls.filter(([url]) => String(url).includes('/historical/v1/getCandleData'));
    expect(loginCalls).toHaveLength(1);
    expect(candleCalls).toHaveLength(2);
  });

  it('retries Angel One historical candles after a bounded rate-limit cooldown', async () => {
    (AngelOneMarketDataProvider as any).historicalThrottleChain = Promise.resolve();
    (AngelOneMarketDataProvider as any).lastHistoricalRequestAt = 0;
    jest.useFakeTimers();
    const fetchFn = jest.fn()
      .mockResolvedValueOnce(jsonResponse([
        { token: '3045', symbol: 'SBIN-EQ', name: 'SBIN', exch_seg: 'NSE' },
      ]))
      .mockResolvedValueOnce(jsonResponse({
        status: true,
        data: { jwtToken: 'jwt-token', refreshToken: 'refresh-token', feedToken: 'feed-token' },
      }))
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: jest.fn(),
        text: jest.fn().mockResolvedValue('Access denied because of exceeding access rate'),
      } as any)
      .mockResolvedValueOnce(jsonResponse({
        status: true,
        data: [
          ['2026-05-01T00:00:00+05:30', 800, 820, 790, 810, 1000],
        ],
      }));
    const provider = new AngelOneMarketDataProvider({
      ...config,
      historicalThrottleMs: 0,
    }, fetchFn);

    const promise = provider.fetchHistorical(
      'SBIN.NS',
      new Date('2026-05-01T00:00:00.000Z'),
      new Date('2026-05-01T00:00:00.000Z'),
      { region: 'IN', assetType: 'STOCK' }
    );
    await jest.advanceTimersByTimeAsync(3000);
    const rows = await promise;

    expect(rows).toHaveLength(1);
    const candleCalls = fetchFn.mock.calls.filter(([url]) => String(url).includes('/historical/v1/getCandleData'));
    expect(candleCalls).toHaveLength(2);
    jest.useRealTimers();
    (AngelOneMarketDataProvider as any).historicalThrottleChain = Promise.resolve();
    (AngelOneMarketDataProvider as any).lastHistoricalRequestAt = 0;
  });

  it('skips malformed and null angel one candle rows while keeping valid data', async () => {
    const fetchFn = jest.fn()
      .mockResolvedValueOnce(jsonResponse([
        { token: '3045', symbol: 'SBIN-EQ', name: 'SBIN', exch_seg: 'NSE' },
      ]))
      .mockResolvedValueOnce(jsonResponse({
        status: true,
        data: { jwtToken: 'jwt-token', refreshToken: 'refresh-token', feedToken: 'feed-token' },
      }))
      .mockResolvedValueOnce(jsonResponse({
        status: true,
        data: [
          ['2026-05-01T00:00:00+05:30', 800, 820, 790, 810, 1000],
          ['2026-05-02T00:00:00+05:30', '', 830, 805, 825, 1200],
          [null, 810, 830, 805, 825, 900],
          ['2026-05-03T00:00:00+05:30', 825, 840, 820, 835, null],
        ],
      }));
    const provider = new AngelOneMarketDataProvider(config, fetchFn);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    const rows = await provider.fetchHistorical(
      'SBIN.NS',
      new Date('2026-05-01T00:00:00.000Z'),
      new Date('2026-05-03T00:00:00.000Z'),
      { region: 'IN', assetType: 'STOCK' }
    );

    expect(rows).toHaveLength(2);
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ date: new Date('2026-05-01T00:00:00.000Z'), close: 810, source: 'angel_one', volume: 1000 }),
      expect.objectContaining({ date: new Date('2026-05-03T00:00:00.000Z'), close: 835, source: 'angel_one' }),
    ]));
    const zeroVolumeMissing = rows.find((row) => row.date.toISOString() === new Date('2026-05-03T00:00:00.000Z').toISOString());
    expect(zeroVolumeMissing?.volume).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Skipped 2 malformed Angel One historical price rows for SBIN.NS'));
    warn.mockRestore();
  });

  it('keeps zero-volume candle rows', async () => {
    const fetchFn = jest.fn()
      .mockResolvedValueOnce(jsonResponse([
        { token: '3045', symbol: 'SBIN-EQ', name: 'SBIN', exch_seg: 'NSE' },
      ]))
      .mockResolvedValueOnce(jsonResponse({
        status: true,
        data: { jwtToken: 'jwt-token', refreshToken: 'refresh-token', feedToken: 'feed-token' },
      }))
      .mockResolvedValueOnce(jsonResponse({
        status: true,
        data: [
          ['2026-05-01T00:00:00+05:30', 800, 820, 790, 810, 0],
          ['2026-05-02T00:00:00+05:30', 801, 821, 791, 811, '0'],
        ],
      }));
    const provider = new AngelOneMarketDataProvider(config, fetchFn);

    const rows = await provider.fetchHistorical(
      'SBIN.NS',
      new Date('2026-05-01T00:00:00.000Z'),
      new Date('2026-05-02T00:00:00.000Z'),
      { region: 'IN', assetType: 'STOCK' }
    );

    expect(rows).toHaveLength(2);
    expect(rows).toEqual([
      expect.objectContaining({ date: new Date('2026-05-01T00:00:00.000Z'), close: 810, source: 'angel_one', volume: 0 }),
      expect.objectContaining({ date: new Date('2026-05-02T00:00:00.000Z'), close: 811, source: 'angel_one', volume: 0 }),
    ]);
  });

  it('does not claim unsupported markets or disabled config', () => {
    const enabledProvider = new AngelOneMarketDataProvider(config, jest.fn() as any);
    const disabledProvider = new AngelOneMarketDataProvider({ ...config, enabled: false }, jest.fn() as any);

    expect(enabledProvider.canHandleHistorical('AAPL', { region: 'US', assetType: 'STOCK' })).toBe(false);
    expect(enabledProvider.canHandleHistorical('SBIN', { region: 'IN', assetType: 'STOCK', exchange: 'NSE' })).toBe(true);
    expect(enabledProvider.canHandleHistorical('SBIN-EQ', { region: 'IN', assetType: 'STOCK', exchange: 'NSE' })).toBe(true);
    expect(enabledProvider.canHandleHistorical('SBIN.NS', { region: 'IN', assetType: 'INDEX' })).toBe(false);
    expect(disabledProvider.canHandleHistorical('SBIN.NS', { region: 'IN', assetType: 'STOCK' })).toBe(false);
  });

  it('resolves unsuffixed NSE symbols and Angel trading symbols without Yahoo suffixes', async () => {
    const fetchFn = jest.fn()
      .mockResolvedValueOnce(jsonResponse([
        { token: '3045', symbol: 'SBIN-EQ', name: 'SBIN', exch_seg: 'NSE' },
      ]))
      .mockResolvedValueOnce(jsonResponse({
        status: true,
        data: { jwtToken: 'jwt-token', refreshToken: 'refresh-token', feedToken: 'feed-token' },
      }))
      .mockResolvedValueOnce(jsonResponse({
        status: true,
        data: [
          ['2026-05-01T00:00:00+05:30', 800, 820, 790, 810, 1000],
        ],
      }))
      .mockResolvedValueOnce(jsonResponse({
        status: true,
        data: [
          ['2026-05-02T00:00:00+05:30', 810, 830, 805, 825, 1200],
        ],
      }));
    const provider = new AngelOneMarketDataProvider(config, fetchFn);

    const bareRows = await provider.fetchHistorical(
      'SBIN',
      new Date('2026-05-01T00:00:00.000Z'),
      new Date('2026-05-01T00:00:00.000Z'),
      { region: 'IN', assetType: 'STOCK', exchange: 'NSE' }
    );
    const tradingSymbolRows = await provider.fetchHistorical(
      'SBIN-EQ',
      new Date('2026-05-02T00:00:00.000Z'),
      new Date('2026-05-02T00:00:00.000Z'),
      { region: 'IN', assetType: 'STOCK', exchange: 'NSE' }
    );

    expect(bareRows[0]).toMatchObject({ symbol: 'SBIN', close: 810, source: 'angel_one' });
    expect(tradingSymbolRows[0]).toMatchObject({ symbol: 'SBIN-EQ', close: 825, source: 'angel_one' });
    const candleBodies = fetchFn.mock.calls
      .filter(([url]) => String(url).includes('/historical/v1/getCandleData'))
      .map(([, init]) => JSON.parse(String(init.body)));
    expect(candleBodies).toEqual([
      expect.objectContaining({ exchange: 'NSE', symboltoken: '3045' }),
      expect.objectContaining({ exchange: 'NSE', symboltoken: '3045' }),
    ]);
  });

  it('uses explicit BSE exchange context for unsuffixed symbols', async () => {
    const fetchFn = jest.fn()
      .mockResolvedValueOnce(jsonResponse([
        { token: '500112', symbol: 'SBIN', name: 'SBIN', exch_seg: 'BSE' },
      ]))
      .mockResolvedValueOnce(jsonResponse({
        status: true,
        data: { jwtToken: 'jwt-token', refreshToken: 'refresh-token', feedToken: 'feed-token' },
      }))
      .mockResolvedValueOnce(jsonResponse({
        status: true,
        data: [
          ['2026-05-01T00:00:00+05:30', 800, 820, 790, 810, 1000],
        ],
      }));
    const provider = new AngelOneMarketDataProvider(config, fetchFn);

    await provider.fetchHistorical(
      'SBIN',
      new Date('2026-05-01T00:00:00.000Z'),
      new Date('2026-05-01T00:00:00.000Z'),
      { region: 'IN', assetType: 'STOCK', exchange: 'BSE' }
    );

    const candleBody = JSON.parse(String(fetchFn.mock.calls.find(([url]) => String(url).includes('/historical/v1/getCandleData'))?.[1]?.body));
    expect(candleBody).toMatchObject({ exchange: 'BSE', symboltoken: '500112' });
  });

  it('resolves SME or non-EQ cash equity series when EQ row is not available', async () => {
    const fetchFn = jest.fn()
      .mockResolvedValueOnce(jsonResponse([
        { token: '99001', symbol: 'EQUIPPP-SM', name: 'EQUIPPP', exch_seg: 'NSE', instrumenttype: 'AMXEQ' },
      ]))
      .mockResolvedValueOnce(jsonResponse({
        status: true,
        data: { jwtToken: 'jwt-token', refreshToken: 'refresh-token', feedToken: 'feed-token' },
      }))
      .mockResolvedValueOnce(jsonResponse({
        status: true,
        data: [
          ['2026-05-01T00:00:00+05:30', 100, 110, 95, 105, 500],
        ],
      }));
    const provider = new AngelOneMarketDataProvider(config, fetchFn);

    const rows = await provider.fetchHistorical(
      'EQUIPPP.NS',
      new Date('2026-05-01T00:00:00.000Z'),
      new Date('2026-05-01T00:00:00.000Z'),
      { region: 'IN', assetType: 'STOCK' }
    );

    expect(rows).toHaveLength(1);
    const candleBody = JSON.parse(String(fetchFn.mock.calls.find(([url]) => String(url).includes('/historical/v1/getCandleData'))?.[1]?.body));
    expect(candleBody).toMatchObject({ exchange: 'NSE', symboltoken: '99001' });
  });

  it('excludes derivative rows while resolving equity scrip master token', async () => {
    const fetchFn = jest.fn()
      .mockResolvedValueOnce(jsonResponse([
        { token: '44001', symbol: 'ABC-CE', name: 'ABC', exch_seg: 'NSE', instrumenttype: 'OPTSTK' },
        { token: '44002', symbol: 'ABC-EQ', name: 'ABC', exch_seg: 'NSE', instrumenttype: 'AMXEQ' },
      ]))
      .mockResolvedValueOnce(jsonResponse({
        status: true,
        data: { jwtToken: 'jwt-token', refreshToken: 'refresh-token', feedToken: 'feed-token' },
      }))
      .mockResolvedValueOnce(jsonResponse({
        status: true,
        data: [
          ['2026-05-01T00:00:00+05:30', 200, 210, 190, 205, 700],
        ],
      }));
    const provider = new AngelOneMarketDataProvider(config, fetchFn);

    await provider.fetchHistorical(
      'ABC.NS',
      new Date('2026-05-01T00:00:00.000Z'),
      new Date('2026-05-01T00:00:00.000Z'),
      { region: 'IN', assetType: 'STOCK' }
    );

    const candleBody = JSON.parse(String(fetchFn.mock.calls.find(([url]) => String(url).includes('/historical/v1/getCandleData'))?.[1]?.body));
    expect(candleBody).toMatchObject({ exchange: 'NSE', symboltoken: '44002' });
  });
});
