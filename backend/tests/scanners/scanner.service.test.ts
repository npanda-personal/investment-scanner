/// <reference types="@types/jest" />
import { ScannerService } from '../../src/scanners/service';
import { WatchlistService } from '../../src/api/watchlists/service';
import { Prisma } from '@prisma/client';

// Mock PrismaClient
const mockScannerRuleFindMany = jest.fn<any, any>();
const mockScannerRuleFindFirst = jest.fn<any, any>();
const mockScannerRuleCreate = jest.fn<any, any>();
const mockScannerRuleUpdate = jest.fn<any, any>();
const mockScannerRuleDelete = jest.fn<any, any>();
const mockScanLogCreate = jest.fn<any, any>();
const mockPriceTickFindMany = jest.fn<any, any>();
const mockTransaction = jest.fn<any, any>((cb: any) => cb({
  scannerRule: {
    findMany: mockScannerRuleFindMany,
    findFirst: mockScannerRuleFindFirst,
    create: mockScannerRuleCreate,
    update: mockScannerRuleUpdate,
    delete: mockScannerRuleDelete,
  },
  scanLog: {
    create: mockScanLogCreate,
  },
  priceTick: {
    findMany: mockPriceTickFindMany,
  },
}));
const mockDisconnect = jest.fn<any, any>();

jest.mock('@prisma/client', () => {
  const actual = jest.requireActual('@prisma/client');
  return {
    ...actual,
    PrismaClient: jest.fn<any, any>().mockImplementation(() => ({
      scannerRule: {
        findMany: mockScannerRuleFindMany,
        findFirst: mockScannerRuleFindFirst,
        create: mockScannerRuleCreate,
        update: mockScannerRuleUpdate,
        delete: mockScannerRuleDelete,
      },
      scanLog: {
        create: mockScanLogCreate,
      },
      priceTick: {
        findMany: mockPriceTickFindMany,
      },
      $transaction: mockTransaction,
      $disconnect: mockDisconnect,
    })),
  };
});

// Mock WatchlistService
jest.mock('../../src/api/watchlists/service', () => ({
  WatchlistService: jest.fn<any, any>().mockImplementation(() => ({
    addSymbol: jest.fn<any, any>(),
  })),
}));

const mockedWatchlistService = WatchlistService as jest.MockedClass<typeof WatchlistService>;

describe('ScannerService', () => {
  let service: ScannerService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ScannerService();
  });

  describe('list', () => {
    it('should return scanner rules for a user', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          name: 'Test Rule',
          condition: { indicator: 'RSI', operator: '>', value: 70 },
          targetWatchlistId: 'watchlist-1',
          userId: 'user-1',
          targetWatchlist: { id: 'watchlist-1', name: 'Target Watchlist', symbols: [] },
          sourceWatchlist: null,
          ScanLog: [],
        },
      ];
      mockScannerRuleFindMany.mockResolvedValue(mockRules);

      const result = await service.list('user-1');
      expect(mockScannerRuleFindMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: {
          targetWatchlist: { select: { id: true, name: true, symbols: true } },
          sourceWatchlist: { select: { id: true, name: true, symbols: true } },
          ScanLog: { take: 10, orderBy: { triggeredAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockRules);
    });
  });

  describe('create', () => {
    it('should create a scanner rule', async () => {
      const mockRule = {
        id: 'new-rule',
        name: 'New Rule',
        condition: { indicator: 'RSI', operator: '>', value: 70 },
        targetWatchlistId: 'watchlist-1',
        userId: 'user-1',
      };
      mockScannerRuleCreate.mockResolvedValue(mockRule);

      const result = await service.create('user-1', {
        name: 'New Rule',
        condition: { indicator: 'RSI', operator: '>', value: 70 },
        targetWatchlistId: 'watchlist-1',
      });
      expect(mockScannerRuleCreate).toHaveBeenCalledWith({
        data: {
          name: 'New Rule',
          condition: { indicator: 'RSI', operator: '>', value: 70 },
          targetWatchlistId: 'watchlist-1',
          userId: 'user-1',
        },
        include: {
          targetWatchlist: { select: { id: true, name: true, symbols: true } },
          sourceWatchlist: { select: { id: true, name: true, symbols: true } },
          ScanLog: { take: 10, orderBy: { triggeredAt: 'desc' } },
        },
      });
      expect(result).toEqual(mockRule);
    });
  });

  describe('scanActiveRules', () => {
    it('should scan active rules and create logs for matches', async () => {
      // Mock active rules
      const mockRules = [
        {
          id: 'rule-1',
          condition: { indicator: 'price', operator: '>', value: 100 },
          targetWatchlistId: 'watchlist-1',
          sourceWatchlistId: null,
          sourceSymbols: null,
          userId: 'user-1',
        },
      ];
      mockScannerRuleFindMany.mockResolvedValue(mockRules);
      // Mock price ticks
      mockPriceTickFindMany.mockResolvedValue([
        { symbol: 'AAPL', price: new Prisma.Decimal(150), timestamp: new Date() },
        { symbol: 'GOOGL', price: new Prisma.Decimal(90), timestamp: new Date() },
      ]);
      // Mock watchlist service addSymbol
      const mockAddSymbol = jest.fn<any, any>().mockResolvedValue({});
      mockedWatchlistService.mockImplementation(() => ({
        addSymbol: mockAddSymbol,
      } as any));

      await service.scanActiveRules();

      expect(mockScannerRuleFindMany).toHaveBeenCalledWith({
        where: { isActive: true },
      });
      expect(mockPriceTickFindMany).toHaveBeenCalledWith({
        where: { symbol: { in: [] } }, // sourceSymbols empty
        orderBy: { timestamp: 'desc' },
        take: 1,
      });
      // Expect scan log creation for AAPL (price > 100)
      expect(mockScanLogCreate).toHaveBeenCalledTimes(1);
      expect(mockScanLogCreate).toHaveBeenCalledWith({
        data: {
          ruleId: 'rule-1',
          symbol: 'AAPL',
          matchedData: { price: 150 },
          addedToWatchlist: true,
        },
      });
      expect(mockAddSymbol).toHaveBeenCalledWith('watchlist-1', 'AAPL', 'user-1');
    });
  });
});