/// <reference types="@types/jest" />
import { YahooFinanceIngestionService } from '../../../src/modules/market-data-foundation';
import { Prisma } from '@prisma/client';

// Mock yahoo-finance2
var mockYahooHistorical = jest.fn<any, any>();
var mockYahooSearch = jest.fn<any, any>();
var mockYahooQuoteSummary = jest.fn<any, any>();
jest.mock('yahoo-finance2', () => ({
  __esModule: true,
  default: jest.fn<any, any>().mockImplementation(() => ({
    historical: mockYahooHistorical,
    search: mockYahooSearch,
    quoteSummary: mockYahooQuoteSummary,
  })),
}));

// Mock PrismaClient
var mockPriceTickUpsert = jest.fn<any, any>();
var mockLatestPriceUpsert = jest.fn<any, any>();
var mockStockFindUnique = jest.fn<any, any>();
var mockStockUpdate = jest.fn<any, any>();
var mockTransaction = jest.fn<any, any>((cb: any) => cb({
  priceTick: { upsert: mockPriceTickUpsert },
  latestPrice: { upsert: mockLatestPriceUpsert },
}));
var mockDisconnect = jest.fn<any, any>();
var mockPrismaClient: any = {
  priceTick: { upsert: mockPriceTickUpsert },
  latestPrice: { upsert: mockLatestPriceUpsert },
  stock: { findUnique: mockStockFindUnique, update: mockStockUpdate },
  $transaction: mockTransaction,
  $disconnect: mockDisconnect,
};

jest.mock('@prisma/client', () => {
  const actual = jest.requireActual('@prisma/client');
  return {
    ...actual,
    PrismaClient: jest.fn<any, any>().mockImplementation(() => mockPrismaClient),
  };
});

describe('YahooFinanceIngestionService', () => {
  let service: YahooFinanceIngestionService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Create a new instance which will use the mocked PrismaClient
    service = new YahooFinanceIngestionService(mockPrismaClient);
  });

  describe('inferRegion', () => {
    it('should infer US region for plain symbol', () => {
      expect(service.inferRegion('AAPL')).toEqual({ region: 'US', exchange: 'NASDAQ' });
    });

    it('should infer EU region for .DE suffix', () => {
      expect(service.inferRegion('VOW.DE')).toEqual({ region: 'EU', exchange: 'XETRA' });
    });

    it('should infer UK region for .L suffix', () => {
      expect(service.inferRegion('VOD.L')).toEqual({ region: 'UK', exchange: 'LSE' });
    });

    it('should infer CA region for .TO suffix', () => {
      expect(service.inferRegion('RY.TO')).toEqual({ region: 'CA', exchange: 'TSX' });
    });

    it('should infer US with exchange suffix for unknown dot suffix', () => {
      expect(service.inferRegion('ABC.XYZ')).toEqual({ region: 'US', exchange: 'XYZ' });
    });
  });

  describe('fetchHistorical', () => {
    it('should fetch historical data and transform correctly', async () => {
      const mockData = [
        {
          date: new Date('2025-01-01'),
          open: 100,
          high: 105,
          low: 99,
          close: 102,
          volume: 1000000,
        },
        {
          date: new Date('2025-01-02'),
          open: 102,
          high: 108,
          low: 101,
          close: 107,
          volume: 1200000,
        },
      ];
      mockYahooHistorical.mockResolvedValue(mockData as any);

      const result = await service.fetchHistorical('AAPL');
      expect(mockYahooHistorical).toHaveBeenCalledWith('AAPL', {
        period1: expect.any(Date),
        period2: expect.any(Date),
        interval: '1d',
      });
      expect(result).toEqual([
        {
          symbol: 'AAPL',
          date: new Date('2025-01-01'),
          open: 100,
          high: 105,
          low: 99,
          close: 102,
          volume: 1000000,
        },
        {
          symbol: 'AAPL',
          date: new Date('2025-01-02'),
          open: 102,
          high: 108,
          low: 101,
          close: 107,
          volume: 1200000,
        },
      ]);
    });

    it('should throw error when Yahoo API fails', async () => {
      mockYahooHistorical.mockRejectedValue(new Error('API error'));
      await expect(service.fetchHistorical('INVALID')).rejects.toThrow('API error');
    });
  });

  describe('storeHistorical', () => {
    it('should store price ticks and update latest price', async () => {
      const prices = [
        {
          symbol: 'AAPL',
          date: new Date('2025-01-01'),
          open: 100,
          high: 105,
          low: 99,
          close: 102,
          volume: 1000000,
        },
        {
          symbol: 'AAPL',
          date: new Date('2025-01-02'),
          open: 102,
          high: 108,
          low: 101,
          close: 107,
          volume: 1200000,
        },
      ];

      await service.storeHistorical(prices);

      // Expect transaction called
      expect(mockTransaction).toHaveBeenCalledTimes(1);
      // Expect two priceTick.upsert calls
      expect(mockPriceTickUpsert).toHaveBeenCalledTimes(2);
      // Expect latestPrice.upsert called with latest price
      expect(mockLatestPriceUpsert).toHaveBeenCalledWith({
        where: { symbol: 'AAPL' },
        update: {
          region: 'US',
          price: expect.any(Prisma.Decimal),
          timestamp: new Date('2025-01-02'),
          updatedAt: expect.any(Date),
        },
        create: {
          symbol: 'AAPL',
          region: 'US',
          price: expect.any(Prisma.Decimal),
          timestamp: new Date('2025-01-02'),
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should do nothing if prices array is empty', async () => {
      await service.storeHistorical([]);
      expect(mockTransaction).not.toHaveBeenCalled();
    });
  });

  describe('ingestSymbol', () => {
    it('should call fetchHistorical and storeHistorical', async () => {
      const mockPrices = [
        {
          symbol: 'AAPL',
          date: new Date('2025-01-01'),
          open: 100,
          high: 105,
          low: 99,
          close: 102,
          volume: 1000000,
        },
      ];
      const fetchSpy = jest.spyOn(service, 'fetchHistorical').mockResolvedValue(mockPrices);
      mockStockFindUnique.mockResolvedValue(null);
      mockStockUpdate.mockResolvedValue({});

      await service.ingestSymbol('AAPL');

      expect(fetchSpy).toHaveBeenCalledWith('AAPL', expect.any(Date), expect.any(Date));
      expect(mockPriceTickUpsert).toHaveBeenCalledTimes(1);
      expect(mockStockUpdate).toHaveBeenCalledWith({
        where: { symbol: 'AAPL' },
        data: { lastSuccessfulDataLoadTimestamp: expect.any(Date) },
      });

      fetchSpy.mockRestore();
    });
  });
});
