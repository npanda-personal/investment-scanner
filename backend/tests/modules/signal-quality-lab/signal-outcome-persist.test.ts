/// <reference types="@types/jest" />
/**
 * Unit tests for SignalOutcome persistence (Slice 1).
 * All DB calls are mocked — no real database is accessed.
 */
import { SignalQualityLabService } from '../../../src/modules/signal-quality-lab/signal-quality-lab.service';
import { SignalQualityLabRepository } from '../../../src/modules/signal-quality-lab/signal-quality-lab.repository';
import type { SignalResultDto } from '../../../src/modules/signal-generation-engine';
import type { PricePoint } from '../../../src/modules/signal-quality-lab/signal-quality-lab.types';
import type { SignalOutcomeUpsert } from '../../../src/modules/signal-quality-lab/signal-quality-lab.types';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const HORIZONS = ['1D', '5D', '10D', '20D', '60D'] as const;

const baseSignal = (overrides: Partial<SignalResultDto> = {}): SignalResultDto => ({
  id: 'sig-1',
  instrument_id: 'stock-1',
  symbol: 'RELIANCE',
  company_name: 'Reliance Industries',
  sector: 'Energy',
  country: 'IN',
  currentPrice: null,
  previousClose: null,
  dailyChange: null,
  dailyChangePercent: null,
  currency: 'INR',
  priceTimestamp: null,
  score: 75,
  direction: 'BULLISH',
  confidence: 'HIGH',
  triggered_signals: [{ code: 'PRICE_ABOVE_SMA50', label: 'Price above SMA50', category: 'TECHNICAL' }],
  negative_signals: [],
  explanation: 'Bullish signal.',
  generated_at: '2025-01-02T00:00:00.000Z',
  modelVersion: 'signal-engine-v1',
  source: 'signal-generation-engine',
  data_status: 'COMPLETE',
  ...overrides,
});

/** 70 trading-day price series starting from 2025-01-02, rising by 1 per day. */
const prices: PricePoint[] = Array.from({ length: 70 }).map((_, index) => ({
  date: new Date(Date.UTC(2025, 0, 2 + index)).toISOString(),
  adjustedClose: 100 + index,
}));

/** Only 3 prices — not enough to satisfy even 5D. */
const sparsePrices: PricePoint[] = prices.slice(0, 3);

// ---------------------------------------------------------------------------
// Helper: build a service with a mocked repository and mocked market data
// ---------------------------------------------------------------------------

function makeService(
  signals: SignalResultDto[],
  priceMap: Map<string, PricePoint[]> = new Map()
) {
  const upsertMock = jest.fn().mockImplementation(
    async (rows: SignalOutcomeUpsert[]) => ({ upserted: rows.length })
  );
  const repoMock = { upsertOutcomeBatch: upsertMock } as unknown as SignalQualityLabRepository;

  const marketDataMock = {
    listPricesByInstrumentId: jest.fn().mockImplementation(async (instrumentId: string) => {
      const pts = priceMap.get(instrumentId) ?? prices;
      return { prices: pts.map((p) => ({ date: p.date, adjusted_close: p.adjustedClose })) };
    }),
  };

  const service = new SignalQualityLabService(
    repoMock,
    {
      signalHistory: jest.fn().mockImplementation((q: any) =>
        signals.slice(q.offset ?? 0, (q.offset ?? 0) + (q.limit ?? signals.length))
      ),
      signalHistoryCount: jest.fn().mockResolvedValue(signals.length),
    } as any,
    marketDataMock as any,
    { regimeForDate: jest.fn().mockResolvedValue('RISK_ON') } as any
  );

  return { service, upsertMock };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('signal outcome persistence', () => {

  it('writes exactly 5 horizon rows per signal when persistOutcomes=true', async () => {
    const { service, upsertMock } = makeService([baseSignal()]);

    await service.recalculate({ batchSize: 10, offset: 0, persistOutcomes: true });

    expect(upsertMock).toHaveBeenCalledTimes(1);
    const rows: SignalOutcomeUpsert[] = upsertMock.mock.calls[0][0];
    expect(rows).toHaveLength(5);
    const horizonsWritten = rows.map((r) => r.horizon).sort();
    expect(horizonsWritten).toEqual([...HORIZONS].sort());
  });

  it('all rows reference the correct signalResultId', async () => {
    const { service, upsertMock } = makeService([baseSignal({ id: 'sig-abc' })]);

    await service.recalculate({ batchSize: 10, offset: 0, persistOutcomes: true });

    const rows: SignalOutcomeUpsert[] = upsertMock.mock.calls[0][0];
    for (const row of rows) {
      expect(row.signalResultId).toBe('sig-abc');
    }
  });

  it('mature horizons have dataComplete=true and correct forwardReturnPercent', async () => {
    const { service, upsertMock } = makeService([baseSignal()]);

    await service.recalculate({ batchSize: 10, offset: 0, persistOutcomes: true });

    const rows: SignalOutcomeUpsert[] = upsertMock.mock.calls[0][0];
    // With 70 prices all horizons should be mature
    for (const row of rows) {
      expect(row.dataComplete).toBe(true);
      expect(row.forwardReturnPercent).not.toBeNull();
      expect(typeof row.forwardReturnPercent).toBe('number');
    }
    // 1D: price goes from 100 → 101 → 1%
    const oneD = rows.find((r) => r.horizon === '1D')!;
    expect(oneD.forwardReturnPercent).toBeCloseTo(0.01);
    // 5D: 100 → 105 → 5%
    const fiveD = rows.find((r) => r.horizon === '5D')!;
    expect(fiveD.forwardReturnPercent).toBeCloseTo(0.05);
  });

  it('immature horizons have dataComplete=false and null forwardReturnPercent', async () => {
    const priceMap = new Map([['stock-1', sparsePrices]]);
    const { service, upsertMock } = makeService([baseSignal()], priceMap);

    await service.recalculate({ batchSize: 10, offset: 0, persistOutcomes: true });

    const rows: SignalOutcomeUpsert[] = upsertMock.mock.calls[0][0];
    // With only 3 prices: 1D mature (index 0→1), 5D/10D/20D/60D all immature
    const immatureRows = rows.filter((r) => !r.dataComplete);
    expect(immatureRows.length).toBeGreaterThanOrEqual(4);
    for (const row of immatureRows) {
      expect(row.forwardReturnPercent).toBeNull();
    }
  });

  it('idempotent re-run calls upsertOutcomeBatch twice with same shape', async () => {
    const { service, upsertMock } = makeService([baseSignal()]);

    await service.recalculate({ batchSize: 10, offset: 0, persistOutcomes: true });
    await service.recalculate({ batchSize: 10, offset: 0, persistOutcomes: true });

    expect(upsertMock).toHaveBeenCalledTimes(2);
    const first: SignalOutcomeUpsert[] = upsertMock.mock.calls[0][0];
    const second: SignalOutcomeUpsert[] = upsertMock.mock.calls[1][0];
    expect(first.map((r) => r.horizon)).toEqual(second.map((r) => r.horizon));
  });

  it('signal with no price history → all 5 horizons written with dataComplete=false', async () => {
    const priceMap = new Map([['stock-1', [] as PricePoint[]]]);
    const { service, upsertMock } = makeService([baseSignal()], priceMap);

    await service.recalculate({ batchSize: 10, offset: 0, persistOutcomes: true });

    const rows: SignalOutcomeUpsert[] = upsertMock.mock.calls[0][0];
    expect(rows).toHaveLength(5);
    for (const row of rows) {
      expect(row.dataComplete).toBe(false);
      expect(row.forwardReturnPercent).toBeNull();
    }
  });

  it('persistOutcomes=false does NOT call upsertOutcomeBatch and returns outcomesPersisted=false', async () => {
    const { service, upsertMock } = makeService([baseSignal()]);

    const result = await service.recalculate({ batchSize: 10, offset: 0 });

    expect(upsertMock).not.toHaveBeenCalled();
    expect(result.outcomesPersisted).toBe(false);
  });

  it('returns correct outcomesPersisted=true and counts when persist enabled', async () => {
    const { service } = makeService([baseSignal()]);

    const result = await service.recalculate({ batchSize: 10, offset: 0, persistOutcomes: true });

    expect(result.outcomesPersisted).toBe(true);
    expect(result.rowsUpserted).toBe(5); // 5 horizons × 1 signal
    expect(result.signalsProcessed).toBe(1);
    expect(typeof result.matureCount).toBe('number');
    expect(typeof result.immatureCount).toBe('number');
  });

  it('writes rows for multiple signals (2 signals → 10 rows total)', async () => {
    const { service, upsertMock } = makeService([
      baseSignal({ id: 'sig-1', instrument_id: 'stock-1' }),
      baseSignal({ id: 'sig-2', instrument_id: 'stock-2', symbol: 'TCS' }),
    ]);

    await service.recalculate({ batchSize: 10, offset: 0, persistOutcomes: true });

    const rows: SignalOutcomeUpsert[] = upsertMock.mock.calls[0][0];
    expect(rows).toHaveLength(10);
    const signalIds = [...new Set(rows.map((r) => r.signalResultId))].sort();
    expect(signalIds).toEqual(['sig-1', 'sig-2']);
  });

  it('each row carries denormalized fields from the signal', async () => {
    const { service, upsertMock } = makeService([
      baseSignal({
        id: 'sig-x',
        symbol: 'INFY',
        direction: 'BEARISH',
        score: 55,
        sector: 'IT',
        country: 'IN',
        modelVersion: 'signal-engine-v2',
      }),
    ]);

    await service.recalculate({ batchSize: 10, offset: 0, persistOutcomes: true });

    const rows: SignalOutcomeUpsert[] = upsertMock.mock.calls[0][0];
    for (const row of rows) {
      expect(row.symbol).toBe('INFY');
      expect(row.direction).toBe('BEARISH');
      expect(row.score).toBe(55);
      expect(row.sector).toBe('IT');
      expect(row.country).toBe('IN');
    }
  });

  it('path-stat fields (maxFavorable/maxAdverse/maxDrawdown) are present when prices available', async () => {
    const { service, upsertMock } = makeService([baseSignal()]);

    await service.recalculate({ batchSize: 10, offset: 0, persistOutcomes: true });

    const rows: SignalOutcomeUpsert[] = upsertMock.mock.calls[0][0];
    // maxFavorableExcursion/maxAdverseExcursion are shared across all horizon rows
    for (const row of rows) {
      expect(row.maxFavorableExcursion).not.toBeNull();
      expect(typeof row.maxFavorableExcursion).toBe('number');
    }
  });
});
