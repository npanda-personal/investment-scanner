import { useCallback, useEffect, useState } from 'react';
import { fetchPostMortem, fetchTradeJournalEntries } from '../api/tradeJournalService';
import type { PostMortemSummaryData, TradeJournalEntry, TradeJournalListFilters } from '../types';

export function useTradeJournal(filters?: TradeJournalListFilters) {
  const [entries, setEntries] = useState<TradeJournalEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [postMortem, setPostMortem] = useState<PostMortemSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listResult, pm] = await Promise.all([
        fetchTradeJournalEntries(filters),
        fetchPostMortem(),
      ]);
      setEntries(listResult.entries);
      setTotal(listResult.total);
      setPostMortem(pm);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load trade journal');
    } finally {
      setLoading(false);
    }
  }, [
    filters?.decision,
    filters?.outcomeStatus,
    filters?.symbol,
    filters?.fromDate,
    filters?.toDate,
    filters?.page,
    filters?.pageSize,
    filters?.sortBy,
    filters?.sortDirection,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  return { entries, total, postMortem, loading, error, reload: load };
}
