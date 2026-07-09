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
    <div className="rounded-xl border border-slate-100 bg-white/95 backdrop-blur-sm px-3 py-2.5 shadow-xl">
      <div className="mb-1.5 text-xs font-bold text-slate-800 border-b border-slate-100 pb-1">{data.name}</div>
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">👨‍🎓</span> 
        Students: <span className="font-bold text-slate-900">{data.studentCount}</span>
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

  // FIX: Added null/undefined safeguards to prevent localeCompare or match crashes
  const classStrengthData = (data.classPerformance || [])
    .map((cp) => ({
      name: `${cp.className || ''}-${cp.section || ''}`,
      value: cp.studentCount || 0,
      studentCount: cp.studentCount || 0,
      classId: cp.classId,
      className: cp.className,
      section: cp.section,
    }))
    .sort((a, b) => {
      const extractClassNumber = (name) => {
        if (!name) return 0;
        const match = String(name).match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      };
      
      const classNumA = extractClassNumber(a.className);
      const classNumB = extractClassNumber(b.className);
      
      if (classNumA !== classNumB) {
        return classNumA - classNumB;
      }
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
    <PageStack className="gap-5 bg-slate-50/30 min-h-screen">
      <PageHeader
        title="Admin Dashboard"
        description="Overview of your school's teachers, students, classes, and recent activity."
      />

      {hasPendingVerification && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-200/60 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3.5 shadow-sm">
          <div className="absolute -right-4 -top-4 opacity-10">
            <Clock className="h-24 w-24 text-amber-500" />
          </div>
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-amber-100 p-1.5 text-amber-600">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-amber-900 tracking-tight">Subscription Status: Pending Verification</p>
                <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-amber-700/90 sm:max-w-md">
                  Your payment request is received and under review. Access will be updated within 12 hours.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/plans')}
              className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl bg-amber-600 px-4 py-2 text-[12px] font-bold text-white shadow-sm hover:bg-amber-700 transition-colors shrink-0"
            >
              View Plans
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <StatsCard key={s.title} title={s.title} value={s.value} themeIndex={s.themeIndex} />
        ))}
      </div>

      <ErpSection title="Class Strength Overview" icon={GraduationCap} tone="indigo">
        {classStrengthData.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <BarChart3 className="h-6 w-6" />
            </div>
            <p className="text-[13px] font-medium text-slate-500 mt-1">No class data available yet</p>
          </div>
        ) : (
          <div className="mt-2 w-full">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={classStrengthData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }} 
                  axisLine={false} 
                  tickLine={false}
                  dy={5} 
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
                  radius={[6, 6, 0, 0]} 
                  maxBarSize={42} 
                  className="cursor-pointer transition-opacity hover:opacity-80"
                  onClick={(data) => handleClassClick(data)}
                >
                  {classStrengthData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ErpSection>

      <ErpSection title="Recent Activities" icon={Activity} tone="emerald">
        {(data.recentActivities || []).length === 0 ? (
          <div className="py-6 text-center text-[13px] font-medium text-slate-500">
            No recent activities found.
          </div>
        ) : (
          <div className="relative ml-2 py-2 pl-4 md:pl-5 border-l-2 border-slate-100 dark:border-slate-800 space-y-5">
            {data.recentActivities.map((a) => (
              <div className="relative group" key={a._id}>
                <div className="absolute -left-[21px] md:-left-[25px] top-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-white transition-transform group-hover:scale-125 dark:ring-slate-900" />
                
                <div className="flex flex-col gap-1">
                  <p className="text-[13px] md:text-sm font-semibold text-slate-800 leading-tight">
                    {a.action}
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[10px] md:text-[11px] font-medium">
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-600">
                      by {a.actor?.name || 'Unknown'}
                    </span>
                    <span className="hidden sm:inline text-slate-300">•</span>
                    <span className="inline-flex items-center text-slate-500">
                      {formatDisplayDate(a.createdAt)}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="inline-flex items-center text-slate-500">
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