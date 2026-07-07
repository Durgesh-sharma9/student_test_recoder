import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import api from '@/lib/api';
import { formatDisplayDate } from '@/lib/dateFormatter';
import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Bell, FileText, ExternalLink, Check } from 'lucide-react';
import PollModal from '@/components/PollModal';

export default function ParentNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPollId, setSelectedPollId] = useState(null);
  const [pollModalOpen, setPollModalOpen] = useState(false);
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

  return (
    <PageStack>
      <PageHeader
        title="Notifications"
        description="View announcements and important updates"
      />

      <div className="flex justify-end mb-4">
        <Button
          onClick={markAllAsRead}
          variant="outline"
          className="rounded-xl w-full sm:w-auto"
        >
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
      <PollModal open={pollModalOpen} onOpenChange={setPollModalOpen} pollId={selectedPollId} />
    </PageStack>
  );
}