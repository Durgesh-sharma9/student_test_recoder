import React from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { Lock, Unlock } from 'lucide-react';

export default function NotebookGrid({ grid, totalChapters, unlockedChapters, chapterProgress, progress, classId, subject, onUpdate, onUnlockChapter }) {
  const handleStatusChange = async (studentId, chapterNumber, currentStatus) => {
    if (!unlockedChapters.includes(chapterNumber)) {
      toast.error('This chapter is locked. Please unlock it first.');
      return;
    }

    const statuses = ['Pending', 'Checked', 'Copy Not Submitted'];
    const nextStatus = statuses[(statuses.indexOf(currentStatus) + 1) % statuses.length];

    try {
      await api.post('/notebook/update', {
        classId,
        studentId,
        subject,
        chapterNumber,
        status: nextStatus,
      });
      onUpdate();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleUnlock = (chapterNumber) => {
    if (unlockedChapters.includes(chapterNumber)) return;
    onUnlockChapter(chapterNumber);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Checked': return 'bg-emerald-500 text-white';
      case 'Copy Not Submitted': return 'bg-rose-500 text-white';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getChapterProgress = (chapterNumber) => {
    const cp = chapterProgress.find(c => c.chapterNumber === chapterNumber);
    if (cp) return `${cp.checkedCount}/${cp.totalStudents}`;
    return 'Locked';
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 sticky top-0 z-20">
          <tr>
            <th className="p-3 font-semibold text-slate-700 min-w-[80px] sticky left-0 z-30 bg-slate-50 border-r border-slate-200">Roll No</th>
            <th className="p-3 font-semibold text-slate-700 min-w-[200px] sticky left-[80px] z-30 bg-slate-50 border-r border-slate-200">Student Name</th>
            {Array.from({ length: totalChapters }, (_, i) => {
              const chapterNum = i + 1;
              const isUnlocked = unlockedChapters.includes(chapterNum);
              return (
                <th key={i} className="p-2 text-center font-semibold text-slate-600 min-w-[100px]">
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={isUnlocked}
                        onChange={() => handleUnlock(chapterNum)}
                        disabled={isUnlocked}
                        className="h-4 w-4 rounded border-slate-300 text-fuchsia-600 focus:ring-fuchsia-500"
                      />
                      <span>Ch {chapterNum}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">{getChapterProgress(chapterNum)}</span>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {grid.map((student) => (
            <tr key={student.studentId} className="hover:bg-slate-50/50">
              <td className="p-3 font-medium text-slate-900 sticky left-0 z-10 bg-white border-r border-slate-200">{student.rollNo}</td>
              <td className="p-3 font-medium text-slate-900 sticky left-[80px] z-10 bg-white border-r border-slate-200">{student.name}</td>
              {student.chapters.map((ch) => {
                const isUnlocked = unlockedChapters.includes(ch.chapterNumber);
                return (
                  <td key={ch.chapterNumber} className="p-2 text-center">
                    <button
                      onClick={() => handleStatusChange(student.studentId, ch.chapterNumber, ch.status)}
                      disabled={!isUnlocked}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm w-full',
                        getStatusColor(ch.status),
                        !isUnlocked && 'opacity-30 blur-[1px] cursor-not-allowed'
                      )}
                    >
                      {ch.status === 'Checked' ? '✔' : ch.status === 'Copy Not Submitted' ? '🚫' : '⬜'}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}