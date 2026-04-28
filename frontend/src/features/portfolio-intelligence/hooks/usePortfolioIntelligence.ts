import { useCallback, useEffect, useState } from 'react';
import { fetchPortfolioIntelligence } from '../api/portfolioIntelligenceService';
import type { PortfolioIntelligenceResponse } from '../types';

export function usePortfolioIntelligence(portfolioId?: string) {
  const [intelligence, setIntelligence] = useState<PortfolioIntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!portfolioId) {
      setIntelligence(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setIntelligence(await fetchPortfolioIntelligence(portfolioId));
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load portfolio intelligence');
    } finally {
      setLoading(false);
    }
  }, [portfolioId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { intelligence, loading, error, reload: load };
}
