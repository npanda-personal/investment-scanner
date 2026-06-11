/**
 * snapshot-assembler.repository.ts
 *
 * Prisma access for the snapshot-assembler module.
 * All reads are BULK (one query per source, never per-instrument).
 * Writes use createMany in batches of 500.
 */

import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';
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

const WRITE_BATCH_SIZE = 500;

export class SnapshotAssemblerRepository {
  constructor(private readonly db = prisma) {}

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
   * Latest smart_money_context_snapshots per instrument (range='3M').
   */
  async bulkSmartMoney(instrumentIds: string[]): Promise<SmartMoneySourceRow[]> {
    if (instrumentIds.length === 0) return [];
    const rows = await this.db.smartMoneyContextSnapshot.findMany({
      where: { instrumentId: { in: instrumentIds }, range: '3M' },
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

  // ── Reader bulk queries ────────────────────────────────────────────────────

  /**
   * Bulk latest-version daily_instrument_snapshot per instrument for a given tradingDate.
   * Returns a Map<instrumentId, ComposedSnapshotRow>.
   * Used by today-trade-review reader migrations to source context fields from the snapshot.
   *
   * Falls back to the latest available snapshot when no row exists for tradingDate
   * (callers must check assembledAt / provenance to decide whether to use or fall back to live).
   */
  async latestSnapshotsForInstruments(
    instrumentIds: string[],
    tradingDate: Date,
  ): Promise<Map<string, ComposedSnapshotRow>> {
    if (instrumentIds.length === 0) return new Map();

    // Use raw query for "latest version per instrument on this date" — one query.
    const rows = await this.db.$queryRaw<Array<ComposedSnapshotRow & { provenance: any }>>(
      Prisma.sql`
        SELECT DISTINCT ON ("instrumentId")
          "instrumentId",
          "tradingDate",
          "snapshotVersion",
          region,
          "assetType",
          "signalEligible",
          "reviewEligible",
          "backtestEligible",
          "calibrationEligible",
          "reviewReasons",
          "signalReasons",
          "readinessScore",
          "readinessStatus",
          "signalScore",
          "signalDirection",
          "signalModelVersion",
          "calibratedScore",
          "calibrationAuthority",
          "strategyDecision",
          "rulesFired",
          "stopLoss",
          "target",
          "rrRatio",
          "planStatus",
          "marketRegime",
          "breadthPct",
          "sectorRelativeStrength",
          "oiBuildup",
          "participantPositioning",
          "earningsProximityDays",
          "smartMoneyCode",
          "smartMoneyScore",
          provenance,
          "assembledAt"
        FROM daily_instrument_snapshot
        WHERE "instrumentId" = ANY(${instrumentIds}::text[])
          AND "tradingDate" = ${tradingDate}
        ORDER BY "instrumentId", "snapshotVersion" DESC
      `,
    );

    const result = new Map<string, ComposedSnapshotRow>();
    for (const row of rows) {
      result.set(row.instrumentId, {
        ...row,
        stopLoss: row.stopLoss !== null ? Number(row.stopLoss) : null,
        target: row.target !== null ? Number(row.target) : null,
        provenance: typeof row.provenance === 'string' ? JSON.parse(row.provenance) : row.provenance,
      });
    }
    return result;
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
   * Returns the current max snapshotVersion for each (instrumentId, tradingDate).
   * Returns a Map<instrumentId, maxVersion> — missing = 0 (first assembly = 1).
   */
  async maxSnapshotVersions(
    instrumentIds: string[],
    tradingDate: Date,
  ): Promise<Map<string, number>> {
    if (instrumentIds.length === 0) return new Map();
    // NOTE: this DB uses camelCase column names (not snake_case) for this table.
    const rows = await this.db.$queryRaw<Array<{ instrumentId: string; max_version: number }>>(
      Prisma.sql`
        SELECT "instrumentId", MAX("snapshotVersion") AS max_version
        FROM daily_instrument_snapshot
        WHERE "instrumentId" = ANY(${instrumentIds}::text[])
          AND "tradingDate" = ${tradingDate}
        GROUP BY "instrumentId"
      `,
    );

    const result = new Map<string, number>();
    for (const r of rows) {
      result.set(r.instrumentId, Number(r.max_version));
    }
    return result;
  }

  // ── Writes ──────────────────────────────────────────────────────────────────

  /**
   * Write composed snapshot rows in batches of WRITE_BATCH_SIZE.
   * Uses createMany — never update/overwrite prior versions.
   */
  async createSnapshotRows(rows: ComposedSnapshotRow[]): Promise<number> {
    if (rows.length === 0) return 0;
    let written = 0;
    for (let i = 0; i < rows.length; i += WRITE_BATCH_SIZE) {
      const batch = rows.slice(i, i + WRITE_BATCH_SIZE);
      const data = batch.map((r) => ({
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
        provenance: r.provenance as any,
        assembledAt: r.assembledAt,
      }));
      const result = await this.db.dailyInstrumentSnapshot.createMany({ data });
      written += result.count;
    }
    return written;
  }

  /**
   * Upsert SnapshotWatermark for (region, assetType, tradingDate).
   */
  async upsertWatermark(input: {
    region: string;
    assetType: string;
    tradingDate: Date;
    snapshotVersion: number;
    rowCount: number;
    assembledAt: Date;
  }): Promise<void> {
    await this.db.snapshotWatermark.upsert({
      where: {
        region_assetType_tradingDate: {
          region: input.region,
          assetType: input.assetType,
          tradingDate: input.tradingDate,
        },
      },
      create: {
        region: input.region,
        assetType: input.assetType,
        tradingDate: input.tradingDate,
        snapshotVersion: input.snapshotVersion,
        rowCount: input.rowCount,
        assembledAt: input.assembledAt,
      },
      update: {
        snapshotVersion: input.snapshotVersion,
        rowCount: input.rowCount,
        assembledAt: input.assembledAt,
      },
    });
  }

  // ── Instrument sector lookup ─────────────────────────────────────────────────

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
}
