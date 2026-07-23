import React, { useState } from 'react';
import { Search, Plus, Filter, AlertTriangle, HelpCircle, Archive, ClipboardList } from 'lucide-react';
import PlannerCard from './PlannerCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function PlannerLibrary({
  planners = [],
  onEdit,
  onDelete,
  onDownloadPDF,
  onDownloadExcel,
  onPrint,
  onNewPlanner
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all, daily, main
  const [statusFilter, setStatusFilter] = useState('all'); // all, draft, published, archived

  const maxReached = planners.length >= 5;

  // Filter planners list
  const filteredPlanners = planners.filter(p => {
    // 1. Search term (Name, Type, Main Exam)
    const term = searchTerm.toLowerCase().trim();
    const nameMatch = p.name?.toLowerCase().includes(term);
    const typeMatch = p.assessmentType?.toLowerCase().includes(term);
    const examMatch = p.selectedMainExam?.toLowerCase().includes(term);
    const searchMatch = !term || nameMatch || typeMatch || examMatch;

    // 2. Type filter
    let categoryMatch = true;
    if (typeFilter === 'daily') categoryMatch = p.assessmentType === 'Daily Test';
    if (typeFilter === 'main') categoryMatch = p.assessmentType === 'Main Exam';

    // 3. Status filter
    let stateMatch = true;
    if (statusFilter !== 'all') {
      stateMatch = p.status?.toLowerCase() === statusFilter.toLowerCase();
    }

    return searchMatch && categoryMatch && stateMatch;
  });

  return (
    <div className="space-y-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm shadow-slate-100/50">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-indigo-600" />
            Saved Assessment Planners
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage, edit, export, and load your custom exam scheduling sheets.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={onNewPlanner}
            disabled={maxReached}
            className="h-10 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl shadow-md font-bold flex items-center gap-1.5 border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4.5 w-4.5" />
            New Planner
          </Button>
        </div>
      </div>

      {/* Maximum planners warning card */}
      {maxReached && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200/60 p-3.5 rounded-2xl text-amber-800 text-xs">
          <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">Planner Storage Limit Reached</p>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              You have reached the maximum limit of 5 planners. Delete an existing planner from your library to create a new one.
            </p>
          </div>
        </div>
      )}

      {/* Searches and Filters Row */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-slate-50/50 p-2.5 rounded-2xl border border-slate-100">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Planners..."
            className="pl-9 h-9 text-xs rounded-xl bg-white border-slate-200 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto md:justify-end">
          {/* Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-600 focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="daily">Daily Test</option>
              <option value="main">Main Exam</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-600 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      {filteredPlanners.length === 0 ? (
        <div className="py-10 text-center flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/20">
          <HelpCircle className="h-10 w-10 text-slate-300 mb-2" />
          <p className="text-sm font-bold text-slate-500">No planners match your search / filters</p>
          <p className="text-xs text-slate-400 mt-0.5">Try resetting search text or selecting another category.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPlanners.map((planner) => (
            <PlannerCard
              key={planner.id}
              planner={planner}
              onEdit={onEdit}
              onDelete={onDelete}
              onDownloadPDF={onDownloadPDF}
              onDownloadExcel={onDownloadExcel}
              onPrint={onPrint}
            />
          ))}
        </div>
      )}
    </div>
  );
}
