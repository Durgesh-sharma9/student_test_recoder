import { useEffect, useState } from 'react';
import { BookOpen, Activity, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import { formatClassName } from '@/lib/utils';
import { formatDisplayDate } from '@/lib/dateFormatter';
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

      {/* Changed to lg:grid-cols-4 since there are 4 cards remaining */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Assigned Classes" value={s.assignedClasses || 0} />
        <StatsCard title="Assigned Subjects" value={s.assignedSubjects || 0} />
        <StatsCard title="Total Students" value={s.students || 0} />
        <StatsCard title="Tests Conducted" value={s.testsConducted || 0} />
      </div>

      <ErpSection title="Assigned Subjects" icon={BookOpen} tone="blue">
        {assignments.length === 0 ? (
          <p className="text-sm text-slate-500">
            No subjects assigned yet. Ask your School Admin to assign classes and subjects.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {assignments.map((a, i) => (
              <div
                key={`${a.classId}-${a.subject}-${i}`}
                className="rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 hover:shadow-md transition-shadow"
              >
                <div className="mb-2">
                  <div className="text-lg font-bold text-slate-900">
                    {formatClassName(a.className)} {a.section}
                  </div>
                  <div className="text-sm font-semibold text-indigo-600">{a.subject}</div>
                </div>
              </div>
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
                <div className="flex flex-col gap-1 py-2 first:pt-0 last:pb-0" key={a._id}>
                  <p className="text-sm font-semibold text-slate-900">{a.action}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>by {a.actor?.name || 'Unknown'}</span>
                    <span>•</span>
                    <span>{formatDisplayDate(a.createdAt)}</span>
                    <span>•</span>
                    <span>{new Date(a.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                  </div>
                </div>
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