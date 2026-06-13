import { Prisma, PrismaClient } from '@prisma/client';
import type { CoreFundamentals } from '../market-data-foundation.types';
import { normalizePeriodEndDate, normalizeUtcDay } from './market-data-foundation.repository.helpers';

export type ManualVerifiedFundamentalInput = {
  periodType: string;
  periodEndDate: Date;
  revenue?: number | null;
  eps?: number | null;
  netIncome?: number | null;
  peRatio?: number | null;
  marketCap?: number | null;
  sourceNote?: string | null;
  sourceUrl?: string | null;
  validatedBy?: string | null;
  validatedAt?: Date | null;
  currency?: string | null;
};

export class FundamentalsRepository {
  constructor(private readonly prisma: PrismaClient) {}



  async upsertFundamentals(stockId: string, fundamentals: CoreFundamentals) {
    const periodEndDate = normalizePeriodEndDate(fundamentals.asOf);
    const dataStatus = fundamentals.revenue || fundamentals.earnings || fundamentals.eps || fundamentals.ratios.trailingPe
      ? 'PARTIAL'
      : 'MISSING';

    return (this.prisma as any).fundamental.upsert({
      where: {
        stockId_periodType_periodEndDate_source: {
          stockId,
          periodType: fundamentals.periodType,
          periodEndDate,
          source: fundamentals.source,
        },
      },
      update: {
        revenue: fundamentals.revenue !== null ? new Prisma.Decimal(fundamentals.revenue) : null,
        eps: fundamentals.eps !== null ? new Prisma.Decimal(fundamentals.eps) : null,
        netIncome: fundamentals.earnings !== null ? new Prisma.Decimal(fundamentals.earnings) : null,
        peRatio: fundamentals.ratios.trailingPe !== null ? new Prisma.Decimal(fundamentals.ratios.trailingPe) : null,
        dividendYield: fundamentals.dividendYield !== null ? new Prisma.Decimal(fundamentals.dividendYield) : null,
        sharesOutstanding: fundamentals.sharesOutstanding !== null ? BigInt(Math.trunc(fundamentals.sharesOutstanding)) : null,
        marketCap: fundamentals.marketCap !== null ? new Prisma.Decimal(fundamentals.marketCap) : null,
        currency: fundamentals.currency,
        periodEndDate,
        dataStatus,
      },
      create: {
        stockId,
        revenue: fundamentals.revenue !== null ? new Prisma.Decimal(fundamentals.revenue) : null,
        eps: fundamentals.eps !== null ? new Prisma.Decimal(fundamentals.eps) : null,
        netIncome: fundamentals.earnings !== null ? new Prisma.Decimal(fundamentals.earnings) : null,
        peRatio: fundamentals.ratios.trailingPe !== null ? new Prisma.Decimal(fundamentals.ratios.trailingPe) : null,
        dividendYield: fundamentals.dividendYield !== null ? new Prisma.Decimal(fundamentals.dividendYield) : null,
        sharesOutstanding: fundamentals.sharesOutstanding !== null ? BigInt(Math.trunc(fundamentals.sharesOutstanding)) : null,
        marketCap: fundamentals.marketCap !== null ? new Prisma.Decimal(fundamentals.marketCap) : null,
        currency: fundamentals.currency,
        periodType: fundamentals.periodType,
        periodEndDate,
        source: fundamentals.source,
        dataStatus,
      },
    });
  }



  async upsertManualVerifiedFundamental(stockId: string, input: ManualVerifiedFundamentalInput) {
    const periodEndDate = normalizeUtcDay(input.periodEndDate);
    const validatedAt = input.validatedAt || new Date();
    const data = {
      revenue: input.revenue !== undefined && input.revenue !== null ? new Prisma.Decimal(input.revenue) : null,
      eps: input.eps !== undefined && input.eps !== null ? new Prisma.Decimal(input.eps) : null,
      netIncome: input.netIncome !== undefined && input.netIncome !== null ? new Prisma.Decimal(input.netIncome) : null,
      peRatio: input.peRatio !== undefined && input.peRatio !== null ? new Prisma.Decimal(input.peRatio) : null,
      marketCap: input.marketCap !== undefined && input.marketCap !== null ? new Prisma.Decimal(input.marketCap) : null,
      currency: input.currency ?? 'INR',
      sourceNote: input.sourceNote ?? null,
      sourceUrl: input.sourceUrl ?? null,
      validatedBy: input.validatedBy ?? null,
      validatedAt,
      dataStatus: 'PARTIAL',
    };

    return (this.prisma as any).fundamental.upsert({
      where: {
        stockId_periodType_periodEndDate_source: {
          stockId,
          periodType: input.periodType,
          periodEndDate,
          source: 'MANUAL_VERIFIED',
        },
      },
      update: data,
      create: {
        stockId,
        periodType: input.periodType,
        periodEndDate,
        source: 'MANUAL_VERIFIED',
        ...data,
      },
    });
  }



  async listFundamentals(stockId: string) {
    return (this.prisma as any).fundamental.findMany({
      where: { stockId, source: { not: { startsWith: 'TEST_' } } },
      orderBy: { periodEndDate: 'desc' },
    });
  }



  /**
   * Lists active, non-delisted IN/STOCK instruments ordered by fewest existing
   * Fundamental rows first (uncovered stocks are prioritised for bulk ingest).
   */
  async listStocksForFundamentalsIngestion(options: {
    region?: string;
    assetType?: string;
    batchSize: number;
    offset: number;
  }): Promise<{ stocks: { id: string; symbol: string }[]; total: number }> {
    const region = options.region?.trim().toUpperCase() || 'IN';
    const assetType = options.assetType?.trim().toUpperCase() || 'STOCK';
    const scopeFilters: Prisma.Sql[] = [
      Prisma.sql`stocks."isActive" = TRUE`,
      Prisma.sql`stocks."isDelisted" = FALSE`,
    ];
    if (region === 'IN') {
      scopeFilters.push(Prisma.sql`(stocks.region = ${'IN'} OR UPPER(COALESCE(stocks.country,'')) IN (${Prisma.join(['IN', 'INDIA'])}))`);
    } else {
      scopeFilters.push(Prisma.sql`UPPER(COALESCE(stocks.region,'')) = ${region}`);
    }
    if (assetType === 'STOCK' || assetType === 'EQUITY') {
      scopeFilters.push(Prisma.sql`(UPPER(COALESCE(stocks."assetType",'')) IN (${Prisma.join(['STOCK', 'EQUITY'])}) OR stocks."assetType" IS NULL)`);
    } else {
      scopeFilters.push(Prisma.sql`UPPER(COALESCE(stocks."assetType",'')) = ${assetType}`);
    }
    const whereClause = Prisma.join(scopeFilters, ' AND ');

    const [rows, countRows] = await Promise.all([
      this.prisma.$queryRaw<Array<{ id: string; symbol: string }>>(Prisma.sql`
        SELECT
          stocks.id,
          stocks.symbol,
          COUNT(f.id) AS fundamentals_count
        FROM stocks
        LEFT JOIN fundamentals f
          ON f."stockId" = stocks.id
          AND f.source = 'MANUAL_VERIFIED'
        WHERE ${whereClause}
        GROUP BY stocks.id, stocks.symbol
        ORDER BY fundamentals_count ASC, stocks.symbol ASC
        LIMIT ${options.batchSize} OFFSET ${options.offset}
      `),
      this.prisma.$queryRaw<Array<{ count: number | bigint }>>(Prisma.sql`
        SELECT COUNT(*)::int AS count
        FROM stocks
        WHERE ${whereClause}
      `),
    ]);

    return {
      stocks: rows.map((row) => ({ id: row.id, symbol: row.symbol })),
      total: Number(countRows[0]?.count || 0),
    };
  }



  /**
   * Returns the set of `${periodType}|${YYYY-MM-DD}` keys already present for
   * a stock so callers can skip periods that already exist (D5 dedup protection).
   */
  async listExistingFundamentalPeriods(stockId: string): Promise<Set<string>> {
    const rows = await (this.prisma as any).fundamental.findMany({
      where: { stockId, source: 'MANUAL_VERIFIED' },
      select: { periodType: true, periodEndDate: true },
    });
    const keys = new Set<string>();
    for (const row of rows) {
      const dateStr = row.periodEndDate instanceof Date
        ? row.periodEndDate.toISOString().slice(0, 10)
        : String(row.periodEndDate).slice(0, 10);
      keys.add(`${row.periodType}|${dateStr}`);
    }
    return keys;
  }
}
