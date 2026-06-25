// Forthcoming / ongoing IPO source — NSE + BSE public calendars (FREE, India = in-policy).
// Mirrors the bounded-fetch + defensive-parse style of calendar.fred-source.ts. Two hard rules:
//   1. PERSISTED-READ SAFETY: every fetch path is self-guarding — any network/parse failure
//      resolves to [] (never throws into the refresh), so a flaky exchange just leaves the
//      last snapshot stale rather than 500-ing the calendar.
//   2. NO FABRICATION: only fields the exchange actually returns are mapped; missing price
//      band / issue size / dates stay null. Research-support framing only.
//
// NSE's JSON is cookie-gated: a browser-like warm-up GET seeds a session cookie that the
// /api/* issue endpoint then requires. Endpoints are env-overridable so the owner can repoint
// them without a code change if a path moves.

import type { UpcomingIpoRecord } from './calendar.types';

const NSE_WARMUP_URL = process.env.NSE_IPO_WARMUP_URL || 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo';
const NSE_IPO_URL = process.env.NSE_IPO_URL || 'https://www.nseindia.com/api/all-upcoming-issues?category=ipo';
// BSE exposes active/forthcoming issues as JSON; Referer/Origin to bseindia.com are required.
const BSE_IPO_URL = process.env.BSE_IPO_URL || 'https://api.bseindia.com/BseIndiaAPI/api/GetIPODispler/w?type=0';

const HTTP_TIMEOUT_MS = Number(process.env.IPO_HTTP_TIMEOUT_MS || 15000);
const HTTP_MAX_ATTEMPTS = Number(process.env.IPO_HTTP_MAX_ATTEMPTS || 3);
const HTTP_BACKOFF_BASE_MS = Number(process.env.IPO_HTTP_BACKOFF_BASE_MS || 700);

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ---- Parsing helpers (pure, exported for unit tests) ----------------------

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** Parse the exchange date formats we see: "12-Jun-2026", "2026-06-12", "12/06/2026". UTC midnight. */
export function parseIpoDate(value: unknown): Date | null {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  // DD-MMM-YYYY (NSE)
  const mmm = raw.match(/^(\d{1,2})[-\s]([A-Za-z]{3})[-\s](\d{4})$/);
  if (mmm) {
    const month = MONTHS[mmm[2].toLowerCase()];
    if (month != null) return new Date(Date.UTC(Number(mmm[3]), month, Number(mmm[1])));
  }
  // DD/MM/YYYY (BSE)
  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return new Date(Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1])));

  // ISO-ish (YYYY-MM-DD or full ISO) — normalize to UTC midnight.
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
  }
  return null;
}

/** Parse a price band like "108 - 114", "₹108 to ₹114", "114" → {min,max}. */
export function parsePriceBand(value: unknown): { min: number | null; max: number | null } {
  if (value == null) return { min: null, max: null };
  const nums = String(value).match(/\d+(?:\.\d+)?/g);
  if (!nums || !nums.length) return { min: null, max: null };
  const parsed = nums.map(Number).filter((n) => Number.isFinite(n));
  if (!parsed.length) return { min: null, max: null };
  return { min: Math.min(...parsed), max: Math.max(...parsed) };
}

function toNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(String(value).replace(/[, ]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function nonEmpty(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

/** UTC-midnight "today" for status derivation (testable via injected `now`). */
function utcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Derive UPCOMING vs ONGOING from the subscription window, or null to DROP the row
 * (closed subscription with the listing already in the past — that belongs to the listed/Closed
 * tab, not the forthcoming feed). An explicit exchange status string takes precedence.
 */
export function deriveIpoStatus(
  explicit: string | null,
  openDate: Date | null,
  closeDate: Date | null,
  expectedListingDate: Date | null,
  now: Date,
): 'UPCOMING' | 'ONGOING' | null {
  const today = utcDay(now).getTime();
  const tag = (explicit || '').toLowerCase();
  if (/open|active|ongoing|current/.test(tag)) return 'ONGOING';
  if (/forthcoming|upcoming/.test(tag)) return 'UPCOMING';

  if (openDate && closeDate) {
    if (today < openDate.getTime()) return 'UPCOMING';
    if (today >= openDate.getTime() && today <= closeDate.getTime()) return 'ONGOING';
    // Subscription closed: keep only while awaiting listing (listing today/future or unknown).
    if (!expectedListingDate || expectedListingDate.getTime() >= today) return 'UPCOMING';
    return null;
  }
  if (openDate && today < openDate.getTime()) return 'UPCOMING';
  if (closeDate && today <= closeDate.getTime()) return 'ONGOING';
  // No usable window — surface as UPCOMING only if a future listing is known, else drop.
  if (expectedListingDate && expectedListingDate.getTime() >= today) return 'UPCOMING';
  return null;
}

// ---- Normalizers (pure, exported for unit tests) --------------------------

/** Map one NSE all-upcoming-issues row → normalized record (or null to drop). */
export function normalizeNseRow(row: any, now: Date): UpcomingIpoRecord | null {
  const companyName = nonEmpty(row?.companyName ?? row?.company ?? row?.name);
  if (!companyName) return null;

  const openDate = parseIpoDate(row?.issueStartDate ?? row?.startDate ?? row?.bidStartDate);
  const closeDate = parseIpoDate(row?.issueEndDate ?? row?.endDate ?? row?.bidEndDate);
  const expectedListingDate = parseIpoDate(row?.listingDate ?? row?.expectedListingDate);
  const status = deriveIpoStatus(nonEmpty(row?.status), openDate, closeDate, expectedListingDate, now);
  if (!status) return null;

  const band = parsePriceBand(row?.issuePrice ?? row?.priceBand ?? row?.price);
  const series = nonEmpty(row?.series);
  const ipoType = series && /sme/i.test(series) ? 'SME' : 'MAINBOARD';

  return {
    source: 'NSE',
    exchange: 'NSE',
    ipoType,
    symbol: nonEmpty(row?.symbol),
    companyName,
    status,
    openDate,
    closeDate,
    priceBandMin: band.min,
    priceBandMax: band.max,
    issueSizeCr: toNumber(row?.issueSize ?? row?.issueSizeCr),
    lotSize: toNumber(row?.lotSize ?? row?.lot) as number | null,
    expectedListingDate,
    sourceUrl: 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',
    raw: row,
  };
}

/** Map one BSE GetIPODispler row → normalized record (or null to drop). */
export function normalizeBseRow(row: any, now: Date): UpcomingIpoRecord | null {
  const companyName = nonEmpty(row?.CompanyName ?? row?.scrip_name ?? row?.Company ?? row?.companyName);
  if (!companyName) return null;

  const openDate = parseIpoDate(row?.IPOOpenDate ?? row?.OpenDate ?? row?.StartDate);
  const closeDate = parseIpoDate(row?.IPOCloseDate ?? row?.CloseDate ?? row?.EndDate);
  const expectedListingDate = parseIpoDate(row?.ListingDate ?? row?.ExpListingDate);
  const status = deriveIpoStatus(nonEmpty(row?.Status ?? row?.IPOStatus), openDate, closeDate, expectedListingDate, now);
  if (!status) return null;

  const band = parsePriceBand(row?.PriceBand ?? row?.Price ?? `${row?.MinPrice ?? ''} ${row?.MaxPrice ?? ''}`);
  const flag = nonEmpty(row?.Flag ?? row?.Category ?? row?.IPOType);
  const ipoType = flag && /sme/i.test(flag) ? 'SME' : 'MAINBOARD';

  return {
    source: 'BSE',
    exchange: 'BSE',
    ipoType,
    symbol: nonEmpty(row?.Symbol ?? row?.scrip_cd),
    companyName,
    status,
    openDate,
    closeDate,
    priceBandMin: band.min,
    priceBandMax: band.max,
    issueSizeCr: toNumber(row?.IssueSize ?? row?.Size),
    lotSize: toNumber(row?.MarketLot ?? row?.LotSize) as number | null,
    expectedListingDate,
    sourceUrl: 'https://www.bseindia.com/publicissue.html',
    raw: row,
  };
}

/** Pull the row array out of the various envelope shapes NSE/BSE use. */
function extractRows(json: any): any[] {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.Table)) return json.Table; // BSE classic envelope
  if (Array.isArray(json?.records)) return json.records;
  return [];
}

// ---- Bounded fetch (timeout + retry/backoff) ------------------------------

async function fetchJsonOnce(url: string, headers: Record<string, string>): Promise<{ json: any; setCookie: string[] }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, headers });
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
    // undici exposes getSetCookie(); fall back to the single combined header otherwise.
    const setCookie =
      typeof (response.headers as any).getSetCookie === 'function'
        ? (response.headers as any).getSetCookie()
        : ([response.headers.get('set-cookie')].filter(Boolean) as string[]);
    const text = await response.text();
    return { json: text ? JSON.parse(text) : null, setCookie };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url: string, headers: Record<string, string>): Promise<{ json: any; setCookie: string[] }> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= HTTP_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await fetchJsonOnce(url, headers);
    } catch (error) {
      lastError = error as Error;
      if (attempt === HTTP_MAX_ATTEMPTS) throw lastError;
      await sleep(HTTP_BACKOFF_BASE_MS * 2 ** (attempt - 1) + attempt * 97);
    }
  }
  throw lastError ?? new Error('IPO fetch failed');
}

/** Reduce a Set-Cookie array to a "k=v; k=v" request Cookie header. */
function cookieHeader(setCookie: string[]): string {
  return setCookie.map((c) => c.split(';')[0]).filter(Boolean).join('; ');
}

// ---- Public fetchers (self-guarding: [] on any failure) -------------------

/** NSE forthcoming/ongoing IPOs. Warm-up GET seeds the session cookie the /api endpoint needs. */
export async function fetchNseUpcomingIpos(now: Date = new Date()): Promise<UpcomingIpoRecord[]> {
  try {
    const baseHeaders = {
      'User-Agent': BROWSER_UA,
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
    };
    let cookie = '';
    try {
      const warm = await fetchJsonOnce(NSE_WARMUP_URL, { ...baseHeaders, Accept: 'text/html' });
      cookie = cookieHeader(warm.setCookie);
    } catch {
      // Warm-up may return HTML that fails JSON.parse — the cookies still arrive on the throw path
      // in some runtimes; proceed cookie-less and let the API attempt (and its retry) decide.
    }
    const { json } = await fetchJson(NSE_IPO_URL, {
      ...baseHeaders,
      Referer: NSE_WARMUP_URL,
      ...(cookie ? { Cookie: cookie } : {}),
    });
    return extractRows(json)
      .map((r) => normalizeNseRow(r, now))
      .filter((r): r is UpcomingIpoRecord => r != null);
  } catch {
    return [];
  }
}

/** BSE forthcoming/ongoing IPOs. */
export async function fetchBseUpcomingIpos(now: Date = new Date()): Promise<UpcomingIpoRecord[]> {
  try {
    const { json } = await fetchJson(BSE_IPO_URL, {
      'User-Agent': BROWSER_UA,
      Accept: 'application/json, text/plain, */*',
      Referer: 'https://www.bseindia.com/publicissue.html',
      Origin: 'https://www.bseindia.com',
    });
    return extractRows(json)
      .map((r) => normalizeBseRow(r, now))
      .filter((r): r is UpcomingIpoRecord => r != null);
  } catch {
    return [];
  }
}

/**
 * Combined NSE + BSE feed, de-duplicated by company name (an issue listed on both exchanges
 * appears once, NSE preferred). Each source is independently self-guarding, so one exchange
 * being down still yields the other's rows.
 */
export async function fetchUpcomingIpos(now: Date = new Date()): Promise<UpcomingIpoRecord[]> {
  const [nse, bse] = await Promise.all([fetchNseUpcomingIpos(now), fetchBseUpcomingIpos(now)]);
  const byCompany = new Map<string, UpcomingIpoRecord>();
  for (const rec of [...nse, ...bse]) {
    const key = rec.companyName.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!byCompany.has(key)) byCompany.set(key, rec);
  }
  return [...byCompany.values()];
}
