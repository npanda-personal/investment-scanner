/**
 * signal-setups.ts
 *
 * The Screener "trade setup" taxonomy: a fixed, ordered catalogue of bullish / bearish
 * setup families derived from the engine's persisted evidence. PURE leaf — imports only
 * types (none today), no I/O, no cross-module dependency; cycle-safe (mirrors signal-evidence.ts,
 * which the screener repository already imports directly rather than via the engine barrel).
 *
 * Two kinds of setup:
 *   EVIDENCE — matches exact factor codes from a `signal_results` JSON column. Codes are
 *     polarity-specific. Positive evidence (bullish factor confirmations) lives in
 *     `triggeredSignals`; negative evidence (bearish / overextension factors) lives in the
 *     SEPARATE `negativeSignals` column. `evidenceSource` selects which column to read — this
 *     split is load-bearing: without it every bearish / overextended tab is permanently empty,
 *     because no bearish code is ever written into `triggeredSignals`.
 *   FIELD — matches a joined per-instrument / per-sector context value (smart-money status,
 *     sector-leadership status) that is NOT part of the factor JSON.
 *
 * The Screener's direction selector applies `signalDirection` INDEPENDENTLY of the setup
 * predicate, so any setup can be combined with All / Bullish / Bearish at the call site.
 */

export type SetupGroup = 'BULLISH' | 'BEARISH';
export type SetupKind = 'EVIDENCE' | 'FIELD';
export type EvidenceSource = 'POSITIVE' | 'NEGATIVE';
export type SetupFieldName = 'smartMoney' | 'sectorLeadership';

export interface SetupDef {
  code: string;
  label: string;
  group: SetupGroup;
  kind: SetupKind;
  /** EVIDENCE only: which `signal_results` JSON column carries these codes. */
  evidenceSource?: EvidenceSource;
  /** EVIDENCE only: exact factor codes; a row matches the setup if ANY is present. */
  factorCodes?: string[];
  /** FIELD only: the joined context column + the values that satisfy the setup. */
  field?: { name: SetupFieldName; values: string[] };
}

export const SETUP_DEFS: readonly SetupDef[] = [
  // --- Bullish: positive evidence (triggeredSignals) ---
  {
    code: 'TREND_MOMENTUM', label: 'Trend Momentum', group: 'BULLISH', kind: 'EVIDENCE', evidenceSource: 'POSITIVE',
    factorCodes: ['PRICE_ABOVE_SMA50', 'SMA50_ABOVE_SMA200', 'ONE_MONTH_MOMENTUM', 'THREE_MONTH_MOMENTUM', 'SIX_MONTH_ACCELERATION', 'MACD_BULLISH_CROSS'],
  },
  {
    code: 'BREAKOUT', label: 'Breakout', group: 'BULLISH', kind: 'EVIDENCE', evidenceSource: 'POSITIVE',
    factorCodes: ['NEAR_52_WEEK_HIGH', 'VOLUME_BREAKOUT', 'CONFIRMED_VOLUME_BREAKOUT', 'FALSE_BREAKDOWN_REJECTION'],
  },
  {
    code: 'PULLBACK', label: 'Pullback / Oversold', group: 'BULLISH', kind: 'EVIDENCE', evidenceSource: 'POSITIVE',
    factorCodes: ['RSI_RECOVERING', 'STRONG_RSI_RECOVERY', 'BOLLINGER_OVERSOLD'],
  },
  {
    code: 'RELATIVE_STRENGTH', label: 'Relative Strength', group: 'BULLISH', kind: 'EVIDENCE', evidenceSource: 'POSITIVE',
    factorCodes: ['OUTPERFORMING_PEERS'],
  },
  {
    code: 'QUALITY_VALUE', label: 'Quality / Value / Growth', group: 'BULLISH', kind: 'EVIDENCE', evidenceSource: 'POSITIVE',
    factorCodes: ['POSITIVE_EPS', 'HEALTHY_NET_MARGIN', 'PE_BELOW_PEERS', 'PE_BELOW_OWN_HISTORY', 'YIELD_ABOVE_PEERS', 'REVENUE_GROWTH_YOY', 'EPS_GROWTH_YOY', 'MARGIN_EXPANSION_YOY'],
  },
  // --- Bullish: negative evidence (negativeSignals) — a caution lens on a long bias ---
  {
    code: 'OVEREXTENDED', label: 'Overextended (caution)', group: 'BULLISH', kind: 'EVIDENCE', evidenceSource: 'NEGATIVE',
    factorCodes: ['RSI_OVERBOUGHT', 'RSI_EXTREME_OVERBOUGHT', 'EXTENDED_ABOVE_SMA50', 'PARABOLIC_RUNUP', 'BOLLINGER_OVERBOUGHT'],
  },
  // --- Bullish: field (joined context) ---
  {
    code: 'SMART_MONEY_ACCUMULATION', label: 'Smart-Money Accumulation', group: 'BULLISH', kind: 'FIELD',
    field: { name: 'smartMoney', values: ['ACCUMULATION'] },
  },
  {
    code: 'SECTOR_LEADERSHIP', label: 'Sector Leadership', group: 'BULLISH', kind: 'FIELD',
    field: { name: 'sectorLeadership', values: ['LEADING', 'IMPROVING'] },
  },
  // --- Bearish: negative evidence (negativeSignals) ---
  {
    code: 'TREND_BEARISH', label: 'Trend Bearish', group: 'BEARISH', kind: 'EVIDENCE', evidenceSource: 'NEGATIVE',
    factorCodes: ['PRICE_BELOW_SMA50', 'SMA50_BELOW_SMA200', 'MACD_BEARISH_CROSS', 'ONE_MONTH_MOMENTUM_NEGATIVE', 'THREE_MONTH_MOMENTUM_NEGATIVE'],
  },
  {
    code: 'BREAKDOWN', label: 'Breakdown', group: 'BEARISH', kind: 'EVIDENCE', evidenceSource: 'NEGATIVE',
    factorCodes: ['DOWN_VOLUME_SELLOFF', 'CONFIRMED_DOWN_VOLUME_SELLOFF', 'FALSE_BREAKOUT_REJECTION'],
  },
  {
    code: 'OVERBOUGHT_REVERSAL', label: 'Overbought Reversal', group: 'BEARISH', kind: 'EVIDENCE', evidenceSource: 'NEGATIVE',
    factorCodes: ['RSI_OVERBOUGHT_REVERSAL', 'STRONG_RSI_REVERSAL'],
  },
  {
    code: 'RELATIVE_WEAKNESS', label: 'Relative Weakness', group: 'BEARISH', kind: 'EVIDENCE', evidenceSource: 'NEGATIVE',
    factorCodes: ['UNDERPERFORMING_PEERS'],
  },
  {
    code: 'WEAK_FUNDAMENTALS', label: 'Weak Fundamentals', group: 'BEARISH', kind: 'EVIDENCE', evidenceSource: 'NEGATIVE',
    factorCodes: ['NEGATIVE_EPS', 'NEGATIVE_NET_MARGIN', 'PE_ABOVE_OWN_HISTORY', 'REVENUE_DECLINE_YOY', 'EPS_DECLINE_YOY', 'MARGIN_CONTRACTION_YOY'],
  },
  {
    code: 'SMART_MONEY_DISTRIBUTION', label: 'Smart-Money Distribution', group: 'BEARISH', kind: 'FIELD',
    field: { name: 'smartMoney', values: ['DISTRIBUTION'] },
  },
];

const SETUP_BY_CODE: ReadonlyMap<string, SetupDef> = new Map(SETUP_DEFS.map((d) => [d.code, d]));

/** Valid setup codes — for controller validation and the FE sub-tab list. */
export const SETUP_CODES: ReadonlySet<string> = new Set(SETUP_DEFS.map((d) => d.code));

export function getSetupDef(code: string): SetupDef | undefined {
  return SETUP_BY_CODE.get(code);
}

/** A row's setup-classification inputs: the factor codes from each JSON column + context fields. */
export interface SetupClassificationInput {
  positiveCodes: string[];
  negativeCodes: string[];
  smartMoneyStatus: string | null;
  sectorLeadershipStatus: string | null;
}

/**
 * Return the setup codes a row matches — EVIDENCE setups by exact code membership in the
 * appropriate JSON column, FIELD setups by context-value membership. Order follows SETUP_DEFS.
 */
export function classifyRowSetups(input: SetupClassificationInput): string[] {
  const pos = new Set(input.positiveCodes);
  const neg = new Set(input.negativeCodes);
  const matched: string[] = [];
  for (const def of SETUP_DEFS) {
    if (def.kind === 'EVIDENCE' && def.factorCodes) {
      const codes = def.evidenceSource === 'NEGATIVE' ? neg : pos;
      if (def.factorCodes.some((c) => codes.has(c))) matched.push(def.code);
    } else if (def.kind === 'FIELD' && def.field) {
      const value = def.field.name === 'smartMoney' ? input.smartMoneyStatus : input.sectorLeadershipStatus;
      if (value != null && def.field.values.includes(value)) matched.push(def.code);
    }
  }
  return matched;
}
