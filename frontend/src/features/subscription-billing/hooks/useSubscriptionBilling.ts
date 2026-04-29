import { useCallback, useEffect, useState } from 'react';
import { changeSubscriptionPlan, fetchSubscriptionMe, fetchSubscriptionPlans } from '../api/subscriptionBillingService';
import type { PlanCode, SubscriptionMe, SubscriptionPlan } from '../types';

export function useSubscriptionBilling() {
  const [me, setMe] = useState<SubscriptionMe | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [meData, planData] = await Promise.all([fetchSubscriptionMe(), fetchSubscriptionPlans()]);
      setMe(meData);
      setPlans(planData);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load subscription');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const changePlan = async (planCode: PlanCode) => {
    setSaving(true);
    setError(null);
    try {
      await changeSubscriptionPlan(planCode);
      await reload();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to change plan');
    } finally {
      setSaving(false);
    }
  };

  return { me, plans, loading, saving, error, setError, reload, changePlan };
}
