/**
 * ai-investment-copilot.repository.ts
 *
 * Thin data-access layer for the copilot's snapshot-first reads.
 * Only used by stockSummary() to short-circuit live fan-out with a single
 * daily_instrument_snapshot query.
 */

import prisma from '../../db/prisma';
import type { SnapshotProvenance } from '../snapshot-assembler/snapshot-assembler.types';

/** All fields from DailyInstrumentSnapshot relevant to stockSummary. */
export interface StockSnapshotRow {
  instrumentId: string;
  tradingDate: Date;

  // signals
  signalScore: number | null;
  signalDirection: string | null;
  signalModelVersion: string | null;

  // calibration
  calibratedScore: number | null;
  calibrationAuthority: string | null;

  // decision
  strategyDecision: string | null;
  rulesFired: string[];

  // trade plan
  stopLoss: string | null;   // stored as Decimal → string in the DB write path
  target: string | null;
  rrRatio: number | null;
  planStatus: string | null;

  // context
  marketRegime: string | null;
  breadthPct: number | null;

  // earnings
  earningsProximityDays: number | null;

  // smart money
  smartMoneyCode: string | null;
  smartMoneyScore: number | null;

  // provenance
  provenance: SnapshotProvenance;
  assembledAt: Date;
}

export class AiCopilotRepository {
  constructor(private readonly db = prisma) {}

  /**
   * Return the latest DailyInstrumentSnapshot row for a single instrument.
   * One indexed query (instrumentId, tradingDate desc, snapshotVersion desc).
   * Returns null when no snapshot exists.
   */
  async latestSnapshotForInstrument(instrumentId: string): Promise<StockSnapshotRow | null> {
    const row = await this.db.dailyInstrumentSnapshot.findFirst({
      where: { instrumentId },
      orderBy: [{ tradingDate: 'desc' }, { snapshotVersion: 'desc' }],
      select: {
        instrumentId: true,
        tradingDate: true,
        signalScore: true,
        signalDirection: true,
        signalModelVersion: true,
        calibratedScore: true,
        calibrationAuthority: true,
        strategyDecision: true,
        rulesFired: true,
        stopLoss: true,
        target: true,
        rrRatio: true,
        planStatus: true,
        marketRegime: true,
        breadthPct: true,
        earningsProximityDays: true,
        smartMoneyCode: true,
        smartMoneyScore: true,
        provenance: true,
        assembledAt: true,
      },
    });
    if (!row) return null;

    return {
      instrumentId: row.instrumentId,
      tradingDate: row.tradingDate,
      signalScore: row.signalScore,
      signalDirection: row.signalDirection,
      signalModelVersion: row.signalModelVersion,
      calibratedScore: row.calibratedScore,
      calibrationAuthority: row.calibrationAuthority,
      strategyDecision: row.strategyDecision,
      rulesFired: row.rulesFired,
      // Decimal fields come back as Prisma.Decimal — serialize to string for consistency.
      stopLoss: row.stopLoss !== null ? String(row.stopLoss) : null,
      target: row.target !== null ? String(row.target) : null,
      rrRatio: row.rrRatio,
      planStatus: row.planStatus,
      marketRegime: row.marketRegime,
      breadthPct: row.breadthPct,
      earningsProximityDays: row.earningsProximityDays,
      smartMoneyCode: row.smartMoneyCode,
      smartMoneyScore: row.smartMoneyScore,
      provenance: row.provenance as unknown as SnapshotProvenance,
      assembledAt: row.assembledAt,
    };
  }
}
