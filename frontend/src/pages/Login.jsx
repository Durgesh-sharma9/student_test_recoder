import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import {
  GraduationCap,
  Mail,
  Lock,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);

    try {
      const user = await login(email, password);

      toast.success('Login successful');

      const role = user.role === 'admin' ? 'school_admin' : user.role;
      if (role === 'super_admin') navigate('/super-admin');
      else if (role === 'school_admin') navigate('/admin');
      else navigate('/teacher');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        *{
          margin:0;
          padding:0;
          box-sizing:border-box;
        }

        body{
          font-family:'Inter',sans-serif;
          background:#f8fafc;
        }

        .login-page{
          min-height:100vh;
          display:flex;
          background:#f8fafc;
          overflow:hidden;
        }

        /* =========================
           LEFT PANEL
        ========================= */

        .left-panel{
          flex:1;

          background:
            linear-gradient(
              135deg,
              rgba(255,255,255,0.92),
              rgba(238,242,255,0.96)
            ),
            url('https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1400&auto=format&fit=crop');

          background-size:cover;
          background-position:center;

          position:relative;

          display:none;
          align-items:center;
          justify-content:center;

          padding:60px;
        }

        @media(min-width:1024px){
          .left-panel{
            display:flex;
          }
        }

        .overlay-pattern{
          position:absolute;
          inset:0;

          background-image:
            linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px);

          background-size:42px 42px;
        }

        .left-content{
          position:relative;
          z-index:2;
          max-width:480px;
        }

        .live-badge{
          display:inline-flex;
          align-items:center;
          gap:8px;

          background:#eef2ff;
          border:1px solid #c7d2fe;

          padding:8px 14px;
          border-radius:999px;

          color:#4f46e5;

          font-size:12px;
          font-weight:600;

          margin-bottom:28px;
        }

        .live-dot{
          width:8px;
          height:8px;
          border-radius:50%;
          background:#4f46e5;
        }

        .left-content h1{
          font-size:56px;
          line-height:1.08;
          font-weight:800;
          color:#0f172a;
          letter-spacing:-2px;
          margin-bottom:20px;
        }

        .left-content h1 span{
          color:#4f46e5;
        }

        .left-content p{
          color:#475569;
          font-size:15px;
          line-height:1.8;
          margin-bottom:40px;
          max-width:440px;
        }

        .feature-list{
          display:flex;
          flex-direction:column;
          gap:16px;
        }

        .feature-card{
          display:flex;
          align-items:center;
          gap:14px;

          background:rgba(255,255,255,0.75);

          border:1px solid #e2e8f0;

          border-radius:18px;

          padding:18px;

          backdrop-filter:blur(10px);

          box-shadow:0 4px 12px rgba(15,23,42,0.04);
        }

        .feature-icon{
          width:50px;
          height:50px;
          border-radius:14px;

          background:#eef2ff;

          display:flex;
          align-items:center;
          justify-content:center;

          color:#4f46e5;

          flex-shrink:0;
        }

        .feature-card h4{
          color:#0f172a;
          font-size:15px;
          font-weight:700;
          margin-bottom:4px;
        }

        .feature-card p{
          margin:0;
          font-size:12px;
          color:#64748b;
          line-height:1.5;
        }

        /* =========================
           RIGHT PANEL
        ========================= */

        .right-panel{
          width:100%;

          display:flex;
          align-items:center;
          justify-content:center;

          padding:24px;

          background:#f8fafc;
        }

        @media(min-width:1024px){
          .right-panel{
            width:500px;
            padding:40px;
          }
        }

        .login-card{
          width:100%;
          max-width:400px;

          background:white;

          border-radius:28px;

          padding:36px;

          border:1px solid #e2e8f0;

          box-shadow:
            0 10px 30px rgba(15,23,42,0.06),
            0 2px 8px rgba(15,23,42,0.04);
        }

        .logo{
          display:flex;
          align-items:center;
          gap:14px;

          margin-bottom:34px;
        }

        .logo-icon{
          width:56px;
          height:56px;

          border-radius:18px;

          background:#4f46e5;

          display:flex;
          align-items:center;
          justify-content:center;

          color:white;

          box-shadow:0 8px 20px rgba(79,70,229,0.25);
        }

        .logo h2{
          font-size:19px;
          font-weight:800;
          color:#0f172a;
          margin-bottom:2px;
        }

        .logo p{
          font-size:12px;
          color:#64748b;
        }

        .title{
          font-size:30px;
          font-weight:800;
          color:#0f172a;
          margin-bottom:6px;
          letter-spacing:-1px;
        }

        .subtitle{
          color:#64748b;
          font-size:14px;
          margin-bottom:30px;
        }

        .form-group{
          margin-bottom:18px;
        }

        .form-label{
          display:block;
          margin-bottom:8px;

          font-size:13px;
          font-weight:600;

          color:#334155;
        }

        .input-wrap{
          position:relative;
        }

        .input-icon{
          position:absolute;
          left:15px;
          top:50%;
          transform:translateY(-50%);
          color:#94a3b8;
        }

        .form-input{
          width:100%;
          height:50px;

          border-radius:14px;

          border:1px solid #dbe2ea;

          background:#f8fafc;

          padding:0 14px 0 46px;

          font-size:14px;

          outline:none;

          transition:0.2s ease;
        }

        .form-input:focus{
          border-color:#4f46e5;
          background:white;
          box-shadow:0 0 0 4px rgba(79,70,229,0.08);
        }

        .form-input::placeholder{
          color:#94a3b8;
        }

        .submit-btn{
          width:100%;
          height:52px;

          border:none;
          border-radius:14px;

          background:#4f46e5;

          color:white;

          font-size:14px;
          font-weight:700;

          cursor:pointer;

          transition:0.2s ease;

          margin-top:8px;
        }

        .submit-btn:hover{
          background:#4338ca;
        }

        .submit-btn:disabled{
          opacity:0.7;
          cursor:not-allowed;
        }

        .divider{
          display:flex;
          align-items:center;
          gap:12px;

          margin:28px 0 22px;
        }

        .divider-line{
          flex:1;
          height:1px;
          background:#e2e8f0;
        }

        .divider span{
          font-size:11px;
          font-weight:700;
          color:#94a3b8;
          letter-spacing:1px;
        }

        .demo-box{
          background:#f8fafc;

          border:1px solid #e2e8f0;

          border-radius:18px;

          padding:18px;
        }

        .demo-title{
          display:flex;
          align-items:center;
          gap:8px;

          font-size:13px;
          font-weight:700;

          color:#4f46e5;

          margin-bottom:14px;
        }

        .demo-row{
          display:flex;
          align-items:center;
          gap:10px;

          margin-bottom:12px;

          flex-wrap:wrap;
        }

        .demo-row:last-child{
          margin-bottom:0;
        }

        .role-badge{
          padding:5px 10px;
          border-radius:999px;

          font-size:11px;
          font-weight:700;
        }

        .demo-cred{
          font-size:12px;
          color:#475569;
          word-break:break-word;
        }

        @media(max-width:768px){

          .login-card{
            padding:26px;
            border-radius:22px;
          }

          .title{
            font-size:24px;
          }
        }
      `}</style>

      <div className="login-page">

        {/* LEFT PANEL */}

        <div className="left-panel">

          <div className="overlay-pattern" />

          <div className="left-content">

            <div className="live-badge">
              <div className="live-dot" />
              Multi-Tenant School SaaS
            </div>

            <h1>
              Smart <span>School ERP</span><br />
              Management System
            </h1>

            <p>
              Manage students, teachers, classes, rankings,
              attendance and academic performance using a
              modern centralized dashboard platform.
            </p>

            <div className="feature-list">

              <div className="feature-card">

                <div className="feature-icon">
                  <GraduationCap size={24} />
                </div>

                <div>
                  <h4>Student Management</h4>
                  <p>
                    Track records, rankings and academic progress
                  </p>
                </div>

              </div>

              <div className="feature-card">

                <div className="feature-icon">
                  <ShieldCheck size={24} />
                </div>

                <div>
                  <h4>Secure Dashboard Access</h4>
                  <p>
                    Protected role based admin and teacher system
                  </p>
                </div>

              </div>

              <div className="feature-card">

                <div className="feature-icon">
                  <BookOpen size={24} />
                </div>

                <div>
                  <h4>Daily Test Analytics</h4>
                  <p>
                    Analyze results and monitor performance trends
                  </p>
                </div>

              </div>

            </div>

          </div>

        </div>

        {/* RIGHT PANEL */}

        <div className="right-panel">

          <div className="login-card">

            <div className="logo">

              <div className="logo-icon">
                <GraduationCap size={26} />
              </div>

              <div>
                <h2>School Portal</h2>
                <p>Academic & Result Management</p>
              </div>

            </div>

            <div className="title">
              Welcome Back 👋
            </div>

            <div className="subtitle">
              Login to continue to your dashboard
            </div>

            <form onSubmit={handleSubmit}>

              <div className="form-group">

                <label className="form-label">
                  Email Address
                </label>

                <div className="input-wrap">

                  <div className="input-icon">
                    <Mail size={16} />
                  </div>

                  <input
                    type="email"
                    className="form-input"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />

                </div>

              </div>

              <div className="form-group">

                <label className="form-label">
                  Password
                </label>

                <div className="input-wrap">

                  <div className="input-icon">
                    <Lock size={16} />
                  </div>

                  <input
                    type="password"
                    className="form-input"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />

                </div>

              </div>

              <button
                type="submit"
                className="submit-btn"
                disabled={loading}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>

            </form>

            <div className="divider">
              <div className="divider-line" />
              <span>DEMO ACCOUNTS</span>
              <div className="divider-line" />
            </div>

            <div className="demo-box">

              <div className="demo-title">
                <ShieldCheck size={15} />
                Demo Credentials
              </div>

              <div className="demo-row">
                <span className="role-badge" style={{ background:'#fef3c7', color:'#b45309' }}>Super</span>
                <span className="demo-cred">super@school.com / super123</span>
              </div>
              <div className="demo-row">
                <span className="role-badge" style={{ background:'#eef2ff', color:'#4f46e5' }}>Admin</span>
                <span className="demo-cred">admin@school.com / admin123</span>
              </div>
              <div className="demo-row">
                <span className="role-badge" style={{ background:'#ecfdf5', color:'#10b981' }}>Teacher</span>
                <span className="demo-cred">teacher@school.com / teacher123</span>
              </div>

            </div>

          </div>

        </div>

      </div>
    </>
  );
}