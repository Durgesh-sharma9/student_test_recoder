import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
// FIX: Added BarChart3 to the imports
import { Activity, GraduationCap, AlertCircle, Clock, BarChart3 } from 'lucide-react';

import api from '@/lib/api';
import { useSubscription } from '@/context/SubscriptionContext';
import { formatDisplayDate } from '@/lib/dateFormatter';
import StatsCard from '@/components/StatsCard';
import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';
import SubscriptionExpiredDialog from '@/components/subscription/SubscriptionExpiredDialog';

const BAR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899'];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-100 bg-white/95 backdrop-blur-sm px-3 py-2 shadow-xl">
      <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-sm font-black text-indigo-600">{payload[0]?.value}%</div>
    </div>
  );
}

function ClassStrengthTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-xl border border-slate-100 bg-white/95 backdrop-blur-sm px-3.5 py-2.5 shadow-xl">
      <div className="mb-1.5 text-xs font-bold text-slate-800 border-b border-slate-100 pb-1">
        {data.shortName || data.name}
      </div>
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">👨‍🎓</span> 
        Total Students: <span className="font-bold text-slate-900">{data.studentCount}</span>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { hasPendingVerification, isSubscriptionExpired } = useSubscription();

  const [data, setData] = useState({ stats: {}, recentActivities: [], classPerformance: [] });
  const [expiredDialogOpen, setExpiredDialogOpen] = useState(false);

  useEffect(() => {
    if (isSubscriptionExpired) {
      setExpiredDialogOpen(true);
    }
  }, [isSubscriptionExpired]);

  useEffect(() => {
    api.get('/results/dashboard').then((r) => setData(r.data));
  }, []);

  const chartData = [
    { name: 'Teachers', value: data.stats?.teachers || 0 },
    { name: 'Students', value: data.stats?.students || 0 },
    { name: 'Classes',  value: data.stats?.classes  || 0 },
    { name: 'Sessions', value: data.stats?.sessions || 0 },
  ];

  const getSortOrder = (className) => {
    const clean = String(className || '').toUpperCase().trim();
    if (clean.includes('KINDERGARTEN-I') || clean.includes('KINDERGARTEN 1') || clean.includes('KG-I') || clean.includes('KG 1')) return 1;
    if (clean.includes('KINDERGARTEN-II') || clean.includes('KINDERGARTEN 2') || clean.includes('KG-II') || clean.includes('KG 2')) return 2;
    if (clean.includes('PRE PRIMARY 3') || clean.includes('PP.3') || clean.includes('PP 3') || clean.includes('PP-3') || clean === 'NURSERY') return 3;
    if (clean.includes('PRE PRIMARY 4') || clean.includes('PP.4') || clean.includes('PP 4') || clean.includes('PP-4') || clean === 'LKG') return 4;
    if (clean.includes('PRE PRIMARY 5') || clean.includes('PP.5') || clean.includes('PP 5') || clean.includes('PP-5') || clean === 'UKG' || clean === 'PREP') return 5;
    
    // Numerical classes 1 to 12
    const numMatch = clean.match(/\b(1[0-2]|[1-9])\b/);
    if (numMatch) {
      return 10 + parseInt(numMatch[1], 10);
    }
    return 99;
  };

  const formatShortClassName = (className, section) => {
    const c = String(className || '').toUpperCase().trim();
    const s = String(section || '').toUpperCase().trim();
    
    if (/^(1[0-2]|[1-9])$/.test(c)) {
      return `Class ${c}${s}`;
    }
    if (c.startsWith('CLASS ')) {
      const num = c.replace('CLASS ', '').trim();
      return `Class ${num}${s}`;
    }
    if (c.includes('KINDERGARTEN-II') || c.includes('KINDERGARTEN 2')) {
      return `KG-II${s ? ` (${s})` : ''}`;
    }
    if (c.includes('KINDERGARTEN-I') || c.includes('KINDERGARTEN 1')) {
      return `KG-I${s ? ` (${s})` : ''}`;
    }
    if (c.includes('PRE PRIMARY 3') || c.includes('PP.3') || c.includes('PP 3') || c.includes('PP-3')) {
      return `PP 3+${s ? ` (${s})` : ''}`;
    }
    if (c.includes('PRE PRIMARY 4') || c.includes('PP.4') || c.includes('PP 4') || c.includes('PP-4')) {
      return `PP 4+${s ? ` (${s})` : ''}`;
    }
    if (c.includes('PRE PRIMARY 5') || c.includes('PP.5') || c.includes('PP 5') || c.includes('PP-5')) {
      return `PP 5+${s ? ` (${s})` : ''}`;
    }
    if (c === 'NURSERY') return `Nur${s ? ` (${s})` : ''}`;
    if (c === 'LKG') return `LKG${s ? ` (${s})` : ''}`;
    if (c === 'UKG') return `UKG${s ? ` (${s})` : ''}`;
    
    return `${c}${s ? ` ${s}` : ''}`;
  };

  const classStrengthData = (data.classPerformance || [])
    .map((cp) => ({
      name: `${cp.className || ''}-${cp.section || ''}`,
      shortName: formatShortClassName(cp.className, cp.section),
      value: cp.studentCount || 0,
      studentCount: cp.studentCount || 0,
      classId: cp.classId,
      className: cp.className,
      section: cp.section,
    }))
    .sort((a, b) => {
      const orderA = getSortOrder(a.className);
      const orderB = getSortOrder(b.className);
      if (orderA !== orderB) return orderA - orderB;
      return String(a.section || '').localeCompare(String(b.section || ''));
    });

  const handleClassClick = (barData) => {
    if (barData && barData.classId) {
      navigate(`/students?class=${barData.classId}`);
    }
  };

  const stats = [
    { title: 'Total Teachers',        value: data.stats?.teachers || 0, themeIndex: 0 },
    { title: 'Total Students',        value: data.stats?.students || 0, themeIndex: 1 },
    { title: 'Total Classes',         value: data.stats?.classes  || 0, themeIndex: 2 },
    { title: 'Total Result Sessions', value: data.stats?.sessions || 0, themeIndex: 3 },
  ];

  return (
    <PageStack className="gap-3 sm:gap-5 bg-slate-50/30 min-h-screen">
      <PageHeader
        title="Admin Dashboard"
        description="Overview of your school's teachers, students, classes, and recent activity."
      />

      {hasPendingVerification && (
        <div className="relative overflow-hidden rounded-xl border border-amber-200/60 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-2.5 sm:px-4 sm:py-3.5 shadow-xs">
          <div className="absolute -right-4 -top-4 opacity-10">
            <Clock className="h-20 w-20 sm:h-24 sm:w-24 text-amber-500" />
          </div>
          <div className="relative flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 rounded-full bg-amber-100 p-1 text-amber-600">
                <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              <div>
                <p className="text-xs sm:text-[13px] font-bold text-amber-900 tracking-tight">Subscription Status: Pending Verification</p>
                <p className="mt-0.5 text-[10.5px] sm:text-[11px] font-medium leading-relaxed text-amber-700/90 sm:max-w-md">
                  Your payment request is received and under review. Access will be updated within 12 hours.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/plans')}
              className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-amber-600 px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition-colors shrink-0 cursor-pointer"
            >
              View Plans
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <StatsCard key={s.title} title={s.title} value={s.value} themeIndex={s.themeIndex} />
        ))}
      </div>

      <ErpSection title="Class Strength Overview" icon={GraduationCap} tone="indigo">
        {classStrengthData.length === 0 ? (
          <div className="flex min-h-[160px] sm:min-h-[220px] flex-col items-center justify-center gap-2 text-center">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <p className="text-xs sm:text-[13px] font-medium text-slate-500 mt-1">No class data available yet</p>
          </div>
        ) : (
          <div className="mt-1 sm:mt-2 w-full overflow-x-auto pb-2 scrollbar-thin">
            <div style={{ minWidth: `${Math.max(900, classStrengthData.length * 52)}px`, height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classStrengthData} margin={{ top: 15, right: 15, left: -15, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="shortName" 
                    interval={0}
                    angle={-40}
                    textAnchor="end"
                    tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} 
                    axisLine={{ stroke: '#e2e8f0' }} 
                    tickLine={false}
                    height={55}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }} 
                    axisLine={false} 
                    tickLine={false} 
                    dx={-5}
                  />
                  <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.04)' }} content={<ClassStrengthTooltip />} />
                  <Bar 
                    dataKey="value" 
                    radius={[5, 5, 0, 0]} 
                    maxBarSize={30} 
                    className="cursor-pointer transition-opacity hover:opacity-80"
                    onClick={(data) => handleClassClick(data)}
                  >
                    {classStrengthData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </ErpSection>

      <ErpSection title="Recent Activities" icon={Activity} tone="emerald">
        {(data.recentActivities || []).length === 0 ? (
          <div className="py-4 sm:py-6 text-center text-xs sm:text-[13px] font-medium text-slate-500">
            No recent activities found.
          </div>
        ) : (
          <div className="relative ml-2 py-1 pl-3.5 md:pl-5 border-l-2 border-slate-100 dark:border-slate-800 space-y-3 sm:space-y-5">
            {data.recentActivities.map((a) => (
              <div className="relative group" key={a._id}>
                <div className="absolute -left-[19px] md:-left-[25px] top-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-white transition-transform group-hover:scale-125 dark:ring-slate-900" />
                
                <div className="flex flex-col gap-0.5 sm:gap-1">
                  <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-tight">
                    {a.action}
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5 text-[10px] sm:text-[11px] font-medium text-slate-500">
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-600 font-semibold">
                      by {a.actor?.name || 'Unknown'}
                    </span>
                    <span className="hidden sm:inline text-slate-300">•</span>
                    <span className="inline-flex items-center">
                      {formatDisplayDate(a.createdAt)}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="inline-flex items-center">
                      {new Date(a.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ErpSection>

      <SubscriptionExpiredDialog
        open={expiredDialogOpen}
        onOpenChange={setExpiredDialogOpen}
      />
    </PageStack>
  );
}