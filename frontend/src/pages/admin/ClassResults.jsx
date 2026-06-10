import React, { useEffect, useState, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { FileText, Search, Download, Check, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '@/lib/api';
import { formatClassName } from '@/lib/utils';
import { formatDisplayDate, formatDisplayDateShort } from '@/lib/dateFormatter';
import AbsentBadge from '@/components/AbsentBadge';
import { PageHeader, ErpSection, FormField, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const EXAM_TYPES = ['Daily Test', 'PA1', 'PA2', 'PA3', 'PA4', 'FA1', 'FA2', 'Half Yearly', 'Final'];
const MAIN_EXAM_TYPES = ['PA1', 'PA2', 'PA3', 'PA4', 'FA1', 'FA2', 'Half Yearly', 'Final'];

export default function ClassResults() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedExamTypes, setSelectedExamTypes] = useState(['Daily Test']);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('rollNo_asc');
  const [dateFilterType, setDateFilterType] = useState('specific'); // 'specific' or 'range'
  const [specificDate, setSpecificDate] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Dropdown toggler aur reference node tracker
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
        } else {
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
        case 'rollNo_asc':
          return Number(a.rollNo) - Number(b.rollNo);
        case 'rollNo_desc':
          return Number(b.rollNo) - Number(a.rollNo);
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'marks_desc':
          return b.totalObtained - a.totalObtained;
        case 'marks_asc':
          return a.totalObtained - b.totalObtained;
        default:
          return Number(a.rollNo) - Number(b.rollNo);
      }
    });

    return filtered;
  }, [results, searchQuery, sortBy]);

  const isCombinedResults = results?.assessments && !results?.dailyTests && !results?.subjects;

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
          row.push(assessment.maxMarks, mark && mark.status === 'absent' ? 'A' : (mark?.marksObtained || ''));
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
          row.push(dt.maxMarks, mark && mark.status === 'absent' ? 'A' : (mark ? mark.marksObtained : ''));
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
          row.push(assessment.maxMarks, mark && mark.status === 'absent' ? 'A' : (mark?.marksObtained || ''));
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
        border: {
          top: { style: 'thin', color: { rgb: '1E40AF' } },
          bottom: { style: 'thin', color: { rgb: '1E40AF' } },
          left: { style: 'thin', color: { rgb: '1E40AF' } },
          right: { style: 'thin', color: { rgb: '1E40AF' } }
        }
      };

      const redHeaderStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: 'DC2626' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '991B1B' } },
          bottom: { style: 'thin', color: { rgb: '991B1B' } },
          left: { style: 'thin', color: { rgb: '991B1B' } },
          right: { style: 'thin', color: { rgb: '991B1B' } }
        }
      };

      const subHeaderStyle = {
        font: { bold: true, color: { rgb: '312E81' } },
        fill: { fgColor: { rgb: 'E0E7FF' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'C7D2FE' } },
          bottom: { style: 'thin', color: { rgb: 'C7D2FE' } },
          left: { style: 'thin', color: { rgb: 'C7D2FE' } },
          right: { style: 'thin', color: { rgb: 'C7D2FE' } }
        }
      };

      const keyColumnStyle = {
        font: { bold: true, color: { rgb: '1D4ED8' } },
        fill: { fgColor: { rgb: 'DBEAFE' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'BFDBFE' } },
          bottom: { style: 'thin', color: { rgb: 'BFDBFE' } },
          left: { style: 'thin', color: { rgb: 'BFDBFE' } },
          right: { style: 'thin', color: { rgb: 'BFDBFE' } }
        }
      };

      const dataCellStyle = {
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'E2E8F0' } },
          bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
          left: { style: 'thin', color: { rgb: 'E2E8F0' } },
          right: { style: 'thin', color: { rgb: 'E2E8F0' } }
        }
      };

      const marksObtainedStyle = {
        font: { bold: true, color: { rgb: '4338CA' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'E2E8F0' } },
          bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
          left: { style: 'thin', color: { rgb: 'E2E8F0' } },
          right: { style: 'thin', color: { rgb: 'E2E8F0' } }
        }
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
          row.push(dt.maxMarks, mark && mark.status === 'absent' ? 'A' : (mark ? mark.marksObtained : ''));
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
        border: {
          top: { style: 'thin', color: { rgb: '1E40AF' } },
          bottom: { style: 'thin', color: { rgb: '1E40AF' } },
          left: { style: 'thin', color: { rgb: '1E40AF' } },
          right: { style: 'thin', color: { rgb: '1E40AF' } }
        }
      };

      const indigoHeaderStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4F46E5' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '3730A3' } },
          bottom: { style: 'thin', color: { rgb: '3730A3' } },
          left: { style: 'thin', color: { rgb: '3730A3' } },
          right: { style: 'thin', color: { rgb: '3730A3' } }
        }
      };

      const subHeaderStyle = {
        font: { bold: true, color: { rgb: '312E81' } },
        fill: { fgColor: { rgb: 'E0E7FF' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'C7D2FE' } },
          bottom: { style: 'thin', color: { rgb: 'C7D2FE' } },
          left: { style: 'thin', color: { rgb: 'C7D2FE' } },
          right: { style: 'thin', color: { rgb: 'C7D2FE' } }
        }
      };

      const keyColumnStyle = {
        font: { bold: true, color: { rgb: '1D4ED8' } },
        fill: { fgColor: { rgb: 'DBEAFE' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'BFDBFE' } },
          bottom: { style: 'thin', color: { rgb: 'BFDBFE' } },
          left: { style: 'thin', color: { rgb: 'BFDBFE' } },
          right: { style: 'thin', color: { rgb: 'BFDBFE' } }
        }
      };

      const dataCellStyle = {
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'E2E8F0' } },
          bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
          left: { style: 'thin', color: { rgb: 'E2E8F0' } },
          right: { style: 'thin', color: { rgb: 'E2E8F0' } }
        }
      };

      const marksObtainedStyle = {
        font: { bold: true, color: { rgb: '4338CA' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'E2E8F0' } },
          bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
          left: { style: 'thin', color: { rgb: 'E2E8F0' } },
          right: { style: 'thin', color: { rgb: 'E2E8F0' } }
        }
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
          return mark && mark.status === 'absent' ? 'A' : (mark?.marksObtained || '-');
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
        border: {
          top: { style: 'thin', color: { rgb: '1E40AF' } },
          bottom: { style: 'thin', color: { rgb: '1E40AF' } },
          left: { style: 'thin', color: { rgb: '1E40AF' } },
          right: { style: 'thin', color: { rgb: '1E40AF' } }
        }
      };

      const dataStyle = {
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'E2E8F0' } },
          bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
          left: { style: 'thin', color: { rgb: 'E2E8F0' } },
          right: { style: 'thin', color: { rgb: 'E2E8F0' } }
        }
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
      const response = await api.get('/class-results/export-pdf', {
        params: { classId: selectedClass, examTypes: selectedExamTypes.join(',') },
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
    <PageStack>
      <PageHeader
        title="Class Results"
        description="View complete class-wise exam results with dynamic subject columns."
      />

      <ErpSection title="Filters" icon={FileText} tone="blue">
        <div className="grid gap-4 lg:grid-cols-3">
          <FormField label="Class">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
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
          </FormField>

          {/* --- ULTIMATE BUG FIX: NATIVE INLINE SCROLLABLE MULTI-SELECT PANEL --- */}
          <FormField label="Show Results (Select Multiple)">
            {/* 
               Humne is box ko floating se hata kar static inline scroll block bana diya hai.
               Yeh direct box layout ke andar embed ho chuka hai aur matches standard height limits.
               Ab yeh na toh upar se katega aur na hi neechay se overflow hide hoga!
            */}
            <div className="w-full rounded-md border border-slate-200 bg-white p-2 h-28 overflow-y-auto space-y-1 shadow-sm custom-scrollbar">
              {EXAM_TYPES.map((type) => {
                const isChecked = selectedExamTypes.includes(type);
                return (
                  <label
                    key={type}
                    className="flex items-center space-x-3 rounded px-2 py-1 hover:bg-slate-50 cursor-pointer select-none text-sm font-normal text-slate-700 transition-colors"
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
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className={isChecked ? 'font-semibold text-blue-600' : ''}>
                      {type}
                    </span>
                  </label>
                );
              })}
            </div>
          </FormField>

          {selectedExamTypes.includes('Daily Test') && (
            <>
              <FormField label="Date Filter">
                <Select value={dateFilterType} onValueChange={setDateFilterType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="specific">Specific Date</SelectItem>
                    <SelectItem value="range">Date Range</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              {dateFilterType === 'specific' ? (
                <FormField label="Test Date">
                  <Input type="date" value={specificDate} onChange={(e) => setSpecificDate(e.target.value)} />
                </FormField>
              ) : (
                <>
                  <FormField label="From">
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                  </FormField>
                  <FormField label="To">
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                  </FormField>
                </>
              )}
            </>
          )}

          <FormField label="Sort By">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
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
          </FormField>
        </div>

        <div className="mt-4 flex gap-2">
          <Button onClick={fetchResults} disabled={!selectedClass || selectedExamTypes.length === 0 || loading}>
            {loading ? 'Loading...' : 'View Results'}
          </Button>
          {results && (
            <>
              <Button variant="outline" onClick={exportCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={exportXLSX}>
                <Download className="mr-2 h-4 w-4" />
                Export XLSX
              </Button>
              {!selectedExamTypes.includes('Daily Test') && (
                <Button variant="outline" onClick={exportPDF}>
                  <Download className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>
              )}
            </>
          )}
        </div>
      </ErpSection>

      {results && (
        <>
          <ErpSection title="Search" icon={Search} tone="blue">
            <FormField label="Search by Student Name or Roll No">
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </FormField>
          </ErpSection>

          <ErpSection title="Results" icon={FileText} tone="green">
            <div className="mb-4 rounded-lg bg-slate-50 p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-slate-700">School:</span>{' '}
                  <span className="text-slate-600">{results.schoolName}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">Class:</span>{' '}
                  <span className="text-slate-600">{formatClassName(results.className)}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">Exam Type:</span>{' '}
                  <span className="text-slate-600">{results.examType}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">Generated:</span>{' '}
                  <span className="text-slate-600">
                    {formatDisplayDate(results.generatedDate)}
                  </span>
                </div>
              </div>
            </div>

            {filteredResults.length === 0 ? (
              <div className="py-8 text-center text-slate-500">No results found</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200" style={{ minWidth: '100%' }}>
                <Table style={{ minWidth: 'max-content' }}>
                  <TableHeader>
                    {isCombinedResults ? (
                      <>
                        <TableRow>
                          <TableHead className="sticky left-0 bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '60px' }}>Total</TableHead>
                          <TableHead className="sticky left-[60px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '70px' }}>Average</TableHead>
                          <TableHead className="sticky left-[130px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '50px' }}>%</TableHead>
                          <TableHead className="sticky left-[180px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '50px' }}>Rank</TableHead>
                          <TableHead className="sticky left-[230px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '70px' }}>Roll No</TableHead>
                          <TableHead className="sticky left-[300px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '150px' }}>Student Name</TableHead>
                          {results.assessments?.map((assessment) => (
                            <TableHead 
                              key={assessment._id} 
                              colSpan={2} 
                              className={`text-center border-r ${
                                assessment.category === 'daily' 
                                  ? 'bg-blue-100 border-blue-200' 
                                  : 'bg-red-100 border-red-200'
                              }`} 
                              style={{ minWidth: '120px' }}
                            >
                              <div className={`rounded-lg px-3 py-2 text-white shadow-sm ${
                                assessment.category === 'daily' 
                                  ? 'bg-blue-600' 
                                  : 'bg-red-600'
                              }`}>
                                <div className="text-sm font-bold">{assessment.examType}</div>
                                <div className="text-xs opacity-90">{formatDisplayDateShort(assessment.date)}</div>
                                <div className="text-xs opacity-80">{assessment.subject}</div>
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableHead className="sticky left-0 bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '60px' }}>Total</TableHead>
                          <TableHead className="sticky left-[60px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '70px' }}>Average</TableHead>
                          <TableHead className="sticky left-[130px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '50px' }}>%</TableHead>
                          <TableHead className="sticky left-[180px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '50px' }}>Rank</TableHead>
                          <TableHead className="sticky left-[230px] bg-white z-10 border-r border-slate-200" style={{ minWidth: '70px' }}>Roll No</TableHead>
                          <TableHead className="sticky left-[300px] bg-white z-10 font-medium border-r border-slate-200" style={{ minWidth: '150px' }}>Student Name</TableHead>
                          {results.assessments?.map((assessment) => (
                            <React.Fragment key={`${assessment._id}-headers`}>
                              <TableHead 
                                className={`text-center border-r font-semibold ${
                                  assessment.category === 'daily' 
                                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                    : 'bg-red-50 text-red-700 border-red-200'
                                }`} 
                                style={{ minWidth: '80px' }}
                              >
                                Max Marks
                              </TableHead>
                              <TableHead 
                                className={`text-center border-r font-semibold ${
                                  assessment.category === 'daily' 
                                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                    : 'bg-red-50 text-red-700 border-red-200'
                                }`} 
                                style={{ minWidth: '80px' }}
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
                            <TableHead className="sticky left-0 bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '60px' }}>Total</TableHead>
                            <TableHead className="sticky left-[60px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '70px' }}>Average</TableHead>
                            <TableHead className="sticky left-[130px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '50px' }}>%</TableHead>
                            <TableHead className="sticky left-[180px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '50px' }}>Rank</TableHead>
                            <TableHead className="sticky left-[230px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '70px' }}>Roll No</TableHead>
                            <TableHead className="sticky left-[300px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '150px' }}>Student Name</TableHead>
                            {results.dailyTests?.map((dt, idx) => (
                              <TableHead key={`${dt._id}-info`} colSpan={2} className="text-center bg-indigo-100 border-r border-indigo-200" style={{ minWidth: '120px' }}>
                                <div className="rounded-lg bg-indigo-600 px-3 py-2 text-white shadow-sm">
                                  <div className="text-sm font-bold">Daily Test {idx + 1}</div>
                                  <div className="text-xs text-indigo-100">{formatDisplayDateShort(dt.testDate)}</div>
                                  <div className="text-xs text-indigo-200">{dt.subject}</div>
                                </div>
                              </TableHead>
                            ))}
                          </TableRow>
                        )}
                        <TableRow>
                          {selectedExamTypes.includes('Daily Test') ? (
                            <>
                              <TableHead className="sticky left-0 bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '60px' }}>Total</TableHead>
                              <TableHead className="sticky left-[60px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '70px' }}>Average</TableHead>
                              <TableHead className="sticky left-[130px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '50px' }}>%</TableHead>
                              <TableHead className="sticky left-[180px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '50px' }}>Rank</TableHead>
                              <TableHead className="sticky left-[230px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '70px' }}>Roll No</TableHead>
                              <TableHead className="sticky left-[300px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '150px' }}>Student Name</TableHead>
                              {results.dailyTests?.map((dt) => (
                                <React.Fragment key={`${dt._id}-subheaders`}>
                                  <TableHead className="text-center bg-indigo-50 border-r border-indigo-200 font-semibold text-indigo-700" style={{ minWidth: '80px' }}>Max Marks</TableHead>
                                  <TableHead className="text-center bg-indigo-50 border-r border-indigo-200 font-semibold text-indigo-700" style={{ minWidth: '80px' }}>Marks Obtained</TableHead>
                                </React.Fragment>
                              ))}
                            </>
                          ) : (
                            <>
                              <TableHead>Rank</TableHead>
                              <TableHead>Roll No</TableHead>
                              <TableHead>Student Name</TableHead>
                              {results.subjects.map((subject) => (
                                <TableHead key={subject}>{subject}</TableHead>
                              ))}
                              <TableHead>Total</TableHead>
                              <TableHead>Average</TableHead>
                              <TableHead>Percentage</TableHead>
                            </>
                          )}
                        </TableRow>
                      </>
                    )}
                  </TableHeader>
                  <TableBody>
                    {filteredResults.map((student, index) => (
                      <TableRow key={student.studentId} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-slate-100 transition-colors`}>
                        {isCombinedResults ? (
                          <>
                            <TableCell className="sticky left-0 bg-blue-50 z-10 font-bold text-blue-700 border-r border-slate-200" style={{ minWidth: '60px' }}>{student.totalObtained}</TableCell>
                            <TableCell className="sticky left-[60px] bg-blue-50 z-10 font-semibold text-blue-600 border-r border-slate-200" style={{ minWidth: '70px' }}>{student.average}</TableCell>
                            <TableCell className="sticky left-[130px] bg-blue-50 z-10 font-semibold text-blue-600 border-r border-slate-200" style={{ minWidth: '50px' }}>{student.percentage}%</TableCell>
                            <TableCell className="sticky left-[180px] bg-blue-50 z-10 font-bold text-blue-700 border-r border-slate-200" style={{ minWidth: '50px' }}>{student.rank}</TableCell>
                            <TableCell className="sticky left-[230px] bg-white z-10 border-r border-slate-200" style={{ minWidth: '70px' }}>{student.rollNo}</TableCell>
                            <TableCell className="sticky left-[300px] bg-white z-10 font-medium border-r border-slate-200" style={{ minWidth: '150px' }}>{student.name}</TableCell>
                            {results.assessments?.map((assessment) => {
                              const key = `${assessment.examType}_${assessment._id}`;
                              const mark = student.assessments?.[key];
                              return (
                                <React.Fragment key={`${assessment._id}-student-marks`}>
                                  <TableCell 
                                    className={`text-center border-r ${
                                      assessment.category === 'daily' 
                                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                        : 'bg-red-50 text-red-700 border-red-200'
                                    }`} 
                                    style={{ minWidth: '80px' }}
                                  >
                                    {assessment.maxMarks}
                                  </TableCell>
                                  <TableCell 
                                    className={`text-center border-r font-semibold ${
                                      assessment.category === 'daily' 
                                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                        : 'bg-red-50 text-red-700 border-red-200'
                                    }`} 
                                    style={{ minWidth: '80px' }}
                                  >
                                    {mark && mark.status === 'absent' ? <AbsentBadge /> : (mark?.marksObtained || '-')}
                                  </TableCell>
                                </React.Fragment>
                              );
                            })}
                          </>
                        ) : (
                          <>
                            {selectedExamTypes.includes('Daily Test') ? (
                              <>
                                <TableCell className="sticky left-0 bg-blue-50 z-10 font-bold text-blue-700 border-r border-slate-200" style={{ minWidth: '60px' }}>{student.totalObtained}</TableCell>
                                <TableCell className="sticky left-[60px] bg-blue-50 z-10 font-semibold text-blue-600 border-r border-slate-200" style={{ minWidth: '70px' }}>{student.average}</TableCell>
                                <TableCell className="sticky left-[130px] bg-blue-50 z-10 font-semibold text-blue-600 border-r border-slate-200" style={{ minWidth: '50px' }}>{student.percentage}%</TableCell>
                                <TableCell className="sticky left-[180px] bg-blue-50 z-10 font-bold text-blue-700 border-r border-slate-200" style={{ minWidth: '50px' }}>{student.rank}</TableCell>
                                <TableCell className="sticky left-[230px] bg-white z-10 border-r border-slate-200" style={{ minWidth: '70px' }}>{student.rollNo}</TableCell>
                                <TableCell className="sticky left-[300px] bg-white z-10 font-medium border-r border-slate-200" style={{ minWidth: '150px' }}>{student.name}</TableCell>
                                {results.dailyTests?.map((dt) => {
                                  const mark = student.dailyTests[dt._id];
                                  return (
                                    <React.Fragment key={`${dt._id}-student-dt`}>
                                      <TableCell className="text-center border-r border-slate-200 text-slate-600" style={{ minWidth: '80px' }}>{dt.maxMarks}</TableCell>
                                      <TableCell className="text-center border-r border-slate-200 font-semibold text-indigo-700" style={{ minWidth: '80px' }}>{mark && mark.status === 'absent' ? <AbsentBadge /> : (mark ? mark.marksObtained : '')}</TableCell>
                                    </React.Fragment>
                                  );
                                })}
                              </>
                            ) : (
                              <>
                                <TableCell className="font-medium">{student.rank}</TableCell>
                                <TableCell>{student.rollNo}</TableCell>
                                <TableCell className="font-medium">{student.name}</TableCell>
                                {results.subjects.map((subject) => (
                                  <TableCell key={subject}>
                                    {student.subjects[subject]?.marksObtained || '-'}
                                  </TableCell>
                                ))}
                                <TableCell className="font-medium">{student.totalObtained}</TableCell>
                                <TableCell>{student.average}</TableCell>
                                <TableCell>{student.percentage}%</TableCell>
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
          </ErpSection>
        </>
      )}
    </PageStack>
  );
}