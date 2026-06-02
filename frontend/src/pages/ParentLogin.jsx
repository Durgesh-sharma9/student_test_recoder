import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/erp/PagePrimitives';
import {
  GraduationCap,
  Mail,
  Lock,
  Phone,
  ArrowLeft,
} from 'lucide-react';

export default function ParentLogin() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { parentLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email && !phone) {
      toast.error('Please enter email or phone number');
      return;
    }

    setLoading(true);

    try {
      const user = await parentLogin(email, phone, password);
      toast.success('Login successful');
      navigate('/parent/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
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
            Parent <span className="text-indigo-600">Portal</span>
            <br />
            Login
          </h1>

          <p className="mb-10 max-w-sm text-[15px] leading-relaxed text-slate-600">
            Access your child's academic performance, attendance records, and school updates through our secure parent portal.
          </p>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white/75 p-4 shadow-sm backdrop-blur-sm">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-[15px] font-bold text-slate-900">Track Progress</h4>
                <p className="text-xs leading-snug text-slate-500">Monitor your child's academic performance</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white/75 p-4 shadow-sm backdrop-blur-sm">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-[15px] font-bold text-slate-900">Secure Access</h4>
                <p className="text-xs leading-snug text-slate-500">Protected parent login system</p>
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
              <h2 className="text-lg font-extrabold text-slate-900">Parent Portal</h2>
              <p className="text-xs text-slate-500">Academic & Result Management</p>
            </div>
          </div>

          <h3 className="mb-1.5 text-3xl font-extrabold tracking-tight text-slate-900">
            Parent Login 👋
          </h3>
          <p className="mb-7 text-sm text-slate-500">
            Login with email or phone number
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Email Address (Optional)">
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="email"
                  className="pl-10"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </FormField>

            <FormField label="Phone Number (Required if no email)">
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="tel"
                  className="pl-10"
                  placeholder="Enter your phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required={!email}
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
          </form>

          <div className="mt-6">
            <Button
              type="button"
              variant="ghost"
              className="w-full text-sm"
              onClick={() => navigate('/login')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Staff Login
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
