/**
 * Capture demo data for the static GitHub Pages build.
 *
 * Run LOCALLY against the running backend (localhost:3000):
 *     node scripts/capture-demo-data.mjs
 *
 * Captures all trader-facing endpoints for IN and US regions (STOCK only),
 * derives real IDs from list responses to capture detail pages, and writes each
 * response as a JSON file to frontend/public/demo-api/ plus a manifest.json.
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
  '/api/v1/signals/calibration/health',
  '/api/v1/signals/calibration/model',
  '/api/v1/signals/position-ledger/health',
  '/api/v1/trade-plans/health',
  '/api/v1/trade-plans/model',
  '/api/v1/strategy/health',
  '/api/v1/strategy/model',
  '/api/v1/strategies/health',
  '/api/v1/strategies/model',
  '/api/v1/research/health',
  '/api/v1/copilot/alert-digest',
];

const SCOPED_GETS = [
  // market intelligence
  ['/api/v1/market-intelligence/market-pulse', { timeframe: '1d' }],
  '/api/v1/market-intelligence/sectors',
  '/api/v1/market-intelligence/sector-rotation',
  '/api/v1/market-intelligence/stock-interest',
  '/api/v1/market-intelligence/earnings',
  ['/api/v1/market-intelligence/event-feed', { days: 5 }],
  // NOTE: /api/v1/calendar is NOT a plain scoped GET — it needs the per-eventType
  // merge in captureCalendarMerged() (see Phase 2) so every tab is populated.
  // market context
  '/api/v1/market-context/summary',
  '/api/v1/market-context/persisted-summary',
  '/api/v1/market-context/persisted-breadth',
  '/api/v1/market-context/regime',
  '/api/v1/market-context/sectors',
  '/api/v1/market-context/breadth',
  '/api/v1/market-context/countries',
  '/api/v1/market-context/capital-posture',
  ['/api/v1/market-context/breadth-internals', { days: 60 }],
  // market data — screener, scans, movers
  ['/api/v1/market-data/screener', { limit: 50 }],
  '/api/v1/market-data/screener/conviction',
  ['/api/v1/market-data/movers', { limit: 20 }],
  ['/api/v1/market-data/scans/52w-high', { limit: 20 }],
  ['/api/v1/market-data/scans/52w-low', { limit: 20 }],
  ['/api/v1/market-data/scans/delivery-spike', { limit: 20 }],
  ['/api/v1/market-data/scans/volume-spike', { limit: 20 }],
  '/api/v1/market-data/health',
  ['/api/v1/market-data/market-map', { limit: 50 }],
  '/api/v1/market-data/review-readiness-summary',
  // signals
  '/api/v1/signals/health',
  ['/api/v1/signals/top', { limit: 50, offset: 0 }],
  ['/api/v1/signals/screener', { limit: 50, offset: 0 }],
  '/api/v1/signals/runs/latest',
  ['/api/v1/signals/exit-candidates', { limit: 25 }],
  // signal quality
  ['/api/v1/signals/quality/dashboard', { horizon: '20D' }],
  ['/api/v1/signals/quality/summary', { horizon: '20D' }],
  ['/api/v1/signals/quality/by-type', { horizon: '20D' }],
  ['/api/v1/signals/quality/by-sector', { horizon: '20D' }],
  ['/api/v1/signals/quality/by-score', { horizon: '20D' }],
  ['/api/v1/signals/quality/by-regime', { horizon: '20D' }],
  ['/api/v1/signals/quality/by-data-quality', { horizon: '20D' }],
  ['/api/v1/signals/quality/noisy', { horizon: '20D' }],
  ['/api/v1/signals/quality/scorecard', { horizon: '20D' }],
  // signal calibration
  ['/api/v1/signals/calibration/top', { limit: 25 }],
  // signal position ledger
  ['/api/v1/signals/position-ledger/persisted/active', { limit: 25 }],
  ['/api/v1/signals/position-ledger/persisted/closed', { limit: 25 }],
  // smart money
  '/api/v1/smart-money/health',
  ['/api/v1/smart-money/top', { range: '3M', limit: 20 }],
  ['/api/v1/smart-money/distribution', { range: '3M', limit: 20 }],
  ['/api/v1/smart-money/sectors', { range: '3M' }],
  // today review
  ['/api/v1/today-review/latest', { enrich: 'true' }],
  ['/api/v1/today-review/runs', { limit: 10, offset: 0 }],
  // trade plans
  ['/api/v1/trade-plans/candidates', { limit: 50 }],
  '/api/v1/trade-plans/funnel',
  // strategy decision engine
  '/api/v1/strategy/market-gate',
  ['/api/v1/strategy/candidates', { limit: 25 }],
  '/api/v1/strategy/exits',
  // strategies framework
  '/api/v1/strategies',
  '/api/v1/strategies/rankings',
  '/api/v1/strategies/proof-registry',
  // backtests
  '/api/v1/backtests/strategies',
  '/api/v1/backtests/runs',
  // research + copilot + pipeline
  '/api/v1/research/overview',
  '/api/v1/copilot/market-brief',
  '/api/v1/pipeline/status',
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
  '/api/v1/derivatives/fo-bhavcopy/meta',
];

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
  console.log('\n[1/7] non-scoped endpoints');
  for (const item of GLOBAL_GETS) {
    const [p, params] = Array.isArray(item) ? item : [item, undefined];
    await capture('GET', p, { params });
    await delay(PACE_MS);
  }

  // ── Phase 2: region-scoped list endpoints ────────────────────────────────
  for (const region of REGIONS) {
    console.log(`\n[2/7] region-scoped lists (${region})`);
    regionData[region] = {};

    for (const item of SCOPED_GETS) {
      const [p, params] = Array.isArray(item) ? item : [item, undefined];
      regionData[region][p] = await capture('GET', p, { params, region });
      await delay(PACE_MS);
    }

    // Calendar needs the per-eventType merge so every tab is populated (see fn doc).
    regionData[region]['/api/v1/calendar'] = await captureCalendarMerged(region);
    await delay(PACE_MS);

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
  console.log('\n[3/7] extracting IDs');
  const regionIds = {};

  for (const region of REGIONS) {
    const rd = regionData[region];

    // Instrument IDs from 8 sources
    const instrumentIds = [
      ...extractField(rd['/api/v1/market-data/screener'], ['instrumentId', 'id'], 10),
      ...extractField(rd['/api/v1/signals/top'], ['instrumentId', 'id'], 10),
      ...extractField(rd['/api/v1/signals/screener'], ['instrumentId', 'id'], 10),
      ...extractField(rd['/api/v1/market-data/movers'], ['instrumentId', 'id'], 5),
      ...extractField(rd['/api/v1/market-data/screener/conviction'], ['instrumentId', 'id'], 5),
      ...extractField(rd['/api/v1/smart-money/top'], ['instrumentId', 'id'], 5),
      ...extractField(rd['/api/v1/signals/calibration/top'], ['instrumentId', 'id'], 5),
      ...extractField(rd['/api/v1/signals/position-ledger/persisted/active'], ['instrumentId', 'id'], 5),
    ].filter(Boolean);
    const uniqueInstrumentIds = [...new Set(instrumentIds)].slice(0, 3);

    // Strategy codes
    const strategyCodes = extractField(rd['/api/v1/strategies'], ['code', 'strategyCode'], 3);

    // Today review candidate IDs
    const todayData = rd['/api/v1/today-review/latest'];
    const candidateIds = extractField(todayData, ['candidateId', 'id'], 3);

    // Today review run IDs
    const runIds = extractField(rd['/api/v1/today-review/runs'], ['id', 'runId'], 2);

    // Sector names
    const sectorNames = extractField(rd['/api/v1/market-intelligence/sectors'], ['sector', 'sectorName', 'name'], 3);

    // US ticker symbols (for us-smart-money SEC endpoint)
    const tickerSymbols = region === 'US'
      ? extractField(rd['/api/v1/market-data/screener'], ['symbol'], 3)
      : [];

    regionIds[region] = { uniqueInstrumentIds, strategyCodes, candidateIds, runIds, sectorNames, tickerSymbols };
    console.log(`  ${region}: instruments=${uniqueInstrumentIds.length} strategies=${strategyCodes.length} candidates=${candidateIds.length} runs=${runIds.length} sectors=${sectorNames.length} tickers=${tickerSymbols.length}`);
  }

  // ── Phase 4: per-instrument detail ───────────────────────────────────────
  console.log('\n[4/7] per-instrument detail');
  for (const region of REGIONS) {
    const ids = regionIds[region].uniqueInstrumentIds;
    for (const id of ids) {
      console.log(`  ${region} instrument ${id}`);
      // Region-scoped instrument endpoints
      await capture('GET', `/api/v1/signals/${id}`, { region });
      await capture('GET', `/api/v1/signals/${id}/history`, { params: { limit: 20 }, region });
      await capture('GET', `/api/v1/signals/${id}/outcomes`, { params: { horizon: '20D' }, region });
      await capture('GET', `/api/v1/market-intelligence/instrument-context/${id}`, { region });
      await capture('GET', `/api/v1/smart-money/stocks/${id}`, { params: { range: '3M' }, region });
      await capture('GET', `/api/v1/research/stocks/${id}/workbench`, { params: { range: '1Y' }, region });
      await capture('GET', `/api/v1/trade-plans/${id}`, { region });
      await capture('GET', `/api/v1/strategy/${id}`, { region });
      await capture('GET', `/api/v1/strategy/history/${id}`, { region });
      await capture('GET', `/api/v1/signals/calibration/compare/${id}`, { params: { horizon: '20D' }, region });
      await capture('GET', `/api/v1/signals/calibration/${id}`, { region });
      // Non-scoped instrument metadata (capture once per unique ID)
      await capture('GET', `/api/v1/instruments/${id}`);
      await capture('GET', `/api/v1/prices/${id}`, { params: { limit: 250 } });
      await capture('GET', `/api/v1/prices/${id}/latest`);
      await capture('GET', `/api/v1/fundamentals/${id}`);
      await capture('GET', `/api/v1/corporate-actions/${id}`);
      await delay(PACE_MS);
    }
  }

  // ── Phase 5: derived-ID detail (per region) ──────────────────────────────
  console.log('\n[5/7] derived-ID detail');
  for (const region of REGIONS) {
    const { strategyCodes, candidateIds, runIds, sectorNames } = regionIds[region];

    for (const code of strategyCodes) {
      await capture('GET', `/api/v1/strategies/${code}`, { region });
      await capture('GET', `/api/v1/strategies/${code}/performance`, { region });
      await capture('GET', `/api/v1/strategies/${code}/proof`, { region });
    }
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
  console.log('\n[6/7] non-scoped derived detail');

  // FX rate pairs
  const fxData = manifest['/api/v1/fx-rates']
    ? JSON.parse(fs.readFileSync(path.join(OUT_DIR, manifest['/api/v1/fx-rates'].file), 'utf8'))
    : null;
  const fxPairs = extractField(fxData, ['pair', 'code'], 3);
  for (const pair of fxPairs) {
    await capture('GET', `/api/v1/fx-rates/${pair}`);
  }

  // US smart money (SEC Form 4 / 13F by ticker)
  const usTickerSymbols = regionIds['US']?.tickerSymbols || [];
  for (const symbol of usTickerSymbols) {
    await capture('GET', `/api/v1/market-data/us-smart-money/${symbol}`, { params: { limit: 50 } });
  }

  // ── Phase 7: copilot POST summaries (per region) ────────────────────────
  console.log('\n[7/7] copilot POST summaries');
  for (const region of REGIONS) {
    const firstId = regionIds[region].uniqueInstrumentIds[0];
    if (firstId) {
      await capture('POST', '/api/v1/copilot/stock-summary', {
        body: { instrumentId: firstId },
        region,
      });
    }
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
