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
 * For tabbed workspaces (/, /today-review, /screener) it also clicks each tab
 * and records each tab as its own audit entry with slug like `01-market--sectors`.
 *
 * Deep-dives: follows the first /stocks/:id link from /screener and the first
 * candidate detail link from /today-review to audit those pages too.
 *
 * Jargon scan: scans every captured text for banned operator jargon and writes
 * matches to _jargon.txt (report-only, does not fail the test).
 *
 * OPT-IN: skipped during normal `playwright test` runs. Enable with:
 *     UI_AUDIT=1 npx playwright test user-facing-audit
 * Artifacts are written to frontend/test-results/ui-audit/ (gitignored).
 *
 * SOURCE OF TRUTH: ROUTES is derived from frontend/src/app/navigationMetadata.tsx.
 * A guard test (below) reads navigationMetadata.tsx at runtime and fails with a
 * clear message if a nav path is missing from ROUTES — so this spec stays in sync.
 *
 * Reuse for future audits: update ROUTES if nav changes; diff the screenshots /
 * _summary.json against a prior run, or read _unhealthy.txt for a quick triage.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT = path.resolve(__dirname, '../../test-results/ui-audit');

// ---------------------------------------------------------------------------
// ROUTES — derived from navGroups in frontend/src/app/navigationMetadata.tsx.
// Update here whenever navigationMetadata.tsx changes; the guard test below
// will fail if a nav path from that file is absent from this list.
//
// Tabbed workspaces are annotated with their tabs so the crawler can click each.
// Another agent may add /copilot to the nav; the guard test will catch that.
// ---------------------------------------------------------------------------

interface AuditRoute {
  /** File/artifact slug prefix, e.g. "01-market". */
  slug: string;
  /** URL path to visit. */
  path: string;
  /** Human-readable label for output. */
  label: string;
  /**
   * Tabs within a TabbedWorkspace on this route (detected via role=tab).
   * The first tab is the default (already visible on load); the crawler will
   * click each subsequent tab and record it separately. The first entry's slug
   * suffix is omitted (the route probe IS the first tab); subsequent entries
   * produce slugs like "01-market--sectors".
   */
  tabs?: string[];
}

const ROUTES: AuditRoute[] = [
  // Group: Daily Decisions
  {
    slug: '01-market',
    path: '/',
    label: 'Market (home)',
    tabs: ['Health', 'Sectors', 'Events'],
  },
  {
    slug: '02-today-review',
    path: '/today-review',
    label: 'Today',
    tabs: ['Daily Review', 'Shortlist', 'Overview'],
  },
  // Group: Discover
  {
    slug: '03-screener',
    path: '/screener',
    label: 'Screener',
    tabs: ['Screener', 'Market Scans', 'Stock Interest', 'Index Constituents'],
  },
  { slug: '04-research', path: '/research', label: 'Research Hub' },
  { slug: '05-earnings', path: '/earnings-intelligence', label: 'Earnings' },
  { slug: '06-derivatives', path: '/derivatives', label: 'Derivatives / F&O' },
  // Group: My Workspace
  { slug: '07-watchlists', path: '/watchlists', label: 'Watchlists' },
  { slug: '08-portfolios', path: '/portfolios', label: 'Portfolios' },
  { slug: '09-alerts', path: '/alerts', label: 'Alerts' },
  { slug: '10-instrument', path: '/instrument-workspace', label: 'Instrument Workspace' },
  // Account (accessible from nav chrome)
  { slug: '11-account', path: '/account', label: 'Account' },
];

// ---------------------------------------------------------------------------
// Jargon scan — trader-visible text that should never surface
// ---------------------------------------------------------------------------

const BANNED_JARGON: string[] = [
  'Board Selection',
  'Exclusion Explainability',
  'persisted',
  'OHLCV',
  'downstream',
  'downstreamSafe',
  'read model',
  'NSE0',
];

interface JargonHit {
  slug: string;
  label: string;
  term: string;
  context: string;
}

function scanJargon(slug: string, label: string, text: string): JargonHit[] {
  const hits: JargonHit[] = [];
  for (const term of BANNED_JARGON) {
    // "persisted" is exact-word; others are case-insensitive substring
    const flags = term === 'persisted' ? 'g' : 'gi';
    const re = new RegExp(
      term === 'persisted' ? `\\bpersisted\\b` : escapeRegex(term),
      flags,
    );
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const start = Math.max(0, m.index - 40);
      const end = Math.min(text.length, m.index + term.length + 40);
      hits.push({ slug, label, term, context: text.slice(start, end).replace(/\s+/g, ' ') });
    }
  }
  return hits;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// Health probe types + classify
// ---------------------------------------------------------------------------

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
 *   - ERROR                — navigation/JS failure (ok === false).
 *   - BACKEND_UNAVAILABLE  — a dead operator backend stub surfaced to a trader.
 *   - LOADING_STUCK        — a spinner/skeleton never resolved into content.
 *   - EMPTY                — truly blank: no heading and essentially no text.
 *   - OK                   — anything that rendered a header and is not mid-spin.
 */
function classify(probe: ScreenProbe, ok: boolean): string {
  if (!ok) return 'ERROR';
  const t = probe.text.toLowerCase();
  if (
    t.includes('backend unavailable') ||
    t.includes('backend not available') ||
    t.includes('capability is not implemented for this snapshot')
  ) return 'BACKEND_UNAVAILABLE';
  if (probe.stillSpinning && probe.text.length < 1500) return 'LOADING_STUCK';
  if (!probe.hasHeading && probe.text.trim().length < 200) return 'EMPTY';
  return 'OK';
}

// ---------------------------------------------------------------------------
// Wait helper — reused for both route load and post-tab-click settle
// ---------------------------------------------------------------------------

async function waitForSettle(page: import('@playwright/test').Page) {
  await page.waitForTimeout(1500);
  try {
    await page.waitForFunction(
      () => !document.querySelector(
        '[role="progressbar"], .MuiCircularProgress-root, .MuiSkeleton-root, .MuiLinearProgress-root',
      ),
      { timeout: 22000 },
    );
  } catch { /* still spinning — classify will flag it */ }
  try { await page.waitForLoadState('networkidle', { timeout: 5000 }); } catch { /* best effort */ }
}

async function probeCurrentPage(page: import('@playwright/test').Page): Promise<ScreenProbe> {
  return page.evaluate(() => {
    const bodyText = (document.body as HTMLElement).innerText || '';
    const headingEls = Array.from(
      document.querySelectorAll('h1, h2, h3, h4, [class*="PageHeader"], [class*="page-header"]'),
    );
    const hasHeading = headingEls.some((el) => ((el.textContent || '').trim().length > 0));
    const stillSpinning = Boolean(
      document.querySelector(
        '[role="progressbar"], .MuiCircularProgress-root, .MuiSkeleton-root, .MuiLinearProgress-root',
      ),
    );
    return { text: bodyText, hasHeading, stillSpinning };
  });
}

// ---------------------------------------------------------------------------
// GUARD TEST — runs without UI_AUDIT to verify ROUTES stays in sync with
// navigationMetadata.tsx. Parses path strings from the source file via regex
// (no JSX evaluation needed) and fails with a clear message on mismatch.
// ---------------------------------------------------------------------------

test('nav-routes guard: ROUTES matches navigationMetadata.tsx', () => {
  // Read the source file as text
  const navMetaPath = path.resolve(__dirname, '../../src/app/navigationMetadata.tsx');
  const src = fs.readFileSync(navMetaPath, 'utf-8');

  // Extract all path: '...' strings from navGroups items (not adminNavGroups).
  // We stop scanning at adminNavGroups to avoid picking up admin paths.
  const navGroupsSection = src.slice(0, src.indexOf('adminNavGroups'));
  const pathMatches = [...navGroupsSection.matchAll(/\bpath:\s*['"]([^'"]+)['"]/g)];
  const navPaths = pathMatches.map((m) => m[1]);

  const routePaths = new Set(ROUTES.map((r) => r.path));
  const missing = navPaths.filter((p) => !routePaths.has(p));

  if (missing.length > 0) {
    throw new Error(
      `ROUTES in user-facing-audit.spec.ts is missing paths that appear in navigationMetadata.tsx:\n` +
      missing.map((p) => `  ${p}`).join('\n') +
      `\n\nAdd the missing route(s) to the ROUTES array in user-facing-audit.spec.ts and define their tabs if applicable.`,
    );
  }
});

// ---------------------------------------------------------------------------
// MAIN AUDIT TEST
// ---------------------------------------------------------------------------

test('user-facing screen audit crawl', async ({ page }) => {
  test.skip(!process.env.UI_AUDIT, 'Opt-in audit. Run with UI_AUDIT=1 to enable.');
  test.setTimeout(900_000); // 15 minutes

  fs.mkdirSync(OUT, { recursive: true });

  // Global error/network listeners — per-entry deltas tracked via before/after indices
  const consoleErrors: string[] = [];
  const netErrors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300));
  });
  page.on('response', (r) => {
    if (r.status() >= 400) netErrors.push(`${r.status()} ${r.request().method()} ${r.url()}`);
  });

  await visitAuthenticated(page, '/');

  const summary: Record<string, unknown>[] = [];
  const unhealthy: string[] = [];
  const jargonHits: JargonHit[] = [];

  // -------------------------------------------------------------------------
  // Helper: probe + record a single audit entry
  // -------------------------------------------------------------------------
  async function auditEntry(
    slug: string,
    label: string,
    routePath: string,
  ): Promise<void> {
    const before = { c: consoleErrors.length, n: netErrors.length };
    let text = '';
    let probe: ScreenProbe = { text: '', hasHeading: false, stillSpinning: false };
    let ok = true;
    let err = '';
    try {
      probe = await probeCurrentPage(page);
      text = probe.text;
      await page.screenshot({ path: path.join(OUT, `${slug}.png`), fullPage: true });
    } catch (e: unknown) {
      ok = false;
      err = String(e).slice(0, 300);
      try { await page.screenshot({ path: path.join(OUT, `${slug}-ERR.png`) }); } catch { /* ignore */ }
    }
    fs.writeFileSync(path.join(OUT, `${slug}.txt`), text);

    // Jargon scan
    jargonHits.push(...scanJargon(slug, label, text));

    const health = classify(probe, ok);
    const newConsole = consoleErrors.length - before.c;
    const routeNet = netErrors.slice(before.n);
    if (health !== 'OK' || newConsole > 0 || routeNet.length > 0) {
      unhealthy.push(
        `${health.padEnd(20)} ${routePath.padEnd(26)} ${label}` +
        (newConsole ? `  [${newConsole} console errs]` : '') +
        (routeNet.length ? `  [${routeNet.length} http>=400]` : ''),
      );
    }
    summary.push({
      slug,
      label,
      path: routePath,
      ok,
      err,
      health,
      hasHeading: probe.hasHeading,
      stillSpinning: probe.stillSpinning,
      finalUrl: page.url(),
      textLen: text.length,
      textHead: text.replace(/\s+/g, ' ').slice(0, 600),
      newConsoleErrors: newConsole,
      netErrors: routeNet.slice(0, 12),
    });
  }

  // -------------------------------------------------------------------------
  // Main route loop
  // -------------------------------------------------------------------------
  for (const r of ROUTES) {
    // Navigate to the route
    let navOk = true;
    let navErr = '';
    try {
      await page.goto(r.path, { waitUntil: 'domcontentloaded' });
      await waitForSettle(page);
    } catch (e: unknown) {
      navOk = false;
      navErr = String(e).slice(0, 300);
    }

    if (!navOk) {
      // Record as an ERROR entry and skip tab crawling
      const before = { c: consoleErrors.length, n: netErrors.length };
      try { await page.screenshot({ path: path.join(OUT, `${r.slug}-ERR.png`) }); } catch { /* ignore */ }
      fs.writeFileSync(path.join(OUT, `${r.slug}.txt`), '');
      const routeNet = netErrors.slice(before.n);
      unhealthy.push(`${'ERROR'.padEnd(20)} ${r.path.padEnd(26)} ${r.label}  [nav failed: ${navErr.slice(0, 80)}]`);
      summary.push({
        slug: r.slug, label: r.label, path: r.path, ok: false, err: navErr,
        health: 'ERROR', hasHeading: false, stillSpinning: false,
        finalUrl: page.url(), textLen: 0, textHead: '',
        newConsoleErrors: consoleErrors.length - before.c,
        netErrors: routeNet.slice(0, 12),
      });
      continue;
    }

    // --- Probe the route (which is also the first tab if tabs are defined) ---
    if (r.tabs && r.tabs.length > 0) {
      // First tab is already visible — record with base slug
      const firstTabSlug = r.slug; // e.g. "01-market"
      const firstTabLabel = `${r.label} / ${r.tabs[0]}`;
      await auditEntry(firstTabSlug, firstTabLabel, r.path);

      // --- TAB CRAWLING: click each subsequent tab ---
      for (let ti = 1; ti < r.tabs.length; ti++) {
        const tabLabel = r.tabs[ti];
        // Slugify the tab label: lowercase, spaces → hyphens, strip non-alnum-hyphen
        const tabSlug = tabLabel.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const entrySlug = `${r.slug}--${tabSlug}`; // e.g. "01-market--sectors"
        const entryLabel = `${r.label} / ${tabLabel}`;

        // Reset per-tab error baseline so errors attribute to the right tab
        const tabConsoleBefore = consoleErrors.length;

        try {
          // Find the tab by its label text (role=tab)
          const tabEl = page.getByRole('tab', { name: tabLabel, exact: true });
          await tabEl.click({ timeout: 10000 });
          await waitForSettle(page);
        } catch (e: unknown) {
          // Tab click failed — record ERROR and move on
          const tabErr = String(e).slice(0, 300);
          try { await page.screenshot({ path: path.join(OUT, `${entrySlug}-ERR.png`) }); } catch { /* ignore */ }
          fs.writeFileSync(path.join(OUT, `${entrySlug}.txt`), '');
          unhealthy.push(`${'ERROR'.padEnd(20)} ${r.path.padEnd(26)} ${entryLabel}  [tab click failed]`);
          summary.push({
            slug: entrySlug, label: entryLabel, path: r.path, ok: false, err: tabErr,
            health: 'ERROR', hasHeading: false, stillSpinning: false,
            finalUrl: page.url(), textLen: 0, textHead: '',
            newConsoleErrors: consoleErrors.length - tabConsoleBefore,
            netErrors: [] as string[],
          });
          // Navigate back to the route to reset tab state for the next tab
          try {
            await page.goto(r.path, { waitUntil: 'domcontentloaded' });
            await waitForSettle(page);
            // Restore tab position by clicking tabs up to ti-1
            for (let ri = 0; ri < ti; ri++) {
              try {
                await page.getByRole('tab', { name: r.tabs![ri], exact: true }).click({ timeout: 5000 });
                await page.waitForTimeout(500);
              } catch { /* ignore */ }
            }
          } catch { /* ignore */ }
          continue;
        }

        await auditEntry(entrySlug, entryLabel, r.path);
      }

      // Navigate back to base route after tab crawl to avoid state leakage
      try {
        await page.goto(r.path, { waitUntil: 'domcontentloaded' });
        await waitForSettle(page);
      } catch { /* ignore */ }

    } else {
      // No tabs — simple probe
      await auditEntry(r.slug, r.label, r.path);
    }
  }

  // -------------------------------------------------------------------------
  // DEEP-DIVE 1: first /stocks/:id link from /screener (Screener tab)
  // -------------------------------------------------------------------------
  try {
    await page.goto('/screener', { waitUntil: 'domcontentloaded' });
    await waitForSettle(page);

    // Find the first link to /stocks/:id
    const stockLink = page.locator('a[href^="/stocks/"]').first();
    const stockHref = await stockLink.getAttribute('href', { timeout: 5000 }).catch(() => null);

    if (stockHref) {
      await page.goto(stockHref, { waitUntil: 'domcontentloaded' });
      await waitForSettle(page);
      await auditEntry('deep-stock-detail', `Stock detail (${stockHref})`, stockHref);
    } else {
      // No stock link found — record EMPTY entry
      fs.writeFileSync(path.join(OUT, 'deep-stock-detail.txt'), 'no stock link found on /screener');
      summary.push({
        slug: 'deep-stock-detail', label: 'Stock detail (deep-dive)', path: '/stocks/:id',
        ok: true, err: '', health: 'EMPTY', hasHeading: false, stillSpinning: false,
        finalUrl: '', textLen: 0, textHead: 'no stock link found',
        newConsoleErrors: 0, netErrors: [],
        note: 'no stock link found on /screener — G1 acceptance: stock detail not reachable',
      });
      unhealthy.push(`${'EMPTY'.padEnd(20)} ${'deep-stock-detail'.padEnd(26)} Stock detail  [no stock link found on /screener]`);
    }
  } catch (e: unknown) {
    const ddErr = String(e).slice(0, 300);
    fs.writeFileSync(path.join(OUT, 'deep-stock-detail.txt'), '');
    summary.push({
      slug: 'deep-stock-detail', label: 'Stock detail (deep-dive)', path: '/stocks/:id',
      ok: false, err: ddErr, health: 'ERROR', hasHeading: false, stillSpinning: false,
      finalUrl: '', textLen: 0, textHead: '',
      newConsoleErrors: 0, netErrors: [],
    });
    unhealthy.push(`${'ERROR'.padEnd(20)} ${'deep-stock-detail'.padEnd(26)} Stock detail  [${ddErr.slice(0, 60)}]`);
  }

  // -------------------------------------------------------------------------
  // DEEP-DIVE 2: first candidate detail from /today-review
  // -------------------------------------------------------------------------
  try {
    await page.goto('/today-review', { waitUntil: 'domcontentloaded' });
    await waitForSettle(page);

    // Find the first link to /today-review/candidates/:id
    const candidateLink = page.locator('a[href^="/today-review/candidates/"]').first();
    const candidateHref = await candidateLink.getAttribute('href', { timeout: 5000 }).catch(() => null);

    if (candidateHref) {
      await page.goto(candidateHref, { waitUntil: 'domcontentloaded' });
      await waitForSettle(page);
      await auditEntry('deep-candidate-detail', `Candidate detail (${candidateHref})`, candidateHref);
    } else {
      fs.writeFileSync(path.join(OUT, 'deep-candidate-detail.txt'), 'no candidate link found on /today-review');
      summary.push({
        slug: 'deep-candidate-detail', label: 'Candidate detail (deep-dive)', path: '/today-review/candidates/:id',
        ok: true, err: '', health: 'EMPTY', hasHeading: false, stillSpinning: false,
        finalUrl: '', textLen: 0, textHead: 'no candidate link found',
        newConsoleErrors: 0, netErrors: [],
        note: 'no candidate link found on /today-review — expected when daily review list is empty',
      });
      unhealthy.push(`${'EMPTY'.padEnd(20)} ${'deep-candidate-detail'.padEnd(26)} Candidate detail  [no candidate link found on /today-review]`);
    }
  } catch (e: unknown) {
    const ddErr = String(e).slice(0, 300);
    fs.writeFileSync(path.join(OUT, 'deep-candidate-detail.txt'), '');
    summary.push({
      slug: 'deep-candidate-detail', label: 'Candidate detail (deep-dive)', path: '/today-review/candidates/:id',
      ok: false, err: ddErr, health: 'ERROR', hasHeading: false, stillSpinning: false,
      finalUrl: '', textLen: 0, textHead: '',
      newConsoleErrors: 0, netErrors: [],
    });
    unhealthy.push(`${'ERROR'.padEnd(20)} ${'deep-candidate-detail'.padEnd(26)} Candidate detail  [${ddErr.slice(0, 60)}]`);
  }

  // -------------------------------------------------------------------------
  // Write artifacts
  // -------------------------------------------------------------------------
  const totalEntries = summary.length;

  // Jargon report
  const jargonLines = jargonHits.map(
    (h) => `[${h.slug}] ${h.label}\n  term: "${h.term}"\n  context: ...${h.context}...\n`,
  );
  fs.writeFileSync(path.join(OUT, '_jargon.txt'), jargonLines.join('\n') || '(no jargon found)');

  // Annotate summary with jargon count
  const summaryWithJargon = {
    entries: summary,
    jargonHitCount: jargonHits.length,
    jargonTermsFound: [...new Set(jargonHits.map((h) => h.term))],
  };

  fs.writeFileSync(path.join(OUT, '_summary.json'), JSON.stringify(summaryWithJargon, null, 2));
  fs.writeFileSync(path.join(OUT, '_console_errors.txt'), consoleErrors.join('\n'));
  fs.writeFileSync(path.join(OUT, '_unhealthy.txt'), unhealthy.join('\n'));

  // eslint-disable-next-line no-console
  console.log(
    `\n=== UI AUDIT: ${unhealthy.length}/${totalEntries} entries flagged ===\n` +
    (unhealthy.join('\n') || 'all OK') +
    `\n\nJargon hits: ${jargonHits.length} (see _jargon.txt)\nArtifacts: ${OUT}\n`,
  );
});
