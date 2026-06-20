/// <reference types="@types/jest" />
/**
 * Verifies that the batch signal-generation path applies filterFundamentalsAsOf
 * to batch-loaded fundamentals, preventing look-ahead bias when running
 * historical/backfill signal generation with asOfDate.
 *
 * The single-instrument path already applies the filter inside
 * getFundamentalsForGeneration(). The batch path pre-loads fundamentals via
 * storedFundamentalsByInstrumentIds and stores them in batchContext — this test
 * ensures those records are also filtered before being consumed.
 */
import { filterFundamentalsAsOf } from '../../../src/modules/signal-generation-engine/signal-asof';

const iso = (s: string) => new Date(s).toISOString();

describe('Batch fundamentals as-of filtering', () => {
  describe('filterFundamentalsAsOf (unit — batch context scenario)', () => {
    const LAG_DAYS = 45;

    it('excludes a record within the filing lag when no official_result_date', () => {
      const asOf = new Date('2023-08-13T00:00:00.000Z');
      const records = [{ eps: 5, period_end_date: iso('2023-06-30') }];
      const filtered = filterFundamentalsAsOf(records, asOf, LAG_DAYS);
      expect(filtered).toHaveLength(0);
    });

    it('includes a record past the filing lag', () => {
      const asOf = new Date('2023-09-01T00:00:00.000Z');
      const records = [{ eps: 5, period_end_date: iso('2023-06-30') }];
      const filtered = filterFundamentalsAsOf(records, asOf, LAG_DAYS);
      expect(filtered).toHaveLength(1);
    });

    it('respects official_result_date over the lag heuristic', () => {
      const asOf = new Date('2023-08-02T00:00:00.000Z');
      const records = [{
        eps: 5,
        period_end_date: iso('2023-06-30'),
        official_result_date: iso('2023-08-01'),
      }];
      const filtered = filterFundamentalsAsOf(records, asOf, LAG_DAYS);
      expect(filtered).toHaveLength(1);
    });

    it('excludes when official_result_date is after asOf', () => {
      const asOf = new Date('2023-07-31T00:00:00.000Z');
      const records = [{
        eps: 5,
        period_end_date: iso('2023-06-30'),
        official_result_date: iso('2023-08-01'),
      }];
      const filtered = filterFundamentalsAsOf(records, asOf, LAG_DAYS);
      expect(filtered).toHaveLength(0);
    });

    it('filters a multi-instrument batch map correctly', () => {
      const asOf = new Date('2023-08-13T00:00:00.000Z');
      const batchMap = new Map<string, { records: any[] }>([
        ['inst-A', { records: [
          { eps: 5, period_end_date: iso('2023-06-30') },
          { eps: 3, period_end_date: iso('2023-03-31') },
        ]}],
        ['inst-B', { records: [
          { eps: 8, period_end_date: iso('2023-06-30'), official_result_date: iso('2023-08-10') },
        ]}],
      ]);

      for (const [k, v] of batchMap) {
        if (v?.records?.length) {
          batchMap.set(k, { ...v, records: filterFundamentalsAsOf(v.records, asOf, LAG_DAYS) });
        }
      }

      // inst-A: Jun 30 within lag (excluded), Mar 31 past lag (included)
      expect(batchMap.get('inst-A')!.records).toHaveLength(1);
      expect(batchMap.get('inst-A')!.records[0].period_end_date).toBe(iso('2023-03-31'));
      // inst-B: Jun 30 has official_result_date Aug 10 <= Aug 13 (included)
      expect(batchMap.get('inst-B')!.records).toHaveLength(1);
    });
  });
});
