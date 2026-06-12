/**
 * NSE Corporate-Actions SOURCE PARSER + IMPORT MAPPER
 *
 * Official free source: NSE India API
 *   Endpoint : https://www.nseindia.com/api/corporates-corporateActions?index=equities[&symbol=X&from_date=DD-MM-YYYY&to_date=DD-MM-YYYY]
 *   Columns  : symbol, series, ind, faceVal, subject, exDate (DD-Mon-YYYY),
 *              recDate, bcStartDate, bcEndDate, ndStartDate, ndEndDate,
 *              comp (company name), isin, caBroadcastDate
 *
 * NOTE: The NSE endpoint is bot-protected (requires a live browser cookie).
 * This module provides the PARSER/MAPPER logic only; the caller is responsible
 * for fetching the JSON (e.g. with a session-cookie strategy matching the
 * existing bhavcopy pattern).  Tests use inline fixture data.
 *
 * Ratio convention (aligned with market-data-foundation.corporate-adjustment.ts):
 *   - splitRatio = newShares / oldShares
 *   - Bonus  a:b  → (a + b) / b   (e.g. 1:1 → 2, 2:1 → 3, 3:2 → 2.5)
 *   - Split  from FV oldFV to newFV → oldFV / newFV   (e.g. Rs10→Rs2 → 5)
 *   - Reverse split: ratio < 1      (e.g. 10:1 reverse → 0.1)
 *   - Dividend: amount = cash Rs per share
 *
 * Rights handling (CB-15):
 *   Rights issues use TERP (Theoretical Ex-Rights Price) adjustment.
 *   TERP = (cum_price + issue_price × rights_ratio) / (1 + rights_ratio)
 *   where rights_ratio = rightsShares / existingShares (e.g. "2:5 rights" → 2/5).
 *   factor = TERP / cum_price
 *   The parser extracts rightsRatio + issuePrice from the NSE subject string.
 *   The adjustment engine applies TERP using the last bar before the ex-date as
 *   cum_price (same pattern as dividend C_prev lookup).
 *   If the ratio or price cannot be parsed, the row is stored as actionType
 *   'rights_unparseable' so callers can flag/warn rather than silently drop.
 *
 * Merger/Demerger/Spin-off handling (CB-16):
 *   These actions produce a price-series discontinuity that cannot be reliably
 *   derived from the NSE subject string alone.  The parser recognises them and
 *   stores them with actionType 'merger', 'demerger', or 'spinoff'.
 *   The adjustment engine does NOT apply a numeric factor for these types; it
 *   instead records a DISCONTINUITY_FLAG warning so downstream consumers know
 *   the series has a structural break at that date.
 */

import { nseCorporateActionsEndpoint } from './market-data-foundation.endpoints';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ParsedCorporateAction {
  symbol: string;
  actionType: 'split' | 'bonus' | 'reverse_split' | 'dividend' | 'rights' | 'rights_unparseable' | 'merger' | 'demerger' | 'spinoff';
  effectiveDate: Date; // EX-date normalised to UTC midnight
  amount?: number; // cash dividend per share (Rs)
  splitRatio?: number; // newShares / oldShares (same convention as adjustment engine)
  /**
   * Rights-specific fields (CB-15).
   * rightsRatio = rightsShares / existingShares (e.g. 2:5 → 0.4)
   * issuePrice  = subscription price per rights share (Rs)
   * Both are present only when actionType === 'rights'.
   */
  rightsRatio?: number;
  issuePrice?: number;
  source: string; // 'NSE_CORPORATE_ACTIONS'
  rawPurpose: string; // original subject string, preserved for audit
}

export interface NseCorporateActionRow {
  symbol: string;
  series: string;
  subject: string; // the free-text "Purpose" field from the NSE API
  exDate: string; // typically 'DD-Mon-YYYY', may also be 'DD-MM-YYYY' or blank
  [key: string]: unknown; // other fields (recDate, comp, isin, …) are ignored by parser
}

export interface ParseNseCorporateActionsOptions {
  source?: string; // defaults to 'NSE_CORPORATE_ACTIONS'
  includeUnknown?: boolean; // if true, still skip but capture in warnings
}

export interface ParseNseCorporateActionsResult {
  parsed: ParsedCorporateAction[];
  skipped: number; // rows skipped for any reason (unrecognised type, missing date, rights, …)
  warnings: string[]; // per-row descriptive warnings
}

// Dependency-injected DB interface (subset of the real repository)
export interface CorporateActionsUpsertFn {
  (stockId: string, actions: CorporateActionDbInput[]): Promise<unknown[]>;
}

export interface CorporateActionDbInput {
  symbol: string;
  type: string; // 'split' | 'bonus' | 'reverse_split' | 'dividend' | 'rights' | 'rights_unparseable' | 'merger' | 'demerger' | 'spinoff'
  date: string; // ISO date string 'YYYY-MM-DD'
  value: number | string;
  amount?: number | null;
  splitRatio?: number | null;
  /** Rights-specific (CB-15): rightsShares/existingShares ratio */
  rightsRatio?: number | null;
  /** Rights-specific (CB-15): subscription price per rights share (Rs) */
  issuePrice?: number | null;
  currency?: string | null;
  source: string;
}

export interface ImportMappingOptions {
  source?: string;
}

export interface ImportMappingResult {
  inserted: number;
  updated: number;
  skipped: number;
  rejected: number;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const NSE_CORPORATE_ACTIONS_SOURCE = 'NSE_CORPORATE_ACTIONS';
/** Sourced from the central endpoint registry (override: MARKET_DATA_NSE_WWW_BASE). */
export const NSE_CORPORATE_ACTIONS_ENDPOINT = nseCorporateActionsEndpoint();

/** URL pattern builder — mirrors the bhavcopy URL pattern convention. */
export const buildNseCorporateActionsUrl = (
  options: {
    index?: 'equities' | 'sme' | 'debt' | 'mf';
    symbol?: string;
    fromDate?: string; // 'DD-MM-YYYY'
    toDate?: string; // 'DD-MM-YYYY'
  } = {}
): string => {
  const params = new URLSearchParams();
  params.set('index', options.index ?? 'equities');
  if (options.symbol) params.set('symbol', options.symbol);
  if (options.fromDate) params.set('from_date', options.fromDate);
  if (options.toDate) params.set('to_date', options.toDate);
  return `${NSE_CORPORATE_ACTIONS_ENDPOINT}?${params.toString()}`;
};

// ---------------------------------------------------------------------------
// Month-name lookup for DD-Mon-YYYY parsing
// ---------------------------------------------------------------------------

const MONTH_NAMES: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

// ---------------------------------------------------------------------------
// Date parsing (tolerates multiple NSE date formats, outputs UTC midnight)
// ---------------------------------------------------------------------------

/**
 * Parse an NSE exDate string to a UTC-midnight Date.
 * Supported formats: 'DD-Mon-YYYY' (e.g. '17-Oct-2023'),
 *                    'DD-MM-YYYY', 'YYYY-MM-DD', ISO, plain Date.
 * Returns null for empty/invalid strings — per-row isolation, never throws.
 */
export const parseNseExDate = (raw: string | null | undefined): Date | null => {
  const text = (raw ?? '').trim();
  if (!text || text === '-' || text === 'N/A') return null;

  // DD-Mon-YYYY (e.g. '17-Oct-2023') — most common in the API
  const mmmMatch = text.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (mmmMatch) {
    const day = Number(mmmMatch[1]);
    const monthIndex = MONTH_NAMES[mmmMatch[2].toLowerCase()];
    const year = Number(mmmMatch[3]);
    if (monthIndex !== undefined) return utcMidnight(year, monthIndex, day);
  }

  // DD-MM-YYYY
  const ddmmMatch = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (ddmmMatch) {
    return utcMidnight(Number(ddmmMatch[3]), Number(ddmmMatch[2]) - 1, Number(ddmmMatch[1]));
  }

  // YYYY-MM-DD
  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return utcMidnight(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }

  // Try native Date parsing as final fallback (handles ISO-8601 with time)
  const d = new Date(text);
  if (!Number.isNaN(d.getTime())) {
    return utcMidnight(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }

  return null;
};

const utcMidnight = (year: number, monthIndex: number, day: number): Date | null => {
  const d = new Date(Date.UTC(year, monthIndex, day));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== monthIndex ||
    d.getUTCDate() !== day
  ) {
    return null;
  }
  return d;
};

// ---------------------------------------------------------------------------
// Subject / Purpose string parser
// ---------------------------------------------------------------------------

/**
 * Parse an NSE corporate-action subject string into a structured type.
 *
 * Returns one of:
 *   { actionType: 'bonus',         splitRatio: number }  — ratio = (a+b)/b
 *   { actionType: 'split',         splitRatio: number }  — ratio = oldFV/newFV
 *   { actionType: 'reverse_split', splitRatio: number }  — ratio = newShares/oldShares (<1)
 *   { actionType: 'dividend',      amount: number    }
 *   { actionType: 'rights' }                             — caller must skip + warn
 *   null                                                 — unrecognised, caller skips + warns
 *
 * All parsing is case-insensitive to handle real-world NSE inconsistencies.
 */
export type SubjectParseResult =
  | { actionType: 'bonus'; splitRatio: number }
  | { actionType: 'split'; splitRatio: number }
  | { actionType: 'reverse_split'; splitRatio: number }
  | { actionType: 'dividend'; amount: number }
  /**
   * Rights with parseable ratio + issue price (CB-15).
   * rightsRatio = rightsShares / existingShares (e.g. 2:5 → 0.4).
   * issuePrice = subscription price per rights share (Rs).
   * TERP = (cum_price + issuePrice * rightsRatio) / (1 + rightsRatio).
   * factor = TERP / cum_price  (applied to bars BEFORE exDate by the adjustment engine).
   */
  | { actionType: 'rights'; rightsRatio: number; issuePrice: number }
  /**
   * Rights recognised but ratio/price could not be extracted.
   * Stored for audit; adjustment engine emits DISCONTINUITY_FLAG warning.
   */
  | { actionType: 'rights_unparseable' }
  /** Merger — price-series discontinuity; adjustment engine flags, does not factor. */
  | { actionType: 'merger' }
  /** Demerger / spin-off — price-series discontinuity; flags, does not factor. */
  | { actionType: 'demerger' }
  /** Spin-off — price-series discontinuity; flags, does not factor. */
  | { actionType: 'spinoff' }
  | null;

export const parseNseSubject = (subject: string): SubjectParseResult => {
  const s = (subject ?? '').trim().toLowerCase();
  if (!s) return null;

  // ── BONUS ────────────────────────────────────────────────────────────────
  // Patterns:  "Bonus 1:1", "Bonus 2:1", "Bonus 3:2", "bonus issue 1:3"
  const bonusMatch = s.match(/\bbonus\b.*?(\d+)\s*:\s*(\d+)/);
  if (bonusMatch) {
    const a = Number(bonusMatch[1]);
    const b = Number(bonusMatch[2]);
    if (a > 0 && b > 0) {
      // a:b bonus → holder gets a new shares per b existing → total = a+b per b
      return { actionType: 'bonus', splitRatio: (a + b) / b };
    }
  }

  // ── FACE VALUE SPLIT / SUB-DIVISION ──────────────────────────────────────
  // Patterns (NSE real data):
  //   "Face Value Split (Sub-Division) - From Rs 10/- Per Share To Rs 2/- Per Share"
  //   "Face Value Split from Rs 10 to Rs 2"
  //   "Sub-Division from Rs 10 to Re 1"
  //   "stock split from rs.10/- to rs.1/-"   (BSE-style kite_pnl CSV)
  //
  // Extract the two face-value numbers; split ratio = oldFV / newFV.
  const splitPattern = /(?:face\s*value\s*split|sub[-\s]?division|stock\s*split).*?(?:rs?\.?|re\.?)\s*([\d.]+)(?:\/|-|\s)*.*?(?:to|from).*?(?:rs?\.?|re\.?)\s*([\d.]+)/i;
  const splitMatch = subject.match(splitPattern);
  if (splitMatch) {
    const v1 = Number(splitMatch[1]);
    const v2 = Number(splitMatch[2]);
    if (v1 > 0 && v2 > 0 && v1 !== v2) {
      const oldFv = Math.max(v1, v2);
      const newFv = Math.min(v1, v2);
      const ratio = oldFv / newFv;
      // A genuine split has ratio > 1 (oldFV > newFV → more shares per old share).
      // A reverse subdivision (consolidation) would have ratio < 1 — very rare.
      if (ratio > 1) {
        return { actionType: 'split', splitRatio: ratio };
      }
      if (ratio < 1) {
        return { actionType: 'reverse_split', splitRatio: ratio };
      }
    }
  }

  // ── DIVIDEND ─────────────────────────────────────────────────────────────
  // Patterns:
  //   "Dividend - Rs 5 Per Share"
  //   "Dividend - Rs 2.50"
  //   "Interim Dividend - Re 0.80 Per Share"
  //   "Final Dividend Rs 12"
  //   "Interim Dividend Re 1"
  //   "Special Dividend - Rs 3.50 Per Share"
  //   "Annual Dividend Rs 0.50"
  if (/\bdividend\b/i.test(subject)) {
    const amtMatch = subject.match(/(?:rs?\.?|re\.?)\s*([\d]+(?:\.\d+)?)/i);
    if (amtMatch) {
      const amount = Number(amtMatch[1]);
      if (amount > 0) {
        return { actionType: 'dividend', amount };
      }
    }
    // Dividend mentioned but no extractable amount — unrecognised variant
    return null;
  }

  // ── RIGHTS (CB-15) ───────────────────────────────────────────────────────
  // NSE patterns:
  //   "Rights 2:5 @ Premium Rs 150/-"
  //   "Rights Issue 8:13 @ Rs 4/-"
  //   "Rights  1:3  @  Premium  Rs  10 per share"
  //   "Rights Issue"  (no ratio — falls back to unparseable)
  //
  // Extraction: ratio A:B (rightsRatio = A/B) and price P.
  // TERP = (cum_price + P × (A/B)) / (1 + A/B) — applied by adjustment engine.
  if (/\brights?\b/i.test(subject)) {
    const ratioMatch = subject.match(/(\d+)\s*:\s*(\d+)/);
    const priceMatch = subject.match(/(?:rs?\.?|re\.?)\s*([\d]+(?:\.\d+)?)/i);
    if (ratioMatch && priceMatch) {
      const a = Number(ratioMatch[1]);
      const b = Number(ratioMatch[2]);
      const price = Number(priceMatch[1]);
      if (a > 0 && b > 0 && price >= 0) {
        return { actionType: 'rights', rightsRatio: a / b, issuePrice: price };
      }
    }
    // Ratio or price not parseable — still store, but mark as unparseable.
    return { actionType: 'rights_unparseable' };
  }

  // ── MERGER (CB-16) ───────────────────────────────────────────────────────
  // NSE patterns: "Merger", "Amalgamation", "Merger/Amalgamation",
  //               "Scheme of Amalgamation", "Arrangement/Amalgamation"
  if (/\bmerger\b|\bamalgamation\b|\barrangement\b/i.test(subject)) {
    // Guard: don't classify demerger/spinoff subjects as merger.
    if (!/\bdemerger\b|\bspin[\s-]?off\b|\bseparation\b/i.test(subject)) {
      return { actionType: 'merger' };
    }
  }

  // ── DEMERGER / SPIN-OFF (CB-16) ──────────────────────────────────────────
  // NSE patterns: "Demerger", "Scheme of Demerger", "Spin Off",
  //               "Demerger/Listing", "Spinoff"
  if (/\bdemerger\b|\bspin[\s-]?off\b|\bspinoff\b/i.test(subject)) {
    // Spin-off is a sub-form of demerger; distinguish for clearer flagging.
    if (/\bspin[\s-]?off\b|\bspinoff\b/i.test(subject)) {
      return { actionType: 'spinoff' };
    }
    return { actionType: 'demerger' };
  }

  return null;
};

// ---------------------------------------------------------------------------
// Row → ParsedCorporateAction
// ---------------------------------------------------------------------------

/**
 * Parse a single NSE API corporate-action row.
 * Returns the parsed action OR null (+ pushes to warnings) on any problem.
 * NEVER throws — per-row isolation.
 */
export const parseNseCorporateActionRow = (
  row: NseCorporateActionRow,
  source: string,
  warnings: string[]
): ParsedCorporateAction | null => {
  const rowLabel = `[symbol=${row.symbol ?? '?'} subject="${row.subject ?? ''}"]`;

  try {
    const symbol = (row.symbol ?? '').trim().toUpperCase();
    if (!symbol) {
      warnings.push(`Row ${rowLabel}: missing symbol; skipped.`);
      return null;
    }

    const effectiveDate = parseNseExDate(String(row.exDate ?? ''));
    if (!effectiveDate) {
      warnings.push(`Row ${rowLabel}: unparseable or empty exDate "${row.exDate}"; skipped.`);
      return null;
    }

    const rawPurpose = String(row.subject ?? '').trim();
    const parsed = parseNseSubject(rawPurpose);

    if (parsed === null) {
      warnings.push(`Row ${rowLabel}: unrecognised subject "${rawPurpose}"; skipped.`);
      return null;
    }

    const action: ParsedCorporateAction = {
      symbol,
      actionType: parsed.actionType,
      effectiveDate,
      source,
      rawPurpose,
    };

    if (parsed.actionType === 'dividend') {
      action.amount = parsed.amount;
    } else if (parsed.actionType === 'rights') {
      // CB-15: store TERP inputs; adjustment engine computes TERP factor using cum_price.
      action.rightsRatio = parsed.rightsRatio;
      action.issuePrice = parsed.issuePrice;
    } else if (parsed.actionType === 'rights_unparseable') {
      // CB-15 fallback: ratio/price not extractable — store for audit; no factor applied.
      warnings.push(
        `Row ${rowLabel}: rights issue — ratio/price not parseable from subject; stored as rights_unparseable. ` +
        `Manual review required. Raw subject: "${rawPurpose}".`
      );
    } else if (
      parsed.actionType === 'merger' ||
      parsed.actionType === 'demerger' ||
      parsed.actionType === 'spinoff'
    ) {
      // CB-16: store structural-break event; adjustment engine will flag discontinuity.
      warnings.push(
        `Row ${rowLabel}: ${parsed.actionType} recognised — stored as price-series discontinuity marker. ` +
        `No adjustment factor derived. Raw subject: "${rawPurpose}".`
      );
    } else {
      // split / bonus / reverse_split
      action.splitRatio = (parsed as { actionType: string; splitRatio: number }).splitRatio;
    }

    return action;
  } catch (err) {
    warnings.push(
      `Row ${rowLabel}: unexpected error during parsing — ${err instanceof Error ? err.message : String(err)}; skipped.`
    );
    return null;
  }
};

// ---------------------------------------------------------------------------
// Main parser (list of rows → ParseNseCorporateActionsResult)
// ---------------------------------------------------------------------------

/**
 * Parse an array of raw NSE corporate-action API rows.
 * Per-row error isolation: a bad row produces a warning and increments skipped.
 */
export const parseNseCorporateActions = (
  rows: NseCorporateActionRow[],
  options: ParseNseCorporateActionsOptions = {}
): ParseNseCorporateActionsResult => {
  const source = options.source ?? NSE_CORPORATE_ACTIONS_SOURCE;
  const warnings: string[] = [];
  const parsed: ParsedCorporateAction[] = [];
  let skipped = 0;

  for (const row of rows) {
    const result = parseNseCorporateActionRow(row, source, warnings);
    if (result) {
      parsed.push(result);
    } else {
      skipped += 1;
    }
  }

  return { parsed, skipped, warnings };
};

// ---------------------------------------------------------------------------
// Natural-key builder (idempotent, matches repository convention)
// ---------------------------------------------------------------------------

/**
 * Build the natural key for a parsed action so it can be compared with
 * the keys generated by the repository's corporateActionNaturalKeyFromParts.
 *
 * Key format (matches repository):
 *   stockId | actionType | YYYY-MM-DD | source | amountKey | splitRatioKey
 *
 * For rights actions (CB-15): splitRatioKey carries rightsRatio (the primary
 * numeric discriminator) so upserts correctly deduplicate re-runs.
 * For merger/demerger/spinoff (CB-16): both numeric segments are 'null' —
 * uniqueness comes from stockId + actionType + date.
 */
export const buildCorporateActionNaturalKey = (
  stockId: string,
  action: Pick<ParsedCorporateAction, 'actionType' | 'effectiveDate' | 'source' | 'amount' | 'splitRatio' | 'rightsRatio'>
): string => {
  const dateStr = action.effectiveDate.toISOString().slice(0, 10);
  const amountKey = decimalKey(action.amount);
  // For rights: use rightsRatio as the key's numeric discriminator.
  const splitRatioKey = decimalKey(action.splitRatio ?? action.rightsRatio);
  return [
    stockId,
    action.actionType.toLowerCase(),
    dateStr,
    (action.source || 'unknown').toLowerCase(),
    amountKey,
    splitRatioKey,
  ].join('|');
};

const decimalKey = (val: number | null | undefined): string => {
  if (val === null || val === undefined) return 'null';
  const n = Number(val);
  if (!Number.isFinite(n)) return 'null';
  // Match the repository's corporateActionNaturalKeyFromParts convention exactly:
  //   numeric.toFixed(8).replace(/\.?0+$/, '')
  return n.toFixed(8).replace(/\.?0+$/, '');
};

// ---------------------------------------------------------------------------
// Import mapper (dependency-injected, no real DB)
// ---------------------------------------------------------------------------

/**
 * Map parsed corporate actions to DB upserts.
 *
 * @param parsedActions  Output of parseNseCorporateActions().parsed
 * @param symbolToStockId  Pure lookup fn: symbol → stockId | undefined
 * @param upsertFn  Injected upsert function (matches repository signature)
 * @param options   Optional overrides
 * @returns  Counts + any additional warnings from the mapping stage
 */
export const importNseCorporateActions = async (
  parsedActions: ParsedCorporateAction[],
  symbolToStockId: (symbol: string) => string | undefined,
  upsertFn: CorporateActionsUpsertFn,
  options: ImportMappingOptions = {}
): Promise<ImportMappingResult> => {
  const source = options.source ?? NSE_CORPORATE_ACTIONS_SOURCE;
  const warnings: string[] = [];
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let rejected = 0;

  // Group actions by stockId so we do one upsert call per stock
  const byStockId = new Map<string, CorporateActionDbInput[]>();
  const seenNaturalKeys = new Set<string>();

  for (const action of parsedActions) {
    const stockId = symbolToStockId(action.symbol);
    if (!stockId) {
      skipped += 1;
      warnings.push(`Symbol "${action.symbol}" not found in catalog; action on ${action.effectiveDate.toISOString().slice(0, 10)} skipped.`);
      continue;
    }

    const naturalKey = buildCorporateActionNaturalKey(stockId, action);
    if (seenNaturalKeys.has(naturalKey)) {
      skipped += 1;
      warnings.push(`Duplicate naturalKey "${naturalKey}" within batch; second occurrence skipped.`);
      continue;
    }
    seenNaturalKeys.add(naturalKey);

    const dbInput: CorporateActionDbInput = {
      symbol: action.symbol,
      type: action.actionType,
      date: action.effectiveDate.toISOString().slice(0, 10),
      // value: primary numeric identifier for the action type.
      // For rights: store rightsRatio so downstream queries can read it without
      // needing the extended fields (same slot pattern as splitRatio for splits).
      value: action.amount ?? action.rightsRatio ?? action.splitRatio ?? 0,
      amount: action.amount ?? null,
      splitRatio: action.splitRatio ?? null,
      rightsRatio: action.rightsRatio ?? null,
      issuePrice: action.issuePrice ?? null,
      currency: action.actionType === 'dividend' ? 'INR' : null,
      source,
    };

    const group = byStockId.get(stockId) ?? [];
    group.push(dbInput);
    byStockId.set(stockId, group);
  }

  // Upsert per stock
  for (const [stockId, actions] of byStockId.entries()) {
    try {
      const ops = await upsertFn(stockId, actions);
      // We count all ops as inserted (upsert is idempotent; repository handles
      // create vs update internally).  If the caller needs finer granularity it
      // can wrap the upsertFn to track create vs update.
      inserted += ops.length;
    } catch (err) {
      rejected += actions.length;
      warnings.push(
        `Upsert failed for stockId "${stockId}" (${actions.length} action(s)): ` +
        `${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return { inserted, updated, skipped, rejected, warnings };
};
