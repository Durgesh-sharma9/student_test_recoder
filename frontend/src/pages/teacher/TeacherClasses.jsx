import { useEffect, useState } from 'react';
import { BookOpen, GraduationCap } from 'lucide-react';
import api from '@/lib/api';
import { formatClassName } from '@/lib/utils';
import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';

// Subject-wise unique theme colors
const THEME_MAP = {
  'MATHS': { border: 'border-blue-200', grad: 'from-blue-500 via-indigo-500 to-purple-500', text: 'text-indigo-600', bg: 'bg-blue-50/50' },
  'SCIENCE': { border: 'border-emerald-200', grad: 'from-emerald-500 via-teal-500 to-green-500', text: 'text-emerald-600', bg: 'bg-emerald-50/50' },
  'ENGLISH': { border: 'border-amber-200', grad: 'from-amber-500 via-orange-500 to-yellow-500', text: 'text-amber-600', bg: 'bg-amber-50/50' },
  'HINDI': { border: 'border-rose-200', grad: 'from-rose-500 via-pink-500 to-red-500', text: 'text-rose-600', bg: 'bg-rose-50/50' },
  'SOCIAL SCIENCE': { border: 'border-purple-200', grad: 'from-purple-500 via-violet-500 to-fuchsia-500', text: 'text-purple-600', bg: 'bg-purple-50/50' },
  'PHYSICS': { border: 'border-cyan-200', grad: 'from-cyan-500 via-sky-500 to-blue-500', text: 'text-cyan-600', bg: 'bg-cyan-50/50' },
  'DEFAULT': { border: 'border-slate-200', grad: 'from-slate-500 via-slate-600 to-slate-700', text: 'text-slate-600', bg: 'bg-slate-50/50' }
};

export default function TeacherClasses() {
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    api.get('/results/dashboard').then((r) => {
      setAssignments(r.data.assignmentDetails || []);
    });
  }, []);

  const getTheme = (subject) => {
    return THEME_MAP[subject.toUpperCase()] || THEME_MAP['DEFAULT'];
  };

  return (
    <PageStack>
      <PageHeader
        title="My Classes & Subjects"
        description="View your assigned classes and subjects."
      />

      {assignments.length === 0 ? (
        <ErpSection title="Assignments" icon={GraduationCap} tone="green">
          <div className="py-6 text-center rounded-lg border border-slate-100 bg-slate-50">
            <p className="text-sm text-slate-500">No assignments yet.</p>
          </div>
        </ErpSection>
      ) : (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assignments.map((assignment, idx) => {
            const theme = getTheme(assignment.subject);
            
            return (
              <div
                key={idx}
                className={`group flex flex-col overflow-hidden rounded-lg border ${theme.border} ${theme.bg} shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow`}
              >
                {/* Colorful top bar based on subject */}
                <div className={`h-1 w-full bg-gradient-to-r ${theme.grad}`} />

                <div className="flex flex-col flex-1 p-3.5">
                  <div className="flex items-start justify-between">
                    <div className="overflow-hidden pr-2">
                      <h3 className="text-base font-semibold text-slate-800 truncate">
                        {formatClassName(assignment.className)} {assignment.section}
                      </h3>
                      <p className={`mt-0.5 text-xs font-bold uppercase tracking-wide ${theme.text}`}>
                        {assignment.subject}
                      </p>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white border border-slate-100 shrink-0 transition-colors group-hover:bg-white">
                      <BookOpen className={`h-4 w-4 ${theme.text}`} />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="inline-flex items-center rounded-md bg-green-50 border border-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                      Active
                    </span>
                    <GraduationCap className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageStack>
  );
}