import { useState, useEffect, useCallback } from 'react';
import { fetchResearchOverview, type ResearchOverview } from '../api/researchHubApi';

export const useResearchOverview = () => {
  const [data, setData] = useState<ResearchOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const overview = await fetchResearchOverview();
      setData(overview);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load research overview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
};
