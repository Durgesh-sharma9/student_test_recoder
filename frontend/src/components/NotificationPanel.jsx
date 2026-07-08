import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, Check, CheckCheck, X, Paperclip, Download, ExternalLink, BarChart3, Vote } from 'lucide-react';
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
  const location = useLocation();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      // Use notifications directly from backend - backend already handles role-based filtering
      // Sort newest first and limit to 8
      const sortedNotifications = (res.data.notifications || [])
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 8);
      setNotifications(sortedNotifications);
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
      // Refresh notifications to get updated readBy array from database
      await fetchNotifications();
      // Fetch unread count from API to ensure accuracy
      await fetchUnreadCount();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      // Refresh notifications to get updated readBy array from database
      await fetchNotifications();
      // Fetch unread count from API to ensure accuracy
      await fetchUnreadCount();
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
    // Mark as read when notification is opened
    if (isUnread(notification)) {
      markAsRead(notification._id);
    }

    if (notification.subscriptionRequestId) {
      setIsOpen(false);
      navigate(`/super-admin/subscription-requests?requestId=${notification.subscriptionRequestId}`);
      return;
    }

    if (notification.type === 'poll' && notification.pollId) {
      setIsOpen(false);
      const path = location.pathname;
      if (path.includes('/super-admin')) {
        navigate(`/super-admin/notifications?pollId=${notification.pollId}`);
      } else if (path.includes('/teacher')) {
        navigate(`/teacher/notifications?pollId=${notification.pollId}`);
      } else if (path.includes('/parent')) {
        navigate(`/parent/notifications?pollId=${notification.pollId}`);
      } else {
        navigate(`/admin/notifications?pollId=${notification.pollId}`);
      }
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
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-96 rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900">Notifications</h3>
                <span className="text-xs font-medium text-slate-500">({notifications.length})</span>
              </div>
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
                      'border-b border-slate-100 p-4 transition-colors cursor-pointer hover:bg-slate-50 relative',
                      isUnread(notification) ? 'bg-slate-50' : 'bg-white',
                      isUnread(notification) && 'border-l-4 border-l-indigo-500'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
                          getPriorityColor(notification.priority)
                        )}
                      >
                        {notification.type === 'poll' ? <BarChart3 className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={cn("font-medium truncate", isUnread(notification) ? "font-bold text-slate-900" : "text-slate-900")}>{notification.title}</p>
                            <p className={cn("mt-1 line-clamp-2", isUnread(notification) ? "text-sm font-semibold text-slate-800" : "text-sm text-slate-600")}>{notification.message}</p>
                            {notification.type === 'poll' && (
                              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-violet-700">
                                <Vote className="h-3 w-3" /> Poll
                              </div>
                            )}
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