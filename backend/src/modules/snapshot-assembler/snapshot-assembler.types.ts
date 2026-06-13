/**
 * snapshot-assembler.types.ts
 *
 * Shared types for the snapshot-assembler module.  Kept narrow — only what the
 * repository and service need; the canonical Prisma models are the source of
 * truth for persisted shape.
 */

// ── Provenance ───────────────────────────────────────────────────────────────

/** Per-section provenance status written into the JSON provenance column. */
export type ProvenanceStatus = 'OK' | 'STALE' | 'FAILED' | 'N_A';

export interface SnapshotProvenance {
  eligibility: ProvenanceStatus;
  signals: ProvenanceStatus;
  calibration: ProvenanceStatus;
  decision: ProvenanceStatus;
  tradePlan: ProvenanceStatus;
  context: ProvenanceStatus;
  /**
   * Sector relative-strength provenance.  Tracked separately from `context`
   * because sector RS comes from a different source row (sectorContextSnapshot)
   * than the regime/breadth fields, and can be present or absent independently.
   */
  sector: ProvenanceStatus;
  derivatives: ProvenanceStatus;
  earnings: ProvenanceStatus;
  smartMoney: ProvenanceStatus;
}

// ── Source data bundles (one per bulk query, keyed by instrumentId) ──────────

export interface EligibilitySourceRow {
  instrumentId: string;
  tradingDate: Date;
  signalEligible: boolean;
  reviewEligible: boolean;
  backtestEligible: boolean;
  calibrationEligible: boolean;
  reviewReasons: string[];
  signalReasons: string[];
  readinessScore: number;
  readinessStatus: string;
}

export interface SignalSourceRow {
  instrumentId: string;
  score: number;
  direction: string | null;
  modelVersion: string | null;
  generatedDate: Date;
}

export interface CalibrationSourceRow {
  instrumentId: string;
  calibratedScore: number;
  calibrationModelVersion: string | null;
  generatedAt: Date;
}

export interface DecisionSourceRow {
  instrumentId: string;
  decision: string;
  entryRulesPassed: unknown;
  exitRulesTriggered: unknown;
  invalidationRulesTriggered: unknown;
  noiseFiltersTriggered: unknown;
  generatedDate: Date;
}

export interface TradePlanSourceRow {
  instrumentId: string;
  planStatus: string;
  stopLoss: unknown;   // Json — may be { price: number } or scalar
  target: unknown;     // Json — same
  rewardRiskRatio: number;
  generatedDate: Date;
}

export interface ContextSourceRow {
  snapshotDate: Date;
  regime: string;
  breadthPercentAboveSma50: number | null;
}

export interface SectorContextSourceRow {
  sector: string;
  snapshotDate: Date;
  relativeStrengthScore: number;
}

export interface EarningsSourceRow {
  stockId: string;
  snapshotDate: Date;
  daysToResult: number | null;
}

export interface SmartMoneySourceRow {
  instrumentId: string;
  smartMoneyScore: number;
  status: string;
  snapshotDate: Date;
}

// ── ComposeSnapshotRow input ─────────────────────────────────────────────────

/** All bulk-query results relevant to one instrument.  Null = no row found in DB. */
export interface InstrumentSources {
  instrumentId: string;
  tradingDate: Date;
  region: string;
  assetType: string;

  // Each of these is the result of the corresponding bulk query for this instrument.
  // When the whole bulk query threw, the per-instrument entry will be undefined and
  // the section provenance will be FAILED (set by the caller).
  eligibility: EligibilitySourceRow | null;
  signal: SignalSourceRow | null;
  calibration: CalibrationSourceRow | null;
  decision: DecisionSourceRow | null;
  tradePlan: TradePlanSourceRow | null;
  context: ContextSourceRow | null;
  sectorForInstrument: SectorContextSourceRow | null; // sector matched by instrument's sector
  earnings: EarningsSourceRow | null;       // matched by stockId (same id as instrumentId in our schema)
  smartMoney: SmartMoneySourceRow | null;

  // Flags from the bulk-query phase: true = that source's bulk query failed entirely.
  signalBulkFailed: boolean;
  calibrationBulkFailed: boolean;
  decisionBulkFailed: boolean;
  tradePlanBulkFailed: boolean;
  contextBulkFailed: boolean;
  earningsBulkFailed: boolean;
  smartMoneyBulkFailed: boolean;
}

// ── Composed snapshot row (matches DailyInstrumentSnapshot prisma model) ─────

export interface ComposedSnapshotRow {
  instrumentId: string;
  tradingDate: Date;
  snapshotVersion: number;
  region: string;
  assetType: string;

  // eligibility
  signalEligible: boolean;
  reviewEligible: boolean;
  backtestEligible: boolean;
  calibrationEligible: boolean;
  reviewReasons: string[];
  signalReasons: string[];
  readinessScore: number;
  readinessStatus: string;

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
  stopLoss: number | null;
  target: number | null;
  rrRatio: number | null;
  planStatus: string | null;

  // context
  marketRegime: string | null;
  breadthPct: number | null;
  sectorRelativeStrength: number | null;

  // derivatives (always N_A for now — see OI decision in assembler)
  oiBuildup: string | null;
  participantPositioning: string | null;

  // earnings
  earningsProximityDays: number | null;

  // smart money
  smartMoneyCode: string | null;
  smartMoneyScore: number | null;

  // provenance
  provenance: SnapshotProvenance;
  assembledAt: Date;
}

// ── Assemble request / result ────────────────────────────────────────────────

export interface AssembleRequest {
  tradingDate: string;   // YYYY-MM-DD
  region: string;
  assetType: string;
  instrumentIds?: string[] | null;
}

export interface ProvenanceCounts {
  OK: number;
  STALE: number;
  FAILED: number;
  N_A: number;
}

export interface AssembleSummary {
  rowCount: number;
  snapshotVersion: number;
  provenanceCounts: Record<keyof SnapshotProvenance, ProvenanceCounts>;
  warnings: string[];
}

// ── Alerts port ──────────────────────────────────────────────────────────────

/**
 * The narrow slice of the alerts-monitoring service that the post-assembly hook
 * depends on.  Declaring it here (instead of reaching into
 * `(alertsService as any).repository.enabledRules`) inverts the dependency: the
 * assembler owns the contract, AlertsMonitoringService merely satisfies it
 * structurally.  A rename on the alerts side now surfaces as a compile error
 * here rather than silently disabling alert evaluation at runtime.
 */
export interface EnabledAlertRule {
  userId: string | null;
  /** Optional region scope on the rule, when the rule is region-bound. */
  region?: string | null;
}

export interface AlertsEvaluationPort {
  /** Evaluate enabled alert rules; undefined userId = default/global rules. */
  evaluate(userId?: string): Promise<unknown>;
  /** List enabled rules so evaluation can be fanned out per distinct userId. */
  listEnabledRules(): Promise<EnabledAlertRule[]>;
}
