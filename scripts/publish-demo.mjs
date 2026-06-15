/**
 * Publish the GitHub Pages demo data.
 *
 * Run LOCALLY (manually or from the post-pipeline trigger):
 *     node scripts/publish-demo.mjs
 *
 * Steps:
 *   1. Re-capture demo data (spawns scripts/capture-demo-data.mjs).
 *   2. Stage ONLY frontend/public/demo-api (never -A).
 *   3. If nothing changed -> exit 0 (no empty commit).
 *   4. Else commit (scoped) and push to the target branch -> the Pages workflow
 *      (.github/workflows/pages.yml, on push to dev) redeploys.
 *
 * Safety / best-effort:
 *   - Only acts when the current branch === target branch (default 'dev'); else
 *     logs a warning and exits 0 (never commits on the wrong branch).
 *   - Scoped add only — never touches other working-tree changes.
 *   - Plain fast-forward push; never --force, never --no-verify.
 *   - GIT_TERMINAL_PROMPT=0 so missing credentials fail fast instead of hanging.
 *   - Any git failure -> non-zero exit (the caller treats it as non-fatal).
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(moduleDir, '..');
const DEMO_DIR = 'frontend/public/demo-api';
const TARGET_BRANCH = process.env.DEMO_PUBLISH_BRANCH || 'dev';

const gitEnv = { ...process.env, GIT_TERMINAL_PROMPT: '0' };

/** Run a command, capturing stdout; rejects on non-zero exit. */
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

async function git(...args) {
  return run('git', args);
}

async function main() {
  // 1. Re-capture (stream output so capture progress is visible).
  console.log('· capturing demo data…');
  await run(process.execPath, [path.join('scripts', 'capture-demo-data.mjs')], { inherit: true });

  // 2. Branch guard.
  const branch = await git('rev-parse', '--abbrev-ref', 'HEAD');
  if (branch !== TARGET_BRANCH) {
    console.warn(`· on branch "${branch}", not "${TARGET_BRANCH}" — skipping commit/push (no changes published).`);
    return;
  }

  // 3. Scoped stage + change detection.
  await git('add', '--', DEMO_DIR);
  try {
    await git('diff', '--cached', '--quiet', '--', DEMO_DIR);
    // exit 0 from --quiet => no staged changes.
    console.log('· demo data unchanged — nothing to publish.');
    return;
  } catch {
    // non-zero => there are staged changes; proceed.
  }

  // 4. Commit (scoped) + push.
  const today = new Date().toISOString().slice(0, 10);
  await git('commit', '-m', `chore(demo): auto-refresh demo data (data through ${today})`, '--', DEMO_DIR);
  console.log(`· committed; pushing to origin/${TARGET_BRANCH}…`);
  await git('push', 'origin', TARGET_BRANCH);
  console.log('✓ demo data published — Pages will redeploy.');
}

main().catch((err) => {
  console.error('✗ publish-demo failed:', err.message);
  process.exit(1);
});
