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
          <p className="text-sm text-slate-500">
            No assignments yet.
          </p>
        </ErpSection>
      ) : (
        // Mobile mein 1 column, tablets mein 2, aur laptop/desktop mein 3-4 columns
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {groupedAssignments.map((assignment, idx) => (
            <div
              key={idx}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">
                      {formatClassName(assignment.className)} {assignment.section}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Assigned Class
                    </p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 shrink-0">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500">
                    Subjects
                  </p>
                  <p className="mt-1 text-sm md:text-base font-bold text-blue-700 break-words">
                    {assignment.subjects.join(', ')}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-semibold text-green-700">
                    Active
                  </span>
                  <span className="text-[11px] text-slate-500">
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