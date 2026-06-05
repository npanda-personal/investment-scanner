import { useCallback, useEffect, useRef, useState } from 'react';
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

const BACKTEST_TIMEOUT_MS = 120_000;   // 2 min hard abort
const BACKTEST_SLOW_WARN_MS = 30_000;  // 30s "taking longer" warning

export function useBacktestingStrategyLab() {
  const { scope } = useMarketScope();
  const [strategies, setStrategies] = useState<BacktestStrategy[]>([]);
  const [runs, setRuns] = useState<BacktestRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<BacktestRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runSlowWarning, setRunSlowWarning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  const cancelRun = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setRunning(false);
    setRunSlowWarning(false);
    setError('Backtest cancelled.');
  };

  const runConfig = async (config: BacktestStrategyConfig) => {
    // Cancel any previous in-flight request
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setRunning(true);
    setRunSlowWarning(false);
    setError(null);

    const slowTimer = setTimeout(() => setRunSlowWarning(true), BACKTEST_SLOW_WARN_MS);
    const hardTimer = setTimeout(() => {
      controller.abort();
    }, BACKTEST_TIMEOUT_MS);

    try {
      const run = await runBacktest({ config }, controller.signal);
      setRuns((items) => [run, ...items]);
      setSelectedRun(run);
      return run;
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED' || controller.signal.aborted) {
        // cancelled — error already set by cancelRun or timeout path
        if (!error) setError('Backtest timed out after 2 minutes. The backend is taking longer than expected.');
      } else {
        setError(err.response?.data?.error || err.message || 'Backtest failed');
      }
      return null;
    } finally {
      clearTimeout(slowTimer);
      clearTimeout(hardTimer);
      setRunning(false);
      setRunSlowWarning(false);
      abortControllerRef.current = null;
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
    runSlowWarning,
    error,
    setError,
    setSelectedRun,
    reload,
    createStrategy,
    runConfig,
    cancelRun,
    rerunStrategy,
    removeStrategy,
    removeRun,
  };
}
