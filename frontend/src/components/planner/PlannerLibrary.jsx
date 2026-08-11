import React, { useState } from 'react';
import { Search, Plus, HelpCircle, ClipboardList } from 'lucide-react';
import PlannerCard from './PlannerCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErpSection } from '@/components/erp/PagePrimitives';


export default function PlannerLibrary({
  planners = [],
  onView,
  onEdit,
  onDelete,
  onDownloadPDF,
  onPrint,
  onNewPlanner
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all, daily, main

  const safePlanners = Array.isArray(planners) ? planners : [];
  const maxReached = safePlanners.length >= 5;

  // Filter planners list
  const filteredPlanners = safePlanners.filter(p => {
    if (!p) return false;
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

    return searchMatch && categoryMatch;
  });

  return (
    <ErpSection
      title="Saved Assessment Planners"
      icon={ClipboardList}
      tone="orange"
      className="border border-slate-200/80 shadow-sm"
      contentClassName="p-4"
    >
      <div className="border border-orange-150/70 rounded-2xl p-4 bg-gradient-to-br from-orange-50/70 to-amber-50/30 space-y-3">
        {/* Maximum planners warning card */}
        {maxReached && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200/60 p-2.5 rounded-xl text-amber-800 text-xs">
            <span className="shrink-0 text-amber-600 font-bold">⚠️</span>
            <div className="space-y-0.5">
              <p className="font-bold">Planner Storage Limit Reached</p>
              <p className="text-[10px] text-amber-700 leading-relaxed">
                You have reached the maximum limit of 5 planners. Delete an existing planner from your library to create a new one.
              </p>
            </div>
          </div>
        )}

        {/* Searches and Filters Row */}
        <div className="flex flex-col md:flex-row gap-2.5 items-center justify-between bg-white/70 backdrop-blur-md p-2 rounded-xl border border-slate-100 shadow-sm">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Planners..."
              className="pl-8 h-8 text-[11px] rounded-xl bg-white border-slate-200 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto md:justify-end">
            {/* Type Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wide">Type:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-7.5 rounded-lg border border-slate-200 bg-white px-2 text-[11px] text-slate-650 focus:outline-none"
              >
                <option value="all">All Types</option>
                <option value="daily">Daily Test</option>
                <option value="main">Main Exam</option>
              </select>
            </div>
          </div>
        </div>

        {/* Cards Grid */}
        {filteredPlanners.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-white/50">
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
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
                onDownloadPDF={onDownloadPDF}
                onPrint={onPrint}
              />
            ))}
          </div>
        )}
      </div>
    </ErpSection>
  );
}
