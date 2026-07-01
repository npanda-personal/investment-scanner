/**
 * Post-pipeline demo publish trigger.
 *
 * Fired from the DAG completion hook (PipelineOrchestrationService.getDagRunner's
 * alertFn) once the whole pipeline has settled. When enabled, it re-captures the
 * GitHub Pages demo data and force-pushes it to the deploy branch — by spawning
 * scripts/publish-demo.mjs, which does all its work in an EPHEMERAL git worktree
 * (detached at dev HEAD) so the shared main checkout is never touched. That script
 * owns the worktree lifecycle + capture + scoped-commit + push logic.
 *
 * Strictly opt-in and best-effort: it is OFF unless DEMO_AUTO_PUBLISH=true, only
 * runs for the demo scope (IN / STOCK) on a successful run, never throws, and
 * never affects the pipeline run status. Because the script is worktree-isolated,
 * a timeout SIGKILL only abandons a throwaway worktree (cleaned up by the script's
 * own finally / next run) — it can no longer leave the main checkout dirty. The
 * timeout is therefore generous, sized for a keep-all (uncapped) capture.
 */
import { spawn } from 'child_process';
import path from 'path';
import type { DagAlertSummary } from './pipeline-dag-runner';

const PUBLISH_TIMEOUT_MS = 30 * 60 * 1000;

// repoRoot: this file is backend/src/modules/pipeline-orchestration → up 4.
function resolveRepoRoot(): string {
  return process.env.DEMO_REPO_ROOT || path.resolve(__dirname, '../../../..');
}

// In-process guard so overlapping pipeline completions don't stack publishes.
let isPublishing = false;
// One-time log so an OFF flag is diagnosable instead of silently no-op'ing on
// every pipeline completion (the failure mode that hid a stale demo for days).
let loggedDisabled = false;

export function triggerDemoPublishIfEnabled(summary: DagAlertSummary): void {
  if (process.env.DEMO_AUTO_PUBLISH !== 'true') {
    if (!loggedDisabled) {
      console.log('[DemoPublish] disabled (DEMO_AUTO_PUBLISH != "true") — skipping auto-publish on pipeline completion');
      loggedDisabled = true;
    }
    return;
  }
  if (!['IN', 'US'].includes(summary.region) || summary.assetType !== 'STOCK') return;
  if (summary.runStatus !== 'COMPLETED' && summary.runStatus !== 'PARTIAL') return;

  if (isPublishing) {
    console.warn('[DemoPublish] skip — a publish is already in flight');
    return;
  }
  isPublishing = true;

  const repoRoot = resolveRepoRoot();
  const script = path.join('scripts', 'publish-demo.mjs');
  console.log(`[DemoPublish] starting (data through ${summary.dataThroughDate})`);

  let child: ReturnType<typeof spawn>;
  try {
    child = spawn(process.execPath, [script], {
      cwd: repoRoot,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    });
  } catch (err) {
    isPublishing = false;
    console.error('[DemoPublish] failed to spawn publish script:', err instanceof Error ? err.message : String(err));
    return;
  }

  const timer = setTimeout(() => {
    console.error('[DemoPublish] timed out — killing publish script');
    // Reset the guard directly: if the child somehow zombies and never emits
    // 'close', this prevents auto-publish from being permanently disabled.
    isPublishing = false;
    child.kill('SIGKILL');
  }, PUBLISH_TIMEOUT_MS);

  child.stdout?.on('data', (d) => process.stdout.write(`[DemoPublish] ${d}`));
  child.stderr?.on('data', (d) => process.stderr.write(`[DemoPublish] ${d}`));
  child.on('error', (err) => {
    clearTimeout(timer);
    isPublishing = false;
    console.error('[DemoPublish] publish script error:', err.message);
  });
  child.on('close', (code) => {
    clearTimeout(timer);
    isPublishing = false;
    if (code === 0) console.log('[DemoPublish] done');
    else console.warn(`[DemoPublish] publish script exited ${code} (non-fatal)`);
  });
}
