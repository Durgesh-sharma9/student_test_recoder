import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Lock, ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, PageHeader, ErpSection } from '@/components/erp/PagePrimitives';
import api from '@/lib/api';

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingOTP, setSendingOTP] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'school_admin' || user?.role === 'super_admin';

  const handleSendOTP = async () => {
    if (!currentPassword) {
      toast.error('Please enter current password first');
      return;
    }

    setSendingOTP(true);
    try {
      await api.post('/auth/send-password-change-otp');
      setShowOTP(true);
      toast.success('OTP sent to your email');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setSendingOTP(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('New password and confirm password do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const payload = { currentPassword, newPassword };
      if (isAdmin) {
        if (!otp) {
          toast.error('OTP is required for password change');
          setLoading(false);
          return;
        }
        payload.otp = otp;
      }

      const response = await api.put('/auth/change-password', payload);

      toast.success('Password changed successfully');
      
      // Redirect based on role
      const role = user?.role === 'admin' ? 'school_admin' : user?.role;
      if (role === 'teacher') navigate('/teacher');
      else if (role === 'school_admin') navigate('/admin');
      else if (role === 'super_admin') navigate('/super-admin');
      else navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <PageHeader title="Change Password" description="Update your password to continue" />
        </div>

        <ErpSection title="Security" icon={Lock} tone="blue">
          <form onSubmit={handleSubmit} className="space-y-4 p-4">
            <FormField label="Current Password">
              <Input
                type="password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="h-12"
              />
            </FormField>

            <FormField label="New Password">
              <Input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="h-12"
              />
            </FormField>

            <FormField label="Confirm New Password">
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-12"
              />
            </FormField>

            {/* OTP Section for Admins */}
            {isAdmin && (
              <>
                {!showOTP ? (
                  <Button
                    type="button"
                    onClick={handleSendOTP}
                    disabled={sendingOTP || !currentPassword}
                    variant="outline"
                    className="w-full h-12"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    {sendingOTP ? 'Sending OTP...' : 'Send OTP to Email'}
                  </Button>
                ) : (
                  <>
                    <FormField label="Enter OTP">
                      <Input
                        type="text"
                        placeholder="Enter 6-digit OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        required
                        className="h-12 text-center text-lg tracking-widest"
                        maxLength={6}
                      />
                    </FormField>
                    <Button
                      type="button"
                      onClick={handleSendOTP}
                      disabled={sendingOTP}
                      variant="ghost"
                      className="w-full h-8 text-sm"
                    >
                      <Mail className="mr-2 h-3 w-3" />
                      Resend OTP
                    </Button>
                  </>
                )}
              </>
            )}

            <Button type="submit" className="w-full h-12" disabled={loading}>
              {loading ? 'Changing Password...' : 'Change Password'}
            </Button>
          </form>
        </ErpSection>

        {isAdmin && (
          <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-800 mb-1">Security Notice</p>
                <p className="text-sm text-blue-700">
                  For enhanced security, admin accounts require OTP verification to change passwords. An OTP will be sent to your registered email address.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 rounded-lg bg-orange-50 border border-orange-200 p-4">
          <p className="text-sm text-orange-800">
            <strong>Required:</strong> You must change your password before accessing the dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
