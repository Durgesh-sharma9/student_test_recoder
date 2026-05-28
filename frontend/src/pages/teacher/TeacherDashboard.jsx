import { useEffect, useState } from 'react';
import api from '@/lib/api';
import StatsCard from '@/components/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TeacherDashboard() {
  const [data, setData] = useState({ assignedClasses: [], sessions: [], topper: null, weakStudents: [] });
  useEffect(() => { api.get('/results/dashboard').then((r) => setData(r.data)); }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Teacher Dashboard</h1>
      <div className="grid sm:grid-cols-3 gap-4">
        <StatsCard title="Assigned Classes" value={data.assignedClasses?.length || 0} />
        <StatsCard title="Recent Sessions" value={data.sessions?.length || 0} />
        <StatsCard title="Weak Students" value={data.weakStudents?.length || 0} />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle>Topper Student</CardTitle></CardHeader><CardContent>{data.topper ? <p>{data.topper.student?.name} - {data.topper.percentage}%</p> : <p className="text-muted-foreground">No result data yet.</p>}</CardContent></Card>
        <Card><CardHeader><CardTitle>Weak Students</CardTitle></CardHeader><CardContent>{(data.weakStudents || []).map((w, i) => <p key={i} className="text-sm">{w.student?.name} - {w.percentage}%</p>)}</CardContent></Card>
      </div>
    </div>
  );
}
