import { useCallback, useEffect, useRef, useState } from 'react';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { fetchSignalPositionLedgerActiveRows } from '../api/signalPositionLedgerApi';
import type { SignalPositionLedgerActiveRow } from '../types';

const PAGE_LIMIT = 100;
const MAX_PAGES = 50; // safety backstop (≤ 5,000 open rows) — avoids an unbounded loop.

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Open-candidate return summary could not be loaded.';
}

/**
 * Fetches the FULL set of open (ACTIVE) ledger rows for the current market scope
 * (paginated, read-only) so their unrealized mark-to-market moves can be combined with
 * the closed realized returns into a cumulative open + closed figure — not just the page
 * currently shown. Mirrors {@link useSignalPositionLedgerClosedReturns}.
 */
export function useSignalPositionLedgerOpenReturns() {
  const { scope } = useMarketScope();
  const { region, assetType } = scope;
  const [rows, setRows] = useState<SignalPositionLedgerActiveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latestRequestRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++latestRequestRef.current;
    setLoading(true);
    setError(null);
    try {
      const collected: SignalPositionLedgerActiveRow[] = [];
      let offset = 0;
      for (let page = 0; page < MAX_PAGES; page += 1) {
        const result = await fetchSignalPositionLedgerActiveRows({
          region,
          assetType,
          limit: PAGE_LIMIT,
          offset,
        });
        if (requestId !== latestRequestRef.current) return;
        collected.push(...result.items);
        if (!result.hasMore || result.items.length === 0) break;
        offset = result.nextOffset ?? offset + result.items.length;
      }
      if (requestId !== latestRequestRef.current) return;
      setRows(collected);
    } catch (caught) {
      if (requestId !== latestRequestRef.current) return;
      setError(toErrorMessage(caught));
      setRows([]);
    } finally {
      if (requestId !== latestRequestRef.current) return;
      setLoading(false);
    }
  }, [assetType, region]);

  useEffect(() => {
    void load();
  }, [load]);

  return { rows, loading, error, reload: () => void load() };
}
