import { useEffect, useState } from 'react';
import { Building2, School, CreditCard, IndianRupee, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import StatsCard from '@/components/StatsCard';
import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

export default function SuperDashboard() {
  const [data, setData] = useState({ stats: {}, recentRegistrations: [] });

  useEffect(() => {
    api.get('/super-admin/dashboard').then((r) => setData(r.data));
  }, []);

  const s = data.stats || {};
  const sub = data.subscription || {};
  const revenue = sub.revenue || {};
  const reqs = sub.requests || {};
  const charts = sub.charts || {};
  const dist = sub.distributions || {};

  const planPie = [
    { name: 'Basic', value: dist.plan?.basic || 0 },
    { name: 'Standard', value: dist.plan?.standard || 0 },
    { name: 'Premium', value: dist.plan?.premium || 0 },
    { name: 'Trial', value: dist.plan?.trial || 0 },
  ];
  const cyclePie = [
    { name: 'Monthly', value: dist.billingCycle?.monthly || 0 },
    { name: 'Quarterly', value: dist.billingCycle?.quarterly || 0 },
    { name: 'Half Year', value: dist.billingCycle?.half_yearly || 0 },
    { name: 'Yearly', value: dist.billingCycle?.yearly || 0 },
  ];

  const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899'];

  return (
    <PageStack>
      <PageHeader
        title="Super Admin Dashboard"
        description="Platform-wide overview of schools, users, and recent registrations."
      >
        <Button variant="outline" asChild>
          <Link to="/super-admin/schools">
            <School className="mr-2 h-4 w-4" />
            Manage Schools
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/super-admin/plans">
            <CreditCard className="mr-2 h-4 w-4" />
            Plans
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Schools" value={s.totalSchools || 0} />
        <StatsCard title="Active Schools" value={s.activeSchools || 0} />
        <StatsCard title="Inactive Schools" value={s.inactiveSchools || 0} />
        <StatsCard title="Expired Schools" value={s.expiredSchools || 0} />
        <StatsCard title="Teachers" value={s.teachers || 0} />
        <StatsCard title="Students" value={s.students || 0} />
        <StatsCard title="Classes" value={s.classes || 0} />
      </div>

      <ErpSection title="Subscription Analytics" icon={IndianRupee} tone="purple">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard title="Today's Revenue" value={`₹${Number(revenue.today || 0).toFixed(2)}`} icon={IndianRupee} themeIndex={0} />
          <StatsCard title="Monthly Revenue" value={`₹${Number(revenue.month || 0).toFixed(2)}`} icon={IndianRupee} themeIndex={1} />
          <StatsCard title="Yearly Revenue" value={`₹${Number(revenue.year || 0).toFixed(2)}`} icon={IndianRupee} themeIndex={2} />
          <StatsCard title="Total Revenue" value={`₹${Number(revenue.total || 0).toFixed(2)}`} icon={IndianRupee} themeIndex={3} />
          <StatsCard title="Pending Requests" value={reqs.pending || 0} icon={Clock} themeIndex={4} />
          <StatsCard title="Approved Requests" value={reqs.approved || 0} icon={CheckCircle2} themeIndex={2} />
          <StatsCard title="Rejected Requests" value={reqs.rejected || 0} icon={XCircle} themeIndex={3} />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Monthly Revenue Trend</p>
            <div className="mt-3 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts.monthlyRevenueTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Plan Distribution</p>
            <div className="mt-3 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={planPie} dataKey="value" nameKey="name" outerRadius={80} label>
                    {planPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Billing Cycle Distribution</p>
            <div className="mt-3 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={cyclePie} dataKey="value" nameKey="name" outerRadius={80} label>
                    {cyclePie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </ErpSection>

      <ErpSection title="Recent Registrations" icon={Building2} tone="green">
        {(data.recentRegistrations || []).length === 0 ? (
          <p className="text-sm text-slate-500">No recent registrations.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {(data.recentRegistrations || []).map((school) => (
              <Link
                key={school._id}
                to={`/super-admin/schools/${school._id}`}
                className="block rounded-lg px-1 py-3 transition-colors hover:bg-slate-50 first:pt-0 last:pb-0"
              >
                <p className="font-medium text-slate-800">{school.schoolName}</p>
                <p className="text-sm text-slate-500">
                  {school.adminName} · {school.email}
                </p>
              </Link>
            ))}
          </div>
        )}
      </ErpSection>
    </PageStack>
  );
}
