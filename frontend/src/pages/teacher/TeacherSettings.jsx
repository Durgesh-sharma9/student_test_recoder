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
    <PageStack>
      <PageHeader
        title="Settings"
        description="Manage your profile and security settings"
      />

      <ErpSection title="Profile" icon={User} tone="blue">
        <div className="mb-6 rounded-lg bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-slate-600" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Authentication Method</p>
              <p className="text-xs text-slate-600">
                {user?.authProvider === 'google' ? (
                  <span className="inline-flex items-center gap-1.5 text-green-600">
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Google Account Connected
                  </span>
                ) : (
                  <span className="text-slate-600">Email & Password Account</span>
                )}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <FormField label="Name">
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-10"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="Enter your name"
                required
              />
            </div>
          </FormField>

          <FormField label="Email">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-10"
                value={profile.email}
                disabled
                placeholder="Email cannot be changed"
              />
            </div>
          </FormField>

          <FormField label="Mobile (Optional)">
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-10"
                value={profile.mobile}
                onChange={(e) => setProfile({ ...profile, mobile: e.target.value })}
                placeholder="Enter mobile number"
              />
            </div>
          </FormField>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Updating...' : 'Update Profile'}
          </Button>
        </form>
      </ErpSection>

      <ErpSection title="Security" icon={ShieldCheck} tone="green">
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <FormField label="Current Password">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-10"
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
              <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-10"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="Enter new password (min 6 characters)"
                required
              />
            </div>
          </FormField>

          <FormField label="Confirm New Password">
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-10"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="Confirm new password"
                required
              />
            </div>
          </FormField>

          <Button type="submit" className="w-full" disabled={passwordLoading}>
            {passwordLoading ? 'Changing...' : 'Change Password'}
          </Button>
        </form>
      </ErpSection>
    </PageStack>
  );
}
