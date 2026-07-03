import { useState, useEffect } from 'react';
import { FileCheck } from 'lucide-react';
import api from '@/lib/api';
import { formatClassName } from '@/lib/utils';
import { ErpSection, FormField } from '@/components/erp/PagePrimitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function NotebookCheckingProgress({ assignments = [] }) {
  const [nbClass, setNbClass] = useState('');
  const [nbSubject, setNbSubject] = useState('');
  const [notebookStats, setNotebookStats] = useState(null);
  const [loadingNotebook, setLoadingNotebook] = useState(false);

  const fetchNotebookStats = async () => {
    if (!nbClass || !nbSubject) return;
    setLoadingNotebook(true);
    try {
      const res = await api.get(`/notebook/grid?classId=${nbClass}&subject=${nbSubject}`);
      setNotebookStats(res.data.progress || null);
    } catch (err) {
      console.error('Failed to fetch notebook stats', err);
    } finally {
      setLoadingNotebook(false);
    }
  };

  useEffect(() => {
    if (nbClass && nbSubject) {
      fetchNotebookStats();
    }
  }, [nbClass, nbSubject]);

  return (
    <ErpSection className="bg-gradient-to-br from-fuchsia-50/80 to-purple-50/30" title="Notebook Checking Progress" icon={FileCheck} tone="fuchsia">
      <div className="grid gap-3 sm:grid-cols-2 mb-5">
        <FormField label="Class">
          <Select value={nbClass} onValueChange={(v) => { setNbClass(v); setNbSubject(''); setNotebookStats(null); }}>
            <SelectTrigger className="rounded-md h-9"><SelectValue placeholder="Select Class" /></SelectTrigger>
            <SelectContent>
              {[...new Map(assignments.map(a => [a.classId, a])).values()].map((a) => (
                <SelectItem key={a.classId} value={a.classId}>{formatClassName(a.className)} {a.section}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Subject">
          <Select value={nbSubject} onValueChange={setNbSubject}>
            <SelectTrigger className="rounded-md h-9"><SelectValue placeholder="Select Subject" /></SelectTrigger>
            <SelectContent>
              {[...new Set(assignments.filter(a => nbClass ? a.classId === nbClass : true).map(a => a.subject))].map((subj) => (
                <SelectItem key={subj} value={subj}>{subj}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      {!nbClass || !nbSubject ? (
        <div className="py-4 text-center text-slate-500 text-sm bg-gradient-to-br from-fuchsia-50/50 to-white rounded-lg border border-fuchsia-100">Select a class and subject to view notebook checking progress.</div>
      ) : loadingNotebook ? (
        <div className="py-4 text-center text-slate-500 text-sm bg-gradient-to-br from-fuchsia-50/50 to-white rounded-lg border border-fuchsia-100">Loading notebook stats...</div>
      ) : notebookStats ? (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 to-white p-3 text-center shadow-sm">
            <div className="text-xs font-medium text-slate-500 mb-1">Unlocked Chapters</div>
            <div className="text-xl font-semibold text-fuchsia-600">{notebookStats.unlockedChapterProgress || `${notebookStats.unlockedCount}/${notebookStats.totalChapters}`}</div>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-3 text-center shadow-sm">
            <div className="text-xs font-medium text-slate-500 mb-1">Checked Copies</div>
            <div className="text-xl font-semibold text-emerald-600">{notebookStats.totalChecked}</div>
          </div>
          <div className="rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-3 text-center shadow-sm">
            <div className="text-xs font-medium text-slate-500 mb-1">Pending Copies</div>
            <div className="text-xl font-semibold text-amber-500">{notebookStats.totalPending}</div>
          </div>
          <div className="rounded-lg border border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 to-purple-50 p-3 text-center shadow-sm">
            <div className="text-xs font-medium text-slate-600 mb-1">Chapter Performance</div>
            <div className="text-xl font-semibold text-fuchsia-700">{notebookStats.unlockedChapterPerformance || notebookStats.progressPercentage}%</div>
          </div>
          <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-3 text-center shadow-sm">
            <div className="text-xs font-medium text-slate-600 mb-1">Overall Progress</div>
            <div className="text-xl font-semibold text-blue-700">{notebookStats.overallProgress || 0}%</div>
          </div>
        </div>
      ) : null}
    </ErpSection>
  );
}
