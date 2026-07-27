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
    <div className="relative group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:border-indigo-200 flex flex-col justify-between min-h-[170px]">
      {/* Top row */}
      <div>
        <div className="flex items-start justify-between mb-2">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 text-sm md:text-base group-hover:text-indigo-600 transition-colors leading-tight">
              {planner.name}
            </h3>
            <p className="text-[11px] font-semibold text-indigo-600/90 bg-indigo-50/70 border border-indigo-100/50 rounded-lg px-2 py-0.5 w-max">
              {examLabel}
            </p>
          </div>
        </div>

        {/* Metadata section */}
        <div className="space-y-1.5 mt-3 mb-4">
          <div className="flex items-center gap-2 text-slate-500 text-[11px] font-medium">
            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>{formatDateRange(planner.startDate, planner.endDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500 text-[11px] font-medium">
            <Layers className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>{(planner.classes || []).length} Classes Configured</span>
          </div>
          <div className="text-[10px] text-slate-450 font-semibold pt-2 border-t border-slate-100/80 mt-2.5 flex flex-col gap-0.5">
            <span>Created: {getFormattedDate(planner.createdDate)}</span>
            <span>Updated: {getFormattedDate(planner.updatedDate || planner.createdDate)}</span>
          </div>
        </div>
      </div>

      {/* Footer & Actions */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
        {/* Buttons list */}
        <div className="flex items-center gap-1">
          {/* Edit */}
          <button
            onClick={() => onEdit(planner)}
            title="Edit Planner"
            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          
          {/* Download PDF */}
          <button
            onClick={() => onDownloadPDF(planner)}
            title="Download PDF"
            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5" />
          </button>

          {/* Print */}
          <button
            onClick={() => onPrint(planner)}
            title="Print Friendly Layout"
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
          </button>

          {/* Delete */}
          <button
            onClick={() => onDelete(planner)}
            title="Delete Planner"
            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 transition cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
