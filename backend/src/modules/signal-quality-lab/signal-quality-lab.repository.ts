import { PrismaClient } from '@prisma/client';
import prisma from '../../db/prisma';
import type { OutcomeBatchResult, QualityHorizon, SignalOutcomeUpsert } from './signal-quality-lab.types';

/** Maximum rows per Prisma transaction chunk (keeps individual txn fast). */
const UPSERT_CHUNK_SIZE = 200;

export class SignalQualityLabRepository {
  private readonly db: PrismaClient;

  constructor(db?: PrismaClient) {
    this.db = db ?? prisma;
  }

  // ---------------------------------------------------------------------------
  // Write
  // ---------------------------------------------------------------------------

  /**
   * Upsert a batch of SignalOutcome rows, keyed on (signalResultId, horizon).
   * Re-running with updated values (e.g. after an adjustedClose recompute) is safe —
   * the previous values are overwritten.
   */
  async upsertOutcomeBatch(rows: SignalOutcomeUpsert[]): Promise<OutcomeBatchResult> {
    if (rows.length === 0) return { upserted: 0 };

    let upserted = 0;

    for (let i = 0; i < rows.length; i += UPSERT_CHUNK_SIZE) {
      const chunk = rows.slice(i, i + UPSERT_CHUNK_SIZE);

      await this.db.$transaction(
        chunk.map((row) =>
          this.db.signalOutcome.upsert({
            where: {
              signalResultId_horizon: {
                signalResultId: row.signalResultId,
                horizon: row.horizon,
              },
            },
            create: {
              signalResultId: row.signalResultId,
              instrumentId: row.instrumentId,
              symbol: row.symbol,
              direction: row.direction,
              score: row.score,
              sector: row.sector ?? null,
              country: row.country ?? null,
              modelVersion: row.modelVersion,
              signalGeneratedDate: row.signalGeneratedDate,
              horizon: row.horizon,
              dataComplete: row.dataComplete,
              priceAtSignal: row.priceAtSignal ?? null,
              futurePrice: row.futurePrice ?? null,
              windowEndDate: row.windowEndDate ?? null,
              forwardReturnPercent: row.forwardReturnPercent ?? null,
              maxFavorableExcursion: row.maxFavorableExcursion ?? null,
              maxAdverseExcursion: row.maxAdverseExcursion ?? null,
              maxDrawdownPercent: row.maxDrawdownPercent ?? null,
              evaluatedAt: row.evaluatedAt,
            },
            update: {
              // Overwrite all mutable fields — important for CA re-adjustment
              direction: row.direction,
              score: row.score,
              sector: row.sector ?? null,
              country: row.country ?? null,
              modelVersion: row.modelVersion,
              signalGeneratedDate: row.signalGeneratedDate,
              dataComplete: row.dataComplete,
              priceAtSignal: row.priceAtSignal ?? null,
              futurePrice: row.futurePrice ?? null,
              windowEndDate: row.windowEndDate ?? null,
              forwardReturnPercent: row.forwardReturnPercent ?? null,
              maxFavorableExcursion: row.maxFavorableExcursion ?? null,
              maxAdverseExcursion: row.maxAdverseExcursion ?? null,
              maxDrawdownPercent: row.maxDrawdownPercent ?? null,
              evaluatedAt: row.evaluatedAt,
            },
          })
        )
      );

      upserted += chunk.length;
    }

    return { upserted };
  }

  // ---------------------------------------------------------------------------
  // Read / diagnostic helpers
  // ---------------------------------------------------------------------------

  /** Count mature (dataComplete=true) rows for a given horizon since an optional date. */
  async countMatureByHorizon(horizon: QualityHorizon, since?: Date): Promise<number> {
    return this.db.signalOutcome.count({
      where: {
        horizon,
        dataComplete: true,
        ...(since ? { evaluatedAt: { gte: since } } : {}),
      },
    });
  }

  /**
   * Find immature rows whose window end date has now passed — i.e. outcomes
   * that can be promoted to dataComplete=true in a maturity sweep.
   */
  async findImmatureMatured(limit = 500): Promise<Array<{ id: string; signalResultId: string; horizon: string }>> {
    const now = new Date();
    return this.db.signalOutcome.findMany({
      where: {
        dataComplete: false,
        windowEndDate: { not: null, lte: now },
      },
      select: { id: true, signalResultId: true, horizon: true },
      take: limit,
      orderBy: { windowEndDate: 'asc' },
    });
  }

  // ---------------------------------------------------------------------------
  // Legacy stub (kept for backward compat)
  // ---------------------------------------------------------------------------

  /** @deprecated Use the service's recalculate({ persistOutcomes: true }) instead. */
  async recalculate() {
    return {
      persistedOutcomes: false,
      message: 'Signal Quality Lab calculates outcomes on demand; no cached outcomes were refreshed.',
      recalculatedAt: new Date().toISOString(),
    };
  }
}
