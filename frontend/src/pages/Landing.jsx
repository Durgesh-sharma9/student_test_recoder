import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import BrandLogo from "@/components/brand/BrandLogo";
import {
  GraduationCap, BarChart3, Users, BookOpen, Trophy,
  Calendar, ArrowRight, ClipboardList, FileSpreadsheet,
  Smartphone, Building2, ChevronRight, Star, Zap, Cloud,
  Lock, TrendingUp, FileText, Play, Check, X, Twitter,
  Linkedin, Facebook, Instagram, Mail, Phone, MapPin, Gem,
  Activity, Bell, UserPlus, Receipt, Megaphone
} from "lucide-react";
// my landing page
/* ─── animated counter ─── */
function useCounter(target, duration = 1400, start = false) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!start) return;
    let t0 = null;
    const tick = (ts) => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / duration, 1);
      setV(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [start, target, duration]);
  return v;
}

function StatCard({ value, suffix, label, icon: Icon, gradient, delay, inView }) {
  const count = useCounter(value, 1400, inView);
  const display = value >= 1000
    ? (count >= 1000 ? Math.round(count / 1000) + "K" : Math.round(count))
    : count;
  return (
    <div className="stat-card" style={{ background: gradient, animationDelay: `${delay}ms` }}>
      <div className="stat-icon-bg"><Icon size={18} color="#fff" /></div>
      <div className="stat-num" style={{ color: "#fff" }}>{display}{suffix}</div>
      <div className="stat-lbl">{label}</div>
    </div>
  );
}

export default function Landing() {
  const [statsVisible, setStatsVisible] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDashTab, setActiveDashTab] = useState(0);
  const statsRef = useRef(null);

  const dashViews = useMemo(() => [
    {
      id: "admin",
      tabLabel: "Admin Dashboard",
      icon: Building2,
      img: "/dashboard-preview.png",
      alt: "Admin Dashboard Overview",
      chipTop: { label: "TOTAL STRENGTH", val: "842 Students", icon: BarChart3, color: "pink" },
      chipBottom: { label: "LIVE STATUS", val: "59 Staff Active", icon: Bell, color: "green", ping: true }
    },
    {
      id: "student-perf",
      tabLabel: "Student Analytics",
      icon: Trophy,
      img: "/student-analytics-preview.png",
      alt: "Student Performance & Daily Test Analytics",
      chipTop: { label: "DAILY TEST #1", val: "99.1% (Dhruv)", icon: TrendingUp, color: "blue" },
      chipBottom: { label: "ATTENDANCE", val: "100% Present", icon: Check, color: "green", ping: false }
    },
    {
      id: "class-results",
      tabLabel: "Class Results",
      icon: BookOpen,
      img: "/class-results-preview.png",
      alt: "Class 8-A Consolidated Daily Test Results",
      chipTop: { label: "CLASS 8-A", val: "99.4% Top Score", icon: Star, color: "pink" },
      chipBottom: { label: "REPORT FORMAT", val: "Instant Ranks", icon: FileSpreadsheet, color: "blue", ping: true }
    },
    {
      id: "attendance",
      tabLabel: "Attendance Register",
      icon: Calendar,
      img: "/attendance-preview.png",
      alt: "Monthly Attendance Register",
      chipTop: { label: "MONTH REGISTER", val: "96.2% Present", icon: Calendar, color: "green" },
      chipBottom: { label: "STATUS", val: "P / A Badges", icon: Users, color: "blue", ping: false }
    },
    {
      id: "signature",
      tabLabel: "Signature Sheet",
      icon: ClipboardList,
      img: "/signature-sheet-preview.png",
      alt: "Exam Attendance & Signature Sheet",
      chipTop: { label: "PRINT READY", val: "1-Click PDF/Print", icon: FileText, color: "pink" },
      chipBottom: { label: "VERIFICATION", val: "Invigilator Slip", icon: Check, color: "green", ping: true }
    },
    {
      id: "main-exam",
      tabLabel: "Main Exam Trends",
      icon: Trophy,
      img: "/main-exam-preview.jpg",
      alt: "Main Exam & Subject Performance",
      chipTop: { label: "HALF YEARLY", val: "72.5%", icon: Trophy, color: "pink" },
      chipBottom: { label: "TOP SUBJECT", val: "Chemistry 100%", icon: Star, color: "green", ping: true }
    }
  ], []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveDashTab((prev) => (prev + 1) % dashViews.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [dashViews.length]);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsVisible(true); }, { threshold: 0.3 });
    if (statsRef.current) obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, []);

  const features = [
    { 
      icon: Users, 
      title: "Student Manager", 
      desc: "Manage student admissions, profiles, roll numbers, academic records, and class allocations seamlessly.", 
      grad: "linear-gradient(135deg,#6366f1,#3b82f6)", 
      shadow: "rgba(99,102,241,.28)" 
    },
    { 
      icon: BookOpen, 
      title: "Daily Tests & Main Exams", 
      desc: "Conduct chapter-wise daily tests, term exams, enter subject marks, and auto-calculate percentages seamlessly.", 
      grad: "linear-gradient(135deg,#10b981,#06b6d4)", 
      shadow: "rgba(16,185,129,.28)" 
    },
    { 
      icon: Trophy, 
      title: "Smart Result Analytics & Ranks", 
      desc: "Auto-generate class rankings, topper lists, subject performance insights, and printable merit sheets instantly.", 
      grad: "linear-gradient(135deg,#f59e0b,#f97316)", 
      shadow: "rgba(245,158,11,.28)" 
    },
    { 
      icon: Calendar, 
      title: "Staff Attendance", 
      desc: "Mark daily teacher & staff attendance with real-time monthly registers, leave tracking, and percentage reports.", 
      grad: "linear-gradient(135deg,#ec4899,#8b5cf6)", 
      shadow: "rgba(236,72,153,.28)" 
    },
    { 
      icon: ClipboardList, 
      title: "Assessment Planner", 
      desc: "Schedule assessment dates, syllabus chapters, and generate organized term test date-sheets effortlessly.", 
      grad: "linear-gradient(135deg,#06b6d4,#6366f1)", 
      shadow: "rgba(6,182,212,.28)" 
    },
    { 
      icon: FileText, 
      title: "Signature Sheet Generator", 
      desc: "Generate and print professional student exam attendance signature sheets & teacher verification slips with one click.", 
      grad: "linear-gradient(135deg,#f97316,#ef4444)", 
      shadow: "rgba(249,115,22,.28)" 
    },
    { 
      icon: Smartphone, 
      title: "Parent Portal & Communication", 
      desc: "Parents get secure access to view daily test marks, exam ranks, attendance status, and urgent school notices.", 
      grad: "linear-gradient(135deg,#a855f7,#ec4899)", 
      shadow: "rgba(168,85,247,.28)" 
    },
    { 
      icon: FileSpreadsheet, 
      title: "Excel Export & Instant Reports", 
      desc: "Export complete student lists, result sheets, and attendance data directly into Excel with clean print layouts.", 
      grad: "linear-gradient(135deg,#14b8a6,#10b981)", 
      shadow: "rgba(20,184,166,.28)" 
    },
  ];

  const steps = [
    { num: "01", icon: Building2, title: "Register School", desc: "Setup your school account and active academic session in minutes.", grad: "linear-gradient(135deg,#6366f1,#3b82f6)", glow: "rgba(99,102,241,.3)" },
    { num: "02", icon: Users, title: "Add Staff & Students", desc: "Add students, assign class teachers, and manage profiles easily.", grad: "linear-gradient(135deg,#10b981,#06b6d4)", glow: "rgba(16,185,129,.3)" },
    { num: "03", icon: BookOpen, title: "Conduct Tests & Exams", desc: "Plan assessments, enter test marks, and track attendance daily.", grad: "linear-gradient(135deg,#f59e0b,#f97316)", glow: "rgba(245,158,11,.3)" },
    { num: "04", icon: Trophy, title: "Publish Results", desc: "Generate instant rankings, report cards, and notify parents.", grad: "linear-gradient(135deg,#ec4899,#8b5cf6)", glow: "rgba(236,72,153,.3)" },
  ];

  const testimonials = [
    { quote: "Our school’s daily test management and result generation process became 90% faster. It has significantly reduced manual errors.", name: "Dr. Anjali Verma", role: "Principal, First step School", initials: "AV", grad: "linear-gradient(135deg,#6366f1,#3b82f6)", bg: "linear-gradient(135deg,#eef2ff,#eff6ff)" },
    { quote: "The Parent Portal feature has been a game-changer. Parents are now much more involved, and our office staff is no longer overwhelmed with queries.", name: "Rajesh Meena", role: "Administrator, Global Public School", initials: "RM", grad: "linear-gradient(135deg,#10b981,#06b6d4)", bg: "linear-gradient(135deg,#ecfdf5,#e0f2fe)" },
    { quote: "Managing multiple school branches from one dashboard is seamless. Data accuracy is perfect, and the reporting tools are truly professional.", name: "Sunita Reddy", role: "Director, Heritage Academy", initials: "SR", grad: "linear-gradient(135deg,#ec4899,#8b5cf6)", bg: "linear-gradient(135deg,#fdf4ff,#fce7f3)" },
    { quote: "Assessment planning and automated ranking have made term exams completely stress-free for our teachers. Highly recommended for every school.", name: "Disha Pandya", role: "Academic Head, Disha Children's Academy", initials: "DP", grad: "linear-gradient(135deg,#f59e0b,#f97316)", bg: "linear-gradient(135deg,#fffbeb,#fff7ed)" },
  ];

  const [plans, setPlans] = useState([]);
  const [activeCycle, setActiveCycle] = useState('monthly');

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await api.get('/subscriptions/public-plans');
        if (response.data?.success) {
          const filtered = (response.data.plans || []).filter(p =>
            !p.slug?.toLowerCase().includes('trial') && Number(p.basePrice) > 0
          );
          setPlans(filtered);
        }
      } catch (err) {
        console.error("Failed to load plans on landing page:", err);
      }
    };
    fetchPlans();
  }, []);

  const staticPlans = [
    {
      name: "Starter", price: "₹499", cta: "Start Free Trial", popular: false,
      desc: "Ideal for small schools getting started with digital result management.",
      grad: "linear-gradient(135deg,#6366f1,#3b82f6)", glow: "rgba(99,102,241,.15)",
      highlights: [
        "Up to 500 students",
        "10 teacher accounts",
        "Daily test module",
        "Result generation",
      ],
    },
    {
      name: "Pro School", price: "₹1,499", cta: "Start Free Trial", popular: true,
      desc: "Full ERP features and parent access for growing institutions.",
      grad: "linear-gradient(135deg,#2563eb,#7c3aed)", glow: "rgba(37,99,235,.2)",
      highlights: [
        "Up to 2,000 students",
        "Unlimited teachers",
        "Full ERP modules",
        "Parent portal",
        "CSV / XLSX export",
      ],
    },
  ];

  const visiblePlans = useMemo(() => {
    if (plans.length === 0) return staticPlans;

    return plans
      .filter(p => (p.billingCycle || 'monthly') === activeCycle)
      .sort((a, b) => Number(a.basePrice) - Number(b.basePrice))
      .map((p, idx) => {
        const isPopular = idx === 1;
        return {
          _id: p._id,
          name: p.name,
          price: `₹${p.basePrice}`,
          cta: "Start Free Trial",
          popular: isPopular,
          desc: `Ideal for growing schools up to ${p.maxStudents} students`,
          grad: isPopular ? "linear-gradient(135deg,#2563eb,#7c3aed)" : undefined,
          glow: isPopular ? "rgba(37,99,235,.2)" : "rgba(99,102,241,.15)",
          highlights: p.highlights && p.highlights.length > 0 ? p.highlights : [
            `Up to ${p.maxStudents} students`,
            `${p.maxTeachers} teacher accounts`,
            "Daily test module",
            "Result generation"
          ]
        };
      });
  }, [plans, activeCycle]);

  const getTheme = (index) => {
    const themes = [
      { border: 'border-slate-200', btn: 'bg-[#0f172a]', icon: <Zap size={22} className="text-blue-500" />, badge: null },
      { border: 'border-purple-400', btn: 'bg-purple-600', icon: <Star size={22} className="text-purple-600" />, badge: 'MOST POPULAR' },
      { border: 'border-amber-400', btn: 'bg-[#d97706]', icon: <Gem size={22} className="text-amber-500" />, badge: 'LUXURY TIER' }
    ];
    return themes[index] || themes[2];
  };

  const whyCards = [
    { icon: Zap, title: "Easy to Use", desc: "Simple interface designed for school administrators and teachers.", grad: "linear-gradient(135deg,#f59e0b,#f97316)", glow: "rgba(245,158,11,.12)" },
    { icon: TrendingUp, title: "Fast Result Generation", desc: "Generate rankings and report cards within seconds.", grad: "linear-gradient(135deg,#10b981,#06b6d4)", glow: "rgba(16,185,129,.12)" },
    { icon: Cloud, title: "Cloud Based", desc: "Access your school anytime from any device.", grad: "linear-gradient(135deg,#3b82f6,#6366f1)", glow: "rgba(59,130,246,.12)" },
    { icon: Lock, title: "Secure Data", desc: "School data remains private, secure and isolated.", grad: "linear-gradient(135deg,#ec4899,#ef4444)", glow: "rgba(236,72,153,.12)" },
    { icon: Building2, title: "Scalable Platform", desc: "Perfect for schools of every size.", grad: "linear-gradient(135deg,#8b5cf6,#a855f7)", glow: "rgba(139,92,246,.12)" },
    { icon: FileText, title: "Professional Reports", desc: "Generate clean printable reports with one click.", grad: "linear-gradient(135deg,#14b8a6,#84cc16)", glow: "rgba(20,184,166,.12)" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --text:#0f172a;--text-2:#475569;--text-3:#94a3b8;
          --bg:#fff;--bg-2:#f8fafc;
          --border:#e2e8f0;--border-2:#cbd5e1;
          --r:14px;--r-lg:20px;--r-xl:28px;
          --font:'Plus Jakarta Sans',sans-serif;
          --mono:'DM Mono',monospace;
          --sh:0 4px 24px rgba(0,0,0,.07);
          --sh-lg:0 20px 60px rgba(0,0,0,.1);
        }
        body{font-family:var(--font);color:var(--text);background:var(--bg);-webkit-font-smoothing:antialiased}
        a{text-decoration:none;color:inherit}
        button{font-family:var(--font);cursor:pointer;border:none}

        /* ── BUTTONS ── */
        .btn{display:inline-flex;align-items:center;gap:8px;font-family:var(--font);font-size:14px;font-weight:700;padding:11px 24px;border-radius:12px;cursor:pointer;transition:all .22s;border:none;text-decoration:none;letter-spacing:-.01em}
        .btn-primary{background:linear-gradient(135deg,#6366f1,#2563eb);color:#fff;box-shadow:0 6px 24px rgba(99,102,241,.4)}
        .btn-primary:hover{transform:translateY(-2px);box-shadow:0 12px 36px rgba(99,102,241,.5)}
        .btn-ghost{background:transparent;color:var(--text-2)}
        .btn-ghost:hover{background:var(--bg-2);color:var(--text)}
        .btn-outline{background:#fff;color:var(--text);border:2px solid var(--border-2)}
        .btn-outline:hover{border-color:#6366f1;color:#6366f1;transform:translateY(-1px)}
        .btn-lg{font-size:15px;padding:14px 30px;border-radius:14px}
        .btn-white{background:#fff;color:#4f46e5;font-weight:800;box-shadow:0 4px 20px rgba(0,0,0,.15)}
        .btn-white:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,0,0,.18)}
        .btn-ghost-white{background:rgba(255,255,255,.18);color:#fff;border:1.5px solid rgba(255,255,255,.4)}
        .btn-ghost-white:hover{background:rgba(255,255,255,.28);transform:translateY(-1px)}

        /* ── NAV ── */
        .nav{position:sticky;top:0;z-index:100;background:rgba(255,255,255,.96);backdrop-filter:blur(20px);border-bottom:1px solid var(--border);transition:box-shadow .3s}
        .nav.scrolled{box-shadow:0 4px 24px rgba(0,0,0,.07)}
        .nav-inner{max-width:1160px;margin:0 auto;padding:0 28px;height:66px;display:flex;align-items:center;justify-content:space-between;gap:24px}
        .logo{display:flex;align-items:center;text-decoration:none;outline:none;}
        .logo img{height:36px;max-height:38px;width:auto;object-fit:contain;}
        .nav-links{display:flex;align-items:center;gap:28px;font-size:14px;font-weight:600;color:var(--text-2)}
        .nav-links a:hover{color:var(--text)}
        .nav-actions{display:flex;gap:10px;align-items:center}
        
        .mobile-menu-btn { display: none; background: none; font-size: 24px; padding: 8px; border: none; cursor: pointer; color: var(--text); }
        .mobile-menu { 
          display: none; 
          background: #fff; 
          padding: 18px 24px 24px; 
          border-radius: 0 0 20px 20px;
          border-bottom: 1px solid var(--border); 
          flex-direction: column; 
          gap: 12px; 
          text-align: left; 
          position: absolute; 
          width: 100%; 
          left: 0; 
          top: 66px; 
          z-index: 2000; 
          box-shadow: 0 20px 50px rgba(0,0,0,0.12); 
        }
        .mobile-menu.open { display: flex !important; }
        .mobile-menu a { font-weight: 600; color: var(--text-2); font-size: 15px; padding: 4px 0; }
        .mobile-menu .btn { width: 100%; justify-content: center; }

        /* ── HERO ── */
        .hero-wrap{max-width:1380px;margin:0 auto;padding:48px 32px 104px}
        .hero-grid{display:grid;grid-template-columns:0.85fr 1.35fr;gap:40px;align-items:center}
        .hero-pill{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#eef2ff,#fdf4ff);color:#4f46e5;font-size:12px;font-weight:700;padding:6px 16px;border-radius:40px;border:1.5px solid #c7d2fe;margin-bottom:18px;letter-spacing:.02em}
        .pill-dot{width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,#10b981,#06b6d4);flex-shrink:0;box-shadow:0 0 0 2.5px rgba(16,185,129,.25)}
        h1.hero-h1{font-size:46px;font-weight:800;line-height:1.12;letter-spacing:-.032em;color:var(--text)}
        .hero-accent{background:linear-gradient(135deg,#6366f1,#ec4899,#f97316);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .hero-sub{font-size:15px;color:var(--text-2);line-height:1.7;margin:15px 0 26px;max-width:450px}
        .hero-actions{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:28px}
        .hero-checks{display:grid;grid-template-columns:1fr 1fr;gap:10px 14px}
        .hc{display:flex;align-items:center;gap:9px;font-size:13px;font-weight:600;color:var(--text-2)}
        .hc-dot{width:19px;height:19px;border-radius:50%;background:linear-gradient(135deg,#10b981,#059669);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2.5px 7px rgba(16,185,129,.25)}

        /* ── FLOATING DASHBOARD SHOWCASE FRAME ── */
        .dash-showcase-container{
          position:relative;
          padding:14px 6px 38px;
          width:100%;
        }
        .dash-tabs-bar{
          display:flex;
          align-items:center;
          justify-content:center;
          gap:8px;
          margin-bottom:14px;
          padding:2px 4px;
        }
        .dash-tab-btn{
          display:inline-flex;
          align-items:center;
          gap:6px;
          padding:6px 14px;
          border-radius:30px;
          font-size:11.5px;
          font-weight:700;
          color:#64748b;
          background:#ffffff;
          border:1px solid #e2e8f0;
          cursor:pointer;
          transition:all .2s ease;
          white-space:nowrap;
        }
        .dash-tab-btn:hover{
          color:#4f46e5;
          border-color:#c7d2fe;
          background:#f8faff;
        }
        .dash-tab-btn.active{
          color:#ffffff;
          background:linear-gradient(135deg,#4f46e5,#6366f1);
          border-color:#4f46e5;
          box-shadow:0 4px 12px rgba(79,70,229,0.28);
        }
        .dash-main-card{
          background:#ffffff;
          border-radius:30px;
          padding:12px 12px 18px;
          border:1.5px solid rgba(226,232,240,0.9);
          box-shadow:0 32px 100px -15px rgba(99,102,241,0.24), 0 12px 35px -10px rgba(0,0,0,0.06);
          position:relative;
          transition:transform .35s ease, box-shadow .35s ease;
        }
        .dash-main-card:hover{
          transform:translateY(-3px);
          box-shadow:0 36px 100px -12px rgba(99,102,241,0.28), 0 16px 36px -10px rgba(0,0,0,0.08);
        }
        .dash-img-holder{
          position:relative;
          border-radius:20px;
          overflow:hidden;
          border:1px solid #f1f5f9;
          background:#f8fafc;
        }
        .dash-img{
          width:100%;
          height:auto;
          display:block;
          object-fit:contain;
          transition:opacity .3s ease;
        }
        .dash-dots-bar{
          display:flex;
          align-items:center;
          justify-content:center;
          gap:6px;
          margin-top:12px;
        }
        .dash-dot{
          height:6px;
          border-radius:10px;
          background:#cbd5e1;
          transition:all .3s ease;
          cursor:pointer;
          border:none;
          padding:0;
        }
        .dash-dot.active{
          width:24px;
          background:linear-gradient(90deg,#4f46e5,#6366f1);
        }
        .dash-dot.inactive{
          width:6px;
        }

        /* ── FLOATING CHIPS / BADGES ── */
        .floating-chip{
          position:absolute;
          background:rgba(255,255,255,0.96);
          backdrop-filter:blur(12px);
          border:1px solid rgba(226,232,240,0.9);
          border-radius:18px;
          padding:10px 16px;
          display:flex;
          align-items:center;
          gap:12px;
          box-shadow:0 20px 40px -10px rgba(15,23,42,0.18), 0 8px 18px -6px rgba(0,0,0,0.08);
          z-index:20;
          pointer-events:none;
          transition:all .3s ease;
        }
        .floating-chip-top{
          top:-12px;
          left:-20px;
          animation:floatSlow 4.5s ease-in-out infinite;
        }
        .floating-chip-bottom{
          bottom:-14px;
          right:-20px;
          animation:floatSlowRev 4.5s ease-in-out infinite;
        }
        @keyframes floatSlow{
          0%,100%{transform:translateY(0px)}
          50%{transform:translateY(-8px)}
        }
        @keyframes floatSlowRev{
          0%,100%{transform:translateY(0px)}
          50%{transform:translateY(8px)}
        }
        .chip-icon{
          width:38px;
          height:38px;
          border-radius:12px;
          display:flex;
          align-items:center;
          justify-content:center;
          flex-shrink:0;
          position:relative;
        }
        .chip-icon.pink{
          background:#fdf2f8;
          color:#db2777;
        }
        .chip-icon.green{
          background:#ecfdf5;
          color:#059669;
        }
        .chip-icon.blue{
          background:#eff6ff;
          color:#2563eb;
        }
        .chip-ping-dot{
          position:absolute;
          top:-2px;
          right:-2px;
          width:8px;
          height:8px;
          border-radius:50%;
          background:#f43f5e;
          border:2px solid #ffffff;
        }
        .chip-content{
          display:flex;
          flex-direction:column;
        }
        .chip-label{
          font-size:9.5px;
          font-weight:800;
          letter-spacing:.08em;
          color:#64748b;
          text-transform:uppercase;
        }
        .chip-val{
          font-size:15px;
          font-weight:800;
          color:#0f172a;
          letter-spacing:-.02em;
          line-height:1.2;
        }

        /* ── STATS ── */
        .stats-section{padding:36px 0;background:linear-gradient(135deg,#f8faff 0%,#fdf4ff 50%,#fff7ed 100%)}
        .stats-inner{max-width:1040px;margin:0 auto;padding:0 24px;display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
        .stat-card{border-radius:18px;padding:18px 14px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.08);transition:transform .22s,box-shadow .22s;position:relative;overflow:hidden}
        .stat-card::before{content:'';position:absolute;top:-25px;right:-25px;width:90px;height:90px;border-radius:50%;background:rgba(255,255,255,.12)}
        .stat-card:hover{transform:translateY(-4px);box-shadow:0 10px 32px rgba(0,0,0,.12)}
        .stat-icon-bg{width:38px;height:38px;border-radius:11px;background:rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;margin:0 auto 10px;backdrop-filter:blur(4px)}
        .stat-num{font-size:26px;font-weight:800;letter-spacing:-.03em}
        .stat-lbl{font-size:12px;color:rgba(255,255,255,.88);margin-top:3px;font-weight:600}

        /* ── SECTION SHARED ── */
        .section{max-width:1160px;margin:0 auto;padding:64px 32px}
        .section-head{text-align:center;margin-bottom:44px}
        .s-tag{display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#eef2ff,#fdf4ff);color:#4f46e5;font-size:11px;font-weight:800;padding:5px 14px;border-radius:40px;border:1.5px solid #c7d2fe;margin-bottom:12px;letter-spacing:.07em;text-transform:uppercase}
        .section-head h2{font-size:32px;font-weight:800;letter-spacing:-.03em;color:var(--text)}
        .section-head p{font-size:14px;color:var(--text-2);margin-top:8px;max-width:520px;margin-left:auto;margin-right:auto;line-height:1.7}

        /* ── FEATURES ── */
        .feat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
        .feat-card{border-radius:20px;padding:22px 20px;color:#fff;position:relative;overflow:hidden;transition:transform .22s,box-shadow .22s}
        .feat-card::before{content:'';position:absolute;top:-30px;right:-30px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.1)}
        .feat-card::after{content:'';position:absolute;bottom:-40px;left:-20px;width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,.06)}
        .feat-card:hover{transform:translateY(-5px)}
        .feat-icon-bg{width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;margin-bottom:12px;backdrop-filter:blur(4px)}
        .feat-card h3{font-size:14.5px;font-weight:700;margin-bottom:6px;position:relative;line-height:1.3}
        .feat-card p{font-size:12px;line-height:1.55;opacity:.9;position:relative}

        /* ── HOW IT WORKS ── */
        .how-bg{background:linear-gradient(160deg,#fafbff 0%,#f0f9ff 50%,#fdf4ff 100%);padding:60px 0;border-top:1px solid #e0e7ff;border-bottom:1px solid #e0e7ff}
        .how-inner{max-width:1160px;margin:0 auto;padding:0 32px}
        .steps-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
        .step{background:#fff;border:1.5px solid var(--border);border-radius:18px;padding:22px 18px;text-align:center;transition:all .22s;position:relative;overflow:hidden}
        .step-top{position:absolute;top:0;left:0;right:0;height:4px;border-radius:4px 4px 0 0}
        .step:hover{transform:translateY(-4px);box-shadow:var(--sh-lg)}
        .step-num{font-family:var(--mono);font-size:10px;font-weight:700;color:var(--text-3);margin-bottom:12px;letter-spacing:.1em}
        .step-circle{width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 12px}
        .step h3{font-size:14px;font-weight:700;margin-bottom:6px}
        .step p{font-size:12px;color:var(--text-2);line-height:1.5}

        /* ── PARENT PORTAL ── */
        .portal-grid{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
        .portal-text h2{font-size:30px;font-weight:800;letter-spacing:-.03em;margin-bottom:10px;line-height:1.2}
        .portal-text p{font-size:13.5px;color:var(--text-2);line-height:1.7;margin-bottom:24px}
        .portal-feats{display:flex;flex-direction:column;gap:16px}
        .pf{display:flex;align-items:flex-start;gap:14px}
        .pf-icon{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .pf h4{font-size:14px;font-weight:700;margin-bottom:3px}
        .pf p{font-size:12.5px;color:var(--text-2);line-height:1.5}
        .phone-frame{background:linear-gradient(160deg,#f8faff,#fdf4ff);border:1.5px solid #e0e7ff;border-radius:26px;padding:18px;max-width:270px;margin:0 auto;box-shadow:0 20px 60px rgba(99,102,241,.12)}
        .phone-hdr{border-radius:14px;padding:14px 16px;margin-bottom:12px}
        .phone-hdr p{font-size:10.5px;opacity:.85;margin-top:3px}
        .phone-hdr strong{font-size:14px}
        .p-card{background:#fff;border:1px solid #e0e7ff;border-radius:12px;padding:10px 12px;margin-bottom:8px;display:flex;align-items:center;gap:10px;transition:box-shadow .2s}
        .p-card:hover{box-shadow:0 4px 14px rgba(0,0,0,.05)}
        .p-card-icon{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .p-card h5{font-size:11.5px;font-weight:700;margin-bottom:2px}
        .p-card span{font-size:10.5px;color:var(--text-3)}

        /* ── WHY US ── */
        .why-bg{background:linear-gradient(160deg,#fffbeb 0%,#ecfdf5 40%,#eff6ff 80%,#fdf4ff 100%);padding:56px 0}
        .why-inner{max-width:1160px;margin:0 auto;padding:0 32px}
        .why-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
        .why-card{background:#fff;border:1.5px solid var(--border);border-radius:18px;padding:20px 18px;transition:all .22s;position:relative;overflow:hidden}
        .why-card::before{content:'';position:absolute;inset:0;opacity:0;transition:opacity .3s}
        .why-card:hover{transform:translateY(-4px);box-shadow:var(--sh-lg)}
        .why-icon{width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;margin-bottom:12px}
        .why-card h3{font-size:14.5px;font-weight:700;margin-bottom:6px}
        .why-card p{font-size:12px;color:var(--text-2);line-height:1.55}

        /* ── TESTIMONIALS ── */
        .testi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
        .tc{border-radius:16px;padding:18px 14px;position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;transition:transform .22s,box-shadow .22s}
        .tc:hover{transform:translateY(-4px);box-shadow:var(--sh-lg)}
        .tc-bar{position:absolute;top:0;left:0;right:0;height:4px;border-radius:4px 4px 0 0}
        .tc-stars{display:flex;gap:2px;margin-bottom:8px}
        .tc-stars svg{color:#f59e0b;fill:#f59e0b}
        .tc-quote{font-size:11.8px;line-height:1.55;margin-bottom:12px;opacity:.88;flex-grow:1}
        .tc-author{display:flex;align-items:center;gap:9px;border-top:1px solid rgba(0,0,0,.07);padding-top:10px}
        .tc-avatar{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff;flex-shrink:0}
        .tc-name{font-size:12px;font-weight:700}
        .tc-role{font-size:10.5px;opacity:.65;margin-top:1px}

        /* ── PRICING ── */
        .pricing-bg{background:linear-gradient(160deg,#faf5ff 0%,#eff6ff 50%,#ecfdf5 100%);padding:56px 0}
        .pricing-inner{max-width:1160px;margin:0 auto;padding:0 32px}
        .pricing-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .pc{background:#fff;border:1.5px solid var(--border);border-radius:20px;padding:22px 20px;position:relative;transition:all .22s}
        .pc:hover{box-shadow:var(--sh-lg);transform:translateY(-3px)}
        .pc.popular{border:none;color:#fff}
        .pc.popular .pc-name{color:rgba(255,255,255,.8)}
        .pc.popular .pc-desc{color:rgba(255,255,255,.75)}
        .pc.popular .pc-price{-webkit-text-fill-color:#fff;background:none;color:#fff}
        .pc.popular .pc-price sub{-webkit-text-fill-color:rgba(255,255,255,.7)}
        .pc.popular .pc-feat{color:rgba(255,255,255,.9)}
        .pc.popular .pc-feat.off{color:rgba(255,255,255,.4)}
        .pc.popular .pc-divider{border-color:rgba(255,255,255,.2)}
        .pop-badge{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#fbbf24,#f97316);color:#fff;font-size:10px;font-weight:800;padding:4px 14px;border-radius:20px;white-space:nowrap;letter-spacing:.04em;box-shadow:0 4px 16px rgba(251,191,36,.4)}
        .pc-name{font-size:10.5px;font-weight:800;color:var(--text-3);letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px}
        .pc-price{font-size:32px;font-weight:800;letter-spacing:-.03em;background:linear-gradient(135deg,#1e293b,#475569);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .pc-price sub{font-size:13px;font-weight:500}
        .pc-desc{font-size:12px;color:var(--text-2);margin:6px 0 16px;line-height:1.5}
        .pc-divider{border:none;border-top:1px solid var(--border);margin:16px 0}
        .pc-feat{display:flex;align-items:center;gap:8px;font-size:12px;margin-bottom:8px;font-weight:500}
        .pc-feat.off{color:var(--text-3);font-weight:400}

        /* ── CTA ── */
        .cta-box{border-radius:24px;padding:52px 32px;text-align:center;position:relative;overflow:hidden;background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 35%,#ec4899 70%,#f97316 100%)}
        .cta-orb-1{position:absolute;top:-80px;left:-80px;width:320px;height:320px;border-radius:50%;background:rgba(255,255,255,.07);pointer-events:none}
        .cta-orb-2{position:absolute;bottom:-100px;right:-60px;width:400px;height:400px;border-radius:50%;background:rgba(255,255,255,.05);pointer-events:none}
        .cta-box h2{font-size:30px;font-weight:800;color:#fff;letter-spacing:-.03em;margin-bottom:12px;position:relative}
        .cta-box p{font-size:14px;color:rgba(255,255,255,.85);max-width:480px;margin:0 auto 28px;line-height:1.6;position:relative}
        .cta-actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;position:relative}
        .cta-note{font-size:12px;color:rgba(255,255,255,.65);margin-top:16px;position:relative}

        /* ── FOOTER ── */
        .footer{background:#0f172a;padding:56px 32px 24px;color:#fff}
        .footer-inner{max-width:1160px;margin:0 auto}
        .footer-top{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:36px;margin-bottom:44px}
        .footer-logo{display:flex;align-items:center;gap:10px;font-size:16px;font-weight:800;margin-bottom:12px;color:#fff}
        .footer-logo-mark{width:30px;height:30px;background:linear-gradient(135deg,#6366f1,#2563eb);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff}
        .footer-desc{font-size:12.5px;color:#cbd5e1;line-height:1.7;max-width:280px}
        .footer-socials{display:flex;gap:8px;margin-top:16px}
        .fs-btn{width:34px;height:34px;border:1px solid #1e293b;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#94a3b8;transition:all .2s;cursor:pointer;background:none}
        .fs-btn:hover{border-color:#6366f1;color:#ffffff;background:#1e293b}
        .footer-col h4{font-size:12.5px;font-weight:700;margin-bottom:14px;color:#e2e8f0}
        .footer-col a{display:block;font-size:12px;color:#cbd5e1;margin-bottom:9px;transition:color .15s}
        .footer-col a:hover{color:#ffffff}
        .footer-bottom{display:flex;align-items:center;justify-content:space-between;border-top:1px solid #1e293b;padding-top:20px}
        .footer-copy{font-size:11.5px;color:#94a3b8}
        .footer-legal{display:flex;gap:16px}
        .footer-legal a{font-size:11.5px;color:#94a3b8;transition:color .15s}
        .footer-legal a:hover{color:#ffffff}
        .contact-item{display:flex;align-items:center;gap:8px;font-size:12px;color:#cbd5e1;margin-bottom:8px}

        /* ── RESPONSIVE RULES ── */
        @media (max-width: 1080px) {
          .feat-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 14px !important; }
          .why-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 14px !important; }
          .testi-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 14px !important; }
          .pricing-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 14px !important; }
        }

        @media (max-width: 1024px) {
          .hero-wrap { padding: 36px 20px 60px !important; }
          .hero-grid { grid-template-columns: 1fr !important; gap: 36px !important; text-align: center !important; }
          .hero-actions { justify-content: center !important; }
          .hero-sub { margin-left: auto !important; margin-right: auto !important; }
          .hero-checks { justify-content: center !important; margin: 0 auto !important; max-width: 440px !important; }
          .portal-grid { grid-template-columns: 1fr !important; gap: 36px !important; }
          .footer-top { grid-template-columns: 1fr 1fr !important; }
        }

        @media (max-width: 768px) {
          .nav-inner { padding: 0 16px !important; height: 60px !important; }
          .mobile-menu { top: 60px !important; }
          .nav-links, .nav-actions { display: none !important; }
          .mobile-menu-btn { display: block !important; }

          .hero-wrap { padding: 20px 16px 36px !important; }
          h1.hero-h1 { font-size: 32px !important; line-height: 1.18 !important; letter-spacing: -.025em !important; }
          .hero-pill { font-size: 11px !important; padding: 5px 14px !important; margin-bottom: 14px !important; }
          .hero-sub { font-size: 14px !important; line-height: 1.6 !important; margin: 12px auto 20px !important; }
          .hero-actions { margin-bottom: 22px !important; gap: 10px !important; flex-direction: column !important; }
          .hero-actions .btn { font-size: 14px !important; padding: 12px 20px !important; width: 100% !important; justify-content: center !important; }

          /* HERO CHECKS */
          .hero-checks { grid-template-columns: 1fr 1fr !important; gap: 8px 10px !important; max-width: 360px !important; margin: 0 auto !important; text-align: left !important; }
          .hc { font-size: 12px !important; gap: 7px !important; }
          .hc-dot { width: 17px !important; height: 17px !important; }

          /* DASHBOARD SHOWCASE */
          .dash-showcase-container { padding: 8px 2px 16px !important; }
          .dash-main-card { border-radius: 20px !important; padding: 8px 8px 14px !important; box-shadow: 0 18px 50px -10px rgba(99,102,241,0.2) !important; }
          .dash-img-holder { border-radius: 14px !important; }
          .floating-chip { padding: 6px 10px !important; border-radius: 12px !important; gap: 8px !important; }
          .floating-chip-top { top: -8px !important; left: -4px !important; }
          .floating-chip-bottom { bottom: -8px !important; right: -4px !important; }
          .chip-icon { width: 28px !important; height: 28px !important; border-radius: 8px !important; }
          .chip-val { font-size: 12px !important; }
          .chip-label { font-size: 7.5px !important; }

          /* SECTION HEADERS */
          .section { padding: 44px 16px !important; }
          .section-head { margin-bottom: 24px !important; text-align: center !important; }
          .section-head h2 { font-size: 24px !important; letter-spacing: -.02em !important; }
          .section-head p { font-size: 13px !important; margin-top: 6px !important; }

          /* STATS 2 PER ROW */
          .stats-section { padding: 24px 0 !important; }
          .stats-inner { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; padding: 0 16px !important; }
          .stat-card { padding: 14px 10px !important; border-radius: 16px !important; }
          .stat-icon-bg { width: 34px !important; height: 34px !important; border-radius: 10px !important; margin-bottom: 8px !important; }
          .stat-num { font-size: 22px !important; font-weight: 800 !important; }
          .stat-lbl { font-size: 11px !important; margin-top: 2px !important; }

          /* 1 COLUMN GRIDS */
          .feat-grid, .steps-grid, .why-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
          .feat-card, .step, .why-card { padding: 18px 16px !important; border-radius: 16px !important; }

          /* PRICING HORIZONTAL SCROLL SLIDER */
          .pricing-bg { padding: 40px 0 !important; }
          .pricing-inner { padding: 0 16px !important; }
          .pricing-grid {
            display: flex !important;
            overflow-x: auto !important;
            scroll-snap-type: x mandatory !important;
            gap: 14px !important;
            padding: 6px 4px 16px !important;
            -webkit-overflow-scrolling: touch !important;
          }
          .pricing-grid::-webkit-scrollbar { display: none !important; }
          .pricing-grid > div {
            flex: 0 0 85% !important;
            max-width: 300px !important;
            scroll-snap-align: center !important;
            padding: 20px 18px !important;
            border-radius: 20px !important;
          }

          /* TESTIMONIALS HORIZONTAL SCROLL SLIDER */
          .testi-grid {
            display: flex !important;
            overflow-x: auto !important;
            scroll-snap-type: x mandatory !important;
            gap: 14px !important;
            padding: 6px 4px 14px !important;
            -webkit-overflow-scrolling: touch !important;
          }
          .testi-grid::-webkit-scrollbar { display: none !important; }
          .tc {
            flex: 0 0 85% !important;
            max-width: 300px !important;
            scroll-snap-align: center !important;
            padding: 18px 16px !important;
            border-radius: 18px !important;
          }

          /* CTA */
          .cta-box { padding: 38px 20px !important; border-radius: 22px !important; }
          .cta-box h2 { font-size: 24px !important; }
          .cta-box p { font-size: 13.5px !important; margin-bottom: 22px !important; }
          .cta-actions { flex-direction: column !important; gap: 10px !important; }
          .cta-actions .btn { width: 100% !important; justify-content: center !important; }

          /* FOOTER */
          .footer { padding: 36px 16px 20px !important; text-align: left !important; }
          .footer-top { grid-template-columns: 1fr 1fr !important; gap: 24px 16px !important; margin-bottom: 30px !important; text-align: left !important; }
          .footer-brand { grid-column: span 2 !important; }
          .footer-logo { justify-content: flex-start !important; }
          .footer-desc { margin: 0 !important; max-width: 100% !important; font-size: 12px !important; line-height: 1.55 !important; }
          .footer-socials { justify-content: flex-start !important; margin-top: 12px !important; }
          .contact-col { grid-column: span 2 !important; }
          .contact-item { justify-content: flex-start !important; font-size: 12px !important; gap: 8px !important; margin-bottom: 7px !important; }
          .footer-bottom { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; text-align: left !important; border-top: 1px solid #1e293b !important; padding-top: 16px !important; }
          .footer-copy { font-size: 11px !important; }
          .footer-legal { font-size: 11px !important; gap: 14px !important; }
          .logo img { height: 28px !important; }
        }

        @media (max-width: 480px) {
          .nav-inner { padding: 0 14px !important; height: 56px !important; }
          .logo img { height: 26px !important; }
          .mobile-menu { top: 56px !important; }
          h1.hero-h1 { font-size: 27px !important; }
          .hero-checks { grid-template-columns: 1fr !important; max-width: 280px !important; }
          .stat-num { font-size: 20px !important; }
        }

        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        .fade-up{animation:fadeUp .65s ease forwards}
      `}</style>

      {/* ── NAV ── */}
      <nav className={`nav${scrolled ? " scrolled" : ""}`}>
        <div className="nav-inner">
          <Link to="/" className="logo hover:opacity-90 transition-opacity" style={{ textDecoration: 'none' }}>
            <BrandLogo className="h-8 sm:h-9 md:h-[36px]" />
          </Link>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
          </div>
          <div className="nav-actions">
            <Link to="/login" className="btn btn-ghost">Login</Link>
            <Link to="/parent-login" className="btn btn-ghost">Parent Login</Link>
            <Link to="/signup" className="btn btn-primary">Sign Up <ArrowRight size={15} /></Link>
          </div>
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : '☰'}
          </button>
        </div>

        {/* Mobile Dropdown */}
        <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
          <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
          <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
          <a href="#about" onClick={() => setMobileMenuOpen(false)}>About</a>
          <a href="#contact" onClick={() => setMobileMenuOpen(false)}>Contact</a>
          <div style={{ borderTop: '1px solid #f1f5f9', margin: '4px 0' }}></div>
          <Link to="/login" className="btn btn-ghost" onClick={() => setMobileMenuOpen(false)}>Login</Link>
          <Link to="/parent-login" className="btn btn-ghost" onClick={() => setMobileMenuOpen(false)}>Parent Login</Link>
          <Link to="/signup" className="btn btn-primary" onClick={() => setMobileMenuOpen(false)}>Sign Up</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div className="hero-wrap fade-up">
        <div className="hero-grid">
          <div>
            <div className="hero-pill">
              <span className="pill-dot" />
              Trusted by Schools Across India
            </div>
            <h1 className="hero-h1">
              Complete School Result &<br />
              Daily Test Management<br />
              <span className="hero-accent">Made Simple</span>
            </h1>
            <p className="hero-sub">Manage Students, Teachers, Daily Tests, Main Exams, Parent Portal, Rankings and Reports from one secure cloud platform.</p>
            <div className="hero-actions">
              <Link to="/signup" className="btn btn-primary btn-lg">Start Free Trial <ArrowRight size={16} /></Link>
              <button className="btn btn-outline btn-lg"><Play size={15} /> Watch Demo</button>
            </div>
            <div className="hero-checks">
              {["Student Management", "Teacher Management", "Daily Test System", "Parent Portal", "Smart Reports", "Cloud Based Platform"].map(t => (
                <div className="hc" key={t}>
                  <div className="hc-dot"><Check size={11} color="#fff" strokeWidth={3} /></div>
                  {t}
                </div>
              ))}
            </div>
          </div>

          {/* Floating Interactive Dashboard Showcase Frame */}
          <div className="dash-showcase-container">
            {/* Top-Left Floating Metric Chip */}
            {(() => {
              const current = dashViews[activeDashTab] || dashViews[0];
              const TopIcon = current.chipTop.icon;
              return (
                <div className="floating-chip floating-chip-top" key={`top-${activeDashTab}`}>
                  <div className={`chip-icon ${current.chipTop.color}`}>
                    <TopIcon size={20} />
                  </div>
                  <div className="chip-content">
                    <span className="chip-label">{current.chipTop.label}</span>
                    <span className="chip-val">{current.chipTop.val}</span>
                  </div>
                </div>
              );
            })()}

            {/* Main Curved Dashboard Image Card */}
            <div className="dash-main-card">
              <div className="dash-img-holder">
                <img
                  src={dashViews[activeDashTab].img}
                  alt={dashViews[activeDashTab].alt}
                  className="dash-img"
                  key={dashViews[activeDashTab].img}
                  loading="eager"
                />
              </div>

              {/* Carousel Dots */}
              <div className="dash-dots-bar">
                {dashViews.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`View slide ${i + 1}`}
                    className={`dash-dot ${activeDashTab === i ? 'active' : 'inactive'}`}
                    onClick={() => setActiveDashTab(i)}
                  />
                ))}
              </div>
            </div>

            {/* Bottom-Right Floating Notification Chip */}
            {(() => {
              const current = dashViews[activeDashTab] || dashViews[0];
              const BottomIcon = current.chipBottom.icon;
              return (
                <div className="floating-chip floating-chip-bottom" key={`bot-${activeDashTab}`}>
                  <div className={`chip-icon ${current.chipBottom.color}`}>
                    {current.chipBottom.ping && <span className="chip-ping-dot" />}
                    <BottomIcon size={20} />
                  </div>
                  <div className="chip-content">
                    <span className="chip-label">{current.chipBottom.label}</span>
                    <span className="chip-val">{current.chipBottom.val}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="stats-section" ref={statsRef}>
        <div className="stats-inner">
          <StatCard value={50} suffix="+" label="Schools" icon={Building2} gradient="linear-gradient(135deg,#6366f1,#3b82f6)" delay={0} inView={statsVisible} />
          <StatCard value={10000} suffix="+" label="Students" icon={Users} gradient="linear-gradient(135deg,#10b981,#06b6d4)" delay={80} inView={statsVisible} />
          <StatCard value={500} suffix="+" label="Teachers" icon={GraduationCap} gradient="linear-gradient(135deg,#f59e0b,#f97316)" delay={160} inView={statsVisible} />
          <StatCard value={30000} suffix="+" label="Results generated" icon={FileText} gradient="linear-gradient(135deg,#ec4899,#8b5cf6)" delay={240} inView={statsVisible} />
        </div>
      </div>

      {/* ── FEATURES ── */}
      <div id="features">
        <div className="section">
          <div className="section-head">
            <div className="s-tag">✦ Everything Your School Needs</div>
            <h2>Manage your complete academic workflow from a single dashboard.</h2>
          </div>
          <div className="feat-grid">
            {features.map(f => (
              <div className="feat-card" key={f.title} style={{ background: f.grad, boxShadow: `0 12px 40px ${f.shadow}` }}>
                <div className="feat-icon-bg"><f.icon size={22} color="#fff" /></div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div className="how-bg">
        <div className="how-inner">
          <div className="section-head">
            <div className="s-tag">✦ Quick Setup</div>
            <h2>Start Managing Your School in Minutes</h2>
          </div>
          <div className="steps-grid">
            {steps.map(s => (
              <div className="step" key={s.num} style={{ boxShadow: `0 4px 20px ${s.glow}` }}>
                <div className="step-top" style={{ background: s.grad }} />
                <div className="step-num">STEP {s.num}</div>
                <div className="step-circle" style={{ background: s.grad, boxShadow: `0 6px 18px ${s.glow}` }}>
                  <s.icon size={22} color="#fff" />
                </div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PARENT PORTAL ── */}
      <div className="section">
        <div className="portal-grid">
          <div className="portal-text">
            <div className="s-tag" style={{ marginBottom: 14 }}>✦ Parent portal</div>
            <h2>Keep Parents Connected</h2>
            <p>Parents receive secure access to monitor daily test marks, main exam results, class ranks, attendance status, and important school notices in real-time.</p>
            <div className="portal-feats">
              {[
                { icon: FileText, title: "Daily Test & Main Exam Results", desc: "Subject-wise daily test marks, main exam scores, percentage breakdown, and report cards.", grad: "linear-gradient(135deg,#6366f1,#3b82f6)" },
                { icon: Trophy, title: "Class Rankings & Growth", desc: "Real-time class rank, topper badges, and progress trends.", grad: "linear-gradient(135deg,#f59e0b,#f97316)" },
                { icon: Calendar, title: "Attendance & School Notices", desc: "Track student attendance percentage and stay updated with school notices.", grad: "linear-gradient(135deg,#10b981,#06b6d4)" },
              ].map(pf => (
                <div className="pf" key={pf.title}>
                  <div className="pf-icon" style={{ background: pf.grad, boxShadow: `0 4px 14px rgba(0,0,0,.12)` }}>
                    <pf.icon size={18} color="#fff" />
                  </div>
                  <div><h4>{pf.title}</h4><p>{pf.desc}</p></div>
                </div>
              ))}
            </div>
          </div>
          <div className="phone-frame">
            <div className="phone-hdr" style={{ background: "linear-gradient(135deg,#4f46e5,#ec4899)", color: "#fff" }}>
              <strong>Student Performance</strong>
              <p>Academic Session 2026–27</p>
            </div>
            {[
              { icon: BookOpen, title: "Science — Daily Test 4", sub: "24/25 · Rank 2nd in class", grad: "linear-gradient(135deg,#6366f1,#3b82f6)" },
              { icon: FileText, title: "Main Exam Result", sub: "91.5% · Grade A+ (Passed)", grad: "linear-gradient(135deg,#10b981,#06b6d4)" },
              { icon: Trophy, title: "Class Ranking", sub: "3rd out of 38 students", grad: "linear-gradient(135deg,#ec4899,#8b5cf6)" },
              { icon: Calendar, title: "Monthly Attendance", sub: "96.2% Present this month", grad: "linear-gradient(135deg,#f59e0b,#f97316)" },
            ].map(pc => (
              <div className="p-card" key={pc.title}>
                <div className="p-card-icon" style={{ background: pc.grad }}><pc.icon size={15} color="#fff" /></div>
                <div><h5>{pc.title}</h5><span>{pc.sub}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── WHY US ── */}
      <div className="why-bg">
        <div className="why-inner">
          <div className="section-head">
            <div className="s-tag">✦ Why schools choose us</div>
            <h2>Why Schools Choose Test Master Pro</h2>
          </div>
          <div className="why-grid">
            {whyCards.map(w => (
              <div className="why-card" key={w.title} style={{ '--glow': w.glow }}>
                <div className="why-icon" style={{ background: w.grad }}>
                  <w.icon size={24} color="#fff" />
                </div>
                <h3>{w.title}</h3>
                <p>{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── TESTIMONIALS ── */}
      <div id="about" className="section">
        <div className="section-head">
          <div className="s-tag">✦ What schools say</div>
          <h2>Trusted by educators across India</h2>
        </div>
        <div className="testi-grid">
          {testimonials.map(t => (
            <div className="tc" key={t.name} style={{ background: t.bg, border: "1.5px solid rgba(0,0,0,.06)" }}>
              <div className="tc-bar" style={{ background: t.grad }} />
              <div className="tc-stars">{[...Array(5)].map((_, i) => <Star key={i} size={14} />)}</div>
              <p className="tc-quote">"{t.quote}"</p>
              <div className="tc-author">
                <div className="tc-avatar" style={{ background: t.grad }}>{t.initials}</div>
                <div>
                  <div className="tc-name">{t.name}</div>
                  <div className="tc-role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PRICING ── */}
      <div id="pricing" className="pricing-bg">
        <div className="pricing-inner">
          <div className="section-head">
            <div className="s-tag">✦ Transparent pricing</div>
            <h2>Simple Plans for Every School</h2>
            <p>Choose the plan that best matches your school's student strength.</p>
          </div>
          <div className="flex justify-center mb-8">
            <div className="bg-slate-100/80 backdrop-blur-sm p-1 rounded-xl flex shadow-inner border border-slate-200/50">
              {['monthly', 'yearly'].map((c) => (
                <button key={c} onClick={() => setActiveCycle(c)}
                  className={`px-12 py-2 rounded-lg font-bold capitalize transition-all text-sm ${activeCycle === c ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="pricing-grid">
            {visiblePlans.map((plan, index) => {
              const theme = getTheme(index);
              const isEnterprise = plan.name === "Enterprise";
              return (
                <div
                  className={`bg-white rounded-3xl p-8 flex flex-col relative border-2 ${theme.border} shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-200`}
                  key={plan.name}
                >
                  {theme.badge && (
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold text-white tracking-widest ${index === 1 ? 'bg-purple-600' : 'bg-amber-600'}`}>
                      {theme.badge}
                    </div>
                  )}
                  <div className="mb-3 flex justify-start">{theme.icon}</div>
                  <h3 className="text-xl font-bold text-slate-900 capitalize mb-1 text-left">{plan.name}</h3>
                  <div className="mb-4 text-left">
                    <span className="text-4xl font-extrabold text-slate-900">{plan.price}</span>
                    {plan.price !== "Custom" && (
                      <span className="text-slate-500 text-sm font-medium ml-1">
                        {activeCycle === 'yearly' ? '/ year' : '/ month'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mb-6 text-left">{plan.desc}</p>

                  <hr className="border-t border-slate-100 mb-6" />

                  <div className="space-y-3 mb-8 flex-grow text-left">
                    {plan.highlights?.map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-slate-700 text-sm font-medium">
                        <Check size={16} className="text-emerald-500 shrink-0" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>

                  <Link
                    to="/signup"
                    className={`w-full py-3 rounded-xl font-bold text-white text-center hover:opacity-90 transition-opacity ${theme.btn}`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="section">
        <div className="cta-box">
          <div className="cta-orb-1" /><div className="cta-orb-2" />
          <h2>Ready to Digitize Your School?</h2>
          <p>Start managing students, teachers, daily tests and results through one powerful cloud platform.</p>
          <div className="cta-actions">
            <Link to="/signup" className="btn btn-white btn-lg">Start Free Trial <ArrowRight size={16} /></Link>
            <a
              href="mailto:testmaster@webncode.in?subject=Test%20Master%20Pro%20-%20Sales%20Inquiry"
              onClick={(e) => {
                e.preventDefault();
                window.open('https://mail.google.com/mail/?view=cm&fs=1&to=testmaster@webncode.in&su=Test%20Master%20Pro%20-%20Sales%20Inquiry', '_blank');
              }}
              className="btn btn-ghost-white btn-lg cursor-pointer"
            >
              <Mail size={15} /> Contact Sales
            </a>
          </div>
          <p className="cta-note">✓ Free 14-day trial &nbsp;·&nbsp; ✓ No credit card &nbsp;·&nbsp; ✓ Cancel anytime</p>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div id="contact">
        <footer className="footer">
          <div className="footer-inner">
            <div className="footer-top">
              <div className="footer-brand">
                <div className="footer-logo mb-3">
                  <div className="inline-flex bg-white rounded-xl px-2.5 py-1 shadow-sm">
                    <BrandLogo className="h-9" />
                  </div>
                </div>
                <p className="footer-desc">Test Master Pro is a cloud-based School Result & Daily Test Management Platform that helps schools manage students, teachers, exams, rankings and parent communication efficiently.</p>
                <div className="footer-socials">
                  <a href="https://x.com/webncodetech" target="_blank" rel="noopener noreferrer" className="fs-btn"><Twitter size={15} /></a>
                  <a href="https://www.linkedin.com/company/webncodetechnologies" target="_blank" rel="noopener noreferrer" className="fs-btn"><Linkedin size={15} /></a>
                  <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer" className="fs-btn"><Facebook size={15} /></a>
                  <a href="https://www.instagram.com/webncodetechnologies" target="_blank" rel="noopener noreferrer" className="fs-btn"><Instagram size={15} /></a>
                </div>
              </div>
              <div className="footer-col">
                <h4>Features</h4>
                <a href="https://webncode.in" target="_blank" rel="noopener noreferrer">Student Management</a>
                <a href="https://webncode.in" target="_blank" rel="noopener noreferrer">Teacher Management</a>
                <a href="https://webncode.in" target="_blank" rel="noopener noreferrer">Daily Tests</a>
                <a href="https://webncode.in" target="_blank" rel="noopener noreferrer">Results</a>
                <a href="https://webncode.in" target="_blank" rel="noopener noreferrer">Parent Portal</a>
              </div>
              <div className="footer-col">
                <h4>Support</h4>
                <a href="https://webncode.in" target="_blank" rel="noopener noreferrer">Help Center</a>
                <a href="https://webncode.in" target="_blank" rel="noopener noreferrer">Documentation</a>
                <a href="https://webncode.in/#contact" target="_blank" rel="noopener noreferrer">Contact</a>
                <a href="https://webncode.in" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
                <a href="https://webncode.in" target="_blank" rel="noopener noreferrer">Terms & Conditions</a>
              </div>
              <div className="footer-col contact-col">
                <h4>Contact</h4>
                <div className="contact-item">
                  <Mail size={13} color="#6366f1" />
                  <a
                    href="mailto:testmaster@webncode.in"
                    onClick={(e) => {
                      e.preventDefault();
                      window.open('https://mail.google.com/mail/?view=cm&fs=1&to=testmaster@webncode.in', '_blank');
                    }}
                    className="hover:underline text-slate-300 hover:text-white cursor-pointer"
                  >
                    testmaster@webncode.in
                  </a>
                </div>
                <div className="contact-item">
                  <Phone size={13} color="#10b981" />
                  <a href="tel:+918947919195" className="hover:underline text-slate-300 hover:text-white">+91 8947919195</a>
                </div>
                <div className="contact-item"><MapPin size={13} color="#ec4899" /> Jaipur, Rajasthan</div>
              </div>
            </div>
            <div className="footer-bottom">
              <div className="footer-copy">© 2026 Test Master Pro. All rights reserved.</div>
              <div className="footer-legal">
                <a href="https://webncode.in" target="_blank" rel="noopener noreferrer">Privacy policy</a>
                <a href="https://webncode.in" target="_blank" rel="noopener noreferrer">Terms of service</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}