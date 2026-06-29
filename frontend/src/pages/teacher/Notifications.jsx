import { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Paperclip, Download, ExternalLink, X } from 'lucide-react';
import api from '@/lib/api';
import { formatDisplayDate } from '@/lib/dateFormatter';
import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog';
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
    } catch (error) { console.error('Failed to fetch notifications:', error); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchNotifications(); }, []);

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
      case 'urgent': return 'bg-red-100 text-red-700 border-red-200';
      case 'important': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const userId = localStorage.getItem('userId');
  const isUnread = (notification) => !notification.readBy?.includes(userId);
  const getAttachmentUrl = (url) => url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${url}`;

  return (
    <PageStack>
      <PageHeader title="Notifications" description="View notifications from School Admin." />

      <ErpSection title="Received Notifications" icon={Bell} tone="amber">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
              <CheckCheck className="mr-2 h-4 w-4" /> Mark All Read
            </Button>
          )}
          <div className="text-sm text-slate-600">Total: {notifications.length} | Unread: {unreadCount}</div>
        </div>

        {/* LAPTOP VIEW: Table */}
        <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Priority</TableHead><TableHead>Title</TableHead><TableHead>Message</TableHead><TableHead>From</TableHead><TableHead>Date</TableHead><TableHead>Attachment</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications.map((n) => (
                <TableRow key={n._id} className={cn(isUnread(n) && 'bg-indigo-50/50')}>
                  <TableCell><span className={cn('px-2 py-1 rounded-full text-xs font-bold uppercase', getPriorityColor(n.priority))}>{n.priority}</span></TableCell>
                  <TableCell className="font-medium cursor-pointer hover:text-indigo-600" onClick={() => { setSelectedNotification(n); setDetailsModalOpen(true); }}>{n.title}</TableCell>
                  <TableCell className="max-w-xs truncate">{n.message}</TableCell>
                  <TableCell>{n.senderId?.name}</TableCell>
                  <TableCell>{formatDisplayDate(n.createdAt)}</TableCell>
                  <TableCell>
                    {n.attachmentUrl ? (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => window.open(getAttachmentUrl(n.attachmentUrl), '_blank')}><ExternalLink className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => {
                          const link = document.createElement('a'); link.href = getAttachmentUrl(n.attachmentUrl); link.download = n.attachmentName || 'download'; link.click();
                        }}><Download className="h-4 w-4" /></Button>
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell>{isUnread(n) ? 'Unread' : 'Read'}</TableCell>
                  <TableCell>{isUnread(n) && <Button variant="ghost" size="sm" onClick={() => handleMarkAsRead(n._id)}><Check className="h-4 w-4" /></Button>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* MOBILE VIEW: Cards */}
        <div className="md:hidden space-y-3">
          {notifications.map((n) => (
            <div key={n._id} className={cn("p-4 rounded-xl border border-slate-200 bg-white shadow-sm", isUnread(n) && "border-indigo-200 bg-indigo-50/30")}>
              <div className="flex justify-between items-center mb-2">
                <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase', getPriorityColor(n.priority))}>{n.priority}</span>
                {isUnread(n) && <Button variant="ghost" size="sm" onClick={() => handleMarkAsRead(n._id)}><Check className="h-4 w-4" /></Button>}
              </div>
              <h3 className="font-bold text-slate-900 cursor-pointer" onClick={() => { setSelectedNotification(n); setDetailsModalOpen(true); }}>{n.title}</h3>
              <p className="text-xs text-slate-600 my-1 truncate">{n.message}</p>
              <div className="flex justify-between items-center text-[10px] text-slate-400">
                <span>{n.senderId?.name} • {formatDisplayDate(n.createdAt)}</span>
                {n.attachmentUrl && <Button variant="link" size="sm" className="h-auto p-0 text-[10px]" onClick={() => window.open(getAttachmentUrl(n.attachmentUrl), '_blank')}>View Attachment</Button>}
              </div>
            </div>
          ))}
        </div>
      </ErpSection>

      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-2xl w-[95%]">
          <DialogHeader><DialogTitle>Notification Details</DialogTitle></DialogHeader>
          {selectedNotification && (
            <div className="space-y-4">
              <p className="text-slate-700 whitespace-pre-wrap">{selectedNotification.message}</p>
              {selectedNotification.attachmentUrl && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.open(getAttachmentUrl(selectedNotification.attachmentUrl), '_blank')}><ExternalLink className="mr-2 h-4 w-4" /> Open Attachment</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageStack>
  );
}