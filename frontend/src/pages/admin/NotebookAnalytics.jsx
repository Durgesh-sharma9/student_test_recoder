import React, { useState } from 'react';
import api from '@/lib/api';
import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown, Search } from 'lucide-react';

export default function NotebookAnalytics() {
  const [filters, setFilters] = useState({ classId: '', subject: '', filterType: '' });
  const [data, setData] = useState([]);

  const fetchData = async (exportFormat = '') => {
    const query = new URLSearchParams({...filters, exportFormat}).toString();
    if (exportFormat === 'excel') {
      window.location.href = `${api.defaults.baseURL}/notebook/analytics?${query}`;
      return;
    }
    const res = await api.get(`/notebook/analytics?${query}`);
    setData(res.data.data);
  };

  return (
    <PageStack>
      <PageHeader title="Notebook Analytics" description="Track school-wide notebook submission progress" />
      <ErpSection title="Search & Filter" icon={Search} tone="fuchsia">
        <div className="grid gap-4 sm:grid-cols-3">
          <input placeholder="Class ID" onChange={e => setFilters({...filters, classId: e.target.value})} className="border p-2 rounded" />
          <input placeholder="Subject" onChange={e => setFilters({...filters, subject: e.target.value})} className="border p-2 rounded" />
          <Select onValueChange={v => setFilters({...filters, filterType: v})}>
            <SelectTrigger><SelectValue placeholder="Filter..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="top_5">Top 5 Students</SelectItem>
              <SelectItem value="below_50">Below 50% Progress</SelectItem>
              <SelectItem value="pending_only">Pending Only</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => fetchData()}>Search</Button>
          <Button variant="outline" onClick={() => fetchData('excel')}><FileDown className="mr-2 h-4 w-4"/> Export Excel</Button>
        </div>
      </ErpSection>
      
      <div className="overflow-x-auto border rounded-xl bg-white p-4">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>{['Student', 'Subject', 'Progress %', 'Checked', 'Pending'].map(h => <th key={h} className="p-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody>
            {data.map((d, i) => (
              <tr key={i} className="border-b">
                <td className="p-3">{d.name}</td>
                <td className="p-3">{d.subject}</td>
                <td className="p-3 font-bold text-fuchsia-700">{d.percentage}%</td>
                <td className="p-3 text-emerald-600">{d.checkedCount}</td>
                <td className="p-3 text-amber-500">{d.pendingCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageStack>
  );
}