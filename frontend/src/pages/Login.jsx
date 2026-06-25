import { useState, useEffect } from 'react';

import { useNavigate, useLocation } from 'react-router-dom';

import { toast } from 'sonner';

import { useAuth } from '@/context/AuthContext';

import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';

import { FormField } from '@/components/erp/PagePrimitives';

import {

  GraduationCap,

  Mail,

  Lock,

  ShieldCheck,

  BookOpen,

  AlertCircle,

} from 'lucide-react';

import api from '@/lib/api';

export default function Login() {

  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);

  const [resendingVerification, setResendingVerification] = useState(false);

  const [showResendVerification, setShowResendVerification] = useState(false);

  const [loginError, setLoginError] = useState('');

  const { login } = useAuth();

  const navigate = useNavigate();

  const location = useLocation();

  // Check if we should show resend verification from navigation state
  useEffect(() => {
    if (location.state?.showResendVerification) {
      setShowResendVerification(true);
      setLoginError('Please verify your email before logging in.');
    }
  }, [location.state]);

  const handleResendVerification = async () => {
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setResendingVerification(true);
    try {
      await api.post('/auth/resend-verification-email', { email });
      toast.success('Verification email sent successfully. Please check your inbox.');
      setShowResendVerification(false);
      setLoginError('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send verification email');
    } finally {
      setResendingVerification(false);
    }
  };

  const handleSubmit = async (e) => {

    e.preventDefault();

    setLoading(true);
    setLoginError('');
    setShowResendVerification(false);

    try {

      const user = await login(email, password);

      toast.success('Login successful');

      const role = user.role === 'admin' ? 'school_admin' : user.role;

      
      if (role === 'super_admin') navigate('/super-admin');

      else if (role === 'school_admin') navigate('/admin');

      else navigate('/teacher');

    } catch (err) {

      const errorMessage = err.response?.data?.message || 'Login failed';
      setLoginError(errorMessage);
      
      // Check if error is due to unverified email
      if (errorMessage.includes('verify your email')) {
        setShowResendVerification(true);
      }
      
      toast.error(errorMessage);

    } finally {

      setLoading(false);

    }

  };

  return (

    <div className="flex min-h-screen overflow-hidden bg-slate-50">

      {/* LEFT PANEL */}

      <div

        className="relative hidden flex-1 items-center justify-center bg-cover bg-center p-12 lg:flex"

        style={{

          backgroundImage:

            "linear-gradient(135deg, rgba(255,255,255,0.92), rgba(238,242,255,0.96)), url('https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1400&auto=format&fit=crop')",

        }}

      >

        <div

          className="pointer-events-none absolute inset-0 opacity-60"

          style={{

            backgroundImage:

              'linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)',

            backgroundSize: '42px 42px',

          }}

        />

        <div className="relative z-10 max-w-md">

          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-600">

            <span className="h-2 w-2 rounded-full bg-indigo-600" />

            Multi-Tenant School SaaS

          </div>

          <h1 className="mb-5 text-5xl font-extrabold leading-tight tracking-tight text-slate-900">

            Smart <span className="text-indigo-600">School ERP</span>

            <br />

            Management System

          </h1>

          <p className="mb-10 max-w-sm text-[15px] leading-relaxed text-slate-600">

            Manage students, teachers, classes, rankings,

            attendance and academic performance using a

            modern centralized dashboard platform.

          </p>

          <div className="flex flex-col gap-4">

            <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white/75 p-4 shadow-sm backdrop-blur-sm">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">

                <GraduationCap className="h-6 w-6" />

              </div>

              <div>

                <h4 className="text-[15px] font-bold text-slate-900">Student Management</h4>

                <p className="text-xs leading-snug text-slate-500">Track records, rankings and academic progress</p>

              </div>

            </div>

            <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white/75 p-4 shadow-sm backdrop-blur-sm">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">

                <ShieldCheck className="h-6 w-6" />

              </div>

              <div>

                <h4 className="text-[15px] font-bold text-slate-900">Secure Dashboard Access</h4>

                <p className="text-xs leading-snug text-slate-500">Protected role based admin and teacher system</p>

              </div>

            </div>

            <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white/75 p-4 shadow-sm backdrop-blur-sm">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">

                <BookOpen className="h-6 w-6" />

              </div>

              <div>

                <h4 className="text-[15px] font-bold text-slate-900">Daily Test Analytics</h4>

                <p className="text-xs leading-snug text-slate-500">Analyze results and monitor performance trends</p>

              </div>

            </div>

          </div>

        </div>

      </div>

      {/* RIGHT PANEL */}

      <div className="flex w-full items-center justify-center p-6 sm:p-10 lg:w-[500px] lg:shrink-0">

        <div className="w-full max-w-[400px] rounded-3xl border border-slate-200 bg-white p-8 shadow-lg sm:p-9">

          <div className="mb-8 flex items-center gap-3.5">

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">

              <GraduationCap className="h-7 w-7" />

            </div>

            <div>

              <h2 className="text-lg font-extrabold text-slate-900">School Portal</h2>

              <p className="text-xs text-slate-500">Academic & Result Management</p>

            </div>

          </div>

          <h3 className="mb-1.5 text-3xl font-extrabold tracking-tight text-slate-900">

            Welcome Back 👋

          </h3>

          <p className="mb-7 text-sm text-slate-500">

            Login to continue to your dashboard

          </p>

          <Button
            type="button"
            className="mb-4 h-12 w-full border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/google`}
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
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
            Continue with Google
          </Button>

          <div className="my-6 flex items-center gap-3">

            <div className="h-px flex-1 bg-slate-200" />

            <span className="text-[11px] font-bold tracking-wide text-slate-400">OR</span>

            <div className="h-px flex-1 bg-slate-200" />

          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

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

            <FormField label="Password">

              <div className="relative">

                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <Input

                  type="password"

                  className="pl-10"

                  placeholder="Enter your password"

                  value={password}

                  onChange={(e) => setPassword(e.target.value)}

                  required

                />

              </div>

            </FormField>

            <Button type="submit" className="mt-2 h-12 w-full text-sm" disabled={loading}>

              {loading ? 'Signing In...' : 'Sign In'}

            </Button>

            {/* Show resend verification email option if needed */}
            {showResendVerification && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-800 mb-2">{loginError}</p>
                    <Button
                      onClick={handleResendVerification}
                      disabled={resendingVerification}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      {resendingVerification ? 'Sending...' : 'Resend Verification Email'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

          </form>

          <div className="my-7 flex items-center gap-3">

            <div className="h-px flex-1 bg-slate-200" />

            <span className="text-[11px] font-bold tracking-wide text-slate-400">DEMO ACCOUNTS</span>

            <div className="h-px flex-1 bg-slate-200" />

          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

            <div className="mb-3.5 flex items-center gap-2 text-sm font-bold text-indigo-600">

              <ShieldCheck className="h-4 w-4" />

              Demo Credentials

            </div>

            <div className="mb-3 flex flex-wrap items-center gap-2.5">

              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">Super</span>

              <span className="text-xs text-slate-600">super@school.com / super123</span>

            </div>

            <div className="mb-3 flex flex-wrap items-center gap-2.5">

              <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-bold text-indigo-600">Admin</span>

              <span className="text-xs text-slate-600">admin@school.com / admin123</span>

            </div>

            <div className="flex flex-wrap items-center gap-2.5">

              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">Teacher</span>

              <span className="text-xs text-slate-600">teacher@school.com / teacher123</span>

            </div>

          </div>

        </div>

      </div>

    </div>

  );

}

