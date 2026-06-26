import { useEffect, useState } from 'react';
import { useSubscription } from '@/context/SubscriptionContext';
import LockedFeatureDialog from '@/components/subscription/LockedFeatureDialog';

export default function RequireFeature({ featureKey, label, children }) {
  const { isFeatureEnabled } = useSubscription();
  const enabled = isFeatureEnabled(featureKey);
  const [open, setOpen] = useState(!enabled);

  useEffect(() => {
    setOpen(!enabled);
  }, [enabled]);

  if (enabled) return children;

  return (
    <>
      <LockedFeatureDialog open={open} onOpenChange={setOpen} featureLabel={label} />
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        This feature is locked for your current plan.
      </div>
    </>
  );
}

