import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, X, Paperclip, Download, ExternalLink } from 'lucide-react';
import api from '@/lib/api';
import { formatDisplayDate } from '@/lib/dateFormatter';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function NotificationPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      const userId = localStorage.getItem('userId');
      // Only show notifications where the user is a recipient, not the sender
      const receivedNotifications = (res.data.notifications || []).filter(
        (n) => n.senderId._id !== userId
      );
      setNotifications(receivedNotifications);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
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

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/mark-read`);
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId
            ? { ...n, readBy: [...(n.readBy || []), localStorage.getItem('userId')] }
            : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
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
          readBy: [...(n.readBy || []), localStorage.getItem('userId')],
        }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'important':
        return 'bg-orange-50 border-orange-200 text-orange-700';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-700';
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700';
      case 'important':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return formatDisplayDate(date);
  };

  const userId = localStorage.getItem('userId');
  const isUnread = (notification) => !notification.readBy?.includes(userId);

  const handleNotificationClick = (notification) => {
    if (isUnread(notification)) {
      markAsRead(notification._id);
    }
    
    if (notification.subscriptionRequestId) {
      setIsOpen(false);
      navigate(`/super-admin/subscription-requests?requestId=${notification.subscriptionRequestId}`);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative rounded-xl hover:bg-slate-100 text-slate-500"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-96 rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <h3 className="font-semibold text-slate-900">Notifications</h3>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                  onClick={markAllAsRead}
                >
                  <CheckCheck className="mr-1 h-3 w-3" />
                  Mark all read
                </Button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center p-8 text-slate-500">
                  Loading...
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 p-8 text-slate-500">
                  <Bell className="h-8 w-8" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification._id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      'border-b border-slate-100 p-4 transition-colors',
                      isUnread(notification) ? 'bg-indigo-50/50' : 'bg-white',
                      notification.subscriptionRequestId ? 'cursor-pointer hover:bg-slate-50' : ''
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
                          getPriorityColor(notification.priority)
                        )}
                      >
                        <Bell className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 truncate">{notification.title}</p>
                            <p className="mt-1 text-sm text-slate-600 line-clamp-2">{notification.message}</p>
                          </div>
                          <span
                            className={cn(
                              'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                              getPriorityBadge(notification.priority)
                            )}
                          >
                            {notification.priority}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-slate-500">{formatDate(notification.createdAt)}</span>
                          {isUnread(notification) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification._id);
                              }}
                            >
                              <Check className="mr-1 h-3 w-3" />
                              Mark read
                            </Button>
                          )}
                        </div>
                        {notification.attachmentUrl && (
                          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <div className="flex items-start gap-3">
                              {notification.attachmentType?.startsWith('image/') ? (
                                <img
                                  src={notification.attachmentUrl.startsWith('http') ? notification.attachmentUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${notification.attachmentUrl}`}
                                  alt={notification.attachmentName}
                                  className="h-16 w-16 rounded-lg object-cover border border-slate-200 shrink-0"
                                />
                              ) : (
                                <Paperclip className="h-4 w-4 text-slate-500 mt-1 shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-700 truncate">
                                  Attachment: {notification.attachmentName}
                                </p>
                                <div className="mt-2 flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const url = notification.attachmentUrl.startsWith('http') 
                                        ? notification.attachmentUrl 
                                        : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${notification.attachmentUrl}`;
                                      window.open(url, '_blank');
                                    }}
                                  >
                                    <ExternalLink className="mr-1 h-3 w-3" />
                                    View
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const url = notification.attachmentUrl.startsWith('http') 
                                        ? notification.attachmentUrl 
                                        : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${notification.attachmentUrl}`;
                                      const link = document.createElement('a');
                                      link.href = url;
                                      link.download = notification.attachmentName;
                                      link.click();
                                    }}
                                  >
                                    <Download className="mr-1 h-3 w-3" />
                                    Download
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

          <div className="border-t border-slate-100 p-3">
              <Button
                variant="ghost"
                className="w-full text-sm font-medium text-slate-600 hover:text-slate-900"
                onClick={() => {
                  setIsOpen(false);
                  
                  // URL check karke sahi notifications page par bhejega
                  const path = window.location.pathname;
                  if (path.includes('/super-admin')) {
                    navigate('/super-admin/notifications');
                  } else if (path.includes('/teacher')) {
                    navigate('/teacher/notifications');
                  } else if (path.includes('/parent')) {
                    navigate('/parent/notifications');
                  } else {
                    navigate('/notifications');
                  }
                }}
              >
                View all notifications
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}