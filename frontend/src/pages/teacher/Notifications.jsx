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
      case 'urgent': return 'bg-red-50 text-red-700 border-red-200';
      case 'important': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const userId = localStorage.getItem('userId');
  const isUnread = (notification) => !notification.readBy?.includes(userId);
  const getAttachmentUrl = (url) => url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${url}`;

  return (
    <PageStack>
      <PageHeader title="Notifications" description="View notifications from School Admin." />

      <ErpSection title="Received Notifications" icon={Bell} tone="amber">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-2.5">
          <div className="text-sm font-medium text-slate-600 px-1">
            Total: <span className="text-slate-900">{notifications.length}</span> 
            <span className="mx-2 text-slate-300">|</span> 
            Unread: <span className="text-indigo-600 font-semibold">{unreadCount}</span>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead} className="h-8 rounded-md bg-white shadow-sm w-full sm:w-auto">
              <CheckCheck className="mr-1.5 h-3.5 w-3.5 text-indigo-600" /> Mark All Read
            </Button>
          )}
        </div>

        {/* LAPTOP VIEW: Table */}
        <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="w-[100px] h-9 py-2 text-xs font-semibold">Priority</TableHead>
                <TableHead className="w-[200px] h-9 py-2 text-xs font-semibold">Title</TableHead>
                <TableHead className="min-w-[200px] h-9 py-2 text-xs font-semibold">Message</TableHead>
                <TableHead className="w-[150px] h-9 py-2 text-xs font-semibold">From</TableHead>
                <TableHead className="w-[120px] h-9 py-2 text-xs font-semibold">Date</TableHead>
                <TableHead className="w-[100px] h-9 py-2 text-xs font-semibold text-center">Files</TableHead>
                <TableHead className="w-[80px] h-9 py-2 text-xs font-semibold text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-sm text-slate-500">No notifications found.</TableCell>
                </TableRow>
              ) : (
                notifications.map((n) => (
                  <TableRow 
                    key={n._id} 
                    className={cn(
                      "transition-colors hover:bg-slate-50/80", 
                      isUnread(n) ? "bg-indigo-50/20" : "text-slate-600"
                    )}
                  >
                    <TableCell className="py-2.5">
                      <span className={cn('inline-flex items-center justify-center px-2 py-0.5 rounded-md border text-[11px] font-semibold uppercase tracking-wider', getPriorityColor(n.priority))}>
                        {n.priority}
                      </span>
                    </TableCell>
                    <TableCell 
                      className={cn("py-2.5 cursor-pointer hover:text-indigo-600 transition-colors", isUnread(n) ? "font-semibold text-slate-900" : "font-medium")} 
                      onClick={() => { setSelectedNotification(n); setDetailsModalOpen(true); }}
                    >
                      {n.title}
                    </TableCell>
                    <TableCell className="py-2.5 max-w-[250px] truncate text-sm">
                      {n.message}
                    </TableCell>
                    <TableCell className="py-2.5 text-sm whitespace-nowrap">
                      {n.senderId?.name}
                    </TableCell>
                    <TableCell className="py-2.5 text-xs text-slate-500 whitespace-nowrap">
                      {formatDisplayDate(n.createdAt)}
                    </TableCell>
                    <TableCell className="py-2.5 text-center">
                      {n.attachmentUrl ? (
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-md hover:bg-slate-100" onClick={() => window.open(getAttachmentUrl(n.attachmentUrl), '_blank')} title="Open in new tab">
                            <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-md hover:bg-slate-100" onClick={() => {
                            const link = document.createElement('a'); link.href = getAttachmentUrl(n.attachmentUrl); link.download = n.attachmentName || 'download'; link.click();
                          }} title="Download">
                            <Download className="h-3.5 w-3.5 text-slate-500" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2.5 text-center">
                      {isUnread(n) ? (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0 rounded-md hover:bg-indigo-100 hover:text-indigo-700 text-slate-400" 
                          onClick={() => handleMarkAsRead(n._id)}
                          title="Mark as read"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      ) : (
                        <CheckCheck className="h-4 w-4 text-emerald-500 mx-auto" />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* MOBILE VIEW: Cards */}
        <div className="md:hidden space-y-2.5">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500 border border-slate-200 rounded-lg bg-white">No notifications found.</div>
          ) : (
            notifications.map((n) => (
              <div 
                key={n._id} 
                className={cn(
                  "flex flex-col gap-2 p-3.5 rounded-lg border shadow-sm transition-colors", 
                  isUnread(n) ? "border-indigo-200 bg-indigo-50/30" : "border-slate-200 bg-white"
                )}
              >
                <div className="flex justify-between items-start">
                  <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wider', getPriorityColor(n.priority))}>
                    {n.priority}
                  </span>
                  {isUnread(n) ? (
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 -mt-1 -mr-1 rounded-md text-slate-400 hover:text-indigo-600" onClick={() => handleMarkAsRead(n._id)}>
                      <Check className="h-4 w-4" />
                    </Button>
                  ) : (
                    <CheckCheck className="h-3.5 w-3.5 text-emerald-500 -mt-0.5 -mr-0.5" />
                  )}
                </div>
                
                <div>
                  <h3 
                    className={cn("text-sm cursor-pointer", isUnread(n) ? "font-semibold text-slate-900" : "font-medium text-slate-700")} 
                    onClick={() => { setSelectedNotification(n); setDetailsModalOpen(true); }}
                  >
                    {n.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{n.message}</p>
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1 border-t border-slate-100/60 mt-1">
                  <span className="truncate pr-2">{n.senderId?.name} • {formatDisplayDate(n.createdAt)}</span>
                  {n.attachmentUrl && (
                    <Button variant="link" size="sm" className="h-auto p-0 text-[11px] font-medium shrink-0" onClick={() => window.open(getAttachmentUrl(n.attachmentUrl), '_blank')}>
                      <Paperclip className="h-3 w-3 mr-1" /> File
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </ErpSection>

      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-xl w-[95vw] rounded-xl p-0 overflow-hidden max-h-[90vh]">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 mb-1">
              {selectedNotification && (
                <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wider', getPriorityColor(selectedNotification.priority))}>
                  {selectedNotification.priority}
                </span>
              )}
            </div>
            <DialogTitle className="text-lg font-semibold text-slate-900">
              {selectedNotification?.title}
            </DialogTitle>
            <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
              <span>From: <span className="font-medium text-slate-700">{selectedNotification?.senderId?.name}</span></span>
              <span>•</span>
              <span>{selectedNotification ? formatDisplayDate(selectedNotification.createdAt) : ''}</span>
            </div>
          </DialogHeader>
          
          <div className="px-5 py-4 overflow-y-auto max-h-[calc(90vh-140px)]">
            {selectedNotification && (
              <div className="space-y-5">
                <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-white rounded-md">
                  {selectedNotification.message}
                </div>
                
                {selectedNotification.attachmentUrl && (
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Attachments</p>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" className="rounded-md h-8 shadow-sm bg-white hover:bg-slate-50" onClick={() => window.open(getAttachmentUrl(selectedNotification.attachmentUrl), '_blank')}>
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5 text-slate-500" /> Open File
                      </Button>
                      <Button variant="outline" size="sm" className="rounded-md h-8 shadow-sm bg-white hover:bg-slate-50" onClick={() => {
                            const link = document.createElement('a'); link.href = getAttachmentUrl(selectedNotification.attachmentUrl); link.download = selectedNotification.attachmentName || 'download'; link.click();
                          }}>
                        <Download className="mr-1.5 h-3.5 w-3.5 text-slate-500" /> Download
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PageStack>
  );
}