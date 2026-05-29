import { useEffect, useState } from 'react';
import { BookOpen, Activity, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import StatsCard from '@/components/StatsCard';
import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';
import { Badge } from '@/components/ui/badge';

export default function TeacherDashboard() {
  const [data, setData] = useState({ stats: {}, recentActivities: [], weakStudents: [], assignmentDetails: [] });
  useEffect(() => { api.get('/results/dashboard').then((r) => setData(r.data)); }, []);
  const s = data.stats || {};
  const assignments = data.assignmentDetails || [];

  return (
    <PageStack>
      <PageHeader
        title="Teacher Dashboard"
        description="Your assignments, students, and recent activity at a glance."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard title="Assigned Classes" value={s.assignedClasses || 0} />
        <StatsCard title="Assigned Subjects" value={s.assignedSubjects || 0} />
        <StatsCard title="Total Students" value={s.students || 0} />
        <StatsCard title="Tests Conducted" value={s.testsConducted || 0} />
        <StatsCard title="Pending Entries" value={s.pendingEntries || 0} />
      </div>

      <ErpSection title="Assigned Subjects" icon={BookOpen} tone="blue">
        {assignments.length === 0 ? (
          <p className="text-sm text-slate-500">
            No subjects assigned yet. Ask your School Admin to assign classes and subjects.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {assignments.map((a, i) => (
              <Badge key={`${a.classId}-${a.subject}-${i}`} variant="secondary" className="py-1 text-sm">
                {a.className}-{a.section} · {a.subject}
              </Badge>
            ))}
          </div>
        )}
      </ErpSection>

      <div className="grid gap-5 lg:grid-cols-2">
        <ErpSection title="Recent Activities" icon={Activity} tone="green">
          {(data.recentActivities || []).length === 0 ? (
            <p className="text-sm text-slate-500">No recent activities.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recentActivities.map((a) => (
                <p key={a._id} className="py-2 text-sm text-slate-600 first:pt-0 last:pb-0">
                  {a.action}
                </p>
              ))}
            </div>
          )}
        </ErpSection>

        <ErpSection title="Weak Students" icon={AlertTriangle} tone="yellow">
          {(data.weakStudents || []).length === 0 ? (
            <p className="text-sm text-slate-500">No weak students flagged yet.</p>
          ) : (
            <div className="space-y-2">
              {data.weakStudents.map((w, i) => (
                <p key={i} className="text-sm font-medium text-slate-700">
                  {w.student?.name} — {w.percentage}%
                </p>
              ))}
            </div>
          )}
        </ErpSection>
      </div>
    </PageStack>
  );
}
