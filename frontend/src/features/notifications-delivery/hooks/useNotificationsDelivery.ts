import { useCallback, useEffect, useState } from 'react';
import {
  fetchNotificationEvents,
  fetchNotificationPreferences,
  fetchNotificationProviderStatus,
} from '../api/notificationsDeliveryService';
import type { NotificationEvent, NotificationPreferences, NotificationProviderStatus } from '../types';

export function useNotificationsDelivery() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [events, setEvents] = useState<NotificationEvent[]>([]);
  const [providerStatus, setProviderStatus] = useState<NotificationProviderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextPreferences, nextEvents, nextProviderStatus] = await Promise.all([
        fetchNotificationPreferences(),
        fetchNotificationEvents(),
        fetchNotificationProviderStatus(),
      ]);
      setPreferences(nextPreferences);
      setEvents(nextEvents);
      setProviderStatus(nextProviderStatus);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { preferences, events, providerStatus, loading, error, reload };
}
