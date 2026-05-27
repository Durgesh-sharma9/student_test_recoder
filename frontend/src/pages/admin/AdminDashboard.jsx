import { useEffect, useState } from 'react';
import { Users, GraduationCap, School, FileText } from 'lucide-react';
import api from '@/lib/api';
import StatsCard from '@/components/StatsCard';

export default function AdminDashboard() {
  const [stats, setStats] = useState({});

  useEffect(() => {
    api.get('/tests/dashboard').then((res) => setStats(res.data.stats));
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Admin Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Teachers" value={stats.teachers ?? 0} icon={Users} />
        <StatsCard title="Parents" value={stats.parents ?? 0} icon={Users} />
        <StatsCard title="Students" value={stats.students ?? 0} icon={GraduationCap} />
        <StatsCard title="Classes" value={stats.classes ?? 0} icon={School} />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <StatsCard title="Test Records" value={stats.tests ?? 0} icon={FileText} description="Total uploaded test results" />
      </div>
    </div>
  );
}
