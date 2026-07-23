import React from 'react';
import { Calendar, Layers, FileText, Download, Printer, Trash2, Edit3, Grid } from 'lucide-react';
import PlannerStatusBadge from './PlannerStatusBadge';

export default function PlannerCard({ planner, onEdit, onDelete, onDownloadPDF, onDownloadExcel, onPrint }) {
  const formatDateRange = (startS, endS) => {
    if (!startS || !endS) return '';
    const parse = (s) => {
      const [year, month, day] = s.split('-');
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    };
    return `${parse(startS)} - ${parse(endS)}`;
  };

  const getUpdatedText = (dateS) => {
    if (!dateS) return 'Updated recently';
    const [year, month, day] = dateS.split('-');
    const d = new Date(year, month - 1, day);
    return `Updated ${d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };

  const examLabel = planner.assessmentType === 'Main Exam' && planner.selectedMainExam
    ? `${planner.assessmentType} (${planner.selectedMainExam})`
    : planner.assessmentType;

  return (
    <div className="relative group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:border-indigo-200 flex flex-col justify-between min-h-[160px]">
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
          <PlannerStatusBadge status={planner.status} />
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
        </div>
      </div>

      {/* Footer & Actions */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[10px] text-slate-400 font-medium">
          {getUpdatedText(planner.updatedDate || planner.createdDate)}
        </span>

        {/* Buttons list */}
        <div className="flex items-center gap-1">
          {/* Edit */}
          <button
            onClick={() => onEdit(planner)}
            title="Edit Planner"
            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          
          {/* Download PDF */}
          <button
            onClick={() => onDownloadPDF(planner)}
            title="Download PDF"
            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition"
          >
            <FileText className="h-3.5 w-3.5" />
          </button>

          {/* Download Excel */}
          <button
            onClick={() => onDownloadExcel(planner)}
            title="Export Excel"
            className="p-1.5 rounded-lg text-teal-600 hover:bg-teal-50 hover:text-teal-700 transition"
          >
            <Download className="h-3.5 w-3.5" />
          </button>

          {/* Print */}
          <button
            onClick={() => onPrint(planner)}
            title="Print Friendly Layout"
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <Printer className="h-3.5 w-3.5" />
          </button>

          {/* Delete */}
          <button
            onClick={() => onDelete(planner)}
            title="Delete Planner"
            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
