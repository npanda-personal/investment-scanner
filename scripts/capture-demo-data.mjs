/**
 * Capture demo data for the static GitHub Pages build.
 *
 * Run LOCALLY against the running backend (localhost:3000):
 *     node scripts/capture-demo-data.mjs
 *
 * Captures trader-facing endpoints for IN and US regions (STOCK only).
 * Scope: Daily Decisions + Discover sections + Instrument detail page.
 * Excluded: portfolios, watchlists, alerts, notifications, crypto, admin-only,
 * copilot, and price history (chart tab renders blank with TradingView link).
 *
 * Manifest key convention:
 *   - Region-scoped:  "/api/v1/signals/top?region=IN"
 *   - Compound param: "/api/v1/.../sector-constituents?region=IN&sector=Technology"
 *   - Non-scoped:     "/api/v1/auth/me"
 *
 * The demo adapter (frontend/src/demo/demoAdapter.ts) reads config.params.region
 * and tries the scoped key first, falling back to the bare path.
 *
 * Auth: reuses the token from the Playwright auth-state file; if missing/expired
 * it performs ONE login (test creds). Capture is tolerant: non-2xx responses are
 * logged and skipped.
 *
 * Excluded: portfolios, watchlists, alerts, notifications, crypto, admin-only.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(moduleDir, '..');
const OUT_DIR = path.join(ROOT, 'frontend', 'public', 'demo-api');
const AUTH_STATE_PATH = path.join(ROOT, 'frontend', 'tests', 'ui', 'support', '.auth-state.json');

const BACKEND = process.env.E2E_BACKEND_URL || 'http://localhost:3000';
const EMAIL = process.env.E2E_EMAIL || 'test@example.com';
const PASSWORD = process.env.E2E_PASSWORD || 'TestUser123!';
const REGIONS = ['IN', 'US'];

const manifest = {};
let token = '';
let ok = 0;
let skipped = 0;

// ---- auth ------------------------------------------------------------------

async function tokenWorks(t) {
  try {
    const r = await fetch(`${BACKEND}/api/v1/auth/me`, { headers: { authorization: `Bearer ${t}` } });
    return r.ok;
  } catch {
    return false;
  }
}

async function resolveToken() {
  let stored = null;
  try {
    const state = JSON.parse(fs.readFileSync(AUTH_STATE_PATH, 'utf8'));
    stored = state.origins?.[0]?.localStorage?.find((x) => x.name === 'investment_scanner_auth_token')?.value ?? null;
  } catch {
    /* no auth-state file */
  }
  if (stored && (await tokenWorks(stored))) {
    console.log('  reusing Playwright auth-state token');
    return stored;
  }
  console.log('  stored token missing/expired — performing one login');
  const res = await fetch(`${BACKEND}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) {
    throw new Error(`login failed: HTTP ${res.status} ${await res.text()} (if 429, login limiter cooling down — retry later)`);
  }
  const body = await res.json();
  if (!body.accessToken) throw new Error('login returned no accessToken');
  return body.accessToken;
}

// ---- capture ---------------------------------------------------------------

function slug(p) {
  return p.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'root';
}

/**
 * Capture a single endpoint.
 * @param {string} method - HTTP method
 * @param {string} p - API path (e.g. "/api/v1/signals/top")
 * @param {object} [opts]
 * @param {object} [opts.params] - extra query params (limit, days, etc.)
 * @param {object} [opts.body] - POST body
 * @param {string} [opts.region] - when set, adds region+assetType=STOCK to params
 *   and uses "path?region=XX" as manifest key; compound params (sector) are appended
 * @param {string} [opts.manifestKeySuffix] - extra key qualifiers (e.g. "&sector=Tech")
 */
async function capture(method, p, { params, body, region, manifestKeySuffix } = {}) {
  const url = new URL(p, BACKEND);
  const merged = { ...(params || {}) };
  if (region) {
    merged.region = region;
    merged.assetType = 'STOCK';
  }
  if (method === 'GET') {
    for (const [k, v] of Object.entries(merged)) {
      if (v != null) url.searchParams.set(k, String(v));
    }
  }

  // Build manifest key
  let manifestKey = p;
  if (region) {
    manifestKey = `${p}?region=${region}${manifestKeySuffix || ''}`;
  }

  // Build file slug
  let fileSuffix = '';
  if (region) fileSuffix += `-region-${region}`;
  if (manifestKeySuffix) fileSuffix += slug(manifestKeySuffix);
  const file = `${slug(p)}${fileSuffix}.json`;

  try {
    const res = await fetch(url, {
      method,
      headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      console.warn(`  x ${method} ${manifestKey} -> HTTP ${res.status}`);
      skipped++;
      return null;
    }
    const data = await res.json();
    fs.writeFileSync(path.join(OUT_DIR, file), JSON.stringify(data));
    manifest[manifestKey] = { file, status: res.status };
    ok++;
    return data;
  } catch (err) {
    const cause = err.cause ? ` (${err.cause.code || err.cause.message || err.cause})` : '';
    console.warn(`  x ${method} ${manifestKey} -> ${err.message}${cause}`);
    skipped++;
    return null;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Capture the unified calendar for one region as a SINGLE merged envelope.
 *
 * Why this isn't a plain SCOPED_GETS entry: the backend hard-caps `items` at 500
 * ordered by date, so a `type=ALL` call lets earnings/dividends saturate the array
 * and starves the IPO/SPLIT/ECONOMIC tabs (e.g. US type=ALL returns ZERO dividends/
 * IPOs even though hundreds exist). The demo adapter keys on region only (it ignores
 * the `type`/`ipoMonths` params), so it serves ONE file per region for every tab.
 * To keep every tab populated we fetch each eventType separately and merge their
 * items into one envelope, preserving the authoritative full-corpus `counts` for the
 * tab badges. The page filters this envelope client-side by eventType.
 */
async function captureCalendarMerged(region) {
  const PER_TYPE = 150; // cap per eventType — keeps the file lean while every tab stays full
  const EVENT_TYPES = ['IPO', 'IPO_UPCOMING', 'DIVIDEND', 'SPLIT', 'EARNINGS', 'ECONOMIC'];
  const base = { region, assetType: 'STOCK', ipoMonths: 6 };

  async function get(params) {
    const url = new URL('/api/v1/calendar', BACKEND);
    for (const [k, v] of Object.entries({ ...base, ...params })) {
      if (v != null) url.searchParams.set(k, String(v));
    }
    const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  const manifestKey = `/api/v1/calendar?region=${region}`;
  try {
    // type=ALL gives the authoritative envelope shell + full-corpus counts for badges.
    const shell = await get({ type: 'ALL', limit: 500 });
    const merged = [];
    const seen = new Set();
    for (const t of EVENT_TYPES) {
      let body;
      try {
        body = await get({ type: t, limit: PER_TYPE });
      } catch {
        continue; // a single empty/unsupported type must not sink the whole capture
      }
      for (const it of Array.isArray(body.items) ? body.items : []) {
        const id = it && it.id;
        if (id && seen.has(id)) continue;
        if (id) seen.add(id);
        merged.push(it);
      }
      await delay(50);
    }
    const envelope = { ...shell, items: merged };
    const file = `${slug('/api/v1/calendar')}-region-${region}.json`;
    fs.writeFileSync(path.join(OUT_DIR, file), JSON.stringify(envelope));
    manifest[manifestKey] = { file, status: 200 };
    ok++;
    console.log(`  ok GET ${manifestKey} -> ${merged.length} merged events (counts ${JSON.stringify(shell.counts || {})})`);
    return envelope;
  } catch (err) {
    console.warn(`  x GET ${manifestKey} -> ${err.message}`);
    skipped++;
    return null;
  }
}

// ---- extraction helpers ----------------------------------------------------

function pickArray(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    for (const k of [
      'data', 'items', 'results', 'rows', 'signals', 'candidates', 'runs',
      'stocks', 'strategies', 'pairs', 'sectors', 'positions', 'entries',
    ]) {
      if (Array.isArray(data[k])) return data[k];
    }
  }
  return [];
}

function extractField(data, keys, limit) {
  const out = [];
  for (const it of pickArray(data)) {
    if (!it || typeof it !== 'object') continue;
    for (const k of keys) {
      if (it[k]) {
        out.push(it[k]);
        break;
      }
    }
    if (out.length >= limit) break;
  }
  return [...new Set(out)];
}

// ---- endpoint lists --------------------------------------------------------

const GLOBAL_GETS = [
  '/api/v1/auth/me',
  '/api/v1/subscription/me',
  '/api/v1/subscription/plans',
  '/api/v1/subscription/features',
  '/api/v1/market-context/macro',
  '/api/v1/fx-rates',
];

const SCOPED_GETS = [
  // ── Daily Decisions ──
  // Market page: Health / Sectors / Events tabs
  ['/api/v1/market-intelligence/market-pulse', { timeframe: '1d' }],
  '/api/v1/market-intelligence/sectors',
  '/api/v1/market-intelligence/sector-rotation',
  ['/api/v1/market-intelligence/event-feed', { days: 5 }],
  // Today Review: Daily Review / Shortlist / Overview tabs
  ['/api/v1/today-review/latest', { enrich: 'true' }],
  ['/api/v1/today-review/runs', { limit: 10, offset: 0 }],
  '/api/v1/market-context/summary',
  ['/api/v1/market-data/movers', { limit: 20 }],
  '/api/v1/data-quality/summary',
  ['/api/v1/signals/position-ledger/persisted/active', { limit: 100, offset: 0, sortBy: 'entryTriggerTimestamp', sortDirection: 'desc' }],
  // ── Discover ──
  // Screener page: Screener / Conviction / Market Scans / Stock Interest / Index Constituents
  ['/api/v1/market-data/screener', { limit: 50 }],
  '/api/v1/market-data/screener/conviction',
  ['/api/v1/market-data/scans/52w-high', { limit: 30 }],
  ['/api/v1/market-data/scans/52w-low', { limit: 30 }],
  ['/api/v1/market-data/scans/delivery-spike', { limit: 30 }],
  ['/api/v1/market-data/scans/volume-spike', { limit: 30 }],
  ['/api/v1/market-data/scans/potential-movers', { limit: 50 }],
  '/api/v1/market-intelligence/stock-interest',
  // NOTE: index-constituents captured separately per region with region-specific index values
  // NOTE: /api/v1/calendar is NOT a plain scoped GET — captureCalendarMerged() in Phase 2
  // Research Hub
  '/api/v1/research/overview',
  // Earnings Intelligence
  ['/api/v1/market-intelligence/earnings', { limit: 100 }],
];

const IN_ONLY_GETS = [
  ['/api/v1/market-context/fii-dii', { days: 5 }],
  ['/api/v1/market-context/bulk-block-deals', { days: 1 }],
  '/api/v1/market-context/institutional-activity',
  '/api/v1/smart-money/fno-ban',
  ['/api/v1/derivatives/oi-buildup', { eligibleOnly: 'true', limit: 50 }],
  ['/api/v1/derivatives/option-metrics', { limit: 200 }],
  '/api/v1/derivatives/pcr',
  '/api/v1/derivatives/participant-oi',
];

const INDEX_CONSTITUENTS_BY_REGION = {
  IN: ['NIFTY_50', 'NIFTY_BANK'],
  US: ['SP500', 'NDX100'],
};

// ---- main ------------------------------------------------------------------

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const f of fs.readdirSync(OUT_DIR)) {
    if (f.endsWith('.json')) fs.rmSync(path.join(OUT_DIR, f), { force: true });
  }

  token = await resolveToken();

  // Per-region captured data for ID extraction
  const regionData = {};

  const PACE_MS = 50; // small delay between calls to avoid connection pool exhaustion

  // ── Phase 1: non-scoped endpoints ────────────────────────────────────────
  console.log('\n[1/6] non-scoped endpoints');
  for (const item of GLOBAL_GETS) {
    const [p, params] = Array.isArray(item) ? item : [item, undefined];
    await capture('GET', p, { params });
    await delay(PACE_MS);
  }

  // ── Phase 2: region-scoped list endpoints ────────────────────────────────
  for (const region of REGIONS) {
    console.log(`\n[2/6] region-scoped lists (${region})`);
    regionData[region] = {};

    for (const item of SCOPED_GETS) {
      const [p, params] = Array.isArray(item) ? item : [item, undefined];
      regionData[region][p] = await capture('GET', p, { params, region });
      await delay(PACE_MS);
    }

    // Calendar needs the per-eventType merge so every tab is populated (see fn doc).
    regionData[region]['/api/v1/calendar'] = await captureCalendarMerged(region);
    await delay(PACE_MS);

    // Index Constituents — different indices per region
    const indices = INDEX_CONSTITUENTS_BY_REGION[region] || [];
    for (const idx of indices) {
      await capture('GET', '/api/v1/market-intelligence/index-constituents', {
        params: { index: idx },
        region,
        manifestKeySuffix: `&index=${idx}`,
      });
      await delay(PACE_MS);
    }

    if (region === 'IN') {
      console.log(`  + IN-only endpoints`);
      for (const item of IN_ONLY_GETS) {
        const [p, params] = Array.isArray(item) ? item : [item, undefined];
        regionData[region][p] = await capture('GET', p, { params, region });
        await delay(PACE_MS);
      }
    }
  }

  // ── Phase 3: extract IDs per region ──────────────────────────────────────
  console.log('\n[3/6] extracting IDs');
  const regionIds = {};

  for (const region of REGIONS) {
    const rd = regionData[region];

    // Instrument IDs from trader-facing list endpoints
    const instrumentIds = [
      ...extractField(rd['/api/v1/market-data/screener'], ['instrumentId', 'id'], 10),
      ...extractField(rd['/api/v1/market-data/movers'], ['instrumentId', 'id'], 5),
      ...extractField(rd['/api/v1/market-data/screener/conviction'], ['instrumentId', 'id'], 5),
      ...extractField(rd['/api/v1/market-intelligence/stock-interest'], ['instrumentId', 'id'], 5),
      ...extractField(rd['/api/v1/signals/position-ledger/persisted/active'], ['instrumentId', 'id'], 5),
    ].filter(Boolean);
    const uniqueInstrumentIds = [...new Set(instrumentIds)].slice(0, 5);

    // Today review candidate IDs
    const todayData = rd['/api/v1/today-review/latest'];
    const candidateIds = extractField(todayData, ['candidateId', 'id'], 3);

    // Today review run IDs
    const runIds = extractField(rd['/api/v1/today-review/runs'], ['id', 'runId'], 2);

    // Sector names
    const sectorNames = extractField(rd['/api/v1/market-intelligence/sectors'], ['sector', 'sectorName', 'name'], 3);

    // US ticker symbols (for us-smart-money SEC endpoint on instrument detail)
    const tickerSymbols = region === 'US'
      ? extractField(rd['/api/v1/market-data/screener'], ['symbol'], 5)
      : [];

    regionIds[region] = { uniqueInstrumentIds, candidateIds, runIds, sectorNames, tickerSymbols };
    console.log(`  ${region}: instruments=${uniqueInstrumentIds.length} candidates=${candidateIds.length} runs=${runIds.length} sectors=${sectorNames.length} tickers=${tickerSymbols.length}`);
  }

  // ── Phase 4: per-instrument detail (trader-facing tabs only) ──────────────
  // Chart tab: prices/:id deliberately SKIPPED — adapter returns {} so the chart
  // renders "No price history" with the TradingView external link (lightweight).
  console.log('\n[4/6] per-instrument detail');
  for (const region of REGIONS) {
    const ids = regionIds[region].uniqueInstrumentIds;
    for (const id of ids) {
      console.log(`  ${region} instrument ${id}`);
      // Non-scoped instrument metadata
      await capture('GET', `/api/v1/instruments/${id}`);
      await capture('GET', `/api/v1/prices/${id}/latest`);
      await capture('GET', `/api/v1/fundamentals/${id}`);
      await capture('GET', `/api/v1/corporate-actions/${id}`);
      // Region-scoped instrument endpoints
      await capture('GET', `/api/v1/market-intelligence/instrument-context/${id}`, { region });
      await capture('GET', `/api/v1/smart-money/stocks/${id}`, { params: { range: '3M' }, region });
      await capture('GET', `/api/v1/research/stocks/${id}/workbench`, { params: { range: '1Y' }, region });
      await capture('GET', `/api/v1/signals/${id}/history`, { params: { limit: 20 }, region });
      await capture('GET', `/api/v1/signals/${id}/outcomes`, { params: { horizon: '20D' }, region });
      await delay(PACE_MS);
    }
  }

  // ── Phase 5: derived-ID detail (per region) ──────────────────────────────
  console.log('\n[5/6] derived-ID detail');
  for (const region of REGIONS) {
    const { candidateIds, runIds, sectorNames } = regionIds[region];

    for (const id of candidateIds) {
      await capture('GET', `/api/v1/today-review/candidates/${id}`, { region });
    }
    for (const id of runIds) {
      await capture('GET', `/api/v1/today-review/runs/${id}`, { region });
    }
    for (const sector of sectorNames) {
      await capture('GET', '/api/v1/market-intelligence/sector-constituents', {
        params: { sector },
        region,
        manifestKeySuffix: `&sector=${sector}`,
      });
    }
  }

  // ── Phase 6: non-scoped derived detail (once) ────────────────────────────
  console.log('\n[6/6] non-scoped derived detail');

  // FX rate pairs
  const fxData = manifest['/api/v1/fx-rates']
    ? JSON.parse(fs.readFileSync(path.join(OUT_DIR, manifest['/api/v1/fx-rates'].file), 'utf8'))
    : null;
  const fxPairs = extractField(fxData, ['pair', 'code'], 3);
  for (const pair of fxPairs) {
    await capture('GET', `/api/v1/fx-rates/${pair}`);
  }

  // US smart money by ticker (instrument detail page, US only)
  const usTickerSymbols = regionIds['US']?.tickerSymbols || [];
  for (const symbol of usTickerSymbols) {
    await capture('GET', `/api/v1/market-data/us-smart-money/${symbol}`, { params: { limit: 25 } });
  }

  // ── Write manifest ───────────────────────────────────────────────────────
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\n=> captured ${ok} endpoints (${skipped} skipped) -> ${path.relative(ROOT, OUT_DIR)}`);
  console.log(`   manifest: ${Object.keys(manifest).length} entries`);
}

main().catch((err) => {
  console.error('\n=> capture failed:', err.message);
  process.exit(1);
});
