/**
 * Post-pipeline demo publish trigger.
 *
 * Fired from the DAG completion hook (PipelineOrchestrationService.getDagRunner's
 * alertFn) once the whole pipeline has settled. When enabled, it re-captures the
 * GitHub Pages demo data and pushes it to the deploy branch — by spawning
 * scripts/publish-demo.mjs (which owns the capture + scoped-commit + push logic).
 *
 * Strictly opt-in and best-effort: it is OFF unless DEMO_AUTO_PUBLISH=true, only
 * runs for the demo scope (IN / STOCK) on a successful run, never throws, and
 * never affects the pipeline run status. Heavy lifting lives in the script, not
 * here, so the data pipeline stays free of git/deploy concerns.
 */
import { spawn } from 'child_process';
import path from 'path';
import type { DagAlertSummary } from './pipeline-dag-runner';

const PUBLISH_TIMEOUT_MS = 5 * 60 * 1000;

// repoRoot: this file is backend/src/modules/pipeline-orchestration → up 4.
function resolveRepoRoot(): string {
  return process.env.DEMO_REPO_ROOT || path.resolve(__dirname, '../../../..');
}

// In-process guard so overlapping pipeline completions don't stack publishes.
let isPublishing = false;

export function triggerDemoPublishIfEnabled(summary: DagAlertSummary): void {
  if (process.env.DEMO_AUTO_PUBLISH !== 'true') return;
  if (summary.region !== 'IN' || summary.assetType !== 'STOCK') return;
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
