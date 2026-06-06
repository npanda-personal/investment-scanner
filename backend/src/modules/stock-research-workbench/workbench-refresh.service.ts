import prisma from '../../db/prisma';
import { StockResearchWorkbenchService } from './stock-research-workbench.service';
import { WorkbenchSnapshotRepository } from './workbench-snapshot.repository';

const WORKBENCH_REFRESH_CONCURRENCY = 4;
const DEFAULT_REGION = 'IN';
const DEFAULT_ASSET_TYPE = 'STOCK';

export interface WorkbenchRefreshInput {
  /** Explicit instrument IDs to process. When empty, defaults to the active/trusted set. */
  instrumentIds?: string[];
  region?: string;
  assetType?: string;
  /** Max instruments to process per call (default 200). */
  batchSize?: number;
  /** Offset into the active-set (for incremental paging). */
  offset?: number;
}

export interface WorkbenchRefreshResult {
  totalCount: number;
  processedCount: number;
  succeededCount: number;
  failedCount: number;
  skippedCount: number;
  warnings: string[];
  errors: string[];
  computedAt: string;
}

/**
 * WORKBENCH_REFRESH capability: compute and persist workbench snapshots.
 *
 * Pool-safe: max 4 concurrent instruments via manual semaphore.
 * Incremental: accepts explicit instrumentIds (from pipeline changedInstrumentIds)
 * or falls back to the active set.
 * Persisted-read: uses StockResearchWorkbenchService.workbench() for compute,
 * then upserts into workbench_snapshots via WorkbenchSnapshotRepository.
 */
export class WorkbenchRefreshService {
  constructor(
    private readonly workbenchService = new StockResearchWorkbenchService(),
    private readonly snapshotRepository = new WorkbenchSnapshotRepository(),
  ) {}

  /**
   * Resolve instrument IDs to process.
   * Priority: explicit list > active set from DB.
   */
  private async resolveInstrumentIds(input: WorkbenchRefreshInput): Promise<string[]> {
    if (input.instrumentIds && input.instrumentIds.length > 0) {
      return input.instrumentIds;
    }
    const region = input.region ?? DEFAULT_REGION;
    const assetType = input.assetType ?? DEFAULT_ASSET_TYPE;
    const limit = input.batchSize ?? 200;
    const offset = input.offset ?? 0;

    // Pull active, non-delisted stocks in the target region/assetType
    const stocks = await prisma.stock.findMany({
      where: {
        region,
        assetType,
        isActive: true,
        isDelisted: false,
      },
      select: { id: true },
      orderBy: { symbol: 'asc' },
      take: limit,
      skip: offset,
    });
    return stocks.map((s) => s.id);
  }

  /**
   * Compute and persist workbench snapshots for the given (or resolved) instruments.
   * Bounded concurrency: at most WORKBENCH_REFRESH_CONCURRENCY instruments at a time.
   */
  async refreshWorkbenchSnapshots(input: WorkbenchRefreshInput = {}): Promise<WorkbenchRefreshResult> {
    const computedAt = new Date();
    const instrumentIds = await this.resolveInstrumentIds(input);
    const totalCount = instrumentIds.length;

    let processedCount = 0;
    let succeededCount = 0;
    let failedCount = 0;
    const skippedCount = 0;
    const warnings: string[] = [];
    const errors: string[] = [];

    // Chunked processing with bounded concurrency
    for (let i = 0; i < instrumentIds.length; i += WORKBENCH_REFRESH_CONCURRENCY) {
      const chunk = instrumentIds.slice(i, i + WORKBENCH_REFRESH_CONCURRENCY);
      await Promise.all(chunk.map(async (instrumentId) => {
        processedCount++;
        try {
          // Compute full workbench payload (uses persisted price/signal reads internally)
          const payload = await this.workbenchService.workbench(instrumentId, '1Y');
          if (!payload) {
            warnings.push(`workbench: no instrument found for ${instrumentId}`);
            failedCount++;
            return;
          }

          // Determine dataThroughDate from trust.last_updated_timestamp
          const trustTs = (payload.trust as any)?.last_updated_timestamp;
          const dataThroughDate = trustTs ? new Date(trustTs) : null;

          await this.snapshotRepository.upsert({
            instrumentId,
            symbol: (payload.overview as any).symbol ?? '',
            computedAt,
            dataThroughDate,
            payloadJson: payload as unknown as Record<string, unknown>,
          });

          succeededCount++;
        } catch (err) {
          failedCount++;
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`workbench compute failed for ${instrumentId}: ${msg}`);
        }
      }));
    }

    return {
      totalCount,
      processedCount,
      succeededCount,
      failedCount,
      skippedCount,
      warnings,
      errors,
      computedAt: computedAt.toISOString(),
    };
  }
}
