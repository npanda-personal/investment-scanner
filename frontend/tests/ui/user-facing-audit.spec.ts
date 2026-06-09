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

interface ScreenProbe {
  text: string;
  /** A real page title/header rendered (working pages always render their PageHeader). */
  hasHeading: boolean;
  /** A spinner / skeleton / progress bar is STILL present after the settle wait. */
  stillSpinning: boolean;
}

/**
 * Content-aware health classification.
 *
 * The previous heuristic flagged any page under 900 chars as EMPTY, which false-flagged
 * genuinely-working concise pages (Account profile, empty Portfolios/Watchlists with their
 * empty-state copy, Copilot's pre-brief state, the Crypto not-applicable placeholder, the
 * Screener pre-render). We instead look at WHAT the page rendered:
 *   - ERROR                — navigation/JS failure (ok === false).
 *   - BACKEND_UNAVAILABLE  — a dead operator backend stub surfaced to a trader.
 *   - LOADING_STUCK        — a spinner/skeleton never resolved into content.
 *   - EMPTY                — truly blank: no heading and essentially no text (not an
 *                            intentional empty-state).
 *   - OK                   — anything that rendered a header and is not mid-spin.
 * This still flags every genuinely-broken screen (dead backend → jargon; infinite spinner →
 * stillSpinning) without penalising concise-but-working pages.
 */
function classify(probe: ScreenProbe, ok: boolean): string {
  if (!ok) return 'ERROR';
  const t = probe.text.toLowerCase();
  if (
    t.includes('backend unavailable') ||
    t.includes('backend not available') ||
    t.includes('capability is not implemented for this snapshot')
  ) return 'BACKEND_UNAVAILABLE';
  // Still showing a loading indicator after the settle wait, with no substantial resolved content.
  if (probe.stillSpinning && probe.text.length < 1500) return 'LOADING_STUCK';
  // Truly blank — no header and almost no text. Intentional empty-states render a header + copy.
  if (!probe.hasHeading && probe.text.trim().length < 200) return 'EMPTY';
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
    let probe: ScreenProbe = { text: '', hasHeading: false, stillSpinning: false };
    let ok = true;
    let err = '';
    try {
      await page.goto(r.path, { waitUntil: 'domcontentloaded' });
      // Let the SPA mount and fire its initial data requests.
      await page.waitForTimeout(1500);
      // Wait for the page to RESOLVE its loading state. A working page — even a slow one under
      // concurrent backend load — clears its spinners/skeletons within a bounded window. A
      // genuinely-broken page spins forever; that is the G1 "infinite loading" bug this audit
      // targets, and it stays flagged LOADING_STUCK below. The 22s cap exceeds the frontend's own
      // request timeouts, so a hung backend surfaces as a resolved error state, not a false stuck.
      try {
        await page.waitForFunction(
          () => !document.querySelector('[role="progressbar"], .MuiCircularProgress-root, .MuiSkeleton-root, .MuiLinearProgress-root'),
          { timeout: 22000 },
        );
      } catch {}
      try { await page.waitForLoadState('networkidle', { timeout: 5000 }); } catch {}
      probe = await page.evaluate(() => {
        const bodyText = document.body.innerText || '';
        const headingEls = Array.from(
          document.querySelectorAll('h1, h2, h3, h4, [class*="PageHeader"], [class*="page-header"]'),
        );
        const hasHeading = headingEls.some((el) => ((el.textContent || '').trim().length > 0));
        const stillSpinning = Boolean(
          document.querySelector('[role="progressbar"], .MuiCircularProgress-root, .MuiSkeleton-root, .MuiLinearProgress-root'),
        );
        return { text: bodyText, hasHeading, stillSpinning };
      });
      text = probe.text;
      await page.screenshot({ path: path.join(OUT, `${r.slug}.png`), fullPage: true });
    } catch (e: any) {
      ok = false;
      err = String(e).slice(0, 300);
      try { await page.screenshot({ path: path.join(OUT, `${r.slug}-ERR.png`) }); } catch {}
    }
    fs.writeFileSync(path.join(OUT, `${r.slug}.txt`), text);
    const health = classify(probe, ok);
    const newConsole = consoleErrors.length - before.c;
    const routeNet = netErrors.slice(before.n);
    if (health !== 'OK' || newConsole > 0 || routeNet.length > 0) {
      unhealthy.push(`${health.padEnd(20)} ${r.path.padEnd(26)} ${r.label}` +
        (newConsole ? `  [${newConsole} console errs]` : '') +
        (routeNet.length ? `  [${routeNet.length} http>=400]` : ''));
    }
    summary.push({
      slug: r.slug, label: r.label, path: r.path, ok, err, health,
      hasHeading: probe.hasHeading, stillSpinning: probe.stillSpinning,
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
