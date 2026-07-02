import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import NotebookGrid from '@/components/NotebookGrid';
import { FileCheck, Filter, BookOpen, Layers } from 'lucide-react';

export default function NotebookChecking() {
  const [assignments, setAssignments] = useState([]);
  const [selected, setSelected] = useState({ classId: '', subject: '' });
  const [data, setData] = useState(null);

  const loadGrid = async () => {
    try {
      if (!selected.classId || !selected.subject) return;
      const res = await api.get(`/notebook/grid?classId=${selected.classId}&subject=${selected.subject}`);
      const sortedGrid = [...res.data.grid].sort((a, b) => {
        const rollA = parseInt(a.rollNo, 10) || 0;
        const rollB = parseInt(b.rollNo, 10) || 0;
        return rollA - rollB;
      });
      setData({ ...res.data, grid: sortedGrid });
    } catch (err) {
      console.error('Failed to load grid:', err);
      setData(null);
    }
  };

  const loadAssignments = async () => {
    try {
      const res = await api.get('/teacher/subjects');
      setAssignments(res.data.assignments);
    } catch (err) {
      console.error('Failed to load assignments:', err);
      setAssignments([]);
    }
  };

  const handleUnlockChapter = async (chapterNumber) => {
    try {
      await api.post('/notebook/unlock', {
        classId: selected.classId,
        subject: selected.subject,
        chapterNumber,
      });
      loadGrid();
    } catch (err) {
      console.error('Failed to unlock chapter:', err);
    }
  };

  useEffect(() => { loadAssignments(); }, []);
  useEffect(() => { if (selected.classId) loadAssignments(); }, [selected.classId]);
  useEffect(() => { loadGrid(); }, [selected]);

  return (
    <PageStack>
      <PageHeader title="Notebook Checking" description="Mark chapter submissions for students" />
      
      <ErpSection title="Selection Filters" icon={Filter} tone="fuchsia">
        <div className="grid gap-4 sm:grid-cols-2 p-5 bg-gradient-to-br from-fuchsia-50/50 to-purple-50/30 rounded-xl border border-fuchsia-100 shadow-sm">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-fuchsia-800 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={14} /> Class
            </label>
            <Select onValueChange={(v) => setSelected({ ...selected, classId: v })}>
              <SelectTrigger className="h-10 bg-white border-fuchsia-200 hover:border-fuchsia-300 transition-colors shadow-sm">
                <SelectValue placeholder="Choose a class" />
              </SelectTrigger>
              <SelectContent>
                {[...new Map(assignments.map(a => [a.classId, a])).values()].map(a => (
                  <SelectItem key={a.classId} value={a.classId}>{a.label.split(' · ')[0]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-fuchsia-800 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen size={14} /> Subject
            </label>
            <Select onValueChange={(v) => setSelected({ ...selected, subject: v })}>
              <SelectTrigger className="h-10 bg-white border-fuchsia-200 hover:border-fuchsia-300 transition-colors shadow-sm">
                <SelectValue placeholder="Choose a subject" />
              </SelectTrigger>
              <SelectContent>
                {[...new Set(assignments.filter(a => selected.classId ? a.classId === selected.classId : true).map(a => a.subject))].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </ErpSection>

      {data ? (
        <div className="mt-2 animate-in fade-in zoom-in duration-300">
          <NotebookGrid 
            grid={data.grid} 
            totalChapters={data.totalChapters} 
            unlockedChapters={data.unlockedChapters || []}
            chapterProgress={data.chapterProgress || []}
            progress={data.progress}
            classId={selected.classId} 
            subject={selected.subject} 
            onUpdate={loadGrid}
            onUnlockChapter={handleUnlockChapter}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
          <div className="bg-fuchsia-100 p-4 rounded-full mb-4">
            <FileCheck className="w-8 h-8 text-fuchsia-600" />
          </div>
          <p className="text-sm font-semibold text-slate-500">Please select class and subject to view the grid</p>
        </div>
      )}
    </PageStack>
  );
}