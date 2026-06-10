import { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import api from '@/lib/api';
import { formatDisplayDate } from '@/lib/dateFormatter';
import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export default function TeacherNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/mark-read`);
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'important':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const formatDate = (dateString) => {
    return formatDisplayDate(dateString);
  };

  const userId = localStorage.getItem('userId');
  const isUnread = (notification) => !notification.readBy?.includes(userId);

  return (
    <PageStack>
      <PageHeader
        title="Notifications"
        description="View notifications from School Admin."
      />

      <ErpSection title="Received Notifications" icon={Bell} tone="amber">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
                <CheckCheck className="mr-2 h-4 w-4" />
                Mark All Read
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>Total: {notifications.length}</span>
            <span>|</span>
            <span className="font-semibold text-indigo-600">Unread: {unreadCount}</span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 border-b border-slate-200">
                <TableHead className="font-semibold text-slate-700 px-4 py-3">Priority</TableHead>
                <TableHead className="font-semibold text-slate-700 px-4 py-3">Title</TableHead>
                <TableHead className="font-semibold text-slate-700 px-4 py-3">Message</TableHead>
                <TableHead className="font-semibold text-slate-700 px-4 py-3">From</TableHead>
                <TableHead className="font-semibold text-slate-700 px-4 py-3">Received At</TableHead>
                <TableHead className="font-semibold text-slate-700 px-4 py-3">Status</TableHead>
                <TableHead className="font-semibold text-slate-700 px-4 py-3">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : notifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    No notifications found
                  </TableCell>
                </TableRow>
              ) : (
                notifications.map((notification) => (
                  <TableRow
                    key={notification._id}
                    className={cn(
                      'hover:bg-slate-50 transition-colors border-b border-slate-100',
                      isUnread(notification) && 'bg-indigo-50/50'
                    )}
                  >
                    <TableCell className="px-4 py-3">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-xs font-semibold uppercase',
                          getPriorityColor(notification.priority)
                        )}
                      >
                        {notification.priority}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 font-medium">{notification.title}</TableCell>
                    <TableCell className="px-4 py-3 max-w-xs truncate">{notification.message}</TableCell>
                    <TableCell className="px-4 py-3 text-sm">
                      {notification.senderId?.name || 'Unknown'}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm">{formatDate(notification.createdAt)}</TableCell>
                    <TableCell className="px-4 py-3">
                      {isUnread(notification) ? (
                        <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                          Unread
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          Read
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {isUnread(notification) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsRead(notification._id)}
                          title="Mark as Read"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </ErpSection>
    </PageStack>
  );
}
