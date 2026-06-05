/**
 * Corporate-action back-adjustment engine.
 *
 * Implements TOTAL-RETURN back-adjustment so that the most-recent bar is the
 * reference (its adjustedClose === close) and all earlier bars are scaled down
 * by the product of the price-factors for every corporate action whose exDate
 * falls STRICTLY AFTER that bar's date.
 *
 * Supported actions:
 *   split / bonus   – share-multiplier R (newShares per oldShare).
 *                     Price factor = 1 / R.
 *                     e.g. 1:1 bonus → R=2 → factor=0.5
 *                          5:1 split → R=5 → factor=0.2
 *   reverse_split   – share-multiplier R < 1 (or expressed as oldShares per
 *                     newShare > 1 depending on convention; the `ratio` field
 *                     always carries R as newShares/oldShares so for a 10:1
 *                     reverse split R=0.1 → factor=10).
 *   dividend        – cash dividend D per share.
 *                     factor = (C_prev − D) / C_prev
 *                     where C_prev is the close of the last trading bar
 *                     STRICTLY BEFORE exDate.
 *                     If no prior bar, C_prev ≤ 0, or D ≥ C_prev → skip +
 *                     record a warning.
 *   rights (CB-15)  – TERP-based adjustment.
 *                     TERP = (C_prev + issuePrice × rightsRatio) / (1 + rightsRatio)
 *                     factor = TERP / C_prev
 *                     where C_prev is the close of the last trading bar
 *                     STRICTLY BEFORE exDate (same lookup as dividend).
 *                     rightsRatio = rightsShares / existingShares (e.g. 2:5 → 0.4).
 *                     issuePrice  = subscription price per rights share (Rs).
 *                     If no prior bar, C_prev ≤ 0, or issuePrice > C_prev → skip
 *                     + record a warning.
 *
 * Structural-break events (CB-16) — NO numeric factor is computed for these types;
 * they are recognised and stored as DISCONTINUITY_FLAG warnings so that downstream
 * consumers know the price series has a structural break at that ex-date:
 *   merger          – absorbing company typically has a gap/halt.
 *   demerger        – parent company price series breaks (value transferred out).
 *   spinoff         – spin-off sub-form of demerger.
 *   rights_unparseable – rights issue whose ratio/price could not be extracted.
 *
 * Multiple actions on the same exDate have their factors multiplied together.
 * Bars on or after the latest exDate have factor 1 (adjustedClose === close).
 * adjustedClose values are rounded to 6 decimal places.
 */

export type AdjustmentActionType =
  | 'split'
  | 'bonus'
  | 'reverse_split'
  | 'dividend'
  | 'rights'
  | 'rights_unparseable'
  | 'merger'
  | 'demerger'
  | 'spinoff';

/** Action types that produce a price discontinuity but no computable factor. */
export const DISCONTINUITY_TYPES: ReadonlySet<AdjustmentActionType> = new Set([
  'merger',
  'demerger',
  'spinoff',
  'rights_unparseable',
]);

export interface AdjustmentAction {
  /** The action type. */
  type: AdjustmentActionType;
  /**
   * The ex-date.  A bar dated strictly before this date is affected.
   * A bar dated on or after this date is NOT affected by this action.
   */
  exDate: Date;
  /**
   * For split / bonus / reverse_split: newShares per oldShare (R).
   *   • 1:1 bonus      → ratio = 2  (each holder gets 1 extra share per share)
   *   • 5:1 split       → ratio = 5
   *   • 10:1 rev split  → ratio = 0.1
   * For dividend and rights: not used (use `amount` / `rightsRatio` + `issuePrice`).
   */
  ratio?: number;
  /**
   * For dividend: cash amount per share (Rs).
   * For split/bonus/reverse_split/rights: not used.
   */
  amount?: number;
  /**
   * For rights (CB-15): rightsShares / existingShares.
   * e.g. "2:5 rights" → rightsRatio = 0.4.
   */
  rightsRatio?: number;
  /**
   * For rights (CB-15): subscription price per rights share (Rs).
   */
  issuePrice?: number;
}

export interface RawBar {
  date: Date;
  close: number;
}

export interface AdjustedBar {
  date: Date;
  close: number;
  adjustedClose: number;
}

export interface DiscontinuityFlag {
  /** The ex-date of the structural-break event. */
  exDate: Date;
  /** Action type that caused the discontinuity. */
  actionType: AdjustmentActionType;
  /** Human-readable description. */
  message: string;
}

export interface ComputeAdjustedClosesResult {
  bars: AdjustedBar[];
  warnings: string[];
  /**
   * CB-16: Structural-break events (merger / demerger / spinoff /
   * rights_unparseable) that occurred within the bar range.
   * No factor is applied for these events; the bars array is unchanged.
   * Downstream consumers should surface these flags to users.
   */
  discontinuityFlags: DiscontinuityFlag[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Strip time from a Date so comparisons are purely calendar-day based.
 * Returns epoch-milliseconds for the UTC midnight of the date's calendar day
 * (we normalise via toISOString slice to avoid timezone skew).
 */
function dayMs(d: Date): number {
  // Use the wall-clock date fields so that Date objects created via
  // `new Date('2024-01-15')` (UTC midnight) and `new Date(2024, 0, 15)`
  // (local midnight) both compare correctly as the same calendar day.
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Round to at most `decimals` significant decimal places.
 */
function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Compute back-adjusted closes for an array of price bars given a list of
 * corporate actions.
 *
 * @param bars    Raw price bars in any order (they are sorted internally).
 * @param actions Corporate actions in any order (sorted internally).
 * @returns       An object containing the adjusted bars array (same order as
 *                the input `bars` after internal sort — chronological) and any
 *                warnings produced during dividend factor computation.
 */
export function computeAdjustedCloses(
  bars: RawBar[],
  actions: AdjustmentAction[],
): ComputeAdjustedClosesResult {
  const warnings: string[] = [];
  const discontinuityFlags: DiscontinuityFlag[] = [];

  // ── 0. Handle empty input ──────────────────────────────────────────────────
  if (bars.length === 0) {
    return { bars: [], warnings, discontinuityFlags };
  }

  // ── 1. Sort bars chronologically ──────────────────────────────────────────
  const sortedBars = [...bars].sort((a, b) => dayMs(a.date) - dayMs(b.date));

  // ── 2. Sort actions chronologically by exDate ──────────────────────────────
  const sortedActions = [...actions].sort((a, b) => dayMs(a.exDate) - dayMs(b.exDate));

  // ── 3. Build a map: exDateMs → cumulative price factor for that ex-date ───
  //      We process dividends and rights first because they need C_prev (last
  //      bar before exDate).  We then merge split/bonus/reverse_split factors in.
  const factorByExDate = new Map<number, number>();

  for (const action of sortedActions) {
    const exMs = dayMs(action.exDate);
    const exDateStr = action.exDate.toISOString().slice(0, 10);
    let factor: number;

    // ── CB-16: Structural-break events — flag, do not factor ─────────────────
    if (DISCONTINUITY_TYPES.has(action.type)) {
      const message =
        `DISCONTINUITY_FLAG: ${action.type} on ${exDateStr} — ` +
        `price series has a structural break at this date. ` +
        `No adjustment factor applied. Manual review recommended.`;
      warnings.push(message);
      discontinuityFlags.push({ exDate: action.exDate, actionType: action.type, message });
      continue;
    }

    if (
      action.type === 'split' ||
      action.type === 'bonus' ||
      action.type === 'reverse_split'
    ) {
      const R = action.ratio;
      if (R === undefined || R === null || R <= 0) {
        warnings.push(
          `Action ${action.type} on ${exDateStr} has invalid or missing ratio (${R}); skipped.`,
        );
        continue;
      }
      factor = 1 / R;
    } else if (action.type === 'dividend') {
      const D = action.amount;
      if (D === undefined || D === null || D <= 0) {
        warnings.push(
          `Dividend on ${exDateStr} has invalid or missing amount (${D}); skipped.`,
        );
        continue;
      }

      // Find the last bar STRICTLY BEFORE exDate.
      let cPrev: number | null = null;
      for (let i = sortedBars.length - 1; i >= 0; i--) {
        if (dayMs(sortedBars[i].date) < exMs) {
          cPrev = sortedBars[i].close;
          break;
        }
      }

      if (cPrev === null) {
        warnings.push(
          `Dividend on ${exDateStr} (amount=${D}): no prior bar found; factor skipped.`,
        );
        continue;
      }
      if (cPrev <= 0) {
        warnings.push(
          `Dividend on ${exDateStr} (amount=${D}): prior bar close=${cPrev} is ≤0; factor skipped.`,
        );
        continue;
      }
      if (D >= cPrev) {
        warnings.push(
          `Dividend on ${exDateStr} (amount=${D}): dividend ≥ prior close (${cPrev}); factor skipped.`,
        );
        continue;
      }

      factor = (cPrev - D) / cPrev;
    } else if (action.type === 'rights') {
      // ── CB-15: TERP-based rights adjustment ─────────────────────────────────
      // TERP = (C_prev + issuePrice × rightsRatio) / (1 + rightsRatio)
      // factor = TERP / C_prev
      //
      // Derivation:
      //   A holder of 1 share has: 1 existing share worth C_prev
      //                          + rightsRatio new shares at issuePrice each.
      //   Combined value = C_prev + issuePrice × rightsRatio
      //   Total shares    = 1 + rightsRatio
      //   TERP = (C_prev + issuePrice × rightsRatio) / (1 + rightsRatio)
      //   factor = TERP / C_prev  (always ≤ 1 when issuePrice < C_prev)
      const rr = action.rightsRatio;
      const ip = action.issuePrice;
      if (rr === undefined || rr === null || rr <= 0) {
        warnings.push(
          `Rights on ${exDateStr}: invalid or missing rightsRatio (${rr}); factor skipped.`,
        );
        continue;
      }
      if (ip === undefined || ip === null || ip < 0) {
        warnings.push(
          `Rights on ${exDateStr}: invalid or missing issuePrice (${ip}); factor skipped.`,
        );
        continue;
      }

      // Find C_prev (last bar strictly before exDate) — same as dividend lookup.
      let cPrev: number | null = null;
      for (let i = sortedBars.length - 1; i >= 0; i--) {
        if (dayMs(sortedBars[i].date) < exMs) {
          cPrev = sortedBars[i].close;
          break;
        }
      }

      if (cPrev === null) {
        warnings.push(
          `Rights on ${exDateStr} (rightsRatio=${rr}, issuePrice=${ip}): no prior bar found; factor skipped.`,
        );
        continue;
      }
      if (cPrev <= 0) {
        warnings.push(
          `Rights on ${exDateStr} (rightsRatio=${rr}, issuePrice=${ip}): prior bar close=${cPrev} is ≤0; factor skipped.`,
        );
        continue;
      }
      if (ip > cPrev) {
        warnings.push(
          `Rights on ${exDateStr} (rightsRatio=${rr}, issuePrice=${ip}): issuePrice > prior close (${cPrev}); factor skipped (would inflate price).`,
        );
        continue;
      }

      const terp = (cPrev + ip * rr) / (1 + rr);
      factor = terp / cPrev;

      if (factor <= 0 || factor > 1) {
        warnings.push(
          `Rights on ${exDateStr}: computed TERP factor=${factor.toFixed(8)} is out of (0,1]; factor skipped.`,
        );
        continue;
      }
    } else {
      // Unknown action type — warn and skip.
      warnings.push(
        `Unknown action type "${(action as AdjustmentAction).type}" on ${exDateStr}; skipped.`,
      );
      continue;
    }

    // Multiply into any existing factor for this ex-date.
    const existing = factorByExDate.get(exMs) ?? 1;
    factorByExDate.set(exMs, existing * factor);
  }

  // ── 4. Build an ordered list of (exDateMs, factor) pairs ──────────────────
  //      sorted from oldest to newest so we can compute a running product from
  //      the right (newest is reference = factor 1).
  const exDateEntries = [...factorByExDate.entries()].sort((a, b) => a[0] - b[0]);

  // ── 5. For each bar, compute F(d) = product of factors for all exDates
  //       strictly AFTER bar date ──────────────────────────────────────────
  //
  //  Efficient O(n·m) implementation (n=bars, m=unique ex-dates).
  //  For typical usage (tens to hundreds of corporate actions over a stock's
  //  life, thousands of bars) this is fast enough.  A more optimal approach
  //  would use a prefix-product from the right, but correctness is paramount.
  //
  //  We use a prefix-product-from-the-right approach:
  //    suffixProduct[k] = product of factors[k..end]
  //  Then for a bar at dayMs `d`, we binary-search for the first exDate > d
  //  and use the corresponding suffixProduct.

  // Build suffix products (index into exDateEntries).
  const suffixProducts: number[] = new Array(exDateEntries.length + 1);
  suffixProducts[exDateEntries.length] = 1; // identity beyond the last ex-date
  for (let k = exDateEntries.length - 1; k >= 0; k--) {
    suffixProducts[k] = suffixProducts[k + 1] * exDateEntries[k][1];
  }

  // For a bar date `barMs`, the cumulative factor is suffixProducts[firstIdx]
  // where firstIdx is the index of the first exDate STRICTLY AFTER barMs.
  function cumulativeFactor(barMs: number): number {
    // Binary search for first exDate > barMs.
    let lo = 0;
    let hi = exDateEntries.length; // exclusive
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (exDateEntries[mid][0] <= barMs) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    return suffixProducts[lo];
  }

  // ── 6. Produce adjusted bars ───────────────────────────────────────────────
  const adjustedBars: AdjustedBar[] = sortedBars.map((bar) => {
    const barMs = dayMs(bar.date);
    const F = cumulativeFactor(barMs);
    const adjustedClose = round(bar.close * F, 6);
    return { date: bar.date, close: bar.close, adjustedClose };
  });

  return { bars: adjustedBars, warnings, discontinuityFlags };
}
