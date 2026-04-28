import axios from 'axios';

const API_BASE = '/api'; // proxy to backend

// TODO: replace with proper authentication
const TEST_USER_ID = 'test-user-id';

export interface Watchlist {
  id: string;
  name: string;
  description: string | null;
  symbols: string[];
  userId: string;
  createdAt: string;
  updatedAt: string;
}

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

export interface SearchResult {
  symbol: string;
  name: string;
  region: string;
  exchange?: string;
  source: 'database' | 'external';
}

/**
 * Fetch all watchlists for the current user.
 */
export async function fetchWatchlists(): Promise<Watchlist[]> {
  const response = await axios.get<Watchlist[]>(`${API_BASE}/watchlists`, {
    headers: { 'x-user-id': TEST_USER_ID },
  });
  return response.data;
}

/**
 * Create a new watchlist.
 */
export async function createWatchlist(data: CreateWatchlistRequest): Promise<Watchlist> {
  const response = await axios.post<Watchlist>(`${API_BASE}/watchlists`, data, {
    headers: { 'x-user-id': TEST_USER_ID },
  });
  return response.data;
}

/**
 * Fetch a specific watchlist by ID.
 */
export async function fetchWatchlist(id: string): Promise<Watchlist> {
  const response = await axios.get<Watchlist>(`${API_BASE}/watchlists/${id}`, {
    headers: { 'x-user-id': TEST_USER_ID },
  });
  return response.data;
}

/**
 * Update a watchlist.
 */
export async function updateWatchlist(
  id: string,
  data: UpdateWatchlistRequest
): Promise<Watchlist> {
  const response = await axios.put<Watchlist>(`${API_BASE}/watchlists/${id}`, data, {
    headers: { 'x-user-id': TEST_USER_ID },
  });
  return response.data;
}

/**
 * Delete a watchlist.
 */
export async function deleteWatchlist(id: string): Promise<void> {
  await axios.delete(`${API_BASE}/watchlists/${id}`, {
    headers: { 'x-user-id': TEST_USER_ID },
  });
}

/**
 * Add a symbol to a watchlist.
 */
export async function addSymbolToWatchlist(watchlistId: string, symbol: string): Promise<Watchlist> {
  const response = await axios.post<Watchlist>(
    `${API_BASE}/watchlists/${watchlistId}/symbols`,
    { symbol },
    { headers: { 'x-user-id': TEST_USER_ID } }
  );
  return response.data;
}

/**
 * Remove a symbol from a watchlist.
 */
export async function removeSymbolFromWatchlist(watchlistId: string, symbol: string): Promise<Watchlist> {
  const response = await axios.delete<Watchlist>(
    `${API_BASE}/watchlists/${watchlistId}/symbols/${symbol}`,
    { headers: { 'x-user-id': TEST_USER_ID } }
  );
  return response.data;
}

/**
 * Search for assets using database-first search.
 */
export async function searchAssets(query: string): Promise<SearchResult[]> {
  const response = await axios.get<SearchResult[]>(`${API_BASE}/market-data-foundation/stocks/search`, {
    params: { q: query },
  });
  return response.data;
}
