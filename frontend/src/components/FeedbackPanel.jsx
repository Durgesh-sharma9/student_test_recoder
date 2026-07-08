import { useEffect, useState } from 'react';
import { 
  MessageSquare, Send, Plus, CircleCheckBig, MessageCircleMore, 
  Upload, X, User, GraduationCap, FileText, Loader2, Inbox, Paperclip, CheckCircle2
} from 'lucide-react';
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
  const [selectedTeacher, setSelectedTeacher] = useState(null);
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
      console.log('=== FETCH CHILDREN START ===');
      console.log('API Response:', res.data);
      console.log('Students:', res.data.students);
      setChildren(res.data.students || []);
      
      if (res.data.students && res.data.students.length === 1) {
        console.log('Auto-selecting child:', res.data.students[0]);
        setSelectedChild(res.data.students[0]);
      }
      console.log('=== FETCH CHILDREN END ===');
    } catch (error) {
      toast.error('Failed to load children');
    }
  };

  const fetchTeachers = async (classId, child = selectedChild) => {
    try {
      console.log('=== FETCH TEACHERS START ===');
      console.log('classId passed:', classId, 'type:', typeof classId);
      console.log('child passed:', child);
      console.log('selectedChild.class._id:', selectedChild?.class?._id);
      console.log('selectedChild.class:', selectedChild?.class);
      
      const response = await api.get('/users?role=teacher');
      const allTeachers = response.data.users || [];
      
      console.log('Teacher API Response', response.data);
      console.log('Teacher List Before Filter', allTeachers);
      
      if (allTeachers.length === 0) {
        console.log('ERROR: No teachers returned from API');
        setTeachers([]);
        return;
      }
      
      const normalizedTeachers = allTeachers.map((teacher) => {
        const fallbackAssignments = Array.isArray(teacher.assignedClasses) && teacher.assignedClasses.length > 0 && (!teacher.assignments || teacher.assignments.length === 0)
          ? teacher.assignedClasses.map((cls) => ({ class: cls, subject: 'ASSIGNED' }))
          : [];

        const effectiveAssignments = Array.isArray(teacher.assignments) && teacher.assignments.length > 0
          ? teacher.assignments
          : fallbackAssignments;

        return {
          ...teacher,
          assignments: effectiveAssignments,
        };
      });
      
      const childClassId = child?.class?._id || child?.class;
      console.log('Selected Child', child);
      console.log('Selected Class ID', childClassId);
      
      const filteredTeachers = normalizedTeachers.filter((teacher) => {
        const effectiveAssignments = teacher.assignments || [];

        if (effectiveAssignments.length === 0) {
          console.log('Filtering out teacher (no assignments):', teacher.teacherName || teacher.name);
          return false;
        }
        
        const hasMatch = effectiveAssignments.some((assignment) => {
          const assignmentClassId = assignment.class?._id || assignment.class;
          const matches = String(assignmentClassId) === String(classId);
          console.log('Assignment check:', {
            teacher: teacher.teacherName || teacher.name,
            assignmentClassId,
            targetClassId: classId,
            matches,
            subject: assignment.subject,
          });
          return matches;
        });
        
        return hasMatch;
      });
      
      console.log('Teacher List After Filter', filteredTeachers);
      console.log('=== FETCH TEACHERS END ===');
      
      setTeachers(filteredTeachers);
    } catch (error) {
      console.error('Failed to load teachers:', error);
      setTeachers([]);
    }
  };

  useEffect(() => {
    fetchTickets();
    if (role === 'parent') {
      fetchChildren();
    }
  }, [role]);

  useEffect(() => {
    if (selectedChild && selectedChild.classId) {
      fetchTeachers(selectedChild.classId, selectedChild);
      setSelectedTeacher(null); // Reset teacher selection when child changes
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
      if (selectedTeacher) {
        formData.append('teacherId', selectedTeacher._id);
        formData.append('taggedSubject', selectedTeacher.subject);
      }
      attachments.forEach((file) => formData.append('attachments', file));

      const res = await api.post('/feedback', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setTitle('');
      setDescription('');
      setSelectedTeacher(null);
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
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-600/20';
      case 'In Progress':
        return 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-600/20';
      case 'Open':
        return 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-600/20';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200 ring-slate-600/20';
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <ErpSection title={role === 'parent' ? 'Parent Feedback' : 'Feedback Inbox'} icon={MessageSquare} tone={role === 'parent' ? 'blue' : 'violet'}>
      {role === 'parent' && (
        <form onSubmit={handleCreateTicket} className="mb-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
          <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Plus className="h-4 w-4 text-blue-600" /> New Feedback Ticket
            </div>
            <p className="mt-1 text-xs text-slate-500">Submit a query, suggestion, or issue directly to the administration or teachers.</p>
          </div>

          <div className="p-5 space-y-6">
            {/* Child Selection */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Child <span className="text-red-500">*</span></label>
              {children.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
                  <p className="text-sm text-slate-500">No children linked to your account.</p>
                </div>
              ) : children.length === 1 ? (
                <div className="inline-flex w-full md:w-auto items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-600/10">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="pr-4">
                    <p className="text-sm font-semibold text-slate-900">{children[0].name}</p>
                    <p className="text-xs text-slate-500">
                      {children[0].className} {children[0].section} • Roll No {children[0].rollNo}
                    </p>
                  </div>
                  <CheckCircle2 className="ml-auto h-5 w-5 text-blue-500 md:hidden" />
                </div>
              ) : (
                <Select value={selectedChild?._id || ''} onValueChange={(value) => {
                  const child = children.find(c => c._id === value);
                  setSelectedChild(child);
                }}>
                  <SelectTrigger className="w-full md:w-80 transition-shadow focus:ring-2 focus:ring-blue-500/20">
                    <SelectValue placeholder="Select Child" />
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
            {selectedChild && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Teacher <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="space-y-2">
                  {/* Admin Only Option */}
                  <label 
                    onClick={() => setSelectedTeacher(null)}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all',
                      !selectedTeacher 
                        ? 'border-violet-500 bg-violet-50' 
                        : 'border-slate-200 bg-white hover:border-violet-300'
                    )}
                  >
                    <div className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border-2",
                      !selectedTeacher 
                        ? "border-violet-500 bg-violet-500" 
                        : "border-slate-300 bg-white"
                    )}>
                      {!selectedTeacher && (
                        <div className="h-2 w-2 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-slate-900">Admin Only</span>
                  </label>

                  {/* Teacher Options */}
                  {(() => {
                    console.log('=== TEACHER RENDERING START ===');
                    console.log('teachers array length:', teachers.length);
                    console.log('teachers array:', teachers);
                    console.log('selectedChild:', selectedChild);
                    console.log('selectedChild.classId:', selectedChild?.classId);
                    console.log('=== TEACHER RENDERING END ===');
                    
                    if (teachers.length === 0) {
                      return (
                        <p className="text-sm text-slate-500 italic">No teachers found for this student.</p>
                      );
                    }
                    
                    return teachers.map(teacher => {
                      const assignments = teacher.assignments || [];
                      const isSelected = selectedTeacher?._id === teacher._id;
                    
                      return (
                        <label
                          key={teacher._id}
                          onClick={() => setSelectedTeacher({ _id: teacher._id, subject: assignments[0]?.subject, name: teacher.teacherName || teacher.name })}
                          className={cn(
                            'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all',
                            isSelected 
                              ? 'border-violet-500 bg-violet-50' 
                              : 'border-slate-200 bg-white hover:border-violet-300'
                          )}
                        >
                          <div className={cn(
                            "flex h-5 w-5 items-center justify-center rounded-full border-2",
                            isSelected 
                              ? "border-violet-500 bg-violet-500" 
                              : "border-slate-300 bg-white"
                          )}>
                            {isSelected && (
                              <div className="h-2 w-2 rounded-full bg-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900">{teacher.teacherName || teacher.name}</p>
                            <p className="text-xs text-slate-500">
                              {assignments.map(a => a.subject).join(', ') || 'Staff'}
                            </p>
                          </div>
                        </label>
                      );
                    });
                  })()}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  If no teacher selected, feedback goes only to Admin.
                </p>
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">Subject <span className="text-red-500">*</span></label>
                <Input 
                  placeholder="E.g., Query regarding upcoming examinations" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  className="transition-shadow focus-visible:ring-2 focus-visible:ring-blue-500/20"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">Details <span className="text-red-500">*</span></label>
                <Textarea 
                  rows={4} 
                  placeholder="Provide all relevant details here..." 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  className="resize-none transition-shadow focus-visible:ring-2 focus-visible:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Attachments */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Attachments <span className="text-slate-400 font-normal">(Max 5 files)</span></label>
              <div
                className={cn(
                  'relative rounded-xl border-2 border-dashed p-6 text-center transition-all',
                  dragActive 
                    ? 'border-blue-500 bg-blue-50/50' 
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 mb-3">
                  <Upload className="h-5 w-5 text-slate-500" />
                </div>
                <p className="text-sm font-medium text-slate-700">
                  Drag & drop files here or{' '}
                  <label className="relative cursor-pointer rounded-md font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500">
                    <span>browse</span>
                    <input
                      type="file"
                      className="sr-only"
                      multiple
                      onChange={(e) => setAttachments(prev => [...prev, ...Array.from(e.target.files || [])])}
                    />
                  </label>
                </p>
                <p className="mt-1 text-xs text-slate-500">PNG, JPG, PDF up to 10MB</p>
              </div>
              
              {attachments.length > 0 && (
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-500">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-700">{file.name}</p>
                          <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-red-500 shrink-0"
                        onClick={() => removeAttachment(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4 flex justify-end">
            <Button type="submit" disabled={creating} className={cn(role === 'parent' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-violet-600 hover:bg-violet-700')}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                </>
              ) : (
                'Submit Feedback'
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Feedback History */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 tracking-tight">Recent Tickets</h3>
        
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-6 w-20 rounded-full bg-slate-200"></div>
                  <div className="h-6 w-24 rounded-full bg-slate-200"></div>
                </div>
                <div className="h-5 w-1/3 rounded bg-slate-200 mb-3"></div>
                <div className="h-4 w-full rounded bg-slate-100 mb-2"></div>
                <div className="h-4 w-2/3 rounded bg-slate-100"></div>
              </div>
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-16 px-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-4">
              <Inbox className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">No tickets found</h3>
            <p className="mt-1 text-sm text-slate-500">You haven't submitted any feedback tickets yet.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {tickets.map((ticket) => (
              <div key={ticket._id} className="rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md overflow-hidden flex flex-col">
                <div className="p-5 flex-1">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5 mb-3">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10 uppercase tracking-wider font-mono">
                          {ticket.ticketId}
                        </span>
                        <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', getStatusBadge(ticket.status))}>
                          {ticket.status}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">{formatDate(ticket.createdAt)}</span>
                      </div>
                      
                      <h4 className="text-base font-semibold text-slate-900 break-words">{ticket.title}</h4>
                      <p className="mt-1.5 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap break-words">{ticket.description}</p>
                      
                      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-medium text-slate-700">{ticket.student?.name || 'N/A'}</span>
                        </div>
                        {ticket.taggedTeacherName ? (
                          <div className="flex items-center gap-1.5">
                            <GraduationCap className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-medium text-slate-700">
                              {ticket.taggedSubject} • {ticket.taggedTeacherName}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <GraduationCap className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-slate-500">Admin Only</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {role !== 'parent' && (
                      <div className="shrink-0 w-full md:w-48">
                        <Select value={ticket.status || ''} onValueChange={(value) => handleStatusChange(ticket._id, value)}>
                          <SelectTrigger className="w-full h-9 transition-shadow focus:ring-2 focus:ring-violet-500/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Open">Open</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Resolved">Resolved</SelectItem>
                            <SelectItem value="Closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Messages Thread */}
                  {ticket.messages && ticket.messages.length > 0 && (
                    <div className="mt-6 ml-1 space-y-4 border-l-2 border-slate-100 pl-4">
                      {ticket.messages.map((message, index) => (
                        <div key={`${ticket._id}-${index}`} className="relative rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-colors hover:bg-slate-50">
                          <div className="absolute -left-[21px] top-4 h-2 w-2 rounded-full border-2 border-white bg-slate-300 ring-2 ring-white"></div>
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-900">{message.senderName || 'User'}</span>
                              <span className="inline-flex rounded bg-white px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500 shadow-sm border border-slate-100">
                                {message.senderRole}
                              </span>
                            </div>
                          </div>
                          
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{message.content || 'Attachment only'}</p>
                          
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {message.attachments.map((att, idx) => (
                                <a
                                  key={idx}
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="group flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                                >
                                  <FileText className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-500" />
                                  <span className="truncate max-w-[150px]">{att.name || 'Attachment'}</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reply Section */}
                <div className="border-t border-slate-100 bg-slate-50 p-4">
                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-slate-200 focus-within:border-transparent transition-all shadow-sm">
                    <Textarea
                      className="min-h-[80px] w-full resize-none border-0 bg-transparent p-3 text-sm focus-visible:ring-0 shadow-none placeholder:text-slate-400"
                      value={replyDrafts[ticket._id] || ''}
                      onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [ticket._id]: e.target.value }))}
                      placeholder="Write a reply..."
                    />
                    
                    {replyAttachments.length > 0 && (
                      <div className="px-3 pb-2 flex flex-wrap gap-2">
                        {replyAttachments.map((file, index) => (
                          <div key={index} className="flex items-center gap-2 rounded-md bg-slate-100 px-2 py-1 text-xs border border-slate-200">
                            <FileText className="h-3 w-3 text-slate-500" />
                            <span className="max-w-[120px] truncate text-slate-700">{file.name}</span>
                            <button
                              type="button"
                              className="text-slate-400 hover:text-red-500 ml-1 rounded-full p-0.5 hover:bg-slate-200 transition-colors"
                              onClick={() => removeReplyAttachment(index)}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-3 py-2">
                      <label className="group inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900">
                        <Paperclip className="h-4 w-4" />
                        <span className="hidden sm:inline">Attach</span>
                        <input
                          type="file"
                          className="hidden"
                          multiple
                          onChange={(e) => setReplyAttachments(prev => [...prev, ...Array.from(e.target.files || [])])}
                        />
                      </label>
                      <Button 
                        size="sm" 
                        onClick={() => handleReply(ticket._id)} 
                        disabled={replying}
                        className={cn(
                          "h-8 gap-1.5 px-3",
                          role === 'parent' ? "bg-blue-600 hover:bg-blue-700" : "bg-violet-600 hover:bg-violet-700"
                        )}
                      >
                        {replying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        <span>Send</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ErpSection>
  );
}