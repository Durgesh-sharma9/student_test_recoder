import { useEffect, useState } from 'react';
import { BookOpen, GraduationCap } from 'lucide-react';
import api from '@/lib/api';
import { formatClassName } from '@/lib/utils';
import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';

export default function TeacherClasses() {
  const [user, setUser] = useState(null);
  useEffect(() => { api.get('/auth/me').then((r) => setUser(r.data.user)); }, []);

  return (
    <PageStack>
      <PageHeader
        title="My Classes & Subjects"
        description="View your assigned classes and subjects."
      />

      {(user?.assignments || []).length === 0 ? (
        <ErpSection title="Assignments" icon={GraduationCap} tone="green">
          <p className="text-sm text-slate-500">No assignments yet.</p>
        </ErpSection>
      ) : (
        (user?.assignments || []).map((a, idx) => (
          <ErpSection
            key={idx}
            title={`${formatClassName(a.class?.className)}-${a.class?.section}`}
            icon={BookOpen}
            tone="green"
          >
            <p className="text-sm text-slate-600">
              <span className="font-medium text-slate-800">Subject:</span> {a.subject}
            </p>
          </ErpSection>
        ))
      )}
    </PageStack>
  );
}
