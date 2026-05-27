import { useEffect, useState } from 'react';
import { School, GraduationCap, FileText } from 'lucide-react';
import api from '@/lib/api';
import StatsCard from '@/components/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TeacherDashboard() {
  const [stats, setStats] = useState({});

  useEffect(() => {
    api.get('/tests/dashboard').then((res) => setStats(res.data.stats));
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Teacher Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard title="My Classes" value={stats.classes ?? 0} icon={School} />
        <StatsCard title="Students" value={stats.students ?? 0} icon={GraduationCap} />
        <StatsCard title="Tests Uploaded" value={stats.tests ?? 0} icon={FileText} />
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Go to <strong>Upload Marks</strong> and download the Excel template for your class.</p>
          <p>2. Fill only the <strong>Marks Obt.</strong> columns — do not edit Total, Average, Percentage, or Rank.</p>
          <p>3. Upload the filled Excel file. The system calculates rankings by highest total marks.</p>
        </CardContent>
      </Card>
    </div>
  );
}
