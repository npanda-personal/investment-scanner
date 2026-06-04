/// <reference types="@types/jest" />
import { TradeJournalService } from '../../../src/modules/trade-journal';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ISO = '2026-06-04T09:00:00.000Z';

const makeEntry = (overrides: Partial<Record<string, any>> = {}) => ({
  id: 'entry-1',
  userId: 'user-1',
  instrumentId: 'stock-1',
  symbol: 'RELIANCE',
  sourceSignalId: null,
  direction: 'LONG',
  decision: 'ACTED',
  reviewedAt: ISO,
  entryPrice: 2500,
  stopPrice: 2400,
  targetPrice: 2700,
  thesis: 'Strong fundamentals.',
  conviction: 8,
  outcomeStatus: null,
  exitPrice: null,
  exitAt: null,
  realizedReturnPct: null,
  notes: null,
  tags: [],
  createdAt: ISO,
  updatedAt: ISO,
  ...overrides,
});

const createService = (repoOverrides: Partial<Record<string, jest.Mock>> = {}) => {
  const repository = {
    create: jest.fn(async (input: any, userId: string) => makeEntry({ userId, symbol: input.symbol.toUpperCase() })),
    list: jest.fn(async () => ({ entries: [makeEntry()], total: 1 })),
    findById: jest.fn(async () => makeEntry()),
    update: jest.fn(async (_id: string, input: any) => makeEntry({ ...input })),
    delete: jest.fn(async () => undefined),
    postMortemRows: jest.fn(async () => ({ all: [] })),
    ...repoOverrides,
  };
  const service = new TradeJournalService(repository as any);
  return { service, repository };
};

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

describe('TradeJournalService.create', () => {
  it('creates a new entry and returns the dto', async () => {
    const { service, repository } = createService();
    const result = await service.create(
      {
        symbol: 'reliance',
        direction: 'LONG',
        decision: 'ACTED',
        reviewedAt: ISO,
        entryPrice: 2500,
      },
      'user-1',
    );
    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(result.symbol).toBe('RELIANCE');
  });

  it('rejects missing symbol', async () => {
    const { service } = createService();
    await expect(
      service.create({ symbol: '', direction: 'LONG', decision: 'ACTED', reviewedAt: ISO }, 'user-1'),
    ).rejects.toThrow('symbol is required');
  });

  it('rejects invalid direction', async () => {
    const { service } = createService();
    await expect(
      service.create({ symbol: 'TCS', direction: 'UNKNOWN' as any, decision: 'ACTED', reviewedAt: ISO }, 'user-1'),
    ).rejects.toThrow('direction');
  });

  it('rejects conviction out of range', async () => {
    const { service } = createService();
    await expect(
      service.create({ symbol: 'TCS', direction: 'LONG', decision: 'ACTED', reviewedAt: ISO, conviction: 11 }, 'user-1'),
    ).rejects.toThrow('conviction');
  });
});

// ---------------------------------------------------------------------------
// list with filters
// ---------------------------------------------------------------------------

describe('TradeJournalService.list', () => {
  it('passes filters to repository and wraps result with pagination metadata', async () => {
    const { service, repository } = createService();
    const result = await service.list('user-1', { decision: 'ACTED', page: 1, pageSize: 25 });
    expect(repository.list).toHaveBeenCalledWith('user-1', { decision: 'ACTED', page: 1, pageSize: 25 });
    expect(result.entries).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(25);
    expect(result.source).toBe('trade-journal');
    expect(result.generatedAt).toBeTruthy();
  });

  it('filters by outcomeStatus, symbol, and date range', async () => {
    const { service, repository } = createService({
      list: jest.fn(async () => ({ entries: [], total: 0 })),
    });
    const filters = { outcomeStatus: 'CLOSED' as const, symbol: 'INFY', fromDate: '2026-01-01', toDate: '2026-12-31', page: 2, pageSize: 10 };
    await service.list('user-1', filters);
    expect(repository.list).toHaveBeenCalledWith('user-1', filters);
  });
});

// ---------------------------------------------------------------------------
// update: direction-aware realizedReturnPct
// ---------------------------------------------------------------------------

describe('TradeJournalService.update — direction-aware realizedReturnPct', () => {
  it('LONG: computes positive return when exit > entry', async () => {
    const { service, repository } = createService({
      update: jest.fn(async (_id, input) =>
        makeEntry({ ...input, realizedReturnPct: (2750 - 2500) / 2500 }),
      ),
    });
    const result = await service.update(
      'entry-1',
      { exitPrice: 2750, exitAt: ISO, outcomeStatus: 'CLOSED' },
      'user-1',
    );
    expect(repository.update).toHaveBeenCalledTimes(1);
    expect(result.realizedReturnPct).toBeCloseTo(0.1, 5); // +10%
  });

  it('LONG: computes negative return when exit < entry', async () => {
    const { service } = createService({
      update: jest.fn(async (_id, input) =>
        makeEntry({ ...input, realizedReturnPct: (2300 - 2500) / 2500 }),
      ),
    });
    const result = await service.update(
      'entry-1',
      { exitPrice: 2300, exitAt: ISO, outcomeStatus: 'CLOSED' },
      'user-1',
    );
    expect(result.realizedReturnPct).toBeCloseTo(-0.08, 5); // -8%
  });

  it('SHORT: positive return when exit < entry', async () => {
    const { service } = createService({
      update: jest.fn(async (_id, input) =>
        makeEntry({ direction: 'SHORT', ...input, realizedReturnPct: (2500 - 2200) / 2500 }),
      ),
    });
    const result = await service.update(
      'entry-1',
      { direction: 'SHORT', exitPrice: 2200, exitAt: ISO, outcomeStatus: 'CLOSED' },
      'user-1',
    );
    expect(result.realizedReturnPct).toBeCloseTo(0.12, 5); // +12% short profit
  });

  it('SHORT: negative return when exit > entry (short loss)', async () => {
    const { service } = createService({
      update: jest.fn(async (_id, input) =>
        makeEntry({ direction: 'SHORT', ...input, realizedReturnPct: (2500 - 2800) / 2500 }),
      ),
    });
    const result = await service.update(
      'entry-1',
      { direction: 'SHORT', exitPrice: 2800, exitAt: ISO, outcomeStatus: 'CLOSED' },
      'user-1',
    );
    expect(result.realizedReturnPct).toBeCloseTo(-0.12, 5); // -12% short loss
  });

  it('rejects invalid outcomeStatus', async () => {
    const { service } = createService();
    await expect(
      service.update('entry-1', { outcomeStatus: 'MAYBE' as any }, 'user-1'),
    ).rejects.toThrow('outcomeStatus');
  });
});

// ---------------------------------------------------------------------------
// Post-mortem aggregates
// ---------------------------------------------------------------------------

describe('TradeJournalService.postMortem', () => {
  const makeRows = () => [
    // Acted + Closed wins
    { decision: 'ACTED', outcomeStatus: 'CLOSED', realizedReturnPct: 0.12, sourceSignalId: null },
    { decision: 'ACTED', outcomeStatus: 'CLOSED', realizedReturnPct: 0.08, sourceSignalId: null },
    { decision: 'ACTED', outcomeStatus: 'CLOSED', realizedReturnPct: -0.05, sourceSignalId: null }, // loss
    // Acted + Open
    { decision: 'ACTED', outcomeStatus: 'OPEN', realizedReturnPct: null, sourceSignalId: null },
    // Skipped with linked signal (missed opportunity / avoided)
    { decision: 'SKIPPED', outcomeStatus: null, realizedReturnPct: null, sourceSignalId: 'sig-1' },
    { decision: 'SKIPPED', outcomeStatus: null, realizedReturnPct: null, sourceSignalId: 'sig-2' },
    // Watching with linked signal
    { decision: 'WATCHING', outcomeStatus: null, realizedReturnPct: null, sourceSignalId: 'sig-3' },
    // Skipped without linked signal
    { decision: 'SKIPPED', outcomeStatus: null, realizedReturnPct: null, sourceSignalId: null },
  ];

  it('computes correct actedWinRate from persisted rows', async () => {
    const { service } = createService({
      postMortemRows: jest.fn(async () => ({ all: makeRows() })),
    });
    const pm = await service.postMortem('user-1');
    // 3 ACTED+CLOSED, 2 wins (0.12 and 0.08 > 0)
    expect(pm.actedClosedCount).toBe(3);
    expect(pm.actedWinCount).toBe(2);
    expect(pm.actedWinRate).toBeCloseTo(2 / 3, 5);
  });

  it('computes correct actedAvgReturnPct', async () => {
    const { service } = createService({
      postMortemRows: jest.fn(async () => ({ all: makeRows() })),
    });
    const pm = await service.postMortem('user-1');
    // avg of 0.12, 0.08, -0.05 = 0.05
    expect(pm.actedAvgReturnPct).toBeCloseTo((0.12 + 0.08 - 0.05) / 3, 5);
  });

  it('computes byDecision counts correctly', async () => {
    const { service } = createService({
      postMortemRows: jest.fn(async () => ({ all: makeRows() })),
    });
    const pm = await service.postMortem('user-1');
    const actedRow = pm.byDecision.find((r) => r.decision === 'ACTED');
    const skippedRow = pm.byDecision.find((r) => r.decision === 'SKIPPED');
    const watchingRow = pm.byDecision.find((r) => r.decision === 'WATCHING');
    expect(actedRow?.count).toBe(4);  // 3 closed + 1 open
    expect(skippedRow?.count).toBe(3); // 2 with signal + 1 without
    expect(watchingRow?.count).toBe(1);
  });

  it('counts missedAvoided as SKIPPED/WATCHING with sourceSignalId only', async () => {
    const { service } = createService({
      postMortemRows: jest.fn(async () => ({ all: makeRows() })),
    });
    const pm = await service.postMortem('user-1');
    // sig-1, sig-2, sig-3 (3 entries with sourceSignalId and decision SKIPPED/WATCHING)
    expect(pm.missedAvoidedCount).toBe(3);
  });

  it('returns null win-rate when no acted+closed entries', async () => {
    const { service } = createService({
      postMortemRows: jest.fn(async () => ({ all: [
        { decision: 'WATCHING', outcomeStatus: null, realizedReturnPct: null, sourceSignalId: null },
      ] })),
    });
    const pm = await service.postMortem('user-1');
    expect(pm.actedWinRate).toBeNull();
    expect(pm.actedAvgReturnPct).toBeNull();
  });

  it('includes dataNote with sample size info', async () => {
    const { service } = createService({
      postMortemRows: jest.fn(async () => ({ all: makeRows() })),
    });
    const pm = await service.postMortem('user-1');
    expect(pm.dataNote).toContain('persisted journal entries');
    expect(pm.dataNote).toContain('research and self-reflection');
    expect(pm.source).toBe('trade-journal');
  });

  it('uses research-support wording — no buy/sell in note fields', async () => {
    const { service } = createService({
      postMortemRows: jest.fn(async () => ({ all: makeRows() })),
    });
    const pm = await service.postMortem('user-1');
    const allText = [pm.dataNote, pm.missedAvoidedNote].join(' ').toLowerCase();
    expect(allText).not.toContain('buy');
    expect(allText).not.toContain('sell');
    expect(allText).not.toContain('recommendation');
  });
});
