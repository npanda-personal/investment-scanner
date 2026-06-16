/// <reference types="@types/jest" />
import { ConvictionRepository } from '../../../src/modules/market-data-foundation/persistence/market-data-foundation.repository.conviction';
import {
  CONVICTION_MIN_SIGNAL_SCORE,
  CONVICTION_MIN_SMART_MONEY_SCORE,
  CONVICTION_RESULT_LIMIT,
} from '../../../src/modules/market-data-foundation/analytics/conviction-score';

// ---------------------------------------------------------------------------
// convictionFunnel() — verifies the repository maps the conditional-aggregation
// count row into the funnel shape, coercing Postgres bigint COUNTs to numbers,
// and that the gating thresholds are embedded as bound parameters in the SQL.
//
// $queryRaw is mocked (no DB) — these assert the query shape and row mapping,
// not the database itself. The funnel-vs-bar consistency is enforced by both
// the list query and this funnel query sharing the same constants + base filters.
// ---------------------------------------------------------------------------

/** Minimal Prisma stub exposing only $queryRaw, capturing the bound parameter values. */
function makePrismaStub(countRow: Record<string, bigint | number | null>) {
  const calls: { values: unknown[] }[] = [];
  const prisma = {
    $queryRaw: jest.fn((sql: { values?: unknown[] }) => {
      calls.push({ values: sql?.values ?? [] });
      return Promise.resolve([countRow]);
    }),
  };
  return { prisma: prisma as any, calls };
}

describe('ConvictionRepository.convictionFunnel', () => {
  it('maps bigint COUNTs to plain numbers in the funnel shape', async () => {
    const { prisma } = makePrismaStub({
      universe: 1128n,
      withRecentSignal: 940n,
      signalQualified: 231n,
      smartMoneyQualified: 5n,
    });
    const repo = new ConvictionRepository(prisma);

    const funnel = await repo.convictionFunnel({ region: 'US' });

    expect(funnel).toEqual({
      universe: 1128,
      withRecentSignal: 940,
      signalQualified: 231,
      smartMoneyQualified: 5,
    });
    // Counts must monotonically narrow through the gates.
    expect(funnel.universe).toBeGreaterThanOrEqual(funnel.withRecentSignal);
    expect(funnel.withRecentSignal).toBeGreaterThanOrEqual(funnel.signalQualified);
    expect(funnel.signalQualified).toBeGreaterThanOrEqual(funnel.smartMoneyQualified);
  });

  it('accepts plain-number counts too (driver/Decimal variance)', async () => {
    const { prisma } = makePrismaStub({
      universe: 50,
      withRecentSignal: 40,
      signalQualified: 12,
      smartMoneyQualified: 0,
    });
    const repo = new ConvictionRepository(prisma);

    const funnel = await repo.convictionFunnel({});
    expect(funnel.universe).toBe(50);
    expect(funnel.smartMoneyQualified).toBe(0);
  });

  it('returns an all-zero funnel when the query yields no row', async () => {
    const prisma = { $queryRaw: jest.fn(() => Promise.resolve([] as unknown[])) } as any;
    const repo = new ConvictionRepository(prisma);

    const funnel = await repo.convictionFunnel({ region: 'US' });
    expect(funnel).toEqual({
      universe: 0,
      withRecentSignal: 0,
      signalQualified: 0,
      smartMoneyQualified: 0,
    });
  });

  it('binds the fixed conviction thresholds as query parameters', async () => {
    const { prisma, calls } = makePrismaStub({
      universe: 1n,
      withRecentSignal: 1n,
      signalQualified: 1n,
      smartMoneyQualified: 1n,
    });
    const repo = new ConvictionRepository(prisma);

    await repo.convictionFunnel({ region: 'US' });

    expect(calls).toHaveLength(1);
    const values = calls[0].values;
    // Region is bound (uppercased) along with the smart-money range literals + thresholds.
    expect(values).toContain('US');
    expect(values).toContain('1M');
    expect(values).toContain('3M');
    expect(values).toContain('6M');
    expect(values).toContain(CONVICTION_MIN_SIGNAL_SCORE);
    expect(values).toContain(CONVICTION_MIN_SMART_MONEY_SCORE);
  });

  it('keeps the funnel thresholds aligned with the fixed conviction constants', () => {
    // Guards against silent drift between the funnel and the rendered list bar.
    expect(CONVICTION_MIN_SIGNAL_SCORE).toBe(70);
    expect(CONVICTION_MIN_SMART_MONEY_SCORE).toBe(70);
    expect(CONVICTION_RESULT_LIMIT).toBe(20);
  });
});
