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
      const status: StageResult['status'] =
        succeededCount === 0 ? 'SKIPPED' : 'COMPLETED';

      return {
        status,
        succeededCount,
        failedCount: 0,
        warnings: summary.warnings.length > 0 ? summary.warnings : undefined,
        metadata: {
          rowCount: summary.rowCount,
          snapshotVersion: summary.snapshotVersion,
          provenanceCounts: summary.provenanceCounts,
        },
      };
    },
  };
}
