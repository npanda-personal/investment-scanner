/**
 * snapshot-assembler.repository.ts
 *
 * Prisma access for the snapshot-assembler module.
 * All reads are BULK (one query per source, never per-instrument).
 * Writes go through commitAssembly, which wraps the row writes AND the
 * watermark upsert in a single transaction with optimistic-concurrency retry
 * on the (instrumentId, tradingDate, snapshotVersion) unique key.
 */

import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';
import {
  DEFAULT_SNAPSHOT_ASSEMBLER_CONFIG,
  type SnapshotAssemblerConfig,
} from './snapshot-assembler.config';
import type {
  CalibrationSourceRow,
  ComposedSnapshotRow,
  DecisionSourceRow,
  EarningsSourceRow,
  EligibilitySourceRow,
  SignalSourceRow,
  SmartMoneySourceRow,
  TradePlanSourceRow,
} from './snapshot-assembler.types';

/** Any Prisma client surface that supports the model ops + $queryRaw we use. */
type PrismaLike = typeof prisma | Prisma.TransactionClient;

// ── Single source of truth for the persisted column shape ───────────────────
//
// These four artefacts must agree: the SELECT list (reads), the create payload
// (writes), the runtime row mapper (numeric/JSON coercion), and the
// ComposedSnapshotRow type.  The SELECT list and create payload are kept here so
// adding a column means editing ONE file, not four.

/** Static, non-user-derived column list for raw SELECTs. */
const SNAPSHOT_SELECT_COLUMNS = Prisma.raw(
  [
    'instrumentId',
    'tradingDate',
    'snapshotVersion',
    'region',
    'assetType',
    'signalEligible',
    'reviewEligible',
    'backtestEligible',
    'calibrationEligible',
    'reviewReasons',
    'signalReasons',
    'readinessScore',
    'readinessStatus',
    'signalScore',
    'signalDirection',
    'signalModelVersion',
    'calibratedScore',
    'calibrationAuthority',
    'strategyDecision',
    'rulesFired',
    'stopLoss',
    'target',
    'rrRatio',
    'planStatus',
    'marketRegime',
    'breadthPct',
    'sectorRelativeStrength',
    'oiBuildup',
    'participantPositioning',
    'earningsProximityDays',
    'smartMoneyCode',
    'smartMoneyScore',
    'provenance',
    'assembledAt',
  ]
    .map((c) => `"${c}"`)
    .join(', '),
);

/** Coerce a raw DB row (Decimal stopLoss/target, JSON provenance) → typed row. */
function mapSnapshotRow(
  row: ComposedSnapshotRow & { provenance: unknown },
): ComposedSnapshotRow {
  return {
    ...row,
    stopLoss: row.stopLoss !== null ? Number(row.stopLoss) : null,
    target: row.target !== null ? Number(row.target) : null,
    provenance:
      typeof row.provenance === 'string'
        ? JSON.parse(row.provenance)
        : (row.provenance as ComposedSnapshotRow['provenance']),
  };
}

/** Build the createMany payload for one composed row (Decimal as string). */
function composedToCreateData(
  r: ComposedSnapshotRow,
): Prisma.DailyInstrumentSnapshotCreateManyInput {
  return {
    instrumentId: r.instrumentId,
    tradingDate: r.tradingDate,
    snapshotVersion: r.snapshotVersion,
    region: r.region,
    assetType: r.assetType,
    signalEligible: r.signalEligible,
    reviewEligible: r.reviewEligible,
    backtestEligible: r.backtestEligible,
    calibrationEligible: r.calibrationEligible,
    reviewReasons: r.reviewReasons,
    signalReasons: r.signalReasons,
    readinessScore: r.readinessScore,
    readinessStatus: r.readinessStatus,
    signalScore: r.signalScore,
    signalDirection: r.signalDirection,
    signalModelVersion: r.signalModelVersion,
    calibratedScore: r.calibratedScore,
    calibrationAuthority: r.calibrationAuthority,
    strategyDecision: r.strategyDecision,
    rulesFired: r.rulesFired,
    stopLoss: r.stopLoss !== null ? String(r.stopLoss) : null,
    target: r.target !== null ? String(r.target) : null,
    rrRatio: r.rrRatio,
    planStatus: r.planStatus,
    marketRegime: r.marketRegime,
    breadthPct: r.breadthPct,
    sectorRelativeStrength: r.sectorRelativeStrength,
    oiBuildup: r.oiBuildup,
    participantPositioning: r.participantPositioning,
    earningsProximityDays: r.earningsProximityDays,
    smartMoneyCode: r.smartMoneyCode,
    smartMoneyScore: r.smartMoneyScore,
    provenance: r.provenance as unknown as Prisma.InputJsonValue,
    assembledAt: r.assembledAt,
  };
}

/** True for a Prisma unique-constraint violation (P2002). */
function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
  );
}

export class SnapshotAssemblerRepository {
  constructor(
    private readonly db = prisma,
    private readonly config: SnapshotAssemblerConfig = DEFAULT_SNAPSHOT_ASSEMBLER_CONFIG,
  ) {}

  // ── Resolve instruments ────────────────────────────────────────────────────

  /**
   * All instrumentIds that have an instrument_eligibility row for tradingDate.
   * Used when the caller does not provide an explicit instrumentIds list.
   */
  async eligibleInstrumentIdsForDate(
    tradingDate: Date,
    region: string,
    assetType: string,
  ): Promise<string[]> {
    const rows = await this.db.instrumentEligibility.findMany({
      where: {
        tradingDate,
        stock: { region, assetType },
      },
      select: { instrumentId: true },
    });
    return rows.map((r) => r.instrumentId);
  }

  /**
   * Restrict an explicit instrumentIds list to those whose Stock actually
   * belongs to (region, assetType).  Guarantees every assembled row is labelled
   * with the scope it really belongs to — without this, a caller-supplied
   * cross-region id list would be stamped with req.region wholesale.
   */
  async filterInstrumentIdsByScope(
    instrumentIds: string[],
    region: string,
    assetType: string,
  ): Promise<string[]> {
    if (instrumentIds.length === 0) return [];
    const rows = await this.db.stock.findMany({
      where: { id: { in: instrumentIds }, region, assetType },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  // ── Bulk source reads ──────────────────────────────────────────────────────

  async bulkEligibility(
    instrumentIds: string[],
    tradingDate: Date,
  ): Promise<EligibilitySourceRow[]> {
    if (instrumentIds.length === 0) return [];
    const rows = await this.db.instrumentEligibility.findMany({
      where: { instrumentId: { in: instrumentIds }, tradingDate },
      select: {
        instrumentId: true,
        tradingDate: true,
        signalEligible: true,
        reviewEligible: true,
        backtestEligible: true,
        calibrationEligible: true,
        reviewReasons: true,
        signalReasons: true,
        readinessScore: true,
        readinessStatus: true,
      },
    });
    return rows as EligibilitySourceRow[];
  }

  /**
   * Latest signal_results per instrument for a given generated date.
   * Uses distinct on instrumentId ordered by generatedDate desc.
   */
  async bulkSignals(
    instrumentIds: string[],
    tradingDate: Date,
  ): Promise<SignalSourceRow[]> {
    if (instrumentIds.length === 0) return [];
    const rows = await this.db.signalResult.findMany({
      where: {
        instrumentId: { in: instrumentIds },
        generatedDate: tradingDate,
      },
      orderBy: [{ instrumentId: 'asc' }, { generatedDate: 'desc' }, { updatedAt: 'desc' }],
      distinct: ['instrumentId'],
      select: {
        instrumentId: true,
        score: true,
        direction: true,
        modelVersion: true,
        generatedDate: true,
      },
    });
    return rows
      .filter((r) => r.generatedDate !== null)
      .map((r) => ({
        instrumentId: r.instrumentId,
        score: r.score,
        direction: r.direction ?? null,
        modelVersion: r.modelVersion ?? null,
        generatedDate: r.generatedDate as Date,
      }));
  }

  /**
   * Latest signal_calibration_results per instrument (no date filter — latest overall,
   * with STALE provenance if the generatedAt pre-dates tradingDate).
   */
  async bulkCalibration(instrumentIds: string[]): Promise<CalibrationSourceRow[]> {
    if (instrumentIds.length === 0) return [];
    const rows = await this.db.signalCalibrationResult.findMany({
      where: { instrumentId: { in: instrumentIds } },
      orderBy: [{ instrumentId: 'asc' }, { generatedAt: 'desc' }, { updatedAt: 'desc' }],
      distinct: ['instrumentId'],
      select: {
        instrumentId: true,
        calibratedScore: true,
        calibrationModelVersion: true,
        generatedAt: true,
      },
    });
    return rows.map((r) => ({
      instrumentId: r.instrumentId,
      calibratedScore: r.calibratedScore,
      calibrationModelVersion: r.calibrationModelVersion ?? null,
      generatedAt: r.generatedAt,
    }));
  }

  /**
   * Latest strategy_decision_results per instrument for a given generated date.
   * Takes the highest-scoring decision per instrument on that date.
   */
  async bulkDecisions(
    instrumentIds: string[],
    tradingDate: Date,
  ): Promise<DecisionSourceRow[]> {
    if (instrumentIds.length === 0) return [];
    const rows = await this.db.strategyDecisionResult.findMany({
      where: {
        instrumentId: { in: instrumentIds },
        generatedDate: tradingDate,
      },
      orderBy: [
        { instrumentId: 'asc' },
        { generatedDate: 'desc' },
        { decisionScore: 'desc' },
      ],
      distinct: ['instrumentId'],
      select: {
        instrumentId: true,
        decision: true,
        entryRulesPassed: true,
        exitRulesTriggered: true,
        invalidationRulesTriggered: true,
        noiseFiltersTriggered: true,
        generatedDate: true,
      },
    });
    return rows.map((r) => ({
      instrumentId: r.instrumentId!,
      decision: r.decision,
      entryRulesPassed: r.entryRulesPassed,
      exitRulesTriggered: r.exitRulesTriggered,
      invalidationRulesTriggered: r.invalidationRulesTriggered,
      noiseFiltersTriggered: r.noiseFiltersTriggered,
      generatedDate: r.generatedDate,
    }));
  }

  /**
   * Latest trade_plan_results per instrument for a given generated date.
   * Uses distinct on instrumentId within the date.
   */
  async bulkTradePlans(
    instrumentIds: string[],
    tradingDate: Date,
  ): Promise<TradePlanSourceRow[]> {
    if (instrumentIds.length === 0) return [];
    const rows = await this.db.tradePlanResult.findMany({
      where: {
        instrumentId: { in: instrumentIds },
        generatedDate: tradingDate,
      },
      orderBy: [{ instrumentId: 'asc' }, { generatedDate: 'desc' }, { updatedAt: 'desc' }],
      distinct: ['instrumentId'],
      select: {
        instrumentId: true,
        planStatus: true,
        stopLoss: true,
        target: true,
        rewardRiskRatio: true,
        generatedDate: true,
      },
    });
    return rows.map((r) => ({
      instrumentId: r.instrumentId,
      planStatus: r.planStatus,
      stopLoss: r.stopLoss,
      target: r.target,
      rewardRiskRatio: r.rewardRiskRatio,
      generatedDate: r.generatedDate,
    }));
  }

  /**
   * Market context snapshot for (region, date). Returns the row for the
   * tradingDate or the latest available.
   */
  async marketContextForDate(
    region: string,
    tradingDate: Date,
  ): Promise<{ snapshotDate: Date; regime: string; breadthPercentAboveSma50: number | null } | null> {
    const row = await this.db.marketContextSnapshot.findFirst({
      where: { region, snapshotDate: { lte: tradingDate } },
      orderBy: { snapshotDate: 'desc' },
      select: { snapshotDate: true, regime: true, breadthPercentAboveSma50: true },
    });
    return row ?? null;
  }

  /**
   * All sector snapshots for (region, date) — caller joins by instrument sector.
   */
  async sectorContextForDate(
    region: string,
    tradingDate: Date,
  ): Promise<Array<{ sector: string; snapshotDate: Date; relativeStrengthScore: number }>> {
    const rows = await this.db.sectorContextSnapshot.findMany({
      where: { region, snapshotDate: { lte: tradingDate } },
      orderBy: [{ sector: 'asc' }, { snapshotDate: 'desc' }],
      distinct: ['sector'],
      select: { sector: true, snapshotDate: true, relativeStrengthScore: true },
    });
    return rows;
  }

  /**
   * Latest earnings_intelligence_snapshots per instrument (matched by stockId = instrumentId).
   * Returns proximity days.
   */
  async bulkEarnings(
    instrumentIds: string[],
    scopeRegion: string,
    scopeAssetType: string,
  ): Promise<EarningsSourceRow[]> {
    if (instrumentIds.length === 0) return [];
    const rows = await this.db.earningsIntelligenceSnapshot.findMany({
      where: {
        stockId: { in: instrumentIds },
        scopeRegion,
        scopeAssetType,
      },
      orderBy: [{ stockId: 'asc' }, { snapshotDate: 'desc' }],
      distinct: ['stockId'],
      select: { stockId: true, snapshotDate: true, daysToResult: true },
    });
    return rows.map((r) => ({
      stockId: r.stockId,
      snapshotDate: r.snapshotDate,
      daysToResult: r.daysToResult,
    }));
  }

  /**
   * Latest smart_money_context_snapshots per instrument for the configured range.
   */
  async bulkSmartMoney(instrumentIds: string[]): Promise<SmartMoneySourceRow[]> {
    if (instrumentIds.length === 0) return [];
    const rows = await this.db.smartMoneyContextSnapshot.findMany({
      where: { instrumentId: { in: instrumentIds }, range: this.config.smartMoneyRange },
      orderBy: [{ instrumentId: 'asc' }, { snapshotDate: 'desc' }, { updatedAt: 'desc' }],
      distinct: ['instrumentId'],
      select: { instrumentId: true, smartMoneyScore: true, status: true, snapshotDate: true },
    });
    return rows.map((r) => ({
      instrumentId: r.instrumentId,
      smartMoneyScore: r.smartMoneyScore,
      status: r.status,
      snapshotDate: r.snapshotDate,
    }));
  }

  /**
   * Returns a map of instrumentId → sector string for the given instruments.
   * Used to join sector context onto each snapshot row.
   */
  async instrumentSectors(instrumentIds: string[]): Promise<Map<string, string>> {
    if (instrumentIds.length === 0) return new Map();
    const rows = await this.db.stock.findMany({
      where: { id: { in: instrumentIds } },
      select: { id: true, sector: true },
    });
    const result = new Map<string, string>();
    for (const r of rows) {
      if (r.sector) result.set(r.id, r.sector);
    }
    return result;
  }

  // ── Reader bulk queries ────────────────────────────────────────────────────

  /**
   * Run the shared "latest version per instrument" projection with a
   * caller-supplied WHERE fragment.  One query; never N+1.
   */
  private async queryLatestSnapshots(
    where: Prisma.Sql,
  ): Promise<Map<string, ComposedSnapshotRow>> {
    const rows = await this.db.$queryRaw<Array<ComposedSnapshotRow & { provenance: unknown }>>(
      Prisma.sql`
        SELECT DISTINCT ON ("instrumentId")
          ${SNAPSHOT_SELECT_COLUMNS}
        FROM daily_instrument_snapshot
        WHERE ${where}
        ORDER BY "instrumentId", "snapshotVersion" DESC
      `,
    );
    const result = new Map<string, ComposedSnapshotRow>();
    for (const row of rows) {
      result.set(row.instrumentId, mapSnapshotRow(row));
    }
    return result;
  }

  /**
   * Bulk latest-version daily_instrument_snapshot per instrument for a given tradingDate.
   * Used by today-trade-review reader migrations to source context fields from the snapshot.
   */
  async latestSnapshotsForInstruments(
    instrumentIds: string[],
    tradingDate: Date,
  ): Promise<Map<string, ComposedSnapshotRow>> {
    if (instrumentIds.length === 0) return new Map();
    return this.queryLatestSnapshots(
      Prisma.sql`"instrumentId" = ANY(${instrumentIds}::text[]) AND "tradingDate" = ${tradingDate}`,
    );
  }

  /**
   * Bulk latest-version daily_instrument_snapshot rows for an entire
   * (region, assetType) scope.  Used by research-hub's snapshot-first reader.
   *
   * Strategy: find the most-recent watermarked tradingDate for the scope, then
   * fetch DISTINCT ON instrumentId (highest snapshotVersion) for that date.
   * Returns an empty Map when no watermark / no rows exist.
   */
  async latestSnapshotsForRegion(
    region: string,
    assetType: string,
  ): Promise<Map<string, ComposedSnapshotRow>> {
    const watermark = await this.db.snapshotWatermark.findFirst({
      where: { region, assetType },
      orderBy: { tradingDate: 'desc' },
      select: { tradingDate: true },
    });
    if (!watermark) return new Map();

    return this.queryLatestSnapshots(
      Prisma.sql`region = ${region} AND "assetType" = ${assetType} AND "tradingDate" = ${watermark.tradingDate}`,
    );
  }

  /**
   * Fetch the latest SnapshotWatermark for (region, assetType, tradingDate).
   * Returns null when no watermark exists.
   */
  async latestWatermark(
    region: string,
    assetType: string,
    tradingDate: Date,
  ): Promise<{ assembledAt: Date; snapshotVersion: number; rowCount: number } | null> {
    const row = await this.db.snapshotWatermark.findUnique({
      where: { region_assetType_tradingDate: { region, assetType, tradingDate } },
      select: { assembledAt: true, snapshotVersion: true, rowCount: true },
    });
    return row ?? null;
  }

  // ── Versioning ──────────────────────────────────────────────────────────────

  /**
   * Global max snapshotVersion across the batch for (instrumentIds, tradingDate),
   * as a single scalar.  All rows in one assembly run share one version (see
   * commitAssembly), so we only need the batch-wide max, not a per-instrument map.
   * Returns 0 when no rows exist yet (first assembly → version 1).
   */
  private async maxVersionForBatch(
    instrumentIds: string[],
    tradingDate: Date,
    db: PrismaLike = this.db,
  ): Promise<number> {
    if (instrumentIds.length === 0) return 0;
    const rows = await db.$queryRaw<Array<{ max_version: number | null }>>(
      Prisma.sql`
        SELECT MAX("snapshotVersion") AS max_version
        FROM daily_instrument_snapshot
        WHERE "instrumentId" = ANY(${instrumentIds}::text[])
          AND "tradingDate" = ${tradingDate}
      `,
    );
    const v = rows[0]?.max_version;
    return v != null ? Number(v) : 0;
  }

  // ── Writes ──────────────────────────────────────────────────────────────────

  /**
   * Atomically commit one assembly run: assign a batch-wide snapshotVersion,
   * write all rows, and upsert the watermark — all inside a single transaction.
   *
   * Concurrency: two runs assembling the same scope can both read max version N
   * and try to write N+1.  The unique key (instrumentId, tradingDate,
   * snapshotVersion) makes the loser throw P2002; we catch it, recompute the
   * version, and retry up to config.maxCommitRetries.  This replaces the old
   * read-then-write-then-watermark sequence that could leave orphan rows with no
   * watermark, or two runs colliding on the same version.
   *
   * The version is assigned here (not by the caller) so it is computed against
   * the freshest committed state inside the transaction.
   */
  async commitAssembly(params: {
    composedRows: ComposedSnapshotRow[];
    instrumentIds: string[];
    region: string;
    assetType: string;
    tradingDate: Date;
    assembledAt: Date;
  }): Promise<{ rowCount: number; snapshotVersion: number }> {
    const { composedRows, instrumentIds, region, assetType, tradingDate, assembledAt } = params;
    if (composedRows.length === 0) return { rowCount: 0, snapshotVersion: 1 };

    const maxRetries = Math.max(1, this.config.maxCommitRetries);
    let lastErr: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.db.$transaction(async (tx) => {
          const version = (await this.maxVersionForBatch(instrumentIds, tradingDate, tx)) + 1;

          const rowsToWrite = composedRows.map((r) => ({ ...r, snapshotVersion: version }));
          const rowCount = await this.writeSnapshotRows(rowsToWrite, tx);

          await tx.snapshotWatermark.upsert({
            where: {
              region_assetType_tradingDate: { region, assetType, tradingDate },
            },
            create: {
              region,
              assetType,
              tradingDate,
              snapshotVersion: version,
              rowCount,
              assembledAt,
            },
            update: { snapshotVersion: version, rowCount, assembledAt },
          });

          return { rowCount, snapshotVersion: version };
        }, { maxWait: Math.max(1, this.config.commitMaxWaitMs), timeout: Math.max(1, this.config.commitTimeoutMs) });
      } catch (err) {
        if (isUniqueViolation(err) && attempt < maxRetries) {
          lastErr = err;
          continue; // concurrent run took this version — recompute and retry
        }
        throw err;
      }
    }
    throw lastErr;
  }

  /**
   * Write composed snapshot rows in batches of config.writeBatchSize.
   * Uses createMany — never update/overwrite prior versions.
   */
  private async writeSnapshotRows(
    rows: ComposedSnapshotRow[],
    db: PrismaLike = this.db,
  ): Promise<number> {
    if (rows.length === 0) return 0;
    const batchSize = Math.max(1, this.config.writeBatchSize);
    let written = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const result = await db.dailyInstrumentSnapshot.createMany({
        data: batch.map(composedToCreateData),
      });
      written += result.count;
    }
    return written;
  }
}
