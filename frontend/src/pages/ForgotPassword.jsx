import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Mail, CheckCircle2, ShieldCheck, KeyRound, Lock, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/erp/PagePrimitives';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('email'); // 'email', 'otp', 'password', 'success'
  const navigate = useNavigate();

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setStep('otp');
      toast.success('OTP sent to your email.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/verify-reset-otp', { email, otp });
      setToken(res.data.token);
      setStep('password');
      toast.success('OTP verified successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!password || password.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, token, password });
      setStep('success');
      toast.success('Password reset successfully!');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password. Please request a new OTP.');
      setStep('email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 md:p-6">
      {/* Top Left Floating Back Button */}
      <div className="absolute top-4 left-4 md:top-6 md:left-6 z-20">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2 text-xs md:text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-md transition-all hover:bg-white hover:text-indigo-600 hover:shadow-md cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </button>
      </div>

      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "linear-gradient(135deg, rgba(255, 255, 255, 0.80), rgba(241, 245, 249, 0.70)), url('https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1400&auto=format&fit=crop')",
        }}
      />

      <div className="relative z-10 flex w-full max-w-6xl items-center justify-center lg:justify-between gap-12">
        {/* Left Side Content - Consistent with Login */}
        <div className="hidden lg:block flex-1 text-slate-900">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/50 px-5 py-2 text-sm font-semibold backdrop-blur-sm shadow-sm">
            <CheckCircle2 className="h-4 w-4 text-indigo-600" />
            <span className="text-indigo-700">Account Recovery</span>
          </div>
          <h1 className="text-6xl font-extrabold leading-tight tracking-tighter mb-2 drop-shadow-md">
            Forgot Your <span className="text-indigo-600">Password?</span>
          </h1>
          <p className="text-lg leading-relaxed text-slate-600 max-w-lg font-medium">
            Retrieve your credentials securely. Request a verification code, verify your identity, and set a new password.
          </p>
        </div>

        {/* Right Side Forgot Password Box */}
        <div className="w-full max-w-[400px] rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl sm:p-9 text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm">
              {step === 'success' ? (
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              ) : step === 'otp' ? (
                <KeyRound className="h-8 w-8 text-indigo-600 animate-bounce" />
              ) : step === 'password' ? (
                <Lock className="h-8 w-8 text-indigo-600" />
              ) : (
                <ShieldCheck className="h-8 w-8 animate-pulse" />
              )}
            </div>
          </div>

          {step === 'email' && (
            <>
              <h3 className="mb-1.5 text-2xl font-extrabold tracking-tight text-slate-900">Forgot Password</h3>
              <p className="mb-6 text-sm text-slate-500">Provide email to receive verification code</p>

              <form onSubmit={handleSendOTP} className="space-y-4 text-left">
                <FormField label="Email Address">
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input 
                      type="email" 
                      className="pl-10" 
                      placeholder="Enter your email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      required 
                    />
                  </div>
                </FormField>
                <Button type="submit" className="mt-2 h-12 w-full text-sm font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-0 shadow-md shadow-purple-500/10 hover:shadow-purple-500/20" disabled={loading}>
                  {loading ? 'Sending OTP...' : 'Send Verification OTP'}
                </Button>
              </form>
            </>
          )}

          {step === 'otp' && (
            <>
              <h3 className="mb-1.5 text-2xl font-extrabold tracking-tight text-slate-900">Enter OTP</h3>
              <p className="mb-6 text-xs text-slate-500">We sent a 6-digit OTP code to <strong className="text-slate-700">{email}</strong></p>

              <form onSubmit={handleVerifyOTP} className="space-y-4 text-left">
                <FormField label="Verification OTP Code">
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input 
                      type="text" 
                      className="pl-10 text-center tracking-[0.5em] font-bold text-lg" 
                      placeholder="XXXXXX" 
                      value={otp} 
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                      required 
                    />
                  </div>
                </FormField>
                <Button type="submit" className="mt-2 h-12 w-full text-sm font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-0 shadow-md shadow-purple-500/10 hover:shadow-purple-500/20" disabled={loading}>
                  {loading ? 'Verifying OTP...' : 'Verify OTP'}
                </Button>
              </form>
            </>
          )}

          {step === 'password' && (
            <>
              <h3 className="mb-1.5 text-2xl font-extrabold tracking-tight text-slate-900">New Password</h3>
              <p className="mb-6 text-sm text-slate-500">Set a strong password for your account</p>

              <form onSubmit={handleResetPassword} className="space-y-4 text-left">
                <FormField label="New Password">
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input 
                      type="password" 
                      className="pl-10" 
                      placeholder="Min 8 characters" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      required 
                    />
                  </div>
                </FormField>

                <FormField label="Confirm New Password">
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input 
                      type="password" 
                      className="pl-10" 
                      placeholder="Confirm new password" 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                      required 
                    />
                  </div>
                </FormField>

                <Button type="submit" className="mt-2 h-12 w-full text-sm font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-0 shadow-md shadow-purple-500/10 hover:shadow-purple-500/20" disabled={loading}>
                  {loading ? 'Updating Password...' : 'Reset Password'}
                </Button>
              </form>
            </>
          )}

          {step === 'success' && (
            <div className="py-4">
              <h3 className="mb-1.5 text-2xl font-extrabold tracking-tight text-slate-900">Reset Success!</h3>
              <p className="text-sm text-slate-500 mt-2">
                Your password has been updated successfully. Redirecting you to login...
              </p>
            </div>
          )}

          {step !== 'success' && (
            <button
              onClick={() => {
                if (step === 'otp') {
                  setStep('email');
                } else if (step === 'password') {
                  setStep('otp');
                } else {
                  navigate('/login');
                }
              }}
              className="mt-6 text-sm text-indigo-600 font-semibold hover:underline flex items-center justify-center gap-1.5 mx-auto"
            >
              {step === 'otp' ? '← Back to Email' : step === 'password' ? '← Back to OTP' : '← Back to Login'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
