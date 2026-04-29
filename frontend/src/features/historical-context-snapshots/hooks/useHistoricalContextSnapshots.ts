import { useCallback, useEffect, useState } from 'react';
import {
  fetchCountrySnapshots,
  fetchMarketSnapshots,
  fetchSectorSnapshots,
  fetchSnapshotCoverage,
} from '../api/historicalContextSnapshotsService';
import type { CountryContextSnapshot, MarketContextSnapshot, SectorContextSnapshot, SnapshotCoverage } from '../types';

export function useHistoricalContextSnapshots() {
  const [coverage, setCoverage] = useState<SnapshotCoverage | null>(null);
  const [market, setMarket] = useState<MarketContextSnapshot[]>([]);
  const [sectors, setSectors] = useState<SectorContextSnapshot[]>([]);
  const [countries, setCountries] = useState<CountryContextSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextCoverage, nextMarket, nextSectors, nextCountries] = await Promise.all([
        fetchSnapshotCoverage(),
        fetchMarketSnapshots(),
        fetchSectorSnapshots(),
        fetchCountrySnapshots(),
      ]);
      setCoverage(nextCoverage);
      setMarket(nextMarket);
      setSectors(nextSectors);
      setCountries(nextCountries);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load context snapshots');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { coverage, market, sectors, countries, loading, error, reload };
}
