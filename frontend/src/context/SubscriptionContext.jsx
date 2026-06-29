import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import api from '@/lib/api';
import { isFeatureEnabled as isFeatureEnabledUtil } from '@/lib/subscriptionFeatures';
import { useAuth } from '@/context/AuthContext';

const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/subscriptions/status');
      console.log('[SubscriptionContext] API Response:', res.data);
      setSubscription(res.data.subscription);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch only for tenant users (school_admin / teacher / parent)
    const token = localStorage.getItem('token');
    const role = user?.role === 'admin' ? 'school_admin' : user?.role;
    if (!token) return;
    if (!role || role === 'super_admin') return;
    if (!user?.school) return;
    refresh().catch(() => {});
  }, [refresh, user]);

  const value = useMemo(() => {
    const currentPlan = subscription?.currentPlan || null;
    const usage = subscription?.usage || null;
    return {
      subscription,
      currentPlan,
      loading,
      refresh,
      usage,
      isFeatureEnabled: (featureKey) => isFeatureEnabledUtil(currentPlan, featureKey),
      hasPendingVerification: Boolean(subscription?.pendingRequest),
      isSubscriptionExpired: currentPlan && subscription?.planExpiresAt ? new Date(subscription.planExpiresAt) < new Date() : false,
      canAddTeacher: !usage || usage.teacherLimit === null || usage.teachers < usage.teacherLimit,
      canAddStudent: !usage || usage.studentLimit === null || usage.students < usage.studentLimit,
    };
  }, [subscription, loading, refresh]);

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export const useSubscription = () => {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
};
