import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, Search, Calendar, Filter, Download, Printer, User, X, 
  TrendingUp, Award, BookOpen, Target, BrainCircuit, XCircle 
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

export default function StudentPerformance() {
  // State for Filters
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [assessmentTypes, setAssessmentTypes] = useState(['All Assessments']);
  const [mainExamType, setMainExamType] = useState('All Exams');
  const [dateRange, setDateRange] = useState('This Year');
  
  // State for Data
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState([]);
  
  // State for Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeStudent, setActiveStudent] = useState(null);

  // Fetch Classes on Mount
  useEffect(() => {
    fetchClasses();
  }, []);

  // Fetch Students when Class changes
  useEffect(() => {
    if (selectedClass) fetchStudents(selectedClass);
    else setStudents([]);
  }, [selectedClass]);

  const fetchClasses = async () => {
    try {
      const { data } = await api.get('/classes');
      setClasses(data.data || []);
    } catch (error) {
      toast.error('Failed to fetch classes');
    }
  };

  const fetchStudents = async (classId) => {
    try {
      const { data } = await api.get(`/students?classId=${classId}`);
      setStudents(data.data || []);
      setSelectedStudent('all');
    } catch (error) {
      toast.error('Failed to fetch students');
    }
  };

  const handleGenerateAnalytics = async () => {
    if (!selectedClass) {
      return toast.warning('Please select a class first.');
    }

    setLoading(true);
    try {
      const { data } = await api.get('/student-performance/analytics', {
        params: {
          classId: selectedClass,
          studentId: selectedStudent,
          assessments: assessmentTypes.join(','),
          examType: mainExamType,
          dateRange: dateRange
        }
      });
      setAnalyticsData(data.data || []);
      if(data.data?.length === 0) toast.info('No data found for selected filters.');
    } catch (error) {
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

  // Filter Data for Table Display
  const filteredTableData = useMemo(() => {
    if (!searchQuery) return analyticsData;
    const lowerQ = searchQuery.toLowerCase();
    return analyticsData.filter(s => 
      s.name.toLowerCase().includes(lowerQ) || 
      s.rollNo.toString().toLowerCase().includes(lowerQ)
    );
  }, [analyticsData, searchQuery]);

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
            <Download className="h-4 w-4 mr-2" /> Export
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

          {/* Student Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Select Student</label>
            <select
              className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              disabled={!selectedClass}
            >
              <option value="all">All Students</option>
              {students.map(s => (
                <option key={s._id} value={s._id}>{s.rollNo} - {s.name}</option>
              ))}
            </select>
          </div>

          {/* Assessment Multi Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Assessment Type</label>
            <AssessmentTypeMultiSelect
              options={['Daily Test', 'Main Exam', 'Notebook Checking']}
              value={assessmentTypes}
              onChange={setAssessmentTypes}
              className="h-10"
            />
          </div>

          {/* Date Range */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Date Range</label>
            <select
              className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="Today">Today</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
              <option value="This Year">This Year</option>
            </select>
          </div>

          {/* Main Exam specific filter (conditionally rendered) */}
          {assessmentTypes.includes('Main Exam') && !assessmentTypes.includes('All Assessments') && (
            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-xs font-semibold text-slate-600">Main Exam Filter</label>
              <select
                className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={mainExamType}
                onChange={(e) => setMainExamType(e.target.value)}
              >
                <option value="All Exams">All Exams</option>
                <option value="PA-1">PA-1</option>
                <option value="PA-2">PA-2</option>
                <option value="Half Yearly">Half Yearly</option>
                <option value="Annual">Annual</option>
              </select>
            </div>
          )}
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
                  {assessmentTypes.includes('Notebook Checking') || assessmentTypes.includes('All Assessments') ? <th className="px-6 py-4 font-semibold text-center">Notebook %</th> : null}
                  {assessmentTypes.includes('Daily Test') || assessmentTypes.includes('All Assessments') ? <th className="px-6 py-4 font-semibold text-center">Daily Test %</th> : null}
                  {assessmentTypes.includes('Main Exam') || assessmentTypes.includes('All Assessments') ? <th className="px-6 py-4 font-semibold text-center">Main Exam %</th> : null}
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
                    
                    {assessmentTypes.includes('Notebook Checking') || assessmentTypes.includes('All Assessments') ? 
                      <td className="px-6 py-3 text-center text-slate-600 font-medium">{student.notebookPercentage.toFixed(1)}%</td> : null}
                    
                    {assessmentTypes.includes('Daily Test') || assessmentTypes.includes('All Assessments') ? 
                      <td className="px-6 py-3 text-center text-slate-600 font-medium">{student.dailyPercentage.toFixed(1)}%</td> : null}
                    
                    {assessmentTypes.includes('Main Exam') || assessmentTypes.includes('All Assessments') ? 
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

      {/* Right Drawer for Student Details */}
      {drawerOpen && activeStudent && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm transition-all">
          <div className="w-full max-w-2xl bg-slate-50 h-full overflow-y-auto shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            
            {/* Drawer Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl shadow-md">
                  {activeStudent.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{activeStudent.name}</h2>
                  <p className="text-sm font-medium text-slate-500">Roll No: {activeStudent.rollNo} • Rank: #{activeStudent.rank}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(false)} className="rounded-full hover:bg-slate-100">
                <X className="h-5 w-5 text-slate-500" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm text-center">
                  <p className="text-xs font-semibold text-indigo-600 uppercase mb-1">Overall</p>
                  <p className="text-2xl font-bold text-slate-800">{activeStudent.overallPercentage.toFixed(1)}%</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-sky-100 shadow-sm text-center">
                  <p className="text-xs font-semibold text-sky-600 uppercase mb-1">Notebook</p>
                  <p className="text-2xl font-bold text-slate-800">{activeStudent.notebookPercentage.toFixed(1)}%</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm text-center">
                  <p className="text-xs font-semibold text-emerald-600 uppercase mb-1">Daily Test</p>
                  <p className="text-2xl font-bold text-slate-800">{activeStudent.dailyPercentage.toFixed(1)}%</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-rose-100 shadow-sm text-center">
                  <p className="text-xs font-semibold text-rose-600 uppercase mb-1">Main Exam</p>
                  <p className="text-2xl font-bold text-slate-800">{activeStudent.mainPercentage.toFixed(1)}%</p>
                </div>
              </div>

              {/* Smart Insights */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 text-white shadow-md">
                <div className="flex items-center gap-2 mb-4">
                  <BrainCircuit className="h-5 w-5 text-indigo-100" />
                  <h3 className="font-semibold text-lg">Smart Insights</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-indigo-200 text-xs uppercase tracking-wider font-medium">Strongest Subject</p>
                    <p className="font-bold text-lg mt-0.5">{activeStudent.insights.strongestSubject}</p>
                  </div>
                  <div>
                    <p className="text-indigo-200 text-xs uppercase tracking-wider font-medium">Weakest Subject</p>
                    <p className="font-bold text-lg mt-0.5">{activeStudent.insights.weakestSubject}</p>
                  </div>
                  <div>
                    <p className="text-indigo-200 text-xs uppercase tracking-wider font-medium">Best Assessment Area</p>
                    <p className="font-bold text-sm mt-0.5">{activeStudent.insights.highestAssessment}</p>
                  </div>
                  <div>
                    <p className="text-indigo-200 text-xs uppercase tracking-wider font-medium">Needs Work On</p>
                    <p className="font-bold text-sm mt-0.5">{activeStudent.insights.lowestAssessment}</p>
                  </div>
                </div>
              </div>

              {/* Subject Performance Breakdown */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                  <Target className="h-5 w-5 text-slate-500" />
                  <h3 className="font-semibold text-slate-800">Subject Performance</h3>
                </div>
                <div className="p-5">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={activeStudent.subjectAnalytics} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="subject" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                        <YAxis tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                        <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                        <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}}/>
                        <Bar dataKey="average" name="Average %" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={30} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="mt-6 space-y-4">
                    {activeStudent.subjectAnalytics.map(subj => (
                      <div key={subj.subject} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-bold text-slate-700">{subj.subject}</h4>
                          <span className="text-sm font-bold bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full">{subj.average.toFixed(1)}% Avg</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase">Notebook</p>
                            <p className="text-sm font-semibold text-slate-700 mt-0.5">{subj.notebookPercent.toFixed(0)}%</p>
                            {subj.notebookData?.total > 0 && (
                              <p className="text-[10px] text-slate-400">{subj.notebookData.checked}/{subj.notebookData.total} Chps</p>
                            )}
                          </div>
                          <div className="border-x border-slate-200">
                            <p className="text-[10px] font-semibold text-slate-500 uppercase">Daily Test</p>
                            <p className="text-sm font-semibold text-slate-700 mt-0.5">{subj.dailyTestAvg.toFixed(0)}%</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase">Main Exam</p>
                            <p className="text-sm font-semibold text-slate-700 mt-0.5">{subj.mainExamAvg.toFixed(0)}%</p>
                          </div>
                        </div>
                        {/* Custom Progress Bar */}
                        <div className="mt-4 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden flex">
                          <div className="bg-indigo-500 h-1.5 rounded-l-full transition-all" style={{ width: `${subj.average}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Assessment Breakdown Chart */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                 <h3 className="font-semibold text-slate-800 mb-4">Overall Distribution</h3>
                 <div className="h-64 flex justify-center items-center">
                   <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                       <Pie
                         data={[
                           { name: 'Notebooks', value: activeStudent.notebookPercentage },
                           { name: 'Daily Tests', value: activeStudent.dailyPercentage },
                           { name: 'Main Exams', value: activeStudent.mainPercentage }
                         ].filter(d => d.value > 0)}
                         cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}
                         dataKey="value" stroke="none"
                       >
                         {[...Array(3)].map((_, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                         ))}
                       </Pie>
                       <RechartsTooltip formatter={(value) => `${value.toFixed(1)}%`} />
                       <Legend verticalAlign="bottom" height={36} iconType="circle" />
                     </PieChart>
                   </ResponsiveContainer>
                 </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}