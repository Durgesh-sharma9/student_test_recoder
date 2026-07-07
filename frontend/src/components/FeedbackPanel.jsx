import { useEffect, useState } from 'react';
import { MessageSquare, Send, Plus, CircleCheckBig, Clock3, MessageCircleMore } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader, ErpSection } from '@/components/erp/PagePrimitives';

export default function FeedbackPanel({ role = 'parent' }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [studentId, setStudentId] = useState('');
  const [replyDrafts, setReplyDrafts] = useState({});
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [replying, setReplying] = useState(false);
  const [creating, setCreating] = useState(false);
  const [attachments, setAttachments] = useState([]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await api.get('/feedback');
      setTickets(res.data.feedback || []);
    } catch (error) {
      toast.error('Failed to load feedback tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreateTicket = async (event) => {
    event.preventDefault();

    if (!title.trim() || !description.trim()) {
      toast.error('Please enter a title and description');
      return;
    }

    try {
      setCreating(true);
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      if (studentId.trim()) formData.append('studentId', studentId);
      attachments.forEach((file) => formData.append('attachments', file));

      await api.post('/feedback', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setTitle('');
      setDescription('');
      setStudentId('');
      setAttachments([]);
      toast.success('Feedback submitted successfully');
      fetchTickets();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit feedback');
    } finally {
      setCreating(false);
    }
  };

  const handleReply = async (ticketId) => {
    const content = replyDrafts[ticketId]?.trim();
    if (!content && attachments.length === 0) {
      toast.error('Please enter a reply or attach a file');
      return;
    }

    try {
      setReplying(true);
      const formData = new FormData();
      formData.append('content', content || '');
      attachments.forEach((file) => formData.append('attachments', file));

      await api.post(`/feedback/${ticketId}/reply`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setReplyDrafts((prev) => ({ ...prev, [ticketId]: '' }));
      setAttachments([]);
      toast.success('Reply sent');
      fetchTickets();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send reply');
    } finally {
      setReplying(false);
    }
  };

  const handleStatusChange = async (ticketId, status) => {
    try {
      await api.put(`/feedback/${ticketId}/status`, { status });
      toast.success('Status updated');
      fetchTickets();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Resolved':
      case 'Closed':
        return 'bg-emerald-100 text-emerald-700';
      case 'In Progress':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <ErpSection title={role === 'parent' ? 'Parent Feedback' : 'Feedback Inbox'} icon={MessageSquare} tone={role === 'parent' ? 'blue' : 'violet'}>
      {role === 'parent' && (
        <form onSubmit={handleCreateTicket} className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Plus className="h-4 w-4" /> New Feedback Ticket
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Ticket title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Input placeholder="Student ID (optional)" value={studentId} onChange={(e) => setStudentId(e.target.value)} />
          </div>
          <Textarea className="mt-3" rows={3} placeholder="Tell us what you need help with" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Input className="mt-3" type="file" multiple onChange={(e) => setAttachments(Array.from(e.target.files || []))} />
          <div className="mt-3 flex justify-end">
            <Button type="submit" disabled={creating}>{creating ? 'Submitting...' : 'Submit Feedback'}</Button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading feedback...</p>
      ) : tickets.length === 0 ? (
        <p className="text-sm text-slate-500">No feedback tickets yet.</p>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <div key={ticket._id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-slate-900">{ticket.title}</h4>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusBadge(ticket.status)}`}>{ticket.status}</span>
                    <span className="text-xs text-slate-500">#{ticket.ticketId}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{ticket.description}</p>
                </div>
                {role !== 'parent' && (
                  <Select value={ticket.status} onValueChange={(value) => handleStatusChange(ticket._id, value)}>
                    <SelectTrigger className="w-full md:w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Open">Open</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Resolved">Resolved</SelectItem>
                      <SelectItem value="Closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="mt-4 space-y-2">
                {(ticket.messages || []).map((message, index) => (
                  <div key={`${ticket._id}-${index}`} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                    <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <MessageCircleMore className="h-3.5 w-3.5" />
                      {message.senderName || 'User'} • {message.senderRole}
                    </div>
                    <p className="text-slate-700">{message.content || 'Attachment only'}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-lg border border-slate-200 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Send className="h-4 w-4" /> Reply
                </div>
                <Textarea
                  rows={2}
                  value={replyDrafts[ticket._id] || ''}
                  onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [ticket._id]: e.target.value }))}
                  placeholder="Write a reply"
                />
                <Input className="mt-2" type="file" multiple onChange={(e) => setAttachments(Array.from(e.target.files || []))} />
                <div className="mt-3 flex justify-end">
                  <Button size="sm" onClick={() => handleReply(ticket._id)} disabled={replying}>
                    {replying ? 'Sending...' : 'Send Reply'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ErpSection>
  );
}
