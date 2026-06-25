/**
 * Persistence for the completion-gated auto-retry sweep
 * ([[pipeline-orchestration.auto-retry]]). Kept in its own file because
 * pipeline-orchestration.repository.ts is at the 500-line cap (shrink-only).
 *
 * Thin I/O only: the latest-per-scope reduction lives in the pure
 * selectLatestIncompletePerScope so it is unit-testable without a DB.
 */
import prisma from '../../db/prisma';
import {
  selectLatestIncompletePerScope,
  type AutoRetryScope,
  type IncompleteRun,
  type RawRunRow,
} from './pipeline-orchestration.auto-retry';

const ACTIVE_STATUSES = ['PENDING', 'RUNNING'];

export class PipelineAutoRetryRepository {
  constructor(private readonly db = prisma) {}

  async listIncompleteRuns(sinceStartedAt: Date): Promise<IncompleteRun[]> {
    const rows = await this.db.pipelineRun.findMany({
      where: { startedAt: { gte: sinceStartedAt } },
      orderBy: [{ startedAt: 'desc' }],
      select: {
        id: true,
        pipelineKey: true,
        scopeRegion: true,
        scopeAssetType: true,
        timeframe: true,
        status: true,
        dataThroughDate: true,
        startedAt: true,
      },
    });

    const flattened: RawRunRow[] = rows.map((row) => ({
      runId: row.id,
      pipelineKey: row.pipelineKey,
      region: row.scopeRegion,
      assetType: row.scopeAssetType,
      timeframe: row.timeframe,
      status: row.status,
      dataThroughDate: row.dataThroughDate ? row.dataThroughDate.toISOString().slice(0, 10) : null,
      startedAtMs: row.startedAt ? row.startedAt.getTime() : 0,
    }));
    return selectLatestIncompletePerScope(flattened);
  }

  async hasActiveRun(scope: AutoRetryScope): Promise<boolean> {
    const count = await this.db.pipelineRun.count({
      where: {
        pipelineKey: scope.pipelineKey,
        scopeRegion: scope.region,
        scopeAssetType: scope.assetType,
        timeframe: scope.timeframe,
        status: { in: ACTIVE_STATUSES },
      },
    });
    return count > 0;
  }
}
