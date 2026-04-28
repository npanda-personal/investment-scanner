import { useCallback, useEffect, useState } from 'react';
import { fetchAlertEvents, fetchAlertRules } from '../api/alertsMonitoringService';
import type { AlertEvent, AlertRule } from '../types';

export function useAlertsMonitoring() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ruleList, eventList] = await Promise.all([fetchAlertRules(), fetchAlertEvents()]);
      setRules(ruleList);
      setEvents(eventList);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  return { rules, events, loading, error, reload };
}
