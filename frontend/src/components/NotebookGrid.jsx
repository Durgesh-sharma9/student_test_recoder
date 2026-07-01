import React from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

export default function NotebookGrid({ grid, totalChapters, classId, subject, onUpdate }) {
  const handleStatusChange = async (studentId, chapterNumber, currentStatus) => {
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
      onUpdate(); // Trigger refresh to sync state
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Checked': return 'bg-emerald-500 text-white';
      case 'Copy Not Submitted': return 'bg-rose-500 text-white';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 sticky top-0 z-20">
          <tr>
            <th className="p-3 font-semibold text-slate-700 min-w-[80px] sticky left-0 z-30 bg-slate-50 border-r border-slate-200">Roll No</th>
            <th className="p-3 font-semibold text-slate-700 min-w-[200px] sticky left-[80px] z-30 bg-slate-50 border-r border-slate-200">Student Name</th>
            {Array.from({ length: totalChapters }, (_, i) => (
              <th key={i} className="p-3 text-center font-semibold text-slate-600 min-w-[100px]">Ch {i + 1}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {grid.map((student) => (
            <tr key={student.studentId} className="hover:bg-slate-50/50">
              <td className="p-3 font-medium text-slate-900 sticky left-0 z-10 bg-white border-r border-slate-200">{student.rollNo}</td>
              <td className="p-3 font-medium text-slate-900 sticky left-[80px] z-10 bg-white border-r border-slate-200">{student.name}</td>
              {student.chapters.map((ch) => (
                <td key={ch.chapterNumber} className="p-2 text-center">
                  <button
                    onClick={() => handleStatusChange(student.studentId, ch.chapterNumber, ch.status)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm w-full',
                      getStatusColor(ch.status)
                    )}
                  >
                    {ch.status === 'Checked' ? '✔' : ch.status === 'Copy Not Submitted' ? '🚫' : '⬜'}
                  </button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}