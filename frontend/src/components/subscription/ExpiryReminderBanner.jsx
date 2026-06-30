import { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/context/SubscriptionContext';

export default function ExpiryReminderBanner() {
  const { subscription, currentPlan } = useSubscription();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  const planExpiresAt = subscription?.planExpiresAt;
  if (!planExpiresAt) return null;

  const now = new Date();
  const expiry = new Date(planExpiresAt);
  const hoursUntilExpiry = (expiry - now) / (1000 * 60 * 60);

  // Show banner only if within 48 hours of expiry
  if (hoursUntilExpiry > 48 || hoursUntilExpiry < 0) return null;
  if (dismissed) return null;

  const isTrial = currentPlan?.planType === 'trial';
  const hoursRounded = Math.round(hoursUntilExpiry);

  const handleDismiss = () => {
    setDismissed(true);
  };

  const handleUpgrade = () => {
    navigate('/admin/plans');
  };

  return (
    <div className="bg-amber-50 border border-amber-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-900">
            {isTrial ? (
              <>Your free trial expires in {hoursRounded} hours. Upgrade your plan.</>
            ) : (
              <>Your subscription expires in {hoursRounded} hours. Renew your subscription.</>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleUpgrade}
          className="text-sm font-semibold text-amber-900 hover:text-amber-700"
        >
          {isTrial ? 'Upgrade Plan' : 'Renew Subscription'}
        </button>
        <button
          onClick={handleDismiss}
          className="text-amber-600 hover:text-amber-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
