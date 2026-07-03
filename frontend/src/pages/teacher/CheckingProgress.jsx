import { useEffect, useState } from 'react';
import { PageHeader, PageStack } from '@/components/erp/PagePrimitives';
import api from '@/lib/api';
import NotebookCheckingProgress from '@/components/teacher/NotebookCheckingProgress';

export default function CheckingProgress() {
  const [data, setData] = useState({ assignmentDetails: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/results/dashboard').then((r) => {
      setData(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const assignments = data.assignmentDetails || [];

  return (
    <PageStack>
      <PageHeader
        title="Notebook Checking - Progress"
        description="Track your notebook checking progress across classes and subjects."
      />

      {loading ? (
        <div className="text-center text-slate-500 py-8">Loading...</div>
      ) : (
        <NotebookCheckingProgress assignments={assignments} />
      )}
    </PageStack>
  );
}
