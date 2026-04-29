import { useCallback, useEffect, useState } from 'react';
import {
  fetchAlertDigest,
  fetchMarketBrief,
  fetchPortfolioSummary,
  fetchStockSummary,
  fetchWatchlistSummary,
} from '../api/aiInvestmentCopilotService';
import type { CopilotSummaryResponse } from '../types';

export function useAiInvestmentCopilot() {
  const [marketBrief, setMarketBrief] = useState<CopilotSummaryResponse | null>(null);
  const [alertDigest, setAlertDigest] = useState<CopilotSummaryResponse | null>(null);
  const [activeSummary, setActiveSummary] = useState<CopilotSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [brief, alerts] = await Promise.all([fetchMarketBrief(), fetchAlertDigest()]);
      setMarketBrief(brief);
      setAlertDigest(alerts);
      setActiveSummary((current) => current ?? brief);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load copilot summaries');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const runSummary = async (kind: 'stock' | 'portfolio' | 'watchlist', id: string) => {
    setRunning(true);
    setError(null);
    try {
      const result = kind === 'stock'
        ? await fetchStockSummary(id)
        : kind === 'portfolio'
          ? await fetchPortfolioSummary(id)
          : await fetchWatchlistSummary(id);
      setActiveSummary(result);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to generate summary');
    } finally {
      setRunning(false);
    }
  };

  return {
    marketBrief,
    alertDigest,
    activeSummary,
    loading,
    running,
    error,
    setError,
    setActiveSummary,
    reload,
    runSummary,
  };
}
