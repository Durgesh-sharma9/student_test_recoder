import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BarChart3, Users, ClipboardList, TrendingUp } from 'lucide-react';
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '@/lib/api';
import { formatClassName } from '@/lib/utils';
import { formatDisplayDateShort } from '@/lib/dateFormatter';
import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function TeacherPerformanceDetail() {
  const [sp] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);

  const params = useMemo(() => {
    const p = {
      teacherId: sp.get('teacherId') || '',
      classId: sp.get('classId') || '',
      subject: sp.get('subject') || '',
      assessmentTypes: sp.get('assessmentTypes') || 'All Assessments',
      dateFilter: sp.get('dateFilter') || 'overall',
      specificDate: sp.get('specificDate') || undefined,
      dateFrom: sp.get('dateFrom') || undefined,
      dateTo: sp.get('dateTo') || undefined,
    };
    return p;
  }, [sp]);

  useEffect(() => {
    const load = async () => {
      if (!params.teacherId || !params.classId || !params.subject) return;
      setLoading(true);
      try {
        const res = await api.get('/teacher-performance/detail', { params });
        setDetail(res.data.detail);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params]);

  const trendData = useMemo(() => {
    const arr = detail?.performanceTrend || [];
    return arr.map((x, idx) => ({
      name: x.examType === 'Daily Test' ? `DT ${idx + 1}` : x.examType,
      dateLabel: formatDisplayDateShort(x.date),
      percentage: x.averagePercentage,
    }));
  }, [detail]);

  return (
    <PageStack>
      <div className="flex items-center justify-between gap-3">
        <PageHeader
          title="Teacher Performance Details"
          description="Detailed analytics for selected Teacher + Subject + Class."
        />
        <Button asChild variant="outline" className="shrink-0">
          <Link to="/admin/teacher-performance">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <ErpSection title="Summary" icon={Users} tone="blue">
        {!detail && !loading ? (
          <div className="py-8 text-center text-slate-500">No data found</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold text-slate-500">Teacher</div>
              <div className="mt-1 text-lg font-bold text-slate-900">{detail?.teacherName || '-'}</div>
              {detail?.teacherEmail ? <div className="text-xs text-slate-500">{detail.teacherEmail}</div> : null}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold text-slate-500">Subject</div>
              <div className="mt-1 text-lg font-bold text-slate-900">{detail?.subject || '-'}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold text-slate-500">Class</div>
              <div className="mt-1 text-lg font-bold text-slate-900">
                {detail?.className ? `${formatClassName(detail.className)}-${detail.section}` : '-'}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold text-slate-500">Students Count</div>
              <div className="mt-1 text-lg font-bold text-slate-900">{detail?.studentsCount ?? '-'}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold text-slate-500">Tests Conducted</div>
              <div className="mt-1 text-lg font-bold text-slate-900">{detail?.testsConducted ?? '-'}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold text-slate-500">Average Percentage</div>
              <div className="mt-1 text-lg font-bold text-indigo-700">{detail ? `${detail.averagePercentage}%` : '-'}</div>
              <div className="text-xs text-slate-500">
                Last Test: {detail?.lastTestDate ? formatDisplayDateShort(detail.lastTestDate) : '-'}
              </div>
            </div>
          </div>
        )}
      </ErpSection>

      <ErpSection title="Performance Trend" icon={TrendingUp} tone="green">
        <div className="h-[280px] w-full rounded-xl border border-slate-200 bg-white p-4">
          {trendData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-slate-500">No trend data</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip
                  formatter={(v) => [`${v}%`, 'Avg %']}
                  labelFormatter={(label, payload) => {
                    const d = payload?.[0]?.payload?.dateLabel;
                    return d ? `${label} (${d})` : label;
                  }}
                />
                <Line type="monotone" dataKey="percentage" stroke="#4F46E5" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </ErpSection>

      <ErpSection title="Test-wise Breakdown" icon={ClipboardList} tone="blue">
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/70">
                <TableHead>Test Name</TableHead>
                <TableHead>Assessment Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Average Percentage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(detail?.testWiseBreakdown || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-slate-500">
                    No tests found
                  </TableCell>
                </TableRow>
              ) : (
                detail.testWiseBreakdown.map((t) => (
                  <TableRow key={t.sessionId} className="hover:bg-slate-50">
                    <TableCell className="font-medium">{t.testName}</TableCell>
                    <TableCell>{t.assessmentType}</TableCell>
                    <TableCell>{t.date ? formatDisplayDateShort(t.date) : '-'}</TableCell>
                    <TableCell className="text-right font-bold text-indigo-700">{t.averagePercentage}%</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </ErpSection>

      <ErpSection title="Students" icon={BarChart3} tone="green">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-800">Top Students</div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/70">
                    <TableHead>Roll</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead className="text-right">Avg %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(detail?.topStudents || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center text-slate-500">
                        No students
                      </TableCell>
                    </TableRow>
                  ) : (
                    detail.topStudents.map((s) => (
                      <TableRow key={s.studentId} className="hover:bg-slate-50">
                        <TableCell className="font-mono text-xs text-slate-600">{s.rollNo ?? '-'}</TableCell>
                        <TableCell className="font-medium">{s.studentName}</TableCell>
                        <TableCell className="text-right font-bold text-emerald-700">{s.averagePercentage}%</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-800">
              Students Needing Attention
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/70">
                    <TableHead>Roll</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead className="text-right">Avg %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(detail?.studentsNeedingAttention || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center text-slate-500">
                        No students
                      </TableCell>
                    </TableRow>
                  ) : (
                    detail.studentsNeedingAttention.map((s) => (
                      <TableRow key={s.studentId} className="hover:bg-slate-50">
                        <TableCell className="font-mono text-xs text-slate-600">{s.rollNo ?? '-'}</TableCell>
                        <TableCell className="font-medium">{s.studentName}</TableCell>
                        <TableCell className="text-right font-bold text-rose-700">{s.averagePercentage}%</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </ErpSection>

      <ErpSection title="Assessment Comparison" icon={BarChart3} tone="blue">
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/70">
                <TableHead>Assessment Type</TableHead>
                <TableHead className="text-right">Average Percentage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(detail?.assessmentComparison || []).map((a) => (
                <TableRow key={a.examType} className="hover:bg-slate-50">
                  <TableCell className="font-medium">{a.examType}</TableCell>
                  <TableCell className="text-right font-bold text-indigo-700">{a.averagePercentage}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ErpSection>
    </PageStack>
  );
}

