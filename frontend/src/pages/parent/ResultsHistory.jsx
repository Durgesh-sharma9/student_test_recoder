import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Calendar, Filter, Trophy } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErpSection } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
  const [classRank, setClassRank] = useState(null);
  const [classPercentage, setClassPercentage] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
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
      setClassRank(res.data.classRank ?? null);
      setClassPercentage(res.data.classPercentage ?? 0);
      setTotalStudents(res.data.totalStudents ?? 0);
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
    setClassRank(null);
    setClassPercentage(0);
    setTotalStudents(0);
    setError(null);
  };

  const formatDateSafe = (date) => {
    try {
      if (!date) return 'N/A';
      const d = new Date(date);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/parent/student/${studentId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader
          title="Results History"
          description={student?.name ? `${student.name} - ${student?.className || ''} ${student?.section ? `(${student.section})` : ''}` : ''}
        />
      </div>

      <ErpSection title="Filters" icon={Filter} tone="orange">
        <div className="p-4 space-y-4">
          <div className="flex gap-4">
            <button
              onClick={() => setFilterMode('specific')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterMode === 'specific'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Specific Date
            </button>
            <button
              onClick={() => setFilterMode('range')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
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
              <Input
                type="date"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                className="h-10"
              />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Date From</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-10"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Date To</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2 p-4 pt-0">
          <Button onClick={loadResults} disabled={loading}>
            {loading ? 'Loading...' : 'Show Results'}
          </Button>
          <Button variant="outline" onClick={clearFilters} size="sm">
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

      {results && results.length > 0 && !error && (
        <>
          <ErpSection title="Class Summary" icon={Trophy} tone="yellow">
            <div className="grid gap-4 p-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Class Rank</div>
                <div className="text-2xl font-bold text-slate-900">{classRank ? '#' + classRank : 'N/A'}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Class Percentage</div>
                <div className="text-2xl font-bold text-slate-900">{formatPercentageSafe(classPercentage)}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Total Students</div>
                <div className="text-2xl font-bold text-slate-900">{totalStudents || 'N/A'}</div>
              </div>
            </div>
          </ErpSection>

          <ErpSection title="Results" icon={Calendar} tone="green">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Exam Type</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Subject</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Marks Obtained</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Max Marks</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Percentage</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Rank</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Class Rank</th>
                  </tr>
                </thead>
                <tbody>
                  {results && results.length > 0 && results.map((result, index) => (
                    <tr key={index || result?._id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {formatDateSafe(result?.date)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getExamTypeColor(result?.examType)}`}>
                          {result?.examType || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">{result?.subject || 'N/A'}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-900">{result?.marksObtained ?? 'N/A'}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-900">{result?.maxMarks ?? 'N/A'}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-900">{formatPercentageSafe(result?.percentage)}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-900">{result?.rank ? '#' + result.rank : 'N/A'}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-900">{classRank ? '#' + classRank : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ErpSection>
        </>
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
