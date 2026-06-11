import { TelegramProvider } from './telegram.provider';

const telegram = new TelegramProvider();

export interface PipelineRunAlertOptions {
  status: string;
  region: string;
  assetType: string;
  dataThroughDate: string | null;
  durationMs: number | null;
  stagesSummary: Array<{ stageKey: string; status: string; succeededCount: number; failedCount: number }>;
  firstError?: string | null;
}

function statusEmoji(status: string): string {
  if (status === 'COMPLETED') return '✅';
  if (status === 'PARTIAL') return '⚠️';
  if (status === 'FAILED') return '❌';
  if (status === 'ABANDONED') return '🟠';
  return '❓';
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms < 0) return 'n/a';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

export async function sendPipelineRunAlert(opts: PipelineRunAlertOptions): Promise<void> {
  if (!telegram.isConfigured()) {
    console.log('[PipelineAlert] Telegram not configured — skipping pipeline run alert');
    return;
  }
  try {
    const emoji = statusEmoji(opts.status);
    const scope = `${opts.region}/${opts.assetType}`;
    const dateStr = opts.dataThroughDate ? opts.dataThroughDate.slice(0, 10) : 'n/a';
    const dur = formatDuration(opts.durationMs);
    const stageLines = opts.stagesSummary.map((s) => {
      const se = statusEmoji(s.status);
      return `  ${se} ${s.stageKey}: ${s.status} (ok:${s.succeededCount} fail:${s.failedCount})`;
    });
    const parts = [
      `${emoji} <b>Pipeline ${opts.status}</b>`,
      `Scope: ${scope}  Date: ${dateStr}  Duration: ${dur}`,
    ];
    if (stageLines.length > 0) {
      parts.push('Stages:\n' + stageLines.join('\n'));
    }
    if (opts.firstError) {
      parts.push(`Error: ${opts.firstError.slice(0, 200)}`);
    }
    await telegram.sendMessage(parts.join('\n'));
  } catch (err) {
    console.error('[PipelineAlert] Failed to send pipeline run Telegram alert:', err instanceof Error ? err.message : String(err));
  }
}
