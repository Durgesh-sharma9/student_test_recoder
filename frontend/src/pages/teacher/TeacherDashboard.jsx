import { useEffect, useState } from 'react';
import api from '@/lib/api';
import StatsCard from '@/components/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function TeacherDashboard() {
  const [data, setData] = useState({ stats: {}, recentActivities: [], weakStudents: [], assignmentDetails: [] });
  useEffect(() => { api.get('/results/dashboard').then((r) => setData(r.data)); }, []);
  const s = data.stats || {};
  const assignments = data.assignmentDetails || [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Teacher Dashboard</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard title="Assigned Classes" value={s.assignedClasses || 0} />
        <StatsCard title="Assigned Subjects" value={s.assignedSubjects || 0} />
        <StatsCard title="Total Students" value={s.students || 0} />
        <StatsCard title="Tests Conducted" value={s.testsConducted || 0} />
        <StatsCard title="Pending Entries" value={s.pendingEntries || 0} />
      </div>

      <Card>
        <CardHeader><CardTitle>Assigned Subjects</CardTitle></CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No subjects assigned yet. Ask your School Admin to assign classes and subjects.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {assignments.map((a, i) => (
                <Badge key={`${a.classId}-${a.subject}-${i}`} variant="secondary" className="text-sm py-1">
                  {a.className}-{a.section} · {a.subject}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Recent Activities</CardTitle></CardHeader>
          <CardContent>
            {(data.recentActivities || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activities.</p>
            ) : (
              data.recentActivities.map((a) => (
                <p key={a._id} className="text-sm border-b py-1">{a.action}</p>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Weak Students</CardTitle></CardHeader>
          <CardContent>
            {(data.weakStudents || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No weak students flagged yet.</p>
            ) : (
              data.weakStudents.map((w, i) => (
                <p key={i} className="text-sm">{w.student?.name} - {w.percentage}%</p>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
