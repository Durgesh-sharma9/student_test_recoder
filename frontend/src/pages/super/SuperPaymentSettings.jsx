import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Settings, Plus, Edit2, Trash2, Power } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErpSection, FormField, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DatePicker from '@/components/ui/DatePicker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';

export default function SuperPaymentSettings() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ upiId: '', merchantName: '', qrExpiryMinutes: 5 });
  const [coupons, setCoupons] = useState([]);
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [couponForm, setCouponForm] = useState({
    code: '',
    discountValue: '',
    expiryDate: '',
    maxUses: '',
    unlimitedUses: false,
    applicablePlans: [],
    isActive: true,
  });

  const load = async () => {
    const res = await api.get('/super-admin/payment-settings');
    setForm({
      upiId: res.data.settings?.upiId || '',
      merchantName: res.data.settings?.merchantName || '',
      qrExpiryMinutes: res.data.settings?.qrExpiryMinutes || 5,
    });
  };

  const loadCoupons = async () => {
    try {
      const res = await api.get('/coupons');
      setCoupons(res.data.coupons || []);
    } catch (error) {
      console.error('Failed to load coupons:', error);
    }
  };

  useEffect(() => {
    load().catch(() => {});
    loadCoupons().catch(() => {});
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

  const handleCouponSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...couponForm,
        discountValue: Number(couponForm.discountValue),
        maxUses: couponForm.unlimitedUses ? null : (couponForm.maxUses ? Number(couponForm.maxUses) : null),
      };

      if (editingCoupon) {
        await api.put(`/coupons/${editingCoupon._id}`, payload);
        toast.success('Coupon updated successfully');
      } else {
        await api.post('/coupons', payload);
        toast.success('Coupon created successfully');
      }

      setCouponDialogOpen(false);
      setEditingCoupon(null);
      setCouponForm({
        code: '',
        discountValue: '',
        expiryDate: '',
        maxUses: '',
        unlimitedUses: false,
        applicablePlans: [],
        isActive: true,
      });
      loadCoupons();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save coupon');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCoupon = (coupon) => {
    setEditingCoupon(coupon);
    setCouponForm({
      code: coupon.code,
      discountValue: coupon.discountValue,
      expiryDate: coupon.expiryDate ? coupon.expiryDate.split('T')[0] : '',
      maxUses: coupon.maxUses || '',
      unlimitedUses: coupon.unlimitedUses,
      applicablePlans: coupon.applicablePlans || [],
      isActive: coupon.isActive,
    });
    setCouponDialogOpen(true);
  };

  const handleDeleteCoupon = async (couponId) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      await api.delete(`/coupons/${couponId}`);
      toast.success('Coupon deleted successfully');
      loadCoupons();
    } catch (error) {
      toast.error('Failed to delete coupon');
    }
  };

  const handleToggleCouponStatus = async (coupon) => {
    try {
      await api.put(`/coupons/${coupon._id}`, { isActive: !coupon.isActive });
      toast.success(`Coupon ${coupon.isActive ? 'disabled' : 'enabled'} successfully`);
      loadCoupons();
    } catch (error) {
      toast.error('Failed to update coupon status');
    }
  };

  const handlePlanToggle = (plan) => {
    setCouponForm((prev) => ({
      ...prev,
      applicablePlans: prev.applicablePlans.includes(plan)
        ? prev.applicablePlans.filter((p) => p !== plan)
        : [...prev.applicablePlans, plan],
    }));
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

      <ErpSection title="Coupon Management" icon={Plus} tone="green">
        <div className="flex justify-end mb-4">
          <Button onClick={() => {
            setEditingCoupon(null);
            setCouponForm({
              code: '',
              discountValue: '',
              expiryDate: '',
              maxUses: '',
              unlimitedUses: false,
              applicablePlans: [],
              isActive: true,
            });
            setCouponDialogOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Create Coupon
          </Button>
        </div>

        {coupons.length === 0 ? (
          <p className="text-sm text-slate-500">No coupons created yet.</p>
        ) : (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Coupon Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => (
                  <TableRow key={coupon._id}>
                    <TableCell className="font-medium">{coupon.code}</TableCell>
                    <TableCell>{coupon.discountValue}%</TableCell>
                    <TableCell>
                      {coupon.expiryDate ? new Date(coupon.expiryDate).toLocaleDateString() : 'No expiry'}
                    </TableCell>
                    <TableCell>
                      {coupon.unlimitedUses ? 'Unlimited' : `${coupon.usedCount}/${coupon.maxUses}`}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        coupon.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {coupon.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCoupon(coupon)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleCouponStatus(coupon)}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCoupon(coupon._id)}
                        >
                          <Trash2 className="h-4 w-4 text-rose-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </ErpSection>

      {/* Coupon Dialog */}
      {couponDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
            </h2>
            <form onSubmit={handleCouponSubmit} className="space-y-4">
              <FormField label="Coupon Code" required>
                <Input
                  placeholder="TTP20"
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                  required
                />
              </FormField>
              <FormField label="Discount Percentage (%)" required>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="20"
                  value={couponForm.discountValue}
                  onChange={(e) => setCouponForm({ ...couponForm, discountValue: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Expiry Date">
                <DatePicker
                  value={couponForm.expiryDate}
                  onChange={(date) => setCouponForm({ ...couponForm, expiryDate: date })}
                />
              </FormField>
              <FormField label="Max Uses">
                <Input
                  type="number"
                  min="1"
                  placeholder="100"
                  value={couponForm.maxUses}
                  onChange={(e) => setCouponForm({ ...couponForm, maxUses: e.target.value })}
                  disabled={couponForm.unlimitedUses}
                />
              </FormField>
              <div className="flex items-center gap-2">
                <Switch
                  checked={couponForm.unlimitedUses}
                  onCheckedChange={(checked) => setCouponForm({ ...couponForm, unlimitedUses: checked })}
                />
                <label className="text-sm">Unlimited Uses</label>
              </div>
              <FormField label="Applicable Plans">
                <div className="space-y-2">
                  {['basic', 'standard', 'elite'].map((plan) => (
                    <div key={plan} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`plan-${plan}`}
                        checked={couponForm.applicablePlans.includes(plan)}
                        onChange={() => handlePlanToggle(plan)}
                        className="rounded"
                      />
                      <label htmlFor={`plan-${plan}`} className="text-sm capitalize">
                        {plan}
                      </label>
                    </div>
                  ))}
                  <p className="text-xs text-slate-500">Leave empty to apply to all plans</p>
                </div>
              </FormField>
              <div className="flex items-center gap-2">
                <Switch
                  checked={couponForm.isActive}
                  onCheckedChange={(checked) => setCouponForm({ ...couponForm, isActive: checked })}
                />
                <label className="text-sm">Active Status</label>
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCouponDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : editingCoupon ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageStack>
  );
}

