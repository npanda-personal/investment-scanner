import { useEffect, useRef, useState } from 'react';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import {
  fetchDailyReviewShortlist,
  type DailyReviewShortlistResult,
} from '../api/dailyReviewShortlistService';
import {
  applyOverlaysToShortlist,
  fetchDailyReviewOverlays,
} from '../api/dailyReviewShortlistOverlays';

export function useDailyReviewShortlist() {
  const { scope } = useMarketScope();
  const requestRef = useRef(0);
  const [data, setData] = useState<DailyReviewShortlistResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setLoading(true);
    setError(null);

    fetchDailyReviewShortlist(scope)
      .then((next) => {
        if (requestRef.current !== requestId) return;
        setData(next);
        // The personal Portfolio / Watchlist overlay is the slowest (N+1) branch, so it is loaded
        // AFTER the table has painted and merged into the rows when ready — never blocking first paint.
        fetchDailyReviewOverlays()
          .then((overlays) => {
            if (requestRef.current !== requestId) return;
            setData((prev) => (prev ? applyOverlaysToShortlist(prev, overlays) : prev));
          })
          .catch(() => {
            /* Overlay is best-effort enrichment; its failure must not break the shortlist. */
          });
      })
      .catch((caught) => {
        if (requestRef.current !== requestId) return;
        setData(null);
        setError(caught instanceof Error ? caught.message : 'Daily Review Shortlist is unavailable.');
      })
      .finally(() => {
        if (requestRef.current === requestId) setLoading(false);
      });
  }, [scope]);

  return { scope, data, loading, error };
}
