import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '@/lib/api';
import StatsCard from '@/components/StatsCard';

const BAR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899'];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff', border: '1px solid #e0e7ff',
      borderRadius: 10, padding: '10px 14px',
      boxShadow: '0 4px 16px rgba(99,102,241,0.15)',
      fontFamily: 'Outfit, sans-serif',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#1e1b4b' }}>{payload[0]?.value}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState({ stats: {}, recentActivities: [], topper: null });

  useEffect(() => {
    api.get('/results/dashboard').then((r) => setData(r.data));
  }, []);

  const chartData = [
    { name: 'Teachers', value: data.stats?.teachers || 0 },
    { name: 'Students', value: data.stats?.students || 0 },
    { name: 'Classes',  value: data.stats?.classes  || 0 },
    { name: 'Sessions', value: data.stats?.sessions || 0 },
  ];

  const stats = [
    { title: 'Total Teachers',        value: data.stats?.teachers || 0, themeIndex: 0 },
    { title: 'Total Students',        value: data.stats?.students || 0, themeIndex: 1 },
    { title: 'Total Classes',         value: data.stats?.classes  || 0, themeIndex: 2 },
    { title: 'Total Result Sessions', value: data.stats?.sessions || 0, themeIndex: 3 },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Outfit:wght@400;500;600&display=swap');
        .adash { font-family: 'Outfit', sans-serif; }
        .adash-title {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 24px; font-weight: 800;
          color: #1e1b4b; letter-spacing: -0.5px;
          margin-bottom: 24px;
        }
        .adash-grid4 { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .adash-grid2 { display: grid; grid-template-columns: 1fr; gap: 16px; margin-bottom: 24px; }
        @media (min-width: 1024px) { .adash-grid2 { grid-template-columns: 1fr 1fr; } }

        .dash-panel {
          background: #fff; border-radius: 18px;
          box-shadow: 0 4px 24px rgba(30,27,75,0.07);
          border: 1px solid rgba(99,102,241,0.08);
          overflow: hidden;
          transition: box-shadow 0.2s;
        }
        .dash-panel:hover { box-shadow: 0 8px 36px rgba(30,27,75,0.12); }

        .dash-panel-header {
          padding: 18px 22px 14px;
          border-bottom: 1px solid #f1f5f9;
          display: flex; align-items: center; gap: 10px;
        }
        .dash-panel-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .dash-panel-title {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 14px; font-weight: 700; color: #1e1b4b;
        }
        .dash-panel-body { padding: 20px 20px 16px; }

        .topper-card {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 12px;
          min-height: 200px; text-align: center;
        }
        .topper-avatar {
          width: 64px; height: 64px; border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 22px; font-weight: 800; color: #fff;
          box-shadow: 0 6px 20px rgba(99,102,241,0.35);
        }
        .topper-name {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 18px; font-weight: 700; color: #1e1b4b;
        }
        .topper-roll { font-size: 12px; color: #94a3b8; }
        .topper-pct {
          padding: 6px 18px; border-radius: 20px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff; font-size: 15px; font-weight: 700;
          box-shadow: 0 3px 10px rgba(99,102,241,0.3);
        }
        .topper-empty { color: #94a3b8; font-size: 14px; }

        .activity-row {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 0; border-bottom: 1px solid #f8faff;
          transition: background 0.15s;
        }
        .activity-row:last-child { border-bottom: none; }
        .activity-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: linear-gradient(135deg,#6366f1,#8b5cf6);
          flex-shrink: 0;
        }
        .activity-text { font-size: 13px; color: #475569; }
        .activity-actor { font-weight: 600; color: #1e1b4b; }
        .activity-empty { font-size: 13px; color: #94a3b8; padding: 16px 0; }
      `}</style>

      <div className="adash">
        <div className="adash-title">Admin Dashboard</div>

        {/* Stats */}
        <div className="adash-grid4">
          {stats.map((s) => (
            <StatsCard key={s.title} title={s.title} value={s.value} themeIndex={s.themeIndex} />
          ))}
        </div>

        {/* Chart + Topper */}
        <div className="adash-grid2">
          <div className="dash-panel">
            <div className="dash-panel-header">
              <div className="dash-panel-dot" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }} />
              <span className="dash-panel-title">Performance Snapshot</span>
            </div>
            <div className="dash-panel-body">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 6, right: 6, left: -16, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'Outfit' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'Outfit' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={56}>
                    {chartData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="dash-panel">
            <div className="dash-panel-header">
              <div className="dash-panel-dot" style={{ background: 'linear-gradient(135deg,#f59e0b,#ef4444)' }} />
              <span className="dash-panel-title">🏆 Topper Student</span>
            </div>
            <div className="dash-panel-body">
              {data.topper ? (
                <div className="topper-card">
                  <div className="topper-avatar">
                    {data.topper.student?.name?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <div className="topper-name">{data.topper.student?.name}</div>
                    <div className="topper-roll">Roll No: {data.topper.student?.rollNo}</div>
                  </div>
                  <div className="topper-pct">{data.topper.percentage}%</div>
                </div>
              ) : (
                <div className="topper-card">
                  <div style={{ fontSize: 40 }}>📊</div>
                  <div className="topper-empty">No result data yet</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="dash-panel">
          <div className="dash-panel-header">
            <div className="dash-panel-dot" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }} />
            <span className="dash-panel-title">Recent Activities</span>
          </div>
          <div className="dash-panel-body">
            {(data.recentActivities || []).length === 0 ? (
              <div className="activity-empty">No recent activities.</div>
            ) : (
              data.recentActivities.map((a) => (
                <div className="activity-row" key={a._id}>
                  <div className="activity-dot" />
                  <div className="activity-text">
                    {a.action} by <span className="activity-actor">{a.actor?.name}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}