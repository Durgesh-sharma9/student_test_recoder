import React from 'react';

export default function PlannerStatusBadge({ status }) {
  const styles = {
    'Draft': 'bg-amber-50 text-amber-700 border-amber-200',
    'Published': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Archived': 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const style = styles[status] || styles['Draft'];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${style}`}>
      {status}
    </span>
  );
}
