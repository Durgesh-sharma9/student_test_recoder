import { useState } from 'react';
import { toast } from 'sonner';
import { Building2 } from 'lucide-react';
import api from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogBody } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/erp/PagePrimitives';
import { Textarea } from '@/components/ui/textarea';

export default function EnterpriseRequestDialog({ open, onOpenChange }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    instituteName: '',
    contactNumber: '',
    email: '',
    requiredStudents: '',
    requiredTeachers: '',
    additionalRequirements: '',
  });

  const submit = async () => {
    if (!form.instituteName || !form.contactNumber || !form.email || !form.requiredStudents || !form.requiredTeachers) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      await api.post('/enterprise/submit', {
        instituteName: form.instituteName,
        contactNumber: form.contactNumber,
        email: form.email,
        requiredStudents: Number(form.requiredStudents),
        requiredTeachers: Number(form.requiredTeachers),
        additionalRequirements: form.additionalRequirements,
      });

      toast.success('Enterprise request submitted successfully');
      onOpenChange(false);
      setForm({
        instituteName: '',
        contactNumber: '',
        email: '',
        requiredStudents: '',
        requiredTeachers: '',
        additionalRequirements: '',
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit enterprise request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-purple-600" />
            Request Enterprise Plan
          </DialogTitle>
          <DialogDescription>
            Need more capacity? Submit your requirements and our team will create a custom enterprise plan for you.
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
              <FormField label="Required Students">
                <Input
                  type="number"
                  value={form.requiredStudents}
                  onChange={(e) => setForm((s) => ({ ...s, requiredStudents: e.target.value }))}
                  placeholder="5000"
                  required
                />
              </FormField>

              <FormField label="Required Teachers">
                <Input
                  type="number"
                  value={form.requiredTeachers}
                  onChange={(e) => setForm((s) => ({ ...s, requiredTeachers: e.target.value }))}
                  placeholder="200"
                  required
                />
              </FormField>
            </div>

            <FormField label="Additional Requirements (Optional)">
              <Textarea
                value={form.additionalRequirements}
                onChange={(e) => setForm((s) => ({ ...s, additionalRequirements: e.target.value }))}
                placeholder="Any specific features or customizations you need..."
                rows={3}
              />
            </FormField>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700" onClick={submit} disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
