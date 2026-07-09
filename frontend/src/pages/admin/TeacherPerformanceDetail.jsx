import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BarChart3, Users, ClipboardList, TrendingUp, FileCheck } from 'lucide-react';
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
  
  // Notebook Checking Analytics
  const [nbLoading, setNbLoading] = useState(false);
  const [nbStats, setNbStats] = useState(null);

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

  useEffect(() => {
    const loadNb = async () => {
      if (!params.teacherId || !params.classId || !params.subject) return;
      setNbLoading(true);
      try {
        // Fetch all notebook checks matching this criteria for analytics
        const res = await api.get(`/notebook/analytics`, { params });
        if (res.data.success && res.data.data) {
          let checked = 0;
          let pending = 0;
          let notSubmitted = 0;
          res.data.data.forEach(d => {
            checked += d.checkedCount || 0;
            pending += d.pendingCount || 0;
            notSubmitted += d.notSubmittedCount || 0;
          });
          setNbStats({
            overallPercentage: res.data.overallPercentage,
            checked,
            pending,
            notSubmitted
          });
        }
      } catch (err) {
        console.error('Failed to load notebook analytics', err);
      } finally {
        setNbLoading(false);
      }
    };
    loadNb();
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
      <div className="flex items-center justify-between gap-3 mb-2">
        <PageHeader
          title="Teacher Performance Details"
          description="Detailed analytics for selected Teacher + Subject + Class."
        />
        <Button asChild variant="outline" size="sm" className="shrink-0 h-8 shadow-sm">
          <Link to="/admin/teacher-performance">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back
          </Link>
        </Button>
      </div>

      <ErpSection title="Summary" icon={Users} tone="blue">
        {!detail && !loading ? (
          <div className="py-6 text-center text-sm text-slate-500">No data found</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-lg border border-blue-100 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 p-3 shadow-sm flex flex-col justify-center">
              <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">Teacher</div>
              <div className="text-lg font-bold text-slate-800 leading-tight truncate">{detail?.teacherName || '-'}</div>
              {detail?.teacherEmail ? <div className="text-[10px] text-slate-500 truncate mt-0.5">{detail.teacherEmail}</div> : null}
            </div>
            <div className="rounded-lg border border-cyan-100 bg-gradient-to-br from-cyan-50/80 to-blue-50/80 p-3 shadow-sm flex flex-col justify-center">
              <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">Subject</div>
              <div className="text-lg font-bold text-slate-800 leading-tight truncate">{detail?.subject || '-'}</div>
            </div>
            <div className="rounded-lg border border-teal-100 bg-gradient-to-br from-teal-50/80 to-cyan-50/80 p-3 shadow-sm flex flex-col justify-center">
              <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">Class</div>
              <div className="text-lg font-bold text-slate-800 leading-tight">
                {detail?.className ? `${formatClassName(detail.className)}-${detail.section}` : '-'}
              </div>
            </div>
            <div className="rounded-lg border border-green-100 bg-gradient-to-br from-green-50/80 to-emerald-50/80 p-3 shadow-sm flex flex-col justify-center">
              <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">Students</div>
              <div className="text-xl font-bold text-slate-800 leading-tight">{detail?.studentsCount ?? '-'}</div>
            </div>
            <div className="rounded-lg border border-amber-100 bg-gradient-to-br from-amber-50/80 to-yellow-50/80 p-3 shadow-sm flex flex-col justify-center">
              <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">Tests Conducted</div>
              <div className="text-xl font-bold text-slate-800 leading-tight">{detail?.testsConducted ?? '-'}</div>
            </div>
            <div className="rounded-lg border border-indigo-200 bg-gradient-to-br from-indigo-50/80 to-blue-100/60 p-3 shadow-sm flex flex-col justify-center relative overflow-hidden">
              <div className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider mb-1">Avg Percentage</div>
              <div className="text-2xl font-bold text-indigo-700 leading-tight">{detail ? `${detail.averagePercentage}%` : '-'}</div>
              <div className="text-[10px] text-indigo-500/80 mt-1 truncate font-medium">
                Last: {detail?.lastTestDate ? formatDisplayDateShort(detail.lastTestDate) : '-'}
              </div>
            </div>
          </div>
        )}
      </ErpSection>

      <ErpSection title="Notebook Checking Progress" icon={FileCheck} tone="fuchsia">
        {nbLoading ? (
          <div className="py-6 text-center text-sm text-slate-500">Loading notebook data...</div>
        ) : !nbStats ? (
          <div className="py-6 text-center text-sm text-slate-500">No notebook checking data found</div>
        ) : (
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-green-50/50 p-3 text-center shadow-sm">
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Checked</div>
              <div className="mt-1 text-2xl font-bold text-emerald-600 leading-none">{nbStats.checked}</div>
            </div>
            <div className="rounded-lg border border-amber-100 bg-gradient-to-br from-amber-50/80 to-yellow-50/50 p-3 text-center shadow-sm">
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Pending</div>
              <div className="mt-1 text-2xl font-bold text-amber-600 leading-none">{nbStats.pending}</div>
            </div>
            <div className="rounded-lg border border-rose-100 bg-gradient-to-br from-rose-50/80 to-red-50/50 p-3 text-center shadow-sm">
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Not Submitted</div>
              <div className="mt-1 text-2xl font-bold text-rose-600 leading-none">{nbStats.notSubmitted}</div>
            </div>
            <div className="rounded-lg border border-fuchsia-100 bg-gradient-to-br from-fuchsia-50/80 to-purple-50/50 p-3 text-center shadow-sm">
              <div className="text-xs font-semibold text-fuchsia-700 uppercase tracking-wider">Overall Progress</div>
              <div className="mt-1 text-2xl font-bold text-fuchsia-700 leading-none">{nbStats.overallPercentage}%</div>
            </div>
          </div>
        )}
      </ErpSection>

      <ErpSection title="Performance Trend" icon={TrendingUp} tone="green">
        <div className="h-[240px] w-full rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          {trendData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">No trend data</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(v) => [`${v}%`, 'Avg %']}
                  labelFormatter={(label, payload) => {
                    const d = payload?.[0]?.payload?.dateLabel;
                    return d ? `${label} (${d})` : label;
                  }}
                />
                <Line type="monotone" dataKey="percentage" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </ErpSection>

      <ErpSection title="Test-wise Breakdown" icon={ClipboardList} tone="blue">
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-slate-50 to-blue-50/30">
                <TableHead className="py-2.5 px-3 text-xs font-semibold text-slate-600">Test Name</TableHead>
                <TableHead className="py-2.5 px-3 text-xs font-semibold text-slate-600">Assessment Type</TableHead>
                <TableHead className="py-2.5 px-3 text-xs font-semibold text-slate-600">Date</TableHead>
                <TableHead className="py-2.5 px-3 text-xs font-semibold text-slate-600 text-right">Average Percentage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100">
              {(detail?.testWiseBreakdown || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-sm text-slate-500">
                    No tests found
                  </TableCell>
                </TableRow>
              ) : (
                detail.testWiseBreakdown.map((t) => (
                  <TableRow key={t.sessionId} className="hover:bg-blue-50/20 transition-colors">
                    <TableCell className="py-2 px-3 text-sm font-medium text-slate-800">{t.testName}</TableCell>
                    <TableCell className="py-2 px-3 text-sm text-slate-600">{t.assessmentType}</TableCell>
                    <TableCell className="py-2 px-3 text-sm text-slate-600">{t.date ? formatDisplayDateShort(t.date) : '-'}</TableCell>
                    <TableCell className="py-2 px-3 text-sm text-right font-bold text-blue-600">{t.averagePercentage}%</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </ErpSection>

      <ErpSection title="Students Analysis" icon={BarChart3} tone="green">
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Top Students */}
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="bg-emerald-50/50 border-b border-emerald-100 px-3 py-2.5 text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Top Performers
            </div>
            <div className="overflow-x-auto flex-1">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                    <TableHead className="py-2 px-3 text-xs font-medium text-slate-500">Roll</TableHead>
                    <TableHead className="py-2 px-3 text-xs font-medium text-slate-500">Student</TableHead>
                    <TableHead className="py-2 px-3 text-xs font-medium text-slate-500 text-right">Avg %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-50">
                  {(detail?.topStudents || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-6 text-center text-sm text-slate-500">
                        No students
                      </TableCell>
                    </TableRow>
                  ) : (
                    detail.topStudents.map((s) => (
                      <TableRow key={s.studentId} className="hover:bg-emerald-50/30">
                        <TableCell className="py-2 px-3 font-mono text-xs text-slate-500">{s.rollNo ?? '-'}</TableCell>
                        <TableCell className="py-2 px-3 text-sm font-medium text-slate-800">{s.studentName}</TableCell>
                        <TableCell className="py-2 px-3 text-sm text-right font-bold text-emerald-600">{s.averagePercentage}%</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Students Needing Attention */}
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="bg-rose-50/50 border-b border-rose-100 px-3 py-2.5 text-xs font-bold text-rose-800 uppercase tracking-wider">
              Needing Attention
            </div>
            <div className="overflow-x-auto flex-1">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                    <TableHead className="py-2 px-3 text-xs font-medium text-slate-500">Roll</TableHead>
                    <TableHead className="py-2 px-3 text-xs font-medium text-slate-500">Student</TableHead>
                    <TableHead className="py-2 px-3 text-xs font-medium text-slate-500 text-right">Avg %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-50">
                  {(detail?.studentsNeedingAttention || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-6 text-center text-sm text-slate-500">
                        No students
                      </TableCell>
                    </TableRow>
                  ) : (
                    detail.studentsNeedingAttention.map((s) => (
                      <TableRow key={s.studentId} className="hover:bg-rose-50/30">
                        <TableCell className="py-2 px-3 font-mono text-xs text-slate-500">{s.rollNo ?? '-'}</TableCell>
                        <TableCell className="py-2 px-3 text-sm font-medium text-slate-800">{s.studentName}</TableCell>
                        <TableCell className="py-2 px-3 text-sm text-right font-bold text-rose-600">{s.averagePercentage}%</TableCell>
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
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-slate-50 to-blue-50/30">
                <TableHead className="py-2.5 px-3 text-xs font-semibold text-slate-600">Assessment Type</TableHead>
                <TableHead className="py-2.5 px-3 text-xs font-semibold text-slate-600 text-right">Average Percentage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100">
              {(detail?.assessmentComparison || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="py-6 text-center text-sm text-slate-500">
                    No comparisons available
                  </TableCell>
                </TableRow>
              ) : (
                detail.assessmentComparison.map((a) => (
                  <TableRow key={a.examType} className="hover:bg-blue-50/20 transition-colors">
                    <TableCell className="py-2 px-3 text-sm font-medium text-slate-800">{a.examType}</TableCell>
                    <TableCell className="py-2 px-3 text-sm text-right font-bold text-blue-600">{a.averagePercentage}%</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </ErpSection>
    </PageStack>
  );
}