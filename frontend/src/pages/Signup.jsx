import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  GraduationCap, School, Mail, ArrowLeft, ShieldCheck, 
  CheckCircle2, UserCircle, Briefcase, PieChart, ClipboardList 
} from 'lucide-react';
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
      const res = await api.post('/auth/verify-signup-otp', { email: form.email, otp });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      setShowSuccess(true);
      toast.success('Email verified successfully');
      setTimeout(() => navigate('/admin'), 2000);
    } catch (err) {
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

  const handleBack = () => { setShowOTP(false); setOtp(''); };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 md:p-6">
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "linear-gradient(135deg, rgba(255, 255, 255, 0.80), rgba(241, 245, 249, 0.70)), url('https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1400&auto=format&fit=crop')",
        }}
      />

      <div className="relative z-10 flex w-full max-w-6xl items-center justify-center lg:justify-between gap-12">
        
        {/* Left Side Content - Same as Login Page */}
        <div className="hidden lg:block flex-1 text-slate-900">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/50 px-5 py-2 text-sm font-semibold backdrop-blur-sm shadow-sm">
            <CheckCircle2 className="h-4 w-4 text-indigo-600" />
            <span className="text-indigo-700">Test Master Pro</span>
          </div>
          
          <h1 className="text-6xl font-extrabold leading-tight tracking-tighter mb-2 drop-shadow-md">
            <span className="text-slate-900">Test</span> <span className="text-indigo-600">Master</span> <span className="text-blue-500">Pro</span>
          </h1>
          <h2 className="text-3xl font-bold text-slate-700 mb-6 drop-shadow-sm">
            Schools <span className="text-emerald-600">Pro Management</span>
          </h2>
          
          <p className="mb-12 text-lg leading-relaxed text-slate-600 max-w-lg drop-shadow-sm font-medium">
            Simplify school management with one powerful platform. Manage students, teachers, daily tests, results, parent communication, and academic performance—all from a single dashboard.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: UserCircle, title: "Student Management", desc: "Manage student profiles, admissions, attendance, and academic records.", color: "bg-blue-500" },
              { icon: Briefcase, title: "Teacher Management", desc: "Assign classes, subjects, daily tests, and monitor teacher performance.", color: "bg-emerald-500" },
              { icon: PieChart, title: "Daily Test & Results", desc: "Conduct daily tests, generate results, rankings, and performance reports.", color: "bg-amber-500" },
              { icon: ClipboardList, title: "Parent Portal", desc: "Parents can view results, rankings, progress, notifications, and student performance.", color: "bg-rose-500" },
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

        {/* Right Side Form Box */}
        <div className="w-full max-w-[400px] rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl sm:p-9">
          <div className="mb-8 flex items-center gap-3.5">
            {showOTP && (
              <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
              <School className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">School Signup</h2>
              <p className="text-xs text-slate-500">Academic & Result Management</p>
            </div>
          </div>

          {!showOTP ? (
            <form className="space-y-4" onSubmit={handleSendOTP}>
              <FormField label="School Name"><Input placeholder="School Name" value={form.schoolName} onChange={(e) => setForm({ ...form, schoolName: e.target.value })} required /></FormField>
              <FormField label="Admin Name"><Input placeholder="Admin Name" value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} required /></FormField>
              <FormField label="Email"><Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></FormField>
              <FormField label="Phone"><Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></FormField>
              <FormField label="Password"><Input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></FormField>
              <Button className="w-full h-12 mt-2" disabled={sendingOTP}>{sendingOTP ? 'Sending OTP...' : 'Send OTP'}</Button>
            </form>
          ) : showSuccess ? (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4"><ShieldCheck className="h-8 w-8 text-green-600" /></div>
              <h3 className="text-xl font-semibold text-slate-900">Verified!</h3>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleVerifyOTP}>
              <FormField label="Enter OTP"><Input className="h-12 text-center text-lg tracking-widest" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} required /></FormField>
              <Button className="w-full h-12" disabled={loading}>{loading ? 'Verifying...' : 'Verify OTP'}</Button>
              <Button type="button" onClick={handleResendOTP} variant="ghost" className="w-full">Resend OTP</Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account? <Link to="/login" className="font-semibold text-indigo-600">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}