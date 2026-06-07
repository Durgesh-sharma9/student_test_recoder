import { useState, useEffect } from 'react';
import { Megaphone, X } from 'lucide-react';
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
  const [recipients, setRecipients] = useState([]);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      // Reset form when modal opens
      setFormData({ title: '', message: '', priority: 'normal' });
      setRecipientType('all');
      setSelectedRecipients([]);
      
      // Fetch recipients based on role
      if (role === 'super_admin') {
        // Super admin sends to all school admins
        api.get('/users?role=school_admin').then((res) => {
          setRecipients(res.data.users || []);
        });
      } else if (role === 'school_admin') {
        // School admin sends to teachers of their school
        api.get('/users?role=teacher').then((res) => {
          setRecipients(res.data.users || []);
        });
      }
    }
  }, [open, role]);

  const handleSend = async () => {
    try {
      if (!formData.title || !formData.message) {
        alert('Please fill in all required fields');
        return;
      }

      setLoading(true);

      let finalRecipientIds = [];
      let isBroadcast = false;

      if (role === 'super_admin') {
        // Super admin always broadcasts to all admins
        finalRecipientIds = recipients.map((r) => r._id);
        isBroadcast = true;
      } else if (role === 'school_admin') {
        // School admin can broadcast to all teachers or send to selected
        if (recipientType === 'all') {
          finalRecipientIds = recipients.map((r) => r._id);
          isBroadcast = true;
        } else {
          finalRecipientIds = selectedRecipients;
          isBroadcast = false;
        }
      }

      if (finalRecipientIds.length === 0) {
        alert('Please select at least one recipient');
        setLoading(false);
        return;
      }

      await api.post('/notifications', {
        title: formData.title,
        message: formData.message,
        priority: formData.priority,
        recipientIds: finalRecipientIds,
        targetRole: role === 'super_admin' ? 'school_admin' : 'teacher',
        isBroadcast,
      });

      onOpenChange(false);
      alert('Announcement sent successfully');
    } catch (error) {
      console.error('Failed to send announcement:', error);
      alert('Failed to send announcement');
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-indigo-600" />
            {role === 'super_admin' ? 'Send Announcement to All Admins' : 'Send Announcement to Teachers'}
          </DialogTitle>
          <DialogDescription>
            {role === 'super_admin'
              ? 'This announcement will be sent to all School Admins.'
              : 'Send a broadcast to all teachers or select specific teachers.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <FormField label="Title">
            <Input
              placeholder="Enter announcement title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </FormField>
          <FormField label="Message">
            <Textarea
              placeholder="Enter announcement message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={4}
            />
          </FormField>
          <FormField label="Priority">
            <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="important">Important</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          {role === 'school_admin' && (
            <FormField label="Recipients">
              <Select value={recipientType} onValueChange={setRecipientType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teachers</SelectItem>
                  <SelectItem value="selected">Selected Teachers</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          )}
          {role === 'school_admin' && recipientType === 'selected' && (
            <FormField label="Select Teachers">
              <div className="max-h-48 overflow-y-auto rounded-md border border-slate-200 p-2">
                {recipients.map((recipient) => (
                  <label key={recipient._id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded">
                    <input
                      type="checkbox"
                      checked={selectedRecipients.includes(recipient._id)}
                      onChange={() => handleRecipientToggle(recipient._id)}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm">{recipient.teacherName || recipient.name}</span>
                  </label>
                ))}
              </div>
            </FormField>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={loading}>
            {loading ? 'Sending...' : 'Send Announcement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
