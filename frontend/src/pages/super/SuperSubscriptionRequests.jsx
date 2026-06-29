import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CreditCard, Search, CheckCircle2, XCircle } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErpSection, FormField, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogBody } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const statusBadge = (status) => {
  if (status === 'approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'rejected') return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
};

export default function SuperSubscriptionRequests() {
  const [requests, setRequests] = useState([]);
  const [query, setQuery] = useState({ status: 'all', search: '' });
  const [active, setActive] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectForm, setRejectForm] = useState({ reason: 'wrong_utr', message: '' });
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const load = async () => {
    const params = {};
    if (query.status !== 'all') params.status = query.status;
    if (query.search) params.search = query.search;
    const res = await api.get('/super-admin/subscription-requests', { params });
    const fetchedRequests = res.data.requests || [];
    setRequests(fetchedRequests);

    const targetId = searchParams.get('requestId');
    if (targetId) {
      const targetReq = fetchedRequests.find(r => r._id === targetId);
      if (targetReq) {
        setActive(targetReq);
        setDetailsOpen(true);
        // Remove the query param gracefully so it doesn't reopen if the user closes it manually
        searchParams.delete('requestId');
        setSearchParams(searchParams, { replace: true });
      }
    }
  };

  useEffect(() => {
    load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.status]);

  const filtered = useMemo(() => requests, [requests]);

  const openDetails = (r) => {
    setActive(r);
    setDetailsOpen(true);
  };

  const approve = async () => {
    if (!active?._id) return;
    setLoading(true);
    try {
      await api.post(`/super-admin/subscription-requests/${active._id}/approve`);
      toast.success('Request approved and plan activated');
      setDetailsOpen(false);
      setActive(null);
      load();
    } finally {
      setLoading(false);
    }
  };

  const reject = async () => {
    if (!active?._id) return;
    setLoading(true);
    try {
      await api.post(`/super-admin/subscription-requests/${active._id}/reject`, rejectForm);
      toast.success('Request rejected');
      setRejectOpen(false);
      setDetailsOpen(false);
      setActive(null);
      setRejectForm({ reason: 'wrong_utr', message: '' });
      load();
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageStack>
      <PageHeader
        title="Subscription Requests"
        description="Review manual UPI payment requests submitted by schools and approve or reject them."
      />

      <ErpSection
        title="Requests"
        icon={CreditCard}
        tone="green"
        action={
          <Button variant="outline" size="sm" onClick={() => load()}>
            Refresh
          </Button>
        }
      >
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <FormField label="Status">
            <Select value={query.status} onValueChange={(v) => setQuery((s) => ({ ...s, status: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Search (School / Admin / UTR)">
            <div className="flex gap-2">
              <Input
                placeholder="Search..."
                value={query.search}
                onChange={(e) => setQuery((s) => ({ ...s, search: e.target.value }))}
              />
              <Button variant="outline" type="button" onClick={() => load()}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </FormField>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Requested Plan</TableHead>
                <TableHead>Cycle</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>UTR</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r._id} className="cursor-pointer" onClick={() => openDetails(r)}>
                  <TableCell className="font-medium">{r.school?.schoolName || '-'}</TableCell>
                  <TableCell>{r.adminUser?.name || r.school?.adminName || '-'}</TableCell>
                  <TableCell>{r.requestedPlan?.name || '-'}</TableCell>
                  <TableCell className="capitalize">{String(r.billingCycle || r.requestedPlan?.billingCycle || '-').replace('_', ' ')}</TableCell>
                  <TableCell>₹{Number(r.finalAmount || 0).toFixed(2)}</TableCell>
                  <TableCell className="font-mono text-xs">{r.utr}</TableCell>
                  <TableCell>{r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '-'}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-lg border px-2 py-1 text-xs font-semibold ${statusBadge(r.status)}`}>
                      {r.status === 'pending' ? 'Pending' : r.status === 'approved' ? 'Approved' : 'Rejected'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-slate-500">
                    No requests found.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </ErpSection>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
            <DialogDescription>Verify payment and approve or reject.</DialogDescription>
          </DialogHeader>

          <DialogBody>
          {active ? (
            <div className="grid gap-4 p-6 pt-0 md:grid-cols-2">
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm">
                <p><span className="font-semibold text-slate-900">School:</span> {active.school?.schoolName}</p>
                <p><span className="font-semibold text-slate-900">Admin:</span> {active.adminUser?.name || active.school?.adminName}</p>
                <p><span className="font-semibold text-slate-900">Email:</span> {active.school?.email || active.adminUser?.email || '-'}</p>
                <p><span className="font-semibold text-slate-900">Phone:</span> {active.school?.phone || active.adminUser?.phoneNo || '-'}</p>
                <p><span className="font-semibold text-slate-900">Current Plan:</span> {active.currentPlan?.name || active.school?.plan?.name || '-'}</p>
              </div>

              <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm">
                <p><span className="font-semibold text-slate-900">Requested Plan:</span> {active.requestedPlan?.name}</p>
                <p><span className="font-semibold text-slate-900">Billing Cycle:</span> {String(active.billingCycle || active.requestedPlan?.billingCycle || '-').replace('_', ' ')}</p>
                <p><span className="font-semibold text-slate-900">Base Price:</span> ₹{Number(active.basePrice || 0).toFixed(2)}</p>
                <p><span className="font-semibold text-slate-900">Tax:</span> {active.taxName ? `${active.taxName} (${active.taxPercentage}%)` : 'Not Applied'}</p>
                {active.taxName ? (
                  <p><span className="font-semibold text-slate-900">Tax Amount:</span> ₹{Number(active.taxAmount || 0).toFixed(2)}</p>
                ) : null}
                <p><span className="font-semibold text-slate-900">Final Amount:</span> ₹{Number(active.finalAmount || 0).toFixed(2)}</p>
                <p><span className="font-semibold text-slate-900">UTR:</span> <span className="font-mono text-xs">{active.utr}</span></p>
                {active.paymentScreenshotUrl ? (
                  <a
                    href={active.paymentScreenshotUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-indigo-600 hover:underline"
                  >
                    View Screenshot
                  </a>
                ) : (
                  <p className="text-slate-500">No screenshot uploaded.</p>
                )}
              </div>
            </div>
          ) : null}

          <DialogFooter>
            {active?.status === 'pending' ? (
              <>
                <Button variant="outline" onClick={() => setRejectOpen(true)} disabled={loading}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button variant="success" onClick={approve} disabled={loading}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                Close
              </Button>
            )}
          </DialogFooter>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>Select a reason and optionally add a message for the admin.</DialogDescription>
          </DialogHeader>

          <DialogBody>
          <div className="grid gap-4 p-6 pt-0">
            <FormField label="Reason">
              <Select value={rejectForm.reason} onValueChange={(v) => setRejectForm((s) => ({ ...s, reason: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wrong_utr">Wrong UTR</SelectItem>
                  <SelectItem value="wrong_amount">Wrong Amount</SelectItem>
                  <SelectItem value="screenshot_missing">Screenshot Missing</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Optional Message">
              <Textarea
                placeholder="Add details (optional)"
                value={rejectForm.message}
                onChange={(e) => setRejectForm((s) => ({ ...s, message: e.target.value }))}
              />
            </FormField>
          </div>
          </DialogBody>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={reject} disabled={loading}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageStack>
  );
}