import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CheckCircle, XCircle, AlertCircle, Mail, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading, success, error, expired
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmailToken = async () => {
      const token = searchParams.get('token');
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link. No token provided.');
        return;
      }
      try {
        const res = await api.get(`/auth/verify-email?token=${token}`);
        setStatus('success');
        setMessage(res.data.message || 'Email verified successfully!');
        toast.success('Email verified successfully!');
        setTimeout(() => navigate('/login'), 3000);
      } catch (err) {
        const errorMessage = err.response?.data?.message || 'Verification failed';
        if (errorMessage.includes('expired')) {
          setStatus('expired');
          setMessage('Verification link has expired. Please request a new verification email.');
        } else {
          setStatus('error');
          setMessage(errorMessage);
        }
        toast.error(errorMessage);
      }
    };
    verifyEmailToken();
  }, [searchParams, navigate]);

  const handleResendVerification = () => {
    navigate('/login', { state: { showResendVerification: true } });
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 md:p-6">
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "linear-gradient(135deg, rgba(255, 255, 255, 0.80), rgba(241, 245, 249, 0.70)), url('https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1400&auto=format&fit=crop')",
        }}
      />

      <div className="relative z-10 flex w-full max-w-6xl items-center justify-center lg:justify-between gap-12">
        {/* Left Side Content - Consistent with Login/Signup */}
        <div className="hidden lg:block flex-1 text-slate-900">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/50 px-5 py-2 text-sm font-semibold backdrop-blur-sm shadow-sm">
            <CheckCircle2 className="h-4 w-4 text-indigo-600" />
            <span className="text-indigo-700">Account Security</span>
          </div>
          <h1 className="text-6xl font-extrabold leading-tight tracking-tighter mb-2 drop-shadow-md">
            Verify Your <span className="text-indigo-600">Email</span>
          </h1>
          <p className="text-lg leading-relaxed text-slate-600 max-w-lg font-medium">
            Confirm your email address to secure your account and start using all the features of Test Master Pro.
          </p>
        </div>

        {/* Right Side Status Box */}
        <div className="w-full max-w-[400px] rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl sm:p-9 text-center">
          <div className="mb-8 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600 shadow-sm">
              <Mail className="h-10 w-10" />
            </div>
          </div>

          {status === 'loading' && (
            <div className="py-4">
              <h2 className="text-xl font-bold text-slate-900">Verifying...</h2>
              <p className="text-sm text-slate-500 mt-2">Please wait while we confirm your email.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-4">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h2 className="text-xl font-bold text-slate-900">Email Verified!</h2>
              <p className="text-sm text-slate-500 mt-2">{message}</p>
            </div>
          )}

          {(status === 'error' || status === 'expired') && (
            <div className="py-4">
              {status === 'expired' ? (
                <AlertCircle className="mx-auto h-12 w-12 text-amber-500 mb-4" />
              ) : (
                <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              )}
              <h2 className="text-xl font-bold text-slate-900">{status === 'expired' ? 'Link Expired' : 'Verification Failed'}</h2>
              <p className="text-sm text-slate-500 mt-2 mb-6">{message}</p>
              
              <button
                onClick={handleResendVerification}
                className="w-full h-12 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all"
              >
                Request New Link
              </button>
            </div>
          )}

          {status !== 'loading' && (
            <button
              onClick={() => navigate('/login')}
              className="mt-6 text-sm text-indigo-600 font-medium hover:underline"
            >
              ← Back to Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}