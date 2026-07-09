import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Calendar, Filter, Trophy, User, TrendingUp, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '@/lib/api';
import { formatDisplayDate } from '@/lib/dateFormatter';
import AbsentBadge from '@/components/AbsentBadge';
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

export default function ResultsHistory() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [student, setStudent] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterMode, setFilterMode] = useState('range'); // 'specific' or 'range'
  const [specificDate, setSpecificDate] = useState('');

  const loadResults = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      
      if (filterMode === 'specific' && specificDate) {
        // For specific date, set both dateFrom and dateTo to the same date
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

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/parent/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <PageHeader
            title="Results History"
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

      {student && (
        <ErpSection title="Student Information" icon={User} tone="blue">
          <div className="grid gap-3 p-3 sm:gap-4 sm:p-4 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <div className="text-xs sm:text-sm text-slate-500">Student Name</div>
              <div className="text-lg sm:text-xl font-bold text-slate-900 truncate">{student.name}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <div className="text-xs sm:text-sm text-slate-500">Class</div>
              <div className="text-lg sm:text-xl font-bold text-slate-900 truncate">{student.className} {student.section ? `(${student.section})` : ''}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <div className="text-xs sm:text-sm text-slate-500">Roll No</div>
              <div className="text-lg sm:text-xl font-bold text-slate-900 truncate">{student.rollNo}</div>
            </div>
          </div>
        </ErpSection>
      )}

      <ErpSection title="Filters" icon={Filter} tone="orange">
        <div className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <button
              onClick={() => setFilterMode('specific')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-medium transition-colors ${
                filterMode === 'specific'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Specific Date
            </button>
            <button
              onClick={() => setFilterMode('range')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-medium transition-colors ${
                filterMode === 'range'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Date Range
            </button>
          </div>
          
          {filterMode === 'specific' ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Select Date</label>
              <DatePicker
                value={specificDate}
                onChange={setSpecificDate}
                className="h-10 w-full md:w-64"
              />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Date From</label>
                <DatePicker
                  value={dateFrom}
                  onChange={setDateFrom}
                  className="h-10"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Date To</label>
                <DatePicker
                  value={dateTo}
                  onChange={setDateTo}
                  className="h-10"
                />
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 p-4 pt-0">
          <Button onClick={loadResults} disabled={loading} className="w-full sm:w-auto">
            {loading ? 'Loading...' : 'Show Results'}
          </Button>
          <Button variant="outline" onClick={clearFilters} size="sm" className="w-full sm:w-auto">
            Clear Filters
          </Button>
        </div>
      </ErpSection>

      {error && (
        <ErpSection title="Error" icon={Calendar} tone="red">
          <div className="p-8 text-center text-red-600">
            {error}
          </div>
        </ErpSection>
      )}

      {summary && !error && (
        <ErpSection title="Performance Summary" icon={Trophy} tone="yellow">
          <div className="grid grid-cols-2 gap-3 p-3 sm:gap-4 sm:p-4 sm:grid-cols-4">
            <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-3 sm:p-4 border border-blue-200 overflow-hidden">
              <div className="text-[10px] sm:text-xs font-medium text-blue-600 mb-1 truncate">Total Tests</div>
              <div className="text-xl sm:text-2xl font-bold text-blue-700">{summary.totalTests}</div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-green-50 to-green-100 p-3 sm:p-4 border border-green-200 overflow-hidden">
              <div className="text-[10px] sm:text-xs font-medium text-green-600 mb-1 truncate">Average %</div>
              <div className="text-xl sm:text-2xl font-bold text-green-700">{formatPercentageSafe(summary.averagePercentage)}</div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 p-3 sm:p-4 border border-purple-200 overflow-hidden">
              <div className="text-[10px] sm:text-xs font-medium text-purple-600 mb-1 truncate">Current Rank</div>
              <div className="text-xl sm:text-2xl font-bold text-purple-700">#{summary.currentRank || 'N/A'}</div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 p-3 sm:p-4 border border-orange-200 overflow-hidden">
              <div className="text-[10px] sm:text-xs font-medium text-orange-600 mb-1 truncate">Best Score</div>
              <div className="text-xl sm:text-2xl font-bold text-orange-700">{formatPercentageSafe(summary.bestScore)}</div>
            </div>
          </div>
        </ErpSection>
      )}

      {results && results.length > 0 && !error && (
        <ErpSection title="Results" icon={Calendar} tone="green">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">Date</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">Exam Type</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">Subject</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-slate-700">Marks Obtained</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-slate-700">Max Marks</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-slate-700">Percentage</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-slate-700">Rank</th>
                </tr>
              </thead>
              <tbody>
                {results && results.length > 0 && results.map((result, index) => (
                  <tr key={index || result?._id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-900">
                      {formatDateSafe(result?.date)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getExamTypeColor(result?.examType)}`}>
                        {result?.examType || 'N/A'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-900">{result?.subject || 'N/A'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-900">{result?.status === 'absent' ? <AbsentBadge /> : (result?.marksObtained ?? 'N/A')}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-900">{result?.maxMarks ?? 'N/A'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-900">{formatPercentageSafe(result?.percentage)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-900">{result?.rank ? '#' + result.rank : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ErpSection>
      )}

      {results && results.length > 0 && !error && (
        <ErpSection title="Performance Trend" icon={TrendingUp} tone="purple">
          <div className="space-y-4">
            <div className="grid gap-3 p-3 sm:gap-4 sm:p-4 sm:grid-cols-3 text-xs sm:text-sm">
              <div>
                <span className="font-medium text-slate-700">Student: </span>
                <span className="text-slate-900">{student?.name || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium text-slate-700">Class: </span>
                <span className="text-slate-900">{student?.className || 'N/A'} {student?.section ? `(${student.section})` : ''}</span>
              </div>
              <div>
                <span className="font-medium text-slate-700">Roll No: </span>
                <span className="text-slate-900">{student?.rollNo || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium text-slate-700">Range: </span>
                <span className="text-slate-900">
                  {filterMode === 'specific' && specificDate ? formatDateSafe(specificDate) : 
                   dateFrom && dateTo ? `${formatDateSafe(dateFrom)} - ${formatDateSafe(dateTo)}` : 
                   'All Results'}
                </span>
              </div>
              <div>
                <span className="font-medium text-slate-700">Total Tests: </span>
                <span className="text-slate-900">{summary?.totalTests || results.length}</span>
              </div>
            </div>
            
            <div className="text-xs text-slate-400 mb-2 md:hidden italic px-4">Swipe horizontally to view full chart</div>
            
            <div className="w-full overflow-x-auto pb-2">
              <div className="min-w-[500px] md:min-w-0 w-full h-[250px] md:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={results.map(r => ({
                    date: formatDateSafe(r.date),
                    percentage: r.percentage
                  }))} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
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
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="percentage" 
                      stroke="#6366f1" 
                      strokeWidth={3}
                      dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </ErpSection>
      )}

      {!loading && !error && (!results || results.length === 0) && (
        <ErpSection title="Results" icon={Calendar} tone="green">
          <div className="p-8 text-center text-slate-500">
            No Results Found. Select a date range or specific date and click "Show Results" to view results.
          </div>
        </ErpSection>
      )}
    </div>
  );
}