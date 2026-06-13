/// <reference types="@types/jest" />

// Mock the provider registry so the maintainer's fetch can be driven (fail/succeed)
// without hitting Yahoo. `mock`-prefixed name is allowed inside the hoisted factory.
const mockFetch = jest.fn();
jest.mock('../../../src/modules/market-data-foundation/ingestion/market-data-foundation.provider-registry', () => ({
  resolveEodProvider: () => ({ fetchHistoryWithEvents: mockFetch, fetchHistory: mockFetch }),
  isRegionProviderEnabled: () => true,
}));

import { UsEquityIngestionService } from '../../../src/modules/market-data-foundation/ingestion/us/market-data-foundation.us-equity-ingestion.service';
import { CoverageRepository } from '../../../src/modules/market-data-foundation/persistence/market-data-foundation.repository.coverage';

describe('US ingestion robustness', () => {
  describe('applyActiveEnforcement (downstream exclusion)', () => {
    it('deactivates EVERY non-tracked region row (incl NULL assetType) in one transaction', async () => {
      const updateMany = jest.fn().mockReturnValue({ count: 7 });
      const $transaction = jest.fn().mockImplementation((ops: any[]) => Promise.resolve(ops));
      const prisma: any = { stock: { updateMany }, $transaction };

      const res = await new CoverageRepository(prisma).applyActiveEnforcement('US', ['a', 'b']);

      expect(res).toEqual({ activated: 7, deactivated: 7 });
      expect($transaction).toHaveBeenCalledTimes(1); // atomic
      // 1) activate the tracked set
      expect(updateMany).toHaveBeenNthCalledWith(1, {
        where: { id: { in: ['a', 'b'] }, isActive: false },
        data: { isActive: true },
      });
      // 2) deactivate everything else — crucially with NO assetType filter, so rows
      // with a NULL/blank assetType cannot escape exclusion (the M1 bug).
      expect(updateMany).toHaveBeenNthCalledWith(2, {
        where: { region: 'US', isActive: true, id: { notIn: ['a', 'b'] } },
        data: { isActive: false },
      });
      expect(updateMany.mock.calls[1][0].where).not.toHaveProperty('assetType');
    });
  });

  describe('backfillPrices circuit breaker', () => {
    const repoStub = () => ({
      prisma: { stock: { findMany: jest.fn().mockResolvedValue([]) } },
      storeHistoricalBulk: jest.fn(),
      upsertCorporateActions: jest.fn(),
    });

    it('trips on sustained failures and stops launching new fetches', async () => {
      mockFetch.mockReset().mockRejectedValue(new Error('HTTP 429 Too Many Requests'));
      const service = new UsEquityIngestionService(repoStub() as any);
      const symbols = Array.from({ length: 60 }, (_, i) => `S${i}`);

      const summary = await service.backfillPrices({
        symbols, concurrency: 2, maxConsecutiveFailures: 3, withCorporateActions: false, priceFloorYear: 0,
      });

      expect(summary.aborted).toBe(true);
      expect(summary.symbolsFailed).toBeGreaterThanOrEqual(3);
      // Halted early: nowhere near all 60 fetched — the abort predicate stopped the pull loop.
      expect(mockFetch.mock.calls.length).toBeLessThan(30);
    });

    it('does not trip while the provider responds (empty result is a success)', async () => {
      mockFetch.mockReset().mockResolvedValue([]); // fetchHistory returns a bars array
      const service = new UsEquityIngestionService(repoStub() as any);
      const symbols = Array.from({ length: 10 }, (_, i) => `S${i}`);

      const summary = await service.backfillPrices({
        symbols, concurrency: 3, maxConsecutiveFailures: 3, withCorporateActions: false,
      });

      expect(summary.aborted).toBe(false);
      expect(summary.symbolsProcessed).toBe(10);
      expect(summary.symbolsWithNoData).toBe(10);
      expect(mockFetch.mock.calls.length).toBe(10);
    });
  });
});
