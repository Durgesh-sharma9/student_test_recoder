import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, Search, Calendar, Filter, Download, X, 
  Target, BrainCircuit, XCircle, ChevronUp, ChevronDown,
  Award, BookOpen, TrendingUp, ChevronDown as SelectChevron, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DatePicker from '@/components/ui/DatePicker';
import AssessmentTypeMultiSelect from '@/components/AssessmentTypeMultiSelect';
import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const SUBJECT_COLORS = [
  '#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ef4444', 
  '#06b6d4', '#eab308', '#ec4899', '#14b8a6', '#f43f5e',
  '#6366f1', '#84cc16', '#d946ef', '#f59e0b', '#0ea5e9'
];

export default function StudentPerformance() {
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
   
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState([]);
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeStudent, setActiveStudent] = useState(null);
  const [activeTab, setActiveTab] = useState('daily');
  const [timelineOpen, setTimelineOpen] = useState(false);
  
  const [hiddenSubjects, setHiddenSubjects] = useState([]);

  useEffect(() => {
    fetchClasses();
  }, []);

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
    setHiddenSubjects([]); 
  };

  const enrichedData = useMemo(() => {
    if (!analyticsData.length) return [];
    
    let processed = analyticsData.map(student => {
      let s = JSON.parse(JSON.stringify(student));
      return s;
    });
    
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

  const filteredTableData = useMemo(() => {
    let data = [...enrichedData];
    
    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      data = data.filter(s => 
        s.name.toLowerCase().includes(lowerQ) || 
        s.rollNo.toString().toLowerCase().includes(lowerQ)
      );
    }
    
    data.sort((a, b) => {
      const numA = parseInt(a.rollNo.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.rollNo.replace(/\D/g, '')) || 0;
      return numA - numB;
    });
    
    return data;
  }, [enrichedData, searchQuery]);

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

  // =========================================================================
  // PDF HELPER FUNCTIONS
  // =========================================================================

  const addPdfHeader = (doc, student, classInfo, title) => {
    const pageWidth = doc.internal.pageSize.getWidth();

    // Clean, minimalist header
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Student Performance Report', 16, 30);

    doc.setTextColor(79, 70, 229);
    doc.setFontSize(12);
    doc.text(title || 'Academic Report', 16, 46);

    doc.setTextColor(71, 85, 105);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const rightAlignX = pageWidth - 16;
    doc.text(`Name: ${student.name || 'N/A'}`, rightAlignX, 28, { align: 'right' });
    doc.text(`Roll No: ${student.rollNo || 'N/A'}`, rightAlignX, 40, { align: 'right' });
    doc.text(`Class: ${classInfo.className || 'N/A'} - ${classInfo.section || 'N/A'}`, rightAlignX, 52, { align: 'right' });

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.line(16, 62, pageWidth - 16, 62);
  };

  const addPdfFooter = (doc) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageNumber = doc.internal.getNumberOfPages();

    doc.setTextColor(148, 163, 184);
    doc.setFontSize(9);
    doc.text(`Page ${pageNumber}`, pageWidth / 2, pageHeight - 15, { align: 'center' });
  };

  const addPdfSectionTitle = (doc, title, y, accent) => {
    doc.setTextColor(accent[0], accent[1], accent[2]);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 16, y);
    doc.setDrawColor(accent[0], accent[1], accent[2]);
    doc.setLineWidth(0.5);
    doc.line(16, y + 4, 16 + doc.getTextWidth(title), y + 4);
  };

  const addPdfSummaryCard = (doc, x, y, title, value, subtitle, accent, width = 116, height = 40) => {
    doc.setFillColor(252, 253, 255);
    doc.roundedRect(x, y, width, height, 4, 4, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, width, height, 4, 4, 'S');

    doc.setTextColor(accent[0], accent[1], accent[2]);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), x + 8, y + 12);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.text(String(value), x + 8, y + 26);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, x + 8, y + 35);
  };

  const drawPdfSingleBarChart = (doc, title, data, yStart, chartHeight = 180) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const chartWidth = pageWidth - 32; 
    const chartX = 16;
    const chartY = yStart;

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(chartX, chartY, chartWidth, chartHeight, 6, 6, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(chartX, chartY, chartWidth, chartHeight, 6, 6, 'S');

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(title, chartX + 16, chartY + 20);

    const plotX = chartX + 40;
    const plotY = chartY + 40;
    const plotWidth = chartWidth - 60;
    const plotHeight = chartHeight - 70;

    doc.setDrawColor(203, 213, 225);
    doc.line(plotX, plotY, plotX, plotY + plotHeight); 
    doc.line(plotX, plotY + plotHeight, plotX + plotWidth, plotY + plotHeight); 

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    for (let i = 0; i <= 4; i += 1) {
      const y = plotY + (plotHeight / 4) * i;
      const value = 100 - (25 * i);
      doc.setDrawColor(241, 245, 249);
      doc.line(plotX, y, plotX + plotWidth, y);
      doc.text(`${value}%`, plotX - 8, y + 3, { align: 'right' });
    }

    if(data.length === 0) return;

    const barSpacing = plotWidth / data.length;
    const barWidth = Math.min(30, barSpacing - 10); 

    data.forEach((item, index) => {
      const barX = plotX + (index * barSpacing) + (barSpacing / 2) - (barWidth / 2);
      const percentage = Math.min(Math.max(item.percentage || 0, 0), 100);
      const height = (percentage / 100) * plotHeight;
      const barY = plotY + plotHeight - height;

      const colorHex = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
      const hexToRgb = (hex) => {
        let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
      };
      const c = hexToRgb(colorHex);

      doc.setFillColor(c[0], c[1], c[2]);
      if (height > 0) {
        doc.rect(barX, barY, barWidth, height, 'F');
      }

      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8);
      const label = item.subject.length > 12 ? `${item.subject.slice(0, 10)}..` : item.subject;
      doc.text(label, barX + (barWidth / 2), plotY + plotHeight + 12, { align: 'center' });
      
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(`${percentage.toFixed(0)}%`, barX + (barWidth / 2), barY - 4, { align: 'center' });
    });
  };

  const drawPdfGroupedBarChart = (doc, title, data, yStart, chartHeight = 150) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const chartWidth = pageWidth - 32;
    const chartX = 16;
    const chartY = yStart;

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(chartX, chartY, chartWidth, chartHeight, 6, 6, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(chartX, chartY, chartWidth, chartHeight, 6, 6, 'S');

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(title, chartX + 16, chartY + 20);

    const plotX = chartX + 30;
    const plotY = chartY + 36;
    const plotWidth = chartWidth - 80;
    const plotHeight = chartHeight - 50;
    const barGroupWidth = plotWidth / Math.max(data.length, 1);
    const maxValue = Math.max(...data.flatMap((item) => [item.total, item.unlocked, item.checked]), 10);

    doc.setDrawColor(226, 232, 240);
    doc.line(plotX, plotY, plotX + plotWidth, plotY);
    doc.line(plotX, plotY + plotHeight, plotX + plotWidth, plotY + plotHeight);

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    for (let i = 0; i <= 4; i += 1) {
      const y = plotY + (plotHeight / 4) * i;
      const value = Math.round((maxValue / 4) * (4 - i));
      doc.line(plotX, y, plotX + plotWidth, y);
      doc.text(`${value}`, plotX - 8, y + 3, { align: 'right' });
    }

    const barWidth = Math.min(12, Math.max(6, barGroupWidth / 4 - 2));
    data.forEach((item, index) => {
      const groupX = plotX + index * barGroupWidth + 10;
      const baseY = plotY + plotHeight;
      const series = [
        { value: item.total, color: [59, 130, 246] },
        { value: item.unlocked, color: [16, 185, 129] },
        { value: item.checked, color: [245, 158, 11] }
      ];

      series.forEach((seriesItem, seriesIndex) => {
        const height = (seriesItem.value / maxValue) * plotHeight;
        const barX = groupX + seriesIndex * (barWidth + 2);
        const barY = baseY - height;
        doc.setFillColor(seriesItem.color[0], seriesItem.color[1], seriesItem.color[2]);
        if (height > 0) doc.rect(barX, barY, barWidth, height, 'F');
      });

      doc.setTextColor(71, 85, 105);
      doc.setFontSize(7);
      const label = item.subject.length > 8 ? `${item.subject.slice(0, 8)}...` : item.subject;
      doc.text(label, groupX + (barGroupWidth / 4), plotY + plotHeight + 12, { align: 'center' });
    });

    const legendX = plotX + plotWidth + 16;
    doc.setFontSize(8);
    doc.setFillColor(59, 130, 246);
    doc.rect(legendX, plotY + 10, 6, 6, 'F');
    doc.text('Total', legendX + 10, plotY + 15);

    doc.setFillColor(16, 185, 129);
    doc.rect(legendX, plotY + 25, 6, 6, 'F');
    doc.text('Unlocked', legendX + 10, plotY + 30);

    doc.setFillColor(245, 158, 11);
    doc.rect(legendX, plotY + 40, 6, 6, 'F');
    doc.text('Checked', legendX + 10, plotY + 45);
  };

  const drawPdfLineChart = (doc, title, series, yStart, chartHeight = 180) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const chartWidth = pageWidth - 32;
    const chartX = 16;
    const chartY = yStart;

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(chartX, chartY, chartWidth, chartHeight, 6, 6, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(chartX, chartY, chartWidth, chartHeight, 6, 6, 'S');

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(title, chartX + 16, chartY + 20);

    const plotX = chartX + 30;
    const plotY = chartY + 40; 
    const plotWidth = chartWidth - 110;
    const plotHeight = chartHeight - 60; 

    doc.setDrawColor(203, 213, 225);
    doc.line(plotX, plotY, plotX, plotY + plotHeight); 
    doc.line(plotX, plotY + plotHeight, plotX + plotWidth, plotY + plotHeight);

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    for (let i = 0; i <= 4; i += 1) {
      const y = plotY + (plotHeight / 4) * i;
      const value = 100 - (25 * i);
      doc.setDrawColor(241, 245, 249);
      doc.line(plotX, y, plotX + plotWidth, y);
      doc.text(`${value}%`, plotX - 8, y + 3, { align: 'right' });
    }

    if (!series || series.length === 0 || series[0].values.length === 0) return;

    const numPoints = series[0].values.length;
    const xStep = numPoints > 1 ? plotWidth / (numPoints - 1) : plotWidth;
    
    // Auto-calculate skip rate for labels to prevent overlapping
    const skipRate = Math.max(1, Math.ceil(numPoints / 8)); 

    const legendX = plotX + plotWidth + 16;
    const legendY = plotY;

    series.forEach((line, index) => {
      const hexToRgb = (hex) => {
        let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
      };
      let color = typeof line.color === 'string' ? hexToRgb(line.color) : line.color;
      
      doc.setDrawColor(color[0], color[1], color[2]);
      doc.setLineWidth(1.5);
      
      line.values.forEach((point, pointIndex) => {
        const x = plotX + pointIndex * xStep;
        const y = plotY + plotHeight - ((point.value / 100) * plotHeight);
        
        if (pointIndex > 0) {
          const prev = line.values[pointIndex - 1];
          const prevX = plotX + (pointIndex - 1) * xStep;
          const prevY = plotY + plotHeight - ((prev.value / 100) * plotHeight);
          doc.line(prevX, prevY, x, y);
        }
        
        doc.setFillColor(255, 255, 255);
        doc.circle(x, y, 2.5, 'FD');

        // Only render label if it aligns with skipRate, or is the very last point
        if (index === 0 && (pointIndex % skipRate === 0 || pointIndex === numPoints - 1)) {
          doc.setTextColor(100, 116, 139);
          doc.setFontSize(7);
          const lbl = point.label;
          doc.text(lbl, x, plotY + plotHeight + 14, { align: 'center' });
        }
      });

      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(legendX, legendY + index * 14, 8, 8, 'F');
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8);
      doc.text(line.name, legendX + 14, legendY + index * 14 + 6);
    });
  };

  const generateDailyTestReport = (doc, student, classInfo) => {
    addPdfHeader(doc, student, classInfo, 'Daily Test Report');
    let yPos = 80;

    const summaryCards = [
      ['Average %', `${student?.dailyPercentage?.toFixed(2) || 0}%`, 'Overall daily performance', [16, 185, 129]],
      ['Highest %', `${student?.dailyStats?.highest?.toFixed(2) || 0}%`, 'Best score achieved', [59, 130, 246]],
      ['Lowest %', `${student?.dailyStats?.lowest?.toFixed(2) || 0}%`, 'Lowest score recorded', [239, 68, 68]],
      ['Attendance %', student?.dailyStats?.total ? `${((student.dailyStats.attempted / student.dailyStats.total) * 100).toFixed(2)}%` : '0%', 'Test participation rate', [245, 158, 11]],
      ['Attempted', student?.dailyStats?.attempted || 0, 'Tests taken', [79, 70, 229]],
      ['Missed', student?.dailyStats?.missed || 0, 'Tests missed', [236, 72, 153]],
      ['Total', student?.dailyStats?.total || 0, 'Scheduled tests', [6, 182, 212]]
    ];

    summaryCards.forEach((card, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      addPdfSummaryCard(doc, 16 + col * 138, yPos + row * 48, card[0], card[1], card[2], card[3], 130, 42);
    });

    yPos += Math.ceil(summaryCards.length / 4) * 48 + 20;

    addPdfSectionTitle(doc, 'Subject-wise Performance', yPos, [59, 130, 246]);
    yPos += 12;

    const subjectData = Array.isArray(student?.subjectAnalytics) ? student.subjectAnalytics.map((s) => {
      const avg = s.dailyTestAvg || 0;
      return [s.subject, `${avg.toFixed(2)}%`, getGrade(avg)];
    }) : [];

    autoTable(doc, {
      head: [['Subject', 'Average %', 'Grade']],
      body: subjectData,
      startY: yPos,
      styles: { fontSize: 10, cellPadding: 4, textColor: [15, 23, 42] },
      headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 16, right: 16 },
    });

    yPos = doc.lastAutoTable.finalY + 25;

    // Check page break before chart
    if (yPos > doc.internal.pageSize.getHeight() - 200) {
      addPdfFooter(doc);
      doc.addPage();
      addPdfHeader(doc, student, classInfo, 'Daily Test Report (Continued)');
      yPos = 80;
    }

    addPdfSectionTitle(doc, 'Overall Daily Test Trend', yPos, [79, 70, 229]);
    yPos += 12;

    // Map the full filtered dataset strictly into a single chronological timeline trend
    const dailyHistory = Array.isArray(student?.dailyStats?.history) 
      ? [...student.dailyStats.history].sort((a, b) => new Date(a.date) - new Date(b.date)) 
      : [];
      
    const trendSeries = [];
    
    if (dailyHistory.length > 0) {
      trendSeries.push({
        name: 'Daily Test %',
        color: '#0ea5e9', // Single bright blue line
        values: dailyHistory.map(entry => ({
          label: formatDate(entry.date),
          value: Number(entry.percentage || 0)
        }))
      });
    }

    if (trendSeries.length > 0) {
      drawPdfLineChart(doc, 'Performance trend by test date', trendSeries, yPos, 200);
    } else {
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(10);
      doc.text('No daily test history available.', 16, yPos + 20);
    }

    addPdfFooter(doc);
  };

  const generateMainExamReport = (doc, student, classInfo) => {
    const examTypesList = student?.mainByExamType ? Object.keys(student.mainByExamType) : [];
    
    if (examTypesList.length === 0) {
      addPdfHeader(doc, student, classInfo, 'Main Exam Report');
      doc.setFontSize(11);
      doc.setTextColor(100, 116, 139);
      doc.text('No Main Exam data available for this student.', 16, 100);
      addPdfFooter(doc);
      return;
    }

    examTypesList.forEach((examType, index) => {
      if (index > 0) doc.addPage();
      addPdfHeader(doc, student, classInfo, `${examType} Report`);
      
      let yPos = 80;
      const examData = student.mainByExamType[examType];

      const summaryCards = [
        ['Overall %', `${examData.percentage?.toFixed(2) || 0}%`, 'Exam Score', [79, 70, 229]],
        ['Overall Grade', examData.grade || 'N/A', 'Final Grade', [16, 185, 129]],
        ['Marks Obtained', `${examData.totalObtained} / ${examData.totalMax}`, 'Total Marks', [245, 158, 11]],
        ['Exam Rank', examData.rank ? `#${examData.rank}` : 'N/A', 'Class Standing', [59, 130, 246]]
      ];

      summaryCards.forEach((card, idx) => {
        addPdfSummaryCard(doc, 16 + idx * 138, yPos, card[0], card[1], card[2], card[3], 130, 42);
      });
      
      yPos += 65;

      const subjectTableData = [];
      const barChartData = [];

      if (Array.isArray(student.subjectAnalytics)) {
        student.subjectAnalytics.forEach(subj => {
          const sData = subj.mainByExamType?.[examType];
          if (sData) {
            const pct = sData.totalMax > 0 ? (sData.totalObtained / sData.totalMax) * 100 : 0;
            const rank = sData.rank || 'N/A';
            
            subjectTableData.push([
              subj.subject,
              `${sData.totalObtained} / ${sData.totalMax}`,
              `${pct.toFixed(2)}%`,
              sData.grade || getGrade(pct),
              rank
            ]);

            barChartData.push({ subject: subj.subject, percentage: pct });
          }
        });
      }

      addPdfSectionTitle(doc, 'Subject Wise Breakdown', yPos, [15, 23, 42]);
      yPos += 12;

      autoTable(doc, {
        head: [['Subject', 'Marks Obtained', 'Percentage', 'Grade', 'Rank']],
        body: subjectTableData,
        startY: yPos,
        styles: { fontSize: 10, cellPadding: 5, textColor: [15, 23, 42] },
        headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 16, right: 16 },
      });

      yPos = doc.lastAutoTable.finalY + 25;

      if (yPos > doc.internal.pageSize.getHeight() - 250) {
        addPdfFooter(doc);
        doc.addPage();
        addPdfHeader(doc, student, classInfo, `${examType} Report (Continued)`);
        yPos = 80;
      }

      drawPdfSingleBarChart(doc, `${examType} Subject Comparison`, barChartData, yPos, 200);

      addPdfFooter(doc);
    });
  };

  const generateNotebookReport = (doc, student, classInfo) => {
    addPdfHeader(doc, student, classInfo, 'Notebook Report');
    let yPos = 80;

    const summaryCards = [
      ['Assigned', student?.notebookStats?.totalChapters || 0, 'Chapters assigned', [79, 70, 229]],
      ['Unlocked', student?.notebookStats?.unlockedChapters || 0, 'Available', [16, 185, 129]],
      ['Checked', student?.notebookStats?.checkedChapters || 0, 'Completed', [245, 158, 11]],
      ['Pending', student?.notebookStats?.pendingChapters || 0, 'Awaiting review', [239, 68, 68]],
      ['Completion', `${student?.notebookPercentage?.toFixed(2) || 0}%`, 'Notebook progress', [59, 130, 246]]
    ];

    summaryCards.forEach((card, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      addPdfSummaryCard(doc, 16 + col * 188, yPos + row * 48, card[0], card[1], card[2], card[3], 178, 42);
    });

    yPos += Math.ceil(summaryCards.length / 3) * 48 + 20;

    addPdfSectionTitle(doc, 'Overall Notebook Progress', yPos, [16, 185, 129]);
    yPos += 14;

    const progressPercent = student?.notebookPercentage || 0;
    const barWidth = doc.internal.pageSize.getWidth() - 32;
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(16, yPos, barWidth, 12, 6, 6, 'F');
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(16, yPos, (progressPercent / 100) * barWidth, 12, 6, 6, 'F');
    
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${progressPercent.toFixed(2)}% Completed`, 16, yPos + 26);

    yPos += 45;

    addPdfSectionTitle(doc, 'Subject-wise Notebook Status', yPos, [59, 130, 246]);
    yPos += 12;

    const subjectData = Array.isArray(student?.subjectAnalytics) ? student.subjectAnalytics.map((s) => [
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
      styles: { fontSize: 10, cellPadding: 4, textColor: [15, 23, 42] },
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 16, right: 16 },
    });

    yPos = doc.lastAutoTable.finalY + 25;

    if (yPos > doc.internal.pageSize.getHeight() - 220) {
      addPdfFooter(doc);
      doc.addPage();
      addPdfHeader(doc, student, classInfo, 'Notebook Report (Continued)');
      yPos = 80;
    }

    const chartData = Array.isArray(student?.subjectAnalytics) ? student.subjectAnalytics.map((subject) => ({
      subject: subject.subject,
      total: subject.notebookData?.total || 0,
      unlocked: subject.notebookData?.unlocked || 0,
      checked: subject.notebookData?.checked || 0
    })) : [];

    if (chartData.length) {
      drawPdfGroupedBarChart(doc, 'Progress comparison by subject', chartData, yPos, 180);
    }

    addPdfFooter(doc);
  };

  const handleExportPDF = () => {
    if (!activeStudent) {
      return toast.warning('Please select a student first to generate detailed report');
    }

    if (!filteredTableData.length) return toast.warning('No data to export');

    const toastId = toast.loading('Generating PDF...');

    try {
      const selectedClassInfo = classes.find((c) => c._id === selectedClass) || {};
      const student = activeStudent;
      const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });

      generateDailyTestReport(doc, student, selectedClassInfo);
      doc.addPage();
      generateMainExamReport(doc, student, selectedClassInfo);
      doc.addPage();
      generateNotebookReport(doc, student, selectedClassInfo);

      doc.save(`${student.name.replace(/\s+/g, '_')}_Complete_Performance_Report.pdf`);
      
      toast.success('PDF downloaded successfully.', { id: toastId });
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to generate PDF. Please try again.', { id: toastId });
    }
  };

  const getGradeFormTrend = (percentage) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  };

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
    <PageStack>
      <PageHeader title="Student Performance" description="Comprehensive academic analytics and tracking" />

      {/* Compact Filters Section */}
      <ErpSection title="Filters" icon={Filter} tone="indigo">
        <div className="rounded-lg border border-indigo-100 bg-white shadow-sm overflow-hidden">
          <div className="grid gap-3 sm:grid-cols-3 p-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Class <span className="text-rose-500">*</span></label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="h-9 rounded-xl border-slate-200 text-sm">
                  <SelectValue placeholder="-- Choose Class --" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
                    <SelectItem key={c._id} value={c._id}>{c.className} - {c.section}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Date Filter</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="h-9 rounded-xl border-slate-200 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Time">All Time</SelectItem>
                  <SelectItem value="Today">Today</SelectItem>
                  <SelectItem value="This Week">This Week</SelectItem>
                  <SelectItem value="This Month">This Month</SelectItem>
                  <SelectItem value="This Year">This Year</SelectItem>
                  <SelectItem value="Specific Date">Specific Date</SelectItem>
                  <SelectItem value="Date Range">Date Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">&nbsp;</label>
              <Button 
                onClick={handleGenerateAnalytics} 
                disabled={loading || !selectedClass}
                size="sm"
                className="w-full h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-sm transition-all"
              >
                {loading ? 'Generating...' : 'Generate Analytics'}
              </Button>
            </div>
          </div>

          {/* Extended Date Filters */}
          {(dateRange === 'Specific Date' || dateRange === 'Date Range') && (
            <div className="border-t border-indigo-50 bg-gradient-to-r from-indigo-50/30 to-blue-50/30 p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {dateRange === 'Specific Date' && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Specific Date</label>
                  <DatePicker
                    value={specificDate}
                    onChange={setSpecificDate}
                    className="h-9 rounded-xl border-slate-200 text-sm"
                  />
                </div>
              )}

              {dateRange === 'Date Range' && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">From Date</label>
                    <DatePicker
                      value={dateFrom}
                      onChange={setDateFrom}
                      className="h-9 rounded-xl border-slate-200 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">To Date</label>
                    <DatePicker
                      value={dateTo}
                      onChange={setDateTo}
                      className="h-9 rounded-xl border-slate-200 text-sm"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </ErpSection>

      {/* Performance Report Section */}
      {filteredTableData.length > 0 && (
        <ErpSection title="Performance Report" icon={BarChart3} tone="indigo">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Search Bar */}
            <div className="p-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/30">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Search student..." 
                  className="pl-10 h-9 text-sm rounded-lg bg-white border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            {/* Modern Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Roll</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Student Name</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Daily Test</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Main Exam</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Notebook</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTableData.map((student, idx) => (
                    <tr key={student._id} className={cn(
                      "hover:bg-indigo-50/40 transition-colors",
                      idx % 2 === 0 && "bg-white",
                      idx % 2 === 1 && "bg-slate-50/30"
                    )}>
                      {/* Roll.Badge */}
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 font-bold text-xs border border-indigo-200">
                          #{student.rollNo}
                        </span>
                      </td>
                      
                      {/* Student Name */}
                      <td className="px-3 py-2">
                        <div className="font-semibold text-slate-800 text-sm">{student.name}</div>
                      </td>
                      
                      {/* Daily Test Badge */}
                      <td className="px-3 py-2">
                        <div className="flex flex-col items-center gap-1">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border",
                            (student.dailyPercentage || 0) >= 75 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            (student.dailyPercentage || 0) >= 50 ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-rose-50 text-rose-700 border-rose-200"
                          )}>
                            🟢 {student.dailyPercentage?.toFixed(1) || 0}%
                          </span>
                        </div>
                      </td>
                      
                      {/* Main Exam Badge */}
                      <td className="px-3 py-2">
                        <div className="flex flex-col items-center gap-1">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border",
                            (student.mainPercentage || 0) >= 75 ? "bg-blue-50 text-blue-700 border-blue-200" :
                            (student.mainPercentage || 0) >= 50 ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-rose-50 text-rose-700 border-rose-200"
                          )}>
                            🔵 {student.mainPercentage?.toFixed(1) || 0}%
                          </span>
                        </div>
                      </td>
                      
                      {/* Notebook Badge */}
                      <td className="px-3 py-2">
                        <div className="flex flex-col items-center gap-1">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border",
                            (student.notebookPercentage || 0) >= 75 ? "bg-cyan-50 text-cyan-700 border-cyan-200" :
                            (student.notebookPercentage || 0) >= 50 ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-rose-50 text-rose-700 border-rose-200"
                          )}>
                            🟣 {student.notebookPercentage?.toFixed(1) || 0}%
                          </span>
                        </div>
                      </td>
                      
                      {/* View Details Button */}
                      <td className="px-3 py-2 text-center">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => openStudentDetails(student)} 
                          className="h-7 px-2.5 text-xs font-medium rounded-lg border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 transition-all flex items-center gap-1 mx-auto"
                        >
                          <Eye className="h-3 w-3" />
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </ErpSection>
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

    </PageStack>
  );
}