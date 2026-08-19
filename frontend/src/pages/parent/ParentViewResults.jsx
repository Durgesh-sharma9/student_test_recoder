import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { User, Trophy, TrendingUp, BookOpen, Search, Filter, Download, ChevronDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '@/lib/api';
import { formatDisplayDate } from '@/lib/dateFormatter';
import { PageHeader, ErpSection } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DatePicker from '@/components/ui/DatePicker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const getExamTypeColor = (examType) => {
  if (examType === 'Daily Test') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (examType.startsWith('PA')) return 'bg-red-100 text-red-700 border-red-200';
  if (examType.startsWith('FA')) return 'bg-orange-100 text-orange-700 border-orange-200';
  if (examType === 'Half Yearly') return 'bg-purple-100 text-purple-700 border-purple-200';
  if (examType === 'Final') return 'bg-green-100 text-green-700 border-green-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

export default function ParentViewResults() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [student, setStudent] = useState(null);
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterMode, setFilterMode] = useState('range');
  const [specificDate, setSpecificDate] = useState('');

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      loadStudentResults(selectedStudentId);
    }
  }, [selectedStudentId]);

  const loadStudents = async () => {
    try {
      const res = await api.get('/parents/students');
      setStudents(res.data.students || []);
      if (res.data.students && res.data.students.length > 0) {
        setSelectedStudentId(res.data.students[0]._id);
      }
    } catch (err) {
      console.error('Failed to load students:', err);
      toast.error(err.response?.data?.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const loadStudentResults = async (studentId) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      
      if (filterMode === 'specific' && specificDate) {
        params.append('dateFrom', specificDate);
        params.append('dateTo', specificDate);
      } else if (filterMode === 'range') {
        if (dateFrom) params.append('dateFrom', dateFrom);
        if (dateTo) params.append('dateTo', dateTo);
      }
      
      const res = await api.get(`/parents/students/${studentId}/results-history?${params}`);
      setStudent(res.data.student || null);
      setResults(Array.isArray(res.data.results) ? res.data.results : []);
      setSummary(res.data.summary || null);
      setTotalStudents(res.data.totalStudents || 0);
    } catch (err) {
      console.error('Failed to load results:', err);
      setError(err.response?.data?.message || 'Failed to load results');
      toast.error(err.response?.data?.message || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    if (selectedStudentId) {
      loadStudentResults(selectedStudentId);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setSpecificDate('');
    if (selectedStudentId) {
      loadStudentResults(selectedStudentId);
    }
  };

  const formatDateSafe = (date) => {
    try {
      if (!date) return 'N/A';
      const d = new Date(date);
      if (isNaN(d.getTime())) return 'N/A';
      return formatDisplayDate(date);
    } catch {
      return 'N/A';
    }
  };

  const formatPercentageSafe = (percentage) => {
    try {
      if (percentage === null || percentage === undefined) return 'N/A';
      return percentage.toFixed(1) + '%';
    } catch {
      return 'N/A';
    }
  };

  const calculateSubjectPerformance = (recentResults) => {
    if (!recentResults || recentResults.length === 0) return [];

    const subjectMap = {};
    recentResults.forEach(result => {
      if (!subjectMap[result.subject]) {
        subjectMap[result.subject] = {
          subject: result.subject,
          totalPercentage: 0,
          count: 0,
          results: []
        };
      }
      subjectMap[result.subject].totalPercentage += result.percentage || 0;
      subjectMap[result.subject].count += 1;
      subjectMap[result.subject].results.push(result);
    });

    return Object.values(subjectMap).map(s => ({
      subject: s.subject,
      averagePercentage: s.count > 0 ? (s.totalPercentage / s.count).toFixed(1) : 0,
      count: s.count
    })).sort((a, b) => b.averagePercentage - a.averagePercentage);
  };

  const getWeakSubjects = (subjectPerformance) => {
    return subjectPerformance.filter(s => parseFloat(s.averagePercentage) < 50);
  };

  const getBestSubject = (subjectPerformance) => {
    if (subjectPerformance.length === 0) return null;
    return subjectPerformance[0];
  };

  const generatePDF = () => {
    if (!student || !results || results.length === 0) {
      toast.error('No data available to generate report card');
      return;
    }

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFillColor(99, 102, 241);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('Report Card', pageWidth / 2, 20, { align: 'center' });
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Academic Performance Report', pageWidth / 2, 30, { align: 'center' });

      // Student Information
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Student Information', 14, 55);
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const studentInfo = [
        ['Name:', student.name],
        ['Class:', `${student.className} ${student.section ? `(${student.section})` : ''}`],
        ['Roll No:', student.rollNo],
        ['Total Tests:', summary?.totalTests || results.length],
        ['Average Percentage:', formatPercentageSafe(summary?.averagePercentage)],
        ['Current Rank:', summary?.currentRank ? `${summary.currentRank} out of ${totalStudents || results.length}` : 'N/A'],
        ['Best Score:', formatPercentageSafe(summary?.bestScore)],
      ];

      autoTable(doc, {
        startY: 60,
        head: [],
        body: studentInfo,
        theme: 'plain',
        styles: {
          fontSize: 10,
          cellPadding: 3,
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 50 },
          1: { cellWidth: 'auto' },
        },
      });

      // Results Table
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Results History', 14, doc.lastAutoTable.finalY + 15);

      const tableData = results.map((result) => [
        formatDateSafe(result.date),
        result.examType || 'N/A',
        result.subject || 'N/A',
        result.status === 'absent' ? 'Absent' : (result.marksObtained ?? 'N/A'),
        result.maxMarks ?? 'N/A',
        formatPercentageSafe(result.percentage),
        result.rank ? `${result.rank} out of ${totalStudents || results.length}` : 'N/A',
      ]);

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Date', 'Exam Type', 'Subject', 'Marks Obtained', 'Max Marks', 'Percentage', 'Rank']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [99, 102, 241],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
        },
        styles: {
          fontSize: 9,
          cellPadding: 4,
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
      });

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Generated on ${new Date().toLocaleDateString()} - Page ${i} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Save PDF
      const fileName = `${student.name.replace(/\s+/g, '_')}_Report_Card_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      toast.success('Report card downloaded successfully');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate report card');
    }
  };

  const subjectPerformance = calculateSubjectPerformance(results);
  const weakSubjects = getWeakSubjects(subjectPerformance);
  const bestSubject = getBestSubject(subjectPerformance);
  const trendData = results.slice(0, 10).reverse().map(r => ({
    date: formatDateSafe(r.date),
    percentage: r.percentage || 0
  }));

  const filteredResults = results.filter(result => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      (result.subject && result.subject.toLowerCase().includes(searchLower)) ||
      (result.examType && result.examType.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="space-y-3 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <PageHeader
          title="View Results"
          description="View detailed performance reports and results history"
        />
        
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {students.length > 1 && (
            <div className="flex items-center gap-1.5 bg-white border border-slate-200/90 px-2.5 py-1 rounded-xl shadow-xs">
              <User className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger className="h-6 text-xs font-bold border-none shadow-none focus:ring-0 focus:outline-hidden bg-transparent p-0 gap-1 min-w-[120px] sm:min-w-[140px]">
                  <SelectValue placeholder="Select Child" />
                </SelectTrigger>
                <SelectContent align="end">
                  {students.map((s) => (
                    <SelectItem key={s._id} value={s._id} className="text-xs font-bold">
                      {s.name} ({s.className} {s.section ? `-${s.section}` : ''})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {results && results.length > 0 && (
            <Button
              onClick={generatePDF}
              className="h-8.5 px-3 text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Report Card</span>
            </Button>
          )}
        </div>
      </div>

      {loading && !student ? (
        <div className="p-8 text-center text-slate-500 text-xs sm:text-sm">Loading...</div>
      ) : student ? (
        <>
          {/* Combined Student Performance Overview */}
          <ErpSection title="Student Performance Overview" icon={User} tone="blue">
            <div className="p-2.5 sm:p-4">
              <div className="flex items-center gap-2.5 sm:gap-4 mb-2.5 sm:mb-3">
                <div className="h-9 w-9 sm:h-12 sm:w-12 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs sm:text-base font-bold shadow-sm">
                  {student.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm sm:text-lg font-bold text-slate-900 leading-tight truncate">{student.name}</h2>
                  <p className="text-[11px] sm:text-xs text-slate-500 leading-tight mt-0.5">
                    Class {student.className} {student.section ? `(${student.section})` : ''} • Roll No: <span className="font-bold text-slate-800">{student.rollNo}</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-1.5 sm:gap-2.5">
                <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 p-2 sm:p-3 border border-blue-200/80">
                  <div className="text-[10px] sm:text-xs font-semibold text-blue-700 mb-0.5 truncate">Overall %</div>
                  <div className="text-sm sm:text-lg font-extrabold text-blue-900">{formatPercentageSafe(summary?.averagePercentage)}</div>
                </div>

                <div className="rounded-xl bg-gradient-to-br from-purple-50 to-fuchsia-50 p-2 sm:p-3 border border-purple-200/80">
                  <div className="text-[10px] sm:text-xs font-semibold text-purple-700 mb-0.5 truncate">Rank</div>
                  <div className="text-sm sm:text-lg font-extrabold text-purple-900">#{summary?.currentRank || '-'}</div>
                  <div className="text-[9px] sm:text-[10px] text-purple-600 font-medium">Out of {totalStudents || results.length}</div>
                </div>

                <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 p-2 sm:p-3 border border-emerald-200/80">
                  <div className="text-[10px] sm:text-xs font-semibold text-emerald-700 mb-0.5 truncate">Total Tests</div>
                  <div className="text-sm sm:text-lg font-extrabold text-emerald-900">{summary?.totalTests || results.length}</div>
                </div>

                <div className="rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 p-2 sm:p-3 border border-teal-200/80">
                  <div className="text-[10px] sm:text-xs font-semibold text-teal-700 mb-0.5 truncate">Best Subject</div>
                  <div className="text-xs sm:text-base font-bold text-teal-900 truncate" title={bestSubject?.subject || 'N/A'}>
                    {bestSubject?.subject || 'N/A'}
                  </div>
                </div>

                <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 p-2 sm:p-3 border border-amber-200/80 col-span-2 sm:col-span-1">
                  <div className="text-[10px] sm:text-xs font-semibold text-amber-700 mb-0.5 truncate">Weak Subject</div>
                  <div className="text-xs sm:text-base font-bold text-amber-900 truncate" title={weakSubjects.length > 0 ? weakSubjects[0].subject : 'None'}>
                    {weakSubjects.length > 0 ? weakSubjects[0].subject : 'None'}
                  </div>
                </div>
              </div>
            </div>
          </ErpSection>

          {/* SECTION 3: Results History */}
          <ErpSection title="Results History" icon={BookOpen} tone="blue">
            <div className="p-3.5 sm:p-6 space-y-4">
              {/* Filters */}
              <div className="flex flex-col md:flex-row flex-wrap items-start md:items-end gap-3 p-3.5 sm:p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="range"
                      name="filterMode"
                      value="range"
                      checked={filterMode === 'range'}
                      onChange={(e) => setFilterMode(e.target.value)}
                      className="h-4 w-4 text-indigo-600"
                    />
                    <label htmlFor="range" className="text-xs sm:text-sm font-medium text-slate-700">Date Range</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="specific"
                      name="filterMode"
                      value="specific"
                      checked={filterMode === 'specific'}
                      onChange={(e) => setFilterMode(e.target.value)}
                      className="h-4 w-4 text-indigo-600"
                    />
                    <label htmlFor="specific" className="text-xs sm:text-sm font-medium text-slate-700">Specific Date</label>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-end gap-3 w-full md:w-auto">
                  {filterMode === 'range' ? (
                    <>
                      <div className="w-full sm:w-auto">
                        <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">From</label>
                        <DatePicker
                          value={dateFrom}
                          onChange={setDateFrom}
                          className="w-full md:w-40"
                        />
                      </div>
                      <div className="w-full sm:w-auto">
                        <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">To</label>
                        <DatePicker
                          value={dateTo}
                          onChange={setDateTo}
                          className="w-full md:w-40"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="w-full sm:w-auto">
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Date</label>
                      <DatePicker
                        value={specificDate}
                        onChange={setSpecificDate}
                        className="w-full md:w-40"
                      />
                    </div>
                  )}
                  
                  <div className="flex gap-2 w-full sm:w-auto mt-1 sm:mt-0">
                    <Button onClick={applyFilters} size="sm" className="flex-1 sm:flex-none">Apply</Button>
                    <Button variant="outline" onClick={clearFilters} size="sm" className="flex-1 sm:flex-none">Clear</Button>
                  </div>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by subject or exam type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 text-sm"
                />
              </div>

              {/* Results Table */}
              {error ? (
                <div className="p-8 text-center text-red-500">{error}</div>
              ) : filteredResults.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No results found. Try adjusting your filters.</div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[550px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">Date</th>
                        <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">Exam Type</th>
                        <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">Subject</th>
                        <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">Marks</th>
                        <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">Max</th>
                        <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">%</th>
                        <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">Rank</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredResults.map((result, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{formatDateSafe(result.date)}</td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getExamTypeColor(result.examType)}`}>
                              {result.examType || 'N/A'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">{result.subject || 'N/A'}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{result.status === 'absent' ? 'Absent' : (result.marksObtained ?? 'N/A')}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{result.maxMarks ?? 'N/A'}</td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <span className={`font-semibold ${
                              result.percentage >= 75 ? 'text-green-600' :
                              result.percentage >= 50 ? 'text-orange-600' :
                              'text-red-600'
                            }`}>
                              {formatPercentageSafe(result.percentage)}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{result.rank ? `${result.rank} out of ${totalStudents || results.length}` : 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </ErpSection>

          {/* SECTION 4: Performance Trend Graph */}
          {trendData.length > 0 && (
            <ErpSection title="Performance Trend" icon={TrendingUp} tone="purple">
              <div className="p-4 md:p-6">
                <div className="text-xs text-slate-400 mb-2 md:hidden italic">Swipe horizontally to view full chart</div>
                <div className="w-full overflow-x-auto pb-2">
                  {/* Graph gets a min-width on mobile to prevent overlapping dates */}
                  <div className="min-w-[500px] md:min-w-0 w-full h-[250px] md:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12, fill: '#64748b' }}
                          axisLine={false}
                          tickLine={false}
                          tickMargin={10}
                        />
                        <YAxis 
                          tick={{ fontSize: 12, fill: '#64748b' }}
                          axisLine={false}
                          tickLine={false}
                          domain={[0, 100]}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                          formatter={(value) => [`${value.toFixed(1)}%`, 'Score']}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="percentage" 
                          stroke="#6366f1" 
                          strokeWidth={2}
                          dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </ErpSection>
          )}

          {/* SECTION 5: Subject-wise Performance */}
          {subjectPerformance.length > 0 && (
            <ErpSection title="Subject-wise Performance" icon={BookOpen} tone="blue">
              <div className="p-2.5 sm:p-4">
                <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {subjectPerformance.map((sp, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-2.5 sm:p-3 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1 pr-2">
                          <span className="text-xs sm:text-sm font-bold text-slate-800 truncate block">{sp.subject}</span>
                          <span className="text-[10px] sm:text-xs font-medium text-slate-400">{sp.count} tests</span>
                        </div>
                        <span className={`text-xs sm:text-sm font-extrabold shrink-0 ${
                          parseFloat(sp.averagePercentage) >= 75 ? 'text-green-600' :
                          parseFloat(sp.averagePercentage) >= 50 ? 'text-orange-600' :
                          'text-red-600'
                        }`}>
                          {sp.averagePercentage}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            parseFloat(sp.averagePercentage) >= 75 ? 'bg-green-500' :
                            parseFloat(sp.averagePercentage) >= 50 ? 'bg-orange-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(parseFloat(sp.averagePercentage), 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ErpSection>
          )}
        </>
      ) : (
        <ErpSection title="No Student Selected" icon={User} tone="blue">
          <div className="p-8 text-center text-slate-500">
            No children linked to your account yet.
          </div>
        </ErpSection>
      )}
    </div>
  );
}