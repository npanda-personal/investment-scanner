export type WatchlistSortOption = 'recentlyAdded' | 'signalScoreDesc' | 'dailyChangeDesc' | 'dailyChangeAsc' | 'symbolAsc';

export interface Watchlist {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WatchlistItem {
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

export interface WatchlistDashboardItem extends WatchlistItem {
  sector: string | null;
  country: string | null;
  currency: string | null;
  currentPrice: number | null;
  dailyChange: number | null;
  dailyChangePercent: number | null;
  latestSignal: {
    score: number;
    direction: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
    confidence: 'LOW' | 'MEDIUM' | 'HIGH';
    generatedAt: string;
  } | null;
  researchUrl: string;
}

export interface WatchlistDetail {
  watchlist: Watchlist;
  items: WatchlistDashboardItem[];
  source: string;
  generatedAt: string;
}

export interface CreateWatchlistInput {
  name: string;
  description?: string | null;
}

export interface AddWatchlistItemInput {
  instrumentId: string;
  notes?: string | null;
  tags?: string[];
}

export interface UpdateWatchlistItemInput {
  notes?: string | null;
  tags?: string[];
}
