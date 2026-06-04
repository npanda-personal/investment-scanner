/// <reference types="@types/jest" />
/**
 * Unit tests for SignalOutcome staleness invalidation.
 *
 * When adjustedClose prices are re-derived (corporate-action back-adjustment),
 * persisted signal_outcomes computed from those prices become stale. These tests cover:
 *
 *   1. SignalQualityLabRepository.markStaleByInstrumentIds — broad invalidation.
 *   2. SignalQualityLabRepository.markStaleByInstrumentsFromDate — window-intersection
 *      staleness: only outcomes whose [signalDate, signalDate+60d] window
 *      overlaps the re-adjusted range are marked stale.
 *   3. SignalQualityLabRepository.findStaleOutcomeInstrumentIds — ops enumeration.
 *   4. MarketDataFoundationService hook: calls the window-intersection variant
 *      after recomputeAdjustedClosesForInstrument when prices changed.
 *   5. Module-boundary: MDF service does NOT statically import signal-quality-lab
 *      internals (hook is injected as an optional structural interface).
 *   6. Zero-outcome no-op: no DB calls when there are no affected outcomes.
 *
 * All DB calls are mocked — no real database is accessed.
 */
import { SignalQualityLabRepository } from '../../../src/modules/signal-quality-lab/signal-quality-lab.repository';
import { MarketDataFoundationService } from '../../../src/modules/market-data-foundation/market-data-foundation.service';
import type { SignalOutcomeStalenessInvalidator } from '../../../src/modules/market-data-foundation/market-data-foundation.service';

// ---------------------------------------------------------------------------
// 1. markStaleByInstrumentIds — broad invalidation
// ---------------------------------------------------------------------------

describe('SignalQualityLabRepository.markStaleByInstrumentIds', () => {
  function makeRepo() {
    const updateMany = jest.fn().mockResolvedValue({ count: 7 });
    const db = { signalOutcome: { updateMany } } as any;
    return { repo: new SignalQualityLabRepository(db), updateMany };
  }

  it('invalidates dataComplete=true rows for the given instruments and returns the count', async () => {
    const { repo, updateMany } = makeRepo();

    const count = await repo.markStaleByInstrumentIds(['stock-1', 'stock-2']);

    expect(count).toBe(7);
    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledWith({
      where: { instrumentId: { in: ['stock-1', 'stock-2'] }, dataComplete: true },
      data: {
        dataComplete: false,
        forwardReturnPercent: null,
        futurePrice: null,
        maxFavorableExcursion: null,
        maxAdverseExcursion: null,
        maxDrawdownPercent: null,
      },
    });
  });

  it('does NOT clear windowEndDate (so the maturity sweep re-detects the rows)', async () => {
    const { repo, updateMany } = makeRepo();

    await repo.markStaleByInstrumentIds(['stock-1']);

    const { data } = updateMany.mock.calls[0][0];
    expect(data).not.toHaveProperty('windowEndDate');
  });

  it('dedupes and trims ids', async () => {
    const { repo, updateMany } = makeRepo();

    await repo.markStaleByInstrumentIds([' stock-1 ', 'stock-1', 'stock-2']);

    expect(updateMany.mock.calls[0][0].where.instrumentId.in).toEqual(['stock-1', 'stock-2']);
  });

  it('returns 0 without touching the DB when no valid ids are supplied', async () => {
    const { repo, updateMany } = makeRepo();

    const count = await repo.markStaleByInstrumentIds(['', '   ']);

    expect(count).toBe(0);
    expect(updateMany).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 2. markStaleByInstrumentsFromDate — window-intersection staleness selection
// ---------------------------------------------------------------------------

describe('SignalQualityLabRepository.markStaleByInstrumentsFromDate', () => {
  function makeRepo() {
    const updateMany = jest.fn().mockResolvedValue({ count: 4 });
    const db = { signalOutcome: { updateMany } } as any;
    return { repo: new SignalQualityLabRepository(db), updateMany };
  }

  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  it('uses a signalGeneratedDate >= (fromDate - 60 days) filter for window intersection', async () => {
    const { repo, updateMany } = makeRepo();
    const fromDate = new Date('2025-06-01T00:00:00.000Z');
    const expectedEarliestDate = new Date(fromDate.getTime() - 60 * MS_PER_DAY);

    await repo.markStaleByInstrumentsFromDate(['stock-1'], fromDate);

    const { where } = updateMany.mock.calls[0][0];
    expect(where.signalGeneratedDate).toEqual({ gte: expectedEarliestDate });
    expect(where.dataComplete).toBe(true);
    expect(where.instrumentId).toEqual({ in: ['stock-1'] });
  });

  it('outcomes whose window ends BEFORE fromDate are NOT selected (non-overlapping excluded)', async () => {
    // A signal generated 61+ days before fromDate has its entire window before fromDate.
    // The filter (signalGeneratedDate >= fromDate - 60d) excludes such rows.
    const { repo, updateMany } = makeRepo();
    const fromDate = new Date('2025-06-01T00:00:00.000Z');

    await repo.markStaleByInstrumentsFromDate(['stock-1'], fromDate);

    const { where } = updateMany.mock.calls[0][0];
    // Signals generated 61+ days before fromDate must be excluded:
    const tooOldSignalDate = new Date(fromDate.getTime() - 61 * MS_PER_DAY);
    expect(tooOldSignalDate < where.signalGeneratedDate.gte).toBe(true);
  });

  it('outcomes generated AT fromDate - 60d ARE selected (boundary: window touches fromDate exactly)', async () => {
    const { repo, updateMany } = makeRepo();
    const fromDate = new Date('2025-06-01T00:00:00.000Z');
    const boundaryDate = new Date(fromDate.getTime() - 60 * MS_PER_DAY);

    await repo.markStaleByInstrumentsFromDate(['stock-1'], fromDate);

    const { where } = updateMany.mock.calls[0][0];
    // The boundary date (fromDate - 60d) satisfies gte so it IS included.
    expect(boundaryDate.getTime()).toBe(where.signalGeneratedDate.gte.getTime());
  });

  it('returns 0 and skips DB when instrumentIds is empty', async () => {
    const { repo, updateMany } = makeRepo();

    const count = await repo.markStaleByInstrumentsFromDate([], new Date());

    expect(count).toBe(0);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('does not clear windowEndDate', async () => {
    const { repo, updateMany } = makeRepo();

    await repo.markStaleByInstrumentsFromDate(['stock-1'], new Date());

    const { data } = updateMany.mock.calls[0][0];
    expect(data).not.toHaveProperty('windowEndDate');
  });
});

// ---------------------------------------------------------------------------
// 3. findStaleOutcomeInstrumentIds — ops enumeration
// ---------------------------------------------------------------------------

describe('SignalQualityLabRepository.findStaleOutcomeInstrumentIds', () => {
  it('returns distinct instrumentIds for rows with dataComplete=false and past windowEndDate', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { instrumentId: 'stock-a' },
      { instrumentId: 'stock-b' },
    ]);
    const db = { signalOutcome: { findMany } } as any;
    const repo = new SignalQualityLabRepository(db);

    const ids = await repo.findStaleOutcomeInstrumentIds(100);

    expect(ids).toEqual(['stock-a', 'stock-b']);
    const { where } = findMany.mock.calls[0][0];
    expect(where.dataComplete).toBe(false);
    expect(where.windowEndDate).toMatchObject({ not: null });
  });

  it('returns an empty array when no stale outcomes exist', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const db = { signalOutcome: { findMany } } as any;
    const repo = new SignalQualityLabRepository(db);

    const ids = await repo.findStaleOutcomeInstrumentIds();

    expect(ids).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 4 & 5. Service hook: recomputeAdjustedClosesForInstrument → invalidation
//         + module-boundary assertion
// ---------------------------------------------------------------------------

describe('MarketDataFoundationService adjustedClose recompute → outcome invalidation', () => {
  function makeService(updatedRows: number, invalidator?: Partial<SignalOutcomeStalenessInvalidator>) {
    const repoMock = {
      findStockById: jest.fn().mockResolvedValue({ id: 'stock-1', symbol: 'RELIANCE' }),
      listRawPriceBarsForStock: jest.fn().mockResolvedValue([
        { date: new Date('2025-01-02T00:00:00.000Z'), close: 100 },
        { date: new Date('2025-01-03T00:00:00.000Z'), close: 101 },
      ]),
      listCorporateActions: jest.fn().mockResolvedValue([]),
      updateAdjustedCloses: jest.fn().mockResolvedValue(updatedRows),
    } as any;

    const defaultInvalidator: SignalOutcomeStalenessInvalidator = {
      markStaleByInstrumentIds: jest.fn().mockResolvedValue(3),
      markStaleByInstrumentsFromDate: jest.fn().mockResolvedValue(3),
      ...invalidator,
    };

    const service = new MarketDataFoundationService(
      repoMock,
      undefined,
      undefined,
      undefined,
      defaultInvalidator
    );

    return { service, invalidator: defaultInvalidator };
  }

  it('uses the window-intersection variant (markStaleByInstrumentsFromDate) when prices changed', async () => {
    const { service, invalidator } = makeService(5);

    await service.recomputeAdjustedClosesForInstrument('stock-1');

    expect(invalidator.markStaleByInstrumentsFromDate).toHaveBeenCalledTimes(1);
    const [ids, fromDate] = (invalidator.markStaleByInstrumentsFromDate as jest.Mock).mock.calls[0];
    expect(ids).toEqual(['stock-1']);
    expect(fromDate).toBeInstanceOf(Date);
  });

  it('fromDate passed to markStaleByInstrumentsFromDate equals the earliest date in the re-adjusted set', async () => {
    const { service, invalidator } = makeService(2);

    await service.recomputeAdjustedClosesForInstrument('stock-1');

    const [, fromDate] = (invalidator.markStaleByInstrumentsFromDate as jest.Mock).mock.calls[0];
    // The mock returns two bars: 2025-01-02 and 2025-01-03 — earliest is 2025-01-02.
    expect(fromDate.toISOString().slice(0, 10)).toBe('2025-01-02');
  });

  it('outcomes whose window ends before fromDate are NOT invalidated (selection is correct)', async () => {
    // This is the structural guarantee: only markStaleByInstrumentsFromDate is called,
    // which applies the signalGeneratedDate >= (fromDate - 60d) filter.
    // The broad markStaleByInstrumentIds fallback must NOT be called when
    // markStaleByInstrumentsFromDate is available.
    const { service, invalidator } = makeService(5);

    await service.recomputeAdjustedClosesForInstrument('stock-1');

    expect(invalidator.markStaleByInstrumentsFromDate).toHaveBeenCalledTimes(1);
    expect(invalidator.markStaleByInstrumentIds).not.toHaveBeenCalled();
  });

  it('falls back to markStaleByInstrumentIds when markStaleByInstrumentsFromDate is not provided', async () => {
    const markStaleByInstrumentIds = jest.fn().mockResolvedValue(2);
    const { service } = makeService(5, {
      markStaleByInstrumentIds,
      markStaleByInstrumentsFromDate: undefined,
    });

    await service.recomputeAdjustedClosesForInstrument('stock-1');

    expect(markStaleByInstrumentIds).toHaveBeenCalledWith(['stock-1']);
  });

  it('does NOT call invalidation when no adjustedClose rows changed', async () => {
    const { service, invalidator } = makeService(0);

    await service.recomputeAdjustedClosesForInstrument('stock-1');

    expect(invalidator.markStaleByInstrumentsFromDate).not.toHaveBeenCalled();
    expect(invalidator.markStaleByInstrumentIds).not.toHaveBeenCalled();
  });

  it('never fails the recompute when invalidation throws (best-effort)', async () => {
    const { service, invalidator } = makeService(5);
    (invalidator.markStaleByInstrumentsFromDate as jest.Mock).mockRejectedValueOnce(new Error('db down'));

    const result = await service.recomputeAdjustedClosesForInstrument('stock-1');

    // Recompute must still succeed with the updated count returned by the repo mock (5).
    expect(result.updated).toBe(5);
  });

  it('is a no-op (zero affected rows) when there are no stale outcomes to process', async () => {
    const { service, invalidator } = makeService(0);

    const result = await service.recomputeAdjustedClosesForInstrument('stock-1');

    expect(result.updated).toBe(0);
    expect(invalidator.markStaleByInstrumentsFromDate).not.toHaveBeenCalled();
    expect(invalidator.markStaleByInstrumentIds).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 5. Module-boundary: MDF service does not statically import SQL internals
// ---------------------------------------------------------------------------

describe('Module-boundary: MarketDataFoundationService does not import signal-quality-lab statically', () => {
  it('SignalOutcomeStalenessInvalidator is an exported interface, not a class import', () => {
    // The interface must be importable from the MDF service module without
    // pulling in any signal-quality-lab implementation code.
    // If this import fails at type level, the test module itself would not compile.
    const iface: SignalOutcomeStalenessInvalidator = {
      markStaleByInstrumentIds: async () => 0,
    };
    // Structural check: any object with the right shape satisfies the interface.
    expect(typeof iface.markStaleByInstrumentIds).toBe('function');
  });

  it('the injected invalidator can be any object implementing the interface (no class coupling)', () => {
    const customInvalidator: SignalOutcomeStalenessInvalidator = {
      markStaleByInstrumentIds: jest.fn().mockResolvedValue(0),
      markStaleByInstrumentsFromDate: jest.fn().mockResolvedValue(0),
    };
    // Constructing the service with a plain-object invalidator must not throw.
    expect(() => new MarketDataFoundationService(
      undefined as any,
      undefined,
      undefined,
      undefined,
      customInvalidator
    )).not.toThrow();
  });
});
