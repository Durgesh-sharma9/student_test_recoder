import React from 'react';
import { Construction, Sparkles } from 'lucide-react';

export default function StudentPerformance() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Student Performance</h1>
        <p className="text-sm text-slate-500 mt-1">
          This module will contain complete student performance analytics.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-white p-8 shadow-sm">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-50 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-blue-50 blur-3xl" />
        
        <div className="relative flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-50 shadow-inner">
            <Construction className="h-10 w-10 text-indigo-600" />
          </div>
          <h2 className="mb-3 text-2xl font-bold text-slate-800">Coming Soon</h2>
          <p className="max-w-md text-slate-600">
            We are currently building the comprehensive student performance analytics module. 
            Detailed insights, progress tracking, and predictive analytics will be available here soon.
          </p>
          <div className="mt-8 flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 border border-amber-100">
            <Sparkles className="h-4 w-4" />
            <span>In Active Development</span>
          </div>
        </div>
      </div>
    </div>
  );
}