import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { FileText, Search, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '@/lib/api';
import { PageHeader, ErpSection, FormField, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const EXAM_TYPES = ['Daily Test', 'PA1', 'PA2', 'PA3', 'PA4', 'FA1', 'FA2', 'Half Yearly', 'Final'];

export default function ClassResults() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('rollNo_asc');
  const [dateFilterType, setDateFilterType] = useState('specific'); // 'specific' or 'range'
  const [specificDate, setSpecificDate] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    api.get('/classes').then((r) => {
      setClasses(r.data.classes || []);
    });
  }, []);

  const fetchResults = async () => {
    if (!selectedClass || !selectedExamType) return;

    // For Daily Test, require date filter
    if (selectedExamType === 'Daily Test') {
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
      let params = { classId: selectedClass, examType: selectedExamType };
      
      if (selectedExamType === 'Daily Test') {
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

    // Apply sorting
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

  const exportCSV = () => {
    if (!results) return;

    const isDailyTest = selectedExamType === 'Daily Test';
    let csvContent;

    if (isDailyTest) {
      // Daily Test format with multi-row headers
      // Row 1: Test info headers
      const headerRow1 = ['Total', 'Average', 'Percentage', 'Rank', 'Roll No', 'Student Name'];
      const headerRow2 = ['', '', '', '', '', ''];
      
      results.dailyTests.forEach((dt, idx) => {
        const testName = `Daily Test ${idx + 1}`;
        const dateStr = new Date(dt.testDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        headerRow1.push(testName, '');
        headerRow2.push(`Date: ${dateStr}`, `Subject: ${dt.subject}`);
      });

      // Row 3: Column headers
      const headerRow3 = ['Total', 'Average', 'Percentage', 'Rank', 'Roll No', 'Student Name'];
      results.dailyTests.forEach((dt) => {
        headerRow3.push('Max Marks', 'Marks Obtained');
      });

      // Data rows
      const dataRows = filteredResults.map((r) => {
        const row = [r.totalObtained, r.average, r.percentage, r.rank, r.rollNo, r.name];
        results.dailyTests.forEach((dt) => {
          const mark = r.dailyTests[dt._id];
          row.push(dt.maxMarks, mark ? mark.marksObtained : '');
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
      // Main Exam format
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
    link.download = `class-results-${selectedExamType}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success('CSV exported successfully');
  };

  const exportXLSX = () => {
    if (!results) return;

    const isDailyTest = selectedExamType === 'Daily Test';
    let workbook, worksheet;

    if (isDailyTest) {
      // Daily Test format with proper Excel formatting
      const data = [];
      
      // Row 1: Test info headers
      const headerRow1 = ['Total', 'Average', 'Percentage', 'Rank', 'Roll No', 'Student Name'];
      const headerRow2 = ['', '', '', '', '', ''];
      
      results.dailyTests.forEach((dt, idx) => {
        const testName = `Daily Test ${idx + 1}`;
        const dateStr = new Date(dt.testDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        headerRow1.push(testName, '');
        headerRow2.push(`Date: ${dateStr}`, `Subject: ${dt.subject}`);
      });

      // Row 3: Column headers
      const headerRow3 = ['Total', 'Average', 'Percentage', 'Rank', 'Roll No', 'Student Name'];
      results.dailyTests.forEach((dt) => {
        headerRow3.push('Max Marks', 'Marks Obtained');
      });

      data.push(headerRow1, headerRow2, headerRow3);

      // Data rows
      filteredResults.forEach((r) => {
        const row = [r.totalObtained, r.average, r.percentage, r.rank, r.rollNo, r.name];
        results.dailyTests.forEach((dt) => {
          const mark = r.dailyTests[dt._id];
          row.push(dt.maxMarks, mark ? mark.marksObtained : '');
        });
        data.push(row);
      });

      // Create worksheet
      worksheet = XLSX.utils.aoa_to_sheet(data);

      // Merge cells for Daily Test headers
      let colIndex = 6; // Start after Student Name
      results.dailyTests.forEach((dt) => {
        // Merge Daily Test name cell (spans 2 columns)
        worksheet['!merges'] = worksheet['!merges'] || [];
        worksheet['!merges'].push({ s: { r: 0, c: colIndex }, e: { r: 0, c: colIndex + 1 } });
        colIndex += 2;
      });

      // Apply styling to headers
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      for (let R = 0; R <= 2; R++) {
        for (let C = 0; C <= range.e.c; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!worksheet[cellAddress]) continue;
          worksheet[cellAddress].s = {
            font: { bold: true },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
              top: { style: 'thin' },
              bottom: { style: 'thin' },
              left: { style: 'thin' },
              right: { style: 'thin' }
            }
          };
        }
      }

      // Apply borders to data cells
      for (let R = 3; R <= range.e.r; R++) {
        for (let C = 0; C <= range.e.c; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!worksheet[cellAddress]) continue;
          worksheet[cellAddress].s = {
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
              top: { style: 'thin' },
              bottom: { style: 'thin' },
              left: { style: 'thin' },
              right: { style: 'thin' }
            }
          };
        }
      }

      // Auto-size columns
      const colWidths = [];
      for (let C = 0; C <= range.e.c; C++) {
        let maxWidth = 10;
        for (let R = 0; R <= range.e.r; R++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = worksheet[cellAddress];
          if (cell && cell.v) {
            const cellValue = String(cell.v);
            maxWidth = Math.max(maxWidth, cellValue.length + 2);
          }
        }
        colWidths.push({ wch: maxWidth });
      }
      worksheet['!cols'] = colWidths;

    } else {
      // Main Exam format
      const headers = ['Rank', 'Roll No', 'Student Name', ...results.subjects, 'Total', 'Average', 'Percentage'];
      const data = [headers];

      filteredResults.forEach((r) => {
        const subjectMarks = results.subjects.map((s) => r.subjects[s]?.marksObtained || '-');
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

      // Apply styling to headers
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      for (let C = 0; C <= range.e.c; C++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!worksheet[cellAddress]) continue;
        worksheet[cellAddress].s = {
          font: { bold: true },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          }
        };
      }

      // Apply borders to data cells
      for (let R = 1; R <= range.e.r; R++) {
        for (let C = 0; C <= range.e.c; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!worksheet[cellAddress]) continue;
          worksheet[cellAddress].s = {
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
              top: { style: 'thin' },
              bottom: { style: 'thin' },
              left: { style: 'thin' },
              right: { style: 'thin' }
            }
          };
        }
      }

      // Auto-size columns
      const colWidths = [];
      for (let C = 0; C <= range.e.c; C++) {
        let maxWidth = 10;
        for (let R = 0; R <= range.e.r; R++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = worksheet[cellAddress];
          if (cell && cell.v) {
            const cellValue = String(cell.v);
            maxWidth = Math.max(maxWidth, cellValue.length + 2);
          }
        }
        colWidths.push({ wch: maxWidth });
      }
      worksheet['!cols'] = colWidths;
    }

    workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');

    // Generate and download
    XLSX.writeFile(workbook, `class-results-${selectedExamType}-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('XLSX exported successfully');
  };

  const exportPDF = async () => {
    if (!results) return;

    try {
      const response = await api.get('/class-results/export-pdf', {
        params: { classId: selectedClass, examType: selectedExamType },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `class-results-${results.examType}-${new Date().toISOString().split('T')[0]}.pdf`;
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
                    {c.className}-{c.section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Exam Type">
            <Select value={selectedExamType} onValueChange={setSelectedExamType}>
              <SelectTrigger>
                <SelectValue placeholder="Select exam type" />
              </SelectTrigger>
              <SelectContent>
                {EXAM_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          {selectedExamType === 'Daily Test' && (
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
          <Button onClick={fetchResults} disabled={!selectedClass || !selectedExamType || loading}>
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
              {selectedExamType !== 'Daily Test' && (
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
                  <span className="text-slate-600">{results.className}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">Exam Type:</span>{' '}
                  <span className="text-slate-600">{results.examType}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">Generated:</span>{' '}
                  <span className="text-slate-600">
                    {new Date(results.generatedDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {filteredResults.length === 0 ? (
              <div className="py-8 text-center text-slate-500">No results found</div>
            ) : (
              <div className="overflow-x-auto" style={{ minWidth: '100%' }}>
                <Table style={{ minWidth: 'max-content' }}>
                  <TableHeader>
                    {selectedExamType === 'Daily Test' && (
                      <TableRow>
                        <TableHead className="sticky left-0 bg-slate-50 z-10" style={{ minWidth: '60px' }}>Total</TableHead>
                        <TableHead className="sticky left-[60px] bg-slate-50 z-10" style={{ minWidth: '70px' }}>Average</TableHead>
                        <TableHead className="sticky left-[130px] bg-slate-50 z-10" style={{ minWidth: '50px' }}>%</TableHead>
                        <TableHead className="sticky left-[180px] bg-slate-50 z-10" style={{ minWidth: '50px' }}>Rank</TableHead>
                        <TableHead className="sticky left-[230px] bg-slate-50 z-10" style={{ minWidth: '70px' }}>Roll No</TableHead>
                        <TableHead className="sticky left-[300px] bg-slate-50 z-10" style={{ minWidth: '150px' }}>Student Name</TableHead>
                        {results.dailyTests?.map((dt, idx) => (
                          <TableHead key={`${dt._id}-info`} colSpan={2} className="text-center" style={{ minWidth: '120px' }}>
                            <div className="text-xs font-medium">Daily Test {idx + 1}</div>
                            <div className="text-xs text-slate-500">{new Date(dt.testDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                            <div className="text-xs text-slate-500">{dt.subject}</div>
                          </TableHead>
                        ))}
                      </TableRow>
                    )}
                    <TableRow>
                      {selectedExamType === 'Daily Test' ? (
                        <>
                          <TableHead className="sticky left-0 bg-slate-50 z-10" style={{ minWidth: '60px' }}>Total</TableHead>
                          <TableHead className="sticky left-[60px] bg-slate-50 z-10" style={{ minWidth: '70px' }}>Average</TableHead>
                          <TableHead className="sticky left-[130px] bg-slate-50 z-10" style={{ minWidth: '50px' }}>%</TableHead>
                          <TableHead className="sticky left-[180px] bg-slate-50 z-10" style={{ minWidth: '50px' }}>Rank</TableHead>
                          <TableHead className="sticky left-[230px] bg-slate-50 z-10" style={{ minWidth: '70px' }}>Roll No</TableHead>
                          <TableHead className="sticky left-[300px] bg-slate-50 z-10" style={{ minWidth: '150px' }}>Student Name</TableHead>
                          {results.dailyTests?.map((dt) => (
                            <>
                              <TableHead key={`${dt._id}-max`} className="text-center" style={{ minWidth: '80px' }}>Max Marks</TableHead>
                              <TableHead key={`${dt._id}-obt`} className="text-center" style={{ minWidth: '80px' }}>Marks Obtained</TableHead>
                            </>
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
                  </TableHeader>
                  <TableBody>
                    {filteredResults.map((student) => (
                      <TableRow key={student.studentId}>
                        {selectedExamType === 'Daily Test' ? (
                          <>
                            <TableCell className="sticky left-0 bg-white z-10 font-medium" style={{ minWidth: '60px' }}>{student.totalObtained}</TableCell>
                            <TableCell className="sticky left-[60px] bg-white z-10" style={{ minWidth: '70px' }}>{student.average}</TableCell>
                            <TableCell className="sticky left-[130px] bg-white z-10" style={{ minWidth: '50px' }}>{student.percentage}%</TableCell>
                            <TableCell className="sticky left-[180px] bg-white z-10 font-medium" style={{ minWidth: '50px' }}>{student.rank}</TableCell>
                            <TableCell className="sticky left-[230px] bg-white z-10" style={{ minWidth: '70px' }}>{student.rollNo}</TableCell>
                            <TableCell className="sticky left-[300px] bg-white z-10 font-medium" style={{ minWidth: '150px' }}>{student.name}</TableCell>
                            {results.dailyTests?.map((dt) => {
                              const mark = student.dailyTests[dt._id];
                              return (
                                <>
                                  <TableCell key={`${dt._id}-max`} className="text-center" style={{ minWidth: '80px' }}>{dt.maxMarks}</TableCell>
                                  <TableCell key={`${dt._id}-obt`} className="text-center" style={{ minWidth: '80px' }}>{mark ? mark.marksObtained : ''}</TableCell>
                                </>
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
