import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Settings } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErpSection, FormField, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SuperPaymentSettings() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ upiId: '', merchantName: '', qrExpiryMinutes: 5 });

  const load = async () => {
    const res = await api.get('/super-admin/payment-settings');
    setForm({
      upiId: res.data.settings?.upiId || '',
      merchantName: res.data.settings?.merchantName || '',
      qrExpiryMinutes: res.data.settings?.qrExpiryMinutes || 5,
    });
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/super-admin/payment-settings', {
        upiId: form.upiId,
        merchantName: form.merchantName,
        qrExpiryMinutes: Number(form.qrExpiryMinutes || 5),
      });
      toast.success('Payment settings updated');
      load();
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageStack>
      <PageHeader
        title="Payment Settings"
        description="Configure UPI details used to generate dynamic QR codes for subscription payments."
      />

      <ErpSection title="UPI Settings" icon={Settings} tone="purple">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={save}>
          <FormField label="UPI ID">
            <Input
              placeholder="example@upi"
              value={form.upiId}
              onChange={(e) => setForm((s) => ({ ...s, upiId: e.target.value }))}
              required
            />
          </FormField>
          <FormField label="Merchant Name">
            <Input
              placeholder="Merchant / Company name"
              value={form.merchantName}
              onChange={(e) => setForm((s) => ({ ...s, merchantName: e.target.value }))}
            />
          </FormField>
          <FormField label="QR Expiry Time (minutes)">
            <Input
              type="number"
              min={1}
              max={60}
              value={form.qrExpiryMinutes}
              onChange={(e) => setForm((s) => ({ ...s, qrExpiryMinutes: e.target.value }))}
            />
          </FormField>

          <div className="flex items-end justify-end md:col-span-2">
            <Button type="submit" variant="success" disabled={loading}>
              Save Settings
            </Button>
          </div>
        </form>
      </ErpSection>
    </PageStack>
  );
}

