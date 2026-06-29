import { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Paperclip, Download, ExternalLink, X } from 'lucide-react';
import api from '@/lib/api';
import { formatDisplayDate } from '@/lib/dateFormatter';
import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export default function TeacherNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

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

  const openDetailsModal = (notification) => {
    setSelectedNotification(notification);
    setDetailsModalOpen(true);
  };

  const getAttachmentUrl = (url) => {
    return url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${url}`;
  };

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
                <TableHead className="font-semibold text-slate-700 px-4 py-3">Attachment</TableHead>
                <TableHead className="font-semibold text-slate-700 px-4 py-3">Status</TableHead>
                <TableHead className="font-semibold text-slate-700 px-4 py-3">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : notifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
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
                    <TableCell className="px-4 py-3 font-medium">
                      <button
                        onClick={() => openDetailsModal(notification)}
                        className="text-left hover:text-indigo-600 transition-colors"
                      >
                        {notification.title}
                      </button>
                    </TableCell>
                    <TableCell className="px-4 py-3 max-w-xs truncate">{notification.message}</TableCell>
                    <TableCell className="px-4 py-3 text-sm">
                      {notification.senderId?.name || 'Unknown'}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm">{formatDate(notification.createdAt)}</TableCell>
                    <TableCell className="px-4 py-3">
                      {notification.attachmentUrl ? (
                        <div className="flex flex-col gap-2">
                          {notification.attachmentType?.startsWith('image/') ? (
                            <div className="relative">
                              <img
                                src={notification.attachmentUrl.startsWith('http') ? notification.attachmentUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${notification.attachmentUrl}`}
                                alt={notification.attachmentName}
                                className="h-16 w-16 rounded-lg object-cover border border-slate-200"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Paperclip className="h-4 w-4 text-slate-500" />
                            </div>
                          )}
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => {
                                const url = notification.attachmentUrl.startsWith('http') 
                                  ? notification.attachmentUrl 
                                  : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${notification.attachmentUrl}`;
                                window.open(url, '_blank');
                              }}
                              title="View"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => {
                                const url = notification.attachmentUrl.startsWith('http') 
                                  ? notification.attachmentUrl 
                                  : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${notification.attachmentUrl}`;
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = notification.attachmentName;
                                link.click();
                              }}
                              title="Download"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
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

      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Notification Details</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDetailsModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <DialogBody>
          {selectedNotification && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{selectedNotification.title}</h3>
                <p className="text-sm text-slate-500 mt-1">
                  From: {selectedNotification.senderId?.name || 'Unknown'}
                </p>
                <p className="text-sm text-slate-500">
                  Date: {formatDate(selectedNotification.createdAt)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-slate-700 whitespace-pre-wrap">{selectedNotification.message}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700">Priority:</span>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-semibold uppercase',
                    getPriorityColor(selectedNotification.priority)
                  )}
                >
                  {selectedNotification.priority}
                </span>
              </div>
              {selectedNotification.attachmentUrl && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    {selectedNotification.attachmentType?.startsWith('image/') ? (
                      <img
                        src={getAttachmentUrl(selectedNotification.attachmentUrl)}
                        alt={selectedNotification.attachmentName}
                        className="h-32 w-32 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <Paperclip className="h-6 w-6 text-slate-500 mt-1 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 mb-2">
                        Attachment: {selectedNotification.attachmentName}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(getAttachmentUrl(selectedNotification.attachmentUrl), '_blank')}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open Attachment
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = getAttachmentUrl(selectedNotification.attachmentUrl);
                            link.download = selectedNotification.attachmentName;
                            link.click();
                          }}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </PageStack>
  );
}
