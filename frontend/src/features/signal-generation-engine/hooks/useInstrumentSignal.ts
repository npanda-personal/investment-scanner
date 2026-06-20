import { useEffect, useState } from 'react';
import { fetchInstrumentSignal } from '../api/signalGenerationEngineService';
import type { SignalResult } from '../types';

export function useInstrumentSignal(instrumentId?: string, region?: string) {
  const [signal, setSignal] = useState<SignalResult | null>(null);
  const [loading, setLoading] = useState(Boolean(instrumentId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!instrumentId) return;
    setLoading(true);
    setError(null);
    fetchInstrumentSignal(instrumentId, region)
      .then(setSignal)
      .catch((err: any) => setError(err.response?.data?.error || err.message || 'Signal unavailable'))
      .finally(() => setLoading(false));
  }, [instrumentId, region]);

  return { signal, loading, error };
}

