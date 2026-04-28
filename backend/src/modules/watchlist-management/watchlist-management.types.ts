import type { SignalConfidence, SignalDirection } from '../signal-generation-engine';

export type WatchlistSortOption = 'recentlyAdded' | 'signalScoreDesc' | 'dailyChangeDesc' | 'dailyChangeAsc' | 'symbolAsc';

export interface WatchlistDto {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWatchlistRequest {
  name: string;
  description?: string | null;
}

export interface UpdateWatchlistRequest {
  name?: string;
  description?: string | null;
}

export interface AddWatchlistItemRequest {
  instrumentId: string;
  notes?: string | null;
  tags?: string[];
}

export interface UpdateWatchlistItemRequest {
  notes?: string | null;
  tags?: string[];
}

export interface WatchlistItemDto {
  id: string;
  watchlistId: string;
  instrumentId: string;
  symbol: string;
  companyName: string | null;
  notes: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WatchlistDashboardItemDto extends WatchlistItemDto {
  sector: string | null;
  country: string | null;
  currency: string | null;
  currentPrice: number | null;
  dailyChange: number | null;
  dailyChangePercent: number | null;
  latestSignal: {
    score: number;
    direction: SignalDirection;
    confidence: SignalConfidence;
    generatedAt: string;
  } | null;
  researchUrl: string;
}

export interface WatchlistDetailDto {
  watchlist: WatchlistDto;
  items: WatchlistDashboardItemDto[];
  source: string;
  generatedAt: string;
}
