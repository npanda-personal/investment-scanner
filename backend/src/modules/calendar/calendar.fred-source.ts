// FRED economic-calendar source — fetches the public release SCHEDULE
// (/fred/releases/dates) plus latest actual/previous observations for a small mapped
// subset of headline releases. Local bounded-fetch helper (timeout + retry/backoff),
// modeled on market-context-intelligence.fred-ingest.service.ts but NOT deep-imported.
//
// FREE St. Louis Fed (FRED). US/global macro only; FRED carries NO forecasts, so the
// calendar shows release date + latest actual + previous value (never an estimate).
// API key read ONLY from process.env.FRED_API_KEY; unset → graceful skip (no throw).

const FRED_RELEASES_URL = 'https://api.stlouisfed.org/fred/releases';
const FRED_RELEASE_DATES_URL = 'https://api.stlouisfed.org/fred/release/dates';
const FRED_OBSERVATIONS_URL = 'https://api.stlouisfed.org/fred/series/observations';

const HTTP_TIMEOUT_MS = Number(process.env.FRED_HTTP_TIMEOUT_MS || 20000);
const HTTP_MAX_ATTEMPTS = Number(process.env.FRED_HTTP_MAX_ATTEMPTS || 3);
const HTTP_BACKOFF_BASE_MS = Number(process.env.FRED_HTTP_BACKOFF_BASE_MS || 800);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface FredReleaseDate {
  releaseId: string;
  releaseName: string;
  /** ISO date (YYYY-MM-DD) the release is/was published. */
  date: string;
}

/** Headline release → representative FRED series, so we can attach actual/previous values. */
interface SeriesMapping {
  match: RegExp;
  seriesId: string;
  unit: string;
}

// Small, conservative map of widely-followed US headline releases. Patterns are ANCHORED to
// the exact FRED release name so we don't over-match derived releases (e.g. "Gross Domestic
// Product by State", "Research Consumer Price Index"). We never fabricate values — only mapped
// headline releases are surfaced, each with its representative series' actual/previous.
export const ECONOMIC_SERIES_MAP: SeriesMapping[] = [
  { match: /^consumer price index$/i, seriesId: 'CPIAUCSL', unit: 'Index 1982-84=100' },
  { match: /^employment situation$/i, seriesId: 'UNRATE', unit: '% unemployment' },
  { match: /^gross domestic product$/i, seriesId: 'GDP', unit: '$B (SAAR)' },
  { match: /^personal income and outlays$/i, seriesId: 'PCEPI', unit: 'PCE price index' },
  { match: /^producer price index$/i, seriesId: 'PPIACO', unit: 'Index' },
  { match: /^h\.15 selected interest rates$/i, seriesId: 'DFF', unit: '% fed funds' },
  { match: /^monthly retail trade and food services$/i, seriesId: 'RSAFS', unit: '$M retail sales' },
];

export function mapReleaseToSeries(releaseName: string): SeriesMapping | null {
  return ECONOMIC_SERIES_MAP.find((m) => m.match.test(releaseName)) ?? null;
}

/** Returns the FRED API key from env, or null when unset/blank. NEVER hardcoded/logged. */
export function getFredApiKey(): string | null {
  const key = (process.env.FRED_API_KEY || '').trim();
  return key.length > 0 ? key : null;
}

async function fetchJsonOnce(url: string): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'investment-scanner/calendar-fred' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url: string): Promise<any> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= HTTP_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await fetchJsonOnce(url);
    } catch (error) {
      lastError = error as Error;
      if (attempt === HTTP_MAX_ATTEMPTS) throw lastError;
      await sleep(HTTP_BACKOFF_BASE_MS * 2 ** (attempt - 1) + attempt * 113);
    }
  }
  throw lastError ?? new Error('FRED fetch failed');
}

/** Parse a FRED numeric value; "." / "" / non-numeric → null. Exported for tests. */
export function parseFredValue(value: string | null | undefined): number | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (trimmed === '' || trimmed === '.') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/**
 * All FRED releases (one page; ~330 today). Used to resolve headline release NAMES → release_ids.
 * The global /releases/dates firehose can't be event-date filtered server-side and its newest-first
 * paging is dominated by far-future scheduled placeholder dates (out to 2027+), so a window around
 * "now" never appears in a bounded page. Instead we resolve the few mapped releases and fetch each
 * release's own schedule (which DOES window cleanly).
 */
export async function fetchReleasesCatalog(
  apiKey: string,
): Promise<{ releaseId: string; releaseName: string }[]> {
  const params = new URLSearchParams({ api_key: apiKey, file_type: 'json', limit: '1000' });
  const json = await fetchJson(`${FRED_RELEASES_URL}?${params.toString()}`);
  const raw: any[] = Array.isArray(json?.releases) ? json.releases : [];
  return raw
    .map((r) => ({ releaseId: String(r?.id ?? ''), releaseName: String(r?.name ?? '').trim() }))
    .filter((r) => r.releaseId && r.releaseName);
}

/**
 * Schedule dates for ONE release within [from, to]. include_release_dates_with_no_data=true keeps
 * scheduled-but-unreleased future dates so upcoming events show.
 */
export async function fetchReleaseDatesForRelease(
  apiKey: string,
  releaseId: string,
  releaseName: string,
  from: Date,
  to: Date,
): Promise<FredReleaseDate[]> {
  const params = new URLSearchParams({
    release_id: releaseId,
    api_key: apiKey,
    file_type: 'json',
    sort_order: 'desc',
    include_release_dates_with_no_data: 'true',
    limit: '200',
  });
  const json = await fetchJson(`${FRED_RELEASE_DATES_URL}?${params.toString()}`);
  const raw: any[] = Array.isArray(json?.release_dates) ? json.release_dates : [];

  const fromMs = from.getTime();
  const toMs = to.getTime();
  const out: FredReleaseDate[] = [];
  for (const r of raw) {
    const dateStr = String(r?.date ?? '');
    const t = new Date(dateStr).getTime();
    if (Number.isNaN(t) || t < fromMs || t > toMs) continue;
    out.push({ releaseId, releaseName, date: dateStr });
  }
  return out;
}

/**
 * Headline economic-release schedule within [from, to]: resolve the mapped releases from the catalog,
 * then fetch each one's own dates. Bounded to (1 + N_mapped) requests. A single release's failure is
 * swallowed (collected as a warning by the caller via the returned partial set) so one bad release
 * never sinks the whole ingest.
 */
export async function fetchMappedReleaseDates(
  apiKey: string,
  from: Date,
  to: Date,
): Promise<FredReleaseDate[]> {
  const catalog = await fetchReleasesCatalog(apiKey);
  const mapped = catalog.filter((r) => mapReleaseToSeries(r.releaseName));
  const out: FredReleaseDate[] = [];
  for (const rel of mapped) {
    try {
      const dates = await fetchReleaseDatesForRelease(apiKey, rel.releaseId, rel.releaseName, from, to);
      out.push(...dates);
    } catch {
      // Skip this release; partial coverage is better than a total failure.
    }
  }
  return out;
}

/** Latest two finite observations for a series → { actual, previous }. */
export async function fetchLatestActualPrevious(
  seriesId: string,
  apiKey: string,
): Promise<{ actual: number | null; previous: number | null }> {
  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: 'json',
    sort_order: 'desc',
    limit: '10',
  });
  const json = await fetchJson(`${FRED_OBSERVATIONS_URL}?${params.toString()}`);
  const obs: any[] = Array.isArray(json?.observations) ? json.observations : [];
  const finite: number[] = [];
  for (const o of obs) {
    const v = parseFredValue(o?.value);
    if (v !== null) finite.push(v);
    if (finite.length >= 2) break;
  }
  return { actual: finite[0] ?? null, previous: finite[1] ?? null };
}
