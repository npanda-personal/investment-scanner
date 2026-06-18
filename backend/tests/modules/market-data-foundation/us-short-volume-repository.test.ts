/// <reference types="@types/jest" />

// ---------------------------------------------------------------------------
// getShortPressureForSymbol() row-mapping + 5-session-average shape.
//
// prisma is mocked (no DB): we feed up-to-5 descending-date rows and assert the
// getter picks the latest as the headline, averages the non-null pcts, and
// reports sessionsInAvg. ensureShortVolumeTable is a no-op here.
// ---------------------------------------------------------------------------

const queryRawMock = jest.fn();

jest.mock('../../../src/db/prisma', () => ({
  __esModule: true,
  default: {
    $queryRaw: (...args: unknown[]) => queryRawMock(...args),
    $executeRaw: jest.fn().mockResolvedValue(0),
  },
}));

import { getShortPressureForSymbol } from '../../../src/modules/market-data-foundation/ingestion/us/market-data-foundation.us-short-volume.repository';

describe('getShortPressureForSymbol', () => {
  beforeEach(() => queryRawMock.mockReset());

  it('returns latest session + trailing average, skipping null pcts', async () => {
    queryRawMock.mockResolvedValueOnce([
      { symbol: 'AAPL', trading_date: new Date('2026-06-17T00:00:00.000Z'), short_volume_pct: 40, source: 'FINRA_REGSHO' },
      { symbol: 'AAPL', trading_date: new Date('2026-06-16T00:00:00.000Z'), short_volume_pct: 20, source: 'FINRA_REGSHO' },
      { symbol: 'AAPL', trading_date: new Date('2026-06-15T00:00:00.000Z'), short_volume_pct: null, source: 'FINRA_REGSHO' },
    ]);

    const result = await getShortPressureForSymbol('aapl');
    expect(result).toEqual({
      symbol: 'AAPL',
      shortVolumePct: 40,
      tradingDate: '2026-06-17',
      avg5dPct: 30, // (40 + 20) / 2, null skipped
      sessionsInAvg: 2,
      source: 'FINRA_REGSHO',
    });
  });

  it('returns null when no rows persisted for the symbol', async () => {
    queryRawMock.mockResolvedValueOnce([]);
    const result = await getShortPressureForSymbol('NOPE');
    expect(result).toBeNull();
  });
});
