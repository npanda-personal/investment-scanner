import { useCallback, useEffect, useState } from 'react';
import {
  fetchPortfolioAllocation,
  fetchPortfolioDetail,
  fetchPortfolios,
  fetchPortfolioSummary,
  fetchPortfolioTransactions,
} from '../api/portfolioManagementService';
import type { Portfolio, PortfolioAllocation, PortfolioDetail, PortfolioSummary, PortfolioTransaction } from '../types';

export function usePortfolioManagement(selectedId?: string) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [detail, setDetail] = useState<PortfolioDetail | null>(null);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [allocation, setAllocation] = useState<PortfolioAllocation | null>(null);
  const [transactions, setTransactions] = useState<PortfolioTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const portfolioList = await fetchPortfolios();
      setPortfolios(portfolioList);
      if (!selectedId) {
        setDetail(null);
        setSummary(null);
        setAllocation(null);
        setTransactions([]);
        return;
      }
      const [portfolioDetail, portfolioSummary, portfolioAllocation, transactionList] = await Promise.all([
        fetchPortfolioDetail(selectedId),
        fetchPortfolioSummary(selectedId),
        fetchPortfolioAllocation(selectedId),
        fetchPortfolioTransactions(selectedId),
      ]);
      setDetail(portfolioDetail);
      setSummary(portfolioSummary);
      setAllocation(portfolioAllocation);
      setTransactions(transactionList);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load portfolio data');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    portfolios,
    detail,
    summary,
    allocation,
    transactions,
    loading,
    error,
    reload: load,
  };
}
