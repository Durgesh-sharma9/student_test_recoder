import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CheckCircle, XCircle, AlertCircle, Mail, ArrowRight } from 'lucide-react';
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
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch (err) {
        console.error('Email verification error:', err);
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo/Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 mb-4">
              <Mail className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Test Master Pro</h1>
            <p className="text-slate-500 mt-1">Email Verification</p>
          </div>

          {/* Status Messages */}
          {status === 'loading' && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 animate-pulse mb-4">
                <Mail className="h-6 w-6 text-indigo-600" />
              </div>
              <p className="text-slate-600">Verifying your email...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Email Verified!</h2>
              <p className="text-slate-600 mb-6">{message}</p>
              <p className="text-sm text-slate-500">Redirecting to login page...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Verification Failed</h2>
              <p className="text-slate-600 mb-6">{message}</p>
              <button
                onClick={handleResendVerification}
                className="inline-flex items-center justify-center w-full px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
              >
                Request New Verification Email
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          )}

          {status === 'expired' && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-4">
                <AlertCircle className="h-8 w-8 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Link Expired</h2>
              <p className="text-slate-600 mb-6">{message}</p>
              <button
                onClick={handleResendVerification}
                className="inline-flex items-center justify-center w-full px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
              >
                Request New Verification Email
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          )}

          {/* Back to Login */}
          {status !== 'loading' && status !== 'success' && (
            <div className="mt-6 pt-6 border-t border-slate-200 text-center">
              <button
                onClick={() => navigate('/login')}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                ← Back to Login
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Powered by Test Master Pro
        </p>
      </div>
    </div>
  );
}
