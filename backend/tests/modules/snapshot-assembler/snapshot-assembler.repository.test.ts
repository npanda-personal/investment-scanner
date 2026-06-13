/**
 * snapshot-assembler.repository.test.ts
 *
 * Unit tests for the atomic commit path (A2/A3): batch-wide version assignment
 * inside the transaction, watermark upsert, and optimistic-concurrency retry on
 * the (instrumentId, tradingDate, snapshotVersion) unique key.
 *
 * The Prisma client is fully mocked; no DB is touched.
 */

import { Prisma } from '@prisma/client';
import { SnapshotAssemblerRepository } from '../../../src/modules/snapshot-assembler/snapshot-assembler.repository';
import { DEFAULT_SNAPSHOT_ASSEMBLER_CONFIG } from '../../../src/modules/snapshot-assembler/snapshot-assembler.config';
import type { ComposedSnapshotRow } from '../../../src/modules/snapshot-assembler/snapshot-assembler.types';

const TRADING_DATE = new Date('2026-06-10T00:00:00.000Z');
const ASSEMBLED_AT = new Date('2026-06-10T20:00:00.000Z');

function sampleRow(instrumentId = 'i1'): ComposedSnapshotRow {
  return {
    instrumentId,
    tradingDate: TRADING_DATE,
    snapshotVersion: 1,
    region: 'IN',
    assetType: 'STOCK',
    signalEligible: true,
    reviewEligible: true,
    backtestEligible: false,
    calibrationEligible: true,
    reviewReasons: [],
    signalReasons: [],
    readinessScore: 80,
    readinessStatus: 'READY',
    signalScore: 70,
    signalDirection: 'BULLISH',
    signalModelVersion: 'v1',
    calibratedScore: 72,
    calibrationAuthority: 'calib-v1',
    strategyDecision: 'WAIT',
    rulesFired: [],
    stopLoss: 100,
    target: 120,
    rrRatio: 2,
    planStatus: 'READY',
    marketRegime: 'BULL',
    breadthPct: 60,
    sectorRelativeStrength: 1.1,
    oiBuildup: null,
    participantPositioning: null,
    earningsProximityDays: null,
    smartMoneyCode: null,
    smartMoneyScore: null,
    provenance: {
      eligibility: 'OK',
      signals: 'OK',
      calibration: 'OK',
      decision: 'OK',
      tradePlan: 'OK',
      context: 'OK',
      sector: 'OK',
      derivatives: 'N_A',
      earnings: 'N_A',
      smartMoney: 'N_A',
    },
    assembledAt: ASSEMBLED_AT,
  };
}

/** A transaction client mock: max-version query + createMany + watermark upsert. */
function makeTx(maxVersion: number | null, createCount = 1) {
  return {
    $queryRaw: jest.fn().mockResolvedValue([{ max_version: maxVersion }]),
    dailyInstrumentSnapshot: { createMany: jest.fn().mockResolvedValue({ count: createCount }) },
    snapshotWatermark: { upsert: jest.fn().mockResolvedValue(undefined) },
  };
}

function p2002(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

function baseParams(rows: ComposedSnapshotRow[]) {
  return {
    composedRows: rows,
    instrumentIds: rows.map((r) => r.instrumentId),
    region: 'IN',
    assetType: 'STOCK',
    tradingDate: TRADING_DATE,
    assembledAt: ASSEMBLED_AT,
  };
}

describe('SnapshotAssemblerRepository.commitAssembly', () => {
  it('short-circuits on empty input without opening a transaction', async () => {
    const db = { $transaction: jest.fn() };
    const repo = new SnapshotAssemblerRepository(db as any, DEFAULT_SNAPSHOT_ASSEMBLER_CONFIG);

    const res = await repo.commitAssembly(baseParams([]));

    expect(res).toEqual({ rowCount: 0, snapshotVersion: 1 });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('assigns version 1 on first assembly (no prior rows)', async () => {
    const tx = makeTx(null, 1);
    const db = { $transaction: jest.fn(async (fn: any) => fn(tx)) };
    const repo = new SnapshotAssemblerRepository(db as any, DEFAULT_SNAPSHOT_ASSEMBLER_CONFIG);

    const res = await repo.commitAssembly(baseParams([sampleRow()]));

    expect(res.snapshotVersion).toBe(1);
    expect(res.rowCount).toBe(1);
    // version 1 was stamped on the written row
    const writtenData = tx.dailyInstrumentSnapshot.createMany.mock.calls[0][0].data;
    expect(writtenData[0].snapshotVersion).toBe(1);
    expect(tx.snapshotWatermark.upsert).toHaveBeenCalledTimes(1);
  });

  it('assigns max+1 version inside the transaction', async () => {
    const tx = makeTx(4, 1);
    const db = { $transaction: jest.fn(async (fn: any) => fn(tx)) };
    const repo = new SnapshotAssemblerRepository(db as any, DEFAULT_SNAPSHOT_ASSEMBLER_CONFIG);

    const res = await repo.commitAssembly(baseParams([sampleRow()]));

    expect(res.snapshotVersion).toBe(5);
    const writtenData = tx.dailyInstrumentSnapshot.createMany.mock.calls[0][0].data;
    expect(writtenData[0].snapshotVersion).toBe(5);
    // watermark reflects the same version
    expect(tx.snapshotWatermark.upsert.mock.calls[0][0].create.snapshotVersion).toBe(5);
  });

  it('retries on a P2002 unique-violation and then succeeds', async () => {
    const tx = makeTx(0, 1); // succeeds with version 1
    const db = {
      $transaction: jest
        .fn()
        .mockRejectedValueOnce(p2002())
        .mockImplementationOnce(async (fn: any) => fn(tx)),
    };
    const repo = new SnapshotAssemblerRepository(db as any, {
      ...DEFAULT_SNAPSHOT_ASSEMBLER_CONFIG,
      maxCommitRetries: 3,
    });

    const res = await repo.commitAssembly(baseParams([sampleRow()]));

    expect(db.$transaction).toHaveBeenCalledTimes(2);
    expect(res.snapshotVersion).toBe(1);
  });

  it('gives up after exhausting retries on persistent P2002', async () => {
    const err = p2002();
    const db = { $transaction: jest.fn().mockRejectedValue(err) };
    const repo = new SnapshotAssemblerRepository(db as any, {
      ...DEFAULT_SNAPSHOT_ASSEMBLER_CONFIG,
      maxCommitRetries: 2,
    });

    await expect(repo.commitAssembly(baseParams([sampleRow()]))).rejects.toBe(err);
    expect(db.$transaction).toHaveBeenCalledTimes(2);
  });

  it('propagates a non-P2002 error immediately without retrying', async () => {
    const err = new Error('connection reset');
    const db = { $transaction: jest.fn().mockRejectedValue(err) };
    const repo = new SnapshotAssemblerRepository(db as any, {
      ...DEFAULT_SNAPSHOT_ASSEMBLER_CONFIG,
      maxCommitRetries: 3,
    });

    await expect(repo.commitAssembly(baseParams([sampleRow()]))).rejects.toBe(err);
    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });
});
