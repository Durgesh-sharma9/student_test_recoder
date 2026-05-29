import { useEffect, useState } from 'react';
import api from '@/lib/api';
import StatsCard from '@/components/StatsCard';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SuperDashboard() {
  const [data, setData] = useState({ stats: {}, recentRegistrations: [] });

  useEffect(() => {
    api.get('/super-admin/dashboard').then((r) => setData(r.data));
  }, []);

  const s = data.stats || {};

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-2">
        <h1 className="text-2xl font-semibold">Super Admin Dashboard</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link to="/super-admin/schools">Manage Schools</Link></Button>
          <Button variant="outline" asChild><Link to="/super-admin/plans">Plans</Link></Button>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Schools" value={s.totalSchools || 0} />
        <StatsCard title="Active Schools" value={s.activeSchools || 0} />
        <StatsCard title="Inactive Schools" value={s.inactiveSchools || 0} />
        <StatsCard title="Expired Schools" value={s.expiredSchools || 0} />
        <StatsCard title="Teachers" value={s.teachers || 0} />
        <StatsCard title="Students" value={s.students || 0} />
        <StatsCard title="Classes" value={s.classes || 0} />
      </div>
      <Card>
        <CardHeader><CardTitle>Recent Registrations</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(data.recentRegistrations || []).map((school) => (
            <Link key={school._id} to={`/super-admin/schools/${school._id}`} className="block text-sm border-b pb-2 hover:bg-slate-50 rounded px-1">
              <p className="font-medium">{school.schoolName}</p>
              <p className="text-muted-foreground">{school.adminName} · {school.email}</p>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
