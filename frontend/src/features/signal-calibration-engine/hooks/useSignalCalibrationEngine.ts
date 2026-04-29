import { useCallback, useEffect, useState } from 'react';
import { fetchCalibrationHealth, fetchCalibrationModel, fetchTopCalibratedSignals } from '../api/signalCalibrationEngineService';
import type { CalibrationModelInfo, SignalCalibrationResult } from '../types';

export function useSignalCalibrationEngine() {
  const [top, setTop] = useState<SignalCalibrationResult[]>([]);
  const [model, setModel] = useState<CalibrationModelInfo | null>(null);
  const [health, setHealth] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextTop, nextModel, nextHealth] = await Promise.all([
        fetchTopCalibratedSignals({ limit: 12 }),
        fetchCalibrationModel(),
        fetchCalibrationHealth(),
      ]);
      setTop(nextTop);
      setModel(nextModel);
      setHealth(nextHealth);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load signal calibration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { top, model, health, loading, error, reload };
}
