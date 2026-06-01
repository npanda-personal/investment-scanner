/// <reference types="@types/jest" />
import {
  MarketDataFoundationController,
  MarketDataFoundationService,
} from '../../../src/modules/market-data-foundation';

describe('Market Data Foundation external provider quarantine', () => {
  it('blocks provider-backed service helpers by default', async () => {
    const repository = {
      listFxRates: jest.fn().mockResolvedValue([]),
      findFxRate: jest.fn().mockResolvedValue(null),
    };
    const service = new MarketDataFoundationService(repository as any);

    await expect(service.yahooSearch('RELIANCE')).rejects.toMatchObject({
      code: 'EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY',
    });
    await expect(service.searchProvider('RELIANCE')).rejects.toMatchObject({
      code: 'EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY',
    });
    await expect(service.fetchCoreFundamentals('RELIANCE')).rejects.toMatchObject({
      code: 'EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY',
    });
    await expect(service.fetchCorporateActions('RELIANCE')).rejects.toMatchObject({
      code: 'EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY',
    });
    await expect(service.fetchHistorical('RELIANCE')).rejects.toMatchObject({
      code: 'EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY',
    });
    await expect(service.syncFxRates()).rejects.toMatchObject({
      code: 'EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY',
    });

    await expect(service.listFxRates()).resolves.toMatchObject({
      source: 'database',
      data_status: 'MISSING',
      rates: [],
    });
    await expect(service.getFxRate('USD/INR')).resolves.toBeNull();
  });

  it('returns explicit disabled responses for legacy provider controller actions', async () => {
    const service = {
      syncData: jest.fn(),
      syncAllStocks: jest.fn(),
      backfillPrices: jest.fn(),
      startPriceBackfillRun: jest.fn(),
      syncV1: jest.fn(),
      syncFxRates: jest.fn(),
    };
    const controller = new MarketDataFoundationController(service as any);
    const response = () => ({
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any);

    const syncStockRes = response();
    await controller.syncStock({ params: { id: 'stock-1' } } as any, syncStockRes);
    const syncAllRes = response();
    await controller.syncAllStocks({ query: {}, body: {} } as any, syncAllRes);
    const backfillRes = response();
    await controller.backfillPrices({ query: {}, body: {} } as any, backfillRes);
    const runRes = response();
    await controller.startPriceBackfillRun({ query: {}, body: {} } as any, runRes);
    const syncV1Res = response();
    await controller.syncV1({ body: {} } as any, syncV1Res);
    const fxRes = response();
    await controller.syncFxRates({} as any, fxRes);

    for (const res of [syncStockRes, syncAllRes, backfillRes, runRes, syncV1Res, fxRes]) {
      expect(res.status).toHaveBeenCalledWith(410);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 'EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY',
      }));
    }
    expect(service.syncData).not.toHaveBeenCalled();
    expect(service.syncAllStocks).not.toHaveBeenCalled();
    expect(service.backfillPrices).not.toHaveBeenCalled();
    expect(service.startPriceBackfillRun).not.toHaveBeenCalled();
    expect(service.syncV1).not.toHaveBeenCalled();
    expect(service.syncFxRates).not.toHaveBeenCalled();
  });
});
