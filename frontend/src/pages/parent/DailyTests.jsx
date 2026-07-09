import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Calendar, Filter } from 'lucide-react';
import api from '@/lib/api';
import { formatDisplayDate } from '@/lib/dateFormatter';
import AbsentBadge from '@/components/AbsentBadge';
import { PageHeader, ErpSection } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DatePicker from '@/components/ui/DatePicker';

export default function ParentDailyTests() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [dailyTests, setDailyTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [subject, setSubject] = useState('');

  useEffect(() => {
    loadDailyTests();
  }, [studentId, dateFrom, dateTo, subject]);

  const loadDailyTests = async () => {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (subject) params.append('subject', subject);
      
      const res = await api.get(`/parents/students/${studentId}/daily-tests?${params}`);
      setDailyTests(res.data.dailyTests || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load daily tests');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSubject('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/parent/student/${studentId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader
          title="Daily Tests"
          description="View daily test results"
        />
      </div>

      <ErpSection title="Filters" icon={Filter} tone="orange">
        <div className="grid gap-3 sm:gap-4 p-4 sm:grid-cols-3">
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
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Subject</label>
            <Input
              placeholder="e.g., Maths, English"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-10"
            />
          </div>
        </div>
        <div className="flex gap-2 p-4 pt-0">
          <Button variant="outline" onClick={clearFilters} size="sm" className="w-full sm:w-auto">
            Clear Filters
          </Button>
        </div>
      </ErpSection>

      <ErpSection title="Daily Test Results" icon={Calendar} tone="green">
        {dailyTests.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No daily tests found for the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">Date</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">Subject</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-slate-700">Marks Obtained</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-slate-700">Max Marks</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-slate-700">Percentage</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-slate-700">Rank</th>
                </tr>
              </thead>
              <tbody>
                {dailyTests.map((test) => (
                  <tr key={test._id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-900">
                      {formatDisplayDate(test.date)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-900">{test.subject}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-900">
                      {test.status === 'absent' ? <AbsentBadge /> : test.marksObtained}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-900">{test.maxMarks}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-900">{test.percentage.toFixed(1)}%</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-900">#{test.rankSubject}</td>
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