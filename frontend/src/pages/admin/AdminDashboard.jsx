import { useEffect, useState } from 'react';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

import { BarChart3, Trophy, Activity } from 'lucide-react';

import api from '@/lib/api';

import StatsCard from '@/components/StatsCard';

import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';



const BAR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899'];



function ChartTooltip({ active, payload, label }) {

  if (!active || !payload?.length) return null;

  return (

    <div className="rounded-lg border border-indigo-100 bg-white px-3.5 py-2.5 shadow-md">

      <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-indigo-600">{label}</div>

      <div className="text-sm font-bold text-slate-900">{payload[0]?.value}</div>

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



      <div className="grid gap-5 lg:grid-cols-2">

        <ErpSection title="Performance Snapshot" icon={BarChart3} tone="purple">

          <ResponsiveContainer width="100%" height={260}>

            <BarChart data={chartData} margin={{ top: 6, right: 6, left: -16, bottom: 0 }}>

              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />

              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />

              <Tooltip content={<ChartTooltip />} />

              <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={56}>

                {chartData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}

              </Bar>

            </BarChart>

          </ResponsiveContainer>

        </ErpSection>



        <ErpSection title="Topper Student" icon={Trophy} tone="yellow">

          {data.topper ? (

            <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-center">

              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-2xl font-bold text-white shadow-lg">

                {data.topper.student?.name?.charAt(0) || 'S'}

              </div>

              <div>

                <div className="text-lg font-bold text-slate-900">{data.topper.student?.name}</div>

                <div className="text-xs text-slate-500">Roll No: {data.topper.student?.rollNo}</div>

              </div>

              <div className="rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-1.5 text-sm font-bold text-white shadow">

                {data.topper.percentage}%

              </div>

            </div>

          ) : (

            <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center text-slate-500">

              <span className="text-4xl">📊</span>

              <p className="text-sm">No result data yet</p>

            </div>

          )}

        </ErpSection>

      </div>



      <ErpSection title="Recent Activities" icon={Activity} tone="green">

        {(data.recentActivities || []).length === 0 ? (

          <p className="text-sm text-slate-500">No recent activities.</p>

        ) : (

          <div className="divide-y divide-slate-100">

            {data.recentActivities.map((a) => (

              <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0" key={a._id}>

                <div className="h-2 w-2 shrink-0 rounded-full bg-indigo-500" />

                <p className="text-sm text-slate-600">

                  {a.action} by <span className="font-semibold text-slate-900">{a.actor?.name}</span>

                </p>

              </div>

            ))}

          </div>

        )}

      </ErpSection>

    </PageStack>

  );

}

