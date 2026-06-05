import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

import { BarChart3, Activity, GraduationCap } from 'lucide-react';

import api from '@/lib/api';

import StatsCard from '@/components/StatsCard';

import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';
import { formatClassName } from '@/lib/utils';



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

  const [data, setData] = useState({ stats: {}, recentActivities: [], classPerformance: [] });



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
      classId: cp.classId,
      className: cp.className,
      section: cp.section,
    }))
    .sort((a, b) => {
      // Extract class number from className (e.g., "10" from "Class 10")
      const extractClassNumber = (name) => {
        const match = name.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      };
      
      const classNumA = extractClassNumber(a.className);
      const classNumB = extractClassNumber(b.className);
      
      // Sort by class number first
      if (classNumA !== classNumB) {
        return classNumA - classNumB;
      }
      
      // For same class number, sort alphabetically by section
      return a.section.localeCompare(b.section);
    });



  const handleClassClick = (data) => {
    if (data && data.classId) {
      navigate(`/students?class=${data.classId}`);
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
              <Tooltip content={<ClassStrengthTooltip />} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={56} onClick={(data) => handleClassClick(data)}>
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
                <div className="ml-5 flex items-center gap-2 text-xs text-slate-500">
                  <span>by {a.actor?.name || 'Unknown'}</span>
                  <span>•</span>
                  <span>{new Date(a.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  <span>•</span>
                  <span>{new Date(a.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ErpSection>

    </PageStack>

  );

}

