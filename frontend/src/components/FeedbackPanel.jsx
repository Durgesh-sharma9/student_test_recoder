import { useEffect, useState } from 'react';
import { 
  MessageSquare, Send, Plus, CircleCheckBig, MessageCircleMore, 
  Upload, X, User, GraduationCap, FileText, Loader2, Inbox, Paperclip, CheckCircle2, ChevronDown, ChevronUp, Clock
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
  
  const [expandedTickets, setExpandedTickets] = useState({});
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Teacher-specific state
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);

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
      
      if (res.data.students && res.data.students.length === 1) {
        setSelectedChild(res.data.students[0]);
      }
    } catch (error) {
      toast.error('Failed to load children');
    }
  };

  const fetchTeachers = async (classId, child = selectedChild) => {
    try {
      const response = await api.get('/users?role=teacher');
      const allTeachers = response.data.users || [];
      
      if (allTeachers.length === 0) {
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
      
      const filteredTeachers = normalizedTeachers.filter((teacher) => {
        const effectiveAssignments = teacher.assignments || [];
        if (effectiveAssignments.length === 0) return false;
        
        return effectiveAssignments.some((assignment) => {
          const assignmentClassId = assignment.class?._id || assignment.class;
          return String(assignmentClassId) === String(classId);
        });
      });
      
      setTeachers(filteredTeachers);
    } catch (error) {
      console.error('Failed to load teachers:', error);
      setTeachers([]);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      setClasses(res.data.classes || []);
    } catch (error) {
      toast.error('Failed to load classes');
    }
  };

  const fetchStudentsByClass = async (classId) => {
    try {
      const res = await api.get(`/students?class=${classId}`);
      setStudents(res.data.students || []);
    } catch (error) {
      toast.error('Failed to load students');
    }
  };

  const fetchAllTeachers = async () => {
    try {
      const res = await api.get('/users?role=teacher');
      setTeachers(res.data.users || []);
    } catch (error) {
      toast.error('Failed to load teachers');
    }
  };

  useEffect(() => {
    fetchTickets();
    if (role === 'parent') {
      fetchChildren();
    } else if (role === 'teacher') {
      fetchClasses();
      fetchAllTeachers();
    }
  }, [role]);

  useEffect(() => {
    if (selectedChild && selectedChild.classId) {
      fetchTeachers(selectedChild.classId, selectedChild);
      setSelectedTeacher(null);
    }
  }, [selectedChild]);

  useEffect(() => {
    if (role === 'teacher' && selectedClass) {
      fetchStudentsByClass(selectedClass._id);
      setSelectedStudent(null);
    }
  }, [selectedClass]);

  const handleCreateTicket = async (event) => {
    event.preventDefault();

    if (role === 'parent') {
      if (!selectedChild) {
        toast.error('Please select a child');
        return;
      }
    } else if (role === 'teacher') {
      if (!selectedStudent) {
        toast.error('Please select a student');
        return;
      }
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
      
      if (role === 'parent') {
        formData.append('studentId', selectedChild._id);
        if (selectedTeacher) {
          formData.append('teacherId', selectedTeacher._id);
          formData.append('taggedSubject', selectedTeacher.subject);
        }
      } else if (role === 'teacher') {
        formData.append('studentId', selectedStudent._id);
      }
      
      attachments.forEach((file) => formData.append('attachments', file));

      const res = await api.post('/feedback', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setTitle('');
      setDescription('');
      setSelectedTeacher(null);
      setSelectedStudent(null);
      setSelectedClass(null);
      setAttachments([]);
      setIsFormOpen(false);
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
      setExpandedTickets(prev => ({ ...prev, [ticketId]: true }));
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

  const toggleTicket = (ticketId) => {
    setExpandedTickets(prev => ({
      ...prev,
      [ticketId]: !prev[ticketId]
    }));
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Resolved':
      case 'Closed':
        return 'bg-gradient-to-r from-emerald-50 to-teal-100 text-emerald-700 border-emerald-200 shadow-sm';
      case 'In Progress':
        return 'bg-gradient-to-r from-amber-50 to-orange-100 text-amber-700 border-amber-200 shadow-sm';
      case 'Open':
        return 'bg-gradient-to-r from-blue-50 to-cyan-100 text-blue-700 border-blue-200 shadow-sm';
      default:
        return 'bg-gradient-to-r from-slate-50 to-slate-100 text-slate-600 border-slate-200 shadow-sm';
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
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };
  
  const formatTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const primaryColor = role === 'parent' ? 'blue' : 'violet';
  const isParent = role === 'parent';
  
  const bgGradientBase = isParent 
    ? 'bg-gradient-to-br from-blue-50/90 via-white to-indigo-50/90' 
    : 'bg-gradient-to-br from-violet-50/90 via-white to-fuchsia-50/90';
    
  const buttonGradient = isParent
    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/20'
    : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow-violet-500/20';

  const chatBubbleGradient = isParent
    ? 'bg-gradient-to-br from-blue-600 to-indigo-600'
    : 'bg-gradient-to-br from-violet-600 to-fuchsia-600';

  const activeBorderColor = isParent ? 'border-blue-500' : 'border-violet-500';
  const hoverBorderColor = isParent ? 'hover:border-blue-400' : 'hover:border-violet-400';
  const textGradient = isParent 
    ? 'bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700' 
    : 'bg-clip-text text-transparent bg-gradient-to-r from-violet-700 to-fuchsia-700';

  return (
    <ErpSection title={role === 'parent' ? 'Support Tickets' : 'Inbox'} icon={MessageSquare} tone={primaryColor}>
      <div className={cn("rounded-xl border border-white/60 shadow-sm p-3 sm:p-4 transition-all duration-300", bgGradientBase)}>
        
        {/* Header Actions */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 shadow-sm border border-white/80 backdrop-blur-sm">
            <div className={cn("p-1 rounded-full", isParent ? "bg-blue-100 text-blue-600" : "bg-violet-100 text-violet-600")}>
              <Inbox className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-bold text-slate-700">Total: {tickets.length}</span>
          </div>
          
          {role === 'parent' && !isFormOpen && (
            <Button 
              onClick={() => setIsFormOpen(true)} 
              className={cn("h-8 text-[11px] text-white rounded-full shadow-md transition-all transform hover:-translate-y-0.5 px-4", buttonGradient)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> New Feedback
            </Button>
          )}
          
          {role === 'teacher' && !isFormOpen && (
            <Button 
              onClick={() => setIsFormOpen(true)} 
              className={cn("h-8 text-[11px] text-white rounded-full shadow-md transition-all transform hover:-translate-y-0.5 px-4", buttonGradient)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Create Feedback
            </Button>
          )}
        </div>

        {/* Compact & Detailed Create Form */}
        {role === 'parent' && isFormOpen && (
          <form onSubmit={handleCreateTicket} className="mb-5 rounded-xl border border-white/80 bg-white/85 backdrop-blur-md shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-4">
            <div className={cn("flex items-center justify-between border-b px-4 py-2", isParent ? "bg-blue-50/50 border-blue-100" : "bg-violet-50/50 border-violet-100")}>
              <h3 className="text-[13px] font-bold flex items-center gap-2">
                <div className={cn("p-1 rounded-md", isParent ? "bg-blue-600" : "bg-violet-600")}>
                  <Plus className="h-3 w-3 text-white" />
                </div>
                <span className={textGradient}>Create Support Ticket</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setIsFormOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-200/80 hover:text-slate-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Child Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">Student Profile <span className="text-red-500">*</span></label>
                  {children.length === 0 ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-2 text-center text-xs text-slate-500">
                      No linked students found.
                    </div>
                  ) : children.length === 1 ? (
                    <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white/70 p-2 shadow-sm">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 shadow-inner">
                        <User className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{children[0].name}</p>
                        <p className="text-[10px] font-medium text-slate-500 truncate">Class: {children[0].className} {children[0].section}</p>
                      </div>
                    </div>
                  ) : (
                    <Select value={selectedChild?._id || ''} onValueChange={(value) => {
                      const child = children.find(c => c._id === value);
                      setSelectedChild(child);
                    }}>
                      <SelectTrigger className="w-full h-8 rounded-lg border-slate-200 bg-white/70 text-xs shadow-sm hover:border-blue-300 focus:ring-blue-500/20">
                        <SelectValue placeholder="Select Student" />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg border-slate-200 shadow-lg">
                        {children.map(child => (
                          <SelectItem key={child._id} value={child._id} className="text-xs cursor-pointer rounded-md hover:bg-blue-50">
                            <span className="font-bold text-slate-800">{child.name}</span> <span className="text-slate-400">| {child.className} {child.section}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Subject Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">Subject <span className="text-red-500">*</span></label>
                  <Input 
                    placeholder="Short summary of your query..." 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    className="h-8 rounded-lg border-slate-200 bg-white/70 text-xs shadow-sm hover:border-blue-300 focus-visible:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Teacher Selection (Pills) */}
              {selectedChild && (
                <div className="space-y-2 rounded-lg bg-white/50 p-3 border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Direct Query To <span className="text-[9px] text-slate-400 normal-case tracking-normal">(Optional)</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTeacher(null)}
                      className={cn(
                        "flex items-center gap-1 rounded-md border px-3 py-1.5 text-[11px] font-semibold transition-all duration-200 shadow-sm",
                        !selectedTeacher 
                          ? "border-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700" 
                          : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50/50"
                      )}
                    >
                      Management / Admin
                    </button>
                    {teachers.map(teacher => {
                      const assignments = teacher.assignments || [];
                      const isSelected = selectedTeacher?._id === teacher._id;
                      return (
                        <button
                          type="button"
                          key={teacher._id}
                          onClick={() => setSelectedTeacher({ _id: teacher._id, subject: assignments[0]?.subject, name: teacher.teacherName || teacher.name })}
                          className={cn(
                            "flex items-center gap-1 rounded-md border px-3 py-1.5 text-[11px] font-semibold transition-all duration-200 shadow-sm max-w-full truncate",
                            isSelected 
                              ? "border-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700" 
                              : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50/50"
                          )}
                        >
                          <span className="truncate">{teacher.teacherName || teacher.name}</span>
                          <span className={cn("text-[9px] shrink-0", isSelected ? "text-blue-500" : "text-slate-400")}>
                            ({assignments.map(a => a.subject).join(', ') || 'Staff'})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">Detailed Description <span className="text-red-500">*</span></label>
                <Textarea 
                  rows={3} 
                  placeholder="Elaborate your concern or feedback here..." 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  className="resize-none rounded-lg border-slate-200 bg-white/70 text-xs shadow-sm p-3 hover:border-blue-300 focus-visible:ring-blue-500/20"
                />
              </div>

              {/* Compact Attachments Area */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Attachments</label>
                <div
                  className={cn(
                    'flex flex-col sm:flex-row items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 transition-all duration-200 text-[11px]',
                    dragActive 
                      ? 'border-blue-500 bg-blue-50/80' 
                      : 'border-slate-300 bg-white/60 hover:bg-blue-50/40 hover:border-blue-400'
                  )}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <div className={cn("p-2 rounded-full shrink-0", dragActive ? "bg-blue-100" : "bg-slate-100")}>
                    <Upload className={cn("h-4 w-4", dragActive ? "text-blue-600" : "text-slate-400")} />
                  </div>
                  <div className="text-slate-600 text-center sm:text-left flex-1">
                    <span className="font-semibold">Drag files</span> or{' '}
                    <label className="cursor-pointer font-bold text-blue-600 hover:text-blue-700 hover:underline">
                      browse computer
                      <input type="file" className="sr-only" multiple onChange={(e) => setAttachments(prev => [...prev, ...Array.from(e.target.files || [])])} />
                    </label>
                    <div className="text-[9px] font-medium text-slate-400 mt-0.5">Max file size: 2MB</div>
                  </div>
                </div>
                
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] shadow-sm group hover:border-blue-200">
                        <FileText className="h-3 w-3 text-blue-500 shrink-0" />
                        <span className="truncate max-w-[100px] font-semibold text-slate-700">{file.name}</span>
                        <button type="button" onClick={() => removeAttachment(index)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-0.5 rounded transition-colors ml-1 shrink-0">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100/80 bg-slate-50/90 px-4 py-2.5">
              <Button type="button" variant="ghost" className="h-8 px-3 text-[11px] font-bold rounded-md hover:bg-slate-200/80 text-slate-600" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating} className={cn("h-8 px-5 text-[11px] font-bold rounded-md text-white shadow-md transition-all", buttonGradient)}>
                {creating ? <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> Processing</> : 'Submit Ticket'}
              </Button>
            </div>
          </form>
        )}

        {/* Teacher Create Form */}
        {role === 'teacher' && isFormOpen && (
          <form onSubmit={handleCreateTicket} className="mb-5 rounded-xl border border-white/80 bg-white/85 backdrop-blur-md shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-4">
            <div className={cn("flex items-center justify-between border-b px-4 py-2", isParent ? "bg-blue-50/50 border-blue-100" : "bg-violet-50/50 border-violet-100")}>
              <h3 className="text-[13px] font-bold flex items-center gap-2">
                <div className={cn("p-1 rounded-md", isParent ? "bg-blue-600" : "bg-violet-600")}>
                  <Plus className="h-3 w-3 text-white" />
                </div>
                <span className={textGradient}>Create Feedback</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setIsFormOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-200/80 hover:text-slate-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Class Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">Class <span className="text-red-500">*</span></label>
                <Select value={selectedClass?._id || ''} onValueChange={(val) => setSelectedClass(classes.find(c => c._id === val))}>
                  <SelectTrigger className="h-8 rounded-lg border-slate-200 bg-white/70 text-xs shadow-sm hover:border-violet-300 focus:ring-violet-500/20">
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg border-slate-200 shadow-lg">
                    {classes.map(cls => (
                      <SelectItem key={cls._id} value={cls._id} className="text-xs cursor-pointer rounded-md hover:bg-violet-50">
                        {cls.className} - {cls.section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Student Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">Student <span className="text-red-500">*</span></label>
                <Select value={selectedStudent?._id || ''} onValueChange={(val) => setSelectedStudent(students.find(s => s._id === val))} disabled={!selectedClass}>
                  <SelectTrigger className="h-8 rounded-lg border-slate-200 bg-white/70 text-xs shadow-sm hover:border-violet-300 focus:ring-violet-500/20">
                    <SelectValue placeholder={selectedClass ? "Select Student" : "Select Class First"} />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg border-slate-200 shadow-lg">
                    {students.map(student => (
                      <SelectItem key={student._id} value={student._id} className="text-xs cursor-pointer rounded-md hover:bg-violet-50">
                        {student.name} (Roll: {student.rollNo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Parent Auto (after student is selected) */}
              {selectedStudent && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Parent</label>
                  <div className="h-8 rounded-lg border border-slate-200 bg-slate-50 flex items-center px-3 text-xs font-bold text-slate-700">
                    {selectedStudent.parent?.parentName || 'N/A'}
                    {selectedStudent.parent?.phone && <span className="ml-2 text-slate-500 font-normal">({selectedStudent.parent.phone})</span>}
                  </div>
                </div>
              )}

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">Subject <span className="text-red-500">*</span></label>
                <Input
                  type="text"
                  placeholder="Brief subject line"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-8 rounded-lg border-slate-200 bg-white/70 text-xs shadow-sm p-2.5 hover:border-violet-300 focus-visible:ring-violet-500/20"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">Message <span className="text-red-500">*</span></label>
                <Textarea
                  rows={3} 
                  placeholder="Elaborate your feedback here..." 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  className="resize-none rounded-lg border-slate-200 bg-white/70 text-xs shadow-sm p-3 hover:border-violet-300 focus-visible:ring-violet-500/20"
                />
              </div>

              {/* Attachments */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Attachments</label>
                <div
                  className={cn(
                    'flex flex-col sm:flex-row items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 transition-all duration-200 text-[11px]',
                    dragActive 
                      ? 'border-violet-500 bg-violet-50/80' 
                      : 'border-slate-300 bg-white/60 hover:bg-violet-50/40 hover:border-violet-400'
                  )}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <div className={cn("p-2 rounded-full shrink-0", dragActive ? "bg-violet-100" : "bg-slate-100")}>
                    <Upload className={cn("h-4 w-4", dragActive ? "text-violet-600" : "text-slate-400")} />
                  </div>
                  <div className="text-slate-600 text-center sm:text-left flex-1">
                    <span className="font-semibold">Drag files</span> or{' '}
                    <label className="cursor-pointer font-bold text-violet-600 hover:text-violet-700 hover:underline">
                      browse computer
                      <input type="file" className="sr-only" multiple onChange={(e) => setAttachments(prev => [...prev, ...Array.from(e.target.files || [])])} />
                    </label>
                    <div className="text-[9px] font-medium text-slate-400 mt-0.5">Max file size: 2MB</div>
                  </div>
                </div>
                
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] shadow-sm group hover:border-violet-200">
                        <FileText className="h-3 w-3 text-violet-500 shrink-0" />
                        <span className="truncate max-w-[100px] font-semibold text-slate-700">{file.name}</span>
                        <button type="button" onClick={() => removeAttachment(index)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-0.5 rounded transition-colors ml-1 shrink-0">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100/80 bg-slate-50/90 px-4 py-2.5">
              <Button type="button" variant="ghost" className="h-8 px-3 text-[11px] font-bold rounded-md hover:bg-slate-200/80 text-slate-600" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating} className={cn("h-8 px-5 text-[11px] font-bold rounded-md text-white shadow-md transition-all", buttonGradient)}>
                {creating ? <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> Processing</> : 'Send Feedback'}
              </Button>
            </div>
          </form>
        )}

        {/* Ticket List Area */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 animate-pulse rounded-xl border border-white bg-white/70 shadow-sm"></div>
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200/60 bg-white/50 py-12 px-4 text-center backdrop-blur-sm shadow-sm">
            <div className={cn("flex h-12 w-12 items-center justify-center rounded-full mb-3 shadow-inner", isParent ? "bg-gradient-to-br from-blue-100 to-indigo-50" : "bg-gradient-to-br from-violet-100 to-fuchsia-50")}>
              <CheckCircle2 className={cn("h-6 w-6", isParent ? "text-blue-500" : "text-violet-500")} />
            </div>
            <p className="text-sm font-bold text-slate-800 mb-0.5">Inbox is Empty</p>
            <p className="text-xs font-medium text-slate-500">No active support tickets available right now.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {tickets.map((ticket, index) => {
              const isExpanded = expandedTickets[ticket._id] !== undefined ? expandedTickets[ticket._id] : index === 0;
              const hasMessages = ticket.messages && ticket.messages.length > 0;

              return (
                <div 
                  key={ticket._id} 
                  className={cn(
                    "flex flex-col rounded-xl border bg-white/95 backdrop-blur-sm transition-all duration-200 overflow-hidden",
                    isExpanded 
                      ? `border-l-[4px] ${activeBorderColor} shadow-lg bg-white` 
                      : `border-l-[4px] border-l-transparent border-white/90 shadow-sm ${hoverBorderColor} hover:shadow-md`
                  )}
                >
                  {/* Compact Accordion Header */}
                  <div 
                    onClick={() => toggleTicket(ticket._id)}
                    className="group flex flex-col sm:flex-row cursor-pointer sm:items-center justify-between p-3 hover:bg-slate-50/60 select-none transition-colors gap-2 sm:gap-4"
                  >
                    <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 uppercase tracking-widest border border-slate-200/80 shadow-sm">
                          <span className="text-slate-400">ID:</span> {ticket.ticketId}
                        </span>
                        <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider', getStatusBadge(ticket.status))}>
                          {ticket.status}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {formatDate(ticket.createdAt)}
                        </span>
                      </div>
                      <h4 className={cn(
                        "text-[13px] font-bold truncate transition-colors", 
                        isExpanded ? "text-slate-900" : "text-slate-700 group-hover:text-slate-900"
                      )}>
                        {ticket.title}
                      </h4>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {!isExpanded && hasMessages && (
                        <div className={cn("flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm", isParent ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-violet-50 text-violet-600 border border-violet-100")}>
                          <MessageCircleMore className="h-3 w-3" />
                          {ticket.messages.length} Replies
                        </div>
                      )}
                      {/* Arrows strictly removed as per logic/instruction, keeping header clickable */}
                    </div>
                  </div>

                  {/* Expanded Content with Grid Details */}
                  {isExpanded && (
                    <div className="flex flex-col border-t border-slate-100 bg-slate-50/40 animate-in slide-in-from-top-1 fade-in duration-200">
                      
                      <div className="p-3 space-y-3">
                        {/* Context Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 p-2.5 rounded-lg bg-white border border-slate-100 shadow-sm">
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Student</span>
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 truncate">
                              <User className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="truncate">{ticket.student?.name || 'N/A'}</span>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Parent</span>
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 truncate">
                              <User className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="truncate">{ticket.parentName || ticket.parent?.name || 'Linked Parent'}</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Assigned To</span>
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 truncate">
                              <GraduationCap className="h-3 w-3 text-blue-500 shrink-0" />
                              <span className="truncate">{ticket.taggedTeacherName ? `${ticket.taggedSubject} | ${ticket.taggedTeacherName}` : 'Admin / General'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Description Box */}
                        <div className="rounded-lg bg-slate-100/70 p-3 border border-slate-200/60 shadow-inner">
                          <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">{ticket.description}</p>
                        </div>
                        
                        {/* Admin Action (Compact) */}
                        {role !== 'parent' && (
                          <div className="flex items-center justify-end pt-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">Update Status:</span>
                              <Select value={ticket.status || ''} onValueChange={(value) => handleStatusChange(ticket._id, value)}>
                                <SelectTrigger className="h-7 w-[120px] text-[11px] font-bold bg-white border-slate-200 shadow-sm hover:border-violet-300 focus:ring-violet-500/20 rounded-md">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-md shadow-lg border-slate-200 min-w-[120px]">
                                  <SelectItem value="Open" className="text-[11px] font-bold cursor-pointer hover:bg-violet-50">Open</SelectItem>
                                  <SelectItem value="In Progress" className="text-[11px] font-bold cursor-pointer hover:bg-violet-50">In Progress</SelectItem>
                                  <SelectItem value="Resolved" className="text-[11px] font-bold cursor-pointer hover:bg-violet-50">Resolved</SelectItem>
                                  <SelectItem value="Closed" className="text-[11px] font-bold cursor-pointer hover:bg-violet-50">Closed</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Chat Thread */}
                      {hasMessages && (
                        <div className="px-3 pb-2">
                          <div className="p-3 space-y-3 bg-slate-100/50 rounded-xl border border-slate-200/70 shadow-inner max-h-[350px] overflow-y-auto custom-scrollbar">
                            {ticket.messages.map((message, index) => {
                              const isCurrentUser = (role === 'parent' && message.senderRole === 'parent') || (role !== 'parent' && message.senderRole !== 'parent');
                              const alignment = isCurrentUser ? "justify-end" : "justify-start";
                              
                              return (
                                <div key={`${ticket._id}-${index}`} className={cn("flex w-full", alignment)}>
                                  <div className={cn(
                                    "max-w-[90%] sm:max-w-[80%] rounded-xl p-2.5 shadow-sm", 
                                    isCurrentUser 
                                      ? `${chatBubbleGradient} text-white rounded-tr-none shadow-md` 
                                      : "bg-white text-slate-800 border border-slate-200 rounded-tl-none"
                                  )}>
                                    <div className="flex items-center gap-2 mb-1 border-b border-white/10 pb-1">
                                      <span className={cn("text-[11px] font-extrabold", isCurrentUser ? "text-white" : "text-slate-800")}>
                                        {message.senderName || 'User'}
                                      </span>
                                      <span className={cn("text-[9px] font-semibold ml-auto", isCurrentUser ? "text-white/70" : "text-slate-400")}>
                                        {formatTime(message.createdAt)}
                                      </span>
                                    </div>
                                    <p className="text-xs leading-relaxed whitespace-pre-wrap font-medium">
                                      {message.content || 'Attached file(s)'}
                                    </p>
                                    
                                    {message.attachments && message.attachments.length > 0 && (
                                      <div className="mt-2 flex flex-wrap gap-1.5">
                                        {message.attachments.map((att, idx) => (
                                          <a
                                            key={idx}
                                            href={att.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={cn(
                                              "flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-bold transition-all",
                                              isCurrentUser 
                                                ? "bg-black/15 border-transparent hover:bg-black/25 text-white" 
                                                : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600"
                                            )}
                                          >
                                            <FileText className="h-3 w-3 shrink-0" />
                                            <span className="truncate max-w-[120px]">{att.name}</span>
                                          </a>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Reply Input Area */}
                      <div className="p-3 bg-white border-t border-slate-100 mt-1">
                        <div className={cn(
                          "flex flex-col gap-1.5 rounded-xl border bg-white p-1.5 transition-all duration-200 shadow-sm",
                          isParent ? "border-slate-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/10" : "border-slate-200 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-500/10"
                        )}>
                          <Textarea
                            className="min-h-[40px] w-full resize-none border-0 bg-transparent p-2 text-xs focus-visible:ring-0 shadow-none placeholder:text-slate-400 font-medium"
                            value={replyDrafts[ticket._id] || ''}
                            onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [ticket._id]: e.target.value }))}
                            placeholder="Type your reply..."
                          />
                          
                          {replyAttachments.length > 0 && (
                            <div className="px-2 pb-1.5 flex flex-wrap gap-1.5">
                              {replyAttachments.map((file, index) => (
                                <div key={index} className="flex items-center gap-1 rounded bg-slate-50 px-2 py-1 text-[10px] font-bold border border-slate-200 shadow-sm">
                                  <div className={cn("p-0.5 rounded", isParent ? "bg-blue-100 text-blue-600" : "bg-violet-100 text-violet-600")}>
                                    <FileText className="h-2.5 w-2.5" />
                                  </div>
                                  <span className="max-w-[100px] truncate text-slate-700">{file.name}</span>
                                  <button type="button" className="text-slate-400 hover:text-red-500 p-0.5 rounded ml-0.5" onClick={() => removeReplyAttachment(index)}>
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-between border-t border-slate-100 pt-1.5 px-1">
                            <label className={cn(
                              "cursor-pointer flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold transition-colors",
                              isParent ? "text-slate-500 hover:bg-blue-50 hover:text-blue-600" : "text-slate-500 hover:bg-violet-50 hover:text-violet-600"
                            )}>
                              <Paperclip className="h-3.5 w-3.5" />
                              <span>Attach</span>
                              <input type="file" className="sr-only" multiple onChange={(e) => setReplyAttachments(prev => [...prev, ...Array.from(e.target.files || [])])} />
                            </label>
                            <Button 
                              size="sm" 
                              onClick={() => handleReply(ticket._id)} 
                              disabled={replying}
                              className={cn(
                                "h-7 px-4 text-[11px] font-bold rounded-md text-white shadow-sm transition-all", 
                                buttonGradient
                              )}
                            >
                              {replying ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                              Reply
                            </Button>
                          </div>
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ErpSection>
  );
}