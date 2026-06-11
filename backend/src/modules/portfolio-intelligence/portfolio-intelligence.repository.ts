import prisma from '../../db/prisma';
import type { PortfolioIntelligenceResponse } from './portfolio-intelligence.types';
import type { SnapshotProvenance } from '../snapshot-assembler/snapshot-assembler.types';

/** Minimal shape of a DailyInstrumentSnapshot row used by portfolio-intelligence. */
export interface HoldingSnapshotRow {
  instrumentId: string;
  signalScore: number | null;
  signalDirection: string | null;
  calibratedScore: number | null;
  calibrationAuthority: string | null;
  strategyDecision: string | null;
  rulesFired: string[];
  marketRegime: string | null;
  breadthPct: number | null;
  provenance: SnapshotProvenance;
  assembledAt: Date;
}

/** Minimal watermark shape used by staleness check. */
export interface WatermarkRow {
  region: string;
  assetType: string;
  assembledAt: Date;
}

/**
 * Thin data-access layer for portfolio_intelligence_snapshots.
 *
 * One snapshot row per portfolio — always upserted on refresh.
 * Reads return the full PortfolioIntelligenceResponse from payloadJson.
 */
export class PortfolioIntelligenceRepository {
  /**
   * Upsert the full intelligence payload for a portfolio.
   * Called by refreshPortfolioIntelligence() — never from a GET path.
   */
  async upsertSnapshot(payload: PortfolioIntelligenceResponse): Promise<void> {
    const now = new Date(payload.generatedAt);
    await prisma.portfolioIntelligenceSnapshot.upsert({
      where: { portfolioId: payload.portfolioId },
      create: {
        id: require('crypto').randomUUID(),
        portfolioId: payload.portfolioId,
        computedAt: now,
        healthScore: payload.healthScore,
        status: payload.status,
        payloadJson: payload as any,
        updatedAt: now,
      },
      update: {
        computedAt: now,
        healthScore: payload.healthScore,
        status: payload.status,
        payloadJson: payload as any,
        updatedAt: now,
      },
    });
  }

  /**
   * Return the latest persisted snapshot for a portfolio, or null when absent.
   */
  async findByPortfolioId(portfolioId: string): Promise<PortfolioIntelligenceResponse | null> {
    const row = await prisma.portfolioIntelligenceSnapshot.findUnique({
      where: { portfolioId },
    });
    if (!row) return null;
    return row.payloadJson as unknown as PortfolioIntelligenceResponse;
  }

  /**
   * Return only the computedAt timestamp for a portfolio's snapshot,
   * without parsing the full payloadJson.  Used by staleness guards.
   * Returns null when no snapshot exists.
   */
  async findComputedAt(portfolioId: string): Promise<Date | null> {
    const row = await prisma.portfolioIntelligenceSnapshot.findUnique({
      where: { portfolioId },
      select: { computedAt: true },
    });
    return row?.computedAt ?? null;
  }

  /**
   * Return the latest SnapshotWatermark rows for a set of (region, assetType) scopes.
   * One query — returns the most-recent assembledAt per scope.
   * Used by the staleness guard to detect when a new nightly assembly has run
   * since the portfolio intelligence was last computed.
   */
  async findLatestWatermarks(scopes: Array<{ region: string; assetType: string }>): Promise<WatermarkRow[]> {
    if (scopes.length === 0) return [];
    // Fetch all matching watermarks and pick the newest per scope in-process.
    // Watermark table is tiny (one row per scope per trading date) so this is cheap.
    const rows = await prisma.snapshotWatermark.findMany({
      where: {
        OR: scopes.map((s) => ({ region: s.region, assetType: s.assetType })),
      },
      orderBy: { assembledAt: 'desc' },
      select: { region: true, assetType: true, assembledAt: true },
    });
    // Deduplicate: keep the newest per (region, assetType) scope.
    const seen = new Set<string>();
    const result: WatermarkRow[] = [];
    for (const r of rows) {
      const key = `${r.region}:${r.assetType}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ region: r.region, assetType: r.assetType, assembledAt: r.assembledAt });
      }
    }
    return result;
  }

  /**
   * Bulk-read the latest DailyInstrumentSnapshot row per instrumentId.
   * One query returning the highest-version snapshot per instrument.
   * Returns a Map<instrumentId, HoldingSnapshotRow> for O(1) lookup.
   */
  async bulkLatestSnapshots(instrumentIds: string[]): Promise<Map<string, HoldingSnapshotRow>> {
    if (instrumentIds.length === 0) return new Map();
    // Get the latest snapshot per instrument (highest snapshotVersion for the most recent tradingDate).
    const rows = await prisma.dailyInstrumentSnapshot.findMany({
      where: { instrumentId: { in: instrumentIds } },
      orderBy: [
        { instrumentId: 'asc' },
        { tradingDate: 'desc' },
        { snapshotVersion: 'desc' },
      ],
      distinct: ['instrumentId'],
      select: {
        instrumentId: true,
        signalScore: true,
        signalDirection: true,
        calibratedScore: true,
        calibrationAuthority: true,
        strategyDecision: true,
        rulesFired: true,
        marketRegime: true,
        breadthPct: true,
        provenance: true,
        assembledAt: true,
      },
    });
    const result = new Map<string, HoldingSnapshotRow>();
    for (const r of rows) {
      result.set(r.instrumentId, {
        instrumentId: r.instrumentId,
        signalScore: r.signalScore,
        signalDirection: r.signalDirection,
        calibratedScore: r.calibratedScore,
        calibrationAuthority: r.calibrationAuthority,
        strategyDecision: r.strategyDecision,
        rulesFired: r.rulesFired,
        marketRegime: r.marketRegime,
        breadthPct: r.breadthPct,
        provenance: r.provenance as unknown as SnapshotProvenance,
        assembledAt: r.assembledAt,
      });
    }
    return result;
  }
}
