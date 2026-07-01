import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import NotebookGrid from '@/components/NotebookGrid';
import { FileCheck } from 'lucide-react';

export default function NotebookChecking() {
  const [assignments, setAssignments] = useState([]);
  const [selected, setSelected] = useState({ classId: '', subject: '' });
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/teacher/subjects').then(r => setAssignments(r.data.assignments));
  }, []);

  const loadGrid = async () => {
    if (!selected.classId || !selected.subject) return;
    const res = await api.get(`/notebook/grid?classId=${selected.classId}&subject=${selected.subject}`);
    // Sort students by numeric roll number
    const sortedGrid = [...res.data.grid].sort((a, b) => {
      const rollA = parseInt(a.rollNo, 10) || 0;
      const rollB = parseInt(b.rollNo, 10) || 0;
      return rollA - rollB;
    });
    setData({ ...res.data, grid: sortedGrid });
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

  useEffect(() => { loadGrid(); }, [selected]);

  return (
    <PageStack>
      <PageHeader title="Notebook Checking" description="Mark chapter submissions for students" />
      <ErpSection title="Filters" icon={FileCheck} tone="fuchsia">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select onValueChange={(v) => setSelected({ ...selected, classId: v })}>
            <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
            <SelectContent>
              {[...new Map(assignments.map(a => [a.classId, a])).values()].map(a => (
                <SelectItem key={a.classId} value={a.classId}>{a.label.split(' · ')[0]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={(v) => setSelected({ ...selected, subject: v })}>
            <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
            <SelectContent>
              {[...new Set(assignments.filter(a => selected.classId ? a.classId === selected.classId : true).map(a => a.subject))].map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </ErpSection>
      {data && (
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
      )}
    </PageStack>
  );
}