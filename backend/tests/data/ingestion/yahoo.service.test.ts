/// <reference types="@types/jest" />
import { YahooFinanceIngestionService } from '../../../src/data/ingestion/yahoo.service';
import yahooFinance from 'yahoo-finance2';
import { Prisma } from '@prisma/client';

// Mock yahoo-finance2
jest.mock('yahoo-finance2', () => ({
  __esModule: true,
  default: {
    historical: jest.fn<any, any>(),
  },
}));

// Mock PrismaClient
const mockPriceTickCreate = jest.fn<any, any>();
const mockLatestPriceUpsert = jest.fn<any, any>();
const mockTransaction = jest.fn<any, any>((cb: any) => cb({
  priceTick: { create: mockPriceTickCreate },
  latestPrice: { upsert: mockLatestPriceUpsert },
}));
const mockDisconnect = jest.fn<any, any>();

jest.mock('@prisma/client', () => {
  const actual = jest.requireActual('@prisma/client');
  return {
    ...actual,
    PrismaClient: jest.fn<any, any>().mockImplementation(() => ({
      priceTick: { create: mockPriceTickCreate },
      latestPrice: { upsert: mockLatestPriceUpsert },
      $transaction: mockTransaction,
      $disconnect: mockDisconnect,
    })),
  };
});

const mockedYahooFinance = yahooFinance as jest.Mocked<typeof yahooFinance>;

describe('YahooFinanceIngestionService', () => {
  let service: YahooFinanceIngestionService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Create a new instance which will use the mocked PrismaClient
    service = new YahooFinanceIngestionService();
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
      (mockedYahooFinance.historical as any).mockResolvedValue(mockData as any);

      const result = await service.fetchHistorical('AAPL');
      expect(mockedYahooFinance.historical).toHaveBeenCalledWith('AAPL', {
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
      (mockedYahooFinance.historical as any).mockRejectedValue(new Error('API error'));
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
      // Expect two priceTick.create calls
      expect(mockPriceTickCreate).toHaveBeenCalledTimes(2);
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
      const storeSpy = jest.spyOn(service, 'storeHistorical').mockResolvedValue();

      await service.ingestSymbol('AAPL');

      expect(fetchSpy).toHaveBeenCalledWith('AAPL', undefined, undefined);
      expect(storeSpy).toHaveBeenCalledWith(mockPrices);

      fetchSpy.mockRestore();
      storeSpy.mockRestore();
    });
  });
});