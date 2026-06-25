import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { ShieldCheck, Mail, Clock, Lock, CheckCircle, XCircle, AlertCircle, Key } from 'lucide-react';
import { PageHeader, ErpSection } from '@/components/erp/PagePrimitives';
import api from '@/lib/api';

export default function SecuritySettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [securityInfo, setSecurityInfo] = useState({
    isEmailVerified: false,
    lastLogin: null,
    lastPasswordChange: null,
    authProvider: 'local',
  });

  useEffect(() => {
    loadSecurityInfo();
  }, []);

  const loadSecurityInfo = async () => {
    try {
      const res = await api.get('/auth/me');
      setSecurityInfo({
        isEmailVerified: res.data.user.isEmailVerified || false,
        lastLogin: res.data.user.lastLogin || null,
        lastPasswordChange: res.data.user.lastPasswordChange || null,
        authProvider: res.data.user.authProvider || 'local',
      });
    } catch (err) {
      console.error('Failed to load security info:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security Settings"
        description="Manage your account security and authentication preferences"
      />

      {/* Email Verification Status */}
      <ErpSection title="Email Verification" icon={Mail} tone="blue">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {securityInfo.isEmailVerified ? (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {securityInfo.isEmailVerified ? 'Email Verified' : 'Email Not Verified'}
                </h3>
                <p className="text-sm text-slate-500">
                  {securityInfo.isEmailVerified
                    ? 'Your email address has been verified'
                    : 'Please verify your email to secure your account'}
                </p>
              </div>
            </div>
            {securityInfo.isEmailVerified && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                <CheckCircle className="h-3.5 w-3.5" />
                Verified
              </span>
            )}
          </div>
        </div>
      </ErpSection>

      {/* Authentication Method */}
      <ErpSection title="Authentication Method" icon={ShieldCheck} tone="blue">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                {securityInfo.authProvider === 'google' ? (
                  <svg className="h-6 w-6" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                ) : (
                  <Key className="h-6 w-6 text-indigo-600" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {securityInfo.authProvider === 'google' ? 'Google Authentication' : 'Email & Password'}
                </h3>
                <p className="text-sm text-slate-500">
                  {securityInfo.authProvider === 'google'
                    ? 'You are signed in using your Google account'
                    : 'You are signed in using email and password'}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
              {securityInfo.authProvider === 'google' ? 'Google' : 'Local'}
            </span>
          </div>
        </div>
      </ErpSection>

      {/* Login History */}
      <ErpSection title="Login History" icon={Clock} tone="blue">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-900">Last Login</p>
                <p className="text-xs text-slate-500">Most recent successful login</p>
              </div>
            </div>
            <span className="text-sm font-semibold text-slate-700">{formatDate(securityInfo.lastLogin)}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-900">Last Password Change</p>
                <p className="text-xs text-slate-500">When you last updated your password</p>
              </div>
            </div>
            <span className="text-sm font-semibold text-slate-700">{formatDate(securityInfo.lastPasswordChange)}</span>
          </div>
        </div>
      </ErpSection>

      {/* Security Tips */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Security Tips</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Use a strong, unique password for your account</li>
              <li>• Enable two-factor authentication when available</li>
              <li>• Never share your password or OTP with anyone</li>
              <li>• Report any suspicious activity immediately</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
