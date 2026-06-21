/**
 * Region-aware runtime configuration for the Strategy Decision Engine.
 *
 * Why this file exists (audit CFG-1 / CFG-2):
 *  - Decision thresholds and the default market region used to be hard-coded
 *    inside the service (`SELECTIVE_MIN_SCORE = 75`, `|| 'IN'` fallbacks,
 *    `watch: 50, wait: 40` in `model()`). Those constants were hand-tuned for
 *    NSE and were applied blindly to every market, so "select US" did not yet
 *    mean "behave like US".
 *  - Centralising them here turns per-region tuning into a data change rather
 *    than a code change, and lets a US/EU deployment override the default
 *    region via environment without editing decision logic.
 *
 * Behaviour preservation: the BASE values reproduce the previous hard-coded
 * numbers exactly, and every region currently inherits BASE, so this refactor
 * is behaviour-neutral until a region override is intentionally introduced.
 */

export interface LegacyDecisionBands {
  /** Trend-momentum heuristic: score >= tradeCandidate => TRADE_CANDIDATE. */
  trend: { tradeCandidate: number; watch: number };
  /** Pullback heuristic: score >= tradeCandidate => TRADE_CANDIDATE. */
  pullback: { tradeCandidate: number };
  /** Defensive-exit heuristic decision bands. */
  exit: { exitCandidate: number; reduceRisk: number; watch: number };
}

export interface RegionDecisionConfig {
  /** Normalised region key this config was resolved for (diagnostic only). */
  region: string;
  /**
   * Minimum framework score required to retain a TRADE_CANDIDATE verdict while
   * the market gate is SELECTIVE. Below this, the candidate is downgraded to
   * WATCH. (Active framework-backed path — CB-45.)
   */
  selectiveMinScore: number;
  /** Thresholds surfaced by `GET /model` for the watch / wait display bands. */
  modelThresholds: { watch: number; wait: number };
  /** Decision bands for the legacy heuristic evaluators (fallback path only). */
  legacyBands: LegacyDecisionBands;
}

/**
 * Baseline configuration. These numbers reproduce the previous in-service
 * constants 1:1 (SELECTIVE_MIN_SCORE = 75, trend 80/60, pullback 75,
 * exit 75/45/25, model watch/wait 50/40).
 */
const BASE_CONFIG: Omit<RegionDecisionConfig, 'region'> = {
  selectiveMinScore: 75,
  modelThresholds: { watch: 50, wait: 40 },
  legacyBands: {
    trend: { tradeCandidate: 80, watch: 60 },
    pullback: { tradeCandidate: 75 },
    exit: { exitCandidate: 55, reduceRisk: 35, watch: 20 },
  },
};

/**
 * Per-region overrides. IN keeps the historical NSE-tuned baseline. US/EU
 * inherit BASE for now and are the intended tuning surface as their data and
 * backtest evidence mature — adjust here, not in the engine.
 */
const REGION_OVERRIDES: Record<string, Partial<Omit<RegionDecisionConfig, 'region'>>> = {
  IN: {},
  US: {},
  EU: {},
};

function mergeConfig(
  base: Omit<RegionDecisionConfig, 'region'>,
  override: Partial<Omit<RegionDecisionConfig, 'region'>>,
): Omit<RegionDecisionConfig, 'region'> {
  return {
    selectiveMinScore: override.selectiveMinScore ?? base.selectiveMinScore,
    modelThresholds: { ...base.modelThresholds, ...(override.modelThresholds || {}) },
    legacyBands: {
      trend: { ...base.legacyBands.trend, ...(override.legacyBands?.trend || {}) },
      pullback: { ...base.legacyBands.pullback, ...(override.legacyBands?.pullback || {}) },
      exit: { ...base.legacyBands.exit, ...(override.legacyBands?.exit || {}) },
    },
  };
}

/**
 * Resolve the decision config for a region. Unknown/empty regions fall back to
 * BASE so the engine never throws on an unexpected scope.
 */
export function resolveDecisionConfig(region?: string | null): RegionDecisionConfig {
  const key = String(region || '').trim().toUpperCase();
  const override = REGION_OVERRIDES[key] ?? {};
  return { region: key || 'DEFAULT', ...mergeConfig(BASE_CONFIG, override) };
}

/**
 * Default market region for this deployment (audit CFG-1). Previously a literal
 * `'IN'` scattered across the service. Override with
 * `STRATEGY_DECISION_DEFAULT_REGION` so a US-only install does not silently
 * default missing-region instruments to India.
 */
export function defaultMarketRegion(): string {
  return (process.env.STRATEGY_DECISION_DEFAULT_REGION || 'IN').trim().toUpperCase();
}

/** Default asset type for this deployment. */
export function defaultAssetType(): string {
  return (process.env.STRATEGY_DECISION_DEFAULT_ASSET_TYPE || 'STOCK').trim().toUpperCase();
}

/** Evaluation worker-pool sizing (moved out of the service body). */
export const DEFAULT_EVALUATION_WORKER_CONCURRENCY = 5;
export const MAX_EVALUATION_WORKER_CONCURRENCY = 8;
