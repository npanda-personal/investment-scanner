/**
 * pipeline-dag-stages-snapshot-assembler.ts
 *
 * PipelineStageAdapter for SNAPSHOT_ASSEMBLER — the final DAG stage.
 * Writes one DailyInstrumentSnapshot row per instrument for the trading date.
 *
 * stageOrder: 19  (terminal; nothing depends on it in the DAG)
 * stageVersion: 'dag-v1'
 * supportsInstrumentScope: true
 */

import { SnapshotAssemblerService } from '../snapshot-assembler';
import type { PipelineStageAdapter, StageContext, StageResult } from './pipeline-dag.types';

export interface SnapshotAssemblerStageServices {
  snapshotAssemblerService: SnapshotAssemblerService;
}

export function createSnapshotAssemblerAdapter(
  services: SnapshotAssemblerStageServices,
): PipelineStageAdapter {
  return {
    key: 'SNAPSHOT_ASSEMBLER',
    stageOrder: 19,
    stageVersion: 'dag-v1',
    dependsOn: [],   // filled in by buildPipelineDagAdapters from PIPELINE_DAG_EDGES
    supportsInstrumentScope: true,

    async run(ctx: StageContext): Promise<StageResult> {
      const instrumentIds =
        ctx.instrumentScope && ctx.instrumentScope.length > 0
          ? [...ctx.instrumentScope]
          : null;

      const summary = await services.snapshotAssemblerService.assemble({
        tradingDate: ctx.tradingDate,
        region: ctx.region,
        assetType: ctx.assetType,
        instrumentIds,
      });

      ctx.heartbeat();

      const succeededCount = summary.rowCount;

      // FIX 3: distinguish genuinely-empty scope (SKIPPED) from zero-row output
      // when work was expected (PARTIAL with a warning).
      // "Work was expected" when:
      //  - ctx.instrumentScope was provided and non-empty (scoped run), OR
      //  - the assembler itself resolved a non-empty instrument set (full run
      //    where the service iterated over instruments internally).
      const scopeNonEmpty =
        ctx.instrumentScope != null && ctx.instrumentScope.length > 0;
      // The assembler service resolves its own instrument set when instrumentIds
      // is null — we cannot directly observe that here, but rowCount>0 would
      // already make status COMPLETED. When rowCount===0 and instrumentIds was
      // null we cannot tell "no instruments in DB" apart from "bug", so we keep
      // SKIPPED for that case and only promote to PARTIAL for explicit scopes.
      const status: StageResult['status'] =
        succeededCount === 0
          ? scopeNonEmpty
            ? 'PARTIAL'
            : 'SKIPPED'
          : 'COMPLETED';

      // Surface assembler warnings, and add our own when we detect empty output.
      const warnings: string[] = [...summary.warnings];
      if (succeededCount === 0 && scopeNonEmpty) {
        warnings.push(
          `SNAPSHOT_ASSEMBLER produced 0 rows for ${ctx.instrumentScope!.length} scoped instrument(s) — possible upstream data gap`,
        );
      }

      // totalCount: use scope length if scoped, else rowCount (best-effort for full runs)
      const totalCount =
        ctx.instrumentScope != null && ctx.instrumentScope.length > 0
          ? ctx.instrumentScope.length
          : succeededCount;

      return {
        status,
        succeededCount,
        failedCount: 0,
        processedCount: succeededCount,
        totalCount,
        warnings: warnings.length > 0 ? warnings : undefined,
        metadata: {
          rowCount: summary.rowCount,
          snapshotVersion: summary.snapshotVersion,
          provenanceCounts: summary.provenanceCounts,
        },
      };
    },
  };
}
