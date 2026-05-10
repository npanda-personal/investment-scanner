import { useCallback, useEffect, useState } from 'react';
import {
  createBacktestStrategy,
  deleteBacktestRun,
  deleteBacktestStrategy,
  fetchBacktestRuns,
  fetchBacktestStrategies,
  runBacktest,
  runBacktestStrategy,
} from '../api/backtestingStrategyLabService';
import type { BacktestRun, BacktestStrategy, BacktestStrategyConfig } from '../types';
import { useMarketScope } from '@/contexts/MarketScopeContext';

export function useBacktestingStrategyLab() {
  const { scope } = useMarketScope();
  const [strategies, setStrategies] = useState<BacktestStrategy[]>([]);
  const [runs, setRuns] = useState<BacktestRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<BacktestRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [strategyData, runData] = await Promise.all([
        fetchBacktestStrategies(),
        fetchBacktestRuns({ region: scope.region, assetType: scope.assetType }),
      ]);
      setStrategies(strategyData);
      setRuns(runData);
      setSelectedRun((current) => current && runData.some((run) => run.id === current.id) ? current : runData[0] ?? null);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load backtests');
    } finally {
      setLoading(false);
    }
  }, [scope.region, scope.assetType]);

  useEffect(() => { void reload(); }, [reload]);

  const createStrategy = async (name: string, description: string, config: BacktestStrategyConfig) => {
    setError(null);
    const strategy = await createBacktestStrategy({ name, description: description || null, config });
    setStrategies((items) => [strategy, ...items]);
    return strategy;
  };

  const runConfig = async (config: BacktestStrategyConfig) => {
    setRunning(true);
    setError(null);
    try {
      const run = await runBacktest({ config });
      setRuns((items) => [run, ...items]);
      setSelectedRun(run);
      return run;
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Backtest failed');
      return null;
    } finally {
      setRunning(false);
    }
  };

  const rerunStrategy = async (id: string) => {
    setRunning(true);
    setError(null);
    try {
      const run = await runBacktestStrategy(id);
      setRuns((items) => [run, ...items]);
      setSelectedRun(run);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Backtest failed');
    } finally {
      setRunning(false);
    }
  };

  const removeStrategy = async (id: string) => {
    await deleteBacktestStrategy(id);
    setStrategies((items) => items.filter((item) => item.id !== id));
  };

  const removeRun = async (id: string) => {
    await deleteBacktestRun(id);
    setRuns((items) => items.filter((item) => item.id !== id));
    setSelectedRun((current) => current?.id === id ? null : current);
  };

  return {
    strategies,
    runs,
    selectedRun,
    loading,
    running,
    error,
    setError,
    setSelectedRun,
    reload,
    createStrategy,
    runConfig,
    rerunStrategy,
    removeStrategy,
    removeRun,
  };
}
