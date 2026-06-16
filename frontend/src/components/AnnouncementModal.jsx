import { useState, useEffect } from 'react';
import { Megaphone, X, Bell, Paperclip, Users, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormField } from '@/components/erp/PagePrimitives';

export default function AnnouncementModal({ open, onOpenChange, role }) {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    priority: 'normal',
  });
  const [recipientType, setRecipientType] = useState('all'); // 'all' or 'selected'
  const [targetRole, setTargetRole] = useState('teacher'); // 'teacher' or 'parent'
  const [recipients, setRecipients] = useState([]);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState(null);

  useEffect(() => {
    if (open) {
      // Reset form when modal opens
      setFormData({ title: '', message: '', priority: 'normal' });
      setRecipientType('all');
      setTargetRole('teacher');
      setSelectedRecipients([]);
      setSelectedClass('');
      setAttachmentFile(null);
      
      // Fetch recipients based on role
      if (role === 'super_admin') {
        // Super admin sends to all school admins
        api.get('/users?role=school_admin').then((res) => {
          setRecipients(res.data.users || []);
        });
      } else if (role === 'school_admin') {
        // School admin sends to teachers or parents
        api.get('/users?role=teacher').then((res) => {
          setRecipients(res.data.users || []);
        });
        // Fetch classes for class-wise parent notifications
        api.get('/classes').then((res) => {
          setClasses(res.data.classes || []);
        });
      }
    }
  }, [open, role]);

  const handleSend = async () => {
    try {
      if (!formData.title || !formData.message) {
        toast.error('Please fill in all required fields');
        return;
      }

      setLoading(true);

      let finalRecipientIds = [];
      let isBroadcast = false;
      let finalTargetRole = targetRole;
      let finalClassId = selectedClass;

      if (role === 'super_admin') {
        // Super admin always broadcasts to all admins
        finalRecipientIds = recipients.map((r) => r._id);
        isBroadcast = true;
        finalTargetRole = 'school_admin';
      } else if (role === 'school_admin') {
        // School admin can send to teachers or parents
        if (targetRole === 'parent') {
          // Send to parents
          if (recipientType === 'all') {
            // Broadcast to all parents
            isBroadcast = true;
          } else if (selectedClass) {
            // Send to parents of specific class
            finalClassId = selectedClass;
            isBroadcast = false;
          } else {
            toast.error('Please select a class for class-wise parent notifications');
            setLoading(false);
            return;
          }
        } else {
          // Send to teachers
          if (recipientType === 'all') {
            finalRecipientIds = recipients.map((r) => r._id);
            isBroadcast = true;
          } else {
            finalRecipientIds = selectedRecipients;
            isBroadcast = false;
          }
        }
      }

      const formDataObj = new FormData();
      formDataObj.append('title', formData.title);
      formDataObj.append('message', formData.message);
      formDataObj.append('priority', formData.priority);
      formDataObj.append('targetRole', finalTargetRole);
      formDataObj.append('isBroadcast', isBroadcast);
      
      if (finalClassId) {
        formDataObj.append('classId', finalClassId);
      }
      
      if (finalRecipientIds.length > 0) {
        formDataObj.append('recipientIds', JSON.stringify(finalRecipientIds));
      }
      
      if (attachmentFile) {
        formDataObj.append('attachment', attachmentFile);
      }

      await api.post('/notifications', formDataObj, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      onOpenChange(false);
      toast.success('Announcement sent successfully');
    } catch (error) {
      console.error('Failed to send announcement:', error);
      toast.error(error.response?.data?.message || 'Failed to send announcement');
    } finally {
      setLoading(false);
    }
  };

  const handleRecipientToggle = (recipientId) => {
    setSelectedRecipients((prev) => {
      if (prev.includes(recipientId)) {
        return prev.filter((id) => id !== recipientId);
      } else {
        return [...prev, recipientId];
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Added px-8 to give comfortable spacing on the left and right */}
      <DialogContent className="max-w-lg rounded-2xl shadow-2xl px-8">
        <DialogHeader className="space-y-2 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-blue-500 shadow-lg shadow-purple-500/30">
              <Megaphone className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-slate-900">
                Teacher Announcement Center
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500">
                Broadcast updates, alerts and notices to teachers
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <FormField label="Title">
            <Input
              placeholder="Enter announcement title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="rounded-xl border-slate-200 shadow-sm focus:ring-2 focus:ring-purple-500"
            />
          </FormField>
          <FormField label="Message">
            <Textarea
              placeholder="Enter announcement message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={4}
              className="rounded-xl border-slate-200 shadow-sm focus:ring-2 focus:ring-purple-500"
            />
          </FormField>
          <FormField label="Priority">
            <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
              <SelectTrigger className="rounded-xl border-slate-200 shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-slate-400" />
                    Normal
                  </div>
                </SelectItem>
                <SelectItem value="info">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    Info
                  </div>
                </SelectItem>
                <SelectItem value="important">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-orange-500" />
                    Important
                  </div>
                </SelectItem>
                <SelectItem value="urgent">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    Urgent
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          {role === 'school_admin' && (
            <>
              <FormField label="Send To">
                <Select value={targetRole} onValueChange={(value) => {
                  setTargetRole(value);
                  setRecipientType('all');
                  setSelectedRecipients([]);
                  setSelectedClass('');
                }}>
                  <SelectTrigger className="rounded-xl border-slate-200 shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teacher">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Teachers
                      </div>
                    </SelectItem>
                    <SelectItem value="parent">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        Parents
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              {targetRole === 'teacher' && (
                <FormField label="Recipients">
                  <Select value={recipientType} onValueChange={setRecipientType}>
                    <SelectTrigger className="rounded-xl border-slate-200 shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Teachers</SelectItem>
                      <SelectItem value="selected">Selected Teachers</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              )}

              {targetRole === 'teacher' && recipientType === 'selected' && (
                <FormField label="Select Teachers">
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 p-3 shadow-sm">
                    {recipients.map((recipient) => (
                      <label key={recipient._id} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedRecipients.includes(recipient._id)}
                          onChange={() => handleRecipientToggle(recipient._id)}
                          className="rounded border-slate-300 text-purple-600 focus:ring-2 focus:ring-purple-500"
                        />
                        <span className="text-sm font-medium text-slate-700">{recipient.teacherName || recipient.name}</span>
                      </label>
                    ))}
                  </div>
                </FormField>
              )}

              {targetRole === 'parent' && (
                <FormField label="Recipients">
                  <Select value={recipientType} onValueChange={setRecipientType}>
                    <SelectTrigger className="rounded-xl border-slate-200 shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Parents</SelectItem>
                      <SelectItem value="class">Class-wise Parents</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              )}

              {targetRole === 'parent' && recipientType === 'class' && (
                <FormField label="Select Class">
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="rounded-xl border-slate-200 shadow-sm">
                      <SelectValue placeholder="Select a class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls._id} value={cls._id}>
                          {cls.className} {cls.section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            </>
          )}
          <FormField label="Attachment (Optional)">
            <Input
              type="file"
              accept=".pdf,.doc,.docx,.xlsx,.csv,.jpg,.jpeg,.png"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const maxSize = 10 * 1024 * 1024; // 10MB
                  if (file.size > maxSize) {
                    toast.error('File size exceeds 10MB limit');
                    return;
                  }
                  setAttachmentFile(file);
                }
              }}
              className="rounded-xl border-slate-200 shadow-sm"
            />
            {attachmentFile && (
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                <Paperclip className="h-4 w-4" />
                <span className="truncate">{attachmentFile.name}</span>
              </div>
            )}
          </FormField>
        </div>
        <DialogFooter className="pt-6">
          <Button 
            variant="outline" 
            onClick={() => {
              setAttachmentFile(null);
              onOpenChange(false);
            }} 
            disabled={loading}
            className="rounded-xl border-slate-200 font-medium hover:bg-slate-50"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={loading}
            className="rounded-xl bg-gradient-to-r from-purple-600 to-blue-500 font-medium shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 transition-all duration-200"
          >
            {loading ? 'Sending...' : 'Send Announcement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}