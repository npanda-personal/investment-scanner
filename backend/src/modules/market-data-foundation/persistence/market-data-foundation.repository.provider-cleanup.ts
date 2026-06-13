import { Prisma, PrismaClient } from '@prisma/client';
import { EXCHANGE_PRICE_SOURCES, PROVIDER_CLEANUP_DELETE_BATCH_SIZE, PROVIDER_MARKET_DATA_SOURCES, PROVIDER_MARKET_DATA_SOURCE_UPPER, PROVIDER_REPAIR_TYPES } from './market-data-foundation.repository.constants';
import { providerSourceWhere } from './market-data-foundation.repository.query-scope';

export class ProviderCleanupRepository {
  constructor(private readonly prisma: PrismaClient) {}



  async providerDataCleanupReport() {
    const providerSource = providerSourceWhere();
    const [
      priceTicks,
      fundamentals,
      corporateActions,
      fxRates,
      repairAttempts,
      repairStates,
      latestPricesWithoutExchangeCandles,
    ] = await Promise.all([
      this.prisma.priceTick.count({ where: { source: providerSource } }),
      (this.prisma as any).fundamental.count({ where: { source: providerSource } }),
      (this.prisma as any).corporateAction.count({ where: { source: providerSource } }),
      (this.prisma as any).fxRate.count({ where: { source: providerSource } }),
      (this.prisma as any).marketDataRepairAttempt.count({
        where: {
          OR: [
            { provider: providerSource },
            { repairType: { in: ['PROVIDER_VALIDATION', 'PROVIDER_BUSINESS_METADATA'] } },
          ],
        },
      }),
      (this.prisma as any).marketDataRepairState.count({
        where: {
          OR: [
            { provider: providerSource },
            { repairType: { in: ['PROVIDER_VALIDATION', 'PROVIDER_BUSINESS_METADATA'] } },
          ],
        },
      }),
      this.countLatestPricesWithoutExchangeCandles(),
    ]);

    return {
      dryRun: true,
      providerSources: PROVIDER_MARKET_DATA_SOURCES,
      exchangeSources: EXCHANGE_PRICE_SOURCES,
      counts: {
        priceTicks,
        fundamentals,
        corporateActions,
        fxRates,
        repairAttempts,
        repairStates,
        latestPricesWithoutExchangeCandles,
      },
      protectedData: [
        'stocks',
        'portfolio_holdings',
        'portfolio_transactions',
        'watchlist_items',
        'alert_rules',
        'alert_events',
        'notes',
      ],
    };
  }



  async executeProviderDataCleanup() {
    const before = await this.providerDataCleanupReport();
    const deleted = {
      priceTicks: await this.batchDeleteProviderSourceRows('price_ticks'),
      fundamentals: await this.batchDeleteProviderSourceRows('fundamentals'),
      corporateActions: await this.batchDeleteProviderSourceRows('corporate_actions'),
      fxRates: await this.batchDeleteProviderSourceRows('fx_rates'),
      repairAttempts: await this.batchDeleteProviderRepairRows('market_data_repair_attempts'),
      repairStates: await this.batchDeleteProviderRepairRows('market_data_repair_states'),
    };
    const latestPriceRebuild = await this.rebuildLatestPricesFromExchangeCandles();

    return {
      dryRun: false,
      providerSources: PROVIDER_MARKET_DATA_SOURCES,
      before: before.counts,
      deleted,
      latestPriceRebuild,
      protectedData: before.protectedData,
    };
  }



  async rebuildLatestPricesFromExchangeCandles() {
    const sourceList = EXCHANGE_PRICE_SOURCES.map((source) => source.toUpperCase());
    const rebuiltCount = await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO latest_prices (symbol, region, price, timestamp, "updatedAt")
      SELECT DISTINCT ON (pt.symbol)
        pt.symbol,
        pt.region,
        pt.close,
        pt.timestamp,
        NOW()
      FROM price_ticks pt
      WHERE UPPER(COALESCE(pt.source, '')) IN (${Prisma.join(sourceList)})
      ORDER BY pt.symbol ASC, pt.timestamp DESC, pt."lastUpdatedTimestamp" DESC
      ON CONFLICT (symbol) DO UPDATE SET
        region = EXCLUDED.region,
        price = EXCLUDED.price,
        timestamp = EXCLUDED.timestamp,
        "updatedAt" = EXCLUDED."updatedAt"
    `);

    const staleDeleted = await this.prisma.$executeRaw(Prisma.sql`
      DELETE FROM latest_prices lp
      WHERE NOT EXISTS (
        SELECT 1
        FROM price_ticks pt
        WHERE pt.symbol = lp.symbol
          AND UPPER(COALESCE(pt.source, '')) IN (${Prisma.join(sourceList)})
      )
    `);

    return {
      rebuiltCount: Number(rebuiltCount || 0),
      staleDeletedCount: Number(staleDeleted || 0),
    };
  }



  private async batchDeleteProviderSourceRows(
    tableName: 'price_ticks' | 'fundamentals' | 'corporate_actions' | 'fx_rates',
    batchSize = PROVIDER_CLEANUP_DELETE_BATCH_SIZE,
  ): Promise<number> {
    let deletedCount = 0;
    while (true) {
      const result = await this.prisma.$executeRaw(Prisma.sql`
        DELETE FROM ${Prisma.raw(tableName)}
        WHERE id IN (
          SELECT id
          FROM ${Prisma.raw(tableName)}
          WHERE UPPER(COALESCE(source, '')) IN (${Prisma.join(PROVIDER_MARKET_DATA_SOURCE_UPPER)})
          LIMIT ${batchSize}
        )
      `);
      const count = Number(result || 0);
      deletedCount += count;
      if (count < batchSize) return deletedCount;
    }
  }



  private async batchDeleteProviderRepairRows(
    tableName: 'market_data_repair_attempts' | 'market_data_repair_states',
    batchSize = PROVIDER_CLEANUP_DELETE_BATCH_SIZE,
  ): Promise<number> {
    let deletedCount = 0;
    while (true) {
      const result = await this.prisma.$executeRaw(Prisma.sql`
        DELETE FROM ${Prisma.raw(tableName)}
        WHERE id IN (
          SELECT id
          FROM ${Prisma.raw(tableName)}
          WHERE UPPER(COALESCE(provider, '')) IN (${Prisma.join(PROVIDER_MARKET_DATA_SOURCE_UPPER)})
             OR "repairType" IN (${Prisma.join(PROVIDER_REPAIR_TYPES)})
          LIMIT ${batchSize}
        )
      `);
      const count = Number(result || 0);
      deletedCount += count;
      if (count < batchSize) return deletedCount;
    }
  }



  private async countLatestPricesWithoutExchangeCandles(): Promise<number> {
    if (typeof (this.prisma as any).$queryRaw !== 'function') {
      return this.prisma.latestPrice.count({ where: {} });
    }
    const sourceList = EXCHANGE_PRICE_SOURCES.map((source) => source.toUpperCase());
    const rows = await this.prisma.$queryRaw<Array<{ count: number | bigint | string }>>(Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM latest_prices lp
      WHERE NOT EXISTS (
        SELECT 1
        FROM price_ticks pt
        WHERE pt.symbol = lp.symbol
          AND UPPER(COALESCE(pt.source, '')) IN (${Prisma.join(sourceList)})
      )
    `);
    return Number(rows[0]?.count || 0);
  }
}
