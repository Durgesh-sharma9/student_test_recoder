import React, { useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { Lock, Unlock } from 'lucide-react';

export default function NotebookGrid({ grid, totalChapters, unlockedChapters, chapterProgress, progress, classId, subject, onUpdate, onUnlockChapter }) {
  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const [pendingLockChapter, setPendingLockChapter] = useState(null);

  const handleStatusChange = async (studentId, chapterNumber, currentStatus) => {
    if (!unlockedChapters.includes(chapterNumber)) {
      toast.error('This chapter is locked. Please unlock it first.');
      return;
    }

    const statuses = ['Pending', 'Checked'];
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

  const handleLockClick = (chapterNumber) => {
    if (!unlockedChapters.includes(chapterNumber)) return;
    
    // Check if any student has a non-pending status in this chapter
    const hasNonPendingStatus = grid.some(student => {
      const chapter = student.chapters.find(ch => ch.chapterNumber === chapterNumber);
      return chapter && chapter.status !== 'Pending';
    });

    if (hasNonPendingStatus) {
      setPendingLockChapter(chapterNumber);
      setLockDialogOpen(true);
    } else {
      // No records to reset, lock immediately
      lockChapter(chapterNumber, false);
    }
  };

  const lockChapter = async (chapterNumber, resetRecords) => {
    try {
      await api.post('/notebook/lock', {
        classId,
        subject,
        chapterNumber,
        resetRecords,
      });
      onUpdate();
      toast.success('Chapter locked successfully');
    } catch (err) {
      toast.error('Failed to lock chapter');
    }
    setLockDialogOpen(false);
    setPendingLockChapter(null);
  };

  const handleUnlockToggle = (chapterNumber) => {
    if (unlockedChapters.includes(chapterNumber)) {
      handleLockClick(chapterNumber);
    } else {
      handleUnlock(chapterNumber);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Checked': return 'bg-emerald-500 text-white';
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
                        onChange={() => handleUnlockToggle(chapterNum)}
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
                      {ch.status === 'Checked' ? '✔' : '⬜'}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Lock Confirmation Dialog */}
      {lockDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-rose-500 to-red-600 px-6 py-4">
              <h3 className="text-lg font-bold text-white">Lock Chapter?</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-slate-700">
                You are about to lock Chapter {pendingLockChapter}.
              </p>
              <p className="text-slate-700">This will:</p>
              <ul className="list-disc list-inside text-slate-700 space-y-1">
                <li>Lock this chapter</li>
                <li>Remove all notebook checking records for this chapter</li>
                <li>Reset every student's status back to Pending</li>
              </ul>
              <p className="text-slate-700 font-semibold">This action cannot be undone.</p>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex gap-3 justify-end border-t border-slate-200">
              <button
                onClick={() => {
                  setLockDialogOpen(false);
                  setPendingLockChapter(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => lockChapter(pendingLockChapter, true)}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 font-semibold"
              >
                Yes, Lock Chapter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}