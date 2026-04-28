import { useCallback, useEffect, useState } from 'react';
import { fetchWatchlistDetail, fetchWatchlists } from '../api/watchlistManagementService';
import type { Watchlist, WatchlistDetail, WatchlistSortOption } from '../types';

export function useWatchlistManagement(selectedId?: string, sort: WatchlistSortOption = 'recentlyAdded') {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [detail, setDetail] = useState<WatchlistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchWatchlists();
      setWatchlists(list);
      if (selectedId) setDetail(await fetchWatchlistDetail(selectedId, sort));
      else setDetail(null);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load watchlists');
    } finally {
      setLoading(false);
    }
  }, [selectedId, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  return { watchlists, detail, loading, error, reload: load };
}
