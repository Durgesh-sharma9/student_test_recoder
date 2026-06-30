import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  GraduationCap, BarChart3, Users, BookOpen, Trophy,
  Calendar, ArrowRight, ClipboardList, FileSpreadsheet, 
  Smartphone, Building2, ChevronRight, Star, Zap, Cloud, 
  Lock, TrendingUp, FileText, Play, Check, X, Twitter, 
  Linkedin, Facebook, Instagram, Mail, Phone, MapPin,
} from "lucide-react";

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
    ? (count / 1000).toFixed(count >= value ? (value >= 10000 ? 0 : 1) : 1) + "K"
    : count;
  return (
    <div className="stat-card" style={{ background: gradient, animationDelay: `${delay}ms` }}>
      <div className="stat-icon-bg"><Icon size={22} color="#fff" /></div>
      <div className="stat-num" style={{ color: "#fff" }}>{display}{suffix}</div>
      <div className="stat-lbl">{label}</div>
    </div>
  );
}

export default function Landing() {
  const [statsVisible, setStatsVisible] = useState(false);
  const [scrolled, setScrolled]         = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const statsRef = useRef(null);

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
    { icon: Users,          title: "Student Management",      desc: "Manage admissions, student records, academic history and class allocation from one place.",        grad: "linear-gradient(135deg,#6366f1,#3b82f6)", shadow: "rgba(99,102,241,.35)" },
    { icon: Users,          title: "Teacher Management",      desc: "Manage teachers, subject assignments, attendance and performance with ease.",                   grad: "linear-gradient(135deg,#10b981,#06b6d4)", shadow: "rgba(16,185,129,.35)" },
    { icon: BookOpen,       title: "Daily Test Management",   desc: "Conduct daily tests, enter marks and monitor student performance continuously.",                 grad: "linear-gradient(135deg,#f59e0b,#f97316)", shadow: "rgba(245,158,11,.35)" },
    { icon: Trophy,         title: "Main Exam Management",    desc: "Create exams, enter marks, calculate percentages and generate final results.",                   grad: "linear-gradient(135deg,#ec4899,#8b5cf6)", shadow: "rgba(236,72,153,.35)" },
    { icon: BarChart3,      title: "Smart Result Analytics",  desc: "Track rankings, toppers, percentages and academic growth through visual reports.",               grad: "linear-gradient(135deg,#f97316,#ef4444)", shadow: "rgba(249,115,22,.35)" },
    { icon: ClipboardList,  title: "Class Reports",           desc: "Generate class-wise reports, topper lists and printable result sheets instantly.",               grad: "linear-gradient(135deg,#14b8a6,#10b981)", shadow: "rgba(20,184,166,.35)" },
    { icon: FileSpreadsheet,title: "Excel Export",            desc: "Export reports and student data to Excel for offline analysis and printing.",                     grad: "linear-gradient(135deg,#3b82f6,#06b6d4)", shadow: "rgba(59,130,246,.35)" },
    { icon: Smartphone,     title: "Parent Portal",           desc: "Parents can securely view results, rankings, notices and student progress anytime.",             grad: "linear-gradient(135deg,#a855f7,#ec4899)", shadow: "rgba(168,85,247,.35)" },
    { icon: Building2,      title: "Multi School Ready",      desc: "Designed for single schools as well as multi-school organizations.",                             grad: "linear-gradient(135deg,#f59e0b,#84cc16)", shadow: "rgba(245,158,11,.35)" },
    { icon: Calendar,       title: "Academic Sessions",       desc: "Manage multiple academic sessions while keeping previous records secure.",                       grad: "linear-gradient(135deg,#06b6d4,#6366f1)", shadow: "rgba(6,182,212,.35)" },
  ];

  const steps = [
    { num: "01", icon: Building2, title: "Create Your School",         desc: "Register your school and complete the initial setup.", grad: "linear-gradient(135deg,#6366f1,#3b82f6)", glow: "rgba(99,102,241,.4)"  },
    { num: "02", icon: Users,     title: "Add Teachers & Students",    desc: "Import data or add records manually.",                                           grad: "linear-gradient(135deg,#10b981,#06b6d4)", glow: "rgba(16,185,129,.4)" },
    { num: "03", icon: BookOpen,  title: "Conduct Tests & Exams",      desc: "Create assessments, enter marks and monitor progress.",                          grad: "linear-gradient(135deg,#f59e0b,#f97316)", glow: "rgba(245,158,11,.4)" },
    { num: "04", icon: Trophy,    title: "Publish Results",            desc: "Generate rankings, report cards and allow parents to view results instantly.",    grad: "linear-gradient(135deg,#ec4899,#8b5cf6)", glow: "rgba(236,72,153,.4)" },
  ];

  const testimonials = [
    { quote: "Our school’s daily test management and result generation process became 90% faster. It has significantly reduced manual errors.", name: "Dr. Anjali Verma", role: "Principal, St. Xavier’s School",              initials: "AV", grad: "linear-gradient(135deg,#6366f1,#3b82f6)", bg: "linear-gradient(135deg,#eef2ff,#eff6ff)" },
    { quote: "The Parent Portal feature has been a game-changer. Parents are now much more involved, and our office staff is no longer overwhelmed with queries.", name: "Rajesh Meena", role: "Administrator, Global Public School", initials: "RM", grad: "linear-gradient(135deg,#10b981,#06b6d4)", bg: "linear-gradient(135deg,#ecfdf5,#e0f2fe)" },
    { quote: "Managing multiple school branches from one dashboard is seamless. Data accuracy is perfect, and the reporting tools are truly professional.",  name: "Sunita Reddy", role: "Director, Heritage Academy",          initials: "SR", grad: "linear-gradient(135deg,#ec4899,#8b5cf6)", bg: "linear-gradient(135deg,#fdf4ff,#fce7f3)" },
  ];

  const plans = [
    {
      name: "Starter", price: "₹999", cta: "Sign Up Free", popular: false,
      desc: "Ideal for small schools getting started with digital result management.",
      grad: "linear-gradient(135deg,#6366f1,#3b82f6)", glow: "rgba(99,102,241,.15)",
      features: [
        { text: "Up to 500 students", ok: true },
        { text: "5 teacher accounts", ok: true },
        { text: "Daily test module",  ok: true },
        { text: "Result generation",  ok: true },
        { text: "Parent portal",      ok: false },
        { text: "Multi-school",       ok: false },
      ],
    },
    {
      name: "School", price: "₹2,499", cta: "Start Free Trial", popular: true,
      desc: "Full ERP features and parent access for growing institutions.",
      grad: "linear-gradient(135deg,#2563eb,#7c3aed)", glow: "rgba(37,99,235,.2)",
      features: [
        { text: "Up to 2,000 students", ok: true },
        { text: "Unlimited teachers",   ok: true },
        { text: "Full ERP modules",     ok: true },
        { text: "Parent portal",        ok: true },
        { text: "CSV / XLSX export",    ok: true },
        { text: "Multi-school",         ok: false },
      ],
    },
    {
      name: "Enterprise", price: "Custom", cta: "Contact Sales", popular: false,
      desc: "For school chains needing multi-campus management at scale.",
      grad: "linear-gradient(135deg,#ec4899,#8b5cf6)", glow: "rgba(236,72,153,.15)",
      features: [
        { text: "Unlimited students",    ok: true },
        { text: "Unlimited teachers",    ok: true },
        { text: "All School features",   ok: true },
        { text: "Multi-school dashboard", ok: true },
        { text: "Dedicated support",     ok: true },
        { text: "Custom integrations",   ok: true },
      ],
    },
  ];

  const whyCards = [
    { icon: Zap,        title: "Easy to Use",          desc: "Simple interface designed for school administrators and teachers.",  grad: "linear-gradient(135deg,#f59e0b,#f97316)", glow: "rgba(245,158,11,.12)" },
    { icon: TrendingUp, title: "Fast Result Generation", desc: "Generate rankings and report cards within seconds.",              grad: "linear-gradient(135deg,#10b981,#06b6d4)", glow: "rgba(16,185,129,.12)" },
    { icon: Cloud,      title: "Cloud Based",          desc: "Access your school anytime from any device.",                        grad: "linear-gradient(135deg,#3b82f6,#6366f1)", glow: "rgba(59,130,246,.12)" },
    { icon: Lock,       title: "Secure Data",          desc: "School data remains private, secure and isolated.",                  grad: "linear-gradient(135deg,#ec4899,#ef4444)", glow: "rgba(236,72,153,.12)" },
    { icon: Building2,  title: "Scalable Platform",     desc: "Perfect for schools of every size.",                                  grad: "linear-gradient(135deg,#8b5cf6,#a855f7)", glow: "rgba(139,92,246,.12)" },
    { icon: FileText,   title: "Professional Reports",  desc: "Generate clean printable reports with one click.",                  grad: "linear-gradient(135deg,#14b8a6,#84cc16)", glow: "rgba(20,184,166,.12)" },
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
        .nav{position:sticky;top:0;z-index:100;background:rgba(255,255,255,.94);backdrop-filter:blur(18px);border-bottom:1px solid var(--border);transition:box-shadow .3s}
        .nav.scrolled{box-shadow:0 4px 24px rgba(0,0,0,.07)}
        .nav-inner{max-width:1160px;margin:0 auto;padding:0 32px;height:66px;display:flex;align-items:center;justify-content:space-between;gap:32px}
        .logo{display:flex;align-items:center;gap:10px;font-size:17px;font-weight:800;color:var(--text)}
        .logo-mark{width:38px;height:38px;background:linear-gradient(135deg,#6366f1,#2563eb);border-radius:11px;display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 4px 14px rgba(99,102,241,.4)}
        .nav-links{display:flex;align-items:center;gap:28px;font-size:14px;font-weight:600;color:var(--text-2)}
        .nav-links a:hover{color:var(--text)}
        .nav-actions{display:flex;gap:10px;align-items:center}
        
        .mobile-menu-btn { display: none; background: none; font-size: 24px; padding: 10px; border: none; cursor: pointer; }
        .mobile-menu { 
          display: none; 
          background: #fff; 
          padding: 24px; 
          border-radius: 0 0 20px 20px;
          border-bottom: 1px solid var(--border); 
          flex-direction: column; 
          gap: 20px; 
          text-align: left; 
          position: fixed; 
          width: 100%; 
          left: 0; 
          top: 66px; 
          z-index: 2000; 
          box-shadow: 0 20px 50px rgba(0,0,0,0.1); 
        }
        .mobile-menu.open { display: flex !important; }
        .mobile-menu a { font-weight: 600; color: var(--text-2); font-size: 16px; }
        .mobile-menu .btn { width: 100%; justify-content: center; }

        /* ── HERO ── */
        .hero-wrap{max-width:1160px;margin:0 auto;padding:88px 32px 72px}
        .hero-grid{display:grid;grid-template-columns:1fr 1fr;gap:72px;align-items:center}
        .hero-pill{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#eef2ff,#fdf4ff);color:#4f46e5;font-size:12px;font-weight:700;padding:7px 18px;border-radius:40px;border:1.5px solid #c7d2fe;margin-bottom:24px;letter-spacing:.02em}
        .pill-dot{width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,#10b981,#06b6d4);flex-shrink:0;box-shadow:0 0 0 3px rgba(16,185,129,.25)}
        h1.hero-h1{font-size:52px;font-weight:800;line-height:1.08;letter-spacing:-.035em;color:var(--text)}
        .hero-accent{background:linear-gradient(135deg,#6366f1,#ec4899,#f97316);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .hero-sub{font-size:16px;color:var(--text-2);line-height:1.8;margin:20px 0 34px;max-width:490px}
        .hero-actions{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:38px}
        .hero-checks{display:grid;grid-template-columns:1fr 1fr;gap:11px}
        .hc{display:flex;align-items:center;gap:9px;font-size:13px;font-weight:600;color:var(--text-2)}
        .hc-dot{width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,#10b981,#059669);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 3px 8px rgba(16,185,129,.3)}

        /* ── DASHBOARD ── */
        .dash{background:linear-gradient(160deg,#fafbff,#f3f4ff);border:1.5px solid #e0e7ff;border-radius:var(--r-xl);padding:24px;box-shadow:0 24px 80px rgba(99,102,241,.15)}
        .dash-topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
        .dash-title-text{font-size:13px;font-weight:700}
        .live-badge{display:flex;align-items:center;gap:5px;font-size:11px;color:#059669;font-weight:700;font-family:var(--mono);background:linear-gradient(135deg,#ecfdf5,#d1fae5);padding:5px 12px;border-radius:20px;border:1px solid #6ee7b7}
        .live-badge::before{content:'';width:6px;height:6px;border-radius:50%;background:#10b981;display:block;animation:pulse 1.5s infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        .dash-kpis{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}
        .kpi{background:#fff;border:1px solid #e0e7ff;border-radius:var(--r);padding:15px 16px;position:relative;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.04)}
        .kpi-bar{position:absolute;top:0;left:0;right:0;height:3px;border-radius:3px 3px 0 0}
        .kpi-lbl{font-size:10px;font-weight:700;letter-spacing:.07em;color:var(--text-3);margin-bottom:6px;text-transform:uppercase}
        .kpi-val{font-size:24px;font-weight:800;color:var(--text);letter-spacing:-.03em}
        .kpi-delta{font-size:11px;font-weight:700;color:#059669;margin-top:3px}
        .dash-chart{background:#fff;border:1px solid #e0e7ff;border-radius:var(--r);padding:16px;box-shadow:0 2px 8px rgba(0,0,0,.04)}
        .chart-ttl{font-size:11px;font-weight:700;color:var(--text-3);letter-spacing:.07em;text-transform:uppercase;margin-bottom:12px}
        .bars{display:flex;align-items:flex-end;gap:6px;height:76px}
        .b{flex:1;border-radius:5px 5px 0 0;transition:opacity .2s}
        .b:hover{opacity:.8}
        .blabels{display:flex;gap:6px;margin-top:6px}
        .blabels span{flex:1;text-align:center;font-size:10px;color:var(--text-3);font-family:var(--mono)}

        /* ── STATS ── */
        .stats-section{padding:56px 0;background:linear-gradient(135deg,#f8faff 0%,#fdf4ff 50%,#fff7ed 100%)}
        .stats-inner{max-width:1160px;margin:0 auto;padding:0 32px;display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
        .stat-card{border-radius:var(--r-lg);padding:28px 20px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.1);transition:transform .22s,box-shadow .22s;position:relative;overflow:hidden}
        .stat-card::before{content:'';position:absolute;top:-30px;right:-30px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.12)}
        .stat-card:hover{transform:translateY(-5px);box-shadow:0 16px 48px rgba(0,0,0,.14)}
        .stat-icon-bg{width:48px;height:48px;border-radius:14px;background:rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;backdrop-filter:blur(4px)}
        .stat-num{font-size:38px;font-weight:800;letter-spacing:-.04em}
        .stat-lbl{font-size:13px;color:rgba(255,255,255,.85);margin-top:5px;font-weight:600}

        /* ── SECTION SHARED ── */
        .section{max-width:1160px;margin:0 auto;padding:96px 32px}
        .section-head{text-align:center;margin-bottom:60px}
        .s-tag{display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#eef2ff,#fdf4ff);color:#4f46e5;font-size:11px;font-weight:800;padding:6px 16px;border-radius:40px;border:1.5px solid #c7d2fe;margin-bottom:16px;letter-spacing:.07em;text-transform:uppercase}
        .section-head h2{font-size:38px;font-weight:800;letter-spacing:-.03em;color:var(--text)}
        .section-head p{font-size:15px;color:var(--text-2);margin-top:12px;max-width:520px;margin-left:auto;margin-right:auto;line-height:1.8}

        /* ── FEATURES ── */
        .feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
        .feat-card{border-radius:var(--r-lg);padding:28px;color:#fff;position:relative;overflow:hidden;transition:transform .22s,box-shadow .22s}
        .feat-card::before{content:'';position:absolute;top:-40px;right:-40px;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,.1)}
        .feat-card::after{content:'';position:absolute;bottom:-50px;left:-20px;width:130px;height:130px;border-radius:50%;background:rgba(255,255,255,.07)}
        .feat-card:hover{transform:translateY(-6px)}
        .feat-icon-bg{width:48px;height:48px;border-radius:14px;background:rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;margin-bottom:16px;backdrop-filter:blur(4px)}
        .feat-card h3{font-size:15px;font-weight:700;margin-bottom:8px;position:relative}
        .feat-card p{font-size:13px;line-height:1.65;opacity:.88;position:relative}

        /* ── HOW IT WORKS ── */
        .how-bg{background:linear-gradient(160deg,#fafbff 0%,#f0f9ff 50%,#fdf4ff 100%);padding:96px 0;border-top:1px solid #e0e7ff;border-bottom:1px solid #e0e7ff}
        .how-inner{max-width:1160px;margin:0 auto;padding:0 32px}
        .steps-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
        .step{background:#fff;border:1.5px solid var(--border);border-radius:var(--r-lg);padding:30px 22px;text-align:center;transition:all .22s;position:relative;overflow:hidden}
        .step-top{position:absolute;top:0;left:0;right:0;height:5px;border-radius:5px 5px 0 0}
        .step:hover{transform:translateY(-5px);box-shadow:var(--sh-lg)}
        .step-num{font-family:var(--mono);font-size:11px;font-weight:500;color:var(--text-3);margin-bottom:18px;letter-spacing:.12em}
        .step-circle{width:58px;height:58px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px}
        .step h3{font-size:15px;font-weight:700;margin-bottom:8px}
        .step p{font-size:13px;color:var(--text-2);line-height:1.65}

        /* ── PARENT PORTAL ── */
        .portal-grid{display:grid;grid-template-columns:1fr 1fr;gap:72px;align-items:center}
        .portal-text h2{font-size:34px;font-weight:800;letter-spacing:-.03em;margin-bottom:12px;line-height:1.15}
        .portal-text p{font-size:14px;color:var(--text-2);line-height:1.8;margin-bottom:32px}
        .portal-feats{display:flex;flex-direction:column;gap:20px}
        .pf{display:flex;align-items:flex-start;gap:16px}
        .pf-icon{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .pf h4{font-size:15px;font-weight:700;margin-bottom:4px}
        .pf p{font-size:13px;color:var(--text-2);line-height:1.6}
        .phone-frame{background:linear-gradient(160deg,#f8faff,#fdf4ff);border:1.5px solid #e0e7ff;border-radius:32px;padding:24px;max-width:280px;margin:0 auto;box-shadow:0 24px 80px rgba(99,102,241,.15)}
        .phone-hdr{border-radius:18px;padding:18px 20px;margin-bottom:16px}
        .phone-hdr p{font-size:11px;opacity:.8;margin-top:4px}
        .phone-hdr strong{font-size:15px}
        .p-card{background:#fff;border:1px solid #e0e7ff;border-radius:14px;padding:14px 16px;margin-bottom:10px;display:flex;align-items:center;gap:13px;transition:box-shadow .2s}
        .p-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.06)}
        .p-card-icon{width:40px;height:40px;border-radius:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .p-card h5{font-size:12px;font-weight:700;margin-bottom:3px}
        .p-card span{font-size:11px;color:var(--text-3)}

        /* ── WHY US ── */
        .why-bg{background:linear-gradient(160deg,#fffbeb 0%,#ecfdf5 40%,#eff6ff 80%,#fdf4ff 100%);padding:96px 0}
        .why-inner{max-width:1160px;margin:0 auto;padding:0 32px}
        .why-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
        .why-card{background:#fff;border:1.5px solid var(--border);border-radius:var(--r-lg);padding:28px;transition:all .22s;position:relative;overflow:hidden}
        .why-card::before{content:'';position:absolute;inset:0;opacity:0;transition:opacity .3s}
        .why-card:hover{transform:translateY(-5px);box-shadow:var(--sh-lg)}
        .why-icon{width:50px;height:50px;border-radius:14px;display:flex;align-items:center;justify-content:center;margin-bottom:16px}
        .why-card h3{font-size:15px;font-weight:700;margin-bottom:8px}
        .why-card p{font-size:13px;color:var(--text-2);line-height:1.65}

        /* ── TESTIMONIALS ── */
        .testi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
        .tc{border-radius:var(--r-lg);padding:28px;position:relative;overflow:hidden;transition:transform .22s,box-shadow .22s}
        .tc:hover{transform:translateY(-4px);box-shadow:var(--sh-lg)}
        .tc-bar{position:absolute;top:0;left:0;right:0;height:5px;border-radius:5px 5px 0 0}
        .tc-stars{display:flex;gap:3px;margin-bottom:16px}
        .tc-stars svg{color:#f59e0b;fill:#f59e0b}
        .tc-quote{font-size:14px;line-height:1.75;margin-bottom:20px;opacity:.85}
        .tc-author{display:flex;align-items:center;gap:13px;border-top:1px solid rgba(0,0,0,.07);padding-top:18px}
        .tc-avatar{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#fff;flex-shrink:0}
        .tc-name{font-size:13px;font-weight:700}
        .tc-role{font-size:11px;opacity:.65;margin-top:2px}

        /* ── PRICING ── */
        .pricing-bg{background:linear-gradient(160deg,#faf5ff 0%,#eff6ff 50%,#ecfdf5 100%);padding:96px 0}
        .pricing-inner{max-width:1160px;margin:0 auto;padding:0 32px}
        .pricing-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
        .pc{background:#fff;border:1.5px solid var(--border);border-radius:var(--r-lg);padding:32px;position:relative;transition:all .22s}
        .pc:hover{box-shadow:var(--sh-lg);transform:translateY(-3px)}
        .pc.popular{border:none;color:#fff}
        .pc.popular .pc-name{color:rgba(255,255,255,.8)}
        .pc.popular .pc-desc{color:rgba(255,255,255,.75)}
        .pc.popular .pc-price{-webkit-text-fill-color:#fff;background:none;color:#fff}
        .pc.popular .pc-price sub{-webkit-text-fill-color:rgba(255,255,255,.7)}
        .pc.popular .pc-feat{color:rgba(255,255,255,.9)}
        .pc.popular .pc-feat.off{color:rgba(255,255,255,.4)}
        .pc.popular .pc-divider{border-color:rgba(255,255,255,.2)}
        .pop-badge{position:absolute;top:-14px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#fbbf24,#f97316);color:#fff;font-size:11px;font-weight:800;padding:5px 18px;border-radius:20px;white-space:nowrap;letter-spacing:.04em;box-shadow:0 4px 16px rgba(251,191,36,.5)}
        .pc-name{font-size:11px;font-weight:800;color:var(--text-3);letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px}
        .pc-price{font-size:40px;font-weight:800;letter-spacing:-.04em;background:linear-gradient(135deg,#1e293b,#475569);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .pc-price sub{font-size:14px;font-weight:500}
        .pc-desc{font-size:13px;color:var(--text-2);margin:10px 0 24px;line-height:1.65}
        .pc-divider{border:none;border-top:1px solid var(--border);margin:22px 0}
        .pc-feat{display:flex;align-items:center;gap:10px;font-size:13px;margin-bottom:11px;font-weight:500}
        .pc-feat.off{color:var(--text-3);font-weight:400}

        /* ── CTA ── */
        .cta-box{border-radius:var(--r-xl);padding:80px 48px;text-align:center;position:relative;overflow:hidden;background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 35%,#ec4899 70%,#f97316 100%)}
        .cta-orb-1{position:absolute;top:-80px;left:-80px;width:320px;height:320px;border-radius:50%;background:rgba(255,255,255,.07);pointer-events:none}
        .cta-orb-2{position:absolute;bottom:-100px;right:-60px;width:400px;height:400px;border-radius:50%;background:rgba(255,255,255,.05);pointer-events:none}
        .cta-box h2{font-size:38px;font-weight:800;color:#fff;letter-spacing:-.03em;margin-bottom:16px;position:relative}
        .cta-box p{font-size:16px;color:rgba(255,255,255,.8);max-width:500px;margin:0 auto 40px;line-height:1.8;position:relative}
        .cta-actions{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;position:relative}
        .cta-note{font-size:13px;color:rgba(255,255,255,.6);margin-top:20px;position:relative}

        /* ── FOOTER ── */
        .footer{background:#0f172a;padding:64px 32px 28px;color:#fff}
        .footer-inner{max-width:1160px;margin:0 auto}
        .footer-top{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:44px;margin-bottom:56px}
        .footer-logo{display:flex;align-items:center;gap:10px;font-size:16px;font-weight:800;margin-bottom:14px;color:#fff}
        .footer-logo-mark{width:32px;height:32px;background:linear-gradient(135deg,#6366f1,#2563eb);border-radius:9px;display:flex;align-items:center;justify-content:center;color:#fff}
        .footer-desc{font-size:13px;color:#64748b;line-height:1.8;max-width:280px}
        .footer-socials{display:flex;gap:10px;margin-top:20px}
        .fs-btn{width:36px;height:36px;border:1px solid #1e293b;border-radius:9px;display:flex;align-items:center;justify-content:center;color:#64748b;transition:all .2s;cursor:pointer;background:none}
        .fs-btn:hover{border-color:#6366f1;color:#a5b4fc;background:#1e293b}
        .footer-col h4{font-size:13px;font-weight:700;margin-bottom:18px;color:#e2e8f0}
        .footer-col a{display:block;font-size:13px;color:#64748b;margin-bottom:11px;transition:color .15s}
        .footer-col a:hover{color:#e2e8f0}
        .footer-bottom{display:flex;align-items:center;justify-content:space-between;border-top:1px solid #1e293b;padding-top:24px}
        .footer-copy{font-size:12px;color:#475569}
        .footer-legal{display:flex;gap:20px}
        .footer-legal a{font-size:12px;color:#475569;transition:color .15s}
        .footer-legal a:hover{color:#94a3b8}
        .contact-item{display:flex;align-items:center;gap:8px;font-size:13px;color:#64748b;margin-bottom:10px}

        /* ── MOBILE RESPONSIVE RULES ── */
        @media (max-width: 1024px) {
          .hero-grid { grid-template-columns: 1fr; gap: 40px; text-align: center; }
          .hero-actions { justify-content: center; }
          .hero-sub { margin-left: auto; margin-right: auto; }
          .hero-checks { justify-content: center; }
          .feat-grid, .steps-grid, .why-grid, .testi-grid, .pricing-grid { grid-template-columns: 1fr; }
          .portal-grid { grid-template-columns: 1fr; gap: 40px; }
          .footer-top { grid-template-columns: 1fr 1fr; }
        }

        @media (max-width: 768px) {
          .nav-inner { padding: 0 20px; }
          .nav-links, .nav-actions { display: none; }
          .mobile-menu-btn { display: block; }
          .stats-inner { grid-template-columns: 1fr 1fr; }
          .section { padding: 60px 20px; }
          .cta-box { padding: 40px 20px; }
          .footer-top { grid-template-columns: 1fr; text-align: center; }
          .footer-desc { margin: 0 auto; }
          .footer-socials { justify-content: center; }
          .footer-bottom { flex-direction: column; gap: 16px; }
        }

        @media (max-width: 480px) {
          h1.hero-h1 { font-size: 36px; }
          .stats-inner { grid-template-columns: 1fr; }
          .pc-price { font-size: 32px; }
        }

        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        .fade-up{animation:fadeUp .65s ease forwards}
      `}</style>

      {/* ── NAV ── */}
      <nav className={`nav${scrolled ? " scrolled" : ""}`}>
        <div className="nav-inner">
          <div className="logo">
            <div className="logo-mark"><GraduationCap size={18} /></div>
            Test Master Pro
          </div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
          </div>
          <div className="nav-actions">
            <Link to="/login" className="btn btn-ghost">Staff Login</Link>
            <Link to="/parent-login" className="btn btn-ghost">Parent Login</Link>
            <Link to="/signup" className="btn btn-primary">Sign Up <ArrowRight size={15} /></Link>
          </div>
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : '☰'}
          </button>
        </div>

        {/* Mobile Dropdown */}
        <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div className="logo"><div className="logo-mark"><GraduationCap size={18} /></div> Test Master Pro</div>
            <button onClick={() => setMobileMenuOpen(false)} style={{background:'none', border:'none', cursor:'pointer'}}><X size={28}/></button>
          </div>
          <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
          <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
          <a href="#about" onClick={() => setMobileMenuOpen(false)}>About</a>
          <a href="#contact" onClick={() => setMobileMenuOpen(false)}>Contact</a>
          <div style={{borderTop: '1px solid #f1f5f9', margin: '5px 0'}}></div>
          <Link to="/login" className="btn btn-ghost" onClick={() => setMobileMenuOpen(false)}>Staff Login</Link>
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
              {["Student Management","Teacher Management","Daily Test System","Parent Portal","Smart Reports","Cloud Based Platform"].map(t => (
                <div className="hc" key={t}>
                  <div className="hc-dot"><Check size={11} color="#fff" strokeWidth={3} /></div>
                  {t}
                </div>
              ))}
            </div>
          </div>

          {/* dashboard mockup */}
          <div className="dash">
            <div className="dash-topbar">
              <span className="dash-title-text">Dashboard Overview</span>
              <span className="live-badge">LIVE</span>
            </div>
            <div className="dash-kpis">
              {[
                { lbl:"STUDENTS",  val:"12,540", delta:"↑ 4.2%", bar:"linear-gradient(90deg,#6366f1,#3b82f6)" },
                { lbl:"TESTS DONE",val:"1,250",  delta:"↑ 12%",  bar:"linear-gradient(90deg,#10b981,#06b6d4)" },
                { lbl:"TOP RANK",  val:"#1",     delta:"Class A", bar:"linear-gradient(90deg,#f59e0b,#f97316)" },
                { lbl:"UPTIME",    val:"99.9%",  delta:"30 days", bar:"linear-gradient(90deg,#ec4899,#8b5cf6)" },
              ].map(k => (
                <div className="kpi" key={k.lbl}>
                  <div className="kpi-bar" style={{ background: k.bar }} />
                  <div className="kpi-lbl">{k.lbl}</div>
                  <div className="kpi-val">{k.val}</div>
                  <div className="kpi-delta">{k.delta}</div>
                </div>
              ))}
            </div>
            <div className="dash-chart">
              <div className="chart-ttl">Results Generated</div>
              <div className="bars">
                {[
                  {h:42,c:"#c7d2fe"},{h:58,c:"#c7d2fe"},{h:51,c:"#a5b4fc"},
                  {h:72,c:"#818cf8"},{h:65,c:"#a5b4fc"},
                  {h:92,c:"linear-gradient(0deg,#4f46e5,#6366f1)"},
                  {h:78,c:"#c7d2fe"},
                ].map((bar,i)=>(
                  <div key={i} className="b" style={{height:`${bar.h}%`,background:bar.c}} />
                ))}
              </div>
              <div className="blabels">
                {["Oct","Nov","Dec","Jan","Feb","Mar","Apr"].map(m=><span key={m}>{m}</span>)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="stats-section" ref={statsRef}>
        <div className="stats-inner">
          <StatCard value={100}   suffix="+" label="Schools"           icon={Building2}    gradient="linear-gradient(135deg,#6366f1,#3b82f6)" delay={0}   inView={statsVisible} />
          <StatCard value={15000} suffix="" label="Students"          icon={Users}        gradient="linear-gradient(135deg,#10b981,#06b6d4)" delay={80}  inView={statsVisible} />
          <StatCard value={800}   suffix="+" label="Teachers"          icon={GraduationCap} gradient="linear-gradient(135deg,#f59e0b,#f97316)" delay={160} inView={statsVisible} />
          <StatCard value={50000} suffix="+" label="Results generated" icon={FileText}       gradient="linear-gradient(135deg,#ec4899,#8b5cf6)" delay={240} inView={statsVisible} />
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
            <div className="s-tag">✦ Get started fast</div>
            <h2>Start Managing Your School in Minutes</h2>
          </div>
          <div className="steps-grid">
            {steps.map(s => (
              <div className="step" key={s.num} style={{ boxShadow: `0 8px 32px ${s.glow}` }}>
                <div className="step-top" style={{ background: s.grad }} />
                <div className="step-num">STEP {s.num}</div>
                <div className="step-circle" style={{ background: s.grad, boxShadow: `0 8px 24px ${s.glow}` }}>
                  <s.icon size={26} color="#fff" />
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
            <div className="s-tag" style={{ marginBottom: 18 }}>✦ Parent portal</div>
            <h2>Keep Parents Connected</h2>
            <p>Parents receive secure access to monitor results, rankings, academic progress and important school updates from anywhere.</p>
            <div className="portal-feats">
              {[
                { icon: FileText,   title: "View Results",       desc: "Access subject-wise marks and overall performance.",    grad: "linear-gradient(135deg,#6366f1,#3b82f6)" },
                { icon: Trophy,     title: "View Rankings",      desc: "Check class rank and overall academic position.",       grad: "linear-gradient(135deg,#f59e0b,#f97316)" },
                { icon: TrendingUp, title: "Track Progress",     desc: "Monitor performance trends throughout the academic session.",    grad: "linear-gradient(135deg,#ec4899,#8b5cf6)" },
              ].map(pf => (
                <div className="pf" key={pf.title}>
                  <div className="pf-icon" style={{ background: pf.grad, boxShadow: `0 6px 18px rgba(0,0,0,.15)` }}>
                    <pf.icon size={20} color="#fff" />
                  </div>
                  <div><h4>{pf.title}</h4><p>{pf.desc}</p></div>
                </div>
              ))}
            </div>
          </div>
          <div className="phone-frame">
            <div className="phone-hdr" style={{ background: "linear-gradient(135deg,#4f46e5,#ec4899)", color: "#fff" }}>
              <strong>My Child's Performance</strong>
              <p>Academic year 2025–26</p>
            </div>
            {[
              { icon: FileText,  title: "Math — Unit Test 3", sub: "92/100 · Rank 3rd in class",  grad: "linear-gradient(135deg,#6366f1,#3b82f6)" },
              { icon: BarChart3, title: "Overall percentage", sub: "88.4% · Grade A",            grad: "linear-gradient(135deg,#10b981,#06b6d4)" },
              { icon: Trophy,    title: "Semester rank",      sub: "5th out of 42 students",      grad: "linear-gradient(135deg,#ec4899,#8b5cf6)" },
              { icon: TrendingUp, title: "Progress trend",    sub: "+6.2% vs last term",          grad: "linear-gradient(135deg,#f59e0b,#f97316)" },
            ].map(pc => (
              <div className="p-card" key={pc.title}>
                <div className="p-card-icon" style={{ background: pc.grad }}><pc.icon size={16} color="#fff" /></div>
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
              <div className="tc-stars">{[...Array(5)].map((_,i) => <Star key={i} size={14} />)}</div>
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
          <div className="pricing-grid">
            {plans.map(plan => (
              <div
                className={`pc${plan.popular ? " popular" : ""}`}
                key={plan.name}
                style={plan.popular
                  ? { background: plan.grad, boxShadow: `0 20px 60px ${plan.glow}` }
                  : { boxShadow: `0 8px 32px ${plan.glow}` }}
              >
                {plan.popular && <div className="pop-badge">🔥 Most popular</div>}
                <div className="pc-name">{plan.name}</div>
                <div className="pc-price">{plan.price}{plan.price !== "Custom" && <sub> / month</sub>}</div>
                <p className="pc-desc">{plan.desc}</p>
                {plan.name === "Enterprise" ? (
                  <a href="mailto:support@schoolresult.app"
                     className="btn btn-outline"
                     style={{ width: "100%", justifyContent: "center", display: "inline-flex" }}>
                    {plan.cta}
                  </a>
                ) : plan.popular ? (
                  <Link to="/signup" className="btn btn-white"
                        style={{ width: "100%", justifyContent: "center" }}>
                    {plan.cta} <ChevronRight size={15} />
                  </Link>
                ) : (
                  <Link to="/signup" className="btn btn-outline"
                        style={{ width: "100%", justifyContent: "center" }}>
                    {plan.cta}
                  </Link>
                )}
                <hr className="pc-divider" />
                {plan.features.map(f => (
                  <div className={`pc-feat${f.ok ? "" : " off"}`} key={f.text}>
                    {f.ok
                      ? <Check size={15} color={plan.popular ? "#86efac" : "#10b981"} strokeWidth={2.5} />
                      : <X size={15} color={plan.popular ? "rgba(255,255,255,.3)" : "#cbd5e1"} />}
                    {f.text}
                  </div>
                ))}
              </div>
            ))}
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
            <a href="mailto:support@schoolresult.app" className="btn btn-ghost-white btn-lg">
              <Phone size={15} /> Contact Sales
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
              <div>
                <div className="footer-logo">
                  <div className="footer-logo-mark"><GraduationCap size={16} /></div>
                  Test Master Pro
                </div>
                <p className="footer-desc">Test Master Pro is a cloud-based School Result & Daily Test Management Platform that helps schools manage students, teachers, exams, rankings and parent communication efficiently.</p>
                <div className="footer-socials">
                  {[Twitter, Linkedin, Facebook, Instagram].map((Icon, i) => (
                    <button className="fs-btn" key={i}><Icon size={15} /></button>
                  ))}
                </div>
              </div>
              <div className="footer-col">
                <h4>Features</h4>
                <a href="#">Student Management</a>
                <a href="#">Teacher Management</a>
                <a href="#">Daily Tests</a>
                <a href="#">Results</a>
                <a href="#">Parent Portal</a>
              </div>
              <div className="footer-col">
                <h4>Support</h4>
                <a href="#">Help Center</a>
                <a href="#">Documentation</a>
                <a href="#">Contact</a>
                <a href="#">Privacy Policy</a>
                <a href="#">Terms & Conditions</a>
              </div>
              <div className="footer-col">
                <h4>Contact</h4>
                <div className="contact-item"><Mail size={13} color="#6366f1" /> support@schoolresult.app</div>
                <div className="contact-item"><Phone size={13} color="#10b981" /> +91 98765 43210</div>
                <div className="contact-item"><MapPin size={13} color="#ec4899" /> Jaipur, Rajasthan</div>
              </div>
            </div>
            <div className="footer-bottom">
              <div className="footer-copy">© 2026 Test Master Pro. All rights reserved.</div>
              <div className="footer-legal">
                <a href="#">Privacy policy</a>
                <a href="#">Terms of service</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}