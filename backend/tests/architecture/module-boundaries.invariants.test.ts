/**
 * Module Boundary Invariants
 *
 * A dependency-free (fs + regex) guard that asserts three invariants on the
 * current source tree.  Allowlists capture every known legacy violation so the
 * test is GREEN today; the list must only ever shrink, never grow.
 *
 * Invariant 1 — No module imports another module's .repository file.
 *   Checked for BOTH static `import … from` and dynamic `require(` paths.
 *   Known violations are allowlisted with TODO-FIX comments.
 *
 * Invariant 2 — shared/** must not import from modules/** (backwards dependency).
 *   Checked for static `import … from` paths.
 *   No legacy violations exist at time of writing.
 *
 * Invariant 3 — No `require(` of other modules outside an explicit allowlist
 *   of the known lazy-require cycle-breaking sites.
 *   Each allowed site is annotated with a TODO-FIX comment.
 *
 * To fix a violation: remove it from the allowlist (the test will pass once
 * the real import is gone from the source).  Never add new entries.
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

const BACKEND_SRC = path.resolve(__dirname, '../../src');
const MODULES_DIR = path.join(BACKEND_SRC, 'modules');
const SHARED_DIR = path.join(BACKEND_SRC, 'shared');

function normPath(p: string): string {
  return p.split(path.sep).join('/');
}

interface ScannedFile {
  /** Relative path from MODULES_DIR, e.g. 'alerts-monitoring/alerts-monitoring.service.ts' */
  rel: string;
  /** Top-level module dir, e.g. 'alerts-monitoring' */
  module: string;
  /** Absolute path */
  abs: string;
  lines: string[];
}

function walkModules(): ScannedFile[] {
  const results: ScannedFile[] = [];
  function walk(dir: string) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      if (!e.name.endsWith('.ts')) continue;
      const rel = normPath(path.relative(MODULES_DIR, full));
      const parts = rel.split('/');
      if (parts.length < 2) continue;
      results.push({
        rel,
        module: parts[0],
        abs: full,
        lines: fs.readFileSync(full, 'utf-8').split('\n'),
      });
    }
  }
  walk(MODULES_DIR);
  return results;
}

function walkShared(): Array<{ rel: string; abs: string; lines: string[] }> {
  const results: Array<{ rel: string; abs: string; lines: string[] }> = [];
  function walk(dir: string) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      if (!e.name.endsWith('.ts')) continue;
      results.push({
        rel: normPath(path.relative(SHARED_DIR, full)),
        abs: full,
        lines: fs.readFileSync(full, 'utf-8').split('\n'),
      });
    }
  }
  walk(SHARED_DIR);
  return results;
}

// ---------------------------------------------------------------------------
// Allowlists
// ---------------------------------------------------------------------------

/**
 * Invariant 1 allowlist — cross-module .repository imports via static `import … from`.
 * Each entry is "file.rel: static import from ../target-module/filename.repository"
 * matching the exact violation string emitted by the test.
 * TODO-FIX: Remove each entry once the static import is replaced with a
 * service-layer API call.
 */
const ALLOWED_STATIC_REPOSITORY_IMPORTS: ReadonlySet<string> = new Set([
  // research-hub → snapshot-assembler.repository
  // TODO-FIX: expose a typed read method on SnapshotAssemblerService instead.
  'research-hub/research-hub.snapshot-reader.ts: static import from ../snapshot-assembler/snapshot-assembler.repository',
]);

/**
 * Invariant 1 allowlist — cross-module .repository imports via require().
 * Each entry is "sourceModule:targetModule/filename.repository" (no quotes).
 * TODO-FIX: Remove each entry once the corresponding lazy-require is replaced
 * with a proper service-layer API call.
 */
const ALLOWED_REQUIRE_REPOSITORY_VIOLATIONS: ReadonlySet<string> = new Set([
  // market-data-foundation → signal-quality-lab.repository
  // Used for lazy signal-outcome invalidation after adjusted-close recompute.
  // TODO-FIX: expose an invalidate() method on SignalQualityLabService and call it instead.
  'market-data-foundation:signal-quality-lab/signal-quality-lab.repository',

  // signal-generation-engine → signal-calibration-engine.repository
  // Lazy-require to break circular dependency at startup.
  // TODO-FIX: extract CalibrationReader interface; have calibration service implement it.
  'signal-generation-engine:signal-calibration-engine/signal-calibration-engine.repository',

  // stock-research-workbench → signal-calibration-engine.repository
  // TODO-FIX: same as above — use CalibrationReader interface.
  'stock-research-workbench:signal-calibration-engine/signal-calibration-engine.repository',

  // stock-research-workbench → signal-quality-lab.repository
  // TODO-FIX: expose read methods on SignalQualityLabService.
  'stock-research-workbench:signal-quality-lab/signal-quality-lab.repository',

  // stock-research-workbench → signal-generation-engine.repository
  // TODO-FIX: expose read methods on SignalGenerationEngineService.
  'stock-research-workbench:signal-generation-engine/signal-generation-engine.repository',
]);

/**
 * Invariant 3 allowlist — ALL known lazy-require sites across the codebase.
 * Key: "sourceModule:requirePath" (no leading ../).
 * Value: short rationale (not used in assertion, documents the allowlisting).
 * TODO-FIX: Remove each entry once the circular dependency is resolved.
 */
const ALLOWED_LAZY_REQUIRE_SITES: ReadonlyMap<string, string> = new Map([
  // ai-investment-copilot — cycle-breaking requires
  [
    'ai-investment-copilot:../strategy-decision-engine/strategy-decision-engine.service',
    'Cycle: copilot → strategy-decision-engine → ... → copilot',
  ],
  [
    'ai-investment-copilot:../trade-plan-risk-engine/trade-plan-risk-engine.service',
    'Cycle: copilot → trade-plan-risk-engine → ... → copilot',
  ],
  [
    'ai-investment-copilot:../today-trade-review/today-trade-review.service',
    'Cycle: copilot → today-trade-review → ... → copilot',
  ],

  // market-context-intelligence — eod-ingest scheduler
  [
    'market-context-intelligence:../../modules/market-data-foundation/market-data-foundation.service',
    'Startup lazy-load in eod-ingest.scheduler to avoid circular init.',
  ],
  [
    'market-context-intelligence:../../modules/market-intelligence/stock-interest-snapshot.service',
    'Startup lazy-load in eod-ingest.scheduler.',
  ],
  [
    'market-context-intelligence:../../modules/market-context-intelligence/market-pulse-snapshot.service',
    'Internal module lazy-load in eod-ingest.scheduler.',
  ],
  [
    'market-context-intelligence:../../modules/research-hub/research-hub.service',
    'Startup lazy-load in eod-ingest.scheduler.',
  ],
  [
    'market-context-intelligence:../../modules/stock-research-workbench',
    'Startup lazy-load in eod-ingest.scheduler.',
  ],

  // market-data-foundation — scheduler lazy-loads (inter-module only; intra-module ./ requires are excluded)
  [
    'market-data-foundation:../signal-generation-engine/signal-generation-engine.crypto-service',
    'Scheduler lazy-loads crypto-signal service to avoid circular startup.',
  ],
  [
    'market-data-foundation:../market-context-intelligence/market-context-intelligence.service',
    'Scheduler lazy-loads market-context service to avoid circular startup.',
  ],
  // service-level lazy-require (cross-module .repository — also covered by invariant 1)
  [
    'market-data-foundation:../signal-quality-lab/signal-quality-lab.repository',
    'Cross-module lazy-require for signal-outcome invalidation. TODO-FIX: see invariant-1 allowlist.',
  ],

  // portfolio-intelligence
  [
    'portfolio-intelligence:../market-context-intelligence/capital-posture.service',
    'Cycle: portfolio-intelligence → market-context-intelligence → ... → portfolio-intelligence.',
  ],

  // portfolio-management
  [
    'portfolio-management:../portfolio-intelligence/portfolio-intelligence.service',
    'Cycle: portfolio-management → portfolio-intelligence → ... → portfolio-management.',
  ],

  // research-hub controller
  [
    'research-hub:../today-trade-review/today-trade-review.service',
    'Cycle-breaking require in research-hub.controller.',
  ],
  [
    'research-hub:../trade-plan-risk-engine/trade-plan-risk-engine.service',
    'Cycle-breaking require in research-hub.controller.',
  ],

  // signal-generation-engine
  [
    'signal-generation-engine:../strategy-framework/strategy-framework.service',
    'Lazy-require to break signal-gen → strategy-framework cycle.',
  ],
  [
    'signal-generation-engine:../market-context-intelligence/capital-posture.service',
    'Lazy-require to break signal-gen → capital-posture cycle.',
  ],
  // cross-module .repository — also covered by invariant 1
  [
    'signal-generation-engine:../signal-calibration-engine/signal-calibration-engine.repository',
    'Cross-module lazy-require. TODO-FIX: see invariant-1 allowlist.',
  ],

  // stock-research-workbench
  // cross-module .repository — also covered by invariant 1
  [
    'stock-research-workbench:../signal-calibration-engine/signal-calibration-engine.repository',
    'Cross-module lazy-require. TODO-FIX: see invariant-1 allowlist.',
  ],
  [
    'stock-research-workbench:../signal-quality-lab/signal-quality-lab.repository',
    'Cross-module lazy-require. TODO-FIX: see invariant-1 allowlist.',
  ],
  [
    'stock-research-workbench:../signal-generation-engine/signal-generation-engine.repository',
    'Cross-module lazy-require. TODO-FIX: see invariant-1 allowlist.',
  ],

  // strategy-framework
  [
    'strategy-framework:../backtesting-strategy-lab',
    'Lazy-require to break strategy-framework → backtesting cycle.',
  ],

  // today-trade-review
  [
    'today-trade-review:../market-context-intelligence/capital-posture.service',
    'Lazy-require to break today-trade-review → market-context cycle.',
  ],

  // portfolio-intelligence internal (non-module)
  [
    'portfolio-intelligence:crypto',
    'Node built-in require("crypto") for randomUUID — not a module boundary violation.',
  ],
]);

// ---------------------------------------------------------------------------
// Helpers to extract require() paths
// ---------------------------------------------------------------------------

/** Extract the string argument from a `require('...')` or `require("...")` call. */
function extractRequirePaths(lines: string[]): string[] {
  const paths: string[] = [];
  for (const line of lines) {
    // Match: require('./path') require('../path') require('some-module')
    const m = line.match(/require\s*\(\s*['"]([\s\S]*?)['"]\s*\)/);
    if (m) paths.push(m[1]);
  }
  return paths;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Module boundary invariants', () => {
  let moduleFiles: ScannedFile[];
  let sharedFiles: Array<{ rel: string; abs: string; lines: string[] }>;

  beforeAll(() => {
    moduleFiles = walkModules();
    sharedFiles = walkShared();
  });

  // -------------------------------------------------------------------------
  // Invariant 1 — no cross-module .repository imports
  // -------------------------------------------------------------------------

  it('no module imports another module .repository file (static imports)', () => {
    const violations: string[] = [];

    for (const file of moduleFiles) {
      for (const line of file.lines) {
        const m = line.match(/from\s+['"]([.][.][/\\][^'"]*[.]repository)['"]/);
        if (!m) continue;
        const imp = normPath(m[1]);
        const ip = imp.split('/');
        // ip[0] === '..', ip[1] === target module dir
        if (ip.length >= 2 && ip[1] !== file.module) {
          const violationKey = `${file.rel}: static import from ${imp}`;
          if (!ALLOWED_STATIC_REPOSITORY_IMPORTS.has(violationKey)) {
            violations.push(violationKey);
          }
        }
      }
    }

    if (violations.length > 0) {
      throw new Error(
        'Static cross-module .repository imports found (fix or add to ALLOWED_STATIC_REPOSITORY_IMPORTS):\n' +
          violations.map((v) => '  ' + v).join('\n'),
      );
    }
  });

  it('no module imports another module .repository file via require() — only allowlisted legacy sites', () => {
    const violations: string[] = [];

    for (const file of moduleFiles) {
      for (const reqPath of extractRequirePaths(file.lines)) {
        const norm = normPath(reqPath);
        // Is this a cross-module .repository require?
        if (!norm.includes('.repository')) continue;
        const ip = norm.split('/');
        // Pattern: ../target-module/target-module.repository
        if (ip.length < 2) continue;
        // Strip leading '..' parts to find the target module
        let targetModule = '';
        if (ip[0] === '..') {
          targetModule = ip[1];
        } else if (ip[0] === '../..') {
          // ../../modules/target-module/...
          const modIdx = ip.indexOf('modules');
          if (modIdx !== -1 && ip.length > modIdx + 1) {
            targetModule = ip[modIdx + 1];
          }
        }
        if (!targetModule || targetModule === file.module) continue;

        const key = `${file.module}:${targetModule}/${ip[ip.length - 1]}`;
        if (!ALLOWED_REQUIRE_REPOSITORY_VIOLATIONS.has(key)) {
          violations.push(`${file.rel}: require(${reqPath}) — add to ALLOWED_REQUIRE_REPOSITORY_VIOLATIONS or fix`);
        }
      }
    }

    if (violations.length > 0) {
      throw new Error(
        'Cross-module .repository require() calls found outside allowlist:\n' +
          violations.map((v) => '  ' + v).join('\n'),
      );
    }
  });

  // -------------------------------------------------------------------------
  // Invariant 2 — shared/** must not import from modules/**
  // -------------------------------------------------------------------------

  it('shared/** has no imports pointing back at modules/** (no backwards dependency)', () => {
    const violations: string[] = [];

    for (const file of sharedFiles) {
      for (const line of file.lines) {
        // Both static import and require
        const staticM = line.match(/from\s+['"]([^'"]*modules[/\\][^'"]+)['"]/);
        const requireM = line.match(/require\s*\(\s*['"]([^'"]*modules[/\\][^'"]+)['"]\s*\)/);
        for (const m of [staticM, requireM]) {
          if (m) {
            violations.push(`shared/${file.rel}: imports from ${m[1]}`);
          }
        }
      }
    }

    if (violations.length > 0) {
      throw new Error(
        'shared/** must not depend on modules/**:\n' +
          violations.map((v) => '  ' + v).join('\n'),
      );
    }
  });

  // -------------------------------------------------------------------------
  // Invariant 3 — require() of other modules only within allowlist
  // -------------------------------------------------------------------------

  it('all require() calls to other modules are in the known-lazy-require allowlist', () => {
    const violations: string[] = [];

    for (const file of moduleFiles) {
      for (const reqPath of extractRequirePaths(file.lines)) {
        const norm = normPath(reqPath);
        // Only care about inter-module requires (those containing 'modules' or '..')
        // that are NOT intra-module (same module directory).
        const isInterModule =
          norm.startsWith('../') ||
          norm.startsWith('../../modules/');

        if (!isInterModule) continue;

        // Build allowlist key: "sourceModule:requirePath"
        const key = `${file.module}:${reqPath}`;

        if (!ALLOWED_LAZY_REQUIRE_SITES.has(key)) {
          violations.push(`${file.rel}: require('${reqPath}') — add to ALLOWED_LAZY_REQUIRE_SITES or fix`);
        }
      }
    }

    if (violations.length > 0) {
      throw new Error(
        'Unallowlisted require() calls to other modules found:\n' +
          violations.map((v) => '  ' + v).join('\n'),
      );
    }
  });

  // -------------------------------------------------------------------------
  // Allowlist integrity — every entry in the allowlists still exists in source
  // (prevents stale allowlist entries from silently accumulating)
  // -------------------------------------------------------------------------

  it('ALLOWED_REQUIRE_REPOSITORY_VIOLATIONS has no stale entries (every entry matches at least one source location)', () => {
    const presentKeys = new Set<string>();

    for (const file of moduleFiles) {
      for (const reqPath of extractRequirePaths(file.lines)) {
        const norm = normPath(reqPath);
        if (!norm.includes('.repository')) continue;
        const ip = norm.split('/');
        if (ip.length < 2) continue;
        let targetModule = '';
        if (ip[0] === '..') targetModule = ip[1];
        else if (ip[0] === '../..') {
          const modIdx = ip.indexOf('modules');
          if (modIdx !== -1 && ip.length > modIdx + 1) targetModule = ip[modIdx + 1];
        }
        if (!targetModule || targetModule === file.module) continue;
        const key = `${file.module}:${targetModule}/${ip[ip.length - 1]}`;
        presentKeys.add(key);
      }
    }

    const stale: string[] = [];
    for (const key of ALLOWED_REQUIRE_REPOSITORY_VIOLATIONS) {
      if (!presentKeys.has(key)) {
        stale.push(key);
      }
    }

    if (stale.length > 0) {
      throw new Error(
        'Stale entries in ALLOWED_REQUIRE_REPOSITORY_VIOLATIONS (violation no longer exists — remove from allowlist):\n' +
          stale.map((s) => '  ' + s).join('\n'),
      );
    }
  });

  it('ALLOWED_LAZY_REQUIRE_SITES has no stale entries (every entry matches at least one source location)', () => {
    const presentKeys = new Set<string>();

    for (const file of moduleFiles) {
      for (const reqPath of extractRequirePaths(file.lines)) {
        const norm = normPath(reqPath);
        const isInterModule = norm.startsWith('../') || norm.startsWith('../../modules/');
        if (!isInterModule) continue;
        presentKeys.add(`${file.module}:${reqPath}`);
      }
    }

    const stale: string[] = [];
    for (const [key] of ALLOWED_LAZY_REQUIRE_SITES) {
      // Skip the built-in 'crypto' entry — it won't appear in inter-module scan
      if (key.endsWith(':crypto')) continue;
      if (!presentKeys.has(key)) {
        stale.push(key);
      }
    }

    if (stale.length > 0) {
      throw new Error(
        'Stale entries in ALLOWED_LAZY_REQUIRE_SITES (require no longer exists — remove from allowlist):\n' +
          stale.map((s) => '  ' + s).join('\n'),
      );
    }
  });

  it('ALLOWED_STATIC_REPOSITORY_IMPORTS has no stale entries (every entry matches at least one source location)', () => {
    const presentKeys = new Set<string>();

    for (const file of moduleFiles) {
      for (const line of file.lines) {
        const m = line.match(/from\s+['"]([.][.][/\\][^'"]*[.]repository)['"]/);
        if (!m) continue;
        const imp = normPath(m[1]);
        const ip = imp.split('/');
        if (ip.length >= 2 && ip[1] !== file.module) {
          presentKeys.add(`${file.rel}: static import from ${imp}`);
        }
      }
    }

    const stale: string[] = [];
    for (const key of ALLOWED_STATIC_REPOSITORY_IMPORTS) {
      if (!presentKeys.has(key)) {
        stale.push(key);
      }
    }

    if (stale.length > 0) {
      throw new Error(
        'Stale entries in ALLOWED_STATIC_REPOSITORY_IMPORTS (violation no longer exists — remove from allowlist):\n' +
          stale.map((s) => '  ' + s).join('\n'),
      );
    }
  });
});
