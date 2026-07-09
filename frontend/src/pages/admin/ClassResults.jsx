import React, { useEffect, useState, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { FileText, Search, Download, Check, ChevronDown, Filter, BarChart3 } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '@/lib/api';
import { formatClassName } from '@/lib/utils';
import { formatDisplayDate, formatDisplayDateShort } from '@/lib/dateFormatter';
import AbsentBadge from '@/components/AbsentBadge';
import { PageHeader, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import DatePicker from '@/components/ui/DatePicker';
import { useSubscriptionExpiry } from '@/hooks/useSubscriptionExpiry';
import SubscriptionExpiredDialog from '@/components/subscription/SubscriptionExpiredDialog';

const EXAM_TYPES = ['Daily Test', 'PA1', 'PA2', 'PA3', 'PA4', 'FA1', 'FA2', 'Half Yearly', 'Final'];
const MAIN_EXAM_TYPES = ['PA1', 'PA2', 'PA3', 'PA4', 'FA1', 'FA2', 'Half Yearly', 'Final'];

export default function ClassResults() {
  const { isSubscriptionExpired, dialogOpen: expiredDialogOpen, setDialogOpen: setExpiredDialogOpen, checkAndBlock } = useSubscriptionExpiry();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedExamTypes, setSelectedExamTypes] = useState(['Daily Test']);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('rollNo_asc');
  const [dateFilterType, setDateFilterType] = useState('specific');
  const [specificDate, setSpecificDate] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    api.get('/classes').then((r) => {
      setClasses(r.data.classes || []);
    });

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchResults = async () => {
    if (!selectedClass || selectedExamTypes.length === 0) return;

    if (selectedExamTypes.includes('Daily Test')) {
      if (dateFilterType === 'specific' && !specificDate) {
        toast.error('Please select a date for Daily Test report');
        return;
      }
      if (dateFilterType === 'range' && (!dateFrom || !dateTo)) {
        toast.error('Please select date range for Daily Test report');
        return;
      }
    }

    setLoading(true);
    try {
      let params = { classId: selectedClass, examTypes: selectedExamTypes.join(',') };
      
      if (selectedExamTypes.includes('Daily Test')) {
        params.reportType = 'daily';
        if (dateFilterType === 'specific') {
          params.testDate = specificDate;
        } else if (dateFilterType === 'range') {
          params.dateFrom = dateFrom;
          params.dateTo = dateTo;
        }
      }

      const res = await api.get('/class-results', { params });
      setResults(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch results');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = useMemo(() => {
    if (!results?.results) return [];
    const query = searchQuery.toLowerCase();
    let filtered = results.results.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.rollNo.toString().toLowerCase().includes(query)
    );

    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'rollNo_asc': return Number(a.rollNo) - Number(b.rollNo);
        case 'rollNo_desc': return Number(b.rollNo) - Number(a.rollNo);
        case 'name_asc': return a.name.localeCompare(b.name);
        case 'name_desc': return b.name.localeCompare(a.name);
        case 'marks_desc': return b.totalObtained - a.totalObtained;
        case 'marks_asc': return a.totalObtained - b.totalObtained;
        default: return Number(a.rollNo) - Number(b.rollNo);
      }
    });

    return filtered;
  }, [results, searchQuery, sortBy]);

  const isCombinedResults = results?.assessments && !results?.dailyTests && !results?.subjects;

  const maxTotalMarks = useMemo(() => {
    if (isCombinedResults && results?.assessments) {
      return results.assessments.reduce((sum, a) => sum + (a.maxMarks || 0), 0);
    } else if (!isCombinedResults && results?.dailyTests) {
      return results.dailyTests.reduce((sum, dt) => sum + (dt.maxMarks || 0), 0);
    }
    return 0;
  }, [results, isCombinedResults]);

  const exportCSV = () => {
    if (!results) return;

    const isDailyTest = selectedExamTypes.includes('Daily Test');
    const isCombined = isCombinedResults;
    let csvContent;

    if (isCombined) {
      const headerRow1 = ['Total', 'Average', 'Percentage', 'Rank', 'Roll No', 'Student Name'];
      const headerRow2 = ['', '', '', '', '', ''];
      
      results.assessments.forEach((assessment) => {
        headerRow1.push(assessment.examType, '');
        headerRow2.push(`Date: ${formatDisplayDateShort(assessment.date)}`, `Subject: ${assessment.subject}`);
      });

      const headerRow3 = ['Total', 'Average', 'Percentage', 'Rank', 'Roll No', 'Student Name'];
      results.assessments.forEach(() => {
        headerRow3.push('Max Marks', 'Marks Obtained');
      });

      const dataRows = filteredResults.map((r) => {
        const row = [r.totalObtained, r.average, r.percentage, r.rank, r.rollNo, r.name];
        results.assessments.forEach((assessment) => {
          const key = `${assessment.examType}_${assessment._id}`;
          const mark = r.assessments?.[key];
          if (mark?.status === 'not_admitted_yet') {
            row.push(assessment.maxMarks, 'Not Admitted Yet');
          } else {
            row.push(assessment.maxMarks, mark?.status === 'absent' ? 'A' : (mark?.marksObtained ?? ''));
          }
        });
        return row;
      });

      csvContent = [
        headerRow1.join(','),
        headerRow2.join(','),
        headerRow3.join(','),
        ...dataRows.map((row) => row.join(',')),
      ].join('\n');
    } else if (isDailyTest) {
      const headerRow1 = ['Total', 'Average', 'Percentage', 'Rank', 'Roll No', 'Student Name'];
      const headerRow2 = ['', '', '', '', '', ''];
      
      results.dailyTests.forEach((dt, idx) => {
        const testName = `Daily Test ${idx + 1}`;
        const dateStr = formatDisplayDateShort(dt.testDate);
        headerRow1.push(testName, '');
        headerRow2.push(`Date: ${dateStr}`, `Subject: ${dt.subject}`);
      });

      const headerRow3 = ['Total', 'Average', 'Percentage', 'Rank', 'Roll No', 'Student Name'];
      results.dailyTests.forEach((dt) => {
        headerRow3.push('Max Marks', 'Marks Obtained');
      });

      const dataRows = filteredResults.map((r) => {
        const row = [r.totalObtained, r.average, r.percentage, r.rank, r.rollNo, r.name];
        results.dailyTests.forEach((dt) => {
          const mark = r.dailyTests[dt._id];
          if (mark?.status === 'not_admitted_yet') {
            row.push(dt.maxMarks, 'Not Admitted Yet');
          } else {
            row.push(dt.maxMarks, mark?.status === 'absent' ? 'A' : (mark?.marksObtained ?? ''));
          }
        });
        return row;
      });

      csvContent = [
        headerRow1.join(','),
        headerRow2.join(','),
        headerRow3.join(','),
        ...dataRows.map((row) => row.join(',')),
      ].join('\n');
    } else {
      const headers = ['Rank', 'Roll No', 'Student Name', ...results.subjects, 'Total', 'Average', 'Percentage'];
      const rows = filteredResults.map((r) => {
        const subjectMarks = results.subjects.map((s) => r.subjects[s]?.marksObtained || '-');
        return [
          r.rank,
          r.rollNo,
          r.name,
          ...subjectMarks,
          r.totalObtained,
          r.average,
          r.percentage,
        ];
      });

      csvContent = [
        headers.join(','),
        ...rows.map((row) => row.join(',')),
      ].join('\n');
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `class-results-${selectedExamTypes.join('-')}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success('CSV exported successfully');
  };

  const exportXLSX = () => {
    if (!results) return;

    const isDailyTest = selectedExamTypes.includes('Daily Test');
    const isCombined = isCombinedResults;
    let workbook, worksheet;

    if (isCombined) {
      const data = [];
      const headerRow1 = ['Total', 'Average', 'Percentage', 'Rank', 'Roll No', 'Student Name'];
      const headerRow2 = ['', '', '', '', '', ''];
      
      results.assessments.forEach((assessment) => {
        headerRow1.push(assessment.examType, '');
        headerRow2.push(`Date: ${formatDisplayDateShort(assessment.date)}`, `Subject: ${assessment.subject}`);
      });

      const headerRow3 = ['Total', 'Average', 'Percentage', 'Rank', 'Roll No', 'Student Name'];
      results.assessments.forEach(() => {
        headerRow3.push('Max Marks', 'Marks Obtained');
      });

      data.push(headerRow1, headerRow2, headerRow3);

      filteredResults.forEach((r) => {
        const row = [r.totalObtained, r.average, r.percentage, r.rank, r.rollNo, r.name];
        results.assessments.forEach((assessment) => {
          const key = `${assessment.examType}_${assessment._id}`;
          const mark = r.assessments?.[key];
          if (mark?.status === 'not_admitted_yet') {
            row.push(assessment.maxMarks, 'Not Admitted Yet');
          } else {
            row.push(assessment.maxMarks, mark?.status === 'absent' ? 'A' : (mark?.marksObtained ?? ''));
          }
        });
        data.push(row);
      });

      worksheet = XLSX.utils.aoa_to_sheet(data);

      let colIndex = 6;
      results.assessments.forEach((assessment) => {
        worksheet['!merges'] = worksheet['!merges'] || [];
        worksheet['!merges'].push({ s: { r: 0, c: colIndex }, e: { r: 0, c: colIndex + 1 } });
        colIndex += 2;
      });

      const range = XLSX.utils.decode_range(worksheet['!ref']);
      
      const blueHeaderStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '2563EB' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: { top: { style: 'thin', color: { rgb: '1E40AF' } }, bottom: { style: 'thin', color: { rgb: '1E40AF' } }, left: { style: 'thin', color: { rgb: '1E40AF' } }, right: { style: 'thin', color: { rgb: '1E40AF' } } }
      };

      const redHeaderStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: 'DC2626' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: { top: { style: 'thin', color: { rgb: '991B1B' } }, bottom: { style: 'thin', color: { rgb: '991B1B' } }, left: { style: 'thin', color: { rgb: '991B1B' } }, right: { style: 'thin', color: { rgb: '991B1B' } } }
      };

      const subHeaderStyle = {
        font: { bold: true, color: { rgb: '312E81' } },
        fill: { fgColor: { rgb: 'E0E7FF' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: { top: { style: 'thin', color: { rgb: 'C7D2FE' } }, bottom: { style: 'thin', color: { rgb: 'C7D2FE' } }, left: { style: 'thin', color: { rgb: 'C7D2FE' } }, right: { style: 'thin', color: { rgb: 'C7D2FE' } } }
      };

      const keyColumnStyle = {
        font: { bold: true, color: { rgb: '1D4ED8' } },
        fill: { fgColor: { rgb: 'DBEAFE' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: { top: { style: 'thin', color: { rgb: 'BFDBFE' } }, bottom: { style: 'thin', color: { rgb: 'BFDBFE' } }, left: { style: 'thin', color: { rgb: 'BFDBFE' } }, right: { style: 'thin', color: { rgb: 'BFDBFE' } } }
      };

      const dataCellStyle = {
        alignment: { horizontal: 'center', vertical: 'center' },
        border: { top: { style: 'thin', color: { rgb: 'E2E8F0' } }, bottom: { style: 'thin', color: { rgb: 'E2E8F0' } }, left: { style: 'thin', color: { rgb: 'E2E8F0' } }, right: { style: 'thin', color: { rgb: 'E2E8F0' } } }
      };

      const marksObtainedStyle = {
        font: { bold: true, color: { rgb: '4338CA' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: { top: { style: 'thin', color: { rgb: 'E2E8F0' } }, bottom: { style: 'thin', color: { rgb: 'E2E8F0' } }, left: { style: 'thin', color: { rgb: 'E2E8F0' } }, right: { style: 'thin', color: { rgb: 'E2E8F0' } } }
      };

      for (let R = 0; R <= 2; R++) {
        for (let C = 0; C <= range.e.c; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!worksheet[cellAddress]) continue;
          
          if (R === 0 && C < 6) {
            worksheet[cellAddress].s = blueHeaderStyle;
          } else if (R === 0 && C >= 6) {
            const assessmentIndex = Math.floor((C - 6) / 2);
            const assessment = results.assessments[assessmentIndex];
            if (assessment) {
              worksheet[cellAddress].s = assessment.category === 'daily' ? blueHeaderStyle : redHeaderStyle;
            }
          } else if (R === 1) {
            const assessmentIndex = Math.floor((C - 6) / 2);
            const assessment = results.assessments[assessmentIndex];
            if (assessment) {
              worksheet[cellAddress].s = assessment.category === 'daily' ? subHeaderStyle : { ...subHeaderStyle, fill: { fgColor: { rgb: 'FEE2E2' } }, font: { color: { rgb: '991B1B' } } };
            }
          } else if (R === 2) {
            if (C < 6) {
              worksheet[cellAddress].s = blueHeaderStyle;
            } else {
              worksheet[cellAddress].s = subHeaderStyle;
            }
          }
        }
      }

      for (let R = 3; R <= range.e.r; R++) {
        for (let C = 0; C <= range.e.c; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!worksheet[cellAddress]) continue;
          
          if (C < 4) {
            worksheet[cellAddress].s = keyColumnStyle;
          } else if (C === 4 || C === 5) {
            worksheet[cellAddress].s = dataCellStyle;
          } else if ((C - 6) % 2 === 0) {
            worksheet[cellAddress].s = dataCellStyle;
          } else {
            worksheet[cellAddress].s = marksObtainedStyle;
          }
        }
      }

      const colWidths = [];
      for (let C = 0; C <= range.e.c; C++) {
        let maxWidth = 12;
        for (let R = 0; R <= range.e.r; R++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = worksheet[cellAddress];
          if (cell && cell.v) {
            const cellValue = String(cell.v);
            maxWidth = Math.max(maxWidth, Math.min(cellValue.length + 4, 30));
          }
        }
        colWidths.push({ wch: maxWidth });
      }
      worksheet['!cols'] = colWidths;
      worksheet['!freeze'] = { xSplit: 6, ySplit: 3 };

    } else if (isDailyTest) {
      const data = [];
      const headerRow1 = ['Total', 'Average', 'Percentage', 'Rank', 'Roll No', 'Student Name'];
      const headerRow2 = ['', '', '', '', '', ''];
      
      results.dailyTests.forEach((dt, idx) => {
        const testName = `Daily Test ${idx + 1}`;
        const dateStr = formatDisplayDateShort(dt.testDate);
        headerRow1.push(testName, '');
        headerRow2.push(`Date: ${dateStr}`, `Subject: ${dt.subject}`);
      });

      const headerRow3 = ['Total', 'Average', 'Percentage', 'Rank', 'Roll No', 'Student Name'];
      results.dailyTests.forEach((dt) => {
        headerRow3.push('Max Marks', 'Marks Obtained');
      });

      data.push(headerRow1, headerRow2, headerRow3);

      filteredResults.forEach((r) => {
        const row = [r.totalObtained, r.average, r.percentage, r.rank, r.rollNo, r.name];
        results.dailyTests.forEach((dt) => {
          const mark = r.dailyTests[dt._id];
          if (mark?.status === 'not_admitted_yet') {
            row.push(dt.maxMarks, 'Not Admitted Yet');
          } else {
            row.push(dt.maxMarks, mark?.status === 'absent' ? 'A' : (mark?.marksObtained ?? ''));
          }
        });
        data.push(row);
      });

      worksheet = XLSX.utils.aoa_to_sheet(data);

      let colIndex = 6;
      results.dailyTests.forEach((dt) => {
        worksheet['!merges'] = worksheet['!merges'] || [];
        worksheet['!merges'].push({ s: { r: 0, c: colIndex }, e: { r: 0, c: colIndex + 1 } });
        colIndex += 2;
      });

      const range = XLSX.utils.decode_range(worksheet['!ref']);
      
      const blueHeaderStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '2563EB' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: { top: { style: 'thin', color: { rgb: '1E40AF' } }, bottom: { style: 'thin', color: { rgb: '1E40AF' } }, left: { style: 'thin', color: { rgb: '1E40AF' } }, right: { style: 'thin', color: { rgb: '1E40AF' } } }
      };

      const indigoHeaderStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4F46E5' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: { top: { style: 'thin', color: { rgb: '3730A3' } }, bottom: { style: 'thin', color: { rgb: '3730A3' } }, left: { style: 'thin', color: { rgb: '3730A3' } }, right: { style: 'thin', color: { rgb: '3730A3' } } }
      };

      const subHeaderStyle = {
        font: { bold: true, color: { rgb: '312E81' } },
        fill: { fgColor: { rgb: 'E0E7FF' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: { top: { style: 'thin', color: { rgb: 'C7D2FE' } }, bottom: { style: 'thin', color: { rgb: 'C7D2FE' } }, left: { style: 'thin', color: { rgb: 'C7D2FE' } }, right: { style: 'thin', color: { rgb: 'C7D2FE' } } }
      };

      const keyColumnStyle = {
        font: { bold: true, color: { rgb: '1D4ED8' } },
        fill: { fgColor: { rgb: 'DBEAFE' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: { top: { style: 'thin', color: { rgb: 'BFDBFE' } }, bottom: { style: 'thin', color: { rgb: 'BFDBFE' } }, left: { style: 'thin', color: { rgb: 'BFDBFE' } }, right: { style: 'thin', color: { rgb: 'BFDBFE' } } }
      };

      const dataCellStyle = {
        alignment: { horizontal: 'center', vertical: 'center' },
        border: { top: { style: 'thin', color: { rgb: 'E2E8F0' } }, bottom: { style: 'thin', color: { rgb: 'E2E8F0' } }, left: { style: 'thin', color: { rgb: 'E2E8F0' } }, right: { style: 'thin', color: { rgb: 'E2E8F0' } } }
      };

      const marksObtainedStyle = {
        font: { bold: true, color: { rgb: '4338CA' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: { top: { style: 'thin', color: { rgb: 'E2E8F0' } }, bottom: { style: 'thin', color: { rgb: 'E2E8F0' } }, left: { style: 'thin', color: { rgb: 'E2E8F0' } }, right: { style: 'thin', color: { rgb: 'E2E8F0' } } }
      };

      for (let R = 0; R <= 2; R++) {
        for (let C = 0; C <= range.e.c; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!worksheet[cellAddress]) continue;
          
          if (R === 0 && C < 6) {
            worksheet[cellAddress].s = blueHeaderStyle;
          } else if (R === 0 && C >= 6) {
            worksheet[cellAddress].s = indigoHeaderStyle;
          } else if (R === 1) {
            worksheet[cellAddress].s = indigoHeaderStyle;
          } else if (R === 2) {
            if (C < 6) {
              worksheet[cellAddress].s = blueHeaderStyle;
            } else {
              worksheet[cellAddress].s = subHeaderStyle;
            }
          }
        }
      }

      for (let R = 3; R <= range.e.r; R++) {
        for (let C = 0; C <= range.e.c; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!worksheet[cellAddress]) continue;
          
          if (C < 4) {
            worksheet[cellAddress].s = keyColumnStyle;
          } else if (C === 4 || C === 5) {
            worksheet[cellAddress].s = dataCellStyle;
          } else if ((C - 6) % 2 === 0) {
            worksheet[cellAddress].s = dataCellStyle;
          } else {
            worksheet[cellAddress].s = marksObtainedStyle;
          }
        }
      }

      const colWidths = [];
      for (let C = 0; C <= range.e.c; C++) {
        let maxWidth = 12;
        for (let R = 0; R <= range.e.r; R++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = worksheet[cellAddress];
          if (cell && cell.v) {
            const cellValue = String(cell.v);
            maxWidth = Math.max(maxWidth, Math.min(cellValue.length + 4, 30));
          }
        }
        colWidths.push({ wch: maxWidth });
      }
      worksheet['!cols'] = colWidths;
      worksheet['!freeze'] = { xSplit: 6, ySplit: 3 };

    } else {
      const headers = ['Rank', 'Roll No', 'Student Name', ...results.subjects, 'Total', 'Average', 'Percentage'];
      const data = [headers];

      filteredResults.forEach((r) => {
        const subjectMarks = results.subjects.map((s) => {
          const mark = r.subjects[s];
          if (mark?.status === 'not_admitted_yet') {
            return 'Not Admitted Yet';
          }
          return mark?.status === 'absent' ? 'A' : (mark?.marksObtained ?? '-');
        });
        data.push([
          r.rank,
          r.rollNo,
          r.name,
          ...subjectMarks,
          r.totalObtained,
          r.average,
          r.percentage,
        ]);
      });

      worksheet = XLSX.utils.aoa_to_sheet(data);

      const range = XLSX.utils.decode_range(worksheet['!ref']);
      
      const headerStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '2563EB' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: { top: { style: 'thin', color: { rgb: '1E40AF' } }, bottom: { style: 'thin', color: { rgb: '1E40AF' } }, left: { style: 'thin', color: { rgb: '1E40AF' } }, right: { style: 'thin', color: { rgb: '1E40AF' } } }
      };

      const dataStyle = {
        alignment: { horizontal: 'center', vertical: 'center' },
        border: { top: { style: 'thin', color: { rgb: 'E2E8F0' } }, bottom: { style: 'thin', color: { rgb: 'E2E8F0' } }, left: { style: 'thin', color: { rgb: 'E2E8F0' } }, right: { style: 'thin', color: { rgb: 'E2E8F0' } } }
      };

      for (let C = 0; C <= range.e.c; C++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!worksheet[cellAddress]) continue;
        worksheet[cellAddress].s = headerStyle;
      }

      for (let R = 1; R <= range.e.r; R++) {
        for (let C = 0; C <= range.e.c; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!worksheet[cellAddress]) continue;
          worksheet[cellAddress].s = dataStyle;
        }
      }

      const colWidths = [];
      for (let C = 0; C <= range.e.c; C++) {
        let maxWidth = 12;
        for (let R = 0; R <= range.e.r; R++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = worksheet[cellAddress];
          if (cell && cell.v) {
            const cellValue = String(cell.v);
            maxWidth = Math.max(maxWidth, Math.min(cellValue.length + 4, 30));
          }
        }
        colWidths.push({ wch: maxWidth });
      }
      worksheet['!cols'] = colWidths;
      worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };
    }

    workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
    XLSX.writeFile(workbook, `class-results-${selectedExamTypes.join('-')}-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('XLSX exported successfully');
  };

  const exportPDF = async () => {
    if (!results) return;

    try {
      const params = { classId: selectedClass, examTypes: selectedExamTypes.join(',') };
      
      if (selectedExamTypes.includes('Daily Test')) {
        params.reportType = 'daily';
        if (dateFilterType === 'specific') {
          params.testDate = specificDate;
        } else if (dateFilterType === 'range') {
          params.dateFrom = dateFrom;
          params.dateTo = dateTo;
        }
      }
      
      const response = await api.get('/class-results/export-pdf', {
        params,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `class-results-${selectedExamTypes.join('-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF exported successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to export PDF');
    }
  };

  return (
    <PageStack className="min-h-screen bg-[#FAFAFA] dark:bg-slate-950">
      <PageHeader
        title="Class Results"
        description="View complete class-wise exam results with dynamic subject columns."
      />

      {/* COMPACT & GRADIENT FILTERS SECTION */}
      <div className="rounded-xl border border-indigo-100 bg-white shadow-sm mb-6 dark:border-slate-800 dark:bg-slate-900 relative z-20">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 dark:from-indigo-950/30 dark:to-slate-900 px-4 py-3 border-b border-indigo-100 dark:border-slate-800 rounded-t-xl">
          <div className="flex items-center gap-2 font-bold text-indigo-700 dark:text-indigo-400 text-sm">
            <Filter className="h-4 w-4" /> Filters
          </div>
        </div>
        
        <div className="p-4">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Class</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-full h-9 text-sm shadow-sm rounded-lg">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {formatClassName(c.className)}-{c.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Show Results (Select Multiple)</label>
              <div className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2 h-24 overflow-y-auto space-y-1 shadow-inner custom-scrollbar">
                {EXAM_TYPES.map((type) => {
                  const isChecked = selectedExamTypes.includes(type);
                  return (
                    <label
                      key={type}
                      className="flex items-center space-x-3 rounded px-2 py-1 hover:bg-white cursor-pointer select-none text-[13px] font-medium text-slate-700 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedExamTypes([...selectedExamTypes, type]);
                          } else {
                            setSelectedExamTypes(selectedExamTypes.filter((t) => t !== type));
                          }
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className={isChecked ? 'font-bold text-indigo-700' : ''}>
                        {type}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {selectedExamTypes.includes('Daily Test') && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date Filter</label>
                  <Select value={dateFilterType} onValueChange={setDateFilterType}>
                    <SelectTrigger className="w-full h-9 text-sm shadow-sm rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="specific">Specific Date</SelectItem>
                      <SelectItem value="range">Date Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {dateFilterType === 'specific' ? (
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Test Date</label>
                    <DatePicker value={specificDate} onChange={(date) => setSpecificDate(date)} className="w-full h-9 text-sm relative z-30" />
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1">
                      <label className="mb-1.5 block text-[11px] font-bold text-slate-500 uppercase tracking-wider">From</label>
                      <DatePicker value={dateFrom} onChange={(date) => setDateFrom(date)} className="w-full h-9 text-sm relative z-30" />
                    </div>
                    <div className="flex-1">
                      <label className="mb-1.5 block text-[11px] font-bold text-slate-500 uppercase tracking-wider">To</label>
                      <DatePicker value={dateTo} onChange={(date) => setDateTo(date)} className="w-full h-9 text-sm relative z-30" />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sort By</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full h-9 text-sm shadow-sm rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rollNo_asc">Roll No (Ascending)</SelectItem>
                  <SelectItem value="rollNo_desc">Roll No (Descending)</SelectItem>
                  <SelectItem value="name_asc">Student Name (A-Z)</SelectItem>
                  <SelectItem value="name_desc">Student Name (Z-A)</SelectItem>
                  <SelectItem value="marks_desc">Marks (High to Low)</SelectItem>
                  <SelectItem value="marks_asc">Marks (Low to High)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-5 flex flex-col sm:flex-row flex-wrap gap-2 relative z-0">
            <Button size="sm" className="w-full sm:w-auto h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-medium" onClick={() => {
              if (!checkAndBlock(() => fetchResults())) return;
            }} disabled={!selectedClass || selectedExamTypes.length === 0 || loading}>
              {loading ? 'Loading...' : 'View Results'}
            </Button>
            
            {results && (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button size="sm" variant="outline" className="w-full sm:w-auto h-9 px-3 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm" onClick={() => {
                  if (!checkAndBlock(() => exportCSV())) return;
                }}>
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Export CSV
                </Button>
                <Button size="sm" variant="outline" className="w-full sm:w-auto h-9 px-3 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm" onClick={() => {
                  if (!checkAndBlock(() => exportXLSX())) return;
                }}>
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Export XLSX
                </Button>
                {!selectedExamTypes.includes('Daily Test') && (
                  <Button size="sm" variant="outline" className="w-full sm:w-auto h-9 px-3 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm" onClick={() => {
                    if (!checkAndBlock(() => exportPDF())) return;
                  }}>
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Export PDF
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {results && (
        <div className="relative z-10">
          {/* COMPACT SEARCH SECTION */}
          <div className="rounded-xl border border-indigo-100 bg-white shadow-sm overflow-hidden mb-6">
            <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Search Student:</label>
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Type name or roll no..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 h-9 text-sm shadow-sm rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
          </div>

          {/* COMPACT & GRADIENT RESULTS SECTION */}
          <div className="rounded-xl border border-emerald-100 bg-white shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50/50 px-4 py-3 border-b border-emerald-100 flex justify-between items-center rounded-t-xl">
              <div className="flex items-center gap-2 font-bold text-emerald-700 text-sm">
                <BarChart3 className="h-4 w-4" /> Result Data
              </div>
            </div>

            <div className="p-4">
              <div className="mb-4 rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[13px]">
                  <div>
                    <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider block">School</span>
                    <span className="font-medium text-slate-800">{results.schoolName}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider block">Class</span>
                    <span className="font-medium text-slate-800">{formatClassName(results.className)}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider block">Exam Type</span>
                    <span className="font-medium text-slate-800">{results.examType}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider block">Generated</span>
                    <span className="font-medium text-slate-800">
                      {formatDisplayDate(results.generatedDate)}
                    </span>
                  </div>
                </div>
              </div>

              {filteredResults.length === 0 ? (
                <div className="py-10 text-center text-sm font-medium text-slate-500">No results found</div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200" style={{ minWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
                  <Table style={{ minWidth: 'max-content' }}>
                    <TableHeader>
                      {isCombinedResults ? (
                        <>
                          <TableRow>
                            <TableHead rowSpan={2} className="md:sticky md:left-0 bg-indigo-600 text-white z-10 border-r border-indigo-500 py-1 px-2 text-[10px] uppercase tracking-wider" style={{ minWidth: '60px' }}>
                              Total
                              {maxTotalMarks > 0 && <span className="block text-[9px] font-normal opacity-80 mt-0.5">({maxTotalMarks})</span>}
                            </TableHead>
                            <TableHead rowSpan={2} className="md:sticky bg-indigo-600 text-white z-10 border-r border-indigo-500 py-1 px-2 text-[10px] uppercase tracking-wider" style={{ minWidth: '60px', left: '60px' }}>
                              Average
                            </TableHead>
                            <TableHead rowSpan={2} className="md:sticky bg-indigo-600 text-white z-10 border-r border-indigo-500 py-1 px-2 text-[10px] uppercase tracking-wider" style={{ minWidth: '50px', left: '120px' }}>%</TableHead>
                            <TableHead rowSpan={2} className="md:sticky bg-indigo-600 text-white z-10 border-r border-indigo-500 py-1 px-2 text-[10px] uppercase tracking-wider" style={{ minWidth: '50px', left: '170px' }}>Rank</TableHead>
                            <TableHead rowSpan={2} className="md:sticky bg-indigo-600 text-white z-10 border-r border-indigo-500 py-1 px-2 text-[10px] uppercase tracking-wider" style={{ minWidth: '60px', left: '220px' }}>Roll No</TableHead>
                            <TableHead rowSpan={2} className="md:sticky bg-indigo-600 text-white z-10 border-r border-indigo-500 py-1 px-2 text-[10px] uppercase tracking-wider" style={{ minWidth: '150px', left: '280px' }}>Student Name</TableHead>
                            {results.assessments?.map((assessment) => (
                              <TableHead
                                key={assessment._id}
                                colSpan={2}
                                className={`text-center border-r p-0 ${
                                  assessment.category === 'daily'
                                    ? 'bg-blue-100 border-blue-200'
                                    : 'bg-rose-100 border-rose-200'
                                }`}
                                style={{ minWidth: '160px' }}
                              >
                                <div className={`px-2 py-1 text-white ${
                                  assessment.category === 'daily' ? 'bg-blue-600' : 'bg-rose-600'
                                }`}>
                                  <div className="text-[11px] font-bold">{assessment.examType}</div>
                                  <div className="text-[9px] opacity-90">{formatDisplayDateShort(assessment.date)}</div>
                                  <div className="text-[9px] opacity-80">{assessment.subject}</div>
                                </div>
                              </TableHead>
                            ))}
                          </TableRow>
                          <TableRow>
                            {results.assessments?.map((assessment) => (
                              <React.Fragment key={`${assessment._id}-headers`}>
                                <TableHead
                                  className={`text-center border-r font-bold py-1 px-2 text-[10px] uppercase tracking-wider ${
                                    assessment.category === 'daily'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}
                                  style={{ minWidth: '75px' }}
                                >
                                  Max Marks
                                </TableHead>
                                <TableHead
                                  className={`text-center border-r font-bold py-1 px-2 text-[10px] uppercase tracking-wider ${
                                    assessment.category === 'daily'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}
                                  style={{ minWidth: '85px' }}
                                >
                                  Marks Obtained
                                </TableHead>
                              </React.Fragment>
                            ))}
                          </TableRow>
                        </>
                      ) : (
                        <>
                          {selectedExamTypes.includes('Daily Test') && (
                            <TableRow>
                              <TableHead rowSpan={2} className="md:sticky md:left-0 bg-indigo-600 text-white z-10 border-r border-indigo-500 py-1 px-2 text-[10px] uppercase tracking-wider" style={{ minWidth: '60px' }}>
                                Total
                                {maxTotalMarks > 0 && <span className="block text-[9px] font-normal opacity-80 mt-0.5">({maxTotalMarks})</span>}
                              </TableHead>
                              <TableHead rowSpan={2} className="md:sticky bg-indigo-600 text-white z-10 border-r border-indigo-500 py-1 px-2 text-[10px] uppercase tracking-wider" style={{ minWidth: '60px', left: '60px' }}>
                                Average
                              </TableHead>
                              <TableHead rowSpan={2} className="md:sticky bg-indigo-600 text-white z-10 border-r border-indigo-500 py-1 px-2 text-[10px] uppercase tracking-wider" style={{ minWidth: '50px', left: '120px' }}>%</TableHead>
                              <TableHead rowSpan={2} className="md:sticky bg-indigo-600 text-white z-10 border-r border-indigo-500 py-1 px-2 text-[10px] uppercase tracking-wider" style={{ minWidth: '50px', left: '170px' }}>Rank</TableHead>
                              <TableHead rowSpan={2} className="md:sticky bg-indigo-600 text-white z-10 border-r border-indigo-500 py-1 px-2 text-[10px] uppercase tracking-wider" style={{ minWidth: '60px', left: '220px' }}>Roll No</TableHead>
                              <TableHead rowSpan={2} className="md:sticky bg-indigo-600 text-white z-10 border-r border-indigo-500 py-1 px-2 text-[10px] uppercase tracking-wider" style={{ minWidth: '150px', left: '280px' }}>Student Name</TableHead>
                              {results.dailyTests?.map((dt, idx) => (
                                <TableHead key={`${dt._id}-info`} colSpan={2} className="text-center bg-indigo-100 border-r border-indigo-200 p-0" style={{ minWidth: '160px' }}>
                                  <div className="bg-indigo-600 px-2 py-1 text-white">
                                    <div className="text-[11px] font-bold">Daily Test {idx + 1}</div>
                                    <div className="text-[9px] text-indigo-100">{formatDisplayDateShort(dt.testDate)}</div>
                                    <div className="text-[9px] text-indigo-200">{dt.subject}</div>
                                  </div>
                                </TableHead>
                              ))}
                            </TableRow>
                          )}
                          <TableRow>
                            {selectedExamTypes.includes('Daily Test') ? (
                              <>
                                {results.dailyTests?.map((dt) => (
                                  <React.Fragment key={`${dt._id}-subheaders`}>
                                    <TableHead className="text-center bg-indigo-50 border-r border-indigo-200 font-bold text-indigo-700 py-1 px-2 text-[10px] uppercase tracking-wider" style={{ minWidth: '75px' }}>Max Marks</TableHead>
                                    <TableHead className="text-center bg-indigo-50 border-r border-indigo-200 font-bold text-indigo-700 py-1 px-2 text-[10px] uppercase tracking-wider" style={{ minWidth: '85px' }}>Marks Obtained</TableHead>
                                  </React.Fragment>
                                ))}
                              </>
                            ) : (
                              <>
                                <TableHead className="py-1 px-2 text-[10px] uppercase tracking-wider font-bold">Rank</TableHead>
                                <TableHead className="py-1 px-2 text-[10px] uppercase tracking-wider font-bold">Roll No</TableHead>
                                <TableHead className="py-1 px-2 text-[10px] uppercase tracking-wider font-bold">Student Name</TableHead>
                                {results.subjects.map((subject) => (
                                  <TableHead className="py-1 px-2 text-[10px] uppercase tracking-wider font-bold" key={subject}>{subject}</TableHead>
                                ))}
                                <TableHead className="py-1 px-2 text-[10px] uppercase tracking-wider font-bold">Total</TableHead>
                                <TableHead className="py-1 px-2 text-[10px] uppercase tracking-wider font-bold">Average</TableHead>
                                <TableHead className="py-1 px-2 text-[10px] uppercase tracking-wider font-bold">Percentage</TableHead>
                              </>
                            )}
                          </TableRow>
                        </>
                      )}
                    </TableHeader>
                    <TableBody>
                      {filteredResults.map((student, index) => (
                        <TableRow key={student.studentId} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-slate-100 transition-colors`}>
                          {isCombinedResults ? (
                            <>
                              <TableCell className="md:sticky md:left-0 bg-indigo-50 z-10 font-bold text-indigo-700 border-r border-slate-200 py-1 px-2 text-[12px]" style={{ minWidth: '60px' }}>{student.totalObtained}</TableCell>
                              <TableCell className="md:sticky bg-indigo-50 z-10 font-semibold text-indigo-600 border-r border-slate-200 py-1 px-2 text-[12px]" style={{ minWidth: '60px', left: '60px' }}>{student.average}</TableCell>
                              <TableCell className="md:sticky bg-indigo-50 z-10 font-semibold text-indigo-600 border-r border-slate-200 py-1 px-2 text-[12px]" style={{ minWidth: '50px', left: '120px' }}>{student.percentage}%</TableCell>
                              <TableCell className="md:sticky bg-indigo-50 z-10 font-bold text-indigo-700 border-r border-slate-200 py-1 px-2 text-[12px]" style={{ minWidth: '50px', left: '170px' }}>{student.rank}</TableCell>
                              <TableCell className="md:sticky bg-white z-10 border-r border-slate-200 py-1 px-2 text-[12px]" style={{ minWidth: '60px', left: '220px' }}>{student.rollNo}</TableCell>
                              <TableCell className="md:sticky bg-white z-10 font-medium border-r border-slate-200 py-1 px-2 text-[12px]" style={{ minWidth: '150px', left: '280px' }}>{student.name}</TableCell>
                              {results.assessments?.map((assessment) => {
                                const key = `${assessment.examType}_${assessment._id}`;
                                const mark = student.assessments?.[key];
                                return (
                                  <React.Fragment key={`${assessment._id}-student-marks`}>
                                    <TableCell
                                      className={`text-center border-r py-1 px-2 text-[12px] ${
                                        assessment.category === 'daily'
                                          ? 'bg-blue-50/50 text-blue-700 border-blue-100'
                                          : 'bg-rose-50/50 text-rose-700 border-rose-100'
                                      }`}
                                      style={{ minWidth: '75px' }}
                                    >
                                      {assessment.maxMarks}
                                    </TableCell>
                                    <TableCell
                                      className={`text-center border-r font-semibold py-1 px-2 text-[12px] ${
                                        assessment.category === 'daily'
                                          ? 'bg-blue-50/50 text-blue-700 border-blue-100'
                                          : 'bg-rose-50/50 text-rose-700 border-rose-100'
                                      }`}
                                      style={{ minWidth: '85px' }}
                                    >
                                      {mark?.status === 'not_admitted_yet' ? (
                                        <span className="text-slate-400 text-xs">Not Admitted Yet</span>
                                      ) : mark?.status === 'absent' ? (
                                        <AbsentBadge />
                                      ) : (
                                        mark?.marksObtained ?? '-'
                                      )}
                                    </TableCell>
                                  </React.Fragment>
                                );
                              })}
                            </>
                          ) : (
                            <>
                              {selectedExamTypes.includes('Daily Test') ? (
                                <>
                                  <TableCell className="md:sticky md:left-0 bg-indigo-50 z-10 font-bold text-indigo-700 border-r border-slate-200 py-1 px-2 text-[12px]" style={{ minWidth: '60px' }}>{student.totalObtained}</TableCell>
                                  <TableCell className="md:sticky bg-indigo-50 z-10 font-semibold text-indigo-600 border-r border-slate-200 py-1 px-2 text-[12px]" style={{ minWidth: '60px', left: '60px' }}>{student.average}</TableCell>
                                  <TableCell className="md:sticky bg-indigo-50 z-10 font-semibold text-indigo-600 border-r border-slate-200 py-1 px-2 text-[12px]" style={{ minWidth: '50px', left: '120px' }}>{student.percentage}%</TableCell>
                                  <TableCell className="md:sticky bg-indigo-50 z-10 font-bold text-indigo-700 border-r border-slate-200 py-1 px-2 text-[12px]" style={{ minWidth: '50px', left: '170px' }}>{student.rank}</TableCell>
                                  <TableCell className="md:sticky bg-white z-10 border-r border-slate-200 py-1 px-2 text-[12px]" style={{ minWidth: '60px', left: '220px' }}>{student.rollNo}</TableCell>
                                  <TableCell className="md:sticky bg-white z-10 font-medium border-r border-slate-200 py-1 px-2 text-[12px]" style={{ minWidth: '150px', left: '280px' }}>{student.name}</TableCell>
                                  {results.dailyTests?.map((dt) => {
                                    const mark = student.dailyTests[dt._id];
                                    return (
                                      <React.Fragment key={`${dt._id}-student-dt`}>
                                        <TableCell className="text-center border-r border-slate-200 text-slate-600 py-1 px-2 text-[12px]" style={{ minWidth: '75px' }}>{dt.maxMarks}</TableCell>
                                        <TableCell className="text-center border-r border-slate-200 font-semibold text-indigo-700 py-1 px-2 text-[12px]" style={{ minWidth: '85px' }}>
                                          {mark?.status === 'not_admitted_yet' ? (
                                            <span className="text-slate-400 text-xs">Not Admitted Yet</span>
                                          ) : mark?.status === 'absent' ? (
                                            <AbsentBadge />
                                          ) : (
                                            mark?.marksObtained ?? ''
                                          )}
                                        </TableCell>
                                      </React.Fragment>
                                    );
                                  })}
                                </>
                              ) : (
                                <>
                                  <TableCell className="font-medium py-1 px-2 text-[12px]">{student.rank}</TableCell>
                                  <TableCell className="py-1 px-2 text-[12px]">{student.rollNo}</TableCell>
                                  <TableCell className="font-medium py-1 px-2 text-[12px]">{student.name}</TableCell>
                                  {results.subjects.map((subject) => {
                                    const mark = student.subjects[subject];
                                    return (
                                      <TableCell className="py-1 px-2 text-[12px]" key={subject}>
                                        {mark?.status === 'not_admitted_yet' ? (
                                          <span className="text-slate-400 text-xs">Not Admitted Yet</span>
                                        ) : (
                                          mark?.marksObtained || '-'
                                        )}
                                      </TableCell>
                                    );
                                  })}
                                  <TableCell className="font-medium py-1 px-2 text-[12px]">{student.totalObtained}</TableCell>
                                  <TableCell className="py-1 px-2 text-[12px]">{student.average}</TableCell>
                                  <TableCell className="py-1 px-2 text-[12px]">{student.percentage}%</TableCell>
                                </>
                              )}
                            </>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <SubscriptionExpiredDialog
        open={expiredDialogOpen}
        onOpenChange={setExpiredDialogOpen}
      />
    </PageStack>
  );
}