import { TrendingUp } from 'lucide-react';

/* =========================
   LIGHT ERP CARD THEMES
========================= */

const CARD_THEMES = [
  {
    bg: '#eef2ff',
    iconBg: '#c7d2fe',
    iconColor: '#4f46e5',
    shadow: 'rgba(79,70,229,0.08)',
    text: '#4f46e5',
  },

  {
    bg: '#e0f2fe',
    iconBg: '#bae6fd',
    iconColor: '#0284c7',
    shadow: 'rgba(2,132,199,0.08)',
    text: '#0284c7',
  },

  {
    bg: '#ecfdf5',
    iconBg: '#bbf7d0',
    iconColor: '#059669',
    shadow: 'rgba(5,150,105,0.08)',
    text: '#059669',
  },

  {
    bg: '#fff7ed',
    iconBg: '#fed7aa',
    iconColor: '#ea580c',
    shadow: 'rgba(234,88,12,0.08)',
    text: '#ea580c',
  },

  {
    bg: '#fdf2f8',
    iconBg: '#fbcfe8',
    iconColor: '#db2777',
    shadow: 'rgba(219,39,119,0.08)',
    text: '#db2777',
  },
];

let cardCounter = 0;

export default function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  themeIndex,
}) {

  const theme =
    CARD_THEMES[
      (themeIndex ?? cardCounter++) % CARD_THEMES.length
    ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        *{
          box-sizing:border-box;
        }

        .stats-card{
          position:relative;

          border-radius:24px;

          padding:22px;

          overflow:hidden;

          transition:0.2s ease;

          font-family:'Inter',sans-serif;

          border:1px solid rgba(255,255,255,0.5);
        }

        .stats-card:hover{
          transform:translateY(-3px);

          box-shadow:
            0 12px 30px rgba(15,23,42,0.06);
        }

        .stats-card-top{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;

          margin-bottom:18px;
        }

        .stats-card-title{
          font-size:12px;
          font-weight:700;

          letter-spacing:0.6px;

          text-transform:uppercase;

          opacity:0.8;
        }

        .stats-card-icon-wrap{
          width:44px;
          height:44px;

          border-radius:14px;

          display:flex;
          align-items:center;
          justify-content:center;

          flex-shrink:0;
        }

        .stats-card-value{
          font-size:38px;
          font-weight:800;

          line-height:1;

          letter-spacing:-1.5px;

          margin-bottom:12px;
        }

        .stats-card-desc{
          display:flex;
          align-items:center;
          gap:6px;

          font-size:12px;
          font-weight:600;
        }

        .stats-card-trend{
          display:flex;
          align-items:center;
          gap:4px;

          padding:5px 10px;

          border-radius:999px;

          background:rgba(255,255,255,0.7);

          backdrop-filter:blur(8px);
        }

        .stats-card-glow{
          position:absolute;

          width:120px;
          height:120px;

          border-radius:50%;

          top:-40px;
          right:-30px;

          opacity:0.18;

          pointer-events:none;
        }

        @media(max-width:768px){

          .stats-card{
            padding:18px;
            border-radius:20px;
          }

          .stats-card-value{
            font-size:30px;
          }

          .stats-card-icon-wrap{
            width:40px;
            height:40px;
          }
        }
      `}</style>

      <div
        className="stats-card"
        style={{
          background: theme.bg,
          boxShadow: `0 6px 20px ${theme.shadow}`,
        }}
      >

        {/* Glow */}

        <div
          className="stats-card-glow"
          style={{
            background: theme.iconBg,
          }}
        />

        {/* TOP */}

        <div className="stats-card-top">

          <span
            className="stats-card-title"
            style={{
              color: theme.text,
            }}
          >
            {title}
          </span>

          {Icon && (

            <div
              className="stats-card-icon-wrap"
              style={{
                background: theme.iconBg,
              }}
            >

              <Icon
                size={20}
                color={theme.iconColor}
              />

            </div>

          )}

        </div>

        {/* VALUE */}

        <div
          className="stats-card-value"
          style={{
            color: '#0f172a',
          }}
        >
          {value}
        </div>

        {/* DESCRIPTION */}

        {description && (

          <div
            className="stats-card-desc"
            style={{
              color: theme.text,
            }}
          >

            <div className="stats-card-trend">

              <TrendingUp size={12} />

              {description}

            </div>

          </div>

        )}

      </div>
    </>
  );
}