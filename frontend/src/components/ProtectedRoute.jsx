import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { GraduationCap } from 'lucide-react';

export default function ProtectedRoute({ children, roles }) {

  const { user, loading } = useAuth();

  if (loading) {

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
          }

          .loading-screen{
            min-height:100vh;

            display:flex;
            align-items:center;
            justify-content:center;

            background:#f8fafc;

            position:relative;
            overflow:hidden;
          }

          /* =========================
             BACKGROUND
          ========================= */

          .bg-circle{
            position:absolute;
            border-radius:50%;
            filter:blur(10px);
          }

          .bg-circle-1{
            width:320px;
            height:320px;

            background:#eef2ff;

            top:-100px;
            left:-100px;
          }

          .bg-circle-2{
            width:260px;
            height:260px;

            background:#ede9fe;

            bottom:-100px;
            right:-80px;
          }

          .bg-circle-3{
            width:180px;
            height:180px;

            background:#dbeafe;

            top:40%;
            right:18%;
          }

          .grid-pattern{
            position:absolute;
            inset:0;

            background-image:
              linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px);

            background-size:42px 42px;
          }

          /* =========================
             LOADER CARD
          ========================= */

          .loader-card{
            position:relative;
            z-index:10;

            width:100%;
            max-width:360px;

            background:rgba(255,255,255,0.88);

            border:1px solid #e2e8f0;

            backdrop-filter:blur(14px);

            border-radius:30px;

            padding:42px 34px;

            display:flex;
            flex-direction:column;
            align-items:center;

            box-shadow:
              0 10px 40px rgba(15,23,42,0.06),
              0 2px 8px rgba(15,23,42,0.04);
          }

          .logo-box{
            width:76px;
            height:76px;

            border-radius:24px;

            background:#4f46e5;

            display:flex;
            align-items:center;
            justify-content:center;

            color:white;

            box-shadow:
              0 10px 30px rgba(79,70,229,0.25);

            margin-bottom:24px;
          }

          .title{
            font-size:22px;
            font-weight:800;

            color:#0f172a;

            letter-spacing:-0.7px;

            margin-bottom:6px;

            text-align:center;
          }

          .subtitle{
            font-size:13px;

            color:#64748b;

            margin-bottom:30px;

            text-align:center;
          }

          /* =========================
             SPINNER
          ========================= */

          .spinner-wrap{
            position:relative;

            width:60px;
            height:60px;

            margin-bottom:22px;
          }

          .spinner-track{
            position:absolute;
            inset:0;

            border-radius:50%;

            border:4px solid #e2e8f0;
          }

          .spinner{
            position:absolute;
            inset:0;

            border-radius:50%;

            border:4px solid transparent;

            border-top-color:#4f46e5;
            border-right-color:#8b5cf6;

            animation:spin 0.9s linear infinite;
          }

          .loading-text{
            font-size:14px;
            font-weight:600;

            color:#475569;

            margin-bottom:16px;
          }

          .dots{
            display:flex;
            align-items:center;
            gap:7px;
          }

          .dot{
            width:8px;
            height:8px;

            border-radius:50%;

            background:#c7d2fe;

            animation:pulse 1.2s ease-in-out infinite;
          }

          .dot:nth-child(2){
            animation-delay:0.2s;
          }

          .dot:nth-child(3){
            animation-delay:0.4s;
          }

          /* =========================
             ANIMATION
          ========================= */

          @keyframes spin{
            to{
              transform:rotate(360deg);
            }
          }

          @keyframes pulse{
            0%,100%{
              opacity:0.4;
              transform:scale(0.9);
            }

            50%{
              opacity:1;
              transform:scale(1.2);
            }
          }

          @media(max-width:768px){

            .loader-card{
              margin:20px;
              padding:34px 24px;
              border-radius:24px;
            }

            .title{
              font-size:20px;
            }
          }
        `}</style>

        <div className="loading-screen">

          {/* BACKGROUND */}

          <div className="bg-circle bg-circle-1" />
          <div className="bg-circle bg-circle-2" />
          <div className="bg-circle bg-circle-3" />

          <div className="grid-pattern" />

          {/* CARD */}

          <div className="loader-card">

            <div className="logo-box">
              <GraduationCap size={34} />
            </div>

            <div className="title">
              School ERP System
            </div>

            <div className="subtitle">
              Academic Session 2025 - 2026
            </div>

            <div className="spinner-wrap">

              <div className="spinner-track" />

              <div className="spinner" />

            </div>

            <div className="loading-text">
              Authenticating User...
            </div>

            <div className="dots">

              <div className="dot" />
              <div className="dot" />
              <div className="dot" />

            </div>

          </div>

        </div>
      </>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  return children;
}