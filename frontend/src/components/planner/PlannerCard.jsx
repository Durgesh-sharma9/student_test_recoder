import React from 'react';
import { Calendar, Layers, FileText, Printer, Trash2, Edit3 } from 'lucide-react';

export default function PlannerCard({ planner, onEdit, onDelete, onDownloadPDF, onPrint }) {
  if (!planner) return null;

  const formatDateRange = (startS, endS) => {
    if (!startS || !endS) return '';
    const parse = (s) => {
      const parts = String(s).split('-');
      if (parts.length < 3) return '';
      const [year, month, day] = parts;
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    };
    return `${parse(startS)} - ${parse(endS)}`;
  };

  const getFormattedDate = (dateS) => {
    if (!dateS) return 'N/A';
    const parts = String(dateS).split('-');
    if (parts.length < 3) return 'N/A';
    const [year, month, day] = parts;
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const examLabel = planner?.assessmentType === 'Main Exam' && planner?.selectedMainExam
    ? `${planner.assessmentType} (${planner.selectedMainExam})`
    : planner?.assessmentType || 'Daily Test';

  return (
    <div className="relative group rounded-2xl border border-orange-100/80 bg-white p-3.5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-orange-400 flex flex-col justify-between min-h-[140px]">
      {/* Top row */}
      <div>
        <div className="flex items-start justify-between mb-1.5">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 text-sm group-hover:text-orange-600 transition-colors leading-tight">
              {planner.name}
            </h3>
            <p className="text-[10px] font-bold text-orange-700 bg-orange-50/60 border border-orange-100 rounded-lg px-2 py-0.5 w-max">
              {examLabel}
            </p>
          </div>
        </div>

        {/* Metadata section */}
        <div className="space-y-1.5 mt-2.5 mb-3">
          <div className="flex items-center gap-1.5 text-slate-500 text-[10.5px] font-semibold">
            <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
            <span>{formatDateRange(planner.startDate, planner.endDate)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500 text-[10.5px] font-semibold">
            <Layers className="h-3 w-3 text-slate-400 shrink-0" />
            <span>{(planner.classes || []).length} Classes Configured</span>
          </div>
          <div className="text-[9.5px] text-slate-450 font-bold pt-1.5 border-t border-slate-100/80 mt-2 flex flex-col gap-0.5">
            <span>Created: {getFormattedDate(planner.createdDate)}</span>
            <span>Updated: {getFormattedDate(planner.updatedDate || planner.createdDate)}</span>
          </div>
        </div>
      </div>

      {/* Footer & Actions */}
      <div className="pt-1.5 border-t border-slate-100 flex items-center justify-end">
        {/* Buttons list */}
        <div className="flex items-center gap-0.5">
          {/* Edit */}
          <button
            onClick={() => onEdit(planner)}
            title="Edit Planner"
            className="p-1 rounded-md text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer"
          >
            <Edit3 className="h-3 w-3" />
          </button>
          
          {/* Download PDF */}
          <button
            onClick={() => onDownloadPDF(planner)}
            title="Download PDF"
            className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition cursor-pointer"
          >
            <FileText className="h-3 w-3" />
          </button>

          {/* Print */}
          <button
            onClick={() => onPrint(planner)}
            title="Print Friendly Layout"
            className="p-1 rounded-md text-slate-650 hover:bg-slate-150 hover:text-slate-800 transition cursor-pointer"
          >
            <Printer className="h-3 w-3" />
          </button>

          {/* Delete */}
          <button
            onClick={() => onDelete(planner)}
            title="Delete Planner"
            className="p-1 rounded-md text-red-650 hover:bg-red-50 hover:text-red-750 transition cursor-pointer"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
