/// <reference types="@types/jest" />

// ---------------------------------------------------------------------------
// getLatestMacroSnapshot() row → MacroSnapshot mapping. prisma is mocked (no DB):
// we feed one macro_snapshots row and assert the proxy fields, status fields,
// and explanation map through; null/empty handling; and the table-missing path.
// ---------------------------------------------------------------------------

const queryRawMock = jest.fn();

jest.mock('../../../src/db/prisma', () => ({
  __esModule: true,
  default: {
    $queryRaw: (...args: unknown[]) => queryRawMock(...args),
    $executeRaw: jest.fn().mockResolvedValue(0),
  },
}));

import { getLatestMacroSnapshot } from '../../../src/modules/market-context-intelligence/market-context-intelligence.macro-read.repository';

describe('getLatestMacroSnapshot', () => {
  beforeEach(() => queryRawMock.mockReset());

  it('maps a persisted row to MacroSnapshot', async () => {
    queryRawMock.mockResolvedValueOnce([
      {
        interest_rate_proxy: 3.6,
        inflation_proxy: 3.1,
        usd_strength_proxy: 121.4,
        commodity_proxy: 78.2,
        macro_status: 'SUPPORTIVE',
        data_status: 'COMPLETE',
        explanation: 'Fed funds 3.60%, CPI 3.1% YoY, yield curve +0.29, WTI $78 — supportive.',
      },
    ]);

    const result = await getLatestMacroSnapshot('GLOBAL');
    expect(result).toEqual({
      interestRateProxy: 3.6,
      inflationProxy: 3.1,
      usdStrengthProxy: 121.4,
      commodityProxy: 78.2,
      macroStatus: 'SUPPORTIVE',
      dataStatus: 'COMPLETE',
      explanation: 'Fed funds 3.60%, CPI 3.1% YoY, yield curve +0.29, WTI $78 — supportive.',
    });
  });

  it('maps null proxy values to null and defaults blank status/explanation', async () => {
    queryRawMock.mockResolvedValueOnce([
      {
        interest_rate_proxy: null,
        inflation_proxy: null,
        usd_strength_proxy: null,
        commodity_proxy: null,
        macro_status: '',
        data_status: '',
        explanation: null,
      },
    ]);

    const result = await getLatestMacroSnapshot();
    expect(result).toMatchObject({
      interestRateProxy: null,
      inflationProxy: null,
      usdStrengthProxy: null,
      commodityProxy: null,
      macroStatus: 'UNKNOWN',
      dataStatus: 'MISSING',
    });
    expect(typeof result?.explanation).toBe('string');
  });

  it('returns null when no rows are persisted', async () => {
    queryRawMock.mockResolvedValueOnce([]);
    expect(await getLatestMacroSnapshot('GLOBAL')).toBeNull();
  });

  it('returns null (not throw) when the table does not exist yet', async () => {
    queryRawMock.mockRejectedValueOnce(new Error('relation "macro_snapshots" does not exist'));
    expect(await getLatestMacroSnapshot('GLOBAL')).toBeNull();
  });
});
