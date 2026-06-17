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
        ['Current Rank:', summary?.currentRank ? `#${summary.currentRank}` : 'N/A'],
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
        result.rank ? `#${result.rank}` : 'N/A',
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="View Results"
          description="View detailed performance reports and results history"
        />
        {results && results.length > 0 && (
          <Button onClick={generatePDF} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Download Report Card
          </Button>
        )}
      </div>

      {/* Child Selector */}
      {students.length > 1 && (
        <ErpSection title="Select Child" icon={User} tone="blue">
          <div className="p-4">
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger className="w-full md:w-96">
                <SelectValue placeholder="Select a child" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    {s.name} - {s.className} {s.section ? `(${s.section})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </ErpSection>
      )}

      {loading && !student ? (
        <div className="p-8 text-center text-slate-500">Loading...</div>
      ) : student ? (
        <>
          {/* SECTION 1: Student Information */}
          <ErpSection title="Student Information" icon={User} tone="blue">
            <div className="p-6">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="h-24 w-24 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                  {student.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-slate-900 mb-2">{student.name}</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <div className="text-sm text-slate-500">Class</div>
                      <div className="text-lg font-semibold text-slate-900">{student.className} {student.section ? `(${student.section})` : ''}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Roll No</div>
                      <div className="text-lg font-semibold text-slate-900">{student.rollNo}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Rank</div>
                      <div className="text-lg font-semibold text-slate-900">{summary?.currentRank ? `#${summary.currentRank}` : 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Overall %</div>
                      <div className="text-lg font-semibold text-slate-900">{formatPercentageSafe(summary?.averagePercentage)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ErpSection>

          {/* SECTION 2: Performance Summary */}
          {summary && (
            <ErpSection title="Performance Summary" icon={Trophy} tone="green">
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-4 border border-blue-200">
                    <div className="text-sm font-medium text-blue-700 mb-1">Overall %</div>
                    <div className="text-2xl font-bold text-blue-900">{formatPercentageSafe(summary.averagePercentage)}</div>
                  </div>
                  <div className="rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 p-4 border border-purple-200">
                    <div className="text-sm font-medium text-purple-700 mb-1">Rank</div>
                    <div className="text-2xl font-bold text-purple-900">{summary.currentRank ? `#${summary.currentRank}` : 'N/A'}</div>
                  </div>
                  <div className="rounded-xl bg-gradient-to-br from-green-50 to-green-100 p-4 border border-green-200">
                    <div className="text-sm font-medium text-green-700 mb-1">Total Tests</div>
                    <div className="text-2xl font-bold text-green-900">{summary.totalTests}</div>
                  </div>
                  <div className="rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 p-4 border border-orange-200">
                    <div className="text-sm font-medium text-orange-700 mb-1">Avg Marks</div>
                    <div className="text-2xl font-bold text-orange-900">{summary.averageMarks?.toFixed(1) || 'N/A'}</div>
                  </div>
                  <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 border border-emerald-200">
                    <div className="text-sm font-medium text-emerald-700 mb-1">Best Subject</div>
                    <div className="text-2xl font-bold text-emerald-900">{bestSubject?.subject || 'N/A'}</div>
                  </div>
                  <div className="rounded-xl bg-gradient-to-br from-red-50 to-red-100 p-4 border border-red-200">
                    <div className="text-sm font-medium text-red-700 mb-1">Weak Subject</div>
                    <div className="text-2xl font-bold text-red-900">{weakSubjects.length > 0 ? weakSubjects[0].subject : 'N/A'}</div>
                  </div>
                </div>
              </div>
            </ErpSection>
          )}

          {/* SECTION 3: Results History */}
          <ErpSection title="Results History" icon={BookOpen} tone="blue">
            <div className="p-6 space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap items-end gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="range"
                    name="filterMode"
                    value="range"
                    checked={filterMode === 'range'}
                    onChange={(e) => setFilterMode(e.target.value)}
                    className="h-4 w-4"
                  />
                  <label htmlFor="range" className="text-sm font-medium text-slate-700">Date Range</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="specific"
                    name="filterMode"
                    value="specific"
                    checked={filterMode === 'specific'}
                    onChange={(e) => setFilterMode(e.target.value)}
                    className="h-4 w-4"
                  />
                  <label htmlFor="specific" className="text-sm font-medium text-slate-700">Specific Date</label>
                </div>
                
                {filterMode === 'range' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">From</label>
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-40"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-40"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                    <Input
                      type="date"
                      value={specificDate}
                      onChange={(e) => setSpecificDate(e.target.value)}
                      className="w-40"
                    />
                  </div>
                )}
                
                <Button onClick={applyFilters} size="sm">Apply</Button>
                <Button variant="outline" onClick={clearFilters} size="sm">Clear</Button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by subject or exam type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Results Table */}
              {error ? (
                <div className="p-8 text-center text-red-500">{error}</div>
              ) : filteredResults.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No results found. Try adjusting your filters.</div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Exam Type</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Subject</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Marks</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Max</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">%</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Rank</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredResults.map((result, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm text-slate-600">{formatDateSafe(result.date)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getExamTypeColor(result.examType)}`}>
                              {result.examType || 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">{result.subject || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{result.status === 'absent' ? 'Absent' : (result.marksObtained ?? 'N/A')}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{result.maxMarks ?? 'N/A'}</td>
                          <td className="px-4 py-3">
                            <span className={`font-semibold ${
                              result.percentage >= 75 ? 'text-green-600' :
                              result.percentage >= 50 ? 'text-orange-600' :
                              'text-red-600'
                            }`}>
                              {formatPercentageSafe(result.percentage)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{result.rank ? `#${result.rank}` : 'N/A'}</td>
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
              <div className="p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
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
            </ErpSection>
          )}

          {/* SECTION 5: Subject-wise Performance */}
          {subjectPerformance.length > 0 && (
            <ErpSection title="Subject-wise Performance" icon={BookOpen} tone="blue">
              <div className="p-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {subjectPerformance.map((sp, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-slate-900">{sp.subject}</span>
                        <span className={`text-lg font-bold ${
                          parseFloat(sp.averagePercentage) >= 75 ? 'text-green-600' :
                          parseFloat(sp.averagePercentage) >= 50 ? 'text-orange-600' :
                          'text-red-600'
                        }`}>
                          {sp.averagePercentage}%
                        </span>
                      </div>
                      <div className="text-sm text-slate-500">{sp.count} tests</div>
                      <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
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
