import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import api from '@/lib/api';
import { formatDisplayDate } from '@/lib/dateFormatter';
import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Bell, FileText, ExternalLink, Check, BarChart3 } from 'lucide-react';
import PollModal from '@/components/PollModal';
import FeedbackPanel from '@/components/FeedbackPanel';

export default function ParentNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPollId, setSelectedPollId] = useState(null);
  const [pollModalOpen, setPollModalOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    const pollId = searchParams.get('pollId');
    if (pollId && notifications.some((notification) => notification.pollId === pollId)) {
      setSelectedPollId(pollId);
      setPollModalOpen(true);
    }
  }, [searchParams, notifications]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
    } catch (error) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/mark-read`);
      setNotifications(notifications.map(n => 
        n._id === notificationId ? { ...n, read: true } : n
      ));
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const openNotification = (notification) => {
    if (notification.type === 'poll' && notification.pollId) {
      setSelectedPollId(notification.pollId);
      setPollModalOpen(true);
      return;
    }
  };

  const openPollAnalytics = async () => {
    const pollNotification = notifications.find((notification) => notification.type === 'poll' && notification.pollId);
    if (!pollNotification?.pollId) {
      toast.error('No poll notifications available yet');
      return;
    }

    try {
      setAnalyticsLoading(true);
      const res = await api.get(`/polls/${pollNotification.pollId}/analytics`);
      setAnalyticsData(res.data.analytics);
      setAnalyticsOpen(true);
    } catch (error) {
      toast.error('Failed to load poll analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  return (
    <PageStack>
      <PageHeader
        title="Notifications"
        description="View announcements and important updates"
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button onClick={openPollAnalytics} variant="outline" className="rounded-xl w-full sm:w-auto">
          <BarChart3 className="mr-2 h-4 w-4 shrink-0" />
          Poll Analytics
        </Button>
        <Button onClick={markAllAsRead} variant="outline" className="rounded-xl w-full sm:w-auto">
          <Check className="mr-2 h-4 w-4 shrink-0" />
          Mark All as Read
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-500">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <ErpSection title="No Notifications" icon={Bell} tone="blue">
          <p className="text-sm text-slate-500">You have no notifications at this time.</p>
        </ErpSection>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div
              key={notification._id}
              onClick={() => openNotification(notification)}
              className={`rounded-xl border bg-white p-4 shadow-sm transition-all cursor-pointer ${
                !notification.read ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1 w-full min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {!notification.read && (
                      <span className="h-2 w-2 rounded-full bg-indigo-600 shrink-0" />
                    )}
                    <h3 className="font-semibold text-slate-900 break-words">
                      {notification.title}
                    </h3>
                  </div>
                  <p className="text-sm text-slate-600 mb-3 break-words">{notification.message}</p>
                  
                  {notification.attachmentUrl && (
                    <div className="mb-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(notification.attachmentUrl, '_blank')}
                        className="rounded-lg max-w-full flex items-center"
                      >
                        <FileText className="mr-2 h-4 w-4 shrink-0" />
                        <span className="truncate">{notification.attachmentName}</span>
                        <ExternalLink className="ml-2 h-3 w-3 shrink-0" />
                      </Button>
                    </div>
                  )}

                  <div className="text-xs text-slate-500">
                    {formatDisplayDate(notification.createdAt)}
                  </div>
                </div>

                {!notification.read && (
                  <Button
                    size="sm"
                    onClick={() => markAsRead(notification._id)}
                    variant="outline"
                    className="rounded-xl shrink-0 w-full sm:w-auto"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Mark Read
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {analyticsOpen && analyticsData && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Poll Analytics</h3>
          <p className="mt-1 text-sm text-slate-600">{analyticsData.poll?.title}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
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
        </div>
      )}

      <div className="mt-6">
        <FeedbackPanel role="parent" />
      </div>

      <PollModal open={pollModalOpen} onOpenChange={setPollModalOpen} pollId={selectedPollId} />
    </PageStack>
  );
}