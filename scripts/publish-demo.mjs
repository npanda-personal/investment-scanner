/**
 * Publish the GitHub Pages demo data — WITHOUT ever touching the main checkout.
 *
 * Run LOCALLY (manually or from the post-pipeline trigger):
 *     node scripts/publish-demo.mjs            # capture + deploy
 *     node scripts/publish-demo.mjs --dry-run  # capture + commit in worktree, no push
 *
 * Why a worktree: capturing demo data wipes-and-rewrites ~4,100 files under
 * frontend/public/demo-api. Doing that in the shared checkout left dirty WIP on
 * every failure/timeout. Instead we create an EPHEMERAL git worktree OUTSIDE the
 * repo, detached at the current DEMO_SOURCE_BRANCH (dev) HEAD, capture into it,
 * commit there, and force-push that snapshot to the deploy branch. The main
 * checkout's working tree and index are never modified.
 *
 * How latest code reaches Pages: the worktree is detached at dev HEAD each run, so
 * it always contains the newest merged code; the force-push replaces the deploy
 * branch with (latest dev + freshly captured data). No merge/pull step needed.
 *
 * Steps:
 *   0. Sweep + reclaim any leaked worktree from a previously-killed run (see
 *      sweepStaleWorktrees — pid-independent, so it frees a SIGKILL orphan).
 *   1. Create an ephemeral worktree detached at <SOURCE_BRANCH> HEAD.
 *   2. Capture demo data INTO the worktree (never the main checkout).
 *   3. Stage ONLY frontend/public/demo-api; if unchanged -> exit 0.
 *   4. Commit (scoped) in the worktree.
 *   5. Force-push HEAD -> origin/<DEPLOY_BRANCH> (single-writer deploy branch) so
 *      the Pages workflow (.github/workflows/pages.yml, on push to that branch)
 *      redeploys. Best-effort ff-mirror of <SOURCE_BRANCH> to origin (offsite
 *      backup; does NOT trigger Pages).
 *   6. finally: remove this run's worktree + prune. On a parent SIGKILL (publish
 *      timeout) this finally is skipped — the next run's step-0 sweep reclaims it.
 *
 * Safety / best-effort:
 *   - GIT_TERMINAL_PROMPT=0 so missing credentials fail fast instead of hanging.
 *   - Scoped add only — never touches unrelated files.
 *   - Any git failure -> non-zero exit (the caller treats it as non-fatal).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(moduleDir, '..');
const DEMO_DIR = 'frontend/public/demo-api';
const WT_PREFIX = 'is-demo-publish-'; // ephemeral-worktree dir name prefix (in os.tmpdir())
const SOURCE_BRANCH = process.env.DEMO_SOURCE_BRANCH || 'dev';
const DEPLOY_BRANCH = process.env.DEMO_DEPLOY_BRANCH || 'demo-pages';
const DRY_RUN = process.argv.includes('--dry-run');
const AUTH_STATE_PATH = path.join(ROOT, 'frontend', 'tests', 'ui', 'support', '.auth-state.json');

const gitEnv = { ...process.env, GIT_TERMINAL_PROMPT: '0' };

/** Run a command, capturing stdout; rejects on non-zero exit. cwd defaults to ROOT. */
function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: ROOT, env: gitEnv, ...opts });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => {
      stdout += d;
      if (opts.inherit) process.stdout.write(d);
    });
    child.stderr?.on('data', (d) => {
      stderr += d;
      if (opts.inherit) process.stderr.write(d);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`${cmd} ${args.join(' ')} exited ${code}: ${stderr.trim() || stdout.trim()}`));
    });
  });
}

/** Run git; `cwd` picks which working tree the command runs in (default: main repo). */
function git(args, cwd = ROOT) {
  return run('git', args, { cwd });
}

async function removeWorktree(dir) {
  try {
    await git(['worktree', 'remove', '--force', dir]);
  } catch (err) {
    console.warn(`· worktree remove warning: ${err.message}`);
  }
  try {
    await git(['worktree', 'prune']);
  } catch { /* best-effort */ }
  // Belt-and-suspenders: ensure the temp dir is gone even if `worktree remove` left it.
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch { /* best-effort */ }
}

/**
 * PID-independent reclamation of leaked ephemeral worktrees. The per-run worktree
 * dir is named with the current PID, but the publish timeout kills the parent with
 * SIGKILL — uncatchable, so the finally that would remove it never runs. A later
 * run has a DIFFERENT pid and computes a DIFFERENT path, so a pid-scoped cleanup
 * can never reclaim the orphan (and `git worktree prune` can't either: the dir is
 * still fully present, just abandoned). So on startup we sweep EVERY is-demo-publish-*
 * sibling in os.tmpdir(), reclaiming any leak from a previously-killed run
 * regardless of pid. Quiet + best-effort: dirs that aren't registered worktrees or
 * are already gone are ignored.
 */
async function sweepStaleWorktrees() {
  const tmp = os.tmpdir();
  let names = [];
  try {
    names = fs.readdirSync(tmp).filter((n) => n.startsWith(WT_PREFIX));
  } catch { /* best-effort */ }
  for (const name of names) {
    const dir = path.join(tmp, name);
    try { await git(['worktree', 'remove', '--force', dir]); } catch { /* not registered / gone */ }
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best-effort */ }
  }
  try { await git(['worktree', 'prune']); } catch { /* best-effort */ }
}

async function main() {
  // Pin the source ref to a concrete SHA so the snapshot is stable even if dev
  // moves (parallel merges) during the long capture.
  const sourceSha = await git(['rev-parse', SOURCE_BRANCH]);

  const wtDir = path.join(os.tmpdir(), `${WT_PREFIX}${process.pid}`);
  // Reclaim ALL leaked worktrees (pid-independent) before re-adding — a prior run
  // SIGKILL'd by the publish timeout skips its finally, and only this startup sweep
  // can free the orphan (a later run's pid differs, so pid-scoped cleanup can't).
  // Covers this pid's own dir too, in case the pid was reused since a crash.
  await sweepStaleWorktrees();

  console.log(`· creating ephemeral worktree (detached @ ${SOURCE_BRANCH} ${sourceSha.slice(0, 8)})`);
  await git(['worktree', 'add', '--detach', wtDir, sourceSha]);

  try {
    // 1. Capture INTO the worktree's demo-api. We run the worktree's own copy of the
    //    capture script (so its ROOT is the worktree) and also pass DEMO_OUT_DIR
    //    explicitly; either way the main checkout is never written. Reuse the main
    //    checkout's Playwright token so no fresh login is needed.
    const outDir = path.join(wtDir, 'frontend', 'public', 'demo-api');
    console.log('· capturing demo data…');
    await run(process.execPath, [path.join(wtDir, 'scripts', 'capture-demo-data.mjs')], {
      cwd: wtDir,
      inherit: true,
      env: { ...gitEnv, DEMO_OUT_DIR: outDir, DEMO_AUTH_STATE_PATH: AUTH_STATE_PATH },
    });

    // 2. Scoped stage + change detection (in the worktree).
    await git(['add', '--', DEMO_DIR], wtDir);
    try {
      await git(['diff', '--cached', '--quiet', '--', DEMO_DIR], wtDir);
      console.log('· demo data unchanged — nothing to publish.');
      return;
    } catch {
      // non-zero => staged changes present; proceed.
    }

    // 3. Commit (scoped) in the detached worktree.
    const today = new Date().toISOString().slice(0, 10);
    await git(['commit', '-m', `chore(demo): refresh US/IN/Crypto data (data through ${today})`, '--', DEMO_DIR], wtDir);

    if (DRY_RUN) {
      console.log('· --dry-run: commit created in worktree; skipping pushes.');
      return;
    }

    // 4. Deploy: force-push the snapshot to the single-writer deploy branch.
    console.log(`· pushing to origin/${DEPLOY_BRANCH} (force)…`);
    await git(['push', '--force', 'origin', `HEAD:refs/heads/${DEPLOY_BRANCH}`], wtDir);

    // 5. Best-effort ff-mirror of the source branch to origin (offsite backup; the
    //    Pages workflow does NOT trigger on this branch, so it won't redeploy). This
    //    is a plain (non-force) push, so it no-ops/rejects whenever origin/<SOURCE>
    //    has diverged — that's expected and non-fatal; the deploy above is what
    //    matters. We never force this branch.
    try {
      await git(['push', 'origin', `${SOURCE_BRANCH}:${SOURCE_BRANCH}`], wtDir);
    } catch (err) {
      console.warn(`· ${SOURCE_BRANCH} mirror push skipped (non-fatal): ${err.message}`);
    }

    console.log(`✓ demo data published to ${DEPLOY_BRANCH} — Pages will redeploy.`);
  } finally {
    await removeWorktree(wtDir);
  }
}

main().catch((err) => {
  console.error('✗ publish-demo failed:', err.message);
  process.exit(1);
});
