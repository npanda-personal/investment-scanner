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
  const [health, setHealth] = useState<SmartMoneyHealth | null>(null);
  const [top, setTop] = useState<SmartMoneyStockSummary[]>([]);
  const [distribution, setDistribution] = useState<SmartMoneyStockSummary[]>([]);
  const [sectors, setSectors] = useState<SectorSmartMoneySummary[]>([]);
  const [selectedStock, setSelectedStock] = useState<SmartMoneyStockSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [healthData, topData, distributionData, sectorData] = await Promise.all([
        fetchSmartMoneyHealth(),
        fetchSmartMoneyTop(10, range),
        fetchSmartMoneyDistribution(10, range),
        fetchSmartMoneySectors(range),
      ]);
      setHealth(healthData);
      setTop(topData);
      setDistribution(distributionData);
      setSectors(sectorData);
      setSelectedStock((current) => current ?? topData[0] ?? distributionData[0] ?? null);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load smart money data');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { void reload(); }, [reload]);

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
    range,
    setRange,
    health,
    top,
    distribution,
    sectors,
    selectedStock,
    loading,
    detailLoading,
    error,
    setError,
    reload,
    loadStock,
  };
}
