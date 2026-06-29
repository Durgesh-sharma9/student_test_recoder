import { useState, useEffect } from 'react';
import { Bell, Check, ExternalLink, Download, Paperclip } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDisplayDate } from '@/lib/dateFormatter';
import { toast } from 'sonner';

export default function SuperNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const userId = localStorage.getItem('userId');

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      // Only show received notifications (not the ones sent by super admin)
      const received = (res.data.notifications || []).filter(
        (n) => n.senderId?._id !== userId
      );
      setNotifications(received);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/mark-read`);
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === id
            ? { ...n, readBy: [...(n.readBy || []), userId] }
            : n
        )
      );
      toast.success('Marked as read');
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          readBy: [...(n.readBy || []), userId],
        }))
      );
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const isUnread = (notification) => !notification.readBy?.includes(userId);

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700';
      case 'important': return 'bg-orange-100 text-orange-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  return (
    <PageStack>
      <PageHeader
        title="All Notifications"
        description="View and manage all your platform alerts and payment updates."
      />

      <ErpSection
        title="Recent Alerts"
        icon={Bell}
        action={
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            Mark All as Read
          </Button>
        }
      >
        {loading ? (
          <div className="flex justify-center p-8 text-slate-500">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-slate-500">
            <Bell className="h-12 w-12 opacity-20" />
            <p>No notifications found.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {notifications.map((notification) => (
              <div
                key={notification._id}
                className={cn(
                  'flex flex-col sm:flex-row gap-4 rounded-xl border p-4 transition-all',
                  isUnread(notification) ? 'bg-indigo-50/40 border-indigo-100' : 'bg-white border-slate-200'
                )}
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{notification.title}</h3>
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', getPriorityBadge(notification.priority))}>
                      {notification.priority}
                    </span>
                    {isUnread(notification) && (
                      <span className="flex h-2 w-2 rounded-full bg-indigo-600"></span>
                    )}
                  </div>
                  
                  <p className="text-sm text-slate-600">{notification.message}</p>
                  
                  <div className="flex items-center gap-4 text-xs font-medium text-slate-400 pt-2">
                    <span>{new Date(notification.createdAt).toLocaleString()}</span>
                    {notification.senderId && (
                      <span>From: {notification.senderId.name || 'System'}</span>
                    )}
                  </div>

                  {/* Attachments Section */}
                  {notification.attachmentUrl && (
                    <div className="mt-3 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
                      <Paperclip className="h-4 w-4 text-slate-400" />
                      <span className="text-sm truncate max-w-[200px] sm:max-w-xs">{notification.attachmentName}</span>
                      <div className="ml-auto flex gap-2">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => window.open(notification.attachmentUrl, '_blank')}>
                          <ExternalLink className="h-3 w-3 mr-1" /> View
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-start sm:justify-end shrink-0">
                  {isUnread(notification) && (
                    <Button variant="outline" size="sm" onClick={() => markAsRead(notification._id)}>
                      <Check className="h-4 w-4 mr-1" /> Mark Read
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ErpSection>
    </PageStack>
  );
}