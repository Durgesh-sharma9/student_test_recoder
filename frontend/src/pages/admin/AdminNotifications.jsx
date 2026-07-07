import { useState, useEffect } from 'react';
import { Bell, Check, BarChart3, Vote, Clock3, Users, ChevronDown, ChevronUp, ChevronLeft, Search, Download, FileText, MessageSquare, Paperclip, X, Send, User, GraduationCap, Upload, FileText as FileIcon } from 'lucide-react';
import api from '@/lib/api';
import FeedbackPanel from '@/components/FeedbackPanel';
import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function AdminNotifications() {
  const [activeTab, setActiveTab] = useState('notifications');
  const [notifications, setNotifications] = useState([]);
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

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
    } catch (error) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
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
      
      // Fetch full feedback details including messages
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
      
      // Refresh feedback data
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
      
      // Refresh feedback data
      await openConversation(selectedFeedback._id);
      fetchFeedback();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-GB', { 
      day: '2-digit', month: 'short', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
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
        return 'bg-emerald-100 text-emerald-700';
      case 'Closed':
        return 'bg-slate-100 text-slate-700';
      case 'Expired':
        return 'bg-red-100 text-red-700';
      case 'Draft':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const exportResponseHistory = () => {
    if (!pollAnalytics?.responses) return;
    
    const headers = ['Parent Name', 'Student Name', 'Class', 'Selected Option', 'Submitted Date', 'Submitted Time'];
    const csvContent = [
      headers.join(','),
      ...pollAnalytics.responses.map(r => [
        `"${r.name}"`,
        `"${r.studentName || 'N/A'}"`,
        `"${r.className || 'N/A'}"`,
        `"${r.selectedOption}"`,
        formatDate(r.submittedAt),
        new Date(r.submittedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      ].join(','))
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

  return (
    <PageStack>
      <PageHeader title="School Notifications" description="Manage all school-related updates and alerts." />

      {/* Tabs */}
      <div className="mb-6 border-b border-slate-200">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('notifications')}
            className={cn(
              'pb-3 text-sm font-semibold border-b-2 transition-colors',
              activeTab === 'notifications' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            Notifications
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={cn(
              'pb-3 text-sm font-semibold border-b-2 transition-colors',
              activeTab === 'feedback' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            Parent Feedback
          </button>
          <button
            onClick={() => setActiveTab('polls')}
            className={cn(
              'pb-3 text-sm font-semibold border-b-2 transition-colors',
              activeTab === 'polls' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            Poll Analytics
          </button>
        </div>
      </div>

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <ErpSection title="Inbox" icon={Bell}>
          {loading ? (
            <p className="text-slate-500">Loading...</p>
          ) : notifications.length === 0 ? (
            <p className="text-slate-500">No notifications yet.</p>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <div key={n._id} className="border border-slate-200 p-4 rounded-lg bg-white">
                  <h4 className="font-semibold text-slate-900">{n.title}</h4>
                  <p className="text-sm text-slate-600 mt-1">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </ErpSection>
      )}

      {/* Feedback Tab */}
      {activeTab === 'feedback' && (
        <ErpSection title="Parent Feedback" icon={MessageSquare} tone="blue">
          {loading ? (
            <p className="text-slate-500">Loading feedback...</p>
          ) : feedback.length === 0 ? (
            <p className="text-slate-500">No feedback tickets yet.</p>
          ) : (
            <div className="space-y-3">
              {feedback.map((ticket) => (
                <div key={ticket._id} className="border border-slate-200 p-4 rounded-lg bg-white">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{ticket.ticketId}</span>
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', getStatusBadge(ticket.status))}>
                          {ticket.status}
                        </span>
                      </div>
                      <h4 className="font-semibold text-slate-900">{ticket.title}</h4>
                    </div>
                    <div className="text-xs text-slate-500">{formatDate(ticket.createdAt)}</div>
                  </div>
                  <p className="text-sm text-slate-600 mb-3 line-clamp-2">{ticket.description}</p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mb-3">
                    <span>Parent: {ticket.parent?.parentName || 'N/A'}</span>
                    <span>Student: {ticket.student?.name || 'N/A'}</span>
                    {ticket.student?.class && (
                      <span>Class: {ticket.student.class.className} {ticket.student.class.section}</span>
                    )}
                  </div>
                  {ticket.attachments && ticket.attachments.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                      <Paperclip className="h-3 w-3" />
                      <span>{ticket.attachments.length} attachment(s)</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-500">
                      {ticket.messages?.length > 1 && `${ticket.messages.length - 1} reply(ies)`}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openConversation(ticket._id)}>
                      Open Conversation
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ErpSection>
      )}

      {/* Poll Analytics Tab - Home */}
      {activeTab === 'polls' && !selectedPoll && (
        <ErpSection title="Poll Analytics" icon={BarChart3} tone="blue">
          {loading ? (
            <p className="text-slate-500">Loading polls...</p>
          ) : polls.length === 0 ? (
            <p className="text-slate-500">No polls created yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {polls.map((poll) => (
                <div key={poll._id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-slate-900 line-clamp-2">{poll.title}</h3>
                    <span className={cn('rounded-full px-2 py-1 text-xs font-semibold', getStatusBadge(poll.status))}>
                      {poll.status}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-400" />
                      <span>{getAudienceLabel(poll.audience, poll.audienceScope)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-slate-400" />
                      <span>Created: {formatDate(poll.createdAt)}</span>
                    </div>
                    {poll.expiryDate && (
                      <div className="flex items-center gap-2">
                        <Clock3 className="h-4 w-4 text-slate-400" />
                        <span>Expires: {formatDate(poll.expiryDate)}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-lg font-bold text-slate-900">{poll.totalResponses || 0}</div>
                      <div className="text-xs text-slate-500">Responses</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-slate-900">
                        {poll.recipientCount ? Math.max(0, poll.recipientCount - (poll.totalResponses || 0)) : 0}
                      </div>
                      <div className="text-xs text-slate-500">Pending</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-indigo-600">
                        {poll.recipientCount ? Math.round((poll.totalResponses / poll.recipientCount) * 100) : 0}%
                      </div>
                      <div className="text-xs text-slate-500">Complete</div>
                    </div>
                  </div>

                  <Button 
                    onClick={() => openPollAnalytics(poll._id)}
                    className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700"
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View Analytics
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ErpSection>
      )}

      {/* Detailed Poll Analytics View */}
      {selectedPoll && pollAnalytics && (
        <>
          <div className="mb-4">
            <Button variant="outline" onClick={closePollAnalytics}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Polls
            </Button>
          </div>

          {/* Section 1: Poll Information */}
          <ErpSection title="Poll Information" icon={Vote} tone="violet">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Title</div>
                <div className="text-sm font-medium text-slate-900 mt-1">{pollAnalytics.poll.title}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</div>
                <div className="text-sm text-slate-600 mt-1">{pollAnalytics.poll.description || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Audience</div>
                <div className="text-sm text-slate-600 mt-1">{getAudienceLabel(pollAnalytics.poll.audience, pollAnalytics.poll.audienceScope)}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Created By</div>
                <div className="text-sm text-slate-600 mt-1">{pollAnalytics.poll.createdByName || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Created Date</div>
                <div className="text-sm text-slate-600 mt-1">{formatDate(pollAnalytics.poll.createdAt)}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Expiry Date</div>
                <div className="text-sm text-slate-600 mt-1">{pollAnalytics.poll.expiryDate ? formatDate(pollAnalytics.poll.expiryDate) : 'No expiry'}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</div>
                <span className={cn('inline-block mt-1 rounded-full px-2 py-1 text-xs font-semibold', getStatusBadge(pollAnalytics.poll.status))}>
                  {pollAnalytics.poll.status}
                </span>
              </div>
            </div>
          </ErpSection>

          {/* Section 2: Summary Cards */}
          <ErpSection title="Summary" icon={BarChart3} tone="blue">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 border border-indigo-200">
                <div className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Total Audience</div>
                <div className="text-2xl font-bold text-indigo-900 mt-1">{pollAnalytics.summary.totalAudience}</div>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 border border-emerald-200">
                <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Responded</div>
                <div className="text-2xl font-bold text-emerald-900 mt-1">{pollAnalytics.summary.responsesReceived}</div>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 p-4 border border-amber-200">
                <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Pending</div>
                <div className="text-2xl font-bold text-amber-900 mt-1">{pollAnalytics.summary.pendingResponses}</div>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-violet-50 to-violet-100 p-4 border border-violet-200">
                <div className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Completion %</div>
                <div className="text-2xl font-bold text-violet-900 mt-1">{pollAnalytics.summary.completionPercent}%</div>
              </div>
            </div>
          </ErpSection>

          {/* Section 3: Charts */}
          <ErpSection title="Response Distribution" icon={BarChart3} tone="blue">
            {pollAnalytics.poll.pollType === 'single' && pollAnalytics.optionSummary.length === 2 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pollAnalytics.optionSummary}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ option, percent }) => `${option}: ${percent}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {pollAnalytics.optionSummary.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pollAnalytics.optionSummary}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="option" tick={{fontSize: 12}} />
                    <YAxis tick={{fontSize: 12}} />
                    <RechartsTooltip />
                    <Bar dataKey="count" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ErpSection>

          {/* Section 4: Class Wise Response (for Parent Polls) */}
          {pollAnalytics.parentBreakdown && pollAnalytics.parentBreakdown.length > 0 && (
            <ErpSection title="Class Wise Response" icon={Users} tone="green">
              <div className="space-y-3">
                {pollAnalytics.parentBreakdown.map((classData, index) => (
                  <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-slate-900">{classData.className}</div>
                      <div className="text-sm font-bold text-indigo-600">{classData.completion}%</div>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full transition-all" 
                        style={{ width: `${classData.completion}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-slate-600">
                      <span>{classData.responded} responded</span>
                      <span>{classData.pending} pending</span>
                      <span>Total: {classData.totalParents}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ErpSection>
          )}

          {/* Section 5: Recent Responses */}
          <ErpSection title="Recent Responses" icon={Clock3} tone="amber">
            {pollAnalytics.responses.length === 0 ? (
              <p className="text-slate-500">No responses yet.</p>
            ) : (
              <div className="space-y-2">
                {pollAnalytics.responses.slice(0, 5).map((response, index) => (
                  <div key={index} className="rounded-lg border border-slate-200 bg-white p-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-900">{response.name}</div>
                      <div className="text-xs text-slate-500">
                        {response.studentName && `${response.studentName} • `}
                        {response.className}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-indigo-600">{response.selectedOption}</div>
                      <div className="text-xs text-slate-500">{formatDateTime(response.submittedAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ErpSection>

          {/* Section 6: Complete Response History (Collapsible) */}
          <ErpSection title="Response History" icon={FileText} tone="blue">
            <button
              onClick={() => setResponseHistoryOpen(!responseHistoryOpen)}
              className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-4"
            >
              {responseHistoryOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {responseHistoryOpen ? 'Hide' : 'Show'} Complete History
            </button>

            {responseHistoryOpen && (
              <div className="space-y-4">
                <div className="flex gap-3">
                  <Input
                    placeholder="Search by name, student, or class..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-sm"
                  />
                  <Button onClick={exportResponseHistory} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>

                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Parent</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Student</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Class</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Selected Option</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Submitted Date</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Submitted Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredResponses.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                              No responses found matching your search.
                            </td>
                          </tr>
                        ) : (
                          paginatedResponses.map((response, index) => (
                            <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="px-4 py-3 text-slate-900">{response.name}</td>
                              <td className="px-4 py-3 text-slate-600">{response.studentName || 'N/A'}</td>
                              <td className="px-4 py-3 text-slate-600">{response.className || 'N/A'}</td>
                              <td className="px-4 py-3 text-indigo-600 font-medium">{response.selectedOption}</td>
                              <td className="px-4 py-3 text-slate-600">{formatDate(response.submittedAt)}</td>
                              <td className="px-4 py-3 text-slate-600">
                                {new Date(response.submittedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-slate-600">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredResponses.length)} of {filteredResponses.length} responses
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className="w-8"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ErpSection>

          {/* Section 7: Pending Responses (Collapsible) */}
          {pollAnalytics.summary.pendingResponses > 0 && (
            <ErpSection title="Pending Responses" icon={Clock3} tone="red">
              <button
                onClick={() => setPendingResponsesOpen(!pendingResponsesOpen)}
                className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-4"
              >
                {pendingResponsesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {pendingResponsesOpen ? 'Hide' : 'Show'} Pending Parents ({pollAnalytics.summary.pendingResponses})
              </button>

              {pendingResponsesOpen && (
                <div className="rounded-lg border border-slate-200 bg-amber-50 p-4">
                  <p className="text-sm text-amber-700">
                    {pollAnalytics.summary.pendingResponses} parents have not yet responded to this poll.
                    {pollAnalytics.parentBreakdown && (
                      <span className="block mt-2 text-xs">
                        Breakdown by class: {pollAnalytics.parentBreakdown.map(c => `${c.className}: ${c.pending}`).join(', ')}
                      </span>
                    )}
                  </p>
                </div>
              )}
            </ErpSection>
          )}

          {/* Section 8: Insights */}
          <ErpSection title="Insights" icon={BarChart3} tone="indigo">
            <div className="grid gap-3 md:grid-cols-2">
              {pollAnalytics.parentBreakdown && pollAnalytics.parentBreakdown.length > 0 && (
                <>
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                    <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Highest Response Class</div>
                    <div className="text-sm font-medium text-emerald-900 mt-1">
                      {pollAnalytics.parentBreakdown.sort((a, b) => b.completion - a.completion)[0].className}
                      ({pollAnalytics.parentBreakdown.sort((a, b) => b.completion - a.completion)[0].completion}%)
                    </div>
                  </div>
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                    <div className="text-xs font-semibold text-red-700 uppercase tracking-wide">Lowest Response Class</div>
                    <div className="text-sm font-medium text-red-900 mt-1">
                      {pollAnalytics.parentBreakdown.sort((a, b) => a.completion - b.completion)[0].className}
                      ({pollAnalytics.parentBreakdown.sort((a, b) => a.completion - b.completion)[0].completion}%)
                    </div>
                  </div>
                </>
              )}
              <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-3">
                <div className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Completion Rate</div>
                <div className="text-sm font-medium text-indigo-900 mt-1">{pollAnalytics.summary.completionPercent}%</div>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Most Selected Option</div>
                <div className="text-sm font-medium text-amber-900 mt-1">
                  {pollAnalytics.optionSummary.sort((a, b) => b.count - a.count)[0]?.option || 'N/A'}
                  ({pollAnalytics.optionSummary.sort((a, b) => b.count - a.count)[0]?.count || 0} votes)
                </div>
              </div>
            </div>
          </ErpSection>
        </>
      )}

      {/* Feedback Conversation Modal */}
      {conversationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-xl">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Feedback Conversation</h3>
                <p className="text-sm text-slate-500">{selectedFeedback?.ticketId}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={closeConversation}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="p-4">
              {conversationLoading ? (
                <p className="text-center text-slate-500">Loading conversation...</p>
              ) : selectedFeedback ? (
                <div className="space-y-4">
                  {/* Ticket Info */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase">Title</p>
                        <p className="font-medium text-slate-900">{selectedFeedback.title}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase">Status</p>
                        <Select value={selectedFeedback.status} onValueChange={handleStatusChange}>
                          <SelectTrigger className="w-full">
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
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase">Parent</p>
                        <p className="text-sm text-slate-700">{selectedFeedback.parent?.parentName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase">Student</p>
                        <p className="text-sm text-slate-700">{selectedFeedback.student?.name || 'N/A'}</p>
                        {selectedFeedback.student?.class && (
                          <p className="text-xs text-slate-500">
                            {selectedFeedback.student.class.className} {selectedFeedback.student.class.section}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase">Tagged Teachers</p>
                        {selectedFeedback.teacherIds && selectedFeedback.teacherIds.length > 0 ? (
                          <div className="space-y-1">
                            {selectedFeedback.teacherIds.map((teacher, idx) => (
                              <p key={idx} className="text-sm text-slate-700">
                                {teacher.teacherName || teacher.name || 'Teacher'}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500">None</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase">Created</p>
                        <p className="text-sm text-slate-700">{formatDate(selectedFeedback.createdAt)}</p>
                      </div>
                    </div>
                    {selectedFeedback.description && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase">Description</p>
                        <p className="mt-1 text-sm text-slate-700">{selectedFeedback.description}</p>
                      </div>
                    )}
                    {selectedFeedback.attachments && selectedFeedback.attachments.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase">Attachments</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedFeedback.attachments.map((att, idx) => (
                            <a
                              key={idx}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded bg-white border border-slate-200 px-3 py-1.5 text-sm text-violet-600 hover:bg-violet-50"
                            >
                              <FileIcon className="h-4 w-4" />
                              {att.name || 'Attachment'}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Conversation Messages */}
                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-slate-700">Conversation</h4>
                    {!selectedFeedback.messages || selectedFeedback.messages.length === 0 ? (
                      <p className="text-sm text-slate-500">No conversation yet.</p>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {selectedFeedback.messages.map((message, index) => (
                          <div
                            key={index}
                            className={cn(
                              'rounded-lg p-3',
                              message.senderRole === 'parent'
                                ? 'bg-violet-50 border border-violet-100'
                                : 'bg-slate-50 border border-slate-200'
                            )}
                          >
                            <div className="mb-2 flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
                                {message.senderRole === 'parent' ? (
                                  <User className="h-4 w-4 text-violet-600" />
                                ) : (
                                  <GraduationCap className="h-4 w-4 text-slate-600" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-900">{message.senderName || 'User'}</p>
                                <p className="text-xs text-slate-500">
                                  {message.senderRole === 'parent' ? 'Parent' : message.senderRole === 'teacher' ? 'Teacher' : 'Admin'}
                                  {message.createdAt && ` • ${formatDateTime(message.createdAt)}`}
                                </p>
                              </div>
                            </div>
                            {message.content && (
                              <p className="text-sm text-slate-700">{message.content}</p>
                            )}
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {message.attachments.map((att, idx) => (
                                  <a
                                    key={idx}
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 rounded bg-white border border-slate-200 px-2 py-1 text-xs text-violet-600 hover:bg-violet-50"
                                  >
                                    <FileIcon className="h-3 w-3" />
                                    {att.name || 'Attachment'}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Reply Box */}
                  <div className="rounded-lg border border-slate-200 p-4">
                    <h4 className="mb-3 text-sm font-semibold text-slate-700">Reply</h4>
                    <Textarea
                      rows={3}
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Write your reply..."
                      className="mb-3"
                    />
                    <div className="mb-3">
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
                      {replyAttachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {replyAttachments.map((file, index) => (
                            <div key={index} className="flex items-center justify-between rounded border border-slate-200 bg-white p-2 text-xs">
                              <span className="text-slate-700">{file.name}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setReplyAttachments(prev => prev.filter((_, i) => i !== index))}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={handleSendReply} disabled={sendingReply}>
                        {sendingReply ? 'Sending...' : 'Send Reply'}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-slate-500">Feedback not found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </PageStack>
  );
}