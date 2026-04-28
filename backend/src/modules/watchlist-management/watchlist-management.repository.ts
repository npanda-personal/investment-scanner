import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';
import type {
  AddWatchlistItemRequest,
  CreateWatchlistRequest,
  UpdateWatchlistItemRequest,
  UpdateWatchlistRequest,
  WatchlistDto,
  WatchlistItemDto,
} from './watchlist-management.types';
import { normalizeTags } from './watchlist-management.validation';

export class WatchlistManagementRepository {
  constructor(private readonly db = prisma) {}

  async listWatchlists(): Promise<WatchlistDto[]> {
    const watchlists = await this.db.watchlist.findMany({ orderBy: { updatedAt: 'desc' } });
    return watchlists.map(this.toWatchlistDto);
  }

  async createWatchlist(input: CreateWatchlistRequest): Promise<WatchlistDto> {
    const watchlist = await this.db.watchlist.create({
      data: {
        name: input.name.trim(),
        description: input.description ?? null,
      },
    });
    return this.toWatchlistDto(watchlist);
  }

  async getWatchlist(id: string): Promise<WatchlistDto | null> {
    const watchlist = await this.db.watchlist.findUnique({ where: { id } });
    return watchlist ? this.toWatchlistDto(watchlist) : null;
  }

  async updateWatchlist(id: string, input: UpdateWatchlistRequest): Promise<WatchlistDto> {
    const watchlist = await this.db.watchlist.update({
      where: { id },
      data: {
        name: input.name?.trim(),
        description: input.description,
      },
    });
    return this.toWatchlistDto(watchlist);
  }

  async deleteWatchlist(id: string): Promise<void> {
    await this.db.watchlist.delete({ where: { id } });
  }

  async listItems(watchlistId: string): Promise<WatchlistItemDto[]> {
    const items = await this.db.watchlistItem.findMany({
      where: { watchlistId },
      orderBy: { createdAt: 'desc' },
    });
    return items.map(this.toItemDto);
  }

  async findItemByInstrument(watchlistId: string, instrumentId: string): Promise<WatchlistItemDto | null> {
    const item = await this.db.watchlistItem.findUnique({
      where: { watchlistId_instrumentId: { watchlistId, instrumentId } },
    });
    return item ? this.toItemDto(item) : null;
  }

  async addItem(watchlistId: string, input: AddWatchlistItemRequest, instrument: any): Promise<WatchlistItemDto> {
    const item = await this.db.watchlistItem.create({
      data: {
        watchlistId,
        instrumentId: input.instrumentId,
        symbol: instrument.symbol,
        companyName: instrument.company_name ?? instrument.name ?? null,
        notes: input.notes ?? null,
        tags: normalizeTags(input.tags) as unknown as Prisma.InputJsonValue,
      },
    });
    return this.toItemDto(item);
  }

  async updateItem(watchlistId: string, itemId: string, input: UpdateWatchlistItemRequest): Promise<WatchlistItemDto> {
    const existing = await this.db.watchlistItem.findFirst({ where: { id: itemId, watchlistId } });
    if (!existing) throw new Error('Watchlist item not found');
    const item = await this.db.watchlistItem.update({
      where: { id: itemId },
      data: {
        notes: input.notes,
        tags: input.tags !== undefined ? normalizeTags(input.tags) as unknown as Prisma.InputJsonValue : undefined,
      },
    });
    return this.toItemDto(item);
  }

  async removeItem(watchlistId: string, itemId: string): Promise<void> {
    await this.db.watchlistItem.deleteMany({ where: { id: itemId, watchlistId } });
  }

  private toWatchlistDto(record: any): WatchlistDto {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private toItemDto(record: any): WatchlistItemDto {
    const tags = Array.isArray(record.tags) ? record.tags.filter((tag: unknown): tag is string => typeof tag === 'string') : [];
    return {
      id: record.id,
      watchlistId: record.watchlistId,
      instrumentId: record.instrumentId,
      symbol: record.symbol,
      companyName: record.companyName,
      notes: record.notes,
      tags,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}
