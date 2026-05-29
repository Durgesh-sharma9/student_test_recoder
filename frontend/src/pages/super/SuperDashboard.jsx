import { useEffect, useState } from 'react';
import { Building2, School, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import StatsCard from '@/components/StatsCard';
import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';

export default function SuperDashboard() {
  const [data, setData] = useState({ stats: {}, recentRegistrations: [] });

  useEffect(() => {
    api.get('/super-admin/dashboard').then((r) => setData(r.data));
  }, []);

  const s = data.stats || {};

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
