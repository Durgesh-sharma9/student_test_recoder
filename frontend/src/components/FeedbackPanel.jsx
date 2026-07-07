import { useEffect, useState } from 'react';
import { MessageSquare, Send, Plus, CircleCheckBig, Clock3, MessageCircleMore, Upload, X, User, GraduationCap, ChevronDown, FileText } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader, ErpSection } from '@/components/erp/PagePrimitives';
import { cn } from '@/lib/utils';

export default function FeedbackPanel({ role = 'parent' }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [selectedTeachers, setSelectedTeachers] = useState([]);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [replying, setReplying] = useState(false);
  const [creating, setCreating] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [replyAttachments, setReplyAttachments] = useState([]);
  const [dragActive, setDragActive] = useState(false);

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

  const fetchChildren = async () => {
    try {
      const res = await api.get('/parents/students');
      setChildren(res.data.students || []);
      
      // Auto-select if only one child
      if (res.data.students && res.data.students.length === 1) {
        setSelectedChild(res.data.students[0]);
      }
    } catch (error) {
      toast.error('Failed to load children');
    }
  };

  const fetchTeachers = async (classId) => {
    try {
      const res = await api.get('/users?role=teacher');
      const allTeachers = res.data.users || [];
      
      // Filter teachers assigned to this class
      const classTeachers = allTeachers.filter(teacher => 
        teacher.assignments && teacher.assignments.some(assignment => 
          assignment.class === classId
        )
      );
      
      setTeachers(classTeachers);
    } catch (error) {
      console.error('Failed to load teachers:', error);
    }
  };

  useEffect(() => {
    fetchTickets();
    if (role === 'parent') {
      fetchChildren();
    }
  }, [role]);

  useEffect(() => {
    if (selectedChild && selectedChild.class?._id) {
      fetchTeachers(selectedChild.class._id);
    }
  }, [selectedChild]);

  const handleCreateTicket = async (event) => {
    event.preventDefault();

    if (!selectedChild) {
      toast.error('Please select a child');
      return;
    }

    if (!title.trim() || !description.trim()) {
      toast.error('Please enter a title and description');
      return;
    }

    try {
      setCreating(true);
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('studentId', selectedChild._id);
      formData.append('teacherIds', JSON.stringify(selectedTeachers));
      attachments.forEach((file) => formData.append('attachments', file));

      const res = await api.post('/feedback', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setTitle('');
      setDescription('');
      setSelectedTeachers([]);
      setAttachments([]);
      toast.success(`Feedback submitted successfully. Ticket ID: ${res.data.feedback.ticketId}`);
      fetchTickets();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit feedback');
    } finally {
      setCreating(false);
    }
  };

  const handleReply = async (ticketId) => {
    const content = replyDrafts[ticketId]?.trim();
    if (!content && replyAttachments.length === 0) {
      toast.error('Please enter a reply or attach a file');
      return;
    }

    try {
      setReplying(true);
      const formData = new FormData();
      formData.append('content', content || '');
      replyAttachments.forEach((file) => formData.append('attachments', file));

      await api.post(`/feedback/${ticketId}/reply`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setReplyDrafts((prev) => ({ ...prev, [ticketId]: '' }));
      setReplyAttachments([]);
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

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setAttachments(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const removeReplyAttachment = (index) => {
    setReplyAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const toggleTeacherSelection = (teacherId) => {
    setSelectedTeachers(prev => 
      prev.includes(teacherId) 
        ? prev.filter(id => id !== teacherId)
        : [...prev, teacherId]
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <ErpSection title={role === 'parent' ? 'Parent Feedback' : 'Feedback Inbox'} icon={MessageSquare} tone={role === 'parent' ? 'blue' : 'violet'}>
      {role === 'parent' && (
        <form onSubmit={handleCreateTicket} className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Plus className="h-4 w-4" /> New Feedback Ticket
          </div>

          {/* Child Selection */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">Child *</label>
            {children.length === 0 ? (
              <p className="text-sm text-slate-500">No children linked to your account.</p>
            ) : children.length === 1 ? (
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{children[0].name}</p>
                    <p className="text-sm text-slate-600">
                      {children[0].className} {children[0].section} • Roll No {children[0].rollNo}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <Select value={selectedChild?._id} onValueChange={(value) => {
                const child = children.find(c => c._id === value);
                setSelectedChild(child);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Child *" />
                </SelectTrigger>
                <SelectContent>
                  {children.map(child => (
                    <SelectItem key={child._id} value={child._id}>
                      {child.name} - {child.className} {child.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Teacher Tag */}
          {selectedChild && teachers.length > 0 && (
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-slate-700">Teacher Tag (Optional)</label>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="space-y-2">
                  {teachers.map(teacher => {
                    const assignments = teacher.assignments?.filter(a => 
                      a.class === selectedChild.class?._id
                    ) || [];
                    const isSelected = selectedTeachers.includes(teacher._id);
                    
                    return (
                      <div
                        key={teacher._id}
                        onClick={() => toggleTeacherSelection(teacher._id)}
                        className={cn(
                          'flex cursor-pointer items-center justify-between rounded-lg border p-2 transition-colors',
                          isSelected ? 'border-violet-500 bg-violet-50' : 'border-slate-200 hover:bg-slate-50'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                            <GraduationCap className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{teacher.teacherName || teacher.name}</p>
                            <p className="text-xs text-slate-500">
                              {assignments.map(a => a.subject).join(', ')}
                            </p>
                          </div>
                        </div>
                        {isSelected && (
                          <CircleCheckBig className="h-5 w-5 text-violet-600" />
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  If no teacher selected, feedback goes only to Admin.
                </p>
              </div>
            </div>
          )}

          {/* Title */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">Title *</label>
            <Input 
              placeholder="Enter feedback title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">Description *</label>
            <Textarea 
              rows={4} 
              placeholder="Describe your feedback in detail" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
            />
          </div>

          {/* Attachments */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">Attachments (Max 5 files)</label>
            <div
              className={cn(
                'rounded-lg border-2 border-dashed p-4 text-center transition-colors',
                dragActive ? 'border-violet-500 bg-violet-50' : 'border-slate-300 hover:border-slate-400'
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-2 text-sm text-slate-600">
                Drag & drop files here or{' '}
                <label className="cursor-pointer text-violet-600 hover:text-violet-700">
                  <span>choose files</span>
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    onChange={(e) => setAttachments(prev => [...prev, ...Array.from(e.target.files || [])])}
                  />
                </label>
              </p>
              <p className="mt-1 text-xs text-slate-500">Images, PDF, DOC, DOCX (Max 10MB each)</p>
            </div>
            
            {attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-700">{file.name}</span>
                      <span className="text-xs text-slate-500">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttachment(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={creating}>
              {creating ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        </form>
      )}

      {/* Feedback History */}
      {loading ? (
        <p className="text-sm text-slate-500">Loading feedback...</p>
      ) : tickets.length === 0 ? (
        <p className="text-sm text-slate-500">No feedback tickets yet.</p>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <div key={ticket._id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{ticket.ticketId}</span>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', getStatusBadge(ticket.status))}>
                      {ticket.status}
                    </span>
                    <span className="text-xs text-slate-500">{formatDate(ticket.createdAt)}</span>
                  </div>
                  <h4 className="font-semibold text-slate-900">{ticket.title}</h4>
                  <p className="mt-1 text-sm text-slate-600 line-clamp-2">{ticket.description}</p>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                    <span>Student: {ticket.student?.name || 'N/A'}</span>
                    {ticket.teacherIds && ticket.teacherIds.length > 0 && (
                      <span>Tagged Teachers: {ticket.teacherIds.length}</span>
                    )}
                  </div>
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

              {/* Messages */}
              <div className="mt-4 space-y-2">
                {(ticket.messages || []).map((message, index) => (
                  <div key={`${ticket._id}-${index}`} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                    <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <MessageCircleMore className="h-3.5 w-3.5" />
                      {message.senderName || 'User'} • {message.senderRole}
                    </div>
                    <p className="text-slate-700">{message.content || 'Attachment only'}</p>
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {message.attachments.map((att, idx) => (
                          <a
                            key={idx}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-xs text-violet-600 hover:bg-violet-50"
                          >
                            <FileText className="h-3 w-3" />
                            {att.name || 'Attachment'}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Reply */}
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
                <div className="mt-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600 hover:text-slate-700">
                    <Upload className="h-4 w-4" />
                    <span>Attach files</span>
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      onChange={(e) => setReplyAttachments(prev => [...prev, ...Array.from(e.target.files || [])])}
                    />
                  </label>
                </div>
                {replyAttachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {replyAttachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between rounded border border-slate-200 bg-white p-1.5 text-xs">
                        <span className="text-slate-700">{file.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeReplyAttachment(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
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
