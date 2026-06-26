/**
 * SEC EDGAR client (FREE, official US-gov data — no API key, User-Agent only).
 *
 *  - CIK↔ticker map: https://www.sec.gov/files/company_tickers.json
 *  - Company submissions (name, SIC sector): https://data.sec.gov/submissions/CIK##########.json
 *  - XBRL company facts (fundamentals): https://data.sec.gov/api/xbrl/companyfacts/CIK##########.json
 *
 * SEC fair-access asks for a descriptive User-Agent and ~10 req/s; set
 * SEC_EDGAR_USER_AGENT to a real contact string. Pure fetch helpers — no DB.
 * No paid provider is ever used.
 */

import { getSecEndpoints } from '../market-data-foundation.endpoints';

export const SEC_BASE = getSecEndpoints().dataBase.url;
export const SEC_WWW = getSecEndpoints().wwwBase.url;
export const SEC_EDGAR_USER_AGENT =
  process.env.SEC_EDGAR_USER_AGENT || 'investment-scanner research (contact: admin@example.com)';
export const SEC_EDGAR_THROTTLE_MS = Number(process.env.SEC_EDGAR_THROTTLE_MS || 200);
const USER_AGENT = SEC_EDGAR_USER_AGENT;
const THROTTLE_MS = SEC_EDGAR_THROTTLE_MS;
const HTTP_TIMEOUT_MS = Number(process.env.SEC_EDGAR_HTTP_TIMEOUT_MS || 25000);

export const secSleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const sleep = secSleep;

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch raw text (XML/HTML) from SEC with the fair-access User-Agent, applying
 * the same timeout convention as fetchJson. Used by the Form 4 ownership-XML
 * parser. Pure fetch — no DB.
 */
export async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/xml,text/html,*/*', 'User-Agent': USER_AGENT },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch raw bytes (e.g. a structured-data zip) from SEC with the fair-access
 * User-Agent. Used by the 13F data-set ingest. Pure fetch — no DB.
 */
export async function fetchBuffer(url: string): Promise<Buffer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/zip,application/octet-stream,*/*', 'User-Agent': USER_AGENT },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timer);
  }
}

/** A single filing entry distilled from submissions.filings.recent. */
export interface SecRecentFiling {
  form: string;
  filingDate: string;
  accessionNumber: string;
  primaryDocument: string;
}

/**
 * Fetch the company submissions JSON and return the flattened `filings.recent`
 * rows (form, filingDate, accessionNumber, primaryDocument). Throttled. No DB.
 */
export async function fetchRecentFilings(cik: string): Promise<SecRecentFiling[]> {
  const data = (await fetchJson(`${SEC_BASE}/submissions/CIK${padCik(cik)}.json`)) as {
    filings?: {
      recent?: {
        form?: string[];
        filingDate?: string[];
        accessionNumber?: string[];
        primaryDocument?: string[];
      };
    };
  };
  await sleep(THROTTLE_MS);
  return parseRecentFilings(data);
}

/**
 * Pure parser: flatten a submissions JSON object's `filings.recent` columnar
 * arrays into row objects. Exported for unit testing without network.
 */
export function parseRecentFilings(data: unknown): SecRecentFiling[] {
  const recent = (data as {
    filings?: {
      recent?: {
        form?: string[];
        filingDate?: string[];
        accessionNumber?: string[];
        primaryDocument?: string[];
      };
    };
  })?.filings?.recent;
  if (!recent || !Array.isArray(recent.form)) return [];
  const forms = recent.form ?? [];
  const dates = recent.filingDate ?? [];
  const accessions = recent.accessionNumber ?? [];
  const docs = recent.primaryDocument ?? [];
  const out: SecRecentFiling[] = [];
  for (let i = 0; i < forms.length; i += 1) {
    out.push({
      form: forms[i] ?? '',
      filingDate: dates[i] ?? '',
      accessionNumber: accessions[i] ?? '',
      primaryDocument: docs[i] ?? '',
    });
  }
  return out;
}

/** Strip the dashes from an accession number (0000320193-24-000123 → 000032019324000123). */
export function accessionNoDashes(accession: string): string {
  return accession.replace(/-/g, '');
}

/** Build the Archives URL for a filing's primary document. cik may be padded or not. */
export function archiveDocumentUrl(cik: string, accession: string, primaryDocument: string): string {
  const cikNoPad = String(Number(padCik(cik))); // drop leading zeros for the data path
  return `${SEC_WWW}/Archives/edgar/data/${cikNoPad}/${accessionNoDashes(accession)}/${primaryDocument}`;
}

/** Pad a numeric CIK to the 10-digit zero-padded form SEC URLs require. */
export function padCik(cik: number | string): string {
  return String(cik).replace(/\D/g, '').padStart(10, '0');
}

let cikMapCache: Map<string, string> | null = null;

/** Ticker (UPPER) → zero-padded CIK, from the public company_tickers.json. Cached. */
export async function loadTickerCikMap(): Promise<Map<string, string>> {
  if (cikMapCache) return cikMapCache;
  const data = (await fetchJson(`${SEC_WWW}/files/company_tickers.json`)) as Record<string, { cik_str: number; ticker: string }>;
  const map = new Map<string, string>();
  for (const row of Object.values(data)) {
    if (row && row.ticker) map.set(String(row.ticker).toUpperCase(), padCik(row.cik_str));
  }
  cikMapCache = map;
  return map;
}

export interface SecSubmission {
  name: string | null;
  sic: string | null;
  sicDescription: string | null;
}

export async function fetchSubmission(cik: string): Promise<SecSubmission> {
  const data = (await fetchJson(`${SEC_BASE}/submissions/CIK${padCik(cik)}.json`)) as {
    name?: string; sic?: string; sicDescription?: string;
  };
  await sleep(THROTTLE_MS);
  return {
    name: data.name ?? null,
    sic: data.sic ?? null,
    sicDescription: data.sicDescription ?? null,
  };
}

/** A single XBRL fact value point. */
export interface XbrlFact {
  /** Period start (duration concepts only; absent for instant concepts like shares). */
  start?: string;
  end: string;
  val: number;
  fy?: number;
  fp?: string;
  form?: string;
  filed?: string;
}

export interface CompanyFacts {
  /** us-gaap concept → unit → ordered fact points. */
  usGaap: Record<string, Record<string, XbrlFact[]>>;
  dei: Record<string, Record<string, XbrlFact[]>>;
}

export async function fetchCompanyFacts(cik: string): Promise<CompanyFacts> {
  const data = (await fetchJson(`${SEC_BASE}/api/xbrl/companyfacts/CIK${padCik(cik)}.json`)) as {
    facts?: { 'us-gaap'?: Record<string, { units?: Record<string, XbrlFact[]> }>; dei?: Record<string, { units?: Record<string, XbrlFact[]> }> };
  };
  await sleep(THROTTLE_MS);
  const flatten = (group?: Record<string, { units?: Record<string, XbrlFact[]> }>) => {
    const out: Record<string, Record<string, XbrlFact[]>> = {};
    for (const [concept, body] of Object.entries(group || {})) {
      out[concept] = body.units || {};
    }
    return out;
  };
  return { usGaap: flatten(data.facts?.['us-gaap']), dei: flatten(data.facts?.dei) };
}

/** Latest fact value across the given concept names (first match wins), in `unit`. */
export function latestFact(facts: CompanyFacts, concepts: string[], unit: string, group: 'usGaap' | 'dei' = 'usGaap'): XbrlFact | null {
  const source = facts[group];
  for (const concept of concepts) {
    const units = source[concept];
    const points = units && units[unit];
    if (points && points.length) {
      // Points are chronological; take the most recent by `end`.
      return [...points].sort((a, b) => (a.end < b.end ? -1 : 1))[points.length - 1];
    }
  }
  return null;
}

/** One annual fiscal-year data point distilled from the XBRL fact array. */
export interface AnnualFact {
  /** Fiscal year-end date (YYYY-MM-DD) — used as the Fundamental periodEndDate. */
  end: string;
  val: number;
  fy?: number;
}

/** SEC annual-report forms whose `fp='FY'` facts represent a full fiscal year. */
function isAnnualForm(form?: string): boolean {
  return !!form && /^(10-K|20-F|40-F)/.test(form);
}

/** Days between two ISO dates, or null if unparseable. */
function spanDays(start?: string, end?: string): number | null {
  if (!start || !end) return null;
  const a = Date.parse(start);
  const b = Date.parse(end);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return (b - a) / (24 * 60 * 60 * 1000);
}

/**
 * Annual (fiscal-year) series for the first matching concept, most-recent-first.
 *
 * Keeps only genuine full-year facts: `fp='FY'`, an annual-report form
 * (10-K/20-F/40-F), and a ~365-day duration (350..380, guarding against
 * mis-tagged year-to-date entries).  Restatements are de-duplicated by fiscal
 * year-end (`end`), preferring the LATEST `filed` value.  Mirrors `latestFact`'s
 * concept-fallback (first concept that yields any annual data wins) so revenue /
 * net-income / EPS each resolve their best available tag.
 *
 * Pure — no I/O.  Returns [] when no annual facts are present (graceful: the
 * caller simply writes no ANNUAL rows for that stock).
 */
export function annualSeries(
  facts: CompanyFacts,
  concepts: string[],
  unit: string,
  group: 'usGaap' | 'dei' = 'usGaap',
): AnnualFact[] {
  const source = facts[group];
  for (const concept of concepts) {
    const points = source[concept]?.[unit];
    if (!points || !points.length) continue;
    const byEnd = new Map<string, { end: string; val: number; fy?: number; filed?: string }>();
    for (const p of points) {
      if (p.fp !== 'FY' || !isAnnualForm(p.form) || !p.end) continue;
      const days = spanDays(p.start, p.end);
      if (days === null || days < 350 || days > 380) continue;
      const prev = byEnd.get(p.end);
      // Prefer the latest filing for a given fiscal year-end (restatement wins).
      if (!prev || (p.filed ?? '') > (prev.filed ?? '')) {
        byEnd.set(p.end, { end: p.end, val: p.val, fy: p.fy, filed: p.filed });
      }
    }
    if (byEnd.size) {
      // First concept that yields annual data wins (no cross-concept merge): a company
      // that switched revenue XBRL tags mid-history gets only one tag's years, so the
      // series can be gapped. Downstream skips null-revenue years gracefully (margin/
      // revenue vote omitted, EPS unaffected). Cross-tag merge is a tracked follow-up.
      return [...byEnd.values()]
        .sort((a, b) => (a.end < b.end ? 1 : -1))
        .map(({ end, val, fy }) => ({ end, val, fy }));
    }
  }
  return [];
}
