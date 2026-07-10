import { useState, useEffect } from 'react';
import { 
  Bell, Check, BarChart3, Vote, Clock3, Users, ChevronDown, ChevronUp, 
  ChevronLeft, Search, Download, FileText, MessageSquare, Paperclip, 
  X, Send, User, GraduationCap, Upload, FileText as FileIcon, ArrowRight, 
  Inbox, MessageCircleMore, PieChart, ExternalLink, CheckCheck, Eye, 
  Image as ImageIcon, File, FileJson, Archive, Plus 
} from 'lucide-react';
import api from '@/lib/api';
import FeedbackPanel from '@/components/FeedbackPanel';
import AnnouncementModal from '@/components/AnnouncementModal';
import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1'];

export default function AdminNotifications() {
  const [activeTab, setActiveTab] = useState('notifications');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [feedback, setFeedback] = useState([]);
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [pollAnalytics, setPollAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [responseHistoryOpen, setResponseHistoryOpen] = useState(false);
  const [pendingResponsesOpen, setPendingResponsesOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Feedback conversation modal state
  const [conversationOpen, setConversationOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replyAttachments, setReplyAttachments] = useState([]);
  const [sendingReply, setSendingReply] = useState(false);
  
  // Attachment preview modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState(null);

  // Attachment dropdown state
  const [attachmentDropdownOpen, setAttachmentDropdownOpen] = useState(null);

  // Admin create feedback form state
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createAttachments, setCreateAttachments] = useState([]);
  const [recipientType, setRecipientType] = useState('parent');
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Feedback filter state
  const [feedbackFilter, setFeedbackFilter] = useState('all');

  // Announcement Modal state
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [announcementModalTab, setAnnouncementModalTab] = useState('announcement');

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      const items = res.data.notifications || [];
      console.log('[fetchNotifications] API response notifications:', items);
      console.log('[fetchNotifications] Number of notifications:', items.length);
      const userId = localStorage.getItem('userId');
      console.log('[fetchNotifications] Current user ID:', userId);
      
      items.forEach((n, idx) => {
        console.log(`[fetchNotifications] Notification ${idx}:`, {
          _id: n._id,
          title: n.title,
          readBy: n.readBy,
          readByIncludesUser: n.readBy?.includes(userId),
          isUnread: !n.readBy?.includes(userId)
        });
      });
      
      setNotifications(items);
      // derive unread count from the same source of truth
      const derivedUnread = items.filter((it) => !it.readBy?.includes(userId)).length;
      console.log('[fetchNotifications] Derived unread count:', derivedUnread);
      setUnreadCount(derivedUnread);
    } catch (error) {
      console.error('[fetchNotifications] Error:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.unreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      console.log('[markAsRead] Marking notification as read:', notificationId);
      const res = await api.put(`/notifications/${notificationId}/mark-read`);
      console.log('[markAsRead] API response:', res.data);
      // Refresh notifications from server to ensure persistence
      await fetchNotifications();
    } catch (error) {
      console.error('[markAsRead] Error:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      console.log('[markAllAsRead] Marking all notifications as read');
      const res = await api.put('/notifications/mark-all-read');
      console.log('[markAllAsRead] API response:', res.data);
      // Refresh notifications from server to ensure persistence
      await fetchNotifications();
    } catch (error) {
      console.error('[markAllAsRead] Error:', error);
      toast.error('Failed to mark all notifications as read');
    }
  };

  const isUnread = (notification) => {
    const userId = localStorage.getItem('userId');
    return !notification.readBy?.includes(userId);
  };

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const res = await api.get('/feedback');
      setFeedback(res.data.feedback || []);
    } catch (error) {
      toast.error('Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await api.get('/students');
      setStudents(res.data.students || []);
    } catch (error) {
      toast.error('Failed to load students');
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
      setStudentsLoading(true);
      const res = await api.get(`/students?class=${classId}`);
      setStudents(res.data.students || []);
    } catch (error) {
      toast.error('Failed to load students');
    } finally {
      setStudentsLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await api.get('/users?role=teacher');
      setTeachers(res.data.users || []);
    } catch (error) {
      toast.error('Failed to load teachers');
    }
  };

  useEffect(() => {
    if (isCreateFormOpen) {
      fetchClasses();
      fetchTeachers();
    }
  }, [isCreateFormOpen]);

  useEffect(() => {
    if (selectedClass && (recipientType === 'parent' || recipientType === 'both')) {
      fetchStudentsByClass(selectedClass._id);
      setSelectedStudent(null);
    } else {
      setStudents([]);
      setSelectedStudent(null);
    }
  }, [selectedClass, recipientType]);

  const fetchPolls = async () => {
    try {
      setLoading(true);
      const res = await api.get('/polls');
      setPolls(res.data.polls || []);
    } catch (error) {
      toast.error('Failed to load polls');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'notifications') {
      fetchNotifications();
    } else if (activeTab === 'feedback') {
      fetchFeedback();
    } else {
      fetchPolls();
    }
  }, [activeTab]);

  // Poll for unread count every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const openPollAnalytics = async (pollId) => {
    try {
      setAnalyticsLoading(true);
      setSelectedPoll(pollId);
      const res = await api.get(`/polls/${pollId}/analytics`);
      setPollAnalytics(res.data.analytics);
    } catch (error) {
      toast.error('Failed to load poll analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const closePollAnalytics = () => {
    setSelectedPoll(null);
    setPollAnalytics(null);
    setResponseHistoryOpen(false);
    setPendingResponsesOpen(false);
    setCurrentPage(1);
    setSearchQuery('');
  };

  const openConversation = async (feedbackId) => {
    try {
      setConversationLoading(true);
      setConversationOpen(true);
      setSelectedFeedback(null);
      
      const res = await api.get(`/feedback`);
      const allFeedback = res.data.feedback || [];
      const feedbackDetail = allFeedback.find(f => f._id === feedbackId);
      
      if (feedbackDetail) {
        setSelectedFeedback(feedbackDetail);
      } else {
        toast.error('Feedback not found');
        setConversationOpen(false);
      }
    } catch (error) {
      toast.error('Failed to load feedback conversation');
      setConversationOpen(false);
    } finally {
      setConversationLoading(false);
    }
  };

  const closeConversation = () => {
    setConversationOpen(false);
    setSelectedFeedback(null);
    setReplyContent('');
    setReplyAttachments([]);
  };

  const handleSendReply = async () => {
    if (!replyContent.trim() && replyAttachments.length === 0) {
      toast.error('Please enter a reply or attach a file');
      return;
    }

    try {
      setSendingReply(true);
      const formData = new FormData();
      formData.append('content', replyContent);
      replyAttachments.forEach((file) => formData.append('attachments', file));

      await api.post(`/feedback/${selectedFeedback._id}/reply`, formData, { 
        headers: { 'Content-Type': 'multipart/form-data' } 
      });
      
      setReplyContent('');
      setReplyAttachments([]);
      toast.success('Reply sent');
      
      await openConversation(selectedFeedback._id);
      fetchFeedback();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await api.put(`/feedback/${selectedFeedback._id}/status`, { status: newStatus });
      toast.success('Status updated');
      
      await openConversation(selectedFeedback._id);
      fetchFeedback();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleCreateFeedback = async (e) => {
    e.preventDefault();
    
    if (!createTitle || !createDescription) {
      toast.error('Title and description are required');
      return;
    }

    if ((recipientType === 'parent' || recipientType === 'both') && !selectedStudent) {
      toast.error('Please select a student');
      return;
    }

    if ((recipientType === 'teacher' || recipientType === 'both') && !selectedTeacher) {
      toast.error('Please select a teacher');
      return;
    }

    try {
      setCreating(true);
      const formData = new FormData();
      formData.append('title', createTitle);
      formData.append('description', createDescription);
      formData.append('recipientType', recipientType);
      
      if (selectedStudent) {
        formData.append('studentId', selectedStudent._id);
      }
      
      if (selectedTeacher) {
        formData.append('recipientTeacherId', selectedTeacher._id);
      }
      
      createAttachments.forEach((file) => formData.append('attachments', file));

      const res = await api.post('/feedback', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      
      setCreateTitle('');
      setCreateDescription('');
      setCreateAttachments([]);
      setSelectedClass(null);
      setSelectedStudent(null);
      setSelectedTeacher(null);
      setRecipientType('parent');
      setIsCreateFormOpen(false);
      
      toast.success(`Feedback created successfully. Ticket ID: ${res.data.feedback.ticketId}`);
      fetchFeedback();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create feedback');
    } finally {
      setCreating(false);
    }
  };

  const getFilteredFeedback = () => {
    if (feedbackFilter === 'all') return feedback;
    if (feedbackFilter === 'parent') return feedback.filter(f => f.createdByRole === 'parent');
    if (feedbackFilter === 'teacher') return feedback.filter(f => f.createdByRole === 'teacher');
    if (feedbackFilter === 'admin') return feedback.filter(f => f.createdByRole === 'school_admin');
    if (feedbackFilter === 'open') return feedback.filter(f => f.status === 'Open');
    if (feedbackFilter === 'resolved') return feedback.filter(f => f.status === 'Resolved');
    if (feedbackFilter === 'closed') return feedback.filter(f => f.status === 'Closed');
    return feedback;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  };

  const getFileIcon = (fileName) => {
    if (!fileName) return File;
    const ext = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return ImageIcon;
    if (['pdf'].includes(ext)) return FileText;
    if (['doc', 'docx'].includes(ext)) return File;
    if (['xls', 'xlsx', 'csv'].includes(ext)) return FileJson;
    if (['zip', 'rar', '7z'].includes(ext)) return Archive;
    return File;
  };

  const getFileType = (fileName) => {
    if (!fileName) return 'File';
    const ext = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'Image';
    if (['pdf'].includes(ext)) return 'PDF';
    if (['doc', 'docx'].includes(ext)) return 'Word';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'Excel';
    if (['zip', 'rar', '7z'].includes(ext)) return 'Archive';
    return ext.toUpperCase();
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isImage = (fileName) => {
    if (!fileName) return false;
    const ext = fileName.split('.').pop().toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
  };

  const openPreview = (attachment) => {
    setPreviewAttachment(attachment);
    setPreviewModalOpen(true);
  };

  const closePreview = () => {
    setPreviewModalOpen(false);
    setPreviewAttachment(null);
  };

  const getAudienceLabel = (audience, scope) => {
    if (audience === 'teachers') return 'All Teachers';
    if (audience === 'parents') {
      return scope === 'all' ? 'All Parents' : 'Selected Classes';
    }
    return 'N/A';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active':
      case 'Open':
        return 'bg-gradient-to-r from-emerald-50 to-teal-100 text-emerald-700 border-emerald-200';
      case 'Closed':
      case 'Resolved':
        return 'bg-gradient-to-r from-slate-50 to-slate-100 text-slate-600 border-slate-200';
      case 'Expired':
        return 'bg-gradient-to-r from-red-50 to-rose-100 text-red-700 border-red-200';
      case 'Draft':
      case 'In Progress':
        return 'bg-gradient-to-r from-amber-50 to-orange-100 text-amber-700 border-amber-200';
      default:
        return 'bg-gradient-to-r from-slate-50 to-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getPriorityBadge = (priority = 'INFO') => {
    const p = priority.toUpperCase();
    if (p === 'URGENT') return 'bg-gradient-to-r from-rose-50 to-red-100 text-rose-700 border-rose-200';
    if (p === 'IMPORTANT') return 'bg-gradient-to-r from-orange-50 to-amber-100 text-orange-700 border-orange-200';
    return 'bg-gradient-to-r from-blue-50 to-indigo-100 text-blue-700 border-blue-200';
  };

  const getAudienceLabelLower = (audience, audienceScope) => {
    if (audience === 'teachers') return 'teachers';
    if (audience === 'students') return 'students';
    return 'parents';
  };

  const exportResponseHistory = () => {
    if (!pollAnalytics?.responses) return;
    
    const audience = pollAnalytics.poll.audience;
    let headers;
    
    if (audience === 'teachers') {
      headers = ['Teacher Name', 'Vote Choice', 'Submitted Date', 'Submitted Time'];
    } else if (audience === 'students') {
      headers = ['Student Name', 'Roll No', 'Class', 'Selected Option', 'Submitted Date', 'Submitted Time'];
    } else {
      headers = ['Parent Name', 'Student Name', 'Class', 'Selected Option', 'Submitted Date', 'Submitted Time'];
    }
    
    const csvContent = [
      headers.join(','),
      ...pollAnalytics.responses.map(r => {
        if (audience === 'teachers') {
          return [
            `"${r.name}"`,
            `"${r.selectedOption}"`,
            formatDate(r.submittedAt),
            new Date(r.submittedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
          ].join(',');
        } else if (audience === 'students') {
          return [
            `"${r.name}"`,
            `"${r.rollNo || 'N/A'}"`,
            `"${r.className || 'N/A'}"`,
            `"${r.selectedOption}"`,
            formatDate(r.submittedAt),
            new Date(r.submittedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
          ].join(',');
        } else {
          return [
            `"${r.name}"`,
            `"${r.studentName || 'N/A'}"`,
            `"${r.className || 'N/A'}"`,
            `"${r.selectedOption}"`,
            formatDate(r.submittedAt),
            new Date(r.submittedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
          ].join(',');
        }
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `poll_responses_${pollAnalytics.poll.title.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Response history exported successfully');
  };

  const handleNotificationClick = async (n) => {
    // Mark as read when notification is clicked
    if (isUnread(n)) {
      await markAsRead(n._id);
    }
    
    // Redirect logic for Feedback
    const isFeedback = n.type === 'feedback' || (n.title && n.title.toLowerCase().includes('feedback'));
    const refId = n.referenceId || n.feedbackId || n.ticketId; // Adjust based on your API schema
    
    if (isFeedback && refId) {
      toast.info('Redirecting to chat thread...');
      setActiveTab('feedback');
      await openConversation(refId);
    }
  };

  const filteredResponses = pollAnalytics?.responses?.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.studentName && r.studentName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (r.className && r.className.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  const totalPages = Math.ceil(filteredResponses.length / itemsPerPage);
  const paginatedResponses = filteredResponses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const buttonGradient = "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-indigo-500/25 text-white";

  return (
    <PageStack>
      <PageHeader title="School Communications" description="Manage notifications, feedback, and interactive polls comprehensively." />

      {/* Classy Pill Tabs */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 p-1.5 bg-slate-100/80 backdrop-blur-md border border-slate-200/60 rounded-full shadow-inner overflow-x-auto max-w-full custom-scrollbar">
          {[
            { id: 'notifications', label: 'Alerts & Notices', icon: Bell },
            { id: 'feedback', label: 'Feedback Center', icon: MessageSquare },
            { id: 'polls', label: 'Poll Analytics', icon: BarChart3 }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-[13px] font-bold rounded-full transition-all duration-300 whitespace-nowrap',
                  isActive 
                    ? 'bg-gradient-to-r from-white to-slate-50 text-indigo-700 shadow-sm border border-slate-200/60' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 border border-transparent'
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-indigo-600" : "text-slate-400")} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notifications Tab (Redesigned matching image_d87dae.png) */}
      {activeTab === 'notifications' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 rounded-2xl border border-slate-200/80 shadow-md bg-white overflow-hidden">
          {/* Header Bar matching image */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50/30 p-4 border-b border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800">
              <Bell className="h-5 w-5" />
              <h3 className="font-bold text-[15px]">Received Notifications</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => {
                setAnnouncementModalTab('announcement');
                setIsAnnouncementModalOpen(true);
              }} className={cn("h-8 text-[11px] font-bold rounded-lg px-4", buttonGradient)}>
                <Bell className="mr-1 h-3 w-3" /> Create Announcement
              </Button>
              <Button size="sm" variant="outline" onClick={() => {
                setAnnouncementModalTab('poll');
                setIsAnnouncementModalOpen(true);
              }} className="h-8 text-[11px] font-bold rounded-lg px-4 border-slate-200 bg-white hover:bg-slate-50">
                <BarChart3 className="mr-1 h-3 w-3 text-indigo-600" /> Create Poll
              </Button>
              <Button size="sm" variant="outline" onClick={() => {
                setActiveTab('feedback');
                setIsCreateFormOpen(true);
              }} className="h-8 text-[11px] font-bold rounded-lg px-4 border-slate-200 bg-white hover:bg-slate-50">
                <MessageSquare className="mr-1 h-3 w-3 text-indigo-600" /> Create Feedback
              </Button>
            </div>
          </div>
          
          <div className="p-4 bg-white flex items-center justify-between text-[12px] font-bold text-slate-600 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <span>Total: <span className="text-slate-900">{notifications.length}</span></span>
              <span>Unread: <span className="text-rose-600">{unreadCount}</span></span>
            </div>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs font-medium text-indigo-600 hover:text-indigo-700" onClick={markAllAsRead}>
                <CheckCheck className="mr-1 h-3 w-3" /> Mark all read
              </Button>
            )}
          </div>

          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-12 animate-pulse bg-slate-100 rounded-lg"></div>)}
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-16 bg-gradient-to-b from-slate-50/50 to-white">
              <Bell className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-[14px] font-bold text-slate-500">No active notifications</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left text-[12px] table-fixed border-separate border-spacing-y-3">
                  <colgroup>
                    <col style={{ width: 'auto' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '34%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '12%' }} />
                  </colgroup>
                  <thead className="bg-transparent">
                    <tr className="text-rose-900/80 font-black tracking-wider text-[10px] uppercase">
                      <th className="px-4 py-3.5">Priority</th>
                      <th className="px-4 py-3.5">Title</th>
                      <th className="px-4 py-3.5">Message</th>
                      <th className="px-4 py-3.5">From</th>
                      <th className="px-4 py-3.5">Date</th>
                      <th className="px-4 py-3.5 text-center">Files</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-0">
                    {notifications.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((n) => {
                      const isFeedback = n.type === 'feedback' || (n.title && n.title.toLowerCase().includes('feedback'));
                      const hasRedirect = isFeedback && (n.referenceId || n.feedbackId || n.ticketId);
                      const unread = isUnread(n);

                      return (
                        <tr 
                          key={n._id} 
                          onClick={() => hasRedirect && handleNotificationClick(n)}
                          className={cn(
                            "transition-all duration-200 group relative",
                            unread ? "bg-gradient-to-r from-blue-50 via-white to-purple-50" : "bg-gradient-to-r from-gray-50 via-white to-gray-50",
                            "hover:shadow-lg hover:-translate-y-0.5 hover:bg-gradient-to-r hover:from-blue-100/50 hover:via-white hover:to-purple-100/50",
                            hasRedirect && "cursor-pointer"
                          )}
                        >
                          <td className={cn(
                            "px-4 py-3 rounded-l-xl border border-slate-200/60",
                            unread && "border-l-4 border-l-blue-500"
                          )}>
                            <div className="flex items-center gap-2">
                              <span className={cn('border px-2.5 py-1 text-[9px] font-black uppercase rounded-full tracking-wider', getPriorityBadge(n.priority))}>
                                {n.priority || 'INFO'}
                              </span>
                            </div>
                          </td>
                          <td className={cn("px-4 py-3 border-t border-b border-slate-200/60")}>
                            <div className="flex items-start gap-2 min-w-0">
                              {unread && (
                                <span className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" aria-hidden />
                              )}
                              <div className="min-w-0 flex-1">
                                <div className={cn("line-clamp-2 break-words overflow-wrap-anywhere leading-snug", unread ? "font-bold text-slate-900" : "font-medium text-slate-900")} title={n.title}>
                                  {n.title}
                                </div>
                              </div>
                              {hasRedirect && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleNotificationClick(n);
                                  }}
                                  className="h-7 px-3 text-xs font-medium rounded-full border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 transition-all flex items-center gap-1.5 flex-shrink-0"
                                >
                                  <Eye className="h-3 w-3" />
                                  View
                                </Button>
                              )}
                            </div>
                          </td>
                          <td className={cn("px-4 py-3 border-t border-b border-slate-200/60", unread ? "font-semibold text-slate-800" : "font-medium text-slate-600")}>
                            <div className="line-clamp-2" title={n.message}>{n.message}</div>
                          </td>
                          <td className={cn("px-4 py-3 border-t border-b border-slate-200/60 font-semibold text-slate-700 capitalize whitespace-nowrap")}>
                            {n.senderName || n.from || 'System Admin'}
                          </td>
                          <td className={cn("px-4 py-3 border-t border-b border-slate-200/60 font-medium text-slate-500 whitespace-nowrap")}>
                            {formatDate(n.createdAt)}
                          </td>
                          <td className={cn("px-4 py-3 rounded-r-xl border border-slate-200/60")}>
                            {n.attachments && n.attachments.length > 0 ? (
                              <div className="relative">
                                <div className="flex items-center justify-center gap-2">
                                  <Paperclip className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" />
                                  <span className="text-[11px] font-bold text-indigo-700 whitespace-nowrap">{n.attachments.length} {n.attachments.length === 1 ? 'Attachment' : 'Attachments'}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs font-medium text-indigo-600 hover:text-indigo-700 px-2 flex-shrink-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (n.attachments.length === 1) {
                                        const attachment = n.attachments[0];
                                        const url = attachment.url?.startsWith('http') 
                                          ? attachment.url 
                                          : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${attachment.url}`;
                                        window.open(url, '_blank');
                                      } else {
                                        setAttachmentDropdownOpen(attachmentDropdownOpen === n._id ? null : n._id);
                                      }
                                    }}
                                  >
                                    View
                                  </Button>
                                </div>
                                {attachmentDropdownOpen === n._id && n.attachments.length > 1 && (
                                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
                                    <div className="p-3">
                                      <div className="text-xs font-semibold text-slate-700 mb-2">Attachments ({n.attachments.length})</div>
                                      <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {n.attachments.map((attachment, idx) => {
                                          const url = attachment.url?.startsWith('http') 
                                            ? attachment.url 
                                            : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${attachment.url}`;
                                          return (
                                            <div key={idx} className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded hover:bg-slate-100">
                                              <div className="flex-1 min-w-0">
                                                <div className="text-xs font-medium text-slate-700 truncate">{attachment.name || attachment.fileName || 'Attachment'}</div>
                                              </div>
                                              <div className="flex gap-1">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-6 w-6 p-0 text-indigo-600 hover:text-indigo-700"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(url, '_blank');
                                                  }}
                                                  title="View"
                                                >
                                                  <Eye className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-6 w-6 p-0 text-indigo-600 hover:text-indigo-700"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    const link = document.createElement('a');
                                                    link.href = url;
                                                    link.download = attachment.name || attachment.fileName || 'attachment';
                                                    link.click();
                                                  }}
                                                  title="Download"
                                                >
                                                  <Download className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-center text-slate-400 text-xs whitespace-nowrap">No Attachment</div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet Card View */}
              <div className="lg:hidden space-y-3">
                {notifications.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((n) => {
                  const isFeedback = n.type === 'feedback' || (n.title && n.title.toLowerCase().includes('feedback'));
                  const hasRedirect = isFeedback && (n.referenceId || n.feedbackId || n.ticketId);
                  const unread = isUnread(n);

                  return (
                    <div 
                      key={n._id} 
                      onClick={() => hasRedirect && handleNotificationClick(n)}
                      className={cn(
                        "border border-slate-200 rounded-xl p-4 transition-colors",
                        unread ? "bg-[#F8FBFF] border-l-4 border-l-blue-500" : "bg-white hover:bg-slate-50",
                        hasRedirect && "cursor-pointer"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn('border px-2.5 py-1 text-[9px] font-black uppercase rounded-full tracking-wider', getPriorityBadge(n.priority))}>
                            {n.priority || 'INFO'}
                          </span>
                        </div>
                        <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">{formatDate(n.createdAt)}</span>
                      </div>
                      
                      <div className="flex items-start gap-2 mb-1">
                        {unread && (
                          <span className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" aria-hidden />
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className={cn("font-bold text-[13px] text-slate-900 line-clamp-2 break-words overflow-wrap-anywhere leading-snug", unread ? "" : "font-medium")} title={n.title}>{n.title}</h4>
                        </div>
                        {hasRedirect && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNotificationClick(n);
                            }}
                            className="h-7 px-3 text-xs font-medium rounded-full border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 transition-all flex items-center gap-1.5 flex-shrink-0"
                          >
                            <Eye className="h-3 w-3" />
                            View
                          </Button>
                        )}
                      </div>
                      <p className={cn("text-[12px] mb-3 line-clamp-2", unread ? "font-semibold text-slate-800" : "font-medium text-slate-600")}>{n.message}</p>
                      
                      <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 mb-3">
                        <span>From:</span>
                        <span className="capitalize">{n.senderName || n.from || 'System Admin'}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {n.attachments && n.attachments.length > 0 ? (
                          <div className="relative flex-1">
                            <div className="flex items-center gap-2">
                              <Paperclip className="h-3.5 w-3.5 text-indigo-500" />
                              <span className="text-[11px] font-bold text-indigo-700">{n.attachments.length} {n.attachments.length === 1 ? 'Attachment' : 'Attachments'}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs font-medium text-indigo-600 hover:text-indigo-700 px-3"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (n.attachments.length === 1) {
                                    const attachment = n.attachments[0];
                                    const url = attachment.url?.startsWith('http') 
                                      ? attachment.url 
                                      : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${attachment.url}`;
                                    window.open(url, '_blank');
                                  } else {
                                    setAttachmentDropdownOpen(attachmentDropdownOpen === n._id ? null : n._id);
                                  }
                                }}
                              >
                                View
                              </Button>
                            </div>
                            {attachmentDropdownOpen === n._id && n.attachments.length > 1 && (
                              <div className="absolute left-0 top-full mt-2 w-full bg-white rounded-lg shadow-lg border border-slate-200 z-50">
                                <div className="p-3">
                                  <div className="text-xs font-semibold text-slate-700 mb-2">Attachments ({n.attachments.length})</div>
                                  <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {n.attachments.map((attachment, idx) => {
                                      const url = attachment.url?.startsWith('http') 
                                        ? attachment.url 
                                        : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${attachment.url}`;
                                      return (
                                        <div key={idx} className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded hover:bg-slate-100">
                                          <div className="flex-1 min-w-0">
                                            <div className="text-xs font-medium text-slate-700 truncate">{attachment.name || attachment.fileName || 'Attachment'}</div>
                                          </div>
                                          <div className="flex gap-1">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0 text-indigo-600 hover:text-indigo-700"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(url, '_blank');
                                              }}
                                              title="View"
                                            >
                                              <Eye className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0 text-indigo-600 hover:text-indigo-700"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const link = document.createElement('a');
                                                link.href = url;
                                                link.download = attachment.name || attachment.fileName || 'attachment';
                                                link.click();
                                              }}
                                              title="Download"
                                            >
                                              <Download className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-slate-400 text-xs">No Attachment</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Feedback Tab (Compact & Detailed with Gradients) */}
      {activeTab === 'feedback' && (
        <ErpSection title="Feedback Center" icon={MessageSquare} tone="indigo" className="bg-gradient-to-b from-[#f9fbff] to-[#f5f9ff]">
          {/* Header with Filters and Create Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Select value={feedbackFilter} onValueChange={setFeedbackFilter}>
                <SelectTrigger className="h-8 w-[140px] text-[11px] font-bold border-slate-200 bg-white shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg shadow-lg text-[11px] font-bold">
                  <SelectItem value="all">All Tickets</SelectItem>
                  <SelectItem value="parent">Parent Tickets</SelectItem>
                  <SelectItem value="teacher">Teacher Tickets</SelectItem>
                  <SelectItem value="admin">Admin Tickets</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-[11px] font-bold text-slate-500">{getFilteredFeedback().length} tickets</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setIsCreateFormOpen(true)} className={cn("h-8 text-[11px] font-bold rounded-lg px-4", buttonGradient)}>
                <Plus className="mr-1 h-3 w-3" /> Create Feedback
              </Button>
              <Button size="sm" variant="outline" onClick={() => {
                setAnnouncementModalTab('poll');
                setIsAnnouncementModalOpen(true);
              }} className="h-8 text-[11px] font-bold rounded-lg px-4 border-slate-200 bg-white hover:bg-slate-50">
                <BarChart3 className="mr-1 h-3 w-3 text-indigo-600" /> Create Poll
              </Button>
            </div>
          </div>

          {/* Create Feedback Form */}
          {isCreateFormOpen && (
            <form onSubmit={handleCreateFeedback} className="mb-4 rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-white p-4 shadow-md animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[13px] font-bold text-indigo-900">Create New Feedback</h4>
                <button type="button" onClick={() => setIsCreateFormOpen(false)} className="p-1 text-slate-400 hover:text-rose-500 rounded-md hover:bg-rose-50 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-3">
                {/* Recipient Type */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Recipient</label>
                  <Select value={recipientType} onValueChange={(val) => {
                    setRecipientType(val);
                    setSelectedClass(null);
                    setSelectedStudent(null);
                  }}>
                    <SelectTrigger className="h-8 text-[11px] font-bold border-slate-200 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg shadow-lg text-[11px] font-bold">
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="both">Parent + Teacher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Teacher Selection (only when recipient = teacher) */}
                {recipientType === 'teacher' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Teacher <span className="text-red-500">*</span></label>
                    <Select value={selectedTeacher?._id || ''} onValueChange={(val) => setSelectedTeacher(teachers.find(t => t._id === val))}>
                      <SelectTrigger className="h-8 text-[11px] font-bold border-slate-200 bg-white">
                        <SelectValue placeholder="Select teacher" />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg shadow-lg text-[11px] font-bold max-h-[200px]">
                        {teachers.map(t => (
                          <SelectItem key={t._id} value={t._id}>
                            {t.teacherName || t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Class Selection (for parent or both) */}
                {(recipientType === 'parent' || recipientType === 'both') && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Class <span className="text-red-500">*</span></label>
                    <Select value={selectedClass?._id || ''} onValueChange={(val) => setSelectedClass(classes.find(c => c._id === val))}>
                      <SelectTrigger className="h-8 text-[11px] font-bold border-slate-200 bg-white">
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg shadow-lg text-[11px] font-bold max-h-[200px]">
                        {classes.map(cls => (
                          <SelectItem key={cls._id} value={cls._id}>
                            {cls.className} - {cls.section}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Student Selection (for parent or both, after class is selected) */}
                {(recipientType === 'parent' || recipientType === 'both') && selectedClass && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Student <span className="text-red-500">*</span></label>
                    {studentsLoading ? (
                      <div className="h-8 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-[11px] font-bold text-slate-500">
                        Loading students...
                      </div>
                    ) : students.length === 0 ? (
                      <div className="h-8 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-[11px] font-bold text-slate-500">
                        No students available
                      </div>
                    ) : (
                      <Select value={selectedStudent?._id || ''} onValueChange={(val) => setSelectedStudent(students.find(s => s._id === val))}>
                        <SelectTrigger className="h-8 text-[11px] font-bold border-slate-200 bg-white">
                          <SelectValue placeholder="Select student" />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg shadow-lg text-[11px] font-bold max-h-[200px]">
                          {students.map(s => (
                            <SelectItem key={s._id} value={s._id}>
                              {s.name} (Roll: {s.rollNo})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                {/* Parent Auto (for parent or both, after student is selected) */}
                {(recipientType === 'parent' || recipientType === 'both') && selectedStudent && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Parent</label>
                    <div className="h-8 rounded-lg border border-slate-200 bg-slate-50 flex items-center px-3 text-[11px] font-bold text-slate-700">
                      {selectedStudent.parent?.parentName || 'N/A'}
                      {selectedStudent.parent?.phone && <span className="ml-2 text-slate-500 font-normal">({selectedStudent.parent.phone})</span>}
                    </div>
                  </div>
                )}

                {/* Teacher Selection (for both, after student is selected) */}
                {recipientType === 'both' && selectedStudent && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Teacher <span className="text-red-500">*</span></label>
                    <Select value={selectedTeacher?._id || ''} onValueChange={(val) => setSelectedTeacher(teachers.find(t => t._id === val))}>
                      <SelectTrigger className="h-8 text-[11px] font-bold border-slate-200 bg-white">
                        <SelectValue placeholder="Select teacher" />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg shadow-lg text-[11px] font-bold max-h-[200px]">
                        {teachers.map(t => (
                          <SelectItem key={t._id} value={t._id}>
                            {t.teacherName || t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Title */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Title <span className="text-red-500">*</span></label>
                  <Input
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    placeholder="Enter feedback title"
                    className="h-8 text-[11px] font-bold border-slate-200 bg-white"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Description <span className="text-red-500">*</span></label>
                  <Textarea
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    placeholder="Enter feedback description"
                    className="min-h-[60px] text-[11px] font-bold border-slate-200 bg-white resize-none"
                  />
                </div>

                {/* Attachments */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Attachments</label>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                      <Paperclip className="h-3.5 w-3.5" />
                      <span>Attach Files</span>
                      <input type="file" className="hidden" multiple onChange={(e) => setCreateAttachments(prev => [...prev, ...Array.from(e.target.files || [])])} />
                    </label>
                    {createAttachments.length > 0 && (
                      <span className="text-[10px] font-bold text-indigo-600">{createAttachments.length} file(s)</span>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateFormOpen(false)} className="h-8 text-[11px] font-bold rounded-lg">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating} className={cn("h-8 text-[11px] font-bold rounded-lg px-4", buttonGradient)}>
                    {creating ? 'Creating...' : 'Create Feedback'}
                  </Button>
                </div>
              </div>
            </form>
          )}

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-24 animate-pulse bg-slate-100 rounded-xl"></div>)}
            </div>
          ) : getFilteredFeedback().length === 0 ? (
            <div className="text-center py-10 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <Inbox className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-500">No feedback tickets found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {getFilteredFeedback().map((ticket) => {
                const isRead = ticket.status === 'Resolved' || ticket.status === 'Closed';
                const replyCount = ticket.messages?.length > 1 ? ticket.messages.length - 1 : 0;
                
                // Get creator name with fallback
                const getCreatorName = () => {
                  if (ticket.createdByName && ticket.createdByName !== 'Unknown User') {
                    return ticket.createdByName;
                  }
                  if (ticket.createdByRole === 'parent' && ticket.parent?.parentName) {
                    return ticket.parent.parentName;
                  }
                  if (ticket.createdByRole === 'teacher' && ticket.taggedTeacherName) {
                    return ticket.taggedTeacherName;
                  }
                  if (ticket.createdByRole === 'school_admin' && ticket.createdByName) {
                    return ticket.createdByName;
                  }
                  return 'Deleted User';
                };
                
                return (
                  <div key={ticket._id} className={cn(
                    "border border-blue-100 p-4 rounded-2xl bg-gradient-to-br from-white via-[#f8fbff] to-[#f5f8ff] shadow-sm hover:shadow-xl hover:-translate-y-0.5 hover:bg-gradient-to-br hover:from-white hover:to-blue-50 transition-all duration-200 relative",
                    ticket.status === 'Open' && "border-l-4 border-l-emerald-500",
                    ticket.status === 'Resolved' && "border-l-4 border-l-blue-500",
                    ticket.status === 'Closed' && "border-l-4 border-l-gray-400"
                  )}>
                    {/* Top Row: Ticket ID | Status | Category | Date | Reply Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3 bg-blue-50/60 rounded-lg p-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 tracking-wider">
                          ID: {ticket.ticketId}
                        </span>
                        <span className={cn('border px-2 py-0.5 text-[10px] font-bold uppercase rounded tracking-wider', getStatusBadge(ticket.status))}>
                          {ticket.status}
                        </span>
                        <span className={cn(
                          'border px-2 py-0.5 text-[10px] font-bold uppercase rounded tracking-wider',
                          ticket.createdByRole === 'parent' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          ticket.createdByRole === 'teacher' ? 'bg-violet-50 text-violet-700 border-violet-200' :
                          'bg-emerald-50 text-emerald-700 border-emerald-200'
                        )}>
                          {ticket.createdByRole === 'parent' ? 'Parent' : ticket.createdByRole === 'teacher' ? 'Teacher' : 'Admin'}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                          <Clock3 className="h-3 w-3" /> {formatDate(ticket.createdAt)}
                        </span>
                      </div>
                      {replyCount > 0 && (
                        <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100">
                          <MessageCircleMore className="h-3 w-3" />
                          {replyCount} {replyCount === 1 ? 'Reply' : 'Replies'}
                        </div>
                      )}
                    </div>
                    
                    {/* Second Row: Title | Action Buttons */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h4 className="font-bold text-sm text-slate-900 line-clamp-1 flex-1">{ticket.title}</h4>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* {!isRead && (
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange('Resolved');
                            }}
                            className="h-8 text-xs font-bold rounded-full px-3 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
                          >
                            <Check className="h-3 w-3 mr-1" /> Mark Resolved
                          </Button>
                        )} */}
                        <Button 
                          size="sm" 
                          onClick={() => openConversation(ticket._id)} 
                          className="h-8 text-xs font-bold rounded-full px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-sm"
                        >
                          View Thread <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Third Row: Message Preview (2 lines max) */}
                    <div className="mb-3">
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-white/80 backdrop-blur-sm p-2 rounded-xl border border-slate-100">{ticket.description}</p>
                    </div>

                    {/* Bottom Row: Metadata Chips */}
                    <div className="flex flex-wrap items-center gap-2 text-[10px]">
                      <span className="flex items-center gap-1 text-slate-600 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                        <User className="h-3 w-3 text-gray-400" />
                        {getCreatorName()}
                      </span>
                      {ticket.parent && (
                        <span className="flex items-center gap-1 text-slate-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                          <User className="h-3 w-3 text-sky-400" />
                          Parent: {ticket.parent?.parentName || 'N/A'}
                        </span>
                      )}
                      {ticket.student && (
                        <span className="flex items-center gap-1 text-slate-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          <GraduationCap className="h-3 w-3 text-purple-400" />
                          {ticket.student?.name || 'N/A'}
                        </span>
                      )}
                      {ticket.teacherIds && ticket.teacherIds.length > 0 && (
                        <span className="flex items-center gap-1 text-slate-600 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                          <Check className="h-3 w-3 text-green-400" />
                          {ticket.taggedTeacherName || ticket.teacherIds.map(t => t.teacherName || t.name).join(', ')}
                        </span>
                      )}
                      {ticket.attachments && ticket.attachments.length > 0 && (
                        <span className="flex items-center gap-1 text-slate-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <Paperclip className="h-3 w-3 text-amber-400" />
                          {ticket.attachments.length} {ticket.attachments.length === 1 ? 'Attachment' : 'Attachments'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ErpSection>
      )}

      {/* Poll Analytics Tab - Home */}
      {activeTab === 'polls' && !selectedPoll && (
        <ErpSection title="Live & Past Polls" icon={Vote} tone="indigo">
          <div className="flex items-center justify-end mb-4 gap-2">
            <Button size="sm" onClick={() => {
              setAnnouncementModalTab('poll');
              setIsAnnouncementModalOpen(true);
            }} className={cn("h-8 text-[11px] font-bold rounded-lg px-4", buttonGradient)}>
              <BarChart3 className="mr-1 h-3 w-3" /> Create Poll
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              setActiveTab('feedback');
              setIsCreateFormOpen(true);
            }} className="h-8 text-[11px] font-bold rounded-lg px-4 border-slate-200 bg-white hover:bg-slate-50">
              <MessageSquare className="mr-1 h-3 w-3 text-indigo-600" /> Create Feedback
            </Button>
          </div>
          {loading ? (
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => <div key={i} className="h-40 animate-pulse bg-slate-100 rounded-xl"></div>)}
            </div>
          ) : polls.length === 0 ? (
            <div className="text-center py-10 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <BarChart3 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-500">No polls generated yet</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {polls.map((poll) => {
                const completionRate = poll.recipientCount ? Math.round((poll.totalResponses / poll.recipientCount) * 100) : 0;
                
                return (
                  <div key={poll._id} className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-violet-50/30 p-5 shadow-sm hover:shadow-lg hover:border-violet-300 transition-all flex flex-col h-full">
                    <div className="flex items-start justify-between mb-3 gap-2">
                      <h3 className="font-bold text-[14px] text-slate-900 line-clamp-2 leading-tight">{poll.title}</h3>
                      <span className={cn('shrink-0 border rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider shadow-sm', getStatusBadge(poll.status))}>
                        {poll.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-slate-600 bg-white/70 p-2.5 rounded-lg border border-slate-100 mb-4 flex-1 shadow-sm">
                      <div className="flex items-center gap-1.5"><Users className="h-3 w-3 text-slate-400" />{getAudienceLabel(poll.audience, poll.audienceScope)}</div>
                      <div className="flex items-center gap-1.5"><Clock3 className="h-3 w-3 text-slate-400" />{formatDate(poll.createdAt)}</div>
                      {poll.expiryDate && <div className="flex items-center gap-1.5 col-span-2 text-amber-600"><Clock3 className="h-3 w-3" />Expires: {formatDate(poll.expiryDate)}</div>}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center mb-4">
                      <div className="bg-gradient-to-b from-emerald-50 to-emerald-100/50 rounded-lg py-2 border border-emerald-100 shadow-sm">
                        <div className="text-[15px] font-black text-emerald-700">{poll.totalResponses || 0}</div>
                        <div className="text-[9px] font-bold text-emerald-600/70 uppercase">Votes</div>
                      </div>
                      <div className="bg-gradient-to-b from-amber-50 to-amber-100/50 rounded-lg py-2 border border-amber-100 shadow-sm">
                        <div className="text-[15px] font-black text-amber-700">{poll.recipientCount ? Math.max(0, poll.recipientCount - (poll.totalResponses || 0)) : 0}</div>
                        <div className="text-[9px] font-bold text-amber-600/70 uppercase">Pending</div>
                      </div>
                      <div className="bg-gradient-to-b from-indigo-50 to-indigo-100/50 rounded-lg py-2 border border-indigo-100 shadow-sm">
                        <div className="text-[15px] font-black text-indigo-700">{completionRate}%</div>
                        <div className="text-[9px] font-bold text-indigo-600/70 uppercase">Done</div>
                      </div>
                    </div>

                    <Button onClick={() => openPollAnalytics(poll._id)} className={cn("w-full h-9 text-[12px] font-bold rounded-xl mt-auto", buttonGradient)}>
                      <BarChart3 className="mr-2 h-4 w-4" /> View Full Analytics
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ErpSection>
      )}

      {/* Detailed Poll Analytics View */}
      {selectedPoll && pollAnalytics && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="mb-4">
            <Button variant="outline" size="sm" onClick={closePollAnalytics} className="h-8 text-[11px] font-bold rounded-full border-slate-300 hover:bg-slate-100 shadow-sm">
              <ChevronLeft className="mr-1.5 h-4 w-4" /> Back to Directory
            </Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-3 mb-4">
            {/* Section 1: Poll Information */}
            <div className="lg:col-span-2">
              <ErpSection title="Poll Overview" icon={FileText} tone="violet" className="h-full">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="bg-gradient-to-br from-slate-50 to-white p-2.5 rounded-lg border border-slate-100 shadow-sm">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Title</div>
                    <div className="text-[11px] font-bold text-slate-900 mt-0.5 truncate">{pollAnalytics.poll.title}</div>
                  </div>
                  <div className="bg-gradient-to-br from-slate-50 to-white p-2.5 rounded-lg border border-slate-100 shadow-sm col-span-2">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Description</div>
                    <div className="text-[11px] font-medium text-slate-700 mt-0.5 truncate">{pollAnalytics.poll.description || 'No description provided'}</div>
                  </div>
                  <div className="bg-gradient-to-br from-slate-50 to-white p-2.5 rounded-lg border border-slate-100 shadow-sm">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Audience</div>
                    <div className="text-[11px] font-bold text-indigo-700 mt-0.5">{getAudienceLabel(pollAnalytics.poll.audience, pollAnalytics.poll.audienceScope)}</div>
                  </div>
                  <div className="bg-gradient-to-br from-slate-50 to-white p-2.5 rounded-lg border border-slate-100 shadow-sm">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Created By</div>
                    <div className="text-[11px] font-bold text-slate-900 mt-0.5">{pollAnalytics.poll.createdByName || 'Admin'}</div>
                  </div>
                  <div className="bg-gradient-to-br from-slate-50 to-white p-2.5 rounded-lg border border-slate-100 shadow-sm">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Timeline</div>
                    <div className="text-[11px] font-medium text-slate-700 mt-0.5">
                      {formatDate(pollAnalytics.poll.createdAt)} - {pollAnalytics.poll.expiryDate ? formatDate(pollAnalytics.poll.expiryDate) : 'Ongoing'}
                    </div>
                  </div>
                </div>
              </ErpSection>
            </div>

            {/* Section 2: Summary Cards */}
            <div className="grid grid-cols-2 gap-3 h-full">
              <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 border border-indigo-200 flex flex-col justify-center shadow-sm hover:shadow-md transition-shadow">
                <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest">Audience Size</div>
                <div className="text-3xl font-black text-indigo-900 mt-1">{pollAnalytics.summary.totalAudience}</div>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 border border-emerald-200 flex flex-col justify-center shadow-sm hover:shadow-md transition-shadow">
                <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Votes In</div>
                <div className="text-3xl font-black text-emerald-900 mt-1">{pollAnalytics.summary.responsesReceived}</div>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 p-4 border border-amber-200 flex flex-col justify-center shadow-sm hover:shadow-md transition-shadow">
                <div className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Pending</div>
                <div className="text-3xl font-black text-amber-900 mt-1">{pollAnalytics.summary.pendingResponses}</div>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-violet-50 to-violet-100 p-4 border border-violet-200 flex flex-col justify-center shadow-sm hover:shadow-md transition-shadow">
                <div className="text-[10px] font-bold text-violet-700 uppercase tracking-widest">Completion</div>
                <div className="text-3xl font-black text-violet-900 mt-1">{pollAnalytics.summary.completionPercent}%</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 mb-4">
            {/* Section 3: Charts */}
            <ErpSection title="Vote Distribution" icon={PieChart} tone="indigo">
              {pollAnalytics.poll.pollType === 'single' && pollAnalytics.poll.options.length === 2 ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={pollAnalytics.poll.options.map(option => {
                          const summaryItem = pollAnalytics.optionSummary.find(s => s.option === option.text);
                          return {
                            option: option.text,
                            count: summaryItem ? Number(summaryItem.count) || 0 : 0,
                            percent: summaryItem ? Number(summaryItem.percent) || 0 : 0
                          };
                        })}
                        cx="50%" cy="50%" labelLine={false}
                        label={({ option, percent }) => `${option}: ${percent}%`}
                        outerRadius={75} dataKey="count"
                        stroke="none"
                      >
                        {pollAnalytics.poll.options.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <>
                  {pollAnalytics.poll.options.every(option => {
                    const summaryItem = pollAnalytics.optionSummary.find(s => s.option === option.text);
                    return !summaryItem || Number(summaryItem.count) === 0;
                  }) && (
                    <div className="text-center text-xs text-slate-500 mb-2">No votes received yet.</div>
                  )}
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={pollAnalytics.poll.options.map((option, index) => {
                          const summaryItem = pollAnalytics.optionSummary.find(s => s.option === option.text);
                          return {
                            option: option.text,
                            count: summaryItem ? Number(summaryItem.count) || 0 : 0,
                            percent: summaryItem ? Number(summaryItem.percent) || 0 : 0,
                            color: COLORS[index % COLORS.length]
                          };
                        })} 
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="option" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                        <YAxis 
                          tick={{fontSize: 10, fill: '#64748b'}} 
                          axisLine={false} 
                          tickLine={false}
                          domain={[0, pollAnalytics.poll.options.every(option => {
                            const summaryItem = pollAnalytics.optionSummary.find(s => s.option === option.text);
                            return !summaryItem || Number(summaryItem.count) === 0;
                          }) ? 1 : 'auto']}
                        />
                        <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={40}>
                          {pollAnalytics.poll.options.map((option, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </ErpSection>

            {/* Section 8: Quick Insights */}
            <ErpSection title="Quick Insights" icon={BarChart3} tone="amber">
              <div className="flex flex-col gap-3 h-full justify-center">
                <div className="rounded-xl bg-gradient-to-r from-indigo-50 to-white border border-indigo-100 p-4 shadow-sm flex items-center gap-4">
                  <div className="bg-indigo-100 p-3 rounded-full shadow-inner"><Vote className="h-5 w-5 text-indigo-600" /></div>
                  <div>
                    <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Winning Option</div>
                    <div className="text-[15px] font-black text-slate-800">
                      {pollAnalytics.optionSummary.sort((a, b) => b.count - a.count)[0]?.option || 'N/A'}
                    </div>
                    <div className="text-[11px] font-medium text-slate-500">
                      Secured {pollAnalytics.optionSummary.sort((a, b) => b.count - a.count)[0]?.count || 0} total votes
                    </div>
                  </div>
                </div>

                {pollAnalytics.parentBreakdown && pollAnalytics.parentBreakdown.length > 0 && (
                  <>
                    <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-white border border-emerald-100 p-4 shadow-sm flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Most Active Class</div>
                        <div className="text-[14px] font-bold text-slate-800">Class {pollAnalytics.parentBreakdown.sort((a, b) => b.completion - a.completion)[0].className}</div>
                      </div>
                      <div className="text-xl font-black text-emerald-600 drop-shadow-sm">{pollAnalytics.parentBreakdown.sort((a, b) => b.completion - a.completion)[0].completion}%</div>
                    </div>
                    
                    <div className="rounded-xl bg-gradient-to-r from-rose-50 to-white border border-rose-100 p-4 shadow-sm flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Needs Follow-up</div>
                        <div className="text-[14px] font-bold text-slate-800">Class {pollAnalytics.parentBreakdown.sort((a, b) => a.completion - b.completion)[0].className}</div>
                      </div>
                      <div className="text-xl font-black text-rose-600 drop-shadow-sm">{pollAnalytics.parentBreakdown.sort((a, b) => a.completion - b.completion)[0].completion}%</div>
                    </div>
                  </>
                )}
              </div>
            </ErpSection>
          </div>

          {/* Section 4: Class Wise Response (for Parent Polls) */}
          {pollAnalytics.parentBreakdown && pollAnalytics.parentBreakdown.length > 0 && (
            <ErpSection title="Engagement by Class" icon={Users} tone="emerald" className="mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {pollAnalytics.parentBreakdown.map((classData, index) => (
                  <div key={index} className="rounded-xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/30 p-4 shadow-sm hover:border-emerald-300 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-bold text-[13px] text-slate-800">Class {classData.className}</div>
                      <div className="text-[11px] font-black bg-white text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-md shadow-sm">{classData.completion}% Done</div>
                    </div>
                    <div className="w-full bg-slate-100/80 rounded-full h-2 mb-2 overflow-hidden border border-slate-200/50 shadow-inner">
                      <div 
                        className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${classData.completion}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                      <span className="text-emerald-600">{classData.responded} In</span>
                      <span className="text-amber-500">{classData.pending} Pending</span>
                      <span>{classData.totalParents} Total</span>
                    </div>
                  </div>
                ))}
              </div>
            </ErpSection>
          )}

          {/* Section 6: Complete Response History */}
          <ErpSection title="Live Ledger & History" icon={FileText} tone="blue">
            <div className="flex flex-col sm:flex-row gap-3 mb-4 justify-between items-start sm:items-center">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={pollAnalytics.poll.audience === 'teachers' ? "Search teacher or vote choice..." : "Search parent, student, or class..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-[12px] bg-white border-slate-200 shadow-sm rounded-lg"
                />
              </div>
              {/* <Button onClick={exportResponseHistory} variant="outline" className="h-9 text-[11px] font-bold rounded-lg border-indigo-200 text-indigo-700 hover:bg-indigo-50 w-full sm:w-auto shrink-0 shadow-sm">
                <Download className="mr-1.5 h-3.5 w-3.5" /> Export to CSV
              </Button> */}
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {pollAnalytics.poll.audience === 'teachers' ? (
                        <>
                          <th className="px-4 py-3">Teacher Name</th>
                          <th className="px-4 py-3">Vote Choice</th>
                          <th className="px-4 py-3">Timestamp</th>
                        </>
                      ) : pollAnalytics.poll.audience === 'students' ? (
                        <>
                          <th className="px-4 py-3">Student Name</th>
                          <th className="px-4 py-3">Roll No</th>
                          <th className="px-4 py-3">Class</th>
                          <th className="px-4 py-3">Vote Choice</th>
                          <th className="px-4 py-3">Timestamp</th>
                        </>
                      ) : (
                        <>
                          <th className="px-4 py-3">Parent Name</th>
                          <th className="px-4 py-3">Student Name</th>
                          <th className="px-4 py-3">Class</th>
                          <th className="px-4 py-3">Vote Choice</th>
                          <th className="px-4 py-3">Timestamp</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredResponses.length === 0 ? (
                      <tr>
                        <td colSpan={pollAnalytics.poll.audience === 'teachers' ? 3 : pollAnalytics.poll.audience === 'students' ? 5 : 5} className="px-4 py-8 text-center bg-slate-50/50">
                          <p className="text-[12px] font-medium text-slate-500">No records found matching criteria.</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedResponses.map((response, index) => (
                        <tr key={index} className="hover:bg-indigo-50/30 transition-colors">
                          {pollAnalytics.poll.audience === 'teachers' ? (
                            <>
                              <td className="px-4 py-2.5 text-[12px] font-bold text-slate-800">{response.name}</td>
                              <td className="px-4 py-2.5">
                                <span className="bg-white text-indigo-700 px-2 py-0.5 rounded-md text-[11px] font-bold border border-indigo-200 shadow-sm">
                                  {response.selectedOption}
                                </span>
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="text-[11px] font-semibold text-slate-600">{formatDate(response.submittedAt)}</div>
                                <div className="text-[9px] font-medium text-slate-400">{new Date(response.submittedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                              </td>
                            </>
                          ) : pollAnalytics.poll.audience === 'students' ? (
                            <>
                              <td className="px-4 py-2.5 text-[12px] font-bold text-slate-800">{response.name}</td>
                              <td className="px-4 py-2.5 text-[12px] font-semibold text-slate-700">{response.rollNo || 'N/A'}</td>
                              <td className="px-4 py-2.5 text-[12px] font-semibold text-slate-700">{response.className || 'N/A'}</td>
                              <td className="px-4 py-2.5">
                                <span className="bg-white text-indigo-700 px-2 py-0.5 rounded-md text-[11px] font-bold border border-indigo-200 shadow-sm">
                                  {response.selectedOption}
                                </span>
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="text-[11px] font-semibold text-slate-600">{formatDate(response.submittedAt)}</div>
                                <div className="text-[9px] font-medium text-slate-400">{new Date(response.submittedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-2.5 text-[12px] font-bold text-slate-800">{response.name}</td>
                              <td className="px-4 py-2.5 text-[12px] font-semibold text-slate-700">{response.studentName || 'N/A'}</td>
                              <td className="px-4 py-2.5 text-[12px] font-semibold text-slate-700">{response.className || 'N/A'}</td>
                              <td className="px-4 py-2.5">
                                <span className="bg-white text-indigo-700 px-2 py-0.5 rounded-md text-[11px] font-bold border border-indigo-200 shadow-sm">
                                  {response.selectedOption}
                                </span>
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="text-[11px] font-semibold text-slate-600">{formatDate(response.submittedAt)}</div>
                                <div className="text-[9px] font-medium text-slate-400">{new Date(response.submittedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-3 bg-gradient-to-r from-slate-50 to-white p-2 rounded-lg border border-slate-100 shadow-sm">
                <div className="text-[11px] font-semibold text-slate-500 ml-2">
                  Showing <span className="text-slate-800">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="text-slate-800">{Math.min(currentPage * itemsPerPage, filteredResponses.length)}</span> of {filteredResponses.length}
                </div>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="h-7 text-[10px] font-bold rounded bg-white shadow-sm">
                    Prev
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) pageNum = i + 1;
                      else if (currentPage <= 3) pageNum = i + 1;
                      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = currentPage - 2 + i;
                      
                      return (
                        <Button key={pageNum} variant={currentPage === pageNum ? 'default' : 'outline'} size="sm" onClick={() => setCurrentPage(pageNum)} className={cn("h-7 w-7 p-0 text-[10px] font-bold rounded shadow-sm", currentPage === pageNum ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-none" : "bg-white")}>
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="h-7 text-[10px] font-bold rounded bg-white shadow-sm">
                    Next
                  </Button>
                </div>
              </div>
            )}
          </ErpSection>

          {/* Section 7: Pending Responses (Collapsible) */}
          {pollAnalytics.summary.pendingResponses > 0 && (
            <ErpSection title="Pending Action Required" icon={Clock3} tone="red">
              <button onClick={() => setPendingResponsesOpen(!pendingResponsesOpen)} className="flex items-center justify-between w-full p-3 rounded-xl bg-gradient-to-r from-rose-50 to-white border border-rose-200 hover:border-rose-300 transition-colors shadow-sm">
                <div className="flex items-center gap-2 text-[12px] font-bold text-rose-700">
                  <Users className="h-4 w-4" /> {pollAnalytics.summary.pendingResponses} {getAudienceLabel(pollAnalytics.poll.audience, pollAnalytics.poll.audienceScope)} Pending Response
                </div>
                {pendingResponsesOpen ? <ChevronUp className="h-4 w-4 text-rose-500" /> : <ChevronDown className="h-4 w-4 text-rose-500" />}
              </button>

              {pendingResponsesOpen && (
                <div className="mt-3 rounded-xl border border-rose-200 bg-white p-4 shadow-sm animate-in slide-in-from-top-2">
                  <p className="text-[12px] font-medium text-slate-600 mb-3">
                    {pollAnalytics.poll.audience === 'teachers' 
                      ? 'The following teachers have not responded yet:' 
                      : pollAnalytics.poll.audience === 'students'
                      ? 'The following students have not responded yet:'
                      : 'The following classes still require parent follow-ups:'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {pollAnalytics.parentBreakdown?.map(c => (
                      <div key={c.className} className="bg-rose-50/50 border border-rose-100 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm">
                        <span className="text-[11px] font-bold text-slate-700">Class {c.className}</span>
                        <span className="bg-white text-rose-600 text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm border border-rose-100">{c.pending} Left</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ErpSection>
          )}
        </div>
      )}

      {/* Feedback Conversation Modal (Styled with Chat Gradients) */}
      {conversationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="flex flex-col w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden border border-white/20">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-indigo-100 bg-gradient-to-r from-indigo-50 to-white p-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-indigo-500 to-violet-500 p-2 rounded-lg shadow-sm">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-[15px] font-black text-slate-800">Support Thread</h3>
                  <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">Ticket: {selectedFeedback?.ticketId}</p>
                </div>
              </div>
              <button onClick={closeConversation} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors bg-white shadow-sm border border-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {conversationLoading ? (
              <div className="flex-1 p-8 flex items-center justify-center bg-slate-50/50">
                <div className="animate-pulse flex flex-col items-center gap-2 text-indigo-400">
                  <div className="h-8 w-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin"></div>
                  <p className="text-xs font-bold">Loading thread securely...</p>
                </div>
              </div>
            ) : selectedFeedback ? (
              <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col bg-slate-50/30">
                {/* Context Block (Sticky at top of scroll) */}
                <div className="p-4 bg-white border-b border-slate-100 shadow-sm shrink-0">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-black text-[15px] text-slate-900">{selectedFeedback.title}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] font-bold text-slate-500">
                          <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 shadow-sm"><User className="h-3 w-3 text-indigo-500" /> {selectedFeedback.parent?.parentName || 'N/A'}</span>
                          <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 shadow-sm"><GraduationCap className="h-3 w-3 text-indigo-500" /> {selectedFeedback.student?.name || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="w-32 shrink-0">
                        <Select value={selectedFeedback.status} onValueChange={handleStatusChange}>
                          <SelectTrigger className="h-8 text-[11px] font-bold border-indigo-200 bg-indigo-50/50 shadow-sm focus:ring-indigo-500/20 text-indigo-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-lg shadow-xl text-[11px] font-bold">
                            <SelectItem value="Open">Open</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Resolved">Resolved</SelectItem>
                            <SelectItem value="Closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {selectedFeedback.description && (
                      <div className="bg-gradient-to-br from-slate-50 to-white rounded-lg p-3 text-[12px] font-medium text-slate-700 leading-relaxed border border-slate-200/60 shadow-inner">
                        {selectedFeedback.description}
                      </div>
                    )}
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 p-4 space-y-4">
                  {!selectedFeedback.messages || selectedFeedback.messages.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-[12px] font-bold text-slate-400">No replies in this thread yet.</p>
                    </div>
                  ) : (
                    selectedFeedback.messages.map((message, index) => {
                      const isAdmin = message.senderRole !== 'parent';
                      const alignment = isAdmin ? "justify-end" : "justify-start";
                      
                      return (
                        <div key={index} className={cn("flex w-full", alignment)}>
                          <div className={cn(
                            "max-w-[85%] rounded-2xl p-3 shadow-md border",
                            isAdmin 
                              ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-tr-sm border-indigo-700/50" 
                              : "bg-gradient-to-br from-white to-indigo-50/50 text-slate-800 border-indigo-100 rounded-tl-sm"
                          )}>
                            <div className="flex items-center gap-2 mb-1.5 border-b border-black/10 pb-1.5">
                              <span className={cn("text-[11px] font-black", isAdmin ? "text-white" : "text-slate-800")}>
                                {message.senderName || 'User'}
                              </span>
                              <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ml-auto shadow-sm", isAdmin ? "bg-white/20 text-white" : "bg-white text-indigo-600 border border-indigo-100")}>
                                {message.senderRole}
                              </span>
                              <span className={cn("text-[9px] font-bold", isAdmin ? "text-white/70" : "text-slate-400")}>
                                {formatDateTime(message.createdAt)}
                              </span>
                            </div>
                            
                            <p className="text-[12px] leading-relaxed whitespace-pre-wrap font-medium">
                              {message.content || 'Attached file(s)'}
                            </p>
                            
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {message.attachments.map((att, idx) => {
                                  const FileIconComp = getFileIcon(att.name);
                                  const fileType = getFileType(att.name);
                                  const fileSize = formatFileSize(att.size);
                                  const isImg = isImage(att.name);
                                  
                                  return (
                                    <div
                                      key={idx}
                                      className={cn(
                                        "flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-medium transition-all shadow-sm border",
                                        isAdmin 
                                          ? "bg-black/20 hover:bg-black/30 text-white border-white/10" 
                                          : "bg-white border-indigo-100 hover:bg-indigo-50 text-slate-700"
                                      )}
                                    >
                                      <FileIconComp className="h-4 w-4 shrink-0" />
                                      <div className="flex flex-col min-w-0">
                                        <span className="truncate max-w-[120px] font-semibold">{att.name || 'Attachment'}</span>
                                        <span className="text-[9px] opacity-70">{fileType}{fileSize ? ` • ${fileSize}` : ''}</span>
                                      </div>
                                      {att.url && (
                                        <div className="flex items-center gap-1 shrink-0 ml-1">
                                          {isImg ? (
                                            <button
                                              onClick={() => openPreview(att)}
                                              className={cn(
                                                "p-1 rounded hover:bg-indigo-500/20 transition-colors",
                                                isAdmin ? "text-white/80 hover:text-white" : "text-indigo-600 hover:text-indigo-700"
                                              )}
                                              title="Preview"
                                            >
                                              <Eye className="h-3 w-3" />
                                            </button>
                                          ) : (
                                            <a
                                              href={att.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className={cn(
                                                "p-1 rounded hover:bg-indigo-500/20 transition-colors",
                                                isAdmin ? "text-white/80 hover:text-white" : "text-indigo-600 hover:text-indigo-700"
                                              )}
                                              title="Open"
                                            >
                                              <ExternalLink className="h-3 w-3" />
                                            </a>
                                          )}
                                          <a
                                            href={att.url}
                                            download={att.name}
                                            className={cn(
                                              "p-1 rounded hover:bg-indigo-500/20 transition-colors",
                                              isAdmin ? "text-white/80 hover:text-white" : "text-indigo-600 hover:text-indigo-700"
                                            )}
                                            title="Download"
                                          >
                                            <Download className="h-3 w-3" />
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 p-8 text-center text-slate-500 font-bold">Error loading thread.</div>
            )}

            {/* Input Reply Area */}
            {selectedFeedback && !conversationLoading && (
              <div className="p-3 bg-gradient-to-b from-white to-slate-50 border-t border-slate-200 shrink-0">
                <div className="flex flex-col gap-2 rounded-xl border border-indigo-100 bg-white p-2 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all shadow-sm">
                  <Textarea
                    className="min-h-[50px] w-full resize-none border-0 bg-transparent p-2 text-[12px] font-medium focus-visible:ring-0 shadow-none placeholder:text-slate-400"
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Draft your reply as Admin..."
                  />
                  
                  {replyAttachments.length > 0 && (
                    <div className="px-2 pb-1 flex flex-wrap gap-1.5">
                      {replyAttachments.map((file, index) => (
                        <div key={index} className="flex items-center gap-1 rounded bg-indigo-50 px-2 py-1 text-[10px] font-bold border border-indigo-100 shadow-sm text-indigo-700">
                          <FileIcon className="h-2.5 w-2.5" />
                          <span className="max-w-[120px] truncate">{file.name}</span>
                          <button type="button" className="text-indigo-400 hover:text-rose-500 p-0.5 rounded ml-1 bg-white shadow-sm" onClick={() => setReplyAttachments(prev => prev.filter((_, i) => i !== index))}>
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 px-1">
                    <label className="cursor-pointer flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                      <div className="bg-slate-100 p-1 rounded-md shadow-inner"><Paperclip className="h-3 w-3" /></div>
                      <span>Attach File</span>
                      <input type="file" className="hidden" multiple onChange={(e) => setReplyAttachments(prev => [...prev, ...Array.from(e.target.files || [])])} />
                    </label>
                    <Button 
                      onClick={handleSendReply} 
                      disabled={sendingReply}
                      className={cn("h-9 px-5 text-[11px] font-bold rounded-xl shadow-md transition-transform hover:-translate-y-0.5", buttonGradient)}
                    >
                      {sendingReply ? <span className="flex items-center"><div className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin mr-1.5"></div> Sending</span> : <span className="flex items-center"><Send className="h-3.5 w-3.5 mr-1.5" /> Send Reply</span>}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attachment Preview Modal */}
      {previewModalOpen && previewAttachment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="flex flex-col w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden border border-white/20">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white p-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-indigo-500 to-violet-500 p-2 rounded-lg shadow-sm">
                  {(() => {
                    const FileIconComp = getFileIcon(previewAttachment.name);
                    return <FileIconComp className="h-5 w-5 text-white" />;
                  })()}
                </div>
                <div>
                  <h3 className="text-[15px] font-black text-slate-800 truncate max-w-[300px]">{previewAttachment.name || 'Attachment'}</h3>
                  <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">
                    {getFileType(previewAttachment.name)}{previewAttachment.size ? ` • ${formatFileSize(previewAttachment.size)}` : ''}
                  </p>
                </div>
              </div>
              <button onClick={closePreview} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors bg-white shadow-sm border border-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto custom-scrollbar bg-slate-50/30 p-4 flex items-center justify-center">
              {isImage(previewAttachment.name) && previewAttachment.url ? (
                <img
                  src={previewAttachment.url}
                  alt={previewAttachment.name}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                />
              ) : (
                <div className="text-center py-12">
                  <div className="bg-gradient-to-br from-slate-100 to-slate-50 p-8 rounded-2xl border border-slate-200 shadow-sm inline-block">
                    {(() => {
                      const FileIconComp = getFileIcon(previewAttachment.name);
                      return <FileIconComp className="h-16 w-16 text-slate-400 mx-auto mb-4" />;
                    })()}
                    <p className="text-[14px] font-bold text-slate-600 mb-2">Preview not available</p>
                    <p className="text-[12px] font-medium text-slate-400">This file type cannot be previewed inline</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-gradient-to-b from-white to-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-end gap-2">
              {previewAttachment.url && (
                <>
                  {!isImage(previewAttachment.name) && (
                    <a
                      href={previewAttachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 text-[12px] font-bold rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors shadow-sm"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open in New Tab
                    </a>
                  )}
                  <a
                    href={previewAttachment.url}
                    download={previewAttachment.name}
                    className="flex items-center gap-2 px-4 py-2 text-[12px] font-bold rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Announcement Modal */}
      <AnnouncementModal 
        open={isAnnouncementModalOpen} 
        onOpenChange={setIsAnnouncementModalOpen} 
        role="school_admin"
        initialTab={announcementModalTab}
      />
    </PageStack>
  );
}