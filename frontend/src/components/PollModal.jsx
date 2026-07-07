import { useEffect, useState } from 'react';
import { BarChart3, CheckCircle2, Clock3, Vote } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function PollModal({ open, onOpenChange, pollId }) {
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIndexes, setSelectedIndexes] = useState([]);

  useEffect(() => {
    if (!open || !pollId) return;

    const fetchPoll = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/polls/${pollId}`);
        setPoll(res.data.poll);
        const existing = res.data.poll?.existingResponse;
        setSelectedIndexes(existing?.selectedOptionIndexes || []);
      } catch (error) {
        console.error('Failed to fetch poll', error);
        toast.error('Failed to load poll');
      } finally {
        setLoading(false);
      }
    };

    fetchPoll();
  }, [open, pollId]);

  const toggleSelection = (index) => {
    if (!poll) return;

    if (poll.pollType === 'single') {
      setSelectedIndexes([index]);
      return;
    }

    setSelectedIndexes((prev) => (prev.includes(index) ? prev.filter((item) => item !== index) : [...prev, index].sort((a, b) => a - b)));
  };

  const handleSubmit = async () => {
    if (!poll) return;
    if (selectedIndexes.length === 0) {
      toast.error('Please select at least one option');
      return;
    }

    try {
      setSubmitting(true);
      await api.post(`/polls/${poll._id}/respond`, { selectedOptionIndexes: selectedIndexes });
      const res = await api.get(`/polls/${poll._id}`);
      setPoll(res.data.poll);
      setSelectedIndexes(res.data.poll?.existingResponse?.selectedOptionIndexes || []);
      toast.success('Your response has been submitted.');
    } catch (error) {
      console.error('Failed to submit poll', error);
      toast.error(error.response?.data?.message || 'Unable to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  const isClosed = !poll || poll.status === 'closed' || poll.status === 'expired' || (poll.expiryDate && new Date(poll.expiryDate) < new Date());
  const alreadyResponded = Boolean(poll?.existingResponse);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl shadow-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white shadow-lg">
              <Vote className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-slate-900">{poll?.title || 'Poll'}</DialogTitle>
              <DialogDescription className="text-sm text-slate-500">{poll?.description || 'Please cast your vote below.'}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">Loading poll...</div>
        ) : !poll ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">This poll is no longer available.</div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span className="rounded-full bg-violet-50 px-2.5 py-1 font-semibold uppercase tracking-wide text-violet-700">{poll.audience === 'teachers' ? 'Teachers' : 'Parents'}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1">{poll.pollType === 'multiple' ? 'Multiple Choice' : 'Single Choice'}</span>
              {poll.expiryDate ? <span className="rounded-full bg-slate-100 px-2.5 py-1">Expires {new Date(poll.expiryDate).toLocaleString()}</span> : <span className="rounded-full bg-slate-100 px-2.5 py-1">No expiry</span>}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <BarChart3 className="h-4 w-4 text-indigo-600" />
                {poll.totalResponses || 0} response{(poll.totalResponses || 0) === 1 ? '' : 's'} submitted
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                {isClosed ? <Clock3 className="h-4 w-4 text-red-500" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                {isClosed ? 'This poll is closed.' : 'This poll is currently open.'}
              </div>
            </div>

            <div className="space-y-3">
              {poll.options?.map((option, index) => {
                const checked = selectedIndexes.includes(index);
                return (
                  <label key={index} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${checked ? 'border-violet-300 bg-violet-50/70' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                    {poll.pollType === 'single' ? (
                      <input type="radio" name={`poll-option-${poll._id}`} checked={checked} onChange={() => toggleSelection(index)} disabled={isClosed || (alreadyResponded && !poll.allowEdit)} />
                    ) : (
                      <input type="checkbox" checked={checked} onChange={() => toggleSelection(index)} disabled={isClosed || (alreadyResponded && !poll.allowEdit)} />
                    )}
                    <span className="text-sm font-medium text-slate-700">{option.text}</span>
                  </label>
                );
              })}
            </div>

            {alreadyResponded && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                Your response has been submitted. {poll.allowEdit ? 'You can update it while the poll remains active.' : 'You cannot vote again.'}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="pt-4">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>Close</Button>
          {!isClosed && (
            <Button onClick={handleSubmit} disabled={submitting || (alreadyResponded && !poll?.allowEdit)} className="rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white">
              {submitting ? 'Submitting...' : alreadyResponded ? 'Update Response' : 'Submit Vote'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
