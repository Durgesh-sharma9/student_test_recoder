import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, Search, Calendar, Filter, Download, Printer, X, 
  TrendingUp, Award, BookOpen, Target, BrainCircuit, XCircle, FileText,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AssessmentTypeMultiSelect from '@/components/AssessmentTypeMultiSelect';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function StudentPerformance() {
  // State for Filters
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fixed Assessment Type (Automatically fetch all data)
  const [assessmentType, setAssessmentType] = useState('All Assessments');
  const [examTypes, setExamTypes] = useState(['All Exams']);
  const [availableExamTypes, setAvailableExamTypes] = useState([]);
  
  const [dateRange, setDateRange] = useState('All Time');
  const [specificDate, setSpecificDate] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
   
  // State for Data
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState([]);
  
  // State for Drawer & UI Controls
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeStudent, setActiveStudent] = useState(null);
  const [activeTab, setActiveTab] = useState('daily');
  const [timelineOpen, setTimelineOpen] = useState(false);

  // Fetch Classes on Mount
  useEffect(() => {
    fetchClasses();
  }, []);

  // Fetch Exam Types when Class changes
  useEffect(() => {
    if (selectedClass) fetchExamTypes(selectedClass);
    else setAvailableExamTypes([]);
  }, [selectedClass]);

  const fetchClasses = async () => {
    try {
      const { data } = await api.get('/classes');
      setClasses(data.classes || []);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
      toast.error('Failed to fetch classes');
    }
  };

  const fetchExamTypes = async (classId) => {
    try {
      const { data } = await api.get(`/student-performance/exam-types?classId=${classId}`);
      setAvailableExamTypes(['All Exams', ...(data.examTypes || [])]);
    } catch (error) {
      console.error('Failed to fetch exam types:', error);
    }
  };

  const handleGenerateAnalytics = async () => {
    if (!selectedClass) {
      return toast.warning('Please select a class first.');
    }

    setLoading(true);
    try {
      const params = {
        classId: selectedClass,
        assessmentType: 'All Assessments', // Fetch all assessments (Daily Test with date filter, Main Exam without date filter)
        examTypes: examTypes.join(','),
        dateRange: dateRange,
        specificDate: specificDate,
        dateFrom: dateFrom,
        dateTo: dateTo
      };

      const { data } = await api.get('/student-performance/analytics', { params });
      
      setAnalyticsData(data.data || []);
      if(data.data?.length === 0) toast.info('No data found for selected class.');
    } catch (error) {
      console.error('Failed to generate analytics:', error);
      toast.error('Failed to generate analytics');
    } finally {
      setLoading(false);
    }
  };

  const openStudentDetails = (student) => {
    setActiveStudent(student);
    setDrawerOpen(true);
    setTimelineOpen(false); 
  };

  // Pre-calculate Section-Wise Ranks (Backend now handles all filtering and calculations)
  const enrichedData = useMemo(() => {
    if (!analyticsData.length) return [];
    
    let processed = analyticsData.map(student => {
      // Deep clone to prevent mutating original backend response
      let s = JSON.parse(JSON.stringify(student));
      return s;
    });
    
    // Helper to calculate dense ranking for a specific metric
    const assignRank = (key, rankKey) => {
      processed.sort((a, b) => (b[key] || 0) - (a[key] || 0));
      let currentRank = 1;
      for (let i = 0; i < processed.length; i++) {
        if (i > 0 && processed[i][key] < processed[i - 1][key]) {
          currentRank = i + 1;
        }
        processed[i][rankKey] = currentRank;
      }
    };

    assignRank('dailyPercentage', 'dailyRank');
    assignRank('mainPercentage', 'mainRank');
    assignRank('notebookPercentage', 'notebookRank');
    
    return processed;
  }, [analyticsData]);

  // Filter Data for Table Display (Always strictly Roll No order)
  const filteredTableData = useMemo(() => {
    let data = [...enrichedData];
    
    // Apply search filter
    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      data = data.filter(s => 
        s.name.toLowerCase().includes(lowerQ) || 
        s.rollNo.toString().toLowerCase().includes(lowerQ)
      );
    }
    
    // Always Sort strictly by Roll Number
    data.sort((a, b) => {
      const numA = parseInt(a.rollNo.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.rollNo.replace(/\D/g, '')) || 0;
      return numA - numB;
    });
    
    return data;
  }, [enrichedData, searchQuery]);

  // Export & Print Logic
  const handlePrint = () => window.print();

  const handleExportCSV = () => {
    if (!filteredTableData.length) return toast.warning('No data to export');
    const headers = ['Roll No', 'Student Name', 'Daily Test %', 'Daily Rank', 'Main Exam %', 'Main Rank', 'Notebook %', 'Notebook Rank'];
    const csvContent = [
      headers.join(','),
      ...filteredTableData.map(s => [
        s.rollNo, 
        `"${s.name}"`, 
        s.dailyPercentage?.toFixed(2) || 0,
        s.dailyRank || 'N/A',
        s.mainPercentage?.toFixed(2) || 0,
        s.mainRank || 'N/A',
        s.notebookPercentage?.toFixed(2) || 0,
        s.notebookRank || 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'student_performance.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    if (!filteredTableData.length) return toast.warning('No data to export');
    
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Student Performance Report', 14, 22);
    doc.setFontSize(11);
    doc.text(`Class: ${classes.find(c => c._id === selectedClass)?.className || 'N/A'}`, 14, 32);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 40);

    const tableData = filteredTableData.map(s => [
      s.rollNo,
      s.name,
      s.dailyPercentage?.toFixed(1) + '%',
      s.dailyRank,
      s.mainPercentage?.toFixed(1) + '%',
      s.mainRank,
      s.notebookPercentage?.toFixed(1) + '%',
      s.notebookRank
    ]);

    autoTable(doc, {
      head: [['Roll No', 'Student Name', 'Daily Test %', 'Daily Rank', 'Main Exam %', 'Main Rank', 'Notebook %', 'Notebook Rank']],
      body: tableData,
      startY: 50,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save('student_performance.pdf');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Student Performance</h1>
          <p className="text-sm text-slate-500 mt-1">Comprehensive academic analytics and tracking.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="shadow-sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
          <Button variant="outline" className="shadow-sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button variant="outline" className="shadow-sm" onClick={handleExportPDF}>
            <FileText className="h-4 w-4 mr-2" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <Filter className="h-5 w-5 text-indigo-500" />
          <h2 className="text-base font-semibold text-slate-800">Analytics Filters</h2>
        </div>
        
        {/* REDESIGNED 3-COLUMN FILTER LAYOUT */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          
          {/* 1. Class Dropdown */}
          <div>
            <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-1.5 block ml-1">
              Select Class <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                className="w-full h-11 pl-4 pr-10 appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none font-medium cursor-pointer hover:bg-slate-100"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="">-- Choose Class --</option>
                {classes.map(c => (
                  <option key={c._id} value={c._id}>{c.className} - {c.section}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* 2. Date Range for Daily Test Only */}
          <div>
            <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-1.5 block ml-1">
              Daily Test Date Filter
            </label>
            <div className="relative">
              <select
                className="w-full h-11 pl-4 pr-10 appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none font-medium cursor-pointer hover:bg-slate-100"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option value="All Time">All Time</option>
                <option value="Today">Today</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
                <option value="This Year">This Year</option>
                <option value="Specific Date">Specific Date</option>
                <option value="Date Range">Date Range</option>
              </select>
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* 3. Generate Analytics Button */}
          <div className="w-full pb-0.5">
            <Button 
              onClick={handleGenerateAnalytics} 
              disabled={loading || !selectedClass}
              className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md shadow-indigo-200 transition-all"
            >
              {loading ? 'Generating...' : 'Generate Analytics'}
            </Button>
          </div>

          {/* COMMENTED OUT: Assessment Type Dropdown */}
          {/*
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Assessment Type</label>
            <select
              className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={assessmentType}
              onChange={(e) => { setAssessmentType(e.target.value); setExamTypes(['All Exams']); }}
            >
              <option value="All Assessments">All Assessments</option>
              <option value="Daily Test">Daily Test</option>
              <option value="Main Exam">Main Exam</option>
              <option value="Notebook Checking">Notebook Checking</option>
            </select>
          </div>
          */}

          {/* COMMENTED OUT: Sort By Dropdown */}
          {/*
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Sort By</label>
            <select
              className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="rollNo">Roll Number</option>
              <option value="rank">Rank</option>
            </select>
          </div>
          */}

        </div>

        {/* Extended Date Filters */}
        {(dateRange === 'Specific Date' || dateRange === 'Date Range') && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 pt-5 border-t border-slate-100">
            {dateRange === 'Specific Date' && (
              <div>
                <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-1.5 block ml-1">Specific Date</label>
                <input
                  type="date"
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none font-medium"
                  value={specificDate}
                  onChange={(e) => setSpecificDate(e.target.value)}
                />
              </div>
            )}

            {dateRange === 'Date Range' && (
              <>
                <div>
                  <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-1.5 block ml-1">From Date</label>
                  <input
                    type="date"
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none font-medium"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-1.5 block ml-1">To Date</label>
                  <input
                    type="date"
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none font-medium"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Results Table Section */}
      {filteredTableData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print-container">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h3 className="font-semibold text-slate-800">Performance Report</h3>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search by name or roll no..." 
                className="pl-9 h-9 text-sm rounded-lg bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-semibold">Roll No</th>
                  <th className="px-6 py-4 font-semibold">Student Name</th>
                  <th className="px-6 py-4 font-semibold text-center">Daily Test %</th>
                  <th className="px-6 py-4 font-semibold text-center">Main Exam %</th>
                  <th className="px-6 py-4 font-semibold text-center">Notebook %</th>
                  <th className="px-6 py-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTableData.map((student) => (
                  <tr key={student._id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-900">{student.rollNo}</td>
                    <td className="px-6 py-3 font-medium text-slate-700">{student.name}</td>
                    <td className="px-6 py-3 text-center text-slate-600 font-medium">{student.dailyPercentage?.toFixed(1) || 0}%</td>
                    <td className="px-6 py-3 text-center text-slate-600 font-medium">{student.mainPercentage?.toFixed(1) || 0}%</td>
                    <td className="px-6 py-3 text-center text-slate-600 font-medium">{student.notebookPercentage?.toFixed(1) || 0}%</td>
                    <td className="px-6 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => openStudentDetails(student)} className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Centered Modal for Student Details */}
      {drawerOpen && activeStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-all p-4">
          <div className="w-full max-w-[90%] max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
            
            {/* Sticky Student Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  {activeStudent.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{activeStudent.name}</h2>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                    <p className="text-xs font-medium text-slate-600">
                      <span className="text-slate-400">Roll:</span> {activeStudent.rollNo}
                    </p>
                    <p className="text-xs font-medium text-slate-600">
                      <span className="text-slate-400">Class:</span> {classes.find(c => c._id === selectedClass)?.className || 'N/A'}
                    </p>
                    <p className="text-xs font-medium text-slate-600">
                      <span className="text-slate-400">Section:</span> {classes.find(c => c._id === selectedClass)?.section || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={handlePrint} className="text-slate-600 hover:text-slate-800 hover:bg-slate-100 px-3">
                  <Printer className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleExportPDF} className="text-slate-600 hover:text-slate-800 hover:bg-slate-100 px-3">
                  <FileText className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleExportCSV} className="text-slate-600 hover:text-slate-800 hover:bg-slate-100 px-3">
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(false)} className="rounded-full hover:bg-slate-100 ml-2">
                  <X className="h-5 w-5 text-slate-500" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Performance Summary Cards (Section-Wise Ranks Included) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* COMMENTED OUT: Overall Rank Card */}
                {/*
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl border border-indigo-200 shadow-sm flex flex-col justify-center items-center">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="h-5 w-5 text-indigo-600" />
                    <p className="text-sm font-semibold text-indigo-700 uppercase tracking-wide">Rank</p>
                  </div>
                  <p className="text-4xl font-bold text-indigo-900">#{activeStudent.rank}</p>
                </div>
                */}

                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-xl border border-emerald-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-emerald-600" />
                    <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Daily Test</p>
                  </div>
                  <p className="text-3xl font-bold text-emerald-900">{activeStudent.dailyPercentage?.toFixed(1) || 0}%</p>
                  <p className="text-[11px] font-medium text-emerald-700 mt-1">Rank #{activeStudent.dailyRank || '-'} &bull; {activeStudent.dailyStats?.attempted || 0} attempted</p>
                  <div className="w-full bg-emerald-200 rounded-full h-2 mt-2">
                    <div className="bg-emerald-600 h-2 rounded-full transition-all" style={{ width: `${activeStudent.dailyPercentage || 0}%` }} />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-rose-50 to-rose-100 p-4 rounded-xl border border-rose-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="h-4 w-4 text-rose-600" />
                    <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide">Main Exam</p>
                  </div>
                  <p className="text-3xl font-bold text-rose-900">{activeStudent.mainPercentage?.toFixed(1) || 0}%</p>
                  <p className="text-[11px] font-medium text-rose-700 mt-1">Rank #{activeStudent.mainRank || '-'} &bull; {Object.keys(activeStudent.mainByExamType || {}).length} exams</p>
                  <div className="w-full bg-rose-200 rounded-full h-2 mt-2">
                    <div className="bg-rose-600 h-2 rounded-full transition-all" style={{ width: `${activeStudent.mainPercentage || 0}%` }} />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-sky-50 to-sky-100 p-4 rounded-xl border border-sky-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="h-4 w-4 text-sky-600" />
                    <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide">Notebook</p>
                  </div>
                  <p className="text-3xl font-bold text-sky-900">{activeStudent.notebookPercentage?.toFixed(1) || 0}%</p>
                  <p className="text-[11px] font-medium text-sky-700 mt-1">Rank #{activeStudent.notebookRank || '-'} &bull; {activeStudent.notebookStats?.checkedChapters || 0} checked</p>
                  <div className="w-full bg-sky-200 rounded-full h-2 mt-2">
                    <div className="bg-sky-600 h-2 rounded-full transition-all" style={{ width: `${activeStudent.notebookPercentage || 0}%` }} />
                  </div>
                </div>
              </div>

              {/* Subject Performance Overview */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-slate-500" />
                  <h3 className="font-semibold text-slate-800 text-sm">Subject Performance Overview</h3>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-h-72 overflow-y-auto pr-2">
                    {activeStudent.subjectAnalytics.map(subj => (
                      <div key={subj.subject} className="bg-slate-50 rounded-xl p-3 border border-slate-200 hover:border-indigo-300 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-700">{subj.subject}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            subj.average >= 80 ? 'bg-emerald-100 text-emerald-700' :
                            subj.average >= 60 ? 'bg-sky-100 text-sky-700' :
                            subj.average >= 40 ? 'bg-amber-100 text-amber-700' :
                            'bg-rose-100 text-rose-700'
                          }`}>{subj.average.toFixed(0)}%</span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] text-slate-500">
                            <span>Daily</span>
                            <span className="font-medium">{subj.dailyTestAvg.toFixed(0)}%</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500">
                            <span>Main</span>
                            <span className="font-medium">{subj.mainExamAvg.toFixed(0)}%</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500">
                            <span>Notebook</span>
                            <span className="font-medium">{subj.notebookPercent.toFixed(0)}%</span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                          <div className="bg-indigo-600 h-1.5 rounded-full transition-all" style={{ width: `${subj.average}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              </div>

              {/* Assessment Breakdown Tabs */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex border-b border-slate-200">
                  <button
                    onClick={() => setActiveTab('daily')}
                    className={`flex-1 px-4 py-2.5 text-xs font-semibold transition-colors ${activeTab === 'daily' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    Daily Test
                  </button>
                  <button
                    onClick={() => setActiveTab('main')}
                    className={`flex-1 px-4 py-2.5 text-xs font-semibold transition-colors ${activeTab === 'main' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    Main Exam
                  </button>
                  <button
                    onClick={() => setActiveTab('notebook')}
                    className={`flex-1 px-4 py-2.5 text-xs font-semibold transition-colors ${activeTab === 'notebook' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    Notebook
                  </button>
                </div>
                
                <div className="p-4">
                  {/* Daily Test Tab Content */}
                  {activeTab === 'daily' && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-4 gap-3">
                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                          <p className="text-xs font-medium text-slate-600">Average</p>
                          <p className="text-2xl font-bold text-emerald-600">{activeStudent.dailyStats.average.toFixed(1)}%</p>
                        </div>
                        <div className="bg-sky-50 p-4 rounded-xl border border-sky-200">
                          <p className="text-xs font-medium text-slate-600">Highest</p>
                          <p className="text-2xl font-bold text-sky-600">{activeStudent.dailyStats.highest.toFixed(1)}%</p>
                        </div>
                        <div className="bg-rose-50 p-4 rounded-xl border border-rose-200">
                          <p className="text-xs font-medium text-slate-600">Lowest</p>
                          <p className="text-2xl font-bold text-rose-600">{activeStudent.dailyStats.lowest.toFixed(1)}%</p>
                        </div>
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                          <p className="text-xs font-medium text-slate-600">Attendance</p>
                          <p className="text-2xl font-bold text-amber-600">{activeStudent.dailyStats?.total > 0 ? ((activeStudent.dailyStats.attempted / activeStudent.dailyStats.total) * 100).toFixed(0) : 0}%</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <p className="text-xs font-medium text-slate-600">Attempted</p>
                          <p className="text-lg font-bold text-slate-800">{activeStudent.dailyStats.attempted}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <p className="text-xs font-medium text-slate-600">Missed</p>
                          <p className="text-lg font-bold text-slate-800">{activeStudent.dailyStats.missed}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <p className="text-xs font-medium text-slate-600">Total Tests</p>
                          <p className="text-lg font-bold text-slate-800">{activeStudent.dailyStats.total}</p>
                        </div>
                      </div>

                      {activeStudent.dailyStats.history && activeStudent.dailyStats.history.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-700 mb-2">Recent Daily Test History</p>
                          <div className="max-h-48 overflow-y-auto">
                            <table className="w-full text-xs text-left">
                              <thead className="text-[10px] text-slate-500 uppercase bg-slate-50 border-b border-slate-100 sticky top-0">
                                <tr>
                                  <th className="px-3 py-2 font-semibold">Date</th>
                                  <th className="px-3 py-2 font-semibold">Subject</th>
                                  <th className="px-3 py-2 font-semibold text-center">Marks</th>
                                  <th className="px-3 py-2 font-semibold text-center">%</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[...activeStudent.dailyStats.history].reverse().slice(0, 10).map((item, idx) => (
                                  <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50">
                                    <td className="px-3 py-2 text-slate-600">{new Date(item.date).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</td>
                                    <td className="px-3 py-2 font-medium text-slate-700">{item.subject}</td>
                                    <td className="px-3 py-2 text-center text-slate-600">{item.marksObtained}/{item.maxMarks}</td>
                                    <td className="px-3 py-2 text-center font-bold text-emerald-600">{item.percentage.toFixed(1)}%</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Main Exam Tab Content */}
                  {activeTab === 'main' && (
                    <div className="space-y-4">
                      {Object.keys(activeStudent.mainByExamType || {}).length > 0 ? (
                        <div className="grid grid-cols-2 gap-4">
                          {Object.entries(activeStudent.mainByExamType).map(([examType, data]) => (
                            <div key={examType} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                              <div className="flex justify-between items-center mb-3">
                                <span className="text-sm font-bold text-slate-800">{examType}</span>
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                    data.grade === 'A+' ? 'bg-emerald-100 text-emerald-700' :
                                    data.grade === 'A' ? 'bg-sky-100 text-sky-700' :
                                    data.grade === 'B+' ? 'bg-indigo-100 text-indigo-700' :
                                    data.grade === 'B' ? 'bg-purple-100 text-purple-700' :
                                    data.grade === 'C' ? 'bg-amber-100 text-amber-700' :
                                    data.grade === 'D' ? 'bg-orange-100 text-orange-700' :
                                    'bg-rose-100 text-rose-700'
                                  }`}>{data.grade}</span>
                                  <span className="text-lg font-bold text-rose-600">{data.percentage.toFixed(1)}%</span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center text-xs text-slate-500 mb-3">
                                <span>Obtained: {data.totalObtained} / {data.totalMax}</span>
                                <span>Subjects: {data.count}</span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-2 mb-3">
                                <div className="bg-rose-600 h-2 rounded-full transition-all" style={{ width: `${data.percentage}%` }} />
                              </div>
                              
                              {(() => {
                                const subjectMarks = activeStudent.subjectAnalytics
                                  .filter(s => s.mainByExamType && s.mainByExamType[examType])
                                  .map(s => ({
                                    subject: s.subject,
                                    obtained: s.mainByExamType[examType].totalObtained,
                                    max: s.mainByExamType[examType].totalMax,
                                    percentage: s.mainByExamType[examType].totalMax > 0 
                                      ? (s.mainByExamType[examType].totalObtained / s.mainByExamType[examType].totalMax) * 100 
                                      : 0
                                  }));
                                return subjectMarks.length > 0 ? (
                                  <div className="space-y-2">
                                    <p className="text-[10px] font-semibold text-slate-600 uppercase">Subject-wise Marks</p>
                                    {subjectMarks.map(sm => (
                                      <div key={sm.subject} className="flex items-center justify-between text-xs">
                                        <span className="text-slate-600">{sm.subject}</span>
                                        <div className="flex items-center gap-2">
                                          <span className="text-slate-500">{sm.obtained}/{sm.max}</span>
                                          <span className="font-bold text-slate-700">{sm.percentage.toFixed(0)}%</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-sm font-medium text-slate-500">No Main Exam data available</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* REDESIGNED Notebook Tab Content */}
                  {activeTab === 'notebook' && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-5 gap-3">
                        <div className="bg-sky-50 p-4 rounded-xl border border-sky-200">
                          <p className="text-xs font-medium text-slate-600">Assigned</p>
                          <p className="text-2xl font-bold text-sky-600">{activeStudent.notebookStats?.totalChapters || 0}</p>
                        </div>
                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                          <p className="text-xs font-medium text-slate-600">Checked</p>
                          <p className="text-2xl font-bold text-emerald-600">{activeStudent.notebookStats?.checkedChapters || 0}</p>
                        </div>
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                          <p className="text-xs font-medium text-slate-600">Unlocked</p>
                          <p className="text-2xl font-bold text-amber-600">{activeStudent.notebookStats?.unlockedChapters || 0}</p>
                        </div>
                        <div className="bg-rose-50 p-4 rounded-xl border border-rose-200">
                          <p className="text-xs font-medium text-slate-600">Pending</p>
                          <p className="text-2xl font-bold text-rose-600">{activeStudent.notebookStats?.pendingChapters || 0}</p>
                        </div>
                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200">
                          <p className="text-xs font-medium text-slate-600">Completion</p>
                          <p className="text-2xl font-bold text-indigo-600">{activeStudent.notebookStats?.completionPercentage?.toFixed(0) || 0}%</p>
                        </div>
                      </div>
                      
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-semibold text-slate-700">Overall Completion</span>
                          <span className="text-lg font-bold text-sky-600">{activeStudent.notebookStats?.completionPercentage?.toFixed(1) || 0}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-3">
                          <div className="bg-sky-600 h-3 rounded-full transition-all" style={{ width: `${activeStudent.notebookStats?.completionPercentage || 0}%` }} />
                        </div>
                      </div>
                      
                      {activeStudent.subjectAnalytics && activeStudent.subjectAnalytics.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-700 mb-3">Subject-wise Notebook Completion</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {activeStudent.subjectAnalytics.map(subj => (
                              <div key={subj.subject} className="bg-slate-50 rounded-xl p-4 border border-slate-200 shadow-sm hover:border-sky-300 transition-colors">
                                <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200/60">
                                  <span className="text-sm font-bold text-slate-700 uppercase">{subj.subject}</span>
                                  <span className="text-lg font-bold text-sky-600">{subj.notebookPercent.toFixed(1)}%</span>
                                </div>
                                <div className="space-y-2 mb-4">
                                  <div className="flex justify-between items-center text-xs text-slate-600">
                                    <span className="font-medium">Total Chapters</span>
                                    <span className="font-bold text-slate-800">{subj.notebookData?.total || 0}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-xs text-slate-600">
                                    <span className="font-medium">Unlocked Chapters</span>
                                    <span className="font-bold text-slate-800">{subj.notebookData?.unlocked || 0}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-xs text-slate-600">
                                    <span className="font-medium">Checked Chapters</span>
                                    <span className="font-bold text-emerald-600">{subj.notebookData?.checked || 0}</span>
                                  </div>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2.5">
                                  <div className="bg-sky-600 h-2.5 rounded-full transition-all" style={{ width: `${subj.notebookPercent}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Subject-Wise Performance Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-4">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                  <Target className="h-4 w-4 text-slate-500" />
                  <h3 className="font-semibold text-slate-800 text-sm">
                    {activeTab === 'daily' && 'Daily Test Performance'}
                    {activeTab === 'main' && 'Main Exam Performance'}
                    {activeTab === 'notebook' && 'Notebook Completion'}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[10px] text-slate-500 uppercase bg-slate-50/80 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Subject</th>
                        {activeTab === 'daily' && <th className="px-4 py-3 font-semibold text-center">Daily %</th>}
                        {activeTab === 'main' && <th className="px-4 py-3 font-semibold text-center">Main %</th>}
                        {activeTab === 'notebook' && <th className="px-4 py-3 font-semibold text-center">Notebook %</th>}
                        {activeTab !== 'notebook' && <th className="px-4 py-3 font-semibold text-center">Grade</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const sortedSubjects = [...activeStudent.subjectAnalytics].sort((a, b) => {
                          if (activeTab === 'daily') return b.dailyTestAvg - a.dailyTestAvg;
                          if (activeTab === 'main') return b.mainExamAvg - a.mainExamAvg;
                          return b.notebookPercent - a.notebookPercent;
                        });
                        
                        const getGrade = (percentage) => {
                          if (percentage >= 90) return 'A+';
                          if (percentage >= 80) return 'A';
                          if (percentage >= 70) return 'B+';
                          if (percentage >= 60) return 'B';
                          if (percentage >= 50) return 'C';
                          if (percentage >= 40) return 'D';
                          return 'F';
                        };
                        
                        return sortedSubjects.map(subj => {
                          const val = activeTab === 'daily' ? subj.dailyTestAvg : activeTab === 'main' ? subj.mainExamAvg : subj.notebookPercent;
                          return (
                            <tr key={subj.subject} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-3 font-medium text-slate-700">{subj.subject}</td>
                              
                              {activeTab === 'daily' && <td className="px-4 py-3 text-center text-slate-600">{subj.dailyTestAvg.toFixed(1)}%</td>}
                              {activeTab === 'main' && <td className="px-4 py-3 text-center text-slate-600">{subj.mainExamAvg.toFixed(1)}%</td>}
                              {activeTab === 'notebook' && <td className="px-4 py-3 text-center font-bold text-sky-600">{subj.notebookPercent.toFixed(1)}%</td>}
                              
                              {activeTab !== 'notebook' && (
                                <td className="px-4 py-3 text-center">
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                    getGrade(val) === 'A+' ? 'bg-emerald-100 text-emerald-700' :
                                    getGrade(val) === 'A' ? 'bg-sky-100 text-sky-700' :
                                    getGrade(val) === 'B+' ? 'bg-indigo-100 text-indigo-700' :
                                    getGrade(val) === 'B' ? 'bg-purple-100 text-purple-700' :
                                    getGrade(val) === 'C' ? 'bg-amber-100 text-amber-700' :
                                    getGrade(val) === 'D' ? 'bg-orange-100 text-orange-700' :
                                    'bg-rose-100 text-rose-700'
                                  }`}>{getGrade(val)}</span>
                                </td>
                              )}
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Academic Activity Timeline */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-6">
                <div 
                  className="px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setTimelineOpen(!timelineOpen)}
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-indigo-500" />
                    <h3 className="font-semibold text-slate-800 text-sm">Academic Activity Timeline</h3>
                  </div>
                  <div>
                    {timelineOpen ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                  </div>
                </div>
                
                {timelineOpen && (
                  <div className="p-4 border-t border-slate-100 max-h-64 overflow-y-auto bg-slate-50/30">
                    {(() => {
                      const activities = [];
                      if (activeStudent.dailyStats?.history) {
                        activeStudent.dailyStats.history.forEach(item => {
                          activities.push({
                            type: 'Daily Test',
                            subject: item.subject,
                            date: item.date,
                            percentage: item.percentage,
                            marks: `${item.marksObtained}/${item.maxMarks}`,
                            status: 'Completed'
                          });
                        });
                      }
                      if (activeStudent.mainExamStats?.history) {
                        activeStudent.mainExamStats.history.forEach(item => {
                          activities.push({
                            type: item.examType,
                            subject: item.subject,
                            date: item.date,
                            percentage: item.percentage,
                            marks: `${item.marksObtained}/${item.maxMarks}`,
                            status: 'Completed'
                          });
                        });
                      }
                      activities.sort((a, b) => new Date(b.date) - new Date(a.date));
                      return activities.slice(0, 15).map((activity, idx) => (
                        <div key={idx} className="flex items-start gap-3 py-3 border-b border-slate-200 last:border-0 hover:bg-white rounded-lg px-2 -mx-2 transition-colors">
                          <div className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                            activity.type === 'Daily Test' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-bold text-slate-800">{activity.type}</span>
                              <span className="text-[10px] text-slate-500 font-medium">{new Date(activity.date).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-600 font-medium truncate">{activity.subject}</span>
                              <span className="text-slate-500">{activity.marks}</span>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                activity.percentage >= 80 ? 'bg-emerald-100 text-emerald-700' :
                                activity.percentage >= 60 ? 'bg-sky-100 text-sky-700' :
                                activity.percentage >= 40 ? 'bg-amber-100 text-amber-700' :
                                'bg-rose-100 text-rose-700'
                              }`}>{activity.status}</span>
                              <span className="text-xs font-bold text-slate-700">{activity.percentage.toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      ));
                    })()}
                    {(() => {
                      const hasDaily = activeStudent.dailyStats?.history?.length > 0;
                      const hasMain = activeStudent.mainExamStats?.history?.length > 0;
                      if (!hasDaily && !hasMain) {
                        return (
                          <div className="text-center py-8">
                            <p className="text-sm font-medium text-slate-500">No activity data available</p>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>

              {/* Recent Daily Test Performance Trend */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-6">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-slate-500" />
                  <h3 className="font-semibold text-slate-800 text-sm">Recent Daily Test Performance Trend</h3>
                </div>
                <div className="p-4">
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={(() => {
                        const allActivities = [];
                        if (activeStudent.dailyStats?.history) {
                          activeStudent.dailyStats.history.forEach(item => {
                            allActivities.push({
                              date: item.date,
                              percentage: item.percentage,
                              type: 'Daily Test'
                            });
                          });
                        }
                        allActivities.sort((a, b) => new Date(a.date) - new Date(b.date));
                        return allActivities;
                      })()}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} />
                        <YAxis tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} domain={[0, 100]} />
                        <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgb(0 0 0 / 0.1)', fontSize: '11px'}} formatter={(value) => [`${value.toFixed(1)}%`, 'Daily Test']} />
                        <Line type="monotone" dataKey="percentage" stroke="#0ea5e9" strokeWidth={2} dot={{fill: '#0ea5e9', r: 3, stroke: '#0ea5e9', strokeWidth: 2}} activeDot={{r: 5}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center mt-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-sky-500" />
                      <span className="text-xs text-slate-600 font-medium">Daily Test</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}