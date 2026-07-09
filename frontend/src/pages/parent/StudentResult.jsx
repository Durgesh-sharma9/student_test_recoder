import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Calendar, Filter, Trophy, User, TrendingUp, Download, BookOpen, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '@/lib/api';
import { formatDisplayDate } from '@/lib/dateFormatter';
import { PageHeader, ErpSection } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DatePicker from '@/components/ui/DatePicker';

const getExamTypeColor = (examType) => {
  if (examType === 'Daily Test') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (examType.startsWith('PA')) return 'bg-red-100 text-red-700 border-red-200';
  if (examType.startsWith('FA')) return 'bg-orange-100 text-orange-700 border-orange-200';
  if (examType === 'Half Yearly') return 'bg-purple-100 text-purple-700 border-purple-200';
  if (examType === 'Final') return 'bg-green-100 text-green-700 border-green-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

export default function StudentResult() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterMode, setFilterMode] = useState('range');
  const [specificDate, setSpecificDate] = useState('');

  useEffect(() => {
    loadResults();
  }, [studentId]);

  const loadResults = async () => {
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
    loadResults();
  };

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSpecificDate('');
    setResults([]);
    setSummary(null);
    setError(null);
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
  const trendData = results.slice(0, 10).reverse().map(r => ({
    date: formatDateSafe(r.date),
    percentage: r.percentage || 0
  }));

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/parent/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <PageHeader
            title="Student Results"
            description={student?.name ? `${student.name} - ${student?.className || ''} ${student?.section ? `(${student.section})` : ''}` : ''}
          />
        </div>
        {results && results.length > 0 && (
          <Button onClick={generatePDF} className="flex items-center justify-center gap-2 w-full md:w-auto">
            <Download className="h-4 w-4" />
            Download Report Card
          </Button>
        )}
      </div>

      {/* Filters */}
      <ErpSection title="Filter Results" icon={Filter} tone="blue">
        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-end gap-4 p-4">
          <div className="flex gap-4 w-full sm:w-auto">
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
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            {filterMode === 'range' ? (
              <>
                <div className="w-full sm:w-auto">
                  <label className="block text-sm font-medium text-slate-700 mb-1">From</label>
                  <DatePicker
                    value={dateFrom}
                    onChange={setDateFrom}
                    className="w-full sm:w-48"
                  />
                </div>
                <div className="w-full sm:w-auto">
                  <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
                  <DatePicker
                    value={dateTo}
                    onChange={setDateTo}
                    className="w-full sm:w-48"
                  />
                </div>
              </>
            ) : (
              <div className="w-full sm:w-auto">
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <DatePicker
                  value={specificDate}
                  onChange={setSpecificDate}
                  className="w-full sm:w-48"
                />
              </div>
            )}
            
            <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
              <Button onClick={applyFilters} className="flex-1 sm:flex-none">Apply Filters</Button>
              <Button variant="outline" onClick={clearFilters} className="flex-1 sm:flex-none">Clear</Button>
            </div>
          </div>
        </div>
      </ErpSection>

      {student && (
        <ErpSection title="Student Information" icon={User} tone="blue">
          <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-3 sm:gap-4 sm:p-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4 overflow-hidden">
              <div className="text-xs sm:text-sm text-slate-500 truncate">Student Name</div>
              <div className="text-lg sm:text-xl font-bold text-slate-900 truncate">{student.name}</div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:hidden">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 overflow-hidden">
                <div className="text-xs text-slate-500 truncate">Class</div>
                <div className="text-lg font-bold text-slate-900 truncate">{student.className} {student.section ? `(${student.section})` : ''}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 overflow-hidden">
                <div className="text-xs text-slate-500 truncate">Roll No</div>
                <div className="text-lg font-bold text-slate-900 truncate">{student.rollNo}</div>
              </div>
            </div>
            {/* Desktop views for Class and Roll No */}
            <div className="hidden sm:block rounded-lg border border-slate-200 bg-slate-50 p-4 overflow-hidden">
              <div className="text-sm text-slate-500 truncate">Class</div>
              <div className="text-xl font-bold text-slate-900 truncate">{student.className} {student.section ? `(${student.section})` : ''}</div>
            </div>
            <div className="hidden sm:block rounded-lg border border-slate-200 bg-slate-50 p-4 overflow-hidden">
              <div className="text-sm text-slate-500 truncate">Roll No</div>
              <div className="text-xl font-bold text-slate-900 truncate">{student.rollNo}</div>
            </div>
          </div>
        </ErpSection>
      )}

      {summary && (
        <ErpSection title="Performance Summary" icon={Trophy} tone="green">
          <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-4 sm:gap-4 sm:p-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4 overflow-hidden">
              <div className="text-xs sm:text-sm text-slate-500 truncate">Total Tests</div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900">{summary.totalTests}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4 overflow-hidden">
              <div className="text-xs sm:text-sm text-slate-500 truncate">Average %</div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900">{formatPercentageSafe(summary.averagePercentage)}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4 overflow-hidden">
              <div className="text-xs sm:text-sm text-slate-500 truncate">Current Rank</div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900">{summary.currentRank ? `#${summary.currentRank}` : 'N/A'}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4 overflow-hidden">
              <div className="text-xs sm:text-sm text-slate-500 truncate">Best Score</div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900">{formatPercentageSafe(summary.bestScore)}</div>
            </div>
          </div>
        </ErpSection>
      )}

      {trendData.length > 0 && (
        <ErpSection title="Performance Trend" icon={TrendingUp} tone="purple">
          <div className="p-3 sm:p-4">
            <div className="text-xs text-slate-400 mb-2 md:hidden italic">Swipe horizontally to view full chart</div>
            <div className="w-full overflow-x-auto pb-2">
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
                        fontSize: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
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

      {subjectPerformance.length > 0 && (
        <ErpSection title="Subject-wise Performance" icon={BookOpen} tone="blue">
          <div className="p-3 sm:p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {subjectPerformance.map((sp, idx) => (
                <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4">
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
                  <div className="text-xs sm:text-sm text-slate-500">{sp.count} tests</div>
                </div>
              ))}
            </div>
          </div>
        </ErpSection>
      )}

      {weakSubjects.length > 0 && (
        <ErpSection title="Subjects Needing Attention" icon={AlertTriangle} tone="amber">
          <div className="p-3 sm:p-4">
            <div className="flex flex-wrap gap-2">
              {weakSubjects.map((s, idx) => (
                <span key={idx} className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs sm:text-sm font-medium">
                  {s.subject}
                </span>
              ))}
            </div>
          </div>
        </ErpSection>
      )}

      <ErpSection title="Results History" icon={Calendar} tone="blue">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading results...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : results.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No results found. Try adjusting your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
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
                {results.map((result, idx) => (
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
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{result.rank ? `#${result.rank}` : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ErpSection>
    </div>
  );
}