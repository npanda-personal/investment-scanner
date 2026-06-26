/**
 * signal-setups.ts
 *
 * The Screener "trade setup" taxonomy: a fixed, ordered catalogue of bullish / bearish
 * setup families derived from the engine's persisted evidence. PURE leaf — imports only
 * types (none today), no I/O, no cross-module dependency; cycle-safe (mirrors signal-evidence.ts,
 * which the screener repository already imports directly rather than via the engine barrel).
 *
 * Two kinds of setup:
 *   EVIDENCE — matches factor codes from a `signal_results` JSON column. Codes are
 *     polarity-specific. Positive evidence (bullish factor confirmations) lives in
 *     `triggeredSignals`; negative evidence (bearish / overextension factors) lives in the
 *     SEPARATE `negativeSignals` column. `evidenceSource` selects which column to read — this
 *     split is load-bearing: without it every bearish / overextended tab is permanently empty,
 *     because no bearish code is ever written into `triggeredSignals`.
 *     An EVIDENCE setup matches EITHER by a flat OR list (`factorCodes`, single-concept setups)
 *     OR by `factorGroups` (composite setups: require ≥1 code from EACH group — AND across groups,
 *     OR within). `factorGroups` exists because flat OR lists let broad setups (e.g. Trend
 *     Momentum) collapse into "every name in this direction" once they include a near-universal
 *     base-state code like `PRICE_ABOVE_SMA50`; the AND-of-groups form forces a real subset.
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
  /**
   * EVIDENCE single-concept setups: exact factor codes; a row matches if ANY is present
   * (OR-of-codes). Mutually exclusive with `factorGroups`.
   */
  factorCodes?: string[];
  /**
   * EVIDENCE composite setups: require AT LEAST ONE code from EACH group (AND across groups,
   * OR within a group). Keeps broad setups from collapsing into the whole direction — e.g.
   * Trend Momentum demands a trend-structure code AND a momentum code, not the near-universal
   * `PRICE_ABOVE_SMA50` alone. Mutually exclusive with `factorCodes`.
   */
  factorGroups?: string[][];
  /** FIELD only: the joined context column + the values that satisfy the setup. */
  field?: { name: SetupFieldName; values: string[] };
}

export const SETUP_DEFS: readonly SetupDef[] = [
  // --- Bullish: positive evidence (triggeredSignals) ---
  {
    // Composite: an uptrend that is ALSO accelerating. Flat OR over these codes made this tab
    // ~the entire bullish list (`PRICE_ABOVE_SMA50` alone hits ~all bullish names); the AND of
    // [trend structure] × [momentum] narrows it to genuine momentum leaders.
    code: 'TREND_MOMENTUM', label: 'Trend Momentum', group: 'BULLISH', kind: 'EVIDENCE', evidenceSource: 'POSITIVE',
    factorGroups: [
      ['PRICE_ABOVE_SMA50', 'SMA50_ABOVE_SMA200'],
      ['ONE_MONTH_MOMENTUM', 'THREE_MONTH_MOMENTUM', 'SIX_MONTH_ACCELERATION', 'MACD_BULLISH_CROSS'],
    ],
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
    // Margin/valuation quality. Drops the near-universal `POSITIVE_EPS` (any profitable co.) and
    // `YIELD_ABOVE_PEERS` (a dividend artifact, not a quality differentiator) that made the old
    // omnibus "Quality / Value / Growth" tab match ~all bullish names. Growth split out below.
    code: 'QUALITY', label: 'Quality', group: 'BULLISH', kind: 'EVIDENCE', evidenceSource: 'POSITIVE',
    factorCodes: ['HEALTHY_NET_MARGIN', 'PE_BELOW_PEERS', 'PE_BELOW_OWN_HISTORY'],
  },
  {
    code: 'GROWTH', label: 'Growth', group: 'BULLISH', kind: 'EVIDENCE', evidenceSource: 'POSITIVE',
    factorCodes: ['REVENUE_GROWTH_YOY', 'EPS_GROWTH_YOY', 'MARGIN_EXPANSION_YOY'],
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
    // Composite mirror of TREND_MOMENTUM: a downtrend that is ALSO losing momentum (the
    // near-universal `PRICE_BELOW_SMA50` no longer matches on its own).
    code: 'TREND_BEARISH', label: 'Trend Bearish', group: 'BEARISH', kind: 'EVIDENCE', evidenceSource: 'NEGATIVE',
    factorGroups: [
      ['PRICE_BELOW_SMA50', 'SMA50_BELOW_SMA200', 'MACD_BEARISH_CROSS'],
      ['ONE_MONTH_MOMENTUM_NEGATIVE', 'THREE_MONTH_MOMENTUM_NEGATIVE'],
    ],
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
    // Profitability/valuation weakness. Earnings-trend decline split out into EARNINGS_DECLINE
    // below (mirrors the bullish Quality / Growth split).
    code: 'WEAK_FUNDAMENTALS', label: 'Weak Fundamentals', group: 'BEARISH', kind: 'EVIDENCE', evidenceSource: 'NEGATIVE',
    factorCodes: ['NEGATIVE_EPS', 'NEGATIVE_NET_MARGIN', 'PE_ABOVE_OWN_HISTORY'],
  },
  {
    code: 'EARNINGS_DECLINE', label: 'Earnings Decline', group: 'BEARISH', kind: 'EVIDENCE', evidenceSource: 'NEGATIVE',
    factorCodes: ['REVENUE_DECLINE_YOY', 'EPS_DECLINE_YOY', 'MARGIN_CONTRACTION_YOY'],
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
    if (def.kind === 'EVIDENCE' && (def.factorCodes || def.factorGroups)) {
      const codes = def.evidenceSource === 'NEGATIVE' ? neg : pos;
      // Composite setups (factorGroups): require ≥1 code from EACH group. Single-concept setups
      // (factorCodes): require ANY code. The same SETUP_DEFS authority drives both the per-row
      // chip here and the SQL tab filter, so they can never diverge.
      const isMatch = def.factorGroups
        ? def.factorGroups.every((g) => g.some((c) => codes.has(c)))
        : def.factorCodes!.some((c) => codes.has(c));
      if (isMatch) matched.push(def.code);
    } else if (def.kind === 'FIELD' && def.field) {
      const value = def.field.name === 'smartMoney' ? input.smartMoneyStatus : input.sectorLeadershipStatus;
      if (value != null && def.field.values.includes(value)) matched.push(def.code);
    }
  }
  return matched;
}
