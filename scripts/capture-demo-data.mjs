/**
 * Capture demo data for the static GitHub Pages build.
 *
 * Run LOCALLY against the running backend (localhost:3000):
 *     node scripts/capture-demo-data.mjs
 *
 * It GETs the curated trader-facing endpoints (region=IN, assetType=STOCK),
 * derives a few real ids from the list responses to capture detail pages, POSTs
 * the copilot summaries, and writes each response body to
 * frontend/public/demo-api/<slug>.json plus a manifest.json that maps request
 * path -> { file, status }. The demo axios adapter (frontend/src/demo/demoAdapter.ts)
 * matches on path only, so query params/method don't need to round-trip.
 *
 * Auth: reuses the token from the Playwright auth-state file; if missing/expired
 * it performs ONE login (test creds) — the backend rate-limits login, so we never
 * loop. Capture is tolerant: non-2xx responses are logged and skipped.
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
const SCOPE = { region: 'IN', assetType: 'STOCK' };

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
    console.log('· reusing Playwright auth-state token');
    return stored;
  }
  console.log('· stored token missing/expired — performing one login');
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

async function capture(method, p, { params, body } = {}) {
  const url = new URL(p, BACKEND);
  if (method === 'GET') {
    const merged = { ...SCOPE, ...(params || {}) };
    for (const [k, v] of Object.entries(merged)) {
      if (v != null) url.searchParams.set(k, String(v));
    }
  }
  try {
    const res = await fetch(url, {
      method,
      headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      console.warn(`  ✗ ${method} ${p} -> HTTP ${res.status}`);
      skipped++;
      return null;
    }
    const data = await res.json();
    const file = `${slug(p)}.json`;
    fs.writeFileSync(path.join(OUT_DIR, file), JSON.stringify(data));
    manifest[p] = { file, status: res.status };
    ok++;
    return data;
  } catch (err) {
    console.warn(`  ✗ ${method} ${p} -> ${err.message}`);
    skipped++;
    return null;
  }
}

// Pull a list out of common envelope shapes, then collect ids.
function pickArray(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    for (const k of ['data', 'items', 'results', 'rows', 'portfolios', 'watchlists', 'signals', 'candidates', 'runs', 'stocks']) {
      if (Array.isArray(data[k])) return data[k];
    }
  }
  return [];
}
function extractIds(data, keys, limit) {
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

// ---- curated endpoint set --------------------------------------------------

const STATIC_GETS = [
  // auth + account
  '/api/v1/auth/me',
  '/api/v1/subscription/me',
  '/api/v1/subscription/plans',
  '/api/v1/subscription/features',
  // market intelligence (Market workspace)
  ['/api/v1/market-intelligence/market-pulse', { timeframe: '1d' }],
  '/api/v1/market-intelligence/sectors',
  '/api/v1/market-intelligence/sector-rotation',
  '/api/v1/market-intelligence/stock-interest',
  '/api/v1/market-intelligence/earnings',
  ['/api/v1/market-intelligence/event-feed', { days: 5 }],
  // market context (posture chip + context surfaces)
  '/api/v1/market-context/summary',
  '/api/v1/market-context/persisted-summary',
  '/api/v1/market-context/persisted-breadth',
  '/api/v1/market-context/regime',
  '/api/v1/market-context/sectors',
  '/api/v1/market-context/breadth',
  '/api/v1/market-context/capital-posture',
  // today's review
  ['/api/v1/today-review/latest', { enrich: 'true' }],
  ['/api/v1/today-review/runs', { limit: 10, offset: 0 }],
  // screener + scans + movers + signals
  ['/api/v1/market-data/screener', { limit: 50 }],
  '/api/v1/market-data/screener/conviction',
  ['/api/v1/market-data/movers', { limit: 20 }],
  ['/api/v1/market-data/scans/52w-high', { limit: 20 }],
  ['/api/v1/market-data/scans/52w-low', { limit: 20 }],
  ['/api/v1/market-data/scans/delivery-spike', { limit: 20 }],
  ['/api/v1/market-data/scans/volume-spike', { limit: 20 }],
  '/api/v1/market-data/health',
  ['/api/v1/signals/top', { limit: 50, offset: 0 }],
  ['/api/v1/signals/screener', { limit: 50, offset: 0 }],
  '/api/v1/signals/runs/latest',
  // research hub
  '/api/v1/research/overview',
  // smart money
  '/api/v1/smart-money/health',
  ['/api/v1/smart-money/top', { range: '3M', limit: 20 }],
  ['/api/v1/smart-money/distribution', { range: '3M', limit: 20 }],
  ['/api/v1/smart-money/sectors', { range: '3M' }],
  '/api/v1/smart-money/fno-ban',
  // derivatives
  ['/api/v1/derivatives/oi-buildup', { eligibleOnly: 'true', limit: 20 }],
  '/api/v1/derivatives/pcr',
  '/api/v1/derivatives/participant-oi',
  // lists used both for pages AND to derive detail ids
  '/api/v1/portfolios',
  '/api/v1/watchlists',
  '/api/v1/alerts/rules',
  '/api/v1/alerts/events',
  // copilot landing surfaces (GET)
  '/api/v1/copilot/market-brief',
  '/api/v1/copilot/alert-digest',
];

async function main() {
  // Clear stale files individually (removing the dir can EPERM on Windows when a
  // dev-server file watcher holds it open).
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const f of fs.readdirSync(OUT_DIR)) {
    if (f.endsWith('.json')) fs.rmSync(path.join(OUT_DIR, f), { force: true });
  }

  token = await resolveToken();

  console.log('\n[1/4] static + list endpoints');
  const captured = {};
  for (const item of STATIC_GETS) {
    const [p, params] = Array.isArray(item) ? item : [item, undefined];
    captured[p] = await capture('GET', p, { params });
  }

  console.log('\n[2/4] deriving detail ids');
  // Merge across sources (a single list may be empty depending on live data),
  // then take the first few distinct instrument ids.
  const instrumentIds = [
    ...extractIds(captured['/api/v1/market-data/screener'], ['instrumentId', 'id'], 10),
    ...extractIds(captured['/api/v1/signals/top'], ['instrumentId', 'id'], 10),
    ...extractIds(captured['/api/v1/signals/screener'], ['instrumentId', 'id'], 10),
  ].filter(Boolean);
  const uniqueInstrumentIds = [...new Set(instrumentIds)].slice(0, 3);
  const portfolioIds = extractIds(captured['/api/v1/portfolios'], ['id', 'portfolioId'], 3);
  const watchlistIds = extractIds(captured['/api/v1/watchlists'], ['id', 'watchlistId'], 3);
  const runIds = extractIds(captured['/api/v1/today-review/runs'], ['id', 'runId'], 2);
  console.log(`  instruments=${uniqueInstrumentIds.length} portfolios=${portfolioIds.length} watchlists=${watchlistIds.length} runs=${runIds.length}`);

  console.log('\n[3/4] detail endpoints');
  for (const id of uniqueInstrumentIds) {
    await capture('GET', `/api/v1/signals/${id}`);
    await capture('GET', `/api/v1/signals/${id}/history`, { params: { limit: 20 } });
    await capture('GET', `/api/v1/signals/${id}/outcomes`, { params: { horizon: '20D' } });
    await capture('GET', `/api/v1/market-intelligence/instrument-context/${id}`);
    await capture('GET', `/api/v1/smart-money/stocks/${id}`, { params: { range: '3M' } });
    await capture('GET', `/api/v1/research/stocks/${id}/workbench`, { params: { range: '1Y' } });
    await capture('GET', `/api/v1/instruments/${id}`);
    await capture('GET', `/api/v1/prices/${id}`, { params: { limit: 250 } });
    await capture('GET', `/api/v1/prices/${id}/latest`);
    await capture('GET', `/api/v1/fundamentals/${id}`);
    await capture('GET', `/api/v1/corporate-actions/${id}`);
  }
  for (const id of portfolioIds) {
    await capture('GET', `/api/v1/portfolios/${id}`);
    await capture('GET', `/api/v1/portfolios/${id}/summary`);
    await capture('GET', `/api/v1/portfolios/${id}/allocation`);
    await capture('GET', `/api/v1/portfolios/${id}/transactions`);
  }
  for (const id of watchlistIds) {
    await capture('GET', `/api/v1/watchlists/${id}`, { params: { sort: 'recentlyAdded' } });
  }
  for (const id of runIds) {
    await capture('GET', `/api/v1/today-review/runs/${id}`);
  }

  console.log('\n[4/4] copilot POST summaries');
  if (uniqueInstrumentIds[0]) await capture('POST', '/api/v1/copilot/stock-summary', { body: { instrumentId: uniqueInstrumentIds[0] } });
  if (portfolioIds[0]) await capture('POST', '/api/v1/copilot/portfolio-summary', { body: { portfolioId: portfolioIds[0] } });
  if (watchlistIds[0]) await capture('POST', '/api/v1/copilot/watchlist-summary', { body: { watchlistId: watchlistIds[0] } });

  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\n✓ captured ${ok} endpoints (${skipped} skipped) -> ${path.relative(ROOT, OUT_DIR)}`);
  console.log(`  manifest: ${Object.keys(manifest).length} entries`);
}

main().catch((err) => {
  console.error('\n✗ capture failed:', err.message);
  process.exit(1);
});
