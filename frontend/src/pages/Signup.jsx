import { useState } from 'react';

import { Link, useNavigate } from 'react-router-dom';

import { toast } from 'sonner';

import { GraduationCap, School, Mail, ArrowLeft, ShieldCheck } from 'lucide-react';

import api from '@/lib/api';

import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';

import { FormField } from '@/components/erp/PagePrimitives';

import { useAuth } from '@/context/AuthContext';



export default function Signup() {

  const { setUser } = useAuth();

  const [form, setForm] = useState({ schoolName: '', adminName: '', email: '', phone: '', password: '' });

  const [loading, setLoading] = useState(false);

  const [sendingOTP, setSendingOTP] = useState(false);

  const [showOTP, setShowOTP] = useState(false);

  const [otp, setOtp] = useState('');

  const [showSuccess, setShowSuccess] = useState(false);

  const navigate = useNavigate();

  const handleSendOTP = async (e) => {
    e.preventDefault();

    setSendingOTP(true);

    try {
      await api.post('/auth/send-signup-otp', form);
      setShowOTP(true);
      toast.success('OTP sent to your email');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setSendingOTP(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    if (otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);

    try {
      console.log('[handleVerifyOTP] Sending OTP verification request');
      const res = await api.post('/auth/verify-signup-otp', { email: form.email, otp });
      console.log('[handleVerifyOTP] Verify OTP API Result:', res);
      console.log('[handleVerifyOTP] Response data:', res.data);
      console.log('[handleVerifyOTP] Response status:', res.status);

      // Store token and user data
      localStorage.setItem('token', res.data.token);
      console.log('[handleVerifyOTP] Token saved to localStorage');

      localStorage.setItem('user', JSON.stringify(res.data.user));
      console.log('[handleVerifyOTP] User saved to localStorage');
      
      // Update AuthContext state
      setUser(res.data.user);
      console.log('[handleVerifyOTP] Auth context user updated');

      console.log('[handleVerifyOTP] OTP Verification Success');
      console.log('[handleVerifyOTP] Auto Login Triggered');
      console.log('[handleVerifyOTP] Dashboard Redirect Triggered');

      setShowSuccess(true);
      toast.success('Email verified successfully');

      // Auto-redirect to admin dashboard after 2 seconds
      setTimeout(() => {
        console.log('[handleVerifyOTP] Redirecting to /admin');
        navigate('/admin');
      }, 2000);

    } catch (err) {
      console.error('[handleVerifyOTP] OTP Verification Error:', err);
      console.error('[handleVerifyOTP] Error response:', err.response);
      console.error('[handleVerifyOTP] Error message:', err.response?.data?.message);

      toast.error(err.response?.data?.message || 'OTP verification failed');

    } finally {

      setLoading(false);

    }

  };

  const handleResendOTP = async () => {
    setSendingOTP(true);
    try {
      await api.post('/auth/send-signup-otp', form);
      toast.success('OTP resent to your email');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setSendingOTP(false);
    }
  };

  const handleBack = () => {
    setShowOTP(false);
    setOtp('');
  };



  return (

    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">

      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">

        <div className="border-b border-blue-100 bg-blue-50 px-6 py-5">

          <div className="flex items-center gap-3">
            {showOTP && (
              <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">

              {showOTP ? <Mail className="h-5 w-5" /> : <School className="h-5 w-5" />}

            </div>

            <div>

              <h1 className="text-xl font-bold text-slate-900">{showOTP ? 'Verify Email' : 'School Sign Up'}</h1>

              <p className="text-sm text-slate-500">{showOTP ? 'Enter the OTP sent to your email' : 'Create your school account'}</p>

            </div>

          </div>

        </div>



        <div className="p-6">

          {!showOTP ? (
            <form className="space-y-4" onSubmit={handleSendOTP}>

              <FormField label="School Name">

                <Input placeholder="School Name" value={form.schoolName} onChange={(e) => setForm({ ...form, schoolName: e.target.value })} required />

              </FormField>

              <FormField label="Admin Name">

                <Input placeholder="Admin Name" value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} required />

              </FormField>

              <FormField label="Email">

                <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />

              </FormField>

              <FormField label="Phone">

                <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />

              </FormField>

              <FormField label="Password">

                <Input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />

              </FormField>

              <Button className="w-full" variant="success" disabled={sendingOTP}>

                <GraduationCap className="mr-2 h-4 w-4" />

                {sendingOTP ? 'Sending OTP...' : 'Send OTP'}

              </Button>

            </form>
          ) : showSuccess ? (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <ShieldCheck className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Email Verified Successfully</h3>
              <p className="text-slate-600 mb-4">Creating your account...</p>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleVerifyOTP}>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 mb-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900 mb-1">Verify Your Email</p>
                    <p className="text-sm text-blue-700">
                      We have sent a 6-digit verification code to <strong>{form.email}</strong>.
                    </p>
                  </div>
                </div>
              </div>

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

              <Button className="w-full" variant="success" disabled={loading}>
                <GraduationCap className="mr-2 h-4 w-4" />
                {loading ? 'Verifying...' : 'Verify OTP'}
              </Button>

              <Button
                type="button"
                onClick={handleResendOTP}
                disabled={sendingOTP}
                variant="ghost"
                className="w-full h-8 text-sm"
              >
                <Mail className="mr-2 h-3 w-3" />
                {sendingOTP ? 'Resending...' : 'Resend OTP'}
              </Button>

              <Button
                type="button"
                onClick={handleBack}
                variant="outline"
                className="w-full h-8 text-sm"
              >
                Change Email
              </Button>
            </form>
          )}



          <p className="mt-5 text-center text-sm text-slate-500">

            Already have an account?{' '}

            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-700">

              Login

            </Link>

          </p>

        </div>

      </div>

    </div>

  );

}

