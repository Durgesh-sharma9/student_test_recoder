import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown, FileCheck, Users, BookOpen, TrendingUp, Lock, Unlock } from 'lucide-react';

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
      unlockedChapterPerformance: analyticsData.unlockedChapterPerformance || 0,
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

  const getStatusBadge = (status, isUnlocked) => {
    if (!isUnlocked) {
      return (
        <span className="inline-flex items-center justify-center gap-1 px-1.5 md:px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-50 text-slate-400 border border-slate-200/50 select-none">
          <Lock className="h-2.5 w-2.5" />
          <span className="hidden md:inline">Locked</span>
        </span>
      );
    }
    if (status === 'Checked') {
      return (
        <span className="inline-flex items-center justify-center gap-1 px-1.5 md:px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/50 select-none">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
          <span className="hidden md:inline">Checked</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center gap-1 px-1.5 md:px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/50 select-none">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        <span className="hidden md:inline">Pending</span>
      </span>
    );
  };

  return (
    <PageStack>
      <PageHeader title="Notebook Analytics" description="Track school-wide notebook submission progress" />
      
      {/* Compact Filters Section */}
      <ErpSection title="Filters" icon={FileCheck} tone="green">
        <div className="rounded-lg border border-emerald-100 bg-white shadow-sm overflow-hidden">
          <div className="grid gap-2 grid-cols-2 md:grid-cols-3 p-2 md:p-3">
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] md:text-xs font-semibold text-slate-600">Class</label>
              <Select onValueChange={(v) => setSelected({ ...selected, classId: v })}>
                <SelectTrigger className="h-9 text-xs md:text-sm px-2"><SelectValue placeholder="Class" /></SelectTrigger>
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
            </div>

            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] md:text-xs font-semibold text-slate-600">Subject</label>
              <Select 
                onValueChange={(v) => setSelected({ ...selected, subject: v })}
                disabled={!selected.classId}
              >
                <SelectTrigger className="h-9 text-xs md:text-sm px-2"><SelectValue placeholder={selected.classId ? "Subject" : "Select Class"} /></SelectTrigger>
                <SelectContent>
                  {subjects.length === 0 && selected.classId ? (
                    <div className="p-2 text-sm text-slate-500">No subjects</div>
                  ) : (
                    subjects.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-0.5 col-span-2 md:col-span-1">
              <label className="text-[10px] md:text-xs font-semibold text-slate-600">Progress Filter</label>
              <Select 
                onValueChange={(v) => setSelected({ ...selected, progressFilter: v })}
                value={selected.progressFilter}
              >
                <SelectTrigger className="h-9 text-xs md:text-sm px-2"><SelectValue placeholder="Filter" /></SelectTrigger>
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
                  <SelectItem value="pending_gt_5">Pending &gt; 5</SelectItem>
                  <SelectItem value="checked_gt_5">Checked &gt; 5</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Compact Bottom Actions */}
          <div className="border-t border-emerald-50 bg-gradient-to-r from-emerald-50/30 to-emerald-50/70 p-2 md:p-2.5 px-3 flex justify-end gap-2">
            <Button variant="outline" onClick={exportExcel} disabled={!filteredGrid} className="border-emerald-200 text-emerald-700 hover:bg-emerald-100 h-8 px-2 md:px-3">
              <FileDown className="h-4 w-4"/>
            </Button>
            <Button size="sm" onClick={handleGenerate} disabled={!selected.classId || !selected.subject} className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3 md:px-4 text-xs font-medium shadow-sm">
              Generate
            </Button>
          </div>
        </div>
      </ErpSection>
      
      {/* Compact Summary Cards Grid with Gradients on ALL boxes */}
      {summary && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
          <div className="rounded-lg border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-green-50/80 p-2 md:p-3 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-1 md:gap-1.5 mb-1 md:mb-1.5">
              <BookOpen className="h-3 w-3 md:h-4 md:w-4 text-emerald-600 shrink-0" />
              <span className="text-[10px] md:text-xs font-medium text-slate-600 truncate">Class</span>
            </div>
            <div className="text-xs md:text-lg font-bold text-slate-800 leading-none truncate">{summary.className}</div>
          </div>
          <div className="rounded-lg border border-teal-100 bg-gradient-to-br from-teal-50/80 to-cyan-50/80 p-2 md:p-3 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-1 md:gap-1.5 mb-1 md:mb-1.5">
              <BookOpen className="h-3 w-3 md:h-4 md:w-4 text-emerald-600 shrink-0" />
              <span className="text-[10px] md:text-xs font-medium text-slate-600 truncate">Subject</span>
            </div>
            <div className="text-xs md:text-lg font-bold text-slate-800 leading-none truncate">{summary.subject}</div>
          </div>
          <div className="rounded-lg border border-green-100 bg-gradient-to-br from-green-50/80 to-emerald-50/80 p-2 md:p-3 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-1 md:gap-1.5 mb-1 md:mb-1.5">
              <Users className="h-3 w-3 md:h-4 md:w-4 text-emerald-600 shrink-0" />
              <span className="text-[10px] md:text-xs font-medium text-slate-600 truncate">Students</span>
            </div>
            <div className="text-xs md:text-lg font-bold text-slate-800 leading-none">{summary.totalStudents}</div>
          </div>
          <div className="rounded-lg border border-cyan-100 bg-gradient-to-br from-cyan-50/80 to-blue-50/80 p-2 md:p-3 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-1 md:gap-1.5 mb-1 md:mb-1.5">
              <BookOpen className="h-3 w-3 md:h-4 md:w-4 text-emerald-600 shrink-0" />
              <span className="text-[10px] md:text-xs font-medium text-slate-600 truncate">Chapters</span>
            </div>
            <div className="text-xs md:text-lg font-bold text-slate-800 leading-none">{summary.totalChapters}</div>
          </div>
          <div className="rounded-lg border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-teal-50/80 p-2 md:p-3 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-1 md:gap-1.5 mb-1 md:mb-1.5">
              <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-emerald-600 shrink-0" />
              <span className="text-[10px] md:text-xs font-medium text-slate-600 truncate">Unlocked</span>
            </div>
            <div className="text-xs md:text-lg font-bold text-emerald-700 leading-none">{summary.unlockedChapterPerformance || 0}%</div>
          </div>
          <div className="rounded-lg border border-blue-100 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 p-2 md:p-3 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-1 md:gap-1.5 mb-1 md:mb-1.5">
              <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-blue-600 shrink-0" />
              <span className="text-[10px] md:text-xs font-medium text-slate-600 truncate">Progress</span>
            </div>
            <div className="text-xs md:text-lg font-bold text-blue-700 leading-none">{summary.overallProgress}%</div>
          </div>
        </div>
      )}
      
      {/* Compact Table */}
      {filteredGrid && data && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 sticky top-0 z-20">
              <tr>
                <th className="px-3 py-2.5 font-semibold text-slate-600 text-xs min-w-[70px] md:sticky md:left-0 md:z-30 bg-slate-50 border-r border-slate-200">Roll No</th>
                <th className="px-3 py-2.5 font-semibold text-slate-600 text-xs min-w-[150px] md:sticky md:left-[70px] md:z-30 bg-slate-50 border-r border-slate-200">Student Name</th>
                <th className="px-3 py-2.5 font-semibold text-slate-600 text-xs min-w-[80px] md:sticky md:left-[220px] md:z-30 bg-slate-50 border-r border-slate-200">Progress</th>
                {Array.from({ length: data.totalChapters }, (_, i) => {
                  const chapterNum = i + 1;
                  const isUnlocked = data.unlockedChapters?.includes(chapterNum);
                  const cp = data.chapterProgress?.find(c => c.chapterNumber === chapterNum);
                  return (
                    <th key={i} className="px-2 py-2.5 text-center font-semibold text-slate-600 min-w-[60px] md:min-w-[100px]">
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="flex items-center gap-1 text-xs justify-center">
                          {isUnlocked ? (
                            <Unlock className="h-3 w-3 text-emerald-500 shrink-0" />
                          ) : (
                            <Lock className="h-3 w-3 text-slate-400 shrink-0" />
                          )}
                          <span className="font-bold">Ch {chapterNum}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-normal">
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
                  <td className="px-3 py-2 text-sm font-medium text-slate-800 md:sticky md:left-0 md:z-10 bg-white border-r border-slate-200">{student.rollNo}</td>
                  <td className="px-3 py-2 text-sm font-medium text-slate-800 md:sticky md:left-[70px] md:z-10 bg-white border-r border-slate-200">{student.name}</td>
                  <td className="px-3 py-2 text-sm font-bold text-emerald-600 md:sticky md:left-[220px] md:z-10 bg-white border-r border-slate-200">{student.progressPercentage}%</td>
                  {student.chapters.map((ch) => {
                    const isUnlocked = data.unlockedChapters?.includes(ch.chapterNumber);
                    return (
                      <td key={ch.chapterNumber} className="px-2 py-1.5 text-center">
                        {getStatusBadge(ch.status, isUnlocked)}
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