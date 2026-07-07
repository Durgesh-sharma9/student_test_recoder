import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bell, Check, CheckCheck, Paperclip, Download, ExternalLink, X } from 'lucide-react';
import api from '@/lib/api';
import { formatDisplayDate } from '@/lib/dateFormatter';
import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import PollModal from '@/components/PollModal';
import FeedbackPanel from '@/components/FeedbackPanel';

export default function TeacherNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedPollId, setSelectedPollId] = useState(null);
  const [pollModalOpen, setPollModalOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [searchParams] = useSearchParams();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (error) { console.error('Failed to fetch notifications:', error); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchNotifications(); }, []);

  useEffect(() => {
    const pollId = searchParams.get('pollId');
    if (pollId && notifications.some((notification) => notification.pollId === pollId)) {
      setSelectedPollId(pollId);
      setPollModalOpen(true);
    }
  }, [searchParams, notifications]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/mark-read`);
      fetchNotifications();
    } catch (error) { console.error('Failed to mark as read:', error); }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      fetchNotifications();
    } catch (error) { console.error('Failed to mark all as read:', error); }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-50 text-red-700 border-red-200';
      case 'important': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const userId = localStorage.getItem('userId');
  const isUnread = (notification) => !notification.readBy?.includes(userId);
  const getAttachmentUrl = (url) => url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${url}`;

  const openNotification = (notification) => {
    setSelectedNotification(notification);
    if (notification.type === 'poll' && notification.pollId) {
      setSelectedPollId(notification.pollId);
      setPollModalOpen(true);
      return;
    }
    setDetailsModalOpen(true);
  };

  const openPollAnalytics = async () => {
    const pollNotification = notifications.find((notification) => notification.type === 'poll' && notification.pollId);
    if (!pollNotification?.pollId) {
      return;
    }

    try {
      setAnalyticsLoading(true);
      const res = await api.get(`/polls/${pollNotification.pollId}/analytics`);
      setAnalyticsData(res.data.analytics);
      setAnalyticsOpen(true);
    } catch (error) {
      console.error('Failed to load poll analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  return (
    <PageStack>
      <style>{`
        .soft-red-grad { background: linear-gradient(135deg, #fef2f2 0%, #ffffff 100%) !important; }
        .table-head-red { background: linear-gradient(90deg, #fee2e2 0%, #fef2f2 100%) !important; border-bottom: 2px solid #fecaca !important; }
      `}</style>

      <PageHeader title="Notifications" description="View notifications from School Admin." />

      <div className="mb-4 flex justify-end">
        <Button variant="outline" size="sm" onClick={openPollAnalytics} className="rounded-lg">
          Poll Analytics
        </Button>
      </div>

      {analyticsOpen && analyticsData && (
        <ErpSection title="Poll Analytics" icon={Bell} tone="red">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs uppercase text-slate-500">Responses</div>
              <div className="text-xl font-semibold text-slate-900">{analyticsData.summary?.responsesReceived || 0}</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs uppercase text-slate-500">Pending</div>
              <div className="text-xl font-semibold text-slate-900">{analyticsData.summary?.pendingResponses || 0}</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs uppercase text-slate-500">Completion</div>
              <div className="text-xl font-semibold text-slate-900">{analyticsData.summary?.completionPercent || 0}%</div>
            </div>
          </div>
        </ErpSection>
      )}

      <ErpSection className="soft-red-grad" title="Received Notifications" icon={Bell} tone="red">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-2.5">
          <div className="text-sm font-medium text-slate-600 px-1">
            Total: <span className="text-slate-900">{notifications.length}</span> 
            <span className="mx-2 text-slate-300">|</span> 
            Unread: <span className="text-red-600 font-semibold">{unreadCount}</span>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead} className="h-8 rounded-md bg-white shadow-sm w-full sm:w-auto">
              <CheckCheck className="mr-1.5 h-3.5 w-3.5 text-red-600" /> Mark All Read
            </Button>
          )}
        </div>

        <div className="hidden md:block overflow-x-auto rounded-lg border border-red-100 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="table-head-red hover:bg-transparent">
                <TableHead className="w-[100px] h-9 py-2 text-xs font-bold text-red-900">Priority</TableHead>
                <TableHead className="w-[200px] h-9 py-2 text-xs font-bold text-red-900">Title</TableHead>
                <TableHead className="min-w-[200px] h-9 py-2 text-xs font-bold text-red-900">Message</TableHead>
                <TableHead className="w-[150px] h-9 py-2 text-xs font-bold text-red-900">From</TableHead>
                <TableHead className="w-[120px] h-9 py-2 text-xs font-bold text-red-900">Date</TableHead>
                <TableHead className="w-[100px] h-9 py-2 text-xs font-bold text-red-900 text-center">Files</TableHead>
                <TableHead className="w-[80px] h-9 py-2 text-xs font-bold text-red-900 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-sm text-slate-500">No notifications found.</TableCell>
                </TableRow>
              ) : (
                notifications.map((n) => (
                  <TableRow key={n._id} className={cn("transition-colors hover:bg-red-50/30", isUnread(n) ? "bg-red-50/10" : "text-slate-600")}>
                    <TableCell className="py-2.5">
                      <span className={cn('inline-flex items-center justify-center px-2 py-0.5 rounded-md border text-[11px] font-semibold uppercase tracking-wider', getPriorityColor(n.priority))}>
                        {n.priority}
                      </span>
                    </TableCell>
                    <TableCell className={cn("py-2.5 cursor-pointer hover:text-red-700 transition-colors", isUnread(n) ? "font-semibold text-slate-900" : "font-medium")} onClick={() => openNotification(n)}>
                      {n.title}
                    </TableCell>
                    <TableCell className="py-2.5 max-w-[250px] truncate text-sm">{n.message}</TableCell>
                    <TableCell className="py-2.5 text-sm whitespace-nowrap">{n.senderId?.name}</TableCell>
                    <TableCell className="py-2.5 text-xs text-slate-500 whitespace-nowrap">{formatDisplayDate(n.createdAt)}</TableCell>
                    <TableCell className="py-2.5 text-center">
                      {n.attachmentUrl ? (
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-md hover:bg-red-50" onClick={() => window.open(getAttachmentUrl(n.attachmentUrl), '_blank')}><ExternalLink className="h-3.5 w-3.5 text-slate-500" /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-md hover:bg-red-50" onClick={() => { const link = document.createElement('a'); link.href = getAttachmentUrl(n.attachmentUrl); link.download = n.attachmentName || 'download'; link.click(); }}><Download className="h-3.5 w-3.5 text-slate-500" /></Button>
                        </div>
                      ) : (<span className="text-slate-300">-</span>)}
                    </TableCell>
                    <TableCell className="py-2.5 text-center">
                      {isUnread(n) ? (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-md hover:bg-red-100 hover:text-red-700 text-slate-400" onClick={() => handleMarkAsRead(n._id)}><Check className="h-4 w-4" /></Button>
                      ) : (<CheckCheck className="h-4 w-4 text-emerald-500 mx-auto" />)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {/* Mobile cards same as before... */}
      </ErpSection>
      <div className="mt-6">
        <FeedbackPanel role="teacher" />
      </div>

      <PollModal open={pollModalOpen} onOpenChange={setPollModalOpen} pollId={selectedPollId} />
    </PageStack>
  );
}