/**
 * research-hub.snapshot-reader.ts
 *
 * Snapshot-first reader for research-hub's buildOverview fan-out.
 *
 * Reads ONE bulk query from daily_instrument_snapshot (via
 * SnapshotAssemblerRepository.latestSnapshotsForRegion) and projects
 * the results into the shapes that buildOverview needs.
 *
 * Provenance semantics:
 *   OK | STALE  → use the snapshot value (STALE is prior-day but valid)
 *   FAILED | N_A | missing → caller falls back to the live service
 *
 * This reader does NOT replace:
 *   - market_context_snapshots: region-level regime/breadth/sector summaries
 *     (context section is per-instrument in the snapshot but the regional
 *     summary — topSectors list, weakSectors list, explanation text — lives
 *     only in market_context_snapshots; §4.3 explicitly keeps this dep)
 *   - calibration service health: aggregate calibration health stats are not
 *     per-instrument data; no equivalent in daily_instrument_snapshot
 *   - todayTradeReviewService / tradePlanRiskEngineService: optional injections
 *     that are out of this migration scope
 *   - strategyService.marketGate: region-level gate evaluation, no snapshot row
 *   - strategyFrameworkService.performance: per-strategy backtest summaries,
 *     not per-instrument and not in the snapshot
 */

import { SnapshotAssemblerRepository } from '../snapshot-assembler/snapshot-assembler.repository';
import type { ComposedSnapshotRow, ProvenanceStatus, SnapshotProvenance } from '../snapshot-assembler/snapshot-assembler.types';
import type { StrategyDecisionDto } from '../strategy-decision-engine';
import prisma from '../../db/prisma';

// ── Types exposed to research-hub.service ────────────────────────────────────

/** Aggregate signal counts derived from snapshot rows (mirrors funnelDiagnostics). */
export interface SnapshotSignalCounts {
  total: number;
  bullish: number;
  bearish: number;
  neutral: number;
  byDirection: Record<string, number>;
}

/** Smart money entry derived from snapshot (mirrors SmartMoneyIntelligenceService.top result). */
export interface SnapshotSmartMoneyEntry {
  instrumentId: string;
  status: string;
  smartMoneyScore: number;
}

/** Result of a bulk snapshot read for a region/assetType scope. */
export interface SnapshotBulkRead {
  /** Snapshot rows keyed by instrumentId. Empty map = no snapshot available. */
  rows: Map<string, ComposedSnapshotRow>;
  /** ISO string timestamp of the oldest assembledAt among all rows (for provenance info). */
  assembledAt: string | null;
  /** Signal aggregate counts derived from snapshot rows. */
  signalCounts: SnapshotSignalCounts;
  /** Candidates derived from snapshot rows with usable decision provenance. */
  candidates: StrategyDecisionDto[];
  /** Smart money entries derived from snapshot rows with usable smartMoney provenance. */
  smartMoney: SnapshotSmartMoneyEntry[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function provenanceUsable(status: ProvenanceStatus | undefined): boolean {
  return status === 'OK' || status === 'STALE';
}

/**
 * Map snapshot strategyDecision → StrategyDecisionDto decision field.
 * Only maps values known to appear in the snapshot; others default to WAIT.
 */
function mapDecision(raw: string | null): string {
  const map: Record<string, string> = {
    TRADE_CANDIDATE: 'TRADE_CANDIDATE',
    WATCH: 'WATCH',
    WAIT: 'WAIT',
    AVOID: 'AVOID',
    EXIT_CANDIDATE: 'EXIT_CANDIDATE',
    ENTRY_CANDIDATE: 'ENTRY_CANDIDATE',
  };
  return (raw && map[raw]) ? map[raw] : 'WAIT';
}

// ── SnapshotReader ─────────────────────────────────────────────────────────────

export class ResearchHubSnapshotReader {
  private readonly repo: SnapshotAssemblerRepository;
  private readonly db: typeof prisma;

  constructor(
    repo?: SnapshotAssemblerRepository,
    db: typeof prisma = prisma,
  ) {
    this.repo = repo ?? new SnapshotAssemblerRepository(db);
    this.db = db;
  }

  /**
   * Single entry-point: load the latest snapshot for the given scope.
   * Returns an empty SnapshotBulkRead when no snapshot exists.
   */
  async read(region: string, assetType: string): Promise<SnapshotBulkRead> {
    const rows = await this.repo.latestSnapshotsForRegion(region, assetType);

    if (rows.size === 0) {
      return {
        rows,
        assembledAt: null,
        signalCounts: { total: 0, bullish: 0, bearish: 0, neutral: 0, byDirection: {} },
        candidates: [],
        smartMoney: [],
      };
    }

    // Fetch symbols for instrumentIds with usable decision provenance.
    // One query — never N+1.
    const decisionIds: string[] = [];
    for (const [id, row] of rows) {
      const prov = row.provenance as SnapshotProvenance | undefined;
      if (provenanceUsable(prov?.decision) && row.strategyDecision) {
        decisionIds.push(id);
      }
    }

    const symbolMap = await this.fetchSymbols(decisionIds);

    const signalCounts = this.deriveSignalCounts(rows);
    const candidates = this.deriveCandidates(rows, symbolMap, region, assetType);
    const smartMoney = this.deriveSmartMoney(rows);

    // assembledAt: earliest assembledAt across all rows (or null).
    let assembledAt: string | null = null;
    for (const row of rows.values()) {
      const at = row.assembledAt instanceof Date ? row.assembledAt.toISOString() : String(row.assembledAt);
      if (!assembledAt || at < assembledAt) assembledAt = at;
    }

    return { rows, assembledAt, signalCounts, candidates, smartMoney };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async fetchSymbols(instrumentIds: string[]): Promise<Map<string, string>> {
    if (instrumentIds.length === 0) return new Map();
    const stocks = await (this.db as any).stock.findMany({
      where: { id: { in: instrumentIds } },
      select: { id: true, symbol: true },
    });
    const m = new Map<string, string>();
    for (const s of stocks) m.set(s.id, s.symbol);
    return m;
  }

  private deriveSignalCounts(rows: Map<string, ComposedSnapshotRow>): SnapshotSignalCounts {
    let bullish = 0;
    let bearish = 0;
    let neutral = 0;
    for (const row of rows.values()) {
      const prov = row.provenance as SnapshotProvenance | undefined;
      if (!provenanceUsable(prov?.signals)) continue;
      const dir = String(row.signalDirection || '').toUpperCase();
      if (dir === 'BULLISH') bullish++;
      else if (dir === 'BEARISH') bearish++;
      else if (row.signalScore !== null) neutral++; // has a score but no direction
    }
    const total = bullish + bearish + neutral;
    return {
      total,
      bullish,
      bearish,
      neutral,
      byDirection: { BULLISH: bullish, BEARISH: bearish, NEUTRAL: neutral },
    };
  }

  private deriveCandidates(
    rows: Map<string, ComposedSnapshotRow>,
    symbolMap: Map<string, string>,
    region: string,
    assetType: string,
  ): StrategyDecisionDto[] {
    const results: StrategyDecisionDto[] = [];
    for (const [instrumentId, row] of rows) {
      const prov = row.provenance as SnapshotProvenance | undefined;
      if (!provenanceUsable(prov?.decision)) continue;
      if (!row.strategyDecision) continue;

      const symbol = symbolMap.get(instrumentId) ?? instrumentId;
      const decision = mapDecision(row.strategyDecision) as any;
      const decisionScore = row.calibratedScore ?? row.signalScore ?? 0;

      // Map snapshot rules_fired to entry rules passed.
      const rulesFired: string[] = Array.isArray(row.rulesFired) ? row.rulesFired : [];

      results.push({
        instrumentId,
        symbol,
        // Snapshot does not store per-decision strategy code; we use a sentinel
        // so enrichCandidates can look up backtest by 'UNKNOWN_FROM_SNAPSHOT' gracefully.
        strategy: 'UNKNOWN_FROM_SNAPSHOT' as any,
        decision,
        decisionScore: typeof decisionScore === 'number' ? decisionScore : 0,
        action: decision === 'TRADE_CANDIDATE' ? 'CONSIDER_ENTRY' : 'HOLD',
        confidence: this.scoreToConfidence(row.calibratedScore ?? row.signalScore),
        marketGate: 'UNKNOWN' as any,
        marketCondition: 'UNKNOWN' as any,
        region: region as any,
        assetType: assetType as any,
        frameworkBacked: Boolean(rulesFired.length > 0),
        reasons: rulesFired,
        blockers: [],
        warnings: row.readinessStatus === 'UNUSABLE' ? [`readinessStatus: ${row.readinessStatus}`] : [],
        dataGaps: [],
        modelVersion: row.signalModelVersion ?? undefined,
        generatedAt: row.assembledAt instanceof Date
          ? row.assembledAt.toISOString()
          : String(row.assembledAt),
        // snapshot-sourced flag (allows service to treat these differently if needed)
        _fromSnapshot: true,
      } as any);
    }
    return results;
  }

  private deriveSmartMoney(rows: Map<string, ComposedSnapshotRow>): SnapshotSmartMoneyEntry[] {
    const results: SnapshotSmartMoneyEntry[] = [];
    for (const [instrumentId, row] of rows) {
      const prov = row.provenance as SnapshotProvenance | undefined;
      if (!provenanceUsable(prov?.smartMoney)) continue;
      if (!row.smartMoneyCode) continue;
      results.push({
        instrumentId,
        status: row.smartMoneyCode,
        smartMoneyScore: row.smartMoneyScore ?? 0,
      });
    }
    return results;
  }

  private scoreToConfidence(score: number | null | undefined): string {
    if (score === null || score === undefined) return 'LOW';
    if (score >= 75) return 'HIGH';
    if (score >= 50) return 'MEDIUM';
    return 'LOW';
  }
}
