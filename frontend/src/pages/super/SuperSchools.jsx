import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Search,
  Building2,
  Key,
  Plus,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import api from '@/lib/api';
import { formatDisplayDate } from '@/lib/dateFormatter';
import { PageHeader, ErpSection, FormField, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function SuperSchools() {
  const [schools, setSchools] = useState([]);
  const [plans, setPlans] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  
  // Password Reset Modal State
  const [resetModal, setResetModal] = useState({ open: false, schoolId: '', schoolName: '', password: '' });

  // Create School Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    schoolName: '',
    email: '',
    password: '',
    adminName: '',
    phone: '',
    planId: '',
    durationDays: 14,
  });

  // Created Credentials Modal State
  const [createdResult, setCreatedResult] = useState(null);
  const [copiedField, setCopiedField] = useState('');

  const load = async () => {
    const params = {};
    if (search) params.search = search;
    if (status !== 'all') params.status = status;
    const res = await api.get('/super-admin/schools', { params });
    setSchools(res.data.schools || []);
  };

  const loadPlans = async () => {
    try {
      const res = await api.get('/super-admin/plans');
      const plansList = res.data.plans || [];
      setPlans(plansList);
      const defaultPlan =
        plansList.find((p) => p.slug === 'trial' || p.planType === 'trial') || plansList[0];
      if (defaultPlan) {
        setCreateForm((prev) => ({
          ...prev,
          planId: defaultPlan._id,
          durationDays: defaultPlan.durationDays || 14,
        }));
      }
    } catch (e) {
      console.error('Failed to load plans:', e);
    }
  };

  useEffect(() => {
    load();
    loadPlans();
  }, []);

  const toggleStatus = async (id, isActive) => {
    await api.patch(`/super-admin/schools/${id}/status`, { isActive });
    toast.success(isActive ? 'School activated' : 'School deactivated');
    load();
  };

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCreateForm((prev) => ({ ...prev, password: pwd }));
    setShowCreatePassword(true);
    toast.info('Generated random secure password');
  };

  const handleCreateSchool = async (e) => {
    e?.preventDefault();
    if (!createForm.email?.trim()) {
      toast.error('Email is required.');
      return;
    }
    if (!createForm.password?.trim()) {
      toast.error('Password is required.');
      return;
    }
    if (createForm.password.trim().length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    setIsCreating(true);
    try {
      const payload = {
        email: createForm.email.trim(),
        password: createForm.password.trim(),
        schoolName: createForm.schoolName.trim() || undefined,
        adminName: createForm.adminName.trim() || undefined,
        phone: createForm.phone.trim() || undefined,
        planId: createForm.planId || undefined,
        durationDays: createForm.durationDays ? Number(createForm.durationDays) : undefined,
      };

      const res = await api.post('/super-admin/schools', payload);
      toast.success(res.data.message || 'School created successfully!');
      
      const loginUrl = window.location.origin + '/login';
      setCreatedResult({
        ...res.data.credentials,
        loginUrl,
        schoolId: res.data.school?._id,
      });

      const defaultPlan =
        plans.find((p) => p.slug === 'trial' || p.planType === 'trial') || plans[0];
      setCreateModalOpen(false);
      setCreateForm({
        schoolName: '',
        email: '',
        password: '',
        adminName: '',
        phone: '',
        planId: defaultPlan?._id || '',
        durationDays: defaultPlan?.durationDays || 14,
      });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create school');
    } finally {
      setIsCreating(false);
    }
  };

  const copyText = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`${fieldName} copied to clipboard!`);
    setTimeout(() => setCopiedField(''), 2500);
  };

  const copyAllCredentials = () => {
    if (!createdResult) return;
    const text = `🏫 School Name: ${createdResult.schoolName}\n🌐 Login Portal: ${createdResult.loginUrl}\n📧 Login Email: ${createdResult.email}\n🔑 Password: ${createdResult.password}\n📅 Plan: ${createdResult.planName || 'Trial'}`;
    navigator.clipboard.writeText(text);
    setCopiedField('all');
    toast.success('All credentials copied! Ready to share with the school.');
    setTimeout(() => setCopiedField(''), 2500);
  };

  return (
    <PageStack>
      <PageHeader
        title="School Management"
        description="Search, filter, provision, and manage all registered schools on the platform."
      >
        <Button
          onClick={() => setCreateModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm gap-2 font-medium h-9 text-xs sm:text-sm"
        >
          <Plus className="h-4 w-4" />
          Create New School
        </Button>
      </PageHeader>

      <ErpSection title="Search & Filter" icon={Search} tone="blue">
        <div className="flex flex-wrap items-end gap-3">
          <FormField label="Search schools" className="min-w-[200px] flex-1">
            <Input
              className="max-w-xs"
              placeholder="Search schools"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </FormField>
          <FormField label="Status">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <Button onClick={load}>Search</Button>
        </div>
      </ErpSection>

      <ErpSection title="All Schools" icon={Building2} tone="green">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schools.map((s) => (
                <TableRow key={s._id}>
                  <TableCell className="font-medium">{s.schoolName}</TableCell>
                  <TableCell>
                    {s.adminName}
                    <br />
                    <span className="text-xs text-slate-500">{s.email}</span>
                  </TableCell>
                  <TableCell>{s.plan?.name || '-'}</TableCell>
                  <TableCell>{s.planExpiresAt ? formatDisplayDate(s.planExpiresAt) : '-'}</TableCell>
                  <TableCell>
                    {s.isExpired ? (
                      <span className="font-medium text-amber-600">Expired</span>
                    ) : s.isActive ? (
                      'Active'
                    ) : (
                      'Inactive'
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2 whitespace-nowrap">
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/super-admin/schools/${s._id}`}>View</Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-indigo-650 border-indigo-200 bg-indigo-50/55 hover:bg-indigo-100/80 shadow-sm"
                        onClick={async () => {
                          try {
                            const res = await api.post(`/auth/impersonate-school/${s._id}`);
                            if (res.data.token && res.data.user) {
                              localStorage.setItem('superToken', localStorage.getItem('token') || '');
                              localStorage.setItem('superUser', localStorage.getItem('user') || '');
                              localStorage.setItem('token', res.data.token);
                              localStorage.setItem('user', JSON.stringify(res.data.user));
                              toast.success(`Logged in as Admin for ${s.schoolName}`);
                              window.location.href = '/admin';
                            }
                          } catch (err) {
                            toast.error(err.response?.data?.message || 'Failed to login as school admin');
                          }
                        }}
                      >
                        Login As Admin
                      </Button>
                      
                      {/* Reset School Password */}
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-amber-700 border-amber-200 bg-amber-50/50 hover:bg-amber-100/80 shadow-sm"
                        onClick={() => setResetModal({ open: true, schoolId: s._id, schoolName: s.schoolName, password: '' })}
                      >
                        <Key className="h-3.5 w-3.5 mr-1" />
                        New Password
                      </Button>

                      <Button size="sm" variant="outline" onClick={() => toggleStatus(s._id, !s.isActive)}>
                        {s.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ErpSection>

      {/* Premium New Password Modal */}
      {resetModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 w-full max-w-sm mx-4 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Set New School Password</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Set a new password for the administrator of <span className="font-bold text-slate-700">{resetModal.schoolName}</span>.
              </p>
            </div>
            <FormField label="Enter New Password">
              <Input
                type="text"
                placeholder="Enter at least 8 characters"
                value={resetModal.password}
                onChange={(e) => setResetModal({ ...resetModal, password: e.target.value })}
                className="rounded-lg h-9 text-xs"
              />
            </FormField>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg text-xs"
                onClick={() => setResetModal({ open: false, schoolId: '', schoolName: '', password: '' })}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="rounded-lg text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={async () => {
                  if (resetModal.password.trim().length < 8) {
                    toast.error('Password must be at least 8 characters long.');
                    return;
                  }
                  
                  // Confirmation Warning before reset
                  const confirmed = window.confirm(`Warning: Are you sure you want to change the administrator password for ${resetModal.schoolName}? This will overwrite their current password.`);
                  if (!confirmed) return;

                  try {
                    const res = await api.post(`/auth/reset-school-password/${resetModal.schoolId}`, { password: resetModal.password });
                    toast.success(res.data.message || `Password updated successfully.`);
                    setResetModal({ open: false, schoolId: '', schoolName: '', password: '' });
                  } catch (err) {
                    toast.error(err.response?.data?.message || 'Failed to update password');
                  }
                }}
              >
                Set New Password
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create New School Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-lg mx-auto space-y-4 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Create New School</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Enter email & password. Other details are optional.
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSchool} className="space-y-4">
              {/* School Name (Optional) */}
              <FormField label="School Name (Optional)">
                <Input
                  placeholder="e.g. Cambridge Public School (or leave blank to auto-derive)"
                  value={createForm.schoolName}
                  onChange={(e) => setCreateForm({ ...createForm, schoolName: e.target.value })}
                  className="rounded-lg h-9 text-xs"
                />
              </FormField>

              {/* Email (Required) */}
              <FormField label="School Admin Email *">
                <Input
                  type="email"
                  required
                  placeholder="e.g. admin@school.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="rounded-lg h-9 text-xs font-medium"
                />
              </FormField>

              {/* Password (Required) */}
              <FormField label="Login Password *">
                <div className="space-y-1.5">
                  <div className="relative">
                    <Input
                      type={showCreatePassword ? 'text' : 'password'}
                      required
                      placeholder="Enter at least 6 characters"
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      className="rounded-lg h-9 text-xs pr-10"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowCreatePassword(!showCreatePassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showCreatePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/80 px-2 py-1 rounded-md transition"
                    >
                      <Sparkles className="h-3 w-3" />
                      Auto-Generate Secure Password
                    </button>
                  </div>
                </div>
              </FormField>

              {/* Toggle Optional Fields */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowOptionalFields(!showOptionalFields)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition"
                >
                  {showOptionalFields ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {showOptionalFields ? 'Hide Additional Details' : 'Show More Details (Optional)'}
                </button>
              </div>

              {showOptionalFields && (
                <div className="space-y-3.5 pt-2 border-t border-slate-100 bg-slate-50/60 p-3.5 rounded-xl border border-dashed border-slate-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField label="Admin Person Name">
                      <Input
                        placeholder="e.g. Principal Sharma"
                        value={createForm.adminName}
                        onChange={(e) => setCreateForm({ ...createForm, adminName: e.target.value })}
                        className="rounded-lg h-8 text-xs bg-white"
                      />
                    </FormField>
                    <FormField label="Contact Phone">
                      <Input
                        placeholder="e.g. 9876543210"
                        value={createForm.phone}
                        onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                        className="rounded-lg h-8 text-xs bg-white"
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField label="Plan">
                      <Select
                        value={createForm.planId || 'default'}
                        onValueChange={(val) => {
                          const selectedPlanId = val === 'default' ? '' : val;
                          const foundPlan = plans.find((p) => p._id === selectedPlanId);
                          const defaultPlan =
                            plans.find((p) => p.slug === 'trial' || p.planType === 'trial') || plans[0];
                          const targetPlan = foundPlan || defaultPlan;
                          setCreateForm((prev) => ({
                            ...prev,
                            planId: selectedPlanId,
                            durationDays: targetPlan?.durationDays || 14,
                          }));
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs rounded-lg bg-white">
                          <SelectValue placeholder="Trial / Default Plan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Default / Trial Plan</SelectItem>
                          {plans.map((p) => (
                            <SelectItem key={p._id} value={p._id}>
                              {p.name} ({p.durationDays || 14} days)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>

                    <FormField label="Validity (Days)">
                      <Input
                        type="number"
                        min="1"
                        placeholder="14"
                        value={createForm.durationDays}
                        onChange={(e) => setCreateForm({ ...createForm, durationDays: e.target.value })}
                        className="rounded-lg h-8 text-xs bg-white"
                      />
                    </FormField>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isCreating}
                  className="rounded-lg text-xs"
                  onClick={() => setCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isCreating}
                  className="rounded-lg text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                >
                  {isCreating ? 'Creating School...' : 'Create & Generate Credentials'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Created Credentials Modal */}
      {createdResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-md mx-auto space-y-4">
            <div className="text-center space-y-1.5">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 mb-1 ring-8 ring-emerald-50">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">School Created Successfully!</h3>
              <p className="text-xs text-slate-500">
                Copy these credentials and share them with the school administration so they can log in.
              </p>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 py-1 px-2.5 rounded-lg border border-emerald-200 mt-1">
                <Check className="h-3 w-3 text-emerald-600" />
                Login credentials have also been emailed directly to the admin!
              </div>
            </div>

            {/* Credentials Card */}
            <div className="bg-slate-50/90 rounded-xl border border-slate-200/90 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <span className="text-[11px] font-medium text-slate-500">School Name:</span>
                <span className="text-xs font-bold text-slate-800">{createdResult.schoolName}</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <span className="text-[11px] font-medium text-slate-500">Login Portal:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-medium text-slate-700 truncate max-w-[170px]">
                    {createdResult.loginUrl}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(createdResult.loginUrl, 'Login URL')}
                    className="p-1 text-slate-400 hover:text-indigo-600 transition"
                    title="Copy Login URL"
                  >
                    {copiedField === 'Login URL' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <span className="text-[11px] font-medium text-slate-500">Login Email:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-bold text-slate-800">
                    {createdResult.email}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(createdResult.email, 'Email')}
                    className="p-1 text-slate-400 hover:text-indigo-600 transition"
                    title="Copy Email"
                  >
                    {copiedField === 'Email' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <span className="text-[11px] font-medium text-slate-500">Password:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50/90 px-2 py-0.5 rounded border border-indigo-100">
                    {createdResult.password}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(createdResult.password, 'Password')}
                    className="p-1 text-slate-400 hover:text-indigo-600 transition"
                    title="Copy Password"
                  >
                    {copiedField === 'Password' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {createdResult.planName && (
                <div className="flex items-center justify-between pt-0.5 text-[11px] text-slate-500">
                  <span>Assigned Plan:</span>
                  <span className="font-semibold text-slate-700">{createdResult.planName}</span>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="space-y-2 pt-1">
              <Button
                type="button"
                onClick={copyAllCredentials}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs gap-2 h-9 shadow-sm"
              >
                {copiedField === 'all' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedField === 'all' ? 'Copied to Clipboard!' : 'Copy All Credentials'}
              </Button>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  onClick={async () => {
                    if (!createdResult.schoolId) return;
                    try {
                      const res = await api.post(`/auth/impersonate-school/${createdResult.schoolId}`);
                      if (res.data.token && res.data.user) {
                        localStorage.setItem('superToken', localStorage.getItem('token') || '');
                        localStorage.setItem('superUser', localStorage.getItem('user') || '');
                        localStorage.setItem('token', res.data.token);
                        localStorage.setItem('user', JSON.stringify(res.data.user));
                        toast.success(`Logged in as Admin for ${createdResult.schoolName}`);
                        window.location.href = '/admin';
                      }
                    } catch (err) {
                      toast.error(err.response?.data?.message || 'Failed to login as school admin');
                    }
                  }}
                >
                  Login As School
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="text-xs"
                  onClick={() => setCreatedResult(null)}
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageStack>
  );
}
