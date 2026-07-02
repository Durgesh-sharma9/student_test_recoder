import { useEffect, useState } from 'react';
import { BookOpen, GraduationCap } from 'lucide-react';
import api from '@/lib/api';
import { formatClassName } from '@/lib/utils';
import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';

export default function TeacherClasses() {
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    api.get('/results/dashboard').then((r) => {
      setAssignments(r.data.assignmentDetails || []);
    });
  }, []);

  const assignmentsByClass = {};
  assignments.forEach((a) => {
    const key = `${a.className}-${a.section}`;
    if (!assignmentsByClass[key]) {
      assignmentsByClass[key] = {
        className: a.className,
        section: a.section,
        subjects: []
      };
    }
    assignmentsByClass[key].subjects.push(a.subject);
  });

  const groupedAssignments = Object.values(assignmentsByClass);

  return (
    <PageStack>
      <PageHeader
        title="My Classes & Subjects"
        description="View your assigned classes and subjects."
      />

      {groupedAssignments.length === 0 ? (
        <ErpSection title="Assignments" icon={GraduationCap} tone="green">
          <div className="py-6 text-center rounded-lg border border-slate-100 bg-slate-50/50">
            <p className="text-sm text-slate-500">
              No assignments yet.
            </p>
          </div>
        </ErpSection>
      ) : (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {groupedAssignments.map((assignment, idx) => (
            <div
              key={idx}
              className="group flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:border-indigo-200 hover:shadow"
            >
              {/* Maintained the gradient accent bar as requested */}
              <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

              <div className="flex flex-col flex-1 p-3.5">
                <div className="flex items-start justify-between">
                  <div className="overflow-hidden pr-2">
                    <h3 className="text-base font-semibold text-slate-800 truncate">
                      {formatClassName(assignment.className)} {assignment.section}
                    </h3>
                    <p className="mt-0.5 text-xs font-medium text-slate-500">
                      Assigned Class
                    </p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 border border-blue-100/50 shrink-0 transition-colors group-hover:bg-blue-100/50">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                  </div>
                </div>

                {/* Maintained the colored subjects box */}
                <div className="mt-3 flex-1 rounded-md border border-blue-100/60 bg-gradient-to-br from-blue-50/80 to-indigo-50/50 p-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Subjects
                  </p>
                  <p className="text-sm font-semibold text-blue-700 leading-snug break-words">
                    {assignment.subjects.join(', ')}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="inline-flex items-center rounded-md bg-green-50 border border-green-200/60 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                    Active
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    {assignment.subjects.length} Subject{assignment.subjects.length > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageStack>
  );
}