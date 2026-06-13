import { Prisma, PrismaClient } from '@prisma/client';
import type { CorporateAction, PaginationOptions } from '../market-data-foundation.types';
import { decimalKey, normalizeUtcDay, sameDecimal } from './market-data-foundation.repository.helpers';
import { stockWhere } from './market-data-foundation.repository.query-scope';

export class CorporateActionsRepository {
  constructor(private readonly prisma: PrismaClient) {}



  async upsertCorporateActions(stockId: string, actions: CorporateAction[]) {
    const normalizedActions = new Map<string, CorporateAction & { normalizedEffectiveDate: Date; normalizedSource: string; naturalKey: string }>();
    for (const action of actions) {
      const effectiveDate = normalizeUtcDay(action.date);
      const source = action.source || 'unknown';
      const key = this.corporateActionNaturalKeyFromParts({
        stockId,
        actionType: action.type,
        effectiveDate,
        source,
        amount: action.amount,
        splitRatio: action.splitRatio,
      });
      const existing = normalizedActions.get(key);
      normalizedActions.set(key, {
        ...existing,
        ...action,
        source,
        amount: action.amount ?? existing?.amount ?? null,
        splitRatio: action.splitRatio ?? existing?.splitRatio ?? null,
        currency: action.currency ?? existing?.currency ?? null,
        declaredDate: action.declaredDate ?? existing?.declaredDate,
        paymentDate: action.paymentDate ?? existing?.paymentDate,
        normalizedEffectiveDate: effectiveDate,
        normalizedSource: source,
        naturalKey: key,
      });
    }

    const operations = [...normalizedActions.values()].map((action) => {
      const effectiveDate = action.normalizedEffectiveDate;
      return (this.prisma as any).corporateAction.upsert({
        where: {
          naturalKey: action.naturalKey,
        },
        update: {
          naturalKey: action.naturalKey,
          declaredDate: action.declaredDate ? new Date(action.declaredDate) : null,
          paymentDate: action.paymentDate ? new Date(action.paymentDate) : null,
          amount: action.amount !== undefined && action.amount !== null ? new Prisma.Decimal(action.amount) : null,
          splitRatio: action.splitRatio !== undefined && action.splitRatio !== null ? new Prisma.Decimal(action.splitRatio) : null,
          currency: action.currency ?? null,
          dataStatus: 'COMPLETE',
        },
        create: {
          stockId,
          actionType: action.type,
          effectiveDate,
          naturalKey: action.naturalKey,
          declaredDate: action.declaredDate ? new Date(action.declaredDate) : null,
          paymentDate: action.paymentDate ? new Date(action.paymentDate) : null,
          amount: action.amount !== undefined && action.amount !== null ? new Prisma.Decimal(action.amount) : null,
          splitRatio: action.splitRatio !== undefined && action.splitRatio !== null ? new Prisma.Decimal(action.splitRatio) : null,
          currency: action.currency ?? null,
          source: action.normalizedSource,
          dataStatus: 'COMPLETE',
        },
      });
    });

    return Promise.all(operations);
  }



  /**
   * Load raw price bars (date + close) for a stock by its symbol.
   * Returns chronological rows — cheapest projection needed for back-adjustment.
   */
  async listRawPriceBarsForStock(symbol: string): Promise<Array<{ date: Date; close: number }>> {
    const rows = await this.prisma.priceTick.findMany({
      where: { symbol },
      orderBy: { timestamp: 'asc' },
      select: { timestamp: true, close: true },
    });
    return rows.map((row) => ({ date: row.timestamp, close: Number(row.close) }));
  }



  /**
   * Write back adjusted-close values onto PriceTick rows identified by
   * (symbol, timestamp).  Only rows where the stored adjustedClose differs
   * from the incoming value are touched (set-based, bounded, no full-table scan).
   *
   * @returns count of rows actually updated (differs from provided)
   */
  async updateAdjustedCloses(
    symbol: string,
    updates: Array<{ date: Date; adjustedClose: number }>
  ): Promise<number> {
    if (updates.length === 0) return 0;

    // Normalise every incoming date to UTC midnight so it matches stored timestamps.
    const normalised = updates.map((u) => ({
      timestamp: normalizeUtcDay(u.date),
      adjustedClose: u.adjustedClose,
    }));

    // Fetch existing rows to diff — same pattern as storeHistoricalBulk.
    const timestamps = normalised.map((u) => u.timestamp);
    const existing = await this.prisma.priceTick.findMany({
      where: { symbol, timestamp: { in: timestamps } },
      select: { timestamp: true, adjustedClose: true },
    });
    const existingByTs = new Map(
      existing.map((row) => [row.timestamp.toISOString(), row.adjustedClose])
    );

    const toUpdate = normalised.filter((u) => {
      const stored = existingByTs.get(u.timestamp.toISOString());
      if (stored === undefined) return false; // no price row for this date — skip
      if (stored === null || stored === undefined) return true; // no value yet → write it
      return !sameDecimal(stored, u.adjustedClose);
    });

    if (toUpdate.length === 0) return 0;

    // Set-based bulk update: one UPDATE ... FROM (VALUES ...) per chunk, instead
    // of one statement per row (critical for universe-wide recompute).
    const CHUNK = 1000;
    for (let i = 0; i < toUpdate.length; i += CHUNK) {
      const chunk = toUpdate.slice(i, i + CHUNK);
      const tuples = chunk.map(
        (row) => Prisma.sql`(${row.timestamp}::timestamptz, ${new Prisma.Decimal(row.adjustedClose)}::numeric)`,
      );
      await this.prisma.$executeRaw`
        UPDATE price_ticks AS pt
        SET "adjustedClose" = data.adj
        FROM (VALUES ${Prisma.join(tuples)}) AS data(ts, adj)
        WHERE pt.symbol = ${symbol} AND pt.timestamp = data.ts`;
    }

    return toUpdate.length;
  }



  /**
   * List stocks scoped to region/assetType, paginated, for batch recompute.
   */
  async listStocksForAdjustedCloseRecompute(
    options: Pick<PaginationOptions, 'region' | 'assetType'> & { batchSize: number; offset: number }
  ): Promise<{ stocks: Array<{ id: string; symbol: string }>; total: number }> {
    const where = stockWhere({ region: options.region, assetType: options.assetType });
    const [stocks, total] = await Promise.all([
      this.prisma.stock.findMany({
        where,
        orderBy: { symbol: 'asc' },
        skip: options.offset,
        take: options.batchSize,
        select: { id: true, symbol: true },
      }),
      this.prisma.stock.count({ where }),
    ]);
    return { stocks, total };
  }



  async listStocksWithCorporateActionsBySymbols(symbols: string[]): Promise<Array<{ id: string; symbol: string }>> {
    if (symbols.length === 0) return [];
    return this.prisma.stock.findMany({
      where: { symbol: { in: symbols }, corporateActions: { some: {} } },
      select: { id: true, symbol: true },
    });
  }



  async listCorporateActions(stockId: string) {
    const rows = await (this.prisma as any).corporateAction.findMany({
      where: { stockId },
      orderBy: { effectiveDate: 'desc' },
    });
    return this.dedupeCorporateActionRows(rows);
  }



  async dedupeCorporateActions(stockId: string): Promise<{ deletedCount: number; remainingCount: number }> {
    const rows = await (this.prisma as any).corporateAction.findMany({
      where: { stockId },
      orderBy: { effectiveDate: 'desc' },
    });
    const grouped = this.groupCorporateActionRows(rows);
    const deleteIds: string[] = [];
    for (const group of grouped.values()) {
      if (group.length <= 1) continue;
      const [keeper, ...duplicates] = this.sortCorporateActionKeepers(group);
      void keeper;
      deleteIds.push(...duplicates.map((row) => row.id).filter(Boolean));
    }
    if (deleteIds.length > 0) {
      await (this.prisma as any).corporateAction.deleteMany({ where: { id: { in: deleteIds } } });
    }
    return { deletedCount: deleteIds.length, remainingCount: rows.length - deleteIds.length };
  }



  private dedupeCorporateActionRows(rows: any[]) {
    return [...this.groupCorporateActionRows(rows).values()]
      .map((group) => this.sortCorporateActionKeepers(group)[0])
      .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
  }



  private groupCorporateActionRows(rows: any[]) {
    const groups = new Map<string, any[]>();
    for (const row of rows) {
      const key = this.corporateActionNaturalKey(row);
      groups.set(key, [...(groups.get(key) || []), row]);
    }
    return groups;
  }



  private corporateActionNaturalKey(row: any) {
    const effectiveDate = normalizeUtcDay(row.effectiveDate || row.date).toISOString().slice(0, 10);
    return this.corporateActionNaturalKeyFromParts({
      stockId: row.stockId,
      actionType: row.actionType || row.type,
      effectiveDate,
      source: row.source,
      amount: row.amount,
      splitRatio: row.splitRatio,
    });
  }



  private corporateActionNaturalKeyFromParts(row: { stockId: string; actionType: string; effectiveDate: Date | string; source?: string | null; amount?: unknown; splitRatio?: unknown }) {
    const effectiveDate = row.effectiveDate instanceof Date
      ? normalizeUtcDay(row.effectiveDate).toISOString().slice(0, 10)
      : String(row.effectiveDate).slice(0, 10);
    return [
      row.stockId,
      String(row.actionType || '').toLowerCase(),
      effectiveDate,
      String(row.source || 'unknown').toLowerCase(),
      decimalKey(row.amount),
      decimalKey(row.splitRatio),
    ].join('|');
  }



  private sortCorporateActionKeepers(rows: any[]) {
    return [...rows].sort((a, b) => {
      const aMidnight = new Date(a.effectiveDate).toISOString().endsWith('T00:00:00.000Z') ? 1 : 0;
      const bMidnight = new Date(b.effectiveDate).toISOString().endsWith('T00:00:00.000Z') ? 1 : 0;
      if (aMidnight !== bMidnight) return bMidnight - aMidnight;
      return new Date(b.lastUpdatedTimestamp || b.ingestionTimestamp || b.effectiveDate).getTime()
        - new Date(a.lastUpdatedTimestamp || a.ingestionTimestamp || a.effectiveDate).getTime();
    });
  }
}
