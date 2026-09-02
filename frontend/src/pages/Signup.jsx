import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  GraduationCap, School, Mail, ArrowLeft, ShieldCheck, 
  CheckCircle2, UserCircle, Briefcase, PieChart, ClipboardList,
  Phone
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/erp/PagePrimitives';
import { useAuth } from '@/context/AuthContext';
import BrandLogo from '@/components/brand/BrandLogo';

const COUNTRY_CODES = [
  { code: '+91', iso: 'in', name: 'India', flag: '🇮🇳' },
  { code: '+1', iso: 'us', name: 'US / Canada', flag: '🇺🇸' },
  { code: '+44', iso: 'gb', name: 'UK', flag: '🇬🇧' },
  { code: '+971', iso: 'ae', name: 'UAE', flag: '🇦🇪' },
  { code: '+966', iso: 'sa', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+977', iso: 'np', name: 'Nepal', flag: '🇳🇵' },
  { code: '+880', iso: 'bd', name: 'Bangladesh', flag: '🇧🇩' },
  { code: '+61', iso: 'au', name: 'Australia', flag: '🇦🇺' },
  { code: '+65', iso: 'sg', name: 'Singapore', flag: '🇸🇬' },
  { code: '+60', iso: 'my', name: 'Malaysia', flag: '🇲🇾' },
];

export default function Signup() {
  const { setSession } = useAuth();
  const [form, setForm] = useState({ schoolName: '', adminName: '', email: '', password: '' });
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingOTP, setSendingOTP] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [otp, setOtp] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (sendingOTP) return;

    if (!form.schoolName.trim() || !form.adminName.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error('Please fill in all required fields (School Name, Admin Name, Email, Password)');
      return;
    }

    const cleanPhone = phoneNumber.trim();
    if (cleanPhone && cleanPhone.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    const fullPhone = cleanPhone ? `${countryCode} ${cleanPhone}` : '';

    setSendingOTP(true);
    try {
      console.log('[Signup] Sending OTP request body:', { ...form, phone: fullPhone, password: '***' });
      const res = await api.post('/auth/send-signup-otp', {
        ...form,
        email: form.email.toLowerCase().trim(),
        schoolName: form.schoolName.trim(),
        adminName: form.adminName.trim(),
        phone: fullPhone,
      });
      console.log('[Signup] Send OTP API response:', res.status, res.data);
      setShowOTP(true);
      toast.success(res.data?.message || 'OTP sent to your email');
    } catch (err) {
      console.error('[Signup] Send OTP API Error:', err.response?.status, err.response?.data || err.message);
      const backendMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to send OTP';
      toast.error(backendMessage);
      setShowOTP(false);
    } finally {
      setSendingOTP(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (loading) return;

    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    let apiSuccess = false;
    let authUser = null;
    let authToken = null;
    let successMessage = '';

    try {
      console.log('[Signup] Verifying OTP request:', { email: form.email.toLowerCase().trim(), otp: cleanOtp });
      const res = await api.post('/auth/verify-signup-otp', { email: form.email.toLowerCase().trim(), otp: cleanOtp });
      console.log('[Signup] Verify OTP API response status:', res.status, res.data);

      if (res.data && res.data.success && res.data.token && res.data.user) {
        apiSuccess = true;
        authToken = res.data.token;
        authUser = res.data.user;
        successMessage = res.data.message || 'Email verified successfully! Logging you in...';
      } else {
        toast.error(res.data?.message || 'OTP verification failed. Please try again.');
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error('[Signup] Verify OTP API Error:', err.response?.status, err.response?.data || err.message);
      if (err.response) {
        const backendMessage = err.response?.data?.message || err.response?.data?.error || 'OTP verification failed';
        toast.error(backendMessage);
      } else {
        console.error('[Signup] Unexpected error during OTP API call:', err);
        toast.error('An unexpected error occurred. Please try again.');
      }
      setLoading(false);
      return;
    }

    // Process successful OTP verification safely
    if (apiSuccess && authToken && authUser) {
      try {
        if (typeof setSession === 'function') {
          setSession(authUser, authToken);
        } else {
          localStorage.setItem('token', authToken);
          localStorage.setItem('user', JSON.stringify(authUser));
        }
      } catch (storageErr) {
        console.error('[Signup] Error saving session to local storage/context:', storageErr);
      }

      setShowSuccess(true);
      toast.success(successMessage);
      
      const role = authUser.role === 'admin' ? 'school_admin' : authUser.role;
      setTimeout(() => {
        if (role === 'super_admin') navigate('/super-admin');
        else if (role === 'school_admin') navigate('/admin');
        else if (role === 'teacher') navigate('/teacher');
        else if (role === 'parent') navigate('/parent');
        else navigate('/admin');
      }, 800);
    }
  };

  const handleResendOTP = async () => {
    if (sendingOTP || loading) return;
    const cleanPhone = phoneNumber.trim();
    const fullPhone = cleanPhone ? `${countryCode} ${cleanPhone}` : '';

    setSendingOTP(true);
    try {
      console.log('[Signup] Resending OTP to:', form.email);
      const res = await api.post('/auth/send-signup-otp', {
        ...form,
        email: form.email.toLowerCase().trim(),
        schoolName: form.schoolName.trim(),
        adminName: form.adminName.trim(),
        phone: fullPhone,
      });
      console.log('[Signup] Resend OTP API response:', res.status, res.data);
      toast.success(res.data?.message || 'OTP resent to your email');
    } catch (err) {
      console.error('[Signup] Resend OTP API Error:', err.response?.status, err.response?.data || err.message);
      const backendMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to resend OTP';
      toast.error(backendMessage);
    } finally {
      setSendingOTP(false);
    }
  };

  const handleBack = () => { setShowOTP(false); setOtp(''); };

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
        <div className="w-full max-w-[380px] rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xl">
          <div className="relative mb-4 flex items-center justify-center min-h-[30px]">
            {showOTP && (
              <Button variant="ghost" size="icon" onClick={handleBack} className="absolute left-0 h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Link to="/" className="inline-flex items-center transition-opacity hover:opacity-90">
              <BrandLogo className="h-7 sm:h-8" />
            </Link>
          </div>

          {!showOTP ? (
            <>
              <h3 className="mb-1 text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">School Signup 🚀</h3>
              <p className="mb-4 text-xs sm:text-sm text-slate-500">Register your school to get started</p>

              <form className="space-y-3" onSubmit={handleSendOTP}>
                <FormField label="School Name"><Input className="h-10 text-sm" placeholder="School Name" value={form.schoolName} onChange={(e) => setForm({ ...form, schoolName: e.target.value })} required /></FormField>
                <FormField label="Admin Name"><Input className="h-10 text-sm" placeholder="Admin Name" value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} required /></FormField>
                <FormField label="Email"><Input className="h-10 text-sm" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></FormField>
                
                <FormField label="Mobile Number">
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:outline-none shrink-0"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code + c.iso} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={phoneNumber}
                    maxLength={10}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="flex-1 h-10 text-sm"
                  />
                </div>
              </FormField>

              <FormField label="Password"><Input className="h-10 text-sm" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></FormField>
              <Button className="w-full h-11 mt-1.5 text-sm font-semibold" disabled={sendingOTP}>{sendingOTP ? 'Sending OTP...' : 'Send OTP'}</Button>
            </form>
          </>
          ) : showSuccess ? (
            <div className="text-center py-6">
              <div className="mx-auto w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-3"><ShieldCheck className="h-7 w-7 text-green-600" /></div>
              <h3 className="text-lg font-semibold text-slate-900">Verified!</h3>
            </div>
          ) : (
            <>
              <h3 className="mb-1 text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">Verify OTP 🔐</h3>
              <p className="mb-4 text-xs sm:text-sm text-slate-500">Enter the verification code sent to your phone</p>

              <form className="space-y-3.5" onSubmit={handleVerifyOTP}>
                <FormField label="Enter OTP"><Input className="h-12 text-center text-lg tracking-widest font-mono" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} required /></FormField>
                <Button className="w-full h-11 text-sm font-semibold" disabled={loading}>{loading ? 'Verifying...' : 'Verify OTP'}</Button>
                <Button type="button" onClick={handleResendOTP} variant="ghost" className="w-full h-9 text-xs" disabled={sendingOTP || loading}>
                  {sendingOTP ? 'Resending OTP...' : 'Resend OTP'}
                </Button>
              </form>
            </>
          )}

          <p className="mt-5 text-center text-xs sm:text-sm text-slate-500">
            Already have an account? <Link to="/login" className="font-semibold text-indigo-600 hover:underline">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}