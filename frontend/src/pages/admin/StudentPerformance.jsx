import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, Search, Calendar, Filter, Download, X, 
  Target, BrainCircuit, XCircle, ChevronUp, ChevronDown,
  Award, BookOpen, TrendingUp
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

// Reusable color palette for dynamically generated subject lines
const SUBJECT_COLORS = [
  '#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ef4444', 
  '#06b6d4', '#eab308', '#ec4899', '#14b8a6', '#f43f5e',
  '#6366f1', '#84cc16', '#d946ef', '#f59e0b', '#0ea5e9'
];

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
  
  // State for Interactive Legend in Main Exam Trend
  const [hiddenSubjects, setHiddenSubjects] = useState([]);

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
      setClasses(Array.isArray(data.classes) ? data.classes : []);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
      toast.error('Failed to fetch classes');
      setClasses([]);
    }
  };

  const fetchExamTypes = async (classId) => {
    try {
      const { data } = await api.get(`/student-performance/exam-types?classId=${classId}`);
      setAvailableExamTypes(['All Exams', ...(Array.isArray(data.examTypes) ? data.examTypes : [])]);
    } catch (error) {
      console.error('Failed to fetch exam types:', error);
      setAvailableExamTypes(['All Exams']);
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
        assessmentType: 'All Assessments',
        examTypes: examTypes.join(','),
        dateRange: dateRange,
        specificDate: specificDate,
        dateFrom: dateFrom,
        dateTo: dateTo
      };

      const { data } = await api.get('/student-performance/analytics', { params });
      
      setAnalyticsData(Array.isArray(data.data) ? data.data : []);
      if(Array.isArray(data.data) && data.data.length === 0) toast.info('No data found for selected class.');
    } catch (error) {
      console.error('Failed to generate analytics:', error);
      toast.error('Failed to generate analytics');
      setAnalyticsData([]);
    } finally {
      setLoading(false);
    }
  };

  const openStudentDetails = (student) => {
    setActiveStudent(student);
    setDrawerOpen(true);
    setTimelineOpen(false); 
    setHiddenSubjects([]); // Reset hidden subjects when opening a new student
  };

  // Pre-calculate Section-Wise Ranks & Exam-Wise Ranks
  const enrichedData = useMemo(() => {
    if (!analyticsData.length) return [];
    
    let processed = analyticsData.map(student => {
      // Deep clone to prevent mutating original backend response
      let s = JSON.parse(JSON.stringify(student));
      return s;
    });
    
    // Helper to calculate standard ranking for a specific metric
    const assignRank = (key, rankKey) => {
      processed.sort((a, b) => (b[key] || 0) - (a[key] || 0));
      let currentRank = 1;
      for (let i = 0; i < processed.length; i++) {
        if (i > 0 && (processed[i][key] || 0) < (processed[i - 1][key] || 0)) {
          currentRank = i + 1;
        }
        processed[i][rankKey] = currentRank;
      }
    };

    assignRank('dailyPercentage', 'dailyRank');
    assignRank('mainPercentage', 'mainRank');
    assignRank('notebookPercentage', 'notebookRank');
    
    // Dynamically calculate rank for each specific Main Exam Type
    const allExamTypes = new Set();
    processed.forEach(s => {
      if (s.mainByExamType) {
        Object.keys(s.mainByExamType).forEach(et => allExamTypes.add(et));
      }
    });

    allExamTypes.forEach(et => {
      processed.sort((a, b) => {
        const valA = a.mainByExamType?.[et]?.percentage || 0;
        const valB = b.mainByExamType?.[et]?.percentage || 0;
        return valB - valA;
      });

      let currentRank = 1;
      for (let i = 0; i < processed.length; i++) {
        const currentVal = processed[i].mainByExamType?.[et]?.percentage || 0;
        if (i > 0) {
          const prevVal = processed[i - 1].mainByExamType?.[et]?.percentage || 0;
          if (currentVal < prevVal) {
            currentRank = i + 1;
          }
        }
        if (processed[i].mainByExamType && processed[i].mainByExamType[et]) {
          processed[i].mainByExamType[et].rank = currentRank;
        }
      }
    });
    
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

  // PDF Helper Functions
  const addPDFHeader = (doc, student, className) => {
    doc.setFontSize(16);
    doc.setTextColor(79, 70, 229);
    doc.text('Student Performance Report', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Student: ${student.name}`, 14, 35);
    doc.text(`Roll No: ${student.rollNo}`, 14, 42);
    doc.text(`Class: ${className}`, 14, 49);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 56);
  };

  const addPDFFooter = (doc, pageNumber, totalPages) => {
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Generated by TestMaster Pro', 105, 290, { align: 'center' });
    doc.text(`Page ${pageNumber} of ${totalPages}`, 105, 295, { align: 'center' });
  };

  const getGrade = (percentage) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Daily Test Report PDF
  const generateDailyTestReport = (doc, student, className) => {
    addPDFHeader(doc, student, className);
    
    let yPos = 70;
    
    // Summary Cards
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('Daily Test Summary', 14, yPos);
    yPos += 10;
    
    const summaryData = [
      ['Average %', `${student?.dailyPercentage?.toFixed(2) || 0}%`],
      ['Highest %', `${student?.dailyStats?.highest?.toFixed(2) || 0}%`],
      ['Lowest %', `${student?.dailyStats?.lowest?.toFixed(2) || 0}%`],
      ['Attendance %', student?.dailyStats?.total ? `${((student.dailyStats.attempted / student.dailyStats.total) * 100).toFixed(2)}%` : '0%'],
      ['Attempted Tests', student?.dailyStats?.attempted || 0],
      ['Missed Tests', student?.dailyStats?.missed || 0],
      ['Total Tests', student?.dailyStats?.total || 0]
    ];
    
    autoTable(doc, {
      head: [['Metric', 'Value']],
      body: summaryData,
      startY: yPos,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    yPos = doc.lastAutoTable.finalY + 15;
    
    // Subject Wise Performance
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('Subject Wise Performance', 14, yPos);
    yPos += 10;
    
    const subjectData = Array.isArray(student?.subjectAnalytics) ? student.subjectAnalytics.map(s => [
      s.subject,
      `${s.dailyTestAvg?.toFixed(2) || 0}%`,
      getGrade(s.dailyTestAvg || 0)
    ]) : [];
    
    autoTable(doc, {
      head: [['Subject', 'Average %', 'Grade']],
      body: subjectData,
      startY: yPos,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    yPos = doc.lastAutoTable.finalY + 15;
    
    // Recent History
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('Recent Daily Test History', 14, yPos);
    yPos += 10;
    
    const historyData = Array.isArray(student?.dailyStats?.history) ? student.dailyStats.history.slice(-10).map(h => [
      formatDate(h.date),
      h.subject,
      `${h.marksObtained}/${h.maxMarks}`,
      `${h.percentage?.toFixed(2) || 0}%`
    ]) : [];
    
    autoTable(doc, {
      head: [['Date', 'Subject', 'Marks', 'Percentage']],
      body: historyData,
      startY: yPos,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    addPDFFooter(doc, 1, 1);
  };

  // Main Exam Report PDF
  const generateMainExamReport = (doc, student, className) => {
    addPDFHeader(doc, student, className);
    
    let yPos = 70;
    let pageNumber = 1;
    
    // Individual Exam Cards
    const examTypes = student?.mainByExamType ? Object.keys(student.mainByExamType) : [];
    
    examTypes.forEach((examType, index) => {
      if (yPos > 220) {
        doc.addPage();
        pageNumber++;
        yPos = 20;
        addPDFFooter(doc, pageNumber, 3);
      }
      
      const examData = student?.mainByExamType?.[examType];
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.text(`${examType} Performance`, 14, yPos);
      yPos += 10;
      
      const examSummary = [
        ['Overall %', `${examData?.percentage?.toFixed(2) || 0}%`],
        ['Grade', examData?.grade || 'N/A'],
        ['Obtained Marks', examData?.totalObtained || 0],
        ['Maximum Marks', examData?.totalMax || 0]
      ];
      
      autoTable(doc, {
        head: [['Metric', 'Value']],
        body: examSummary,
        startY: yPos,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [139, 92, 246] }
      });
      
      yPos = doc.lastAutoTable.finalY + 10;
      
      // Subject Table for this exam
      const subjectExamData = Array.isArray(student?.subjectAnalytics) ? student.subjectAnalytics.map(s => {
        const examSubjectData = s.mainByExamType?.[examType];
        return [
          s.subject,
          examSubjectData?.totalObtained || 0,
          examSubjectData?.totalMax || 0,
          examSubjectData?.totalMax ? `${((examSubjectData.totalObtained / examSubjectData.totalMax) * 100).toFixed(2)}%` : 'N/A',
          examSubjectData?.totalMax ? getGrade((examSubjectData.totalObtained / examSubjectData.totalMax) * 100) : 'N/A'
        ];
      }) : [];
      
      autoTable(doc, {
        head: [['Subject', 'Obtained', 'Max', 'Percentage', 'Grade']],
        body: subjectExamData,
        startY: yPos,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [139, 92, 246] }
      });
      
      yPos = doc.lastAutoTable.finalY + 15;
    });
    
    // Overall Summary
    if (yPos > 200) {
      doc.addPage();
      pageNumber++;
      yPos = 20;
    }
    
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('Overall Main Exam Summary', 14, yPos);
    yPos += 10;
    
    const overallSummary = [
      ['Overall Percentage', `${student?.mainPercentage?.toFixed(2) || 0}%`],
      ['Overall Grade', getGrade(student?.mainPercentage || 0)],
      ['Overall Rank', student?.mainRank || 'N/A']
    ];
    
    autoTable(doc, {
      head: [['Metric', 'Value']],
      body: overallSummary,
      startY: yPos,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [139, 92, 246] }
    });
    
    addPDFFooter(doc, pageNumber, 3);
  };

  // Notebook Report PDF
  const generateNotebookReport = (doc, student, className) => {
    addPDFHeader(doc, student, className);
    
    let yPos = 70;
    
    // Summary Cards
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('Notebook Summary', 14, yPos);
    yPos += 10;
    
    const summaryData = [
      ['Assigned Chapters', student?.notebookStats?.totalChapters || 0],
      ['Unlocked Chapters', student?.notebookStats?.unlockedChapters || 0],
      ['Checked Chapters', student?.notebookStats?.checkedChapters || 0],
      ['Pending Chapters', student?.notebookStats?.pendingChapters || 0],
      ['Completion %', `${student?.notebookPercentage?.toFixed(2) || 0}%`]
    ];
    
    autoTable(doc, {
      head: [['Metric', 'Value']],
      body: summaryData,
      startY: yPos,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [16, 185, 129] }
    });
    
    yPos = doc.lastAutoTable.finalY + 15;
    
    // Subject Wise Table
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('Subject Wise Notebook Performance', 14, yPos);
    yPos += 10;
    
    const subjectData = Array.isArray(student?.subjectAnalytics) ? student.subjectAnalytics.map(s => [
      s.subject,
      s.notebookData?.total || 0,
      s.notebookData?.unlocked || 0,
      s.notebookData?.checked || 0,
      s.notebookData?.pending || 0,
      `${s.notebookPercent?.toFixed(2) || 0}%`
    ]) : [];
    
    autoTable(doc, {
      head: [['Subject', 'Total', 'Unlocked', 'Checked', 'Pending', 'Completion %']],
      body: subjectData,
      startY: yPos,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [16, 185, 129] }
    });
    
    addPDFFooter(doc, 1, 1);
  };

  const handleExportPDF = () => {
    if (!activeStudent) {
      return toast.warning('Please select a student first to generate detailed report');
    }
    
    if (!filteredTableData.length) return toast.warning('No data to export');
    
    toast.loading('Generating PDF...');
    
    try {
      const className = classes.find(c => c._id === selectedClass)?.className || 'N/A';
      const student = activeStudent;
      
      const doc = new jsPDF();
      
      // Complete Report - All sections
      let pageNumber = 1;
      
      // Page 1: Daily Test
      generateDailyTestReport(doc, student, className);
      
      // Page 2: Main Exam
      doc.addPage();
      pageNumber++;
      generateMainExamReport(doc, student, className);
      
      // Page 3: Notebook
      doc.addPage();
      pageNumber++;
      generateNotebookReport(doc, student, className);
      
      doc.save(`${student.name.replace(/\s+/g, '_')}_Complete_Performance_Report.pdf`);
      
      toast.success('PDF downloaded successfully.');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

  // Helper functions to generate Main Exam Subject Trend Graph
  const getGradeFormTrend = (percentage) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  };

  // Memoized Data prep for the Trend Graph to keep render optimized
  const mainExamTrendData = useMemo(() => {
    if (!activeStudent || !activeStudent.mainByExamType) return { trendData: [], allSubjectsList: [] };
    
    const mainExamsList = Object.keys(activeStudent.mainByExamType || {});
    const allSubjectsList = Array.isArray(activeStudent.subjectAnalytics) 
      ? Array.from(new Set(activeStudent.subjectAnalytics.map(s => s.subject))) 
      : [];

    const trendData = mainExamsList.map(exam => {
      const dataPoint = { name: exam };
      if (Array.isArray(activeStudent.subjectAnalytics)) {
        activeStudent.subjectAnalytics.forEach(subj => {
          const examData = subj.mainByExamType?.[exam];
          if (examData) {
            const percentage = examData.totalMax > 0 ? (examData.totalObtained / examData.totalMax) * 100 : 0;
            dataPoint[subj.subject] = percentage;
            dataPoint[`${subj.subject}_details`] = {
              obtained: examData.totalObtained,
              max: examData.totalMax,
              percentage: percentage,
              grade: getGradeFormTrend(percentage),
              rank: examData.rank || 'N/A'
            };
          }
        });
      }
      return dataPoint;
    });

    return { trendData, allSubjectsList };
  }, [activeStudent]);

  // Custom Tooltip component for the new Trend Graph
  const SubjectTrendTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3.5 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-slate-100 text-xs min-w-[200px]">
          <p className="font-extrabold text-slate-800 border-b border-slate-100 pb-2 mb-3 uppercase tracking-wider">{label}</p>
          <div className="space-y-3">
            {payload.map((entry, index) => {
              const details = entry.payload[`${entry.dataKey}_details`];
              return (
                <div key={index} className="flex flex-col gap-1.5" style={{ color: entry.color }}>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    <p className="font-bold">{entry.dataKey}</p>
                  </div>
                  {details && (
                    <div className="text-slate-600 grid grid-cols-2 gap-x-3 gap-y-1 ml-4 border-l-2 pl-2" style={{ borderColor: `${entry.color}40` }}>
                      <p>Marks: <span className="font-semibold text-slate-800">{details.obtained} / {details.max}</span></p>
                      <p>Percent: <span className="font-semibold text-slate-800">{details.percentage.toFixed(1)}%</span></p>
                      <p>Grade: <span className="font-semibold text-slate-800">{details.grade}</span></p>
                      {details.rank !== 'N/A' && <p>Rank: <span className="font-semibold text-slate-800">{details.rank}</span></p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
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
          <Button variant="outline" className="shadow-sm" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" /> Download PDF
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
              Select Class <span className="text-rose-50">*</span>
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
                <Button variant="ghost" size="sm" onClick={handleExportPDF} className="text-slate-600 hover:text-slate-800 hover:bg-slate-100 px-3">
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

                  {/* REDESIGNED & COLORFUL Main Exam Tab Content */}
                  {activeTab === 'main' && (
                    <div className="space-y-6">
                      {Object.keys(activeStudent.mainByExamType || {}).length > 0 ? (
                        <>
                          <div className="flex flex-nowrap gap-5 overflow-x-auto pb-4 snap-x" style={{ scrollbarWidth: 'thin' }}>
                            {Object.entries(activeStudent.mainByExamType).map(([examType, data]) => {
                              // Extract subject marks for this specific exam
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

                              const getCardGrade = (percentage) => {
                                if (percentage >= 90) return 'A+';
                                if (percentage >= 80) return 'A';
                                if (percentage >= 70) return 'B+';
                                if (percentage >= 60) return 'B';
                                if (percentage >= 50) return 'C';
                                if (percentage >= 40) return 'D';
                                return 'F';
                              };

                              const getGradeColor = (grade) => {
                                if (grade === 'A+' || grade === 'A') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
                                if (grade === 'B+' || grade === 'B') return 'bg-sky-100 text-sky-700 border-sky-200';
                                if (grade === 'C') return 'bg-amber-100 text-amber-700 border-amber-200';
                                if (grade === 'D') return 'bg-orange-100 text-orange-700 border-orange-200';
                                return 'bg-rose-100 text-rose-700 border-rose-200';
                              };

                              // Dynamic colors for Cards based on total score percentage
                              const getCardTheme = (pct) => {
                                if (pct >= 85) return { header: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white', bar: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-200' };
                                if (pct >= 70) return { header: 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white', bar: 'bg-sky-500', text: 'text-sky-600', border: 'border-sky-200' };
                                if (pct >= 55) return { header: 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white', bar: 'bg-indigo-500', text: 'text-indigo-600', border: 'border-indigo-200' };
                                if (pct >= 40) return { header: 'bg-gradient-to-r from-amber-500 to-orange-600 text-white', bar: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-200' };
                                return { header: 'bg-gradient-to-r from-rose-500 to-red-600 text-white', bar: 'bg-rose-500', text: 'text-rose-600', border: 'border-rose-200' };
                              };

                              const theme = getCardTheme(data.percentage);

                              return (
                                <div key={examType} className={`w-[300px] sm:w-[320px] flex-shrink-0 snap-start bg-white rounded-2xl border ${theme.border} shadow-md hover:shadow-xl transition-all flex flex-col h-full overflow-hidden`}>
                                  {/* Top: Exam Name & Date (Dynamic Gradient Background) */}
                                  <div className={`${theme.header} px-4 py-3.5 flex justify-between items-center shadow-sm`}>
                                    <h3 className="font-extrabold text-sm tracking-wide uppercase">{examType}</h3>
                                    {data.date && <span className="text-[10px] font-medium opacity-90">{new Date(data.date).toLocaleDateString()}</span>}
                                  </div>

                                  <div className="p-4 flex-1 flex flex-col gap-4">
                                    {/* Overall Summary (Top part) */}
                                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                      <div className="flex justify-between items-end mb-1.5">
                                        <div>
                                          <p className="text-[9px] font-bold tracking-wider text-slate-400 uppercase">Obtained / Max</p>
                                          <p className="text-xs font-bold text-slate-700">{data.totalObtained} / {data.totalMax}</p>
                                        </div>
                                        <div className="text-right">
                                          <p className={`text-xl font-black ${theme.text} leading-none`}>{data.percentage.toFixed(1)}%</p>
                                        </div>
                                      </div>
                                      <div className="w-full bg-slate-200 rounded-full h-2">
                                        <div className={`${theme.bar} h-2 rounded-full transition-all shadow-inner`} style={{ width: `${data.percentage}%` }} />
                                      </div>
                                    </div>

                                    {/* Compact Subject-wise Performance (Scrollable) */}
                                    {subjectMarks.length > 0 && (
                                      <div className="border border-slate-100 rounded-xl overflow-hidden flex flex-col shadow-sm">
                                        <div className="bg-slate-50/80 px-3 py-2 border-b border-slate-100">
                                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Subject-wise Performance</p>
                                        </div>
                                        <div className="divide-y divide-slate-100 max-h-[220px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                                          {subjectMarks.map((sm, idx) => {
                                            const subjGrade = getCardGrade(sm.percentage);
                                            return (
                                              <div key={sm.subject} className={`px-3 py-2.5 flex items-center justify-between transition-colors hover:bg-slate-50/60 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}`}>
                                                <div className="flex flex-col">
                                                  <span className="text-xs font-bold text-slate-800">{sm.subject}</span>
                                                  <span className="text-[10px] font-bold text-slate-400 mt-0.5">{sm.obtained} / {sm.max}</span>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                  <span className="text-xs font-black text-slate-800">{sm.percentage.toFixed(0)}%</span>
                                                  <span className={`text-[9px] font-bold px-2 py-0.5 border rounded mt-1 shadow-sm ${getGradeColor(subjGrade)}`}>
                                                    Grade: {subjGrade}
                                                  </span>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Footer Overall Summary - FIXED: Rank Column Completely Removed */}
                                  <div className="bg-slate-50/90 px-4 py-3 border-t border-slate-100 grid grid-cols-2 divide-x divide-slate-200 mt-auto shadow-inner">
                                    <div className="flex flex-col items-center justify-center gap-1 px-1">
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Overall Grade</span>
                                      <span className={`text-xs font-extrabold px-3 py-1 border rounded-md shadow-sm ${getGradeColor(data.grade)}`}>
                                        {data.grade}
                                      </span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center gap-1 px-1">
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Overall %</span>
                                      <span className={`text-sm font-black ${theme.text}`}>{data.percentage.toFixed(1)}%</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* ==================================================== */}
                          {/* NEW SECTION: Main Exam Subject Trend                 */}
                          {/* ==================================================== */}
                          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-2">
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                              <TrendingUp className="h-5 w-5 text-indigo-500" />
                              <div>
                                <h3 className="font-semibold text-slate-800 text-sm">Main Exam Subject Trend</h3>
                                <p className="text-[11px] text-slate-500 font-medium">Compare subject performance across all main exams.</p>
                              </div>
                            </div>
                            
                            <div className="p-5">
                              {/* Interactive Legend */}
                              <div className="flex flex-wrap gap-2 mb-6 justify-center">
                                {Array.isArray(mainExamTrendData.allSubjectsList) && mainExamTrendData.allSubjectsList.map((subject, idx) => {
                                  const color = SUBJECT_COLORS[idx % SUBJECT_COLORS.length];
                                  const isHidden = hiddenSubjects.includes(subject);
                                  return (
                                    <button 
                                      key={subject}
                                      onClick={() => {
                                        setHiddenSubjects(prev => 
                                          prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]
                                        );
                                      }}
                                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                                        isHidden ? 'bg-slate-50 text-slate-400 border border-slate-200' : 'bg-slate-50 text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-100'
                                      }`}
                                    >
                                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: isHidden ? '#e2e8f0' : color }}></span>
                                      {subject}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Multi-Line Trend Chart */}
                              <div className="h-64 w-full">
                                {Array.isArray(mainExamTrendData.trendData) && mainExamTrendData.trendData.length > 0 ? (
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={mainExamTrendData.trendData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                      <XAxis 
                                        dataKey="name" 
                                        tick={{fontSize: 11, fill: '#64748b', fontWeight: 600}} 
                                        axisLine={false} 
                                        tickLine={false} 
                                      />
                                      <YAxis 
                                        tick={{fontSize: 11, fill: '#64748b'}} 
                                        axisLine={false} 
                                        tickLine={false} 
                                        domain={[0, 100]} 
                                      />
                                      <RechartsTooltip content={<SubjectTrendTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                      
                                      {Array.isArray(mainExamTrendData.allSubjectsList) && mainExamTrendData.allSubjectsList.map((subject, idx) => (
                                        !hiddenSubjects.includes(subject) && (
                                          <Line 
                                            key={subject}
                                            type="monotone" 
                                            dataKey={subject} 
                                            stroke={SUBJECT_COLORS[idx % SUBJECT_COLORS.length]} 
                                            strokeWidth={2.5}
                                            dot={{ fill: SUBJECT_COLORS[idx % SUBJECT_COLORS.length], r: 4.5, strokeWidth: 0 }}
                                            activeDot={{ r: 6.5, stroke: '#ffffff', strokeWidth: 2 }}
                                            connectNulls={true}
                                          />
                                        )
                                      ))}
                                    </LineChart>
                                  </ResponsiveContainer>
                                ) : (
                                  <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                                    No trend data available
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          {/* ==================================================== */}

                        </>
                      ) : (
                        <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                          <p className="text-sm font-medium text-slate-500">No Main Exam data available</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notebook Tab Content */}
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

              {/* Subject-Wise Performance Table - Only showing for Notebook as requested */}
              {activeTab === 'notebook' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-4">
                  <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                    <Target className="h-4 w-4 text-slate-500" />
                    <h3 className="font-semibold text-slate-800 text-sm">Notebook Completion</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="text-[10px] text-slate-500 uppercase bg-slate-50/80 border-b border-slate-100">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Subject</th>
                          <th className="px-4 py-3 font-semibold text-center">Notebook %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const sortedSubjects = [...activeStudent.subjectAnalytics].sort((a, b) => b.notebookPercent - a.notebookPercent);
                          return sortedSubjects.map(subj => {
                            return (
                              <tr key={subj.subject} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-3 font-medium text-slate-700">{subj.subject}</td>
                                <td className="px-4 py-3 text-center font-bold text-sky-600">{subj.notebookPercent.toFixed(1)}%</td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* COMMENTED OUT DAILY AND MAIN PERFORMANCE TABLES:
                {(activeTab === 'daily' || activeTab === 'main') && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-4">
                    ...
                  </div>
                )}
              */}

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

              {/* Academic Activity Timeline - Moved to the very bottom */}
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

            </div>
          </div>
        </div>
      )}

    </div>
  );
}