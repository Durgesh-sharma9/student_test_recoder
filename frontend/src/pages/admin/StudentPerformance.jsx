import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, Search, Calendar, Filter, Download, Printer, X, 
  TrendingUp, Award, BookOpen, Target, BrainCircuit, XCircle, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const [examType, setExamType] = useState('All Exams');
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
      setAvailableExamTypes(data.examTypes || []);
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
        examType: examType,
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
              onChange={(e) => { setAssessmentType(e.target.value); setExamType('All Exams'); }}
            >
              <option value="All Assessments">All Assessments</option>
              <option value="Daily Test">Daily Test</option>
              <option value="Main Exam">Main Exam</option>
              <option value="Notebook Checking">Notebook Checking</option>
            </select>
          </div>

          {/* Exam Type (only shown when Main Exam is selected) */}
          {assessmentType === 'Main Exam' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Exam</label>
              <select
                className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
              >
                <option value="All Exams">All Exams</option>
                {availableExamTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date Range */}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px] transition-all p-4">
          <div className="w-full max-w-[80%] max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
            
            {/* Compact Student Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                  {activeStudent.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{activeStudent.name}</h2>
                  <p className="text-xs font-medium text-slate-500">
                    Roll: {activeStudent.rollNo} • Rank: #{activeStudent.rank} • {classes.find(c => c._id === selectedClass)?.className || 'N/A'}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(false)} className="rounded-full hover:bg-slate-100">
                <X className="h-5 w-5 text-slate-500" />
              </Button>
            </div>

            <div className="p-5 space-y-5">
              
              {/* Performance Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl border border-indigo-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-indigo-600" />
                    <p className="text-xs font-semibold text-indigo-700 uppercase">Overall</p>
                  </div>
                  <p className="text-2xl font-bold text-indigo-900">{activeStudent.overallPercentage.toFixed(1)}%</p>
                  <div className="w-full bg-indigo-200 rounded-full h-1.5 mt-2">
                    <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${activeStudent.overallPercentage}%` }} />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-sky-50 to-sky-100 p-4 rounded-xl border border-sky-200">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="h-4 w-4 text-sky-600" />
                    <p className="text-xs font-semibold text-sky-700 uppercase">Notebook</p>
                  </div>
                  <p className="text-2xl font-bold text-sky-900">{activeStudent.notebookPercentage.toFixed(1)}%</p>
                  <div className="w-full bg-sky-200 rounded-full h-1.5 mt-2">
                    <div className="bg-sky-600 h-1.5 rounded-full" style={{ width: `${activeStudent.notebookPercentage}%` }} />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-xl border border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-emerald-600" />
                    <p className="text-xs font-semibold text-emerald-700 uppercase">Daily Test</p>
                  </div>
                  <p className="text-2xl font-bold text-emerald-900">{activeStudent.dailyPercentage.toFixed(1)}%</p>
                  <div className="w-full bg-emerald-200 rounded-full h-1.5 mt-2">
                    <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${activeStudent.dailyPercentage}%` }} />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-rose-50 to-rose-100 p-4 rounded-xl border border-rose-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="h-4 w-4 text-rose-600" />
                    <p className="text-xs font-semibold text-rose-700 uppercase">Main Exam</p>
                  </div>
                  <p className="text-2xl font-bold text-rose-900">{activeStudent.mainPercentage.toFixed(1)}%</p>
                  <div className="w-full bg-rose-200 rounded-full h-1.5 mt-2">
                    <div className="bg-rose-600 h-1.5 rounded-full" style={{ width: `${activeStudent.mainPercentage}%` }} />
                  </div>
                </div>
              </div>

              {/* Subject Performance - Chart + List */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-slate-500" />
                  <h3 className="font-semibold text-slate-800 text-sm">Subject Performance</h3>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Left: Bar Chart */}
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={activeStudent.subjectAnalytics} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="subject" tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false} />
                          <YAxis tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false} />
                          <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '6px', border: 'none', boxShadow: '0 2px 4px rgb(0 0 0 / 0.1)', fontSize: '12px'}} />
                          <Bar dataKey="average" name="Average %" fill="#4f46e5" radius={[3, 3, 0, 0]} barSize={24} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Right: Subject List */}
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {activeStudent.subjectAnalytics.map(subj => (
                        <div key={subj.subject} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="text-xs font-semibold text-slate-700">{subj.subject}</span>
                          <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{subj.average.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Smart Insights - 4 Small Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Strongest</p>
                  </div>
                  <p className="text-sm font-bold text-slate-800">{activeStudent.insights.strongestSubject}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-3.5 w-3.5 text-rose-500" />
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Weakest</p>
                  </div>
                  <p className="text-sm font-bold text-slate-800">{activeStudent.insights.weakestSubject}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="h-3.5 w-3.5 text-amber-500" />
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Best Area</p>
                  </div>
                  <p className="text-sm font-bold text-slate-800">{activeStudent.insights.highestAssessment}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="h-3.5 w-3.5 text-indigo-500" />
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Needs Work</p>
                  </div>
                  <p className="text-sm font-bold text-slate-800">{activeStudent.insights.lowestAssessment}</p>
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
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-slate-600">Average</span>
                        <span className="text-sm font-bold text-emerald-600">{activeStudent.dailyPercentage.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-slate-600">Highest</span>
                        <span className="text-sm font-bold text-slate-800">{activeStudent.dailyStats.highest.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-slate-600">Lowest</span>
                        <span className="text-sm font-bold text-slate-800">{activeStudent.dailyStats.lowest.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-slate-600">Attempted</span>
                        <span className="text-sm font-bold text-slate-800">{activeStudent.dailyStats.attempted}</span>
                      </div>
                    </div>
                  )}
                  {activeTab === 'main' && (
                    <div className="text-center py-4">
                      <p className="text-sm font-medium text-slate-600">Main Exam Performance</p>
                      <p className="text-2xl font-bold text-rose-600 mt-1">{activeStudent.mainPercentage.toFixed(1)}%</p>
                    </div>
                  )}
                  {activeTab === 'notebook' && (
                    <div className="text-center py-4">
                      <p className="text-sm font-medium text-slate-600">Notebook Completion</p>
                      <p className="text-2xl font-bold text-sky-600 mt-1">{activeStudent.notebookPercentage.toFixed(1)}%</p>
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
                    <thead className="text-[10px] text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-2 font-semibold">Subject</th>
                        <th className="px-4 py-2 font-semibold text-center">Daily</th>
                        <th className="px-4 py-2 font-semibold text-center">Main</th>
                        <th className="px-4 py-2 font-semibold text-center">Notebook</th>
                        <th className="px-4 py-2 font-semibold text-center">Overall</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeStudent.subjectAnalytics.map(subj => (
                        <tr key={subj.subject} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="px-4 py-2 font-medium text-slate-700">{subj.subject}</td>
                          <td className="px-4 py-2 text-center text-slate-600">{subj.dailyTestAvg.toFixed(1)}%</td>
                          <td className="px-4 py-2 text-center text-slate-600">{subj.mainExamAvg.toFixed(1)}%</td>
                          <td className="px-4 py-2 text-center text-slate-600">{subj.notebookPercent.toFixed(1)}%</td>
                          <td className="px-4 py-2 text-center font-bold text-indigo-600">{subj.average.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Export Section */}
              <div className="flex gap-2 pt-2 border-t border-slate-200">
                <Button variant="outline" size="sm" className="flex-1 shadow-sm" onClick={handlePrint}>
                  <Printer className="h-3.5 w-3.5 mr-2" /> Print
                </Button>
                <Button variant="outline" size="sm" className="flex-1 shadow-sm" onClick={handleExportPDF}>
                  <FileText className="h-3.5 w-3.5 mr-2" /> PDF
                </Button>
                <Button variant="outline" size="sm" className="flex-1 shadow-sm" onClick={handleExportCSV}>
                  <Download className="h-3.5 w-3.5 mr-2" /> Excel
                </Button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}