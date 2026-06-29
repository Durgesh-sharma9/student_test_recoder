import { useState } from 'react';
import { useSubscription } from '@/context/SubscriptionContext';

export function useSubscriptionExpiry() {
  const { isSubscriptionExpired } = useSubscription();
  const [dialogOpen, setDialogOpen] = useState(false);

  const checkAndBlock = (callback) => {
    if (isSubscriptionExpired) {
      setDialogOpen(true);
      return false;
    }
    if (callback) callback();
    return true;
  };

  return {
    isSubscriptionExpired,
    dialogOpen,
    setDialogOpen,
    checkAndBlock,
  };
}
