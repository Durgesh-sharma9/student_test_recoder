import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/erp/PagePrimitives';
import {
  Mail,
  Lock,
  Phone,
  GraduationCap,
  CheckCircle2,
  BookOpen,
  CalendarCheck,
  ShieldCheck,
  Bell
} from 'lucide-react';

export default function ParentLogin() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { parentLogin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) toast.error(error);
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email && !phone) {
      toast.error('Please enter email or phone number');
      return;
    }
    setLoading(true);
    try {
      await parentLogin(email, phone, password);
      toast.success('Login successful');
      navigate('/parent/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
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
        
        {/* Left Side Content */}
        <div className="hidden lg:block flex-1 text-slate-900">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/50 px-5 py-2 text-sm font-semibold backdrop-blur-sm shadow-sm">
            <CheckCircle2 className="h-4 w-4 text-indigo-600" />
            <span className="text-indigo-700">Parent Portal Access</span>
          </div>
          
          <h1 className="text-6xl font-extrabold leading-tight tracking-tighter mb-2 drop-shadow-md">
            Parent <span className="text-indigo-600">Portal</span>
          </h1>
          <h2 className="text-3xl font-bold text-slate-700 mb-6 drop-shadow-sm">
            Stay <span className="text-emerald-600">Connected</span>
          </h2>
          
          <p className="mb-12 text-lg leading-relaxed text-slate-600 max-w-lg drop-shadow-sm font-medium">
            Access your child's academic performance, attendance records, and school updates through our secure parent portal. Everything you need to stay involved in your child's success.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: BookOpen, title: "Academic Records", desc: "View marks, grades, and teacher remarks easily.", color: "bg-blue-500" },
              { icon: CalendarCheck, title: "Attendance", desc: "Track daily attendance and missed school days.", color: "bg-emerald-500" },
              { icon: ShieldCheck, title: "Secure Access", desc: "Encrypted and safe portal for your privacy.", color: "bg-amber-500" },
              { icon: Bell, title: "Notifications", desc: "Get real-time updates and school alerts.", color: "bg-rose-500" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 rounded-2xl border border-white bg-white/70 p-5 backdrop-blur-md shadow-sm transition-transform hover:scale-[1.02]">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white ${item.color}`}>
                  <item.icon className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{item.title}</h4>
                  <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side Login Box */}
        <div className="w-full max-w-[400px] rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl sm:p-9">
          <div className="mb-8 flex items-center gap-3.5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
              <GraduationCap className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Parent Portal</h2>
              <p className="text-xs text-slate-500">Academic & Result Management</p>
            </div>
          </div>

          <h3 className="mb-1.5 text-3xl font-extrabold tracking-tight text-slate-900">Parent Login 👋</h3>
          <p className="mb-7 text-sm text-slate-500">Sign in with email or phone</p>

          <Button
            type="button"
            className="mb-4 h-12 w-full border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/google`}
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </Button>

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Email Address">
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input type="email" className="pl-10" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </FormField>
            <FormField label="Phone Number">
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input type="tel" className="pl-10" placeholder="Enter your phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </FormField>
            <FormField label="Password">
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input type="password" className="pl-10" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </FormField>
            <Button type="submit" className="mt-2 h-12 w-full text-sm" disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}