import { useCallback, useEffect, useState } from 'react';
import {
  fetchSmartMoneyDistribution,
  fetchSmartMoneyHealth,
  fetchSmartMoneySectors,
  fetchSmartMoneyStock,
  fetchSmartMoneyTop,
} from '../api/smartMoneyIntelligenceService';
import type { SectorSmartMoneySummary, SmartMoneyHealth, SmartMoneyRange, SmartMoneyStockSummary } from '../types';

export function useSmartMoneyIntelligence() {
  const [range, setRange] = useState<SmartMoneyRange>('3M');
  const [sector, setSector] = useState<string>('');
  
  // Pagination
  const [topPage, setTopPage] = useState(0);
  const [topPageSize, setTopPageSize] = useState(10);
  const [topTotal, setTopTotal] = useState(0);
  
  const [distPage, setDistPage] = useState(0);
  const [distPageSize, setDistPageSize] = useState(10);
  const [distTotal, setDistTotal] = useState(0);

  const [health, setHealth] = useState<SmartMoneyHealth | null>(null);
  const [top, setTop] = useState<SmartMoneyStockSummary[]>([]);
  const [distribution, setDistribution] = useState<SmartMoneyStockSummary[]>([]);
  const [sectors, setSectors] = useState<SectorSmartMoneySummary[]>([]);
  const [selectedStock, setSelectedStock] = useState<SmartMoneyStockSummary | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [topLoading, setTopLoading] = useState(false);
  const [distLoading, setDistLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial load for health and sectors
  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [healthData, sectorData] = await Promise.all([
        fetchSmartMoneyHealth(),
        fetchSmartMoneySectors(range),
      ]);
      setHealth(healthData);
      setSectors(sectorData);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load smart money data');
    } finally {
      setLoading(false);
    }
  }, [range]);

  const loadTop = useCallback(async () => {
    setTopLoading(true);
    try {
      const res = await fetchSmartMoneyTop(topPageSize, topPage * topPageSize, range, sector || undefined);
      setTop(res.results || []);
      setTopTotal(res.total || 0);
      if (!selectedStock && res.results && res.results.length > 0) setSelectedStock(res.results[0]);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load accumulation candidates');
    } finally {
      setTopLoading(false);
    }
  }, [topPage, topPageSize, range, sector, selectedStock]);

  const loadDist = useCallback(async () => {
    setDistLoading(true);
    try {
      const res = await fetchSmartMoneyDistribution(distPageSize, distPage * distPageSize, range, sector || undefined);
      setDistribution(res.results || []);
      setDistTotal(res.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load distribution warnings');
    } finally {
      setDistLoading(false);
    }
  }, [distPage, distPageSize, range, sector]);

  useEffect(() => { void loadInitial(); }, [loadInitial]);
  useEffect(() => { void loadTop(); }, [loadTop]);
  useEffect(() => { void loadDist(); }, [loadDist]);

  const loadStock = async (instrumentId: string) => {
    setDetailLoading(true);
    setError(null);
    try {
      setSelectedStock(await fetchSmartMoneyStock(instrumentId, range));
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load stock smart money detail');
    } finally {
      setDetailLoading(false);
    }
  };

  return {
    range, setRange,
    sector, setSector,
    
    topPage, setTopPage,
    topPageSize, setTopPageSize,
    topTotal,
    topLoading,

    distPage, setDistPage,
    distPageSize, setDistPageSize,
    distTotal,
    distLoading,

    health,
    top,
    distribution,
    sectors,
    selectedStock,
    loading,
    detailLoading,
    error,
    setError,
    loadInitial,
    loadStock,
  };
}
