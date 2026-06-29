import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogBody } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function PlanLimitReachedDialog({ open, onOpenChange, limitType, currentCount, limit }) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate('/admin/plans');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-600">
            <AlertTriangle className="h-5 w-5" />
            Plan Limit Reached
          </DialogTitle>
          <DialogDescription>
            {limitType === 'teacher' 
              ? `You have reached your plan's teacher limit (${currentCount}/${limit}).`
              : `You have reached your plan's student limit (${currentCount}/${limit}).`
            }
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="p-6 pt-0">
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
              <p className="text-sm text-rose-800">
                To add more {limitType}s, please upgrade to a higher plan with increased capacity.
              </p>
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700" onClick={handleUpgrade}>
            Upgrade Plan
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
