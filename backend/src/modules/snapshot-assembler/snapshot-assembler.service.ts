/**
 * snapshot-assembler.service.ts
 *
 * Assembles DailyInstrumentSnapshot rows from all pipeline sources.
 *
 * Design rules (from docs/dataflow-proposed.md §4.3):
 *  - BULK reads only — zero per-instrument queries.
 *  - Missing source NEVER blocks a row.
 *  - Per-section provenance: OK / STALE / FAILED / N_A.
 *  - Versioning: ONE batch-wide snapshotVersion per assembly run, computed as
 *    (global max existing version for the batch) + 1.  All rows written by a
 *    single assemble() call share that version.  Version assignment + row writes
 *    + watermark upsert are atomic (see repository.commitAssembly), with retry
 *    on the unique-key race so concurrent runs don't collide or orphan rows.
 *  - Post-assembly: alerts evaluation per distinct userId (try/catch → warnings),
 *    region-scoped when rule region data is available.
 *  - OI buildup: fo_oi_buildup is keyed by underlying symbol (NOT instrumentId),
 *    so a join would require a per-instrument symbol lookup.  Per the design rule
 *    (no N+1 loops), derivatives section is N_A for this implementation.
 */

import { SnapshotAssemblerRepository } from './snapshot-assembler.repository';
import { AlertsMonitoringEvaluationAdapter } from './snapshot-assembler.alerts-adapter';
import {
  DEFAULT_SNAPSHOT_ASSEMBLER_CONFIG,
  isScopeSupported,
  type SnapshotAssemblerConfig,
} from './snapshot-assembler.config';
import type {
  AlertsEvaluationPort,
  AssembleRequest,
  AssembleSummary,
  ComposedSnapshotRow,
  ContextSourceRow,
  InstrumentSources,
  ProvenanceCounts,
  ProvenanceStatus,
  SectorContextSourceRow,
  SignalSourceRow,
  CalibrationSourceRow,
  DecisionSourceRow,
  EarningsSourceRow,
  EligibilitySourceRow,
  SmartMoneySourceRow,
  TradePlanSourceRow,
  SnapshotProvenance,
} from './snapshot-assembler.types';

// ── Pure helpers (module-scoped: allocated once, not per-instrument) ─────────

/** YYYY-MM-DD slice of a Date in UTC (lexicographically comparable). */
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * True when the source row's date is strictly before the trading date
 * (the data was computed for a prior day — STALE but usable).
 */
function isStale(rowDate: Date, tradingDate: Date): boolean {
  return dayKey(rowDate) < dayKey(tradingDate);
}

/**
 * Resolve a section's provenance from the three signals every section shares:
 * whether its bulk query failed, whether a row was found, and (when found) the
 * row's as-of date.  Replaces nine copy-pasted FAILED/N_A/STALE/OK ladders.
 */
function resolveStatus(
  bulkFailed: boolean,
  row: unknown | null,
  rowDate: Date | null,
  tradingDate: Date,
): ProvenanceStatus {
  if (bulkFailed) return 'FAILED';
  if (row === null || row === undefined) return 'N_A';
  if (rowDate !== null && isStale(rowDate, tradingDate)) return 'STALE';
  return 'OK';
}

/**
 * Extract a numeric price from a Json stopLoss/target field.  The trade plan
 * stores these as JSON objects like { price: 150.5 } or occasionally a raw
 * number.  Returns null only when genuinely unparseable — a legitimate 0 is
 * preserved (do NOT use `Number(x) || null`, which drops 0).
 */
function extractJsonPrice(json: unknown): number | null {
  if (json === null || json === undefined) return null;
  if (typeof json === 'number') return Number.isFinite(json) ? json : null;
  if (typeof json === 'object') {
    const obj = json as Record<string, unknown>;
    const price = obj['price'] ?? obj['value'] ?? obj['level'];
    if (price === undefined || price === null) return null;
    const n = Number(price);
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(json);
  return Number.isFinite(n) ? n : null;
}

/** Extract fired rule names from a strategy decision Json field array. */
function extractRuleNames(...jsonFields: unknown[]): string[] {
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

// ── Pure compose function (exported for unit testing) ──────────────────────

/**
 * Compose one snapshot row from the resolved source data for a single
 * instrument.  This function is PURE — it reads from `sources` only and
 * returns a row with provenance attached.
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

  // ── ELIGIBILITY (exact-date match; never a bulk-FAILED section) ─────────────
  let signalEligible = false;
  let reviewEligible = false;
  let backtestEligible = false;
  let calibrationEligible = false;
  let reviewReasons: string[] = [];
  let signalReasons: string[] = [];
  let readinessScore = 0;
  let readinessStatus = 'NOT_READY';

  let eligibilityProvenance: ProvenanceStatus;
  const elig = sources.eligibility;
  if (elig === null) {
    eligibilityProvenance = 'N_A';
  } else {
    eligibilityProvenance =
      dayKey(elig.tradingDate) === dayKey(tradingDate) ? 'OK' : 'STALE';
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
  const sig = sources.signal;
  const signalsProvenance = resolveStatus(
    sources.signalBulkFailed, sig, sig?.generatedDate ?? null, tradingDate,
  );
  const signalScore = signalsProvenance !== 'FAILED' && sig ? sig.score : null;
  const signalDirection = signalsProvenance !== 'FAILED' && sig ? sig.direction : null;
  const signalModelVersion = signalsProvenance !== 'FAILED' && sig ? sig.modelVersion : null;

  // ── CALIBRATION ──────────────────────────────────────────────────────────────
  const cal = sources.calibration;
  const calibrationProvenance = resolveStatus(
    sources.calibrationBulkFailed, cal, cal?.generatedAt ?? null, tradingDate,
  );
  const calibratedScore = calibrationProvenance !== 'FAILED' && cal ? cal.calibratedScore : null;
  const calibrationAuthority = calibrationProvenance !== 'FAILED' && cal ? cal.calibrationModelVersion : null;

  // ── DECISION ──────────────────────────────────────────────────────────────────
  const dec = sources.decision;
  const decisionProvenance = resolveStatus(
    sources.decisionBulkFailed, dec, dec?.generatedDate ?? null, tradingDate,
  );
  const strategyDecision = decisionProvenance !== 'FAILED' && dec ? dec.decision : null;
  const rulesFired = decisionProvenance !== 'FAILED' && dec
    ? extractRuleNames(
        dec.entryRulesPassed,
        dec.exitRulesTriggered,
        dec.invalidationRulesTriggered,
        dec.noiseFiltersTriggered,
      )
    : [];

  // ── TRADE PLAN ──────────────────────────────────────────────────────────────
  const tp = sources.tradePlan;
  const tradePlanProvenance = resolveStatus(
    sources.tradePlanBulkFailed, tp, tp?.generatedDate ?? null, tradingDate,
  );
  const stopLoss = tradePlanProvenance !== 'FAILED' && tp ? extractJsonPrice(tp.stopLoss) : null;
  const target = tradePlanProvenance !== 'FAILED' && tp ? extractJsonPrice(tp.target) : null;
  const rrRatio = tradePlanProvenance !== 'FAILED' && tp && Number.isFinite(tp.rewardRiskRatio)
    ? tp.rewardRiskRatio
    : null;
  const planStatus = tradePlanProvenance !== 'FAILED' && tp ? tp.planStatus : null;

  // ── CONTEXT (regime / breadth) ───────────────────────────────────────────────
  const ctx = sources.context;
  const contextProvenance = resolveStatus(
    sources.contextBulkFailed, ctx, ctx?.snapshotDate ?? null, tradingDate,
  );
  const marketRegime = contextProvenance !== 'FAILED' && ctx ? ctx.regime : null;
  const breadthPct = contextProvenance !== 'FAILED' && ctx ? ctx.breadthPercentAboveSma50 : null;

  // ── SECTOR (relative strength — independent source, own provenance) ──────────
  const sec = sources.sectorForInstrument;
  // Sector RS has no bulk-failure flag in the current design (a sector read
  // failure only warns), so it is OK / STALE / N_A.
  const sectorProvenance: ProvenanceStatus =
    sec === null ? 'N_A' : isStale(sec.snapshotDate, tradingDate) ? 'STALE' : 'OK';
  const sectorRelativeStrength = sec !== null ? sec.relativeStrengthScore : null;

  // ── DERIVATIVES (always N_A — OI keyed by symbol, not instrumentId) ──────────
  const derivativesProvenance: ProvenanceStatus = 'N_A';
  const oiBuildup: string | null = null;
  const participantPositioning: string | null = null;

  // ── EARNINGS ─────────────────────────────────────────────────────────────────
  const earn = sources.earnings;
  const earningsProvenance = resolveStatus(
    sources.earningsBulkFailed, earn, earn?.snapshotDate ?? null, tradingDate,
  );
  const earningsProximityDays = earningsProvenance !== 'FAILED' && earn ? earn.daysToResult : null;

  // ── SMART MONEY ──────────────────────────────────────────────────────────────
  const sm = sources.smartMoney;
  const smartMoneyProvenance = resolveStatus(
    sources.smartMoneyBulkFailed, sm, sm?.snapshotDate ?? null, tradingDate,
  );
  // status field holds the code (ACCUMULATION/DISTRIBUTION/etc.)
  const smartMoneyCode = smartMoneyProvenance !== 'FAILED' && sm ? sm.status : null;
  const smartMoneyScore = smartMoneyProvenance !== 'FAILED' && sm ? sm.smartMoneyScore : null;

  const provenance: SnapshotProvenance = {
    eligibility: eligibilityProvenance,
    signals: signalsProvenance,
    calibration: calibrationProvenance,
    decision: decisionProvenance,
    tradePlan: tradePlanProvenance,
    context: contextProvenance,
    sector: sectorProvenance,
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
    smartMoneyScore,
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
  'sector',
  'derivatives',
  'earnings',
  'smartMoney',
];

function emptyCounts(): Record<ProvenanceKey, ProvenanceCounts> {
  return Object.fromEntries(
    PROVENANCE_KEYS.map((k) => [k, { OK: 0, STALE: 0, FAILED: 0, N_A: 0 }]),
  ) as Record<ProvenanceKey, ProvenanceCounts>;
}

function tallyCounts(
  rows: ComposedSnapshotRow[],
): Record<ProvenanceKey, ProvenanceCounts> {
  const counts = emptyCounts();
  for (const row of rows) {
    for (const key of PROVENANCE_KEYS) {
      counts[key][row.provenance[key]] += 1;
    }
  }
  return counts;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class SnapshotAssemblerService {
  private readonly repository: SnapshotAssemblerRepository;
  private readonly alerts: AlertsEvaluationPort;
  private readonly config: SnapshotAssemblerConfig;

  constructor(
    repository?: SnapshotAssemblerRepository,
    alerts?: AlertsEvaluationPort,
    config: SnapshotAssemblerConfig = DEFAULT_SNAPSHOT_ASSEMBLER_CONFIG,
  ) {
    this.config = config;
    // Pass undefined for db so the repository applies its own default client,
    // while still threading the (possibly overridden) config through.
    this.repository = repository ?? new SnapshotAssemblerRepository(undefined, config);
    this.alerts = alerts ?? new AlertsMonitoringEvaluationAdapter();
  }

  async assemble(req: AssembleRequest): Promise<AssembleSummary> {
    const warnings: string[] = [];
    const tradingDate = new Date(`${req.tradingDate}T00:00:00.000Z`);

    // ── 0. Scope guard ──────────────────────────────────────────────────────
    if (!isScopeSupported(this.config, req.region, req.assetType)) {
      return {
        rowCount: 0,
        snapshotVersion: 1,
        provenanceCounts: emptyCounts(),
        warnings: [`Scope not supported: ${req.region}/${req.assetType}.`],
      };
    }

    // ── 1. Resolve instruments ─────────────────────────────────────────────
    let instrumentIds: string[];
    if (req.instrumentIds && req.instrumentIds.length > 0) {
      const requested = [...new Set(req.instrumentIds.filter(Boolean))];
      if (this.config.enforceExplicitIdScope) {
        instrumentIds = await this.repository.filterInstrumentIdsByScope(
          requested,
          req.region,
          req.assetType,
        );
        const dropped = requested.length - instrumentIds.length;
        if (dropped > 0) {
          warnings.push(
            `${dropped} instrument id(s) excluded — not in scope ${req.region}/${req.assetType}.`,
          );
        }
      } else {
        instrumentIds = requested;
      }
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
        provenanceCounts: emptyCounts(),
        warnings: [...warnings, 'No instruments resolved for assembly.'],
      };
    }

    // ── 2. Bulk reads — one query per source, fault-isolated ─────────────────
    let eligibilityRows: EligibilitySourceRow[] = [];
    let signalRows: SignalSourceRow[] = [];
    let calibrationRows: CalibrationSourceRow[] = [];
    let decisionRows: DecisionSourceRow[] = [];
    let tradePlanRows: TradePlanSourceRow[] = [];
    let contextRow: ContextSourceRow | null = null;
    let sectorRows: SectorContextSourceRow[] = [];
    let earningsRows: EarningsSourceRow[] = [];
    let smartMoneyRows: SmartMoneySourceRow[] = [];
    let instrumentSectors = new Map<string, string>();

    let signalBulkFailed = false;
    let calibrationBulkFailed = false;
    let decisionBulkFailed = false;
    let tradePlanBulkFailed = false;
    let contextBulkFailed = false;
    let earningsBulkFailed = false;
    let smartMoneyBulkFailed = false;

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

    const reason = (r: PromiseRejectedResult): string =>
      r.reason?.message ?? String(r.reason);

    if (eligResult.status === 'fulfilled') eligibilityRows = eligResult.value;
    else warnings.push(`eligibility bulk read failed: ${reason(eligResult)}`);

    if (sigResult.status === 'fulfilled') signalRows = sigResult.value;
    else { signalBulkFailed = true; warnings.push(`signals bulk read failed: ${reason(sigResult)}`); }

    if (calResult.status === 'fulfilled') calibrationRows = calResult.value;
    else { calibrationBulkFailed = true; warnings.push(`calibration bulk read failed: ${reason(calResult)}`); }

    if (decResult.status === 'fulfilled') decisionRows = decResult.value;
    else { decisionBulkFailed = true; warnings.push(`decisions bulk read failed: ${reason(decResult)}`); }

    if (tpResult.status === 'fulfilled') tradePlanRows = tpResult.value;
    else { tradePlanBulkFailed = true; warnings.push(`trade-plans bulk read failed: ${reason(tpResult)}`); }

    if (ctxResult.status === 'fulfilled') contextRow = ctxResult.value;
    else { contextBulkFailed = true; warnings.push(`market-context read failed: ${reason(ctxResult)}`); }

    if (secResult.status === 'fulfilled') sectorRows = secResult.value;
    else warnings.push(`sector-context read failed: ${reason(secResult)}`);

    if (earnResult.status === 'fulfilled') earningsRows = earnResult.value;
    else { earningsBulkFailed = true; warnings.push(`earnings bulk read failed: ${reason(earnResult)}`); }

    if (smResult.status === 'fulfilled') smartMoneyRows = smResult.value;
    else { smartMoneyBulkFailed = true; warnings.push(`smart-money bulk read failed: ${reason(smResult)}`); }

    if (secMapResult.status === 'fulfilled') instrumentSectors = secMapResult.value;
    else warnings.push(`instrument-sector map read failed: ${reason(secMapResult)}`);

    // Build lookup maps (O(n) build, O(1) lookup per instrument).
    const eligibilityByInstrument = new Map(eligibilityRows.map((r) => [r.instrumentId, r]));
    const signalByInstrument = new Map(signalRows.map((r) => [r.instrumentId, r]));
    const calibrationByInstrument = new Map(calibrationRows.map((r) => [r.instrumentId, r]));
    const decisionByInstrument = new Map(decisionRows.map((r) => [r.instrumentId, r]));
    const tradePlanByInstrument = new Map(tradePlanRows.map((r) => [r.instrumentId, r]));
    const earningsByInstrument = new Map(earningsRows.map((r) => [r.stockId, r]));
    const smartMoneyByInstrument = new Map(smartMoneyRows.map((r) => [r.instrumentId, r]));
    const sectorByName = new Map(sectorRows.map((r) => [r.sector, r]));

    // ── 3. Compose rows (version is assigned atomically at commit time) ─────
    const assembledAt = new Date();
    const PLACEHOLDER_VERSION = 1;

    const composedRows: ComposedSnapshotRow[] = instrumentIds.map((instrumentId) => {
      const sectorName = instrumentSectors.get(instrumentId);
      const sectorContext = sectorName ? (sectorByName.get(sectorName) ?? null) : null;

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
        sectorForInstrument: sectorContext
          ? {
              sector: sectorContext.sector,
              snapshotDate: sectorContext.snapshotDate,
              relativeStrengthScore: sectorContext.relativeStrengthScore,
            }
          : null,
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

      return composeSnapshotRow(sources, PLACEHOLDER_VERSION, assembledAt);
    });

    // ── 4. Atomic commit: version + rows + watermark in one transaction ─────
    const { rowCount, snapshotVersion } = await this.repository.commitAssembly({
      composedRows,
      instrumentIds,
      region: req.region,
      assetType: req.assetType,
      tradingDate,
      assembledAt,
    });

    // ── 5. Post-assembly alerts evaluation (failures → warnings only) ───────
    await this.evaluateAlerts(req.region, warnings);

    // ── 6. Build summary ──────────────────────────────────────────────────────
    return {
      rowCount,
      snapshotVersion,
      provenanceCounts: tallyCounts(composedRows),
      warnings,
    };
  }

  /**
   * Evaluate enabled alert rules after assembly.  Region-scoped when rule region
   * data is available (region-agnostic rules always run); a single failure
   * becomes a warning and never aborts the run.
   */
  private async evaluateAlerts(region: string, warnings: string[]): Promise<void> {
    try {
      const rules = await this.alerts.listEnabledRules();
      // Keep rules that are region-agnostic (region == null) or match this run.
      const relevant = rules.filter((r) => r.region == null || r.region === region);

      const userIds = [
        ...new Set(relevant.map((r) => r.userId).filter((id): id is string => !!id)),
      ];
      for (const userId of userIds) {
        try {
          await this.alerts.evaluate(userId);
        } catch (err) {
          warnings.push(`alerts evaluation failed for user ${userId}: ${errMsg(err)}`);
        }
      }

      // Default/global (null-userId) rules pass.
      try {
        await this.alerts.evaluate(undefined);
      } catch (err) {
        warnings.push(`alerts evaluation failed for default rules: ${errMsg(err)}`);
      }
    } catch (err) {
      warnings.push(`alerts post-assembly hook failed: ${errMsg(err)}`);
    }
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
