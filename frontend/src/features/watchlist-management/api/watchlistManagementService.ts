import axios from 'axios';
import type {
  AddWatchlistItemInput,
  CreateWatchlistInput,
  UpdateWatchlistItemInput,
  Watchlist,
  WatchlistDetail,
  WatchlistItem,
  WatchlistSortOption,
} from '../types';

const API_BASE = '/api/v1/watchlists';

export async function fetchWatchlists(): Promise<Watchlist[]> {
  const response = await axios.get<{ watchlists: Watchlist[] }>(API_BASE);
  return response.data.watchlists;
}

export async function createWatchlist(input: CreateWatchlistInput): Promise<Watchlist> {
  const response = await axios.post<Watchlist>(API_BASE, input);
  return response.data;
}

export async function fetchWatchlistDetail(id: string, sort: WatchlistSortOption = 'recentlyAdded'): Promise<WatchlistDetail> {
  const response = await axios.get<WatchlistDetail>(`${API_BASE}/${id}`, { params: { sort } });
  return response.data;
}

export async function updateWatchlist(id: string, input: Partial<CreateWatchlistInput>): Promise<Watchlist> {
  const response = await axios.patch<Watchlist>(`${API_BASE}/${id}`, input);
  return response.data;
}

export async function deleteWatchlist(id: string): Promise<void> {
  await axios.delete(`${API_BASE}/${id}`);
}

export async function addWatchlistItem(watchlistId: string, input: AddWatchlistItemInput): Promise<WatchlistItem> {
  const response = await axios.post<WatchlistItem>(`${API_BASE}/${watchlistId}/items`, input);
  return response.data;
}

export async function updateWatchlistItem(watchlistId: string, itemId: string, input: UpdateWatchlistItemInput): Promise<WatchlistItem> {
  const response = await axios.patch<WatchlistItem>(`${API_BASE}/${watchlistId}/items/${itemId}`, input);
  return response.data;
}

export async function removeWatchlistItem(watchlistId: string, itemId: string): Promise<void> {
  await axios.delete(`${API_BASE}/${watchlistId}/items/${itemId}`);
}
