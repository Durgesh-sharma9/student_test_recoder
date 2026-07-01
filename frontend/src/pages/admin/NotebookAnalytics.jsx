import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown, FileCheck, Users, BookOpen, TrendingUp } from 'lucide-react';

export default function NotebookAnalytics() {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selected, setSelected] = useState({ classId: '', subject: '', progressFilter: 'all' });
  const [data, setData] = useState(null);
  const [filteredGrid, setFilteredGrid] = useState(null);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.get('/classes').then(r => setClasses(r.data.classes || [])).catch(err => {
      console.error('Failed to load classes:', err);
      setClasses([]);
    });
  }, []);

  useEffect(() => {
    if (selected.classId) {
      api.get(`/subjects?classId=${selected.classId}`).then(r => {
        setSubjects(r.data.subjects || []);
        setSelected(prev => ({ ...prev, subject: '' }));
      });
    } else {
      setSubjects([]);
      setSelected(prev => ({ ...prev, subject: '' }));
    }
  }, [selected.classId]);

  const loadAnalytics = async () => {
    if (!selected.classId || !selected.subject) return;
    const res = await api.get(`/notebook/analytics?classId=${selected.classId}&subject=${selected.subject}`);
    setData(res.data);
    applyFilters(res.data.grid, res.data.totalChapters);
    calculateSummary(res.data);
  };

  const applyFilters = (grid, totalChapters) => {
    let filtered = [...grid];

    // Sort by numeric roll number
    filtered.sort((a, b) => {
      const rollA = parseInt(a.rollNo, 10) || 0;
      const rollB = parseInt(b.rollNo, 10) || 0;
      return rollA - rollB;
    });

    // Apply progress filter
    switch (selected.progressFilter) {
      case '0_completed':
        filtered = filtered.filter(s => s.progressPercentage === 0);
        break;
      case 'below_25':
        filtered = filtered.filter(s => s.progressPercentage < 25);
        break;
      case '25_50':
        filtered = filtered.filter(s => s.progressPercentage >= 25 && s.progressPercentage < 50);
        break;
      case '50_75':
        filtered = filtered.filter(s => s.progressPercentage >= 50 && s.progressPercentage < 75);
        break;
      case '75_99':
        filtered = filtered.filter(s => s.progressPercentage >= 75 && s.progressPercentage < 100);
        break;
      case '100_completed':
        filtered = filtered.filter(s => s.progressPercentage === 100);
        break;
      case 'top_5':
        filtered = filtered.sort((a, b) => b.progressPercentage - a.progressPercentage).slice(0, 5);
        break;
      case 'bottom_5':
        filtered = filtered.sort((a, b) => a.progressPercentage - b.progressPercentage).slice(0, 5);
        break;
      case 'pending_gt_5':
        filtered = filtered.filter(s => s.chapters.filter(ch => ch.status === 'Pending').length > 5);
        break;
      case 'checked_gt_5':
        filtered = filtered.filter(s => s.chapters.filter(ch => ch.status === 'Checked').length > 5);
        break;
      default:
        // All students - no filter
        break;
    }

    setFilteredGrid(filtered);
  };

  const calculateSummary = (analyticsData) => {
    const totalStudents = analyticsData.grid.length;
    const totalChapters = analyticsData.totalChapters;
    
    let totalChecked = 0;
    let totalCells = 0;
    
    analyticsData.grid.forEach(student => {
      student.chapters.forEach(ch => {
        totalCells++;
        if (ch.status === 'Checked') totalChecked++;
      });
    });

    const overallProgress = totalCells > 0 ? Math.round((totalChecked / totalCells) * 100) : 0;

    // Find teacher assigned to this class and subject
    const selectedClass = classes.find(c => c._id === selected.classId);

    setSummary({
      className: selectedClass ? `${selectedClass.className}-${selectedClass.section}` : 'N/A',
      subject: selected.subject,
      totalStudents,
      totalChapters,
      overallProgress,
    });
  };

  const handleGenerate = () => {
    loadAnalytics();
  };

  const exportExcel = () => {
    if (!selected.classId || !selected.subject || !filteredGrid) return;
    
    const workbook = new (require('exceljs')).Workbook();
    const sheet = workbook.addWorksheet('Notebook Analytics');
    sheet.addRow(['Roll No', 'Name', 'Progress %', ...Array.from({ length: data.totalChapters }, (_, i) => `Ch ${i + 1}`)]);
    
    filteredGrid.forEach(r => {
      sheet.addRow([r.rollNo, r.name, r.progressPercentage + '%', ...r.chapters.map(ch => ch.status)]);
    });
    
    workbook.xlsx.writeBuffer().then(buffer => {
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'notebook_analytics.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Checked': return '✔';
      case 'Copy Not Submitted': return '❌';
      default: return '⬜';
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
    <PageStack>
      <PageHeader title="Notebook Analytics" description="Track school-wide notebook submission progress" />
      <ErpSection title="Filters" icon={FileCheck} tone="fuchsia">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select onValueChange={(v) => setSelected({ ...selected, classId: v })}>
            <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
            <SelectContent>
              {classes.length === 0 ? (
                <div className="p-2 text-sm text-slate-500">No classes found</div>
              ) : (
                classes.map((c) => (
                  <SelectItem key={c._id} value={c._id}>{c.className}-{c.section}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Select 
            onValueChange={(v) => setSelected({ ...selected, subject: v })}
            disabled={!selected.classId}
          >
            <SelectTrigger><SelectValue placeholder={selected.classId ? "Select Subject" : "Select Class First"} /></SelectTrigger>
            <SelectContent>
              {subjects.length === 0 && selected.classId ? (
                <div className="p-2 text-sm text-slate-500">No subjects assigned to this class</div>
              ) : (
                subjects.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Select 
            onValueChange={(v) => setSelected({ ...selected, progressFilter: v })}
            value={selected.progressFilter}
          >
            <SelectTrigger><SelectValue placeholder="Progress Filter" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              <SelectItem value="0_completed">0% Completed</SelectItem>
              <SelectItem value="below_25">Below 25%</SelectItem>
              <SelectItem value="25_50">25% - 50%</SelectItem>
              <SelectItem value="50_75">50% - 75%</SelectItem>
              <SelectItem value="75_99">75% - 99%</SelectItem>
              <SelectItem value="100_completed">100% Completed</SelectItem>
              <SelectItem value="top_5">Top 5 Progress</SelectItem>
              <SelectItem value="bottom_5">Bottom 5 Progress</SelectItem>
              <SelectItem value="pending_gt_5">Pending Chapters &gt; 5</SelectItem>
              <SelectItem value="checked_gt_5">Checked Chapters &gt; 5</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button onClick={handleGenerate} disabled={!selected.classId || !selected.subject} className="flex-1">
              Generate Analytics
            </Button>
            <Button variant="outline" onClick={exportExcel} disabled={!filteredGrid}>
              <FileDown className="h-4 w-4"/>
            </Button>
          </div>
        </div>
      </ErpSection>
      
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-2"><BookOpen className="h-5 w-5 text-fuchsia-600" /><span className="text-sm font-medium text-slate-600">Class</span></div>
            <div className="text-xl font-bold text-slate-900">{summary.className}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-2"><BookOpen className="h-5 w-5 text-fuchsia-600" /><span className="text-sm font-medium text-slate-600">Subject</span></div>
            <div className="text-xl font-bold text-slate-900">{summary.subject}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-2"><Users className="h-5 w-5 text-fuchsia-600" /><span className="text-sm font-medium text-slate-600">Total Students</span></div>
            <div className="text-xl font-bold text-slate-900">{summary.totalStudents}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-2"><BookOpen className="h-5 w-5 text-fuchsia-600" /><span className="text-sm font-medium text-slate-600">Total Chapters</span></div>
            <div className="text-xl font-bold text-slate-900">{summary.totalChapters}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-2"><TrendingUp className="h-5 w-5 text-fuchsia-600" /><span className="text-sm font-medium text-slate-600">Overall Progress</span></div>
            <div className="text-xl font-bold text-fuchsia-700">{summary.overallProgress}%</div>
          </div>
        </div>
      )}
      
      {filteredGrid && data && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 sticky top-0 z-20">
              <tr>
                <th className="p-3 font-semibold text-slate-700 min-w-[80px] sticky left-0 z-30 bg-slate-50 border-r border-slate-200">Roll No</th>
                <th className="p-3 font-semibold text-slate-700 min-w-[200px] sticky left-[80px] z-30 bg-slate-50 border-r border-slate-200">Student Name</th>
                <th className="p-3 font-semibold text-slate-700 min-w-[100px] sticky left-[280px] z-30 bg-slate-50 border-r border-slate-200">Progress %</th>
                {Array.from({ length: data.totalChapters }, (_, i) => {
                  const chapterNum = i + 1;
                  const isUnlocked = data.unlockedChapters?.includes(chapterNum);
                  const cp = data.chapterProgress?.find(c => c.chapterNumber === chapterNum);
                  return (
                    <th key={i} className="p-2 text-center font-semibold text-slate-600 min-w-[100px]">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1">
                          {isUnlocked ? (
                            <span className="text-emerald-600">☑</span>
                          ) : (
                            <span className="text-slate-400">☐</span>
                          )}
                          <span>Ch {chapterNum}</span>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {isUnlocked && cp ? `${cp.checkedCount}/${cp.totalStudents}` : 'Locked'}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredGrid.map((student) => (
                <tr key={student.studentId} className="hover:bg-slate-50/50">
                  <td className="p-3 font-medium text-slate-900 sticky left-0 z-10 bg-white border-r border-slate-200">{student.rollNo}</td>
                  <td className="p-3 font-medium text-slate-900 sticky left-[80px] z-10 bg-white border-r border-slate-200">{student.name}</td>
                  <td className="p-3 font-bold text-fuchsia-700 sticky left-[280px] z-10 bg-white border-r border-slate-200">{student.progressPercentage}%</td>
                  {student.chapters.map((ch) => {
                    const isUnlocked = data.unlockedChapters?.includes(ch.chapterNumber);
                    return (
                      <td key={ch.chapterNumber} className="p-2 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold ${getStatusColor(ch.status)} ${!isUnlocked ? 'opacity-40' : ''}`}>
                          {getStatusIcon(ch.status)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageStack>
  );
}