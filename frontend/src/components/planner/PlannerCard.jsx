import React from 'react';
import { Calendar, Layers, Download, Trash2, Edit3, Eye } from 'lucide-react';

export default function PlannerCard({ planner, onView, onEdit, onDelete, onDownloadPDF }) {
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

  const statusColor =
    planner.status === 'Published'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : planner.status === 'Finalized'
      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
      : 'bg-slate-50 text-slate-500 border-slate-200';

  return (
    <div className="relative group rounded-2xl border border-orange-100/80 bg-white shadow-sm transition-all duration-300 hover:shadow-md hover:border-orange-300 flex flex-col justify-between min-h-[150px] overflow-hidden">
      {/* Gradient top accent */}
      <div className="h-1 w-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-t-2xl" />

      <div className="p-3.5 flex flex-col gap-2 flex-1">
        {/* Top row: name + status badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1 min-w-0">
            <h3 className="font-bold text-slate-800 text-sm group-hover:text-orange-600 transition-colors leading-tight truncate">
              {planner.name}
            </h3>
            <p className="text-[10px] font-bold text-orange-700 bg-orange-50/60 border border-orange-100 rounded-lg px-2 py-0.5 w-max">
              {examLabel}
            </p>
          </div>
          {planner.status && (
            <span className={`shrink-0 text-[9.5px] font-bold border rounded-full px-2 py-0.5 ${statusColor}`}>
              {planner.status}
            </span>
          )}
        </div>

        {/* Metadata */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-slate-500 text-[10.5px] font-semibold">
            <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
            <span>{formatDateRange(planner.startDate, planner.endDate)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500 text-[10.5px] font-semibold">
            <Layers className="h-3 w-3 text-slate-400 shrink-0" />
            <span>{(planner.classes || []).length} Classes Configured</span>
          </div>
          <div className="text-[9.5px] text-slate-400 font-semibold pt-1.5 border-t border-slate-100/80 flex gap-3">
            <span>Created: {getFormattedDate(planner.createdDate)}</span>
            <span>Updated: {getFormattedDate(planner.updatedDate || planner.createdDate)}</span>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-3.5 pb-3 pt-2 border-t border-slate-100 flex items-center justify-between">
        {/* View button — prominent */}
        <button
          onClick={() => onView && onView(planner)}
          title="View Planner"
          className="flex items-center gap-1 text-[10.5px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 rounded-lg px-2.5 py-1 transition cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          <Eye className="h-3 w-3" />
          View
        </button>

        {/* Icon actions */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onEdit && onEdit(planner)}
            title="Edit Planner"
            className="flex items-center gap-1 text-[9.5px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200/60 rounded-lg px-2 py-1 transition cursor-pointer"
          >
            <Edit3 className="h-3 w-3" />
            Edit
          </button>

          {/* PDF Download — clearly labeled red button */}
          <button
            onClick={() => onDownloadPDF && onDownloadPDF(planner)}
            title="Download PDF"
            className="flex items-center gap-1 text-[9.5px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200/60 rounded-lg px-2 py-1 transition cursor-pointer"
          >
            <Download className="h-3 w-3" />
            PDF
          </button>

          <button
            onClick={() => onDelete && onDelete(planner)}
            title="Delete Planner"
            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
