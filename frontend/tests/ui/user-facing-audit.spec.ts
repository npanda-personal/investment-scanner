import { test } from '@playwright/test';
import { visitAuthenticated } from './support/auth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * USER-FACING SCREEN AUDIT / REGRESSION CRAWL  (read-only)
 * --------------------------------------------------------
 * Visits every user-facing (non-admin) screen authenticated as the E2E test
 * user and captures, per screen:
 *   - full-page screenshot
 *   - visible text
 *   - console errors + HTTP >=400 responses
 *   - a coarse HEALTH classification (OK / EMPTY / LOADING_STUCK / BACKEND_UNAVAILABLE / ERROR)
 *
 * It performs NO mutations (navigation + screenshots only; the only form action
 * is the project's own login fixture).
 *
 * OPT-IN: skipped during normal `playwright test` runs. Enable with:
 *     UI_AUDIT=1 npx playwright test user-facing-audit
 * Artifacts are written to frontend/test-results/ui-audit/ (gitignored).
 *
 * Reuse for future audits: update ROUTES if nav changes; diff the screenshots /
 * _summary.json against a prior run, or read _unhealthy.txt for a quick triage.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../../test-results/ui-audit');

// User-facing nav (mirror of navGroups 'Trader Workflow') + Account.
// Keep in sync with frontend/src/app/navigationMetadata.tsx.
const ROUTES: { slug: string; path: string; label: string }[] = [
  { slug: '01-market-pulse', path: '/', label: 'Market Pulse (home)' },
  { slug: '02-crypto', path: '/crypto', label: 'Crypto Market' },
  { slug: '03-sector-rotation', path: '/sector-rotation', label: 'Sector Rotation' },
  { slug: '04-index-constituents', path: '/index-constituents', label: 'Index Constituents' },
  { slug: '05-market-events', path: '/market-events', label: 'Market Events' },
  { slug: '06-today-review', path: '/today-review', label: 'Daily Review' },
  { slug: '07-daily-overview', path: '/daily-overview', label: 'Daily Overview' },
  { slug: '08-research', path: '/research', label: 'Research Hub' },
  { slug: '09-review-shortlist', path: '/daily-review-shortlist', label: 'Review Shortlist' },
  { slug: '10-stock-interest-radar', path: '/stock-interest-radar', label: 'Stock Interest Radar' },
  { slug: '11-earnings-intelligence', path: '/earnings-intelligence', label: 'Earnings Intelligence' },
  { slug: '12-market-scans', path: '/market-scans', label: 'Market Scans' },
  { slug: '13-screener', path: '/screener', label: 'Screener' },
  { slug: '14-derivatives', path: '/derivatives', label: 'Derivatives / F&O' },
  { slug: '15-watchlists', path: '/watchlists', label: 'Watchlists' },
  { slug: '16-portfolios', path: '/portfolios', label: 'Portfolios' },
  { slug: '17-alerts', path: '/alerts', label: 'Alerts' },
  { slug: '18-notifications', path: '/notifications', label: 'Notifications' },
  { slug: '19-copilot', path: '/copilot', label: 'AI Copilot' },
  { slug: '20-instrument-workspace', path: '/instrument-workspace', label: 'Instrument Workspace' },
  { slug: '21-account', path: '/account', label: 'Account' },
];

function classify(text: string, ok: boolean): string {
  if (!ok) return 'ERROR';
  const t = text.toLowerCase();
  if (t.includes('backend unavailable') || t.includes('backend not available')) return 'BACKEND_UNAVAILABLE';
  if (t.includes('loading ') && text.length < 1500) return 'LOADING_STUCK';
  if (text.length < 900) return 'EMPTY';
  return 'OK';
}

test('user-facing screen audit crawl', async ({ page }) => {
  test.skip(!process.env.UI_AUDIT, 'Opt-in audit. Run with UI_AUDIT=1 to enable.');
  test.setTimeout(600_000);
  fs.mkdirSync(OUT, { recursive: true });

  const consoleErrors: string[] = [];
  const netErrors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
  page.on('response', (r) => { if (r.status() >= 400) netErrors.push(`${r.status()} ${r.request().method()} ${r.url()}`); });

  await visitAuthenticated(page, '/');

  const summary: any[] = [];
  const unhealthy: string[] = [];

  for (const r of ROUTES) {
    const before = { c: consoleErrors.length, n: netErrors.length };
    let text = '';
    let ok = true;
    let err = '';
    try {
      await page.goto(r.path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500);
      try { await page.waitForLoadState('networkidle', { timeout: 8000 }); } catch {}
      text = await page.evaluate(() => document.body.innerText || '');
      await page.screenshot({ path: path.join(OUT, `${r.slug}.png`), fullPage: true });
    } catch (e: any) {
      ok = false;
      err = String(e).slice(0, 300);
      try { await page.screenshot({ path: path.join(OUT, `${r.slug}-ERR.png`) }); } catch {}
    }
    fs.writeFileSync(path.join(OUT, `${r.slug}.txt`), text);
    const health = classify(text, ok);
    const newConsole = consoleErrors.length - before.c;
    const routeNet = netErrors.slice(before.n);
    if (health !== 'OK' || newConsole > 0 || routeNet.length > 0) {
      unhealthy.push(`${health.padEnd(20)} ${r.path.padEnd(26)} ${r.label}` +
        (newConsole ? `  [${newConsole} console errs]` : '') +
        (routeNet.length ? `  [${routeNet.length} http>=400]` : ''));
    }
    summary.push({
      slug: r.slug, label: r.label, path: r.path, ok, err, health,
      finalUrl: page.url(), textLen: text.length,
      textHead: text.replace(/\s+/g, ' ').slice(0, 600),
      newConsoleErrors: newConsole, netErrors: routeNet.slice(0, 12),
    });
  }

  fs.writeFileSync(path.join(OUT, '_summary.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(OUT, '_console_errors.txt'), consoleErrors.join('\n'));
  fs.writeFileSync(path.join(OUT, '_unhealthy.txt'), unhealthy.join('\n'));

  // eslint-disable-next-line no-console
  console.log(`\n=== UI AUDIT: ${unhealthy.length}/${ROUTES.length} screens flagged ===\n` +
    (unhealthy.join('\n') || 'all OK') + `\n\nArtifacts: ${OUT}\n`);
});
