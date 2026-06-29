import { AlertTriangle, CreditCard } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogBody } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function SubscriptionExpiredDialog({ open, onOpenChange }) {
  const navigate = useNavigate();

  const handleRenew = () => {
    onOpenChange(false);
    navigate('/admin/plans');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-600">
            <AlertTriangle className="h-5 w-5" />
            Subscription Expired
          </DialogTitle>
          <DialogDescription>
            Your subscription has expired. Please renew your plan to continue using all features.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="p-6 pt-0">
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
              <p className="text-sm text-rose-800">
                While your subscription is expired, the system operates in read-only mode. You cannot add, edit, or delete any data.
              </p>
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700" onClick={handleRenew}>
            <CreditCard className="mr-2 h-4 w-4" />
            Renew Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
