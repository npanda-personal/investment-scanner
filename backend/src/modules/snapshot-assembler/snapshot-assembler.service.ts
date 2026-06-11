/**
 * snapshot-assembler.service.ts
 *
 * Assembles DailyInstrumentSnapshot rows from all pipeline sources.
 *
 * Design rules (from docs/dataflow-proposed.md §4.3):
 *  - BULK reads only — zero per-instrument queries.
 *  - Missing source NEVER blocks a row.
 *  - Per-section provenance: OK / STALE / FAILED / N_A.
 *  - Versioning: max+1 per (instrument, tradingDate); createMany never overwrites.
 *  - Post-assembly: alerts evaluation per distinct userId (try/catch → warnings).
 *  - OI buildup: fo_oi_buildup is keyed by underlying symbol (NOT instrumentId),
 *    so a join would require a per-instrument symbol lookup.  Per the design rule
 *    (no N+1 loops), derivatives section is N_A for this implementation.
 *    To add it: add a bulk symbol→instrumentId join query in the repository and
 *    plumb through getLatestOiBuildup (already exists in derivatives-intelligence).
 */

import { AlertsMonitoringService } from '../alerts-monitoring';
import { SnapshotAssemblerRepository } from './snapshot-assembler.repository';
import type {
  AssembleRequest,
  AssembleSummary,
  CalibrationSourceRow,
  ComposedSnapshotRow,
  DecisionSourceRow,
  EarningsSourceRow,
  EligibilitySourceRow,
  InstrumentSources,
  ProvenanceCounts,
  ProvenanceStatus,
  SignalSourceRow,
  SmartMoneySourceRow,
  SnapshotProvenance,
  TradePlanSourceRow,
} from './snapshot-assembler.types';

// ── Pure compose function (exported for unit testing) ──────────────────────

/**
 * Compose one snapshot row from the resolved source data for a single
 * instrument.  This function is PURE — it reads from `sources` only and
 * returns a row with provenance attached.  All date-comparison logic for
 * STALE detection lives here.
 *
 * @param sources    Resolved source data for this instrument.
 * @param version    The snapshotVersion to write (1 on first assembly).
 * @param assembledAt  Timestamp of this assembly run (constant across the batch).
 */
export function composeSnapshotRow(
  sources: InstrumentSources,
  version: number,
  assembledAt: Date,
): ComposedSnapshotRow {
  const { instrumentId, tradingDate, region, assetType } = sources;

  // ── helpers ────────────────────────────────────────────────────────────────

  /**
   * True when the source row's date is strictly before the trading date
   * (i.e. the data was computed for a prior day — it is STALE but usable).
   */
  function isStale(rowDate: Date): boolean {
    const rowDay = rowDate.toISOString().slice(0, 10);
    const targetDay = tradingDate.toISOString().slice(0, 10);
    return rowDay < targetDay;
  }

  /** Extract a numeric price from a Json stopLoss/target field.
   * The trade plan stores these as JSON objects like { price: 150.5 } or
   * occasionally as a raw number.  Returns null when unparseable. */
  function extractJsonPrice(json: unknown): number | null {
    if (json === null || json === undefined) return null;
    if (typeof json === 'number') return json;
    if (typeof json === 'object') {
      const obj = json as Record<string, unknown>;
      const price = obj['price'] ?? obj['value'] ?? obj['level'];
      return price !== undefined ? Number(price) || null : null;
    }
    const n = Number(json);
    return Number.isFinite(n) ? n : null;
  }

  /** Extract fired rule names from a strategy decision Json field array. */
  function extractRuleNames(
    ...jsonFields: unknown[]
  ): string[] {
    const names: string[] = [];
    for (const field of jsonFields) {
      if (!Array.isArray(field)) continue;
      for (const item of field) {
        if (typeof item === 'string') {
          names.push(item);
        } else if (typeof item === 'object' && item !== null) {
          const obj = item as Record<string, unknown>;
          const name = obj['name'] ?? obj['rule'] ?? obj['key'];
          if (typeof name === 'string') names.push(name);
        }
      }
    }
    return names;
  }

  // ── ELIGIBILITY ────────────────────────────────────────────────────────────
  let eligibilityProvenance: ProvenanceStatus;
  let signalEligible = false;
  let reviewEligible = false;
  let backtestEligible = false;
  let calibrationEligible = false;
  let reviewReasons: string[] = [];
  let signalReasons: string[] = [];
  let readinessScore = 0;
  let readinessStatus = 'NOT_READY';

  const elig = sources.eligibility;
  if (elig === null) {
    // Eligibility row is required for a meaningful row — still write with N_A.
    eligibilityProvenance = 'N_A';
  } else {
    const eligDate = elig.tradingDate.toISOString().slice(0, 10);
    const targetDate = tradingDate.toISOString().slice(0, 10);
    eligibilityProvenance = eligDate === targetDate ? 'OK' : 'STALE';
    signalEligible = elig.signalEligible;
    reviewEligible = elig.reviewEligible;
    backtestEligible = elig.backtestEligible;
    calibrationEligible = elig.calibrationEligible;
    reviewReasons = elig.reviewReasons ?? [];
    signalReasons = elig.signalReasons ?? [];
    readinessScore = elig.readinessScore;
    readinessStatus = elig.readinessStatus;
  }

  // ── SIGNALS ────────────────────────────────────────────────────────────────
  let signalsProvenance: ProvenanceStatus;
  let signalScore: number | null = null;
  let signalDirection: string | null = null;
  let signalModelVersion: string | null = null;

  if (sources.signalBulkFailed) {
    signalsProvenance = 'FAILED';
  } else {
    const sig = sources.signal;
    if (sig === null) {
      signalsProvenance = 'N_A';
    } else {
      signalsProvenance = isStale(sig.generatedDate) ? 'STALE' : 'OK';
      signalScore = sig.score;
      signalDirection = sig.direction;
      signalModelVersion = sig.modelVersion;
    }
  }

  // ── CALIBRATION ────────────────────────────────────────────────────────────
  let calibrationProvenance: ProvenanceStatus;
  let calibratedScore: number | null = null;
  let calibrationAuthority: string | null = null;

  if (sources.calibrationBulkFailed) {
    calibrationProvenance = 'FAILED';
  } else {
    const cal = sources.calibration;
    if (cal === null) {
      calibrationProvenance = 'N_A';
    } else {
      calibrationProvenance = isStale(cal.generatedAt) ? 'STALE' : 'OK';
      calibratedScore = cal.calibratedScore;
      calibrationAuthority = cal.calibrationModelVersion;
    }
  }

  // ── DECISION ────────────────────────────────────────────────────────────────
  let decisionProvenance: ProvenanceStatus;
  let strategyDecision: string | null = null;
  let rulesFired: string[] = [];

  if (sources.decisionBulkFailed) {
    decisionProvenance = 'FAILED';
  } else {
    const dec = sources.decision;
    if (dec === null) {
      decisionProvenance = 'N_A';
    } else {
      decisionProvenance = isStale(dec.generatedDate) ? 'STALE' : 'OK';
      strategyDecision = dec.decision;
      rulesFired = extractRuleNames(
        dec.entryRulesPassed,
        dec.exitRulesTriggered,
        dec.invalidationRulesTriggered,
        dec.noiseFiltersTriggered,
      );
    }
  }

  // ── TRADE PLAN ──────────────────────────────────────────────────────────────
  let tradePlanProvenance: ProvenanceStatus;
  let stopLoss: number | null = null;
  let target: number | null = null;
  let rrRatio: number | null = null;
  let planStatus: string | null = null;

  if (sources.tradePlanBulkFailed) {
    tradePlanProvenance = 'FAILED';
  } else {
    const tp = sources.tradePlan;
    if (tp === null) {
      tradePlanProvenance = 'N_A';
    } else {
      tradePlanProvenance = isStale(tp.generatedDate) ? 'STALE' : 'OK';
      stopLoss = extractJsonPrice(tp.stopLoss);
      target = extractJsonPrice(tp.target);
      rrRatio = Number.isFinite(tp.rewardRiskRatio) ? tp.rewardRiskRatio : null;
      planStatus = tp.planStatus;
    }
  }

  // ── CONTEXT ─────────────────────────────────────────────────────────────────
  let contextProvenance: ProvenanceStatus;
  let marketRegime: string | null = null;
  let breadthPct: number | null = null;
  let sectorRelativeStrength: number | null = null;

  if (sources.contextBulkFailed) {
    contextProvenance = 'FAILED';
  } else {
    const ctx = sources.context;
    if (ctx === null) {
      contextProvenance = 'N_A';
    } else {
      contextProvenance = isStale(ctx.snapshotDate) ? 'STALE' : 'OK';
      marketRegime = ctx.regime;
      breadthPct = ctx.breadthPercentAboveSma50;
    }
    // Sector RS: cheap join — no bulk query failure possible (same context batch)
    const sec = sources.sectorForInstrument;
    if (sec !== null) {
      sectorRelativeStrength = sec.relativeStrengthScore;
    }
  }

  // ── DERIVATIVES ─────────────────────────────────────────────────────────────
  // OI buildup table (fo_oi_buildup) is keyed by `underlying` (symbol string),
  // not instrumentId.  A bulk join requires resolving symbol→instrumentId for
  // all instruments, which is a second query across the full instrument set.
  // This is implementable but deferred: for now, set derivatives to N_A and
  // document the reason so a future PR can add it without structural changes.
  const derivativesProvenance: ProvenanceStatus = 'N_A';
  const oiBuildup: string | null = null;
  const participantPositioning: string | null = null;

  // ── EARNINGS ─────────────────────────────────────────────────────────────────
  let earningsProvenance: ProvenanceStatus;
  let earningsProximityDays: number | null = null;

  if (sources.earningsBulkFailed) {
    earningsProvenance = 'FAILED';
  } else {
    const earn = sources.earnings;
    if (earn === null) {
      earningsProvenance = 'N_A';
    } else {
      earningsProvenance = isStale(earn.snapshotDate) ? 'STALE' : 'OK';
      earningsProximityDays = earn.daysToResult !== null ? earn.daysToResult : null;
    }
  }

  // ── SMART MONEY ──────────────────────────────────────────────────────────────
  let smartMoneyProvenance: ProvenanceStatus;
  let smartMoneyCode: string | null = null;
  let smartMoneyScoreOut: number | null = null;

  if (sources.smartMoneyBulkFailed) {
    smartMoneyProvenance = 'FAILED';
  } else {
    const sm = sources.smartMoney;
    if (sm === null) {
      smartMoneyProvenance = 'N_A';
    } else {
      smartMoneyProvenance = isStale(sm.snapshotDate) ? 'STALE' : 'OK';
      smartMoneyCode = sm.status;    // status field holds the code (ACCUMULATION/DISTRIBUTION/etc.)
      smartMoneyScoreOut = sm.smartMoneyScore;
    }
  }

  const provenance: SnapshotProvenance = {
    eligibility: eligibilityProvenance,
    signals: signalsProvenance,
    calibration: calibrationProvenance,
    decision: decisionProvenance,
    tradePlan: tradePlanProvenance,
    context: contextProvenance,
    derivatives: derivativesProvenance,
    earnings: earningsProvenance,
    smartMoney: smartMoneyProvenance,
  };

  return {
    instrumentId,
    tradingDate,
    snapshotVersion: version,
    region,
    assetType,
    signalEligible,
    reviewEligible,
    backtestEligible,
    calibrationEligible,
    reviewReasons,
    signalReasons,
    readinessScore,
    readinessStatus,
    signalScore,
    signalDirection,
    signalModelVersion,
    calibratedScore,
    calibrationAuthority,
    strategyDecision,
    rulesFired,
    stopLoss,
    target,
    rrRatio,
    planStatus,
    marketRegime,
    breadthPct,
    sectorRelativeStrength,
    oiBuildup,
    participantPositioning,
    earningsProximityDays,
    smartMoneyCode,
    smartMoneyScore: smartMoneyScoreOut,
    provenance,
    assembledAt,
  };
}

// ── ProvenanceCounts helper ───────────────────────────────────────────────────

type ProvenanceKey = keyof SnapshotProvenance;
const PROVENANCE_KEYS: ProvenanceKey[] = [
  'eligibility',
  'signals',
  'calibration',
  'decision',
  'tradePlan',
  'context',
  'derivatives',
  'earnings',
  'smartMoney',
];

function tallyCounts(
  rows: ComposedSnapshotRow[],
): Record<ProvenanceKey, ProvenanceCounts> {
  const counts = {} as Record<ProvenanceKey, ProvenanceCounts>;
  for (const key of PROVENANCE_KEYS) {
    counts[key] = { OK: 0, STALE: 0, FAILED: 0, N_A: 0 };
  }
  for (const row of rows) {
    for (const key of PROVENANCE_KEYS) {
      const status = row.provenance[key];
      counts[key][status] += 1;
    }
  }
  return counts;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class SnapshotAssemblerService {
  constructor(
    private readonly repository = new SnapshotAssemblerRepository(),
    private readonly alertsService = new AlertsMonitoringService(),
  ) {}

  async assemble(req: AssembleRequest): Promise<AssembleSummary> {
    const warnings: string[] = [];
    const tradingDate = new Date(`${req.tradingDate}T00:00:00.000Z`);

    // ── 1. Resolve instruments ─────────────────────────────────────────────
    let instrumentIds: string[];
    if (req.instrumentIds && req.instrumentIds.length > 0) {
      instrumentIds = [...new Set(req.instrumentIds.filter(Boolean))];
    } else {
      instrumentIds = await this.repository.eligibleInstrumentIdsForDate(
        tradingDate,
        req.region,
        req.assetType,
      );
    }

    if (instrumentIds.length === 0) {
      return {
        rowCount: 0,
        snapshotVersion: 1,
        provenanceCounts: Object.fromEntries(
          PROVENANCE_KEYS.map((k) => [k, { OK: 0, STALE: 0, FAILED: 0, N_A: 0 }]),
        ) as Record<ProvenanceKey, ProvenanceCounts>,
        warnings: ['No instruments resolved for assembly.'],
      };
    }

    // ── 2. Bulk reads — one query per source ──────────────────────────────

    // Track which bulk queries failed so compose can mark sections FAILED.
    let eligibilityRows: EligibilitySourceRow[] = [];
    let signalRows: SignalSourceRow[] = [];
    let calibrationRows: CalibrationSourceRow[] = [];
    let decisionRows: DecisionSourceRow[] = [];
    let tradePlanRows: TradePlanSourceRow[] = [];
    let contextRow: { snapshotDate: Date; regime: string; breadthPercentAboveSma50: number | null } | null = null;
    let sectorRows: Array<{ sector: string; snapshotDate: Date; relativeStrengthScore: number }> = [];
    let earningsRows: EarningsSourceRow[] = [];
    let smartMoneyRows: SmartMoneySourceRow[] = [];
    let instrumentSectors: Map<string, string> = new Map();

    let signalBulkFailed = false;
    let calibrationBulkFailed = false;
    let decisionBulkFailed = false;
    let tradePlanBulkFailed = false;
    let contextBulkFailed = false;
    let earningsBulkFailed = false;
    let smartMoneyBulkFailed = false;

    // Run all bulk reads in parallel; catch individually so a single source
    // failure does not block other sections.
    const [
      eligResult,
      sigResult,
      calResult,
      decResult,
      tpResult,
      ctxResult,
      secResult,
      earnResult,
      smResult,
      secMapResult,
    ] = await Promise.allSettled([
      this.repository.bulkEligibility(instrumentIds, tradingDate),
      this.repository.bulkSignals(instrumentIds, tradingDate),
      this.repository.bulkCalibration(instrumentIds),
      this.repository.bulkDecisions(instrumentIds, tradingDate),
      this.repository.bulkTradePlans(instrumentIds, tradingDate),
      this.repository.marketContextForDate(req.region, tradingDate),
      this.repository.sectorContextForDate(req.region, tradingDate),
      this.repository.bulkEarnings(instrumentIds, req.region, req.assetType),
      this.repository.bulkSmartMoney(instrumentIds),
      this.repository.instrumentSectors(instrumentIds),
    ]);

    if (eligResult.status === 'fulfilled') {
      eligibilityRows = eligResult.value;
    } else {
      warnings.push(`eligibility bulk read failed: ${eligResult.reason?.message ?? String(eligResult.reason)}`);
    }

    if (sigResult.status === 'fulfilled') {
      signalRows = sigResult.value;
    } else {
      signalBulkFailed = true;
      warnings.push(`signals bulk read failed: ${sigResult.reason?.message ?? String(sigResult.reason)}`);
    }

    if (calResult.status === 'fulfilled') {
      calibrationRows = calResult.value;
    } else {
      calibrationBulkFailed = true;
      warnings.push(`calibration bulk read failed: ${calResult.reason?.message ?? String(calResult.reason)}`);
    }

    if (decResult.status === 'fulfilled') {
      decisionRows = decResult.value;
    } else {
      decisionBulkFailed = true;
      warnings.push(`decisions bulk read failed: ${decResult.reason?.message ?? String(decResult.reason)}`);
    }

    if (tpResult.status === 'fulfilled') {
      tradePlanRows = tpResult.value;
    } else {
      tradePlanBulkFailed = true;
      warnings.push(`trade-plans bulk read failed: ${tpResult.reason?.message ?? String(tpResult.reason)}`);
    }

    if (ctxResult.status === 'fulfilled') {
      contextRow = ctxResult.value;
    } else {
      contextBulkFailed = true;
      warnings.push(`market-context read failed: ${ctxResult.reason?.message ?? String(ctxResult.reason)}`);
    }

    if (secResult.status === 'fulfilled') {
      sectorRows = secResult.value;
    } else {
      warnings.push(`sector-context read failed: ${secResult.reason?.message ?? String(secResult.reason)}`);
    }

    if (earnResult.status === 'fulfilled') {
      earningsRows = earnResult.value;
    } else {
      earningsBulkFailed = true;
      warnings.push(`earnings bulk read failed: ${earnResult.reason?.message ?? String(earnResult.reason)}`);
    }

    if (smResult.status === 'fulfilled') {
      smartMoneyRows = smResult.value;
    } else {
      smartMoneyBulkFailed = true;
      warnings.push(`smart-money bulk read failed: ${smResult.reason?.message ?? String(smResult.reason)}`);
    }

    if (secMapResult.status === 'fulfilled') {
      instrumentSectors = secMapResult.value;
    } else {
      warnings.push(`instrument-sector map read failed: ${secMapResult.reason?.message ?? String(secMapResult.reason)}`);
    }

    // Build lookup maps (O(n) build, O(1) lookup per instrument).
    const eligibilityByInstrument = new Map(eligibilityRows.map((r) => [r.instrumentId, r]));
    const signalByInstrument = new Map(signalRows.map((r) => [r.instrumentId, r]));
    const calibrationByInstrument = new Map(calibrationRows.map((r) => [r.instrumentId, r]));
    const decisionByInstrument = new Map(decisionRows.map((r) => [r.instrumentId, r]));
    const tradePlanByInstrument = new Map(tradePlanRows.map((r) => [r.instrumentId, r]));
    const earningsByInstrument = new Map(earningsRows.map((r) => [r.stockId, r]));
    const smartMoneyByInstrument = new Map(smartMoneyRows.map((r) => [r.instrumentId, r]));
    const sectorByName = new Map(sectorRows.map((r) => [r.sector, r]));

    // ── 3. Versioning — max version per instrument ──────────────────────────
    const maxVersions = await this.repository.maxSnapshotVersions(instrumentIds, tradingDate);

    // ── 4. Compose rows ─────────────────────────────────────────────────────
    const assembledAt = new Date();
    // Use the global max existing version + 1 as the new version for all rows
    // in this batch (consistent versioning: all rows in one assembly run share
    // the same snapshotVersion).
    const globalMaxVersion = maxVersions.size > 0
      ? Math.max(...maxVersions.values())
      : 0;
    const newVersion = globalMaxVersion + 1;

    const composedRows: ComposedSnapshotRow[] = instrumentIds.map((instrumentId) => {
      const sector = instrumentSectors.get(instrumentId);
      const sectorContext = sector ? (sectorByName.get(sector) ?? null) : null;

      const sources: InstrumentSources = {
        instrumentId,
        tradingDate,
        region: req.region,
        assetType: req.assetType,
        eligibility: eligibilityByInstrument.get(instrumentId) ?? null,
        signal: signalByInstrument.get(instrumentId) ?? null,
        calibration: calibrationByInstrument.get(instrumentId) ?? null,
        decision: decisionByInstrument.get(instrumentId) ?? null,
        tradePlan: tradePlanByInstrument.get(instrumentId) ?? null,
        context: contextRow,
        sectorForInstrument: sectorContext ? {
          sector: sectorContext.sector,
          snapshotDate: sectorContext.snapshotDate,
          relativeStrengthScore: sectorContext.relativeStrengthScore,
        } : null,
        earnings: earningsByInstrument.get(instrumentId) ?? null,
        smartMoney: smartMoneyByInstrument.get(instrumentId) ?? null,
        signalBulkFailed,
        calibrationBulkFailed,
        decisionBulkFailed,
        tradePlanBulkFailed,
        contextBulkFailed,
        earningsBulkFailed,
        smartMoneyBulkFailed,
      };

      return composeSnapshotRow(sources, newVersion, assembledAt);
    });

    // ── 5. Write snapshot rows ───────────────────────────────────────────────
    const rowCount = await this.repository.createSnapshotRows(composedRows);

    // ── 6. Upsert watermark ─────────────────────────────────────────────────
    await this.repository.upsertWatermark({
      region: req.region,
      assetType: req.assetType,
      tradingDate,
      snapshotVersion: newVersion,
      rowCount,
      assembledAt,
    });

    // ── 7. Post-assembly alerts evaluation ──────────────────────────────────
    // Evaluate all enabled alert rules (userId=undefined → global pass).
    // alertsService.evaluate(userId?) iterates every enabled rule for that user,
    // or all enabled rules when called with no userId.  We use the repository
    // enabledRules query to get distinct userIds so each user's rules run in
    // their proper auth context; the global (null-userId) pass runs last.
    // All failures become warnings only — never errors.
    try {
      const alertRepo = (this.alertsService as any).repository;
      const allRules: Array<{ userId: string | null }> = typeof alertRepo?.enabledRules === 'function'
        ? await alertRepo.enabledRules()
        : [];
      const userIds = [...new Set(allRules.map((r) => r.userId).filter((id): id is string => !!id))];
      for (const userId of userIds) {
        try {
          await this.alertsService.evaluate(userId);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          warnings.push(`alerts evaluation failed for user ${userId}: ${msg}`);
        }
      }
      // Evaluate rules with null userId (default-user / global rules)
      try {
        await this.alertsService.evaluate(undefined);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        warnings.push(`alerts evaluation failed for default rules: ${msg}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      warnings.push(`alerts post-assembly hook failed: ${msg}`);
    }

    // ── 8. Build summary ──────────────────────────────────────────────────────
    const provenanceCounts = tallyCounts(composedRows);

    return {
      rowCount,
      snapshotVersion: newVersion,
      provenanceCounts,
      warnings,
    };
  }
}
