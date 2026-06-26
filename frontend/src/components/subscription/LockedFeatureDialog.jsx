import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function LockedFeatureDialog({ open, onOpenChange, featureLabel }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role === 'admin' ? 'school_admin' : user?.role;
  const currentPath = window.location.pathname;

  const handleViewPlans = () => {
    onOpenChange(false);
    // Only navigate if not already on plans page
    if (currentPath !== '/admin/plans') {
      navigate('/admin/plans');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Lock className="h-5 w-5" />
            </span>
            Upgrade Your Plan
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            {featureLabel ? (
              <>
                <span className="font-medium text-slate-800">{featureLabel}</span> is not available in your current subscription.
              </>
            ) : (
              <>This feature is not available in your current subscription.</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {role === 'school_admin' ? (
            <Button
              variant="success"
              onClick={handleViewPlans}
            >
              View Plans
            </Button>
          ) : (
            <Button variant="success" onClick={() => onOpenChange(false)}>
              Contact Admin
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
