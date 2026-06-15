import { Prisma, PrismaClient } from '@prisma/client';
import type { MarketDataRepairRunStatus, MarketDataRepairStateStatus, MarketDataRepairType, MarketDataSyncScopeType, MarketDataSyncStateDto, MarketDataSyncStateStatus, PaginationOptions, ScheduledRegionSyncSummary, SyncSummary } from '../market-data-foundation.types';
import { tradingDateForRegion } from '../ingestion/market-data-foundation.market-session';

export class RepairStateRepository {
  constructor(private readonly prisma: PrismaClient) {}



  async recordRepairAttempt(input: {
    stockId: string;
    region: string;
    assetType?: string | null;
    repairType: MarketDataRepairType;
    status: string;
    provider?: string | null;
    attemptedAt?: Date;
    completedAt?: Date | null;
    fieldsFilledJson?: Prisma.InputJsonValue | null;
    error?: string | null;
    manualRequiredReason?: string | null;
  }) {
    const now = new Date();
    return (this.prisma as any).marketDataRepairAttempt.create({
      data: {
        stockId: input.stockId,
        region: input.region,
        assetType: input.assetType ?? null,
        repairType: input.repairType,
        status: input.status,
        provider: input.provider ?? null,
        attemptedAt: input.attemptedAt ?? now,
        completedAt: input.completedAt === undefined ? now : input.completedAt,
        fieldsFilledJson: input.fieldsFilledJson ?? undefined,
        error: input.error ?? null,
        manualRequiredReason: input.manualRequiredReason ?? null,
      },
    });
  }



  async countRepairAttempts(input: {
    stockId: string;
    repairType: MarketDataRepairType;
  }) {
    return (this.prisma as any).marketDataRepairAttempt.count({
      where: {
        stockId: input.stockId,
        repairType: input.repairType,
      },
    });
  }



  async upsertRepairState(input: {
    stockId: string;
    region: string;
    assetType?: string | null;
    repairType: MarketDataRepairType;
    status: MarketDataRepairStateStatus;
    provider?: string | null;
    lastAttemptId?: string | null;
    fieldsFilledJson?: Prisma.InputJsonValue | null;
    error?: string | null;
    manualRequiredReason?: string | null;
    nextRetryAt?: Date | null;
    lastAttemptedAt?: Date | null;
    resolvedAt?: Date | null;
  }) {
    const now = new Date();
    return (this.prisma as any).marketDataRepairState.upsert({
      where: {
        stockId_repairType: {
          stockId: input.stockId,
          repairType: input.repairType,
        },
      },
      create: {
        stockId: input.stockId,
        region: input.region,
        assetType: input.assetType ?? null,
        repairType: input.repairType,
        status: input.status,
        provider: input.provider ?? null,
        lastAttemptId: input.lastAttemptId ?? null,
        fieldsFilledJson: input.fieldsFilledJson ?? undefined,
        error: input.error ?? null,
        manualRequiredReason: input.manualRequiredReason ?? null,
        nextRetryAt: input.nextRetryAt ?? null,
        lastAttemptedAt: input.lastAttemptedAt ?? now,
        resolvedAt: input.resolvedAt ?? (input.status === 'RESOLVED' ? now : null),
      },
      update: {
        region: input.region,
        assetType: input.assetType ?? null,
        status: input.status,
        provider: input.provider ?? null,
        lastAttemptId: input.lastAttemptId ?? null,
        fieldsFilledJson: input.fieldsFilledJson ?? undefined,
        error: input.error ?? null,
        manualRequiredReason: input.manualRequiredReason ?? null,
        nextRetryAt: input.nextRetryAt ?? null,
        lastAttemptedAt: input.lastAttemptedAt ?? now,
        resolvedAt: input.resolvedAt ?? (input.status === 'RESOLVED' ? now : null),
      },
    });
  }



  async createRepairRun(input: {
    region: string;
    assetType?: string | null;
    status: MarketDataRepairRunStatus;
    beforeHealthJson?: Prisma.InputJsonValue | null;
    beforeRepairPlanJson?: Prisma.InputJsonValue | null;
    actionsJson: Prisma.InputJsonValue;
    warningsJson?: Prisma.InputJsonValue | null;
  }) {
    return (this.prisma as any).marketDataRepairRun.create({
      data: {
        region: input.region,
        assetType: input.assetType ?? null,
        status: input.status,
        beforeHealthJson: input.beforeHealthJson ?? undefined,
        beforeRepairPlanJson: input.beforeRepairPlanJson ?? undefined,
        actionsJson: input.actionsJson,
        warningsJson: input.warningsJson ?? undefined,
      },
    });
  }



  async updateRepairRun(id: string, input: {
    status: MarketDataRepairRunStatus;
    completedAt?: Date | null;
    afterHealthJson?: Prisma.InputJsonValue | null;
    afterRepairPlanJson?: Prisma.InputJsonValue | null;
    summaryJson?: Prisma.InputJsonValue | null;
    warningsJson?: Prisma.InputJsonValue | null;
    error?: string | null;
  }) {
    return (this.prisma as any).marketDataRepairRun.update({
      where: { id },
      data: {
        status: input.status,
        completedAt: input.completedAt ?? null,
        afterHealthJson: input.afterHealthJson ?? undefined,
        afterRepairPlanJson: input.afterRepairPlanJson ?? undefined,
        summaryJson: input.summaryJson ?? undefined,
        warningsJson: input.warningsJson ?? undefined,
        error: input.error ?? null,
      },
    });
  }



  async latestRepairRun(options: Pick<PaginationOptions, 'region' | 'assetType'>) {
    return (this.prisma as any).marketDataRepairRun.findFirst({
      where: {
        region: options.region,
        assetType: options.assetType ?? null,
      },
      orderBy: { startedAt: 'desc' },
    });
  }



  async getSyncState(
    region: string,
    assetType: string,
    tradingDate: string,
    options: { scopeType?: MarketDataSyncScopeType; scopeKey?: string; timeframe?: string } = {}
  ): Promise<MarketDataSyncStateDto | null> {
    const scopeType = options.scopeType || 'CATALOG';
    const scopeKey = options.scopeKey || region;
    const timeframe = options.timeframe || '1D';
    const row = await (this.prisma as any).marketDataSyncState.findUnique({
      where: {
        region_assetType_scopeType_scopeKey_timeframe_tradingDate: {
          region,
          assetType,
          scopeType,
          scopeKey,
          timeframe,
          tradingDate: new Date(`${tradingDate}T00:00:00.000Z`),
        },
      },
    });
    return row ? this.toSyncStateDto(row) : null;
  }



  async upsertSyncState(input: {
    region: string;
    assetType: string;
    scopeType?: MarketDataSyncScopeType;
    scopeKey?: string;
    timeframe?: string;
    tradingDate: string;
    status: MarketDataSyncStateStatus;
    summary?: ScheduledRegionSyncSummary | SyncSummary | null;
    lastCheckedAt?: Date;
    lastProviderFetchAt?: Date | null;
  }): Promise<MarketDataSyncStateDto> {
    const summary = input.summary;
    const scopeType = input.scopeType || 'CATALOG';
    const scopeKey = input.scopeKey || input.region;
    const timeframe = input.timeframe || '1D';
    const lastCheckedAt = input.lastCheckedAt || new Date();
    // Guard: never persist a sync-state marker for a future session — a trading date beyond
    // "today" in the region's timezone is a zombie (the session has not occurred). Clamp it down
    // to today-in-region so look-ahead/timezone-rollover bugs cannot create future-dated rows.
    const todayInRegion = tradingDateForRegion(input.region, lastCheckedAt);
    const tradingDate = todayInRegion && input.tradingDate > todayInRegion ? todayInRegion : input.tradingDate;
    if (tradingDate !== input.tradingDate) console.warn(`[upsertSyncState] clamped future tradingDate ${input.tradingDate} -> ${tradingDate} (${input.region}/${input.assetType})`);
    const row = await (this.prisma as any).marketDataSyncState.upsert({
      where: {
        region_assetType_scopeType_scopeKey_timeframe_tradingDate: {
          region: input.region,
          assetType: input.assetType,
          scopeType,
          scopeKey,
          timeframe,
          tradingDate: new Date(`${tradingDate}T00:00:00.000Z`),
        },
      },
      create: {
        region: input.region,
        assetType: input.assetType,
        scopeType,
        scopeKey,
        timeframe,
        tradingDate: new Date(`${tradingDate}T00:00:00.000Z`),
        status: input.status,
        lastCheckedAt,
        lastProviderFetchAt: input.lastProviderFetchAt,
        lastRunAt: lastCheckedAt,
        lastInsertedCount: summary?.rowsInserted ?? 0,
        lastUpdatedCount: summary?.rowsUpdated ?? 0,
        lastNoOpCount: summary?.rowsNoOp ?? 0,
        lastSkippedCount: summary?.providerFetchSkippedCount ?? summary?.skippedBeforeFetchCount ?? 0,
        lastWarningCount: summary?.warningCount ?? 0,
        lastSummary: summary as any,
      },
      update: {
        status: input.status,
        lastCheckedAt,
        lastProviderFetchAt: input.lastProviderFetchAt === undefined ? undefined : input.lastProviderFetchAt,
        lastRunAt: lastCheckedAt,
        lastInsertedCount: summary?.rowsInserted ?? 0,
        lastUpdatedCount: summary?.rowsUpdated ?? 0,
        lastNoOpCount: summary?.rowsNoOp ?? 0,
        lastSkippedCount: summary?.providerFetchSkippedCount ?? summary?.skippedBeforeFetchCount ?? 0,
        lastWarningCount: summary?.warningCount ?? 0,
        lastSummary: summary as any,
      },
    });
    return this.toSyncStateDto(row);
  }



  /**
   * Persist the latest computed review-readiness summary as a namespaced row in
   * market_data_sync_states (scopeType `REVIEW_READINESS_SUMMARY`, scopeKey `DEFAULT`). This
   * reuses the existing sync-state table's JSON `lastSummary` column rather than adding a
   * migration on the shared/drifted DB. The distinct scopeType isolates these rows from CATALOG
   * sync bookkeeping — getSyncState/upsertSyncState always query by the full composite key (incl.
   * scopeType), so they never read or overwrite these rows. Read back via latestReviewReadinessSnapshot.
   */
  async upsertReviewReadinessSnapshot(region: string, assetType: string, tradingDate: string, summary: unknown): Promise<void> {
    const now = new Date();
    const dateText = String(tradingDate).slice(0, 10);
    // Guard: never persist a future-session snapshot (same rationale as upsertSyncState). A trading
    // date beyond "today" in the region is a zombie that latestReviewReadinessSnapshot would serve
    // as the freshest summary — clamp it down to today-in-region.
    const todayInRegion = tradingDateForRegion(region, now);
    const safeDate = todayInRegion && dateText > todayInRegion ? todayInRegion : dateText;
    if (safeDate !== dateText) console.warn(`[upsertReviewReadinessSnapshot] clamped future tradingDate ${dateText} -> ${safeDate} (${region}/${assetType})`);
    const tradingDateValue = new Date(`${safeDate}T00:00:00.000Z`);
    await (this.prisma as any).marketDataSyncState.upsert({
      where: {
        region_assetType_scopeType_scopeKey_timeframe_tradingDate: {
          region,
          assetType,
          scopeType: 'REVIEW_READINESS_SUMMARY',
          scopeKey: 'DEFAULT',
          timeframe: '1D',
          tradingDate: tradingDateValue,
        },
      },
      create: {
        region,
        assetType,
        scopeType: 'REVIEW_READINESS_SUMMARY',
        scopeKey: 'DEFAULT',
        timeframe: '1D',
        tradingDate: tradingDateValue,
        status: 'SYNCED',
        lastCheckedAt: now,
        lastRunAt: now,
        lastSummary: summary as any,
      },
      update: {
        status: 'SYNCED',
        lastCheckedAt: now,
        lastRunAt: now,
        lastSummary: summary as any,
      },
    });
  }



  /** Read the most-recent persisted review-readiness summary JSON for the scope, or null. */
  async latestReviewReadinessSnapshot(region: string, assetType: string): Promise<unknown | null> {
    const row = await (this.prisma as any).marketDataSyncState.findFirst({
      where: { region, assetType, scopeType: 'REVIEW_READINESS_SUMMARY' },
      orderBy: [{ tradingDate: 'desc' }, { updatedAt: 'desc' }],
    });
    return row?.lastSummary ?? null;
  }



  private toSyncStateDto(row: any): MarketDataSyncStateDto {
    return {
      region: row.region,
      assetType: row.assetType,
      scopeType: row.scopeType || 'CATALOG',
      scopeKey: row.scopeKey || row.region,
      timeframe: row.timeframe || '1D',
      tradingDate: row.tradingDate.toISOString().slice(0, 10),
      status: row.status,
      lastCheckedAt: row.lastCheckedAt ? row.lastCheckedAt.toISOString() : null,
      lastProviderFetchAt: row.lastProviderFetchAt ? row.lastProviderFetchAt.toISOString() : null,
      lastRunAt: row.lastRunAt ? row.lastRunAt.toISOString() : null,
      lastInsertedCount: row.lastInsertedCount,
      lastUpdatedCount: row.lastUpdatedCount,
      lastNoOpCount: row.lastNoOpCount,
      lastSkippedCount: row.lastSkippedCount ?? 0,
      lastWarningCount: row.lastWarningCount,
      lastSummary: row.lastSummary,
    };
  }
}
