import React, { useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { Lock, Unlock, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotebookGrid({ grid, totalChapters, unlockedChapters, chapterProgress, progress, classId, subject, onUpdate, onUnlockChapter }) {
  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const [pendingLockChapter, setPendingLockChapter] = useState(null);

  const handleStatusChange = async (studentId, chapterNumber, currentStatus) => {
    if (!unlockedChapters.includes(chapterNumber)) {
      toast.error('Chapter is locked. Unlock first!');
      return;
    }
    const nextStatus = currentStatus === 'Checked' ? 'Pending' : 'Checked';
    try {
      await api.post('/notebook/update', { classId, studentId, subject, chapterNumber, status: nextStatus });
      onUpdate();
    } catch (err) { toast.error('Update failed'); }
  };

  const lockChapter = async (chapterNumber, resetRecords) => {
    try {
      await api.post('/notebook/lock', { classId, subject, chapterNumber, resetRecords });
      onUpdate();
      toast.success('Chapter status updated');
    } catch (err) { toast.error('Action failed'); }
    setLockDialogOpen(false);
    setPendingLockChapter(null);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="bg-slate-200 border-b border-slate-300">
              {/* ROLL NO. aur NAME ke beech ki border (line) hata di hai */}
              <th className="p-3 font-black text-slate-700 sticky left-0 z-20 bg-slate-300 w-14">ROLL NO.</th>
              <th className="p-3 font-black text-slate-700 sticky left-14 z-20 bg-slate-300 min-w-[140px]">NAME</th>
              
              {Array.from({ length: totalChapters }, (_, i) => {
                const chNum = i + 1;
                const isUnlocked = unlockedChapters.includes(chNum);
                return (
                  <th key={i} className={cn("p-1.5 border-r border-slate-300 min-w-[90px]", isUnlocked ? "bg-emerald-100" : "bg-red-50")}>
                    <button 
                      onClick={() => isUnlocked ? (setPendingLockChapter(chNum), setLockDialogOpen(true)) : onUnlockChapter(chNum)}
                      className={cn(
                        "w-full flex flex-col items-center gap-0.5 p-1.5 rounded-lg border transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]", 
                        isUnlocked ? "bg-emerald-200 border-emerald-400 text-emerald-900 shadow-sm" : "bg-white border-red-200 text-red-600 hover:bg-red-100"
                      )}
                    >
                      <span className="flex items-center gap-1 font-black uppercase tracking-wider text-[9px]">
                        {isUnlocked ? <Unlock size={9}/> : <Lock size={9}/>} CH {chNum}
                      </span>
                      <span className="text-[8px] font-bold opacity-70 italic">
                        {isUnlocked ? "Click to Lock" : "Click to Unlock"}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {grid.map((student) => (
              <tr key={student.studentId} className="hover:bg-slate-50 transition-colors">
                {/* Yahan bhi border hata di hai */}
                <td className="p-3 font-bold text-slate-600 sticky left-0 z-10 bg-slate-100 text-center">{student.rollNo}</td>
                <td className="p-3 font-bold text-slate-900 sticky left-14 z-10 bg-slate-100 truncate max-w-[140px]">{student.name}</td>
                
                {student.chapters.map((ch) => {
                  const isChecked = ch.status === 'Checked';
                  const isUnlocked = unlockedChapters.includes(ch.chapterNumber);
                  return (
                    <td key={ch.chapterNumber} className={cn("p-1.5 text-center border-r border-slate-200 last:border-0 align-middle", !isUnlocked && "bg-slate-50/50")}>
                      <div className="flex justify-center items-center">
                        <button
                          onClick={() => handleStatusChange(student.studentId, ch.chapterNumber, ch.status)}
                          disabled={!isUnlocked}
                          className={cn("h-7 w-7 flex items-center justify-center rounded transition-all border-2", 
                            !isUnlocked 
                              ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed" 
                              : isChecked 
                                ? "bg-emerald-500 border-emerald-600 text-white shadow-sm" 
                                : "bg-white border-slate-300 hover:border-indigo-400"
                          )}
                        >
                          {!isUnlocked ? <Lock size={12} /> : isChecked ? <Check size={16} strokeWidth={3} /> : null}
                        </button>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {lockDialogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
            <div className="bg-red-100 p-4 border-b border-red-200 flex items-center gap-3">
              <AlertTriangle className="text-red-700" size={18} />
              <h3 className="font-bold text-red-900 text-sm">Lock Chapter {pendingLockChapter}?</h3>
            </div>
            <div className="p-4 text-xs text-slate-700">All student records for this chapter will be reset to pending. Proceed?</div>
            <div className="p-3 flex gap-2 justify-end bg-slate-100">
              <Button variant="ghost" size="sm" onClick={() => setLockDialogOpen(false)}>Cancel</Button>
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => lockChapter(pendingLockChapter, true)}>Confirm Lock</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}