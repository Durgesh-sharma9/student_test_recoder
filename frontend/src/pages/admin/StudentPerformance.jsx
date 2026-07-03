import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, Search, Calendar, Filter, Download, Printer, X, 
  TrendingUp, Award, BookOpen, Target, BrainCircuit, XCircle, FileText
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
  const [assessmentType, setAssessmentType] = useState('All Assessments');
  const [examTypes, setExamTypes] = useState(['All Exams']);
  const [availableExamTypes, setAvailableExamTypes] = useState([]);
  const [dateRange, setDateRange] = useState('All Time');
  const [specificDate, setSpecificDate] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('rollNo');
  
  // State for Data
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState([]);
  
  // State for Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeStudent, setActiveStudent] = useState(null);
  const [activeTab, setActiveTab] = useState('daily');

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
        assessmentType: assessmentType,
        examTypes: examTypes.join(','),
        dateRange: dateRange
      };
      
      if (dateRange === 'Specific Date' && specificDate) {
        params.specificDate = specificDate;
      }
      if (dateRange === 'Date Range' && dateFrom && dateTo) {
        params.dateFrom = dateFrom;
        params.dateTo = dateTo;
      }

      const { data } = await api.get('/student-performance/analytics', { params });
      setAnalyticsData(data.data || []);
      if(data.data?.length === 0) toast.info('No data found for selected filters.');
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
  };

  // Export & Print Logic
  const handlePrint = () => window.print();

  const handleExportCSV = () => {
    if (!analyticsData.length) return toast.warning('No data to export');
    const headers = ['Roll No', 'Student Name', 'Overall %', 'Notebook %', 'Daily Test %', 'Main Exam %', 'Rank'];
    const csvContent = [
      headers.join(','),
      ...analyticsData.map(s => [
        s.rollNo, 
        `"${s.name}"`, 
        s.overallPercentage.toFixed(2),
        s.notebookPercentage.toFixed(2),
        s.dailyPercentage.toFixed(2),
        s.mainPercentage.toFixed(2),
        s.rank
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
    if (!analyticsData.length) return toast.warning('No data to export');
    
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Student Performance Report', 14, 22);
    doc.setFontSize(11);
    doc.text(`Class: ${classes.find(c => c._id === selectedClass)?.className || 'N/A'}`, 14, 32);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 40);

    const tableData = analyticsData.map(s => [
      s.rollNo,
      s.name,
      s.overallPercentage.toFixed(1) + '%',
      s.notebookPercentage.toFixed(1) + '%',
      s.dailyPercentage.toFixed(1) + '%',
      s.mainPercentage.toFixed(1) + '%',
      s.rank
    ]);

    autoTable(doc, {
      head: [['Roll No', 'Student Name', 'Overall %', 'Notebook %', 'Daily Test %', 'Main Exam %', 'Rank']],
      body: tableData,
      startY: 50,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save('student_performance.pdf');
  };

  // Filter Data for Table Display
  const filteredTableData = useMemo(() => {
    let data = analyticsData;
    
    // Apply search filter
    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      data = data.filter(s => 
        s.name.toLowerCase().includes(lowerQ) || 
        s.rollNo.toString().toLowerCase().includes(lowerQ)
      );
    }
    
    // Apply sorting
    if (sortBy === 'rollNo') {
      data = [...data].sort((a, b) => {
        const numA = parseInt(a.rollNo.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.rollNo.replace(/\D/g, '')) || 0;
        return numA - numB;
      });
    } else if (sortBy === 'rank') {
      data = [...data].sort((a, b) => a.rank - b.rank);
    } else if (sortBy === 'overall_desc') {
      data = [...data].sort((a, b) => b.overallPercentage - a.overallPercentage);
    } else if (sortBy === 'overall_asc') {
      data = [...data].sort((a, b) => a.overallPercentage - b.overallPercentage);
    } else if (sortBy === 'name') {
      data = [...data].sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return data;
  }, [analyticsData, searchQuery, sortBy]);

  // Chart Colors
  const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

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
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
          <Filter className="h-5 w-5 text-indigo-500" />
          <h2 className="text-base font-semibold text-slate-800">Analytics Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Class Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Select Class *</label>
            <select
              className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">-- Choose Class --</option>
              {classes.map(c => (
                <option key={c._id} value={c._id}>{c.className} - {c.section}</option>
              ))}
            </select>
          </div>

          {/* Assessment Type */}
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

          {/* Exam Multi-Select (only shown when Main Exam is selected) */}
          {assessmentType === 'Main Exam' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Select Exams</label>
              <AssessmentTypeMultiSelect
                options={availableExamTypes}
                value={examTypes}
                onChange={setExamTypes}
                allValue="All Exams"
                placeholder="Select exams"
              />
            </div>
          )}

          {/* Date Range (only shown for Daily Test) */}
          {assessmentType === 'Daily Test' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Date Range</label>
              <select
                className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
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
            </div>
          )}

          {dateRange === 'Specific Date' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Specific Date</label>
              <input
                type="date"
                className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
              />
            </div>
          )}

          {dateRange === 'Date Range' && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">From Date</label>
                <input
                  type="date"
                  className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">To Date</label>
                <input
                  type="date"
                  className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Sorting */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Sort By</label>
            <select
              className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="rollNo">Roll Number</option>
              <option value="rank">Rank</option>
              <option value="overall_desc">Overall % (High → Low)</option>
              <option value="overall_asc">Overall % (Low → High)</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button 
            onClick={handleGenerateAnalytics} 
            disabled={loading || !selectedClass}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200"
          >
            {loading ? 'Generating...' : 'Generate Analytics'}
          </Button>
        </div>
      </div>

      {/* Results Table Section */}
      {analyticsData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print-container">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h3 className="font-semibold text-slate-800">Performance Report</h3>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search by name or roll no..." 
                className="pl-9 h-9 text-sm rounded-lg bg-slate-50 border-slate-200"
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
                  <th className="px-6 py-4 font-semibold">Overall %</th>
                  {assessmentType === 'All Assessments' || assessmentType === 'Notebook Checking' ? <th className="px-6 py-4 font-semibold text-center">Notebook %</th> : null}
                  {assessmentType === 'All Assessments' || assessmentType === 'Daily Test' ? <th className="px-6 py-4 font-semibold text-center">Daily Test %</th> : null}
                  {assessmentType === 'All Assessments' || assessmentType === 'Main Exam' ? <th className="px-6 py-4 font-semibold text-center">Main Exam %</th> : null}
                  <th className="px-6 py-4 font-semibold text-center">Rank</th>
                  <th className="px-6 py-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTableData.map((student, idx) => (
                  <tr key={student._id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-900">{student.rollNo}</td>
                    <td className="px-6 py-3 font-medium text-slate-700">{student.name}</td>
                    <td className="px-6 py-3 font-bold text-indigo-600">{student.overallPercentage.toFixed(1)}%</td>
                    
                    {assessmentType === 'All Assessments' || assessmentType === 'Notebook Checking' ? 
                      <td className="px-6 py-3 text-center text-slate-600 font-medium">{student.notebookPercentage.toFixed(1)}%</td> : null}
                    
                    {assessmentType === 'All Assessments' || assessmentType === 'Daily Test' ? 
                      <td className="px-6 py-3 text-center text-slate-600 font-medium">{student.dailyPercentage.toFixed(1)}%</td> : null}
                    
                    {assessmentType === 'All Assessments' || assessmentType === 'Main Exam' ? 
                      <td className="px-6 py-3 text-center text-slate-600 font-medium">{student.mainPercentage.toFixed(1)}%</td> : null}
                    
                    <td className="px-6 py-3 text-center">
                      <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold ${student.rank === 1 ? 'bg-amber-100 text-amber-700' : student.rank <= 3 ? 'bg-slate-100 text-slate-700' : 'bg-indigo-50 text-indigo-700'}`}>
                        {student.rank}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => openStudentDetails(student)} className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredTableData.length === 0 && (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-slate-500">
                      No students found matching your criteria.
                    </td>
                  </tr>
                )}
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
                      <span className="text-slate-400">Rank:</span> #{activeStudent.rank}
                    </p>
                    <p className="text-xs font-medium text-slate-600">
                      <span className="text-slate-400">Class:</span> {classes.find(c => c._id === selectedClass)?.className || 'N/A'}
                    </p>
                    <p className="text-xs font-medium text-slate-600">
                      <span className="text-slate-400">Section:</span> {classes.find(c => c._id === selectedClass)?.section || 'N/A'}
                    </p>
                    <p className="text-xs font-medium text-slate-600">
                      <span className="text-slate-400">Overall:</span> {activeStudent.overallPercentage.toFixed(1)}%
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
              
              {/* Performance Summary Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl border border-indigo-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-indigo-600" />
                    <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Overall</p>
                  </div>
                  <p className="text-3xl font-bold text-indigo-900">{activeStudent.overallPercentage.toFixed(1)}%</p>
                  <p className="text-[10px] text-indigo-600 mt-1">Rank #{activeStudent.rank}</p>
                  <div className="w-full bg-indigo-200 rounded-full h-2 mt-2">
                    <div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: `${activeStudent.overallPercentage}%` }} />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-sky-50 to-sky-100 p-4 rounded-xl border border-sky-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="h-4 w-4 text-sky-600" />
                    <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide">Notebook</p>
                  </div>
                  <p className="text-3xl font-bold text-sky-900">{activeStudent.notebookPercentage.toFixed(1)}%</p>
                  <p className="text-[10px] text-sky-600 mt-1">{activeStudent.notebookStats?.checkedChapters || 0} checked</p>
                  <div className="w-full bg-sky-200 rounded-full h-2 mt-2">
                    <div className="bg-sky-600 h-2 rounded-full transition-all" style={{ width: `${activeStudent.notebookPercentage}%` }} />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-xl border border-emerald-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-emerald-600" />
                    <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Daily Test</p>
                  </div>
                  <p className="text-3xl font-bold text-emerald-900">{activeStudent.dailyPercentage.toFixed(1)}%</p>
                  <p className="text-[10px] text-emerald-600 mt-1">{activeStudent.dailyStats?.attempted || 0} attempted</p>
                  <div className="w-full bg-emerald-200 rounded-full h-2 mt-2">
                    <div className="bg-emerald-600 h-2 rounded-full transition-all" style={{ width: `${activeStudent.dailyPercentage}%` }} />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-rose-50 to-rose-100 p-4 rounded-xl border border-rose-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="h-4 w-4 text-rose-600" />
                    <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide">Main Exam</p>
                  </div>
                  <p className="text-3xl font-bold text-rose-900">{activeStudent.mainPercentage.toFixed(1)}%</p>
                  <p className="text-[10px] text-rose-600 mt-1">{Object.keys(activeStudent.mainByExamType || {}).length} exams</p>
                  <div className="w-full bg-rose-200 rounded-full h-2 mt-2">
                    <div className="bg-rose-600 h-2 rounded-full transition-all" style={{ width: `${activeStudent.mainPercentage}%` }} />
                  </div>
                </div>
              </div>

              {/* Subject Performance - Chart + Cards */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-slate-500" />
                  <h3 className="font-semibold text-slate-800 text-sm">Subject Performance</h3>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Professional Bar Chart */}
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={activeStudent.subjectAnalytics} margin={{ top: 10, right: 10, left: -20, bottom: 5 }} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                          <XAxis type="number" tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false} domain={[0, 100]} />
                          <YAxis dataKey="subject" type="category" tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false} width={60} />
                          <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgb(0 0 0 / 0.1)', fontSize: '12px'}} />
                          <Bar dataKey="average" name="Average %" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={16} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Right: Compact Subject Cards */}
                    <div className="grid grid-cols-2 gap-3 max-h-56 overflow-y-auto">
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
              </div>

              {/* Smart Insights - Comprehensive Cards */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                  <BrainCircuit className="h-4 w-4 text-slate-500" />
                  <h3 className="font-semibold text-slate-800 text-sm">Smart Insights</h3>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                        <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">Strongest</p>
                      </div>
                      <p className="text-sm font-bold text-slate-800">{activeStudent.insights.strongestSubject}</p>
                    </div>
                    <div className="bg-rose-50 p-3 rounded-lg border border-rose-200">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-3.5 w-3.5 text-rose-600" />
                        <p className="text-[10px] font-semibold text-rose-700 uppercase tracking-wide">Weakest</p>
                      </div>
                      <p className="text-sm font-bold text-slate-800">{activeStudent.insights.weakestSubject}</p>
                    </div>
                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Award className="h-3.5 w-3.5 text-amber-600" />
                        <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">Best Area</p>
                      </div>
                      <p className="text-sm font-bold text-slate-800">{activeStudent.insights.highestAssessment}</p>
                    </div>
                    <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="h-3.5 w-3.5 text-indigo-600" />
                        <p className="text-[10px] font-semibold text-indigo-700 uppercase tracking-wide">Needs Work</p>
                      </div>
                      <p className="text-sm font-bold text-slate-800">{activeStudent.insights.lowestAssessment}</p>
                    </div>
                    <div className="bg-sky-50 p-3 rounded-lg border border-sky-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Award className="h-3.5 w-3.5 text-sky-600" />
                        <p className="text-[10px] font-semibold text-sky-700 uppercase tracking-wide">Highest Score</p>
                      </div>
                      <p className="text-sm font-bold text-slate-800">{activeStudent.insights.highestScore.toFixed(1)}%</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="h-3.5 w-3.5 text-purple-600" />
                        <p className="text-[10px] font-semibold text-purple-700 uppercase tracking-wide">Lowest Score</p>
                      </div>
                      <p className="text-sm font-bold text-slate-800">{activeStudent.insights.lowestScore.toFixed(1)}%</p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Award className="h-3.5 w-3.5 text-orange-600" />
                        <p className="text-[10px] font-semibold text-orange-700 uppercase tracking-wide">Overall Rank</p>
                      </div>
                      <p className="text-sm font-bold text-slate-800">#{activeStudent.rank}</p>
                    </div>
                    <div className="bg-teal-50 p-3 rounded-lg border border-teal-200">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-3.5 w-3.5 text-teal-600" />
                        <p className="text-[10px] font-semibold text-teal-700 uppercase tracking-wide">Attendance</p>
                      </div>
                      <p className="text-sm font-bold text-slate-800">{activeStudent.dailyStats?.total > 0 ? ((activeStudent.dailyStats.attempted / activeStudent.dailyStats.total) * 100).toFixed(0) : 0}%</p>
                    </div>
                    <div className="bg-cyan-50 p-3 rounded-lg border border-cyan-200">
                      <div className="flex items-center gap-2 mb-1">
                        <BarChart3 className="h-3.5 w-3.5 text-cyan-600" />
                        <p className="text-[10px] font-semibold text-cyan-700 uppercase tracking-wide">Avg Marks</p>
                      </div>
                      <p className="text-sm font-bold text-slate-800">{activeStudent.dailyStats?.average.toFixed(1)}%</p>
                    </div>
                    <div className="bg-lime-50 p-3 rounded-lg border border-lime-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Award className="h-3.5 w-3.5 text-lime-600" />
                        <p className="text-[10px] font-semibold text-lime-700 uppercase tracking-wide">Highest</p>
                      </div>
                      <p className="text-sm font-bold text-slate-800">{activeStudent.dailyStats?.highest.toFixed(1)}%</p>
                    </div>
                    <div className="bg-pink-50 p-3 rounded-lg border border-pink-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="h-3.5 w-3.5 text-pink-600" />
                        <p className="text-[10px] font-semibold text-pink-700 uppercase tracking-wide">Lowest</p>
                      </div>
                      <p className="text-sm font-bold text-slate-800">{activeStudent.dailyStats?.lowest.toFixed(1)}%</p>
                    </div>
                    <div className="bg-violet-50 p-3 rounded-lg border border-violet-200">
                      <div className="flex items-center gap-2 mb-1">
                        <BookOpen className="h-3.5 w-3.5 text-violet-600" />
                        <p className="text-[10px] font-semibold text-violet-700 uppercase tracking-wide">Notebook</p>
                      </div>
                      <p className="text-sm font-bold text-slate-800">{activeStudent.notebookPercentage.toFixed(1)}%</p>
                    </div>
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
                        <>
                          <div>
                            <p className="text-xs font-semibold text-slate-700 mb-2">Recent Performance Trend</p>
                            <div className="h-36">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={activeStudent.dailyStats.history.slice(-10)}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                  <XAxis dataKey="date" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} />
                                  <YAxis tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} domain={[0, 100]} />
                                  <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgb(0 0 0 / 0.1)', fontSize: '11px'}} />
                                  <Line type="monotone" dataKey="percentage" stroke="#10b981" strokeWidth={2} dot={{fill: '#10b981', r: 3}} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
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
                        </>
                      )}
                    </div>
                  )}
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
                              {/* Subject-wise marks for this exam */}
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
                      {activeStudent.mainExamStats?.history && activeStudent.mainExamStats.history.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-700 mb-2">Main Exam Trend</p>
                          <div className="h-36">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={activeStudent.mainExamStats.history}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} />
                                <YAxis tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} domain={[0, 100]} />
                                <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgb(0 0 0 / 0.1)', fontSize: '11px'}} />
                                <Line type="monotone" dataKey="percentage" stroke="#f43f5e" strokeWidth={2} dot={{fill: '#f43f5e', r: 3}} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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
                       <>
                          <div>
                            <p className="text-xs font-semibold text-slate-700 mb-3">Subject-wise Notebook Completion</p>
                            <div className="grid grid-cols-2 gap-3">
                              {activeStudent.subjectAnalytics.map(subj => (
                                <div key={subj.subject} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-bold text-slate-700">{subj.subject}</span>
                                    <span className="text-lg font-bold text-sky-600">{subj.notebookPercent.toFixed(0)}%</span>
                                  </div>
                                  <div className="flex justify-between items-center text-xs text-slate-500 mb-3">
                                    <span>Checked: {subj.notebookData?.checked || 0}</span>
                                    <span>Total: {subj.notebookData?.total || 0}</span>
                                  </div>
                                  <div className="w-full bg-slate-200 rounded-full h-2">
                                    <div className="bg-sky-600 h-2 rounded-full transition-all" style={{ width: `${subj.notebookPercent}%` }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          {/* Notebook completion graph */}
                          <div>
                            <p className="text-xs font-semibold text-slate-700 mb-2">Notebook Completion by Subject</p>
                            <div className="h-40">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={activeStudent.subjectAnalytics.map(s => ({ subject: s.subject, completion: s.notebookPercent }))} layout="vertical">
                                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                  <XAxis type="number" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} domain={[0, 100]} />
                                  <YAxis dataKey="subject" type="category" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} width={60} />
                                  <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgb(0 0 0 / 0.1)', fontSize: '11px'}} />
                                  <Bar dataKey="completion" name="Completion %" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={16} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Subject Performance Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                  <Target className="h-4 w-4 text-slate-500" />
                  <h3 className="font-semibold text-slate-800 text-sm">Subject-wise Performance</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[10px] text-slate-500 uppercase bg-slate-50/80 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Subject</th>
                        <th className="px-4 py-3 font-semibold text-center">Daily %</th>
                        <th className="px-4 py-3 font-semibold text-center">Main %</th>
                        <th className="px-4 py-3 font-semibold text-center">Notebook %</th>
                        <th className="px-4 py-3 font-semibold text-center">Overall %</th>
                        <th className="px-4 py-3 font-semibold text-center">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const sortedSubjects = [...activeStudent.subjectAnalytics].sort((a, b) => b.average - a.average);
                        const bestSubject = sortedSubjects[0]?.subject;
                        const worstSubject = sortedSubjects[sortedSubjects.length - 1]?.subject;
                        
                        const getGrade = (percentage) => {
                          if (percentage >= 90) return 'A+';
                          if (percentage >= 80) return 'A';
                          if (percentage >= 70) return 'B+';
                          if (percentage >= 60) return 'B';
                          if (percentage >= 50) return 'C';
                          if (percentage >= 40) return 'D';
                          return 'F';
                        };
                        
                        return sortedSubjects.map(subj => (
                          <tr key={subj.subject} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${subj.subject === bestSubject ? 'bg-emerald-50/30' : subj.subject === worstSubject ? 'bg-rose-50/30' : ''}`}>
                            <td className="px-4 py-3 font-medium text-slate-700">
                              {subj.subject === bestSubject && <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full mr-2" />}
                              {subj.subject === worstSubject && <span className="inline-block w-2 h-2 bg-rose-500 rounded-full mr-2" />}
                              {subj.subject}
                            </td>
                            <td className="px-4 py-3 text-center text-slate-600">{subj.dailyTestAvg.toFixed(1)}%</td>
                            <td className="px-4 py-3 text-center text-slate-600">{subj.mainExamAvg.toFixed(1)}%</td>
                            <td className="px-4 py-3 text-center text-slate-600">{subj.notebookPercent.toFixed(1)}%</td>
                            <td className="px-4 py-3 text-center font-bold text-indigo-600">{subj.average.toFixed(1)}%</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                getGrade(subj.average) === 'A+' ? 'bg-emerald-100 text-emerald-700' :
                                getGrade(subj.average) === 'A' ? 'bg-sky-100 text-sky-700' :
                                getGrade(subj.average) === 'B+' ? 'bg-indigo-100 text-indigo-700' :
                                getGrade(subj.average) === 'B' ? 'bg-purple-100 text-purple-700' :
                                getGrade(subj.average) === 'C' ? 'bg-amber-100 text-amber-700' :
                                getGrade(subj.average) === 'D' ? 'bg-orange-100 text-orange-700' :
                                'bg-rose-100 text-rose-700'
                              }`}>{getGrade(subj.average)}</span>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Academic Activity Timeline */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  <h3 className="font-semibold text-slate-800 text-sm">Academic Activity Timeline</h3>
                </div>
                <div className="p-4 max-h-64 overflow-y-auto">
                  {(() => {
                    const activities = [];
                    // Add daily test activities
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
                    // Add main exam activities
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
                    // Sort by date descending
                    activities.sort((a, b) => new Date(b.date) - new Date(a.date));
                    return activities.slice(0, 15).map((activity, idx) => (
                      <div key={idx} className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 rounded-lg px-2 -mx-2 transition-colors">
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
              </div>

              {/* Overall Progress Trend */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-slate-500" />
                  <h3 className="font-semibold text-slate-800 text-sm">Overall Progress Trend</h3>
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
                              type: 'Daily Test',
                              color: '#10b981'
                            });
                          });
                        }
                        if (activeStudent.mainExamStats?.history) {
                          activeStudent.mainExamStats.history.forEach(item => {
                            allActivities.push({
                              date: item.date,
                              percentage: item.percentage,
                              type: item.examType,
                              color: '#f43f5e'
                            });
                          });
                        }
                        allActivities.sort((a, b) => new Date(a.date) - new Date(b.date));
                        return allActivities;
                      })()}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} />
                        <YAxis tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} domain={[0, 100]} />
                        <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgb(0 0 0 / 0.1)', fontSize: '11px'}} formatter={(value, name, props) => [`${value.toFixed(1)}%`, props.payload.type]} />
                        <Line type="monotone" dataKey="percentage" stroke="#4f46e5" strokeWidth={2} dot={{fill: '#4f46e5', r: 3, stroke: '#4f46e5', strokeWidth: 2}} activeDot={{r: 5}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-6 mt-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-xs text-slate-600">Daily Test</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-rose-500" />
                      <span className="text-xs text-slate-600">Main Exam</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-indigo-600" />
                      <span className="text-xs text-slate-600">Overall</span>
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