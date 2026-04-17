import { PrismaClient } from '@prisma/client';
import defaultPrisma from '../../db/prisma';

export interface CreateWatchlistRequest {
  name: string;
  description?: string;
  symbols?: string[];
}

export interface UpdateWatchlistRequest {
  name?: string;
  description?: string;
  symbols?: string[];
}

export class WatchlistService {
  public prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || defaultPrisma;
  }

  /**
   * List all watchlists for a given user.
   */
  async list(userId: string) {
    return this.prisma.watchlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a new watchlist for a user.
   */
  async create(userId: string, data: CreateWatchlistRequest) {
    return this.prisma.watchlist.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        symbols: data.symbols || [],
      },
    });
  }

  /**
   * Get a specific watchlist by ID, ensuring it belongs to the user.
   */
  async get(userId: string, watchlistId: string) {
    return this.prisma.watchlist.findFirst({
      where: {
        id: watchlistId,
        userId,
      },
    });
  }

  /**
   * Update a watchlist (name, description, or replace symbols).
   */
  async update(userId: string, watchlistId: string, data: UpdateWatchlistRequest) {
    return this.prisma.watchlist.update({
      where: {
        id: watchlistId,
        userId, // ensure ownership
      },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.symbols && { symbols: data.symbols }),
      },
    });
  }

  /**
   * Delete a watchlist.
   */
  async delete(userId: string, watchlistId: string) {
    return this.prisma.watchlist.delete({
      where: {
        id: watchlistId,
        userId,
      },
    });
  }

  /**
   * Add a symbol to a watchlist.
   */
  async addSymbol(userId: string, watchlistId: string, symbol: string) {
    const watchlist = await this.get(userId, watchlistId);
    if (!watchlist) {
      throw new Error('Watchlist not found');
    }
    const updatedSymbols = Array.from(new Set([...watchlist.symbols, symbol]));
    return this.prisma.watchlist.update({
      where: { id: watchlistId },
      data: { symbols: updatedSymbols },
    });
  }

  /**
   * Remove a symbol from a watchlist.
   */
  async removeSymbol(userId: string, watchlistId: string, symbol: string) {
    const watchlist = await this.get(userId, watchlistId);
    if (!watchlist) {
      throw new Error('Watchlist not found');
    }
    const updatedSymbols = watchlist.symbols.filter(s => s !== symbol);
    return this.prisma.watchlist.update({
      where: { id: watchlistId },
      data: { symbols: updatedSymbols },
    });
  }
}