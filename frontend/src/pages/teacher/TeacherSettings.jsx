import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, ErpSection, FormField, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Lock, Mail, Phone, KeyRound, ShieldCheck } from 'lucide-react';

export default function TeacherSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    mobile: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.teacherName || user.name || '',
        email: user.email || '',
        mobile: user.mobile || '',
      });
    }
  }, [user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.put('/auth/me', {
        name: profile.name,
        mobile: profile.mobile,
      });

      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setPasswordLoading(true);

    try {
      await api.put('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      toast.success('Password changed successfully');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <PageStack className="max-w-5xl mx-auto">
      {/* Balanced Gradients (Na zyada light, na zyada dark) */}
      <style>{`
        .override-blue-grad { background: linear-gradient(to bottom right, #e5effa, #ffffff) !important; }
        .override-green-grad { background: linear-gradient(to bottom right, #def8ed, #ffffff) !important; }
      `}</style>

      <PageHeader
        title="Settings"
        description="Manage your profile and security settings"
      />

      {/* <ErpSection className="override-blue-grad" title="Profile" icon={User} tone="blue">
        <div className="mb-4 rounded-lg bg-slate-50 p-4">
          <div className="flex items-center gap-4">
            <ShieldCheck className="h-5 w-5 text-slate-600" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Authentication Method</p>
              <p className="text-sm text-slate-600">
                {user?.authProvider === 'google' ? (
                  <span className="inline-flex items-center gap-2 text-green-600">Google Account Connected</span>
                ) : (
                  <span className="text-slate-600">Email & Password Account</span>
                )}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleProfileUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <FormField label="Name">
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-10 h-10"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="Enter your name"
                required
              />
            </div>
          </FormField>

          <FormField label="Email">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-10 h-10 bg-slate-50"
                value={profile.email}
                disabled
              />
            </div>
          </FormField>

          <FormField label="Mobile (Optional)">
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-10 h-10"
                value={profile.mobile}
                onChange={(e) => setProfile({ ...profile, mobile: e.target.value })}
                placeholder="Enter mobile number"
              />
            </div>
          </FormField>

          <div className="flex items-end">
            <Button type="submit" className="w-full h-10" disabled={loading}>
              {loading ? 'Updating...' : 'Update Profile'}
            </Button>
          </div>
        </form>
      </ErpSection>
      */}

      <ErpSection className="override-green-grad" title="Security" icon={ShieldCheck} tone="green">
        <form onSubmit={handlePasswordChange} className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 items-end">
          <FormField label="Current Password">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-10 h-10"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                placeholder="Enter current password"
                required
              />
            </div>
          </FormField>

          <FormField label="New Password">
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-10 h-10"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="New password (min 6 chars)"
                required
              />
            </div>
          </FormField>

          <FormField label="Confirm New Password">
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-10 h-10"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="Confirm new password"
                required
              />
            </div>
          </FormField>

          <div className="md:col-span-3">
            <Button type="submit" className="w-full md:w-auto px-8 h-10 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={passwordLoading}>
              {passwordLoading ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </form>
      </ErpSection>
    </PageStack>
  );
}