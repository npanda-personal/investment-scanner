import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';
import type {
  CreateTradeJournalEntryRequest,
  TradeJournalEntryDto,
  TradeJournalListFilters,
  UpdateTradeJournalEntryRequest,
} from './trade-journal.types';
import { normalizeTags } from './trade-journal.validation';

export class TradeJournalRepository {
  constructor(private readonly db = prisma) {}

  async create(input: CreateTradeJournalEntryRequest, userId: string): Promise<TradeJournalEntryDto> {
    const entry = await this.db.tradeJournalEntry.create({
      data: {
        userId,
        instrumentId: input.instrumentId ?? null,
        symbol: input.symbol.trim().toUpperCase(),
        sourceSignalId: input.sourceSignalId ?? null,
        direction: input.direction,
        decision: input.decision,
        reviewedAt: new Date(input.reviewedAt),
        entryPrice: input.entryPrice !== undefined ? input.entryPrice : null,
        stopPrice: input.stopPrice !== undefined ? input.stopPrice : null,
        targetPrice: input.targetPrice !== undefined ? input.targetPrice : null,
        thesis: input.thesis ?? null,
        conviction: input.conviction !== undefined ? input.conviction : null,
        outcomeStatus: input.outcomeStatus ?? null,
        exitPrice: input.exitPrice !== undefined ? input.exitPrice : null,
        exitAt: input.exitAt ? new Date(input.exitAt) : null,
        realizedReturnPct: null, // always computed on update
        notes: input.notes ?? null,
        tags: normalizeTags(input.tags) as unknown as Prisma.InputJsonValue,
      },
    });
    return this.toDto(entry);
  }

  async list(userId: string, filters: TradeJournalListFilters): Promise<{ entries: TradeJournalEntryDto[]; total: number }> {
    const where = this.buildWhere(userId, filters);
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 25;
    const [entries, total] = await Promise.all([
      this.db.tradeJournalEntry.findMany({
        where,
        orderBy: { reviewedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.db.tradeJournalEntry.count({ where }),
    ]);
    return { entries: entries.map(this.toDto), total };
  }

  async findById(id: string, userId: string): Promise<TradeJournalEntryDto | null> {
    const entry = await this.db.tradeJournalEntry.findFirst({ where: { id, userId } });
    return entry ? this.toDto(entry) : null;
  }

  async update(id: string, input: UpdateTradeJournalEntryRequest, userId: string): Promise<TradeJournalEntryDto> {
    const existing = await this.db.tradeJournalEntry.findFirst({ where: { id, userId } });
    if (!existing) throw new Error('Trade journal entry not found');

    // Compute realizedReturnPct when exit data is being set
    const exitPrice = input.exitPrice !== undefined ? input.exitPrice : existing.exitPrice !== null ? Number(existing.exitPrice) : null;
    const entryPrice = input.entryPrice !== undefined ? input.entryPrice : existing.entryPrice !== null ? Number(existing.entryPrice) : null;
    const direction = input.direction ?? existing.direction;
    const realizedReturnPct = computeRealizedReturnPct(direction as 'LONG' | 'SHORT', entryPrice, exitPrice);

    const entry = await this.db.tradeJournalEntry.update({
      where: { id },
      data: {
        ...(input.symbol !== undefined && { symbol: input.symbol.trim().toUpperCase() }),
        ...(input.direction !== undefined && { direction: input.direction }),
        ...(input.decision !== undefined && { decision: input.decision }),
        ...(input.reviewedAt !== undefined && { reviewedAt: new Date(input.reviewedAt) }),
        ...('entryPrice' in input && { entryPrice: input.entryPrice }),
        ...('stopPrice' in input && { stopPrice: input.stopPrice }),
        ...('targetPrice' in input && { targetPrice: input.targetPrice }),
        ...('thesis' in input && { thesis: input.thesis }),
        ...(input.conviction !== undefined && { conviction: input.conviction }),
        ...(input.outcomeStatus !== undefined && { outcomeStatus: input.outcomeStatus }),
        ...('exitPrice' in input && { exitPrice: input.exitPrice }),
        ...('exitAt' in input && { exitAt: input.exitAt ? new Date(input.exitAt) : null }),
        realizedReturnPct,
        ...('notes' in input && { notes: input.notes }),
        ...(input.tags !== undefined && { tags: normalizeTags(input.tags) as unknown as Prisma.InputJsonValue }),
      },
    });
    return this.toDto(entry);
  }

  async delete(id: string, userId: string): Promise<void> {
    const existing = await this.db.tradeJournalEntry.findFirst({ where: { id, userId } });
    if (!existing) throw new Error('Trade journal entry not found');
    await this.db.tradeJournalEntry.delete({ where: { id } });
  }

  // Post-mortem: reads persisted journal rows only — no signal re-computation on GET.
  async postMortemRows(userId: string): Promise<{
    all: Array<{ decision: string; outcomeStatus: string | null; realizedReturnPct: number | null; sourceSignalId: string | null }>;
  }> {
    const rows = await this.db.tradeJournalEntry.findMany({
      where: { userId },
      select: {
        decision: true,
        outcomeStatus: true,
        realizedReturnPct: true,
        sourceSignalId: true,
      },
    });
    return {
      all: rows.map((r) => ({
        decision: r.decision,
        outcomeStatus: r.outcomeStatus,
        realizedReturnPct: r.realizedReturnPct !== null ? Number(r.realizedReturnPct) : null,
        sourceSignalId: r.sourceSignalId,
      })),
    };
  }

  private buildWhere(userId: string, filters: TradeJournalListFilters): Prisma.TradeJournalEntryWhereInput {
    const where: Prisma.TradeJournalEntryWhereInput = { userId };
    if (filters.decision) where.decision = filters.decision;
    if (filters.outcomeStatus) where.outcomeStatus = filters.outcomeStatus;
    if (filters.symbol) where.symbol = { equals: filters.symbol, mode: 'insensitive' };
    if (filters.fromDate || filters.toDate) {
      where.reviewedAt = {};
      if (filters.fromDate) where.reviewedAt.gte = new Date(filters.fromDate);
      if (filters.toDate) where.reviewedAt.lte = new Date(filters.toDate);
    }
    return where;
  }

  private toDto = (record: any): TradeJournalEntryDto => {
    const tags = Array.isArray(record.tags) ? record.tags.filter((t: unknown): t is string => typeof t === 'string') : [];
    return {
      id: record.id,
      userId: record.userId,
      instrumentId: record.instrumentId,
      symbol: record.symbol,
      sourceSignalId: record.sourceSignalId,
      direction: record.direction,
      decision: record.decision,
      reviewedAt: record.reviewedAt instanceof Date ? record.reviewedAt.toISOString() : String(record.reviewedAt),
      entryPrice: record.entryPrice !== null ? Number(record.entryPrice) : null,
      stopPrice: record.stopPrice !== null ? Number(record.stopPrice) : null,
      targetPrice: record.targetPrice !== null ? Number(record.targetPrice) : null,
      thesis: record.thesis,
      conviction: record.conviction !== null ? Number(record.conviction) : null,
      outcomeStatus: record.outcomeStatus,
      exitPrice: record.exitPrice !== null ? Number(record.exitPrice) : null,
      exitAt: record.exitAt instanceof Date ? record.exitAt.toISOString() : record.exitAt ?? null,
      realizedReturnPct: record.realizedReturnPct !== null ? Number(record.realizedReturnPct) : null,
      notes: record.notes,
      tags,
      createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : String(record.createdAt),
      updatedAt: record.updatedAt instanceof Date ? record.updatedAt.toISOString() : String(record.updatedAt),
    };
  };
}

/**
 * Direction-aware realized return:
 *   LONG:  (exitPrice - entryPrice) / entryPrice
 *   SHORT: (entryPrice - exitPrice) / entryPrice
 * Returns null when entryPrice or exitPrice are missing or entryPrice is 0.
 */
export function computeRealizedReturnPct(
  direction: 'LONG' | 'SHORT',
  entryPrice: number | null | undefined,
  exitPrice: number | null | undefined,
): number | null {
  if (entryPrice == null || exitPrice == null || entryPrice === 0) return null;
  if (direction === 'LONG') return (exitPrice - entryPrice) / entryPrice;
  return (entryPrice - exitPrice) / entryPrice;
}
