import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Activity, GraduationCap } from 'lucide-react';

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
    <div className="rounded-lg border border-indigo-100 bg-white px-3.5 py-2.5 shadow-md">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-indigo-600">{label}</div>
      <div className="text-sm font-bold text-slate-900">{payload[0]?.value}%</div>
    </div>
  );
}

function ClassStrengthTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-lg border border-indigo-100 bg-white px-4 py-3 shadow-md">
      <div className="mb-2 text-sm font-bold text-slate-900">{data.name}</div>
      <div className="text-xs text-slate-600">
        👨‍🎓 Students: {data.studentCount}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  // Removed unused 'usage' variable
  const { hasPendingVerification, isSubscriptionExpired } = useSubscription();

  const [data, setData] = useState({ stats: {}, recentActivities: [], classPerformance: [] });
  const [expiredDialogOpen, setExpiredDialogOpen] = useState(false);

  // FIX: Automatically open the dialog if the subscription is expired
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

  // Sort classes naturally by class number (1, 2, 3, ..., 10, 11, 12)
  const classStrengthData = (data.classPerformance || [])
    .map((cp) => ({
      name: `${cp.className}-${cp.section}`,
      value: cp.studentCount,
      studentCount: cp.studentCount, // Explicitly pass for tooltip
      classId: cp.classId,
      className: cp.className,
      section: cp.section,
    }))
    .sort((a, b) => {
      const extractClassNumber = (name) => {
        const match = name.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      };
      
      const classNumA = extractClassNumber(a.className);
      const classNumB = extractClassNumber(b.className);
      
      if (classNumA !== classNumB) {
        return classNumA - classNumB;
      }
      return a.section.localeCompare(b.section);
    });

  const handleClassClick = (barData) => {
    // barData contains the payload directly when clicked in Recharts
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
    <PageStack>
      <PageHeader
        title="Admin Dashboard"
        description="Overview of your school's teachers, students, classes, and recent activity."
      />

      {hasPendingVerification && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-extrabold">Subscription Status: Pending Verification</p>
              <p className="mt-0.5 text-sm text-amber-800">
                Your payment request has been received. Our team will verify your payment. Please wait up to 12 hours.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/plans')}
              className="mt-3 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-semibold text-amber-900 shadow-sm hover:bg-amber-100 sm:mt-0 shrink-0"
            >
              View Plans
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <StatsCard key={s.title} title={s.title} value={s.value} themeIndex={s.themeIndex} />
        ))}
      </div>

      <ErpSection title="Class Strength Overview" icon={GraduationCap} tone="purple">
        {classStrengthData.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-2 text-center text-slate-500">
            <span className="text-4xl">📊</span>
            <p className="text-sm">No class data yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={classStrengthData} margin={{ top: 6, right: 6, left: -16, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'transparent' }} content={<ClassStrengthTooltip />} />
              <Bar 
                dataKey="value" 
                radius={[8, 8, 0, 0]} 
                maxBarSize={56} 
                className="cursor-pointer"
                onClick={(data) => handleClassClick(data)}
              >
                {classStrengthData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ErpSection>

      <ErpSection title="Recent Activities" icon={Activity} tone="green">
        {(data.recentActivities || []).length === 0 ? (
          <p className="text-sm text-slate-500">No recent activities.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.recentActivities.map((a) => (
              <div className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0" key={a._id}>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                  <p className="text-sm font-semibold text-slate-900">
                    {a.action}
                  </p>
                </div>
                <div className="ml-5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>by {a.actor?.name || 'Unknown'}</span>
                  <span className="hidden sm:inline">•</span>
                  <span>{formatDisplayDate(a.createdAt)}</span>
                  <span className="hidden sm:inline">•</span>
                  <span>{new Date(a.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
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