import { useState } from 'react';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import api from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogBody } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/erp/PagePrimitives';
import { Textarea } from '@/components/ui/textarea';

export default function TrialRequestDialog({ open, onOpenChange }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    instituteName: '',
    contactNumber: '',
    email: '',
    expectedStudents: '',
    expectedTeachers: '',
    reason: '',
  });

  const submit = async () => {
    if (!form.instituteName || !form.contactNumber || !form.email || !form.expectedStudents || !form.expectedTeachers || !form.reason) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      await api.post('/trial/submit', {
        instituteName: form.instituteName,
        contactNumber: form.contactNumber,
        email: form.email,
        expectedStudents: Number(form.expectedStudents),
        expectedTeachers: Number(form.expectedTeachers),
        reason: form.reason,
      });

      toast.success('Trial request submitted successfully');
      onOpenChange(false);
      setForm({
        instituteName: '',
        contactNumber: '',
        email: '',
        expectedStudents: '',
        expectedTeachers: '',
        reason: '',
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit trial request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-indigo-600" />
            Request 7-Day Free Trial
          </DialogTitle>
          <DialogDescription>
            Fill in your details to request a free trial. Our team will review and get back to you within 24 hours.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4 p-6 pt-0">
            <FormField label="Institute Name">
              <Input
                value={form.instituteName}
                onChange={(e) => setForm((s) => ({ ...s, instituteName: e.target.value }))}
                placeholder="Your School Name"
                required
              />
            </FormField>

            <FormField label="Contact Number">
              <Input
                type="tel"
                value={form.contactNumber}
                onChange={(e) => setForm((s) => ({ ...s, contactNumber: e.target.value }))}
                placeholder="+91 9876543210"
                required
              />
            </FormField>

            <FormField label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                placeholder="school@example.com"
                required
              />
            </FormField>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Expected Students">
                <Input
                  type="number"
                  value={form.expectedStudents}
                  onChange={(e) => setForm((s) => ({ ...s, expectedStudents: e.target.value }))}
                  placeholder="500"
                  required
                />
              </FormField>

              <FormField label="Expected Teachers">
                <Input
                  type="number"
                  value={form.expectedTeachers}
                  onChange={(e) => setForm((s) => ({ ...s, expectedTeachers: e.target.value }))}
                  placeholder="20"
                  required
                />
              </FormField>
            </div>

            <FormField label="Reason for Trial">
              <Textarea
                value={form.reason}
                onChange={(e) => setForm((s) => ({ ...s, reason: e.target.value }))}
                placeholder="Tell us why you want to try Test Master Pro..."
                rows={3}
                required
              />
            </FormField>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="success" onClick={submit} disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
