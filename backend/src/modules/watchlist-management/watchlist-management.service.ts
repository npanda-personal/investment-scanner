import { MarketDataFoundationService } from '../market-data-foundation';
import { SignalGenerationEngineService } from '../signal-generation-engine';
import { WatchlistManagementRepository } from './watchlist-management.repository';
import type {
  AddWatchlistItemRequest,
  CreateWatchlistRequest,
  UpdateWatchlistItemRequest,
  UpdateWatchlistRequest,
  WatchlistDashboardItemDto,
  WatchlistDetailDto,
  WatchlistItemDto,
  WatchlistSortOption,
} from './watchlist-management.types';
import {
  validateWatchlistInput,
  validateWatchlistItemInput,
} from './watchlist-management.validation';

export class WatchlistManagementService {
  constructor(
    private readonly repository = new WatchlistManagementRepository(),
    private readonly marketDataService = new MarketDataFoundationService(),
    private readonly signalService = new SignalGenerationEngineService()
  ) {}

  listWatchlists() {
    return this.repository.listWatchlists();
  }

  async createWatchlist(input: CreateWatchlistRequest) {
    this.throwIfErrors(validateWatchlistInput(input));
    return this.repository.createWatchlist(input);
  }

  async detail(id: string, sort: WatchlistSortOption = 'recentlyAdded'): Promise<WatchlistDetailDto | null> {
    const watchlist = await this.repository.getWatchlist(id);
    if (!watchlist) return null;
    const items = await this.repository.listItems(id);
    const enriched = await Promise.all(items.map((item) => this.enrichItem(item)));
    return {
      watchlist,
      items: this.sortItems(enriched, sort),
      source: 'watchlist-management',
      generatedAt: new Date().toISOString(),
    };
  }

  async updateWatchlist(id: string, input: UpdateWatchlistRequest) {
    this.throwIfErrors(validateWatchlistInput(input, true));
    return this.repository.updateWatchlist(id, input);
  }

  deleteWatchlist(id: string) {
    return this.repository.deleteWatchlist(id);
  }

  async addItem(watchlistId: string, input: AddWatchlistItemRequest) {
    this.throwIfErrors(validateWatchlistItemInput(input));
    const watchlist = await this.repository.getWatchlist(watchlistId);
    if (!watchlist) throw new Error('Watchlist not found');
    const duplicate = await this.repository.findItemByInstrument(watchlistId, input.instrumentId);
    if (duplicate) throw new Error('This stock already exists in this watchlist.');
    const instrument = await this.marketDataService.getInstrument(input.instrumentId);
    if (!instrument) throw new Error('Instrument not found');
    return this.repository.addItem(watchlistId, input, instrument);
  }

  async updateItem(watchlistId: string, itemId: string, input: UpdateWatchlistItemRequest) {
    this.throwIfErrors(validateWatchlistItemInput(input, true));
    return this.repository.updateItem(watchlistId, itemId, input);
  }

  removeItem(watchlistId: string, itemId: string) {
    return this.repository.removeItem(watchlistId, itemId);
  }

  async enrichItem(item: WatchlistItemDto): Promise<WatchlistDashboardItemDto> {
    const [instrument, latest, prices, signal] = await Promise.all([
      this.marketDataService.getInstrument(item.instrumentId).catch(() => null),
      this.marketDataService.latestPriceByInstrumentId(item.instrumentId).catch(() => null),
      this.marketDataService.listPricesByInstrumentId(item.instrumentId, 2).catch(() => null),
      this.signalService.latestForInstrument(item.instrumentId).catch(() => null),
    ]);
    const current = latest?.latest?.adjusted_close ?? latest?.latest?.close ?? null;
    const previous = prices?.prices?.[1]?.adjusted_close ?? prices?.prices?.[1]?.close ?? null;
    const currentPrice = typeof current === 'number' ? current : null;
    const previousClose = typeof previous === 'number' ? previous : null;
    const dailyChange = currentPrice !== null && previousClose !== null ? currentPrice - previousClose : null;

    return {
      ...item,
      sector: instrument?.sector ?? null,
      country: instrument?.country ?? null,
      currency: instrument?.currency ?? null,
      currentPrice,
      dailyChange,
      dailyChangePercent: dailyChange !== null && previousClose !== null && previousClose > 0 ? dailyChange / previousClose : null,
      latestSignal: signal ? {
        score: signal.score,
        direction: signal.direction,
        confidence: signal.confidence,
        generatedAt: signal.generated_at,
      } : null,
      researchUrl: `/research/stocks/${item.instrumentId}`,
    };
  }

  sortItems(items: WatchlistDashboardItemDto[], sort: WatchlistSortOption): WatchlistDashboardItemDto[] {
    const sorted = [...items];
    if (sort === 'signalScoreDesc') return sorted.sort((a, b) => (b.latestSignal?.score ?? -1) - (a.latestSignal?.score ?? -1));
    if (sort === 'dailyChangeDesc') return sorted.sort((a, b) => (b.dailyChangePercent ?? -Infinity) - (a.dailyChangePercent ?? -Infinity));
    if (sort === 'dailyChangeAsc') return sorted.sort((a, b) => (a.dailyChangePercent ?? Infinity) - (b.dailyChangePercent ?? Infinity));
    if (sort === 'symbolAsc') return sorted.sort((a, b) => a.symbol.localeCompare(b.symbol));
    return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  private throwIfErrors(errors: string[]) {
    if (errors.length > 0) throw new Error(errors.join('; '));
  }
}
