import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { UserCheck, CheckCircle2, XCircle, Calendar as CalendarIcon, User, Search, RefreshCw, TrendingUp, PieChart as PieChartIcon, LayoutGrid, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '@/lib/api';
import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ParentAttendance() {
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'grid' | 'table'
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Load Parent's Linked Students
  useEffect(() => {
    const loadStudents = async () => {
      try {
        const res = await api.get('/parents/students');
        const list = res.data.students || [];
        setStudents(list);
        if (list.length > 0) {
          setSelectedStudentId(list[0]._id);
        }
      } catch (err) {
        toast.error('Failed to load student list');
      } finally {
        setLoading(false);
      }
    };
    loadStudents();
  }, []);

  // Fetch Attendance for Selected Student
  const loadAttendance = async (studentId) => {
    if (!studentId) return;
    setLoadingAttendance(true);
    try {
      const res = await api.get(`/parents/students/${studentId}/attendance`);
      setAttendanceData(res.data);
    } catch (err) {
      toast.error('Failed to load attendance report');
      setAttendanceData(null);
    } finally {
      setLoadingAttendance(false);
    }
  };

  useEffect(() => {
    if (selectedStudentId) {
      loadAttendance(selectedStudentId);
    }
  }, [selectedStudentId]);

  const selectedStudent = students.find((s) => s._id === selectedStudentId);

  // Map history records by dateString for instant calendar lookup
  const historyMap = useMemo(() => {
    const map = new Map();
    (attendanceData?.history || []).forEach((h) => {
      map.set(h.dateString, h);
    });
    return map;
  }, [attendanceData]);

  // Compute Day-wise Daily Attendance Percentage Curve for Selected Month
  const dailyTrendData = useMemo(() => {
    if (!attendanceData?.history || attendanceData.history.length === 0) return [];

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth(); // 0-indexed
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const monthShort = currentMonth.toLocaleDateString('en-US', { month: 'short' });

    const data = [];
    let cumulativePresent = 0;
    let cumulativeTotal = 0;

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(day).padStart(2, '0');
      const dateString = `${year}-${mStr}-${dStr}`;

      const rec = historyMap.get(dateString);
      if (rec) {
        cumulativeTotal++;
        if (rec.status === 'present') {
          cumulativePresent++;
        }
        const cumPct = Math.round((cumulativePresent / cumulativeTotal) * 100);

        data.push({
          dayLabel: `${day} ${monthShort}`,
          dayNum: day,
          status: rec.status === 'present' ? 'PRESENT' : 'ABSENT',
          percentage: cumPct,
        });
      }
    }

    // Fallback if no records for selected month
    if (data.length === 0) {
      const reversed = [...attendanceData.history].reverse();
      let cumP = 0;
      let cumT = 0;
      reversed.forEach((h) => {
        cumT++;
        if (h.status === 'present') cumP++;
        const dObj = new Date(h.dateString);
        const dayLabel = isNaN(dObj.getTime())
          ? h.dateString
          : dObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

        data.push({
          dayLabel,
          status: h.status === 'present' ? 'PRESENT' : 'ABSENT',
          percentage: Math.round((cumP / cumT) * 100),
        });
      });
    }

    return data;
  }, [attendanceData, currentMonth, historyMap]);

  // Calendar Days Calculation for Current Selected Month
  const calendarGrid = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(day).padStart(2, '0');
      const dateString = `${year}-${mStr}-${dStr}`;
      
      const dateObj = new Date(year, month, day);
      const isSunday = dateObj.getDay() === 0;

      days.push({
        day,
        dateString,
        isSunday,
        record: historyMap.get(dateString) || null,
      });
    }

    return days;
  }, [currentMonth, historyMap]);

  const prevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const filteredHistory = (attendanceData?.history || []).filter((h) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      h.dateString.toLowerCase().includes(q) ||
      h.status.toLowerCase().includes(q) ||
      (h.remarks || '').toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-slate-500 font-bold flex items-center gap-2 text-xs">
          <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
          Loading Attendance Report...
        </div>
      </div>
    );
  }

  const pct = attendanceData?.stats?.attendancePercentage || 0;
  const stats = attendanceData?.stats || { totalDaysMarked: 0, totalPresent: 0, totalAbsent: 0 };

  const strokeDasharray = 2 * Math.PI * 38;
  const strokeDashoffset = strokeDasharray - (strokeDasharray * pct) / 100;
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <PageStack className="pb-12 space-y-3.5 sm:space-y-5">
      {/* HEADER ROW WITH CHILD SWITCHER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <PageHeader
          title="Attendance Analytics"
          description={
            selectedStudent
              ? `Daily attendance & analytics for ${selectedStudent.name} (${selectedStudent.className || ''}${selectedStudent.section ? `-${selectedStudent.section}` : ''})`
              : 'Daily attendance history'
          }
        />

        {students.length > 0 && (
          <div className="flex items-center self-start sm:self-auto bg-white border border-slate-200/90 hover:border-emerald-300 px-3.5 py-1.5 rounded-full shadow-2xs transition-all cursor-pointer">
            <User className="h-4 w-4 text-emerald-600 mr-2 shrink-0" />
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger className="h-6 text-xs sm:text-sm font-extrabold text-slate-800 border-none shadow-none focus:ring-0 focus:outline-hidden bg-transparent p-0 gap-2">
                <SelectValue placeholder="Select Child" />
              </SelectTrigger>
              <SelectContent align="end" className="rounded-2xl">
                {students.map((s) => (
                  <SelectItem key={s._id} value={s._id} className="text-xs sm:text-sm font-bold">
                    {s.name} ({s.className || ''}{s.section ? `-${s.section}` : ''})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {loadingAttendance ? (
        <div className="py-12 text-center text-slate-400 font-bold flex items-center justify-center gap-2 text-xs">
          <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
          Fetching attendance records...
        </div>
      ) : attendanceData ? (
        <>
          {/* VISUAL HERO ROW: CIRCULAR GRAPH + SMOOTH DAY-WISE TREND CHART */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            
            {/* CIRCULAR PROGRESS RING CARD */}
            <div className="p-3.5 sm:p-4.5 rounded-2xl border border-slate-200/90 bg-white shadow-xs flex flex-col justify-between items-center text-center">
              <div className="w-full flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <PieChartIcon className="h-3.5 w-3.5 text-emerald-600" />
                  Overall Attendance
                </span>
                <span
                  className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                    pct >= 80
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : pct >= 60
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {pct >= 80 ? 'Excellent' : pct >= 60 ? 'Average' : 'Low'}
                </span>
              </div>

              {/* CIRCULAR SVG GRAPH */}
              <div className="relative my-2.5 flex items-center justify-center">
                <svg className="w-24 h-24 sm:w-28 sm:h-28 transform -rotate-90" viewBox="0 0 90 90">
                  <circle cx="45" cy="45" r="38" stroke="#e2e8f0" strokeWidth="9" fill="transparent" />
                  <circle
                    cx="45"
                    cy="45"
                    r="38"
                    stroke={pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#f43f5e'}
                    strokeWidth="9"
                    fill="transparent"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">{pct}%</span>
                  <span className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase">Present</span>
                </div>
              </div>

              {/* COMPACT COUNTER BADGES */}
              <div className="w-full grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100">
                <div className="p-1 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[8px] font-bold text-slate-400 uppercase">Total</div>
                  <div className="text-xs sm:text-sm font-black text-slate-800">{stats.totalDaysMarked}</div>
                </div>
                <div className="p-1 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="text-[8px] font-bold text-emerald-600 uppercase">Present</div>
                  <div className="text-xs sm:text-sm font-black text-emerald-800">{stats.totalPresent}</div>
                </div>
                <div className="p-1 rounded-xl bg-rose-50 border border-rose-100">
                  <div className="text-[8px] font-bold text-rose-600 uppercase">Absent</div>
                  <div className="text-xs sm:text-sm font-black text-rose-800">{stats.totalAbsent}</div>
                </div>
              </div>
            </div>

            {/* DAY-WISE SMOOTH TREND CHART WITH UN-CROWDED X-AXIS */}
            <div className="lg:col-span-2 p-3.5 sm:p-4.5 rounded-2xl border border-slate-200/90 bg-white shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-1.5">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-indigo-600" />
                  Attendance Trend ({monthName})
                </span>
                <span className="text-[10px] font-bold text-slate-400">Daily % Trend</span>
              </div>

              {dailyTrendData.length > 0 ? (
                <div className="w-full h-[150px] sm:h-[170px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyTrendData} margin={{ top: 8, right: 10, left: -22, bottom: 0 }}>
                      <defs>
                        <linearGradient id="attendanceGradientMain" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="dayLabel"
                        tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                        interval="preserveStartEnd"
                        minTickGap={25}
                      />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                        }}
                        formatter={(val, name, entry) => [
                          `${val}% (${entry.payload.status})`,
                          'Attendance',
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="percentage"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#attendanceGradientMain)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-10 text-center text-slate-400 font-medium text-xs">Insufficient data for trend chart</div>
              )}
            </div>
          </div>

          {/* ATTENDANCE LOGS (CALENDAR / CARDS GRID / TABLE VIEWS) */}
          <ErpSection
            title="Attendance Calendar & Logs"
            icon={CalendarIcon}
            tone="emerald"
            action={
              <div className="flex items-center gap-2">
                {/* 3-WAY VIEW TOGGLE */}
                <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setViewMode('calendar')}
                    className={`px-2 py-1 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1 ${
                      viewMode === 'calendar'
                        ? 'bg-white text-emerald-700 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Calendar View"
                  >
                    <CalendarIcon className="h-3.5 w-3.5" />
                    <span>Calendar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`px-2 py-1 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1 ${
                      viewMode === 'grid'
                        ? 'bg-white text-emerald-700 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Grid Cards View"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span>Cards</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`px-2 py-1 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1 ${
                      viewMode === 'table'
                        ? 'bg-white text-emerald-700 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Table View"
                  >
                    <List className="h-3.5 w-3.5" />
                    <span>Table</span>
                  </button>
                </div>

                {viewMode !== 'calendar' && (
                  <div className="relative w-32 sm:w-44">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Search date..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-7 pr-2.5 py-1 h-8 text-xs rounded-xl border-slate-200 focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                )}
              </div>
            }
          >
            {viewMode === 'calendar' ? (
              /* MONTHLY CALENDAR VIEW */
              <div className="space-y-3">
                {/* MONTH NAVIGATOR HEADER */}
                <div className="flex items-center justify-between bg-white px-3.5 py-2 rounded-xl border border-slate-200/90 shadow-2xs">
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                    {monthName}
                  </span>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {/* 7-DAY CALENDAR GRID */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-1 sm:p-3.5 shadow-2xs overflow-x-auto">
                  {/* WEEKDAY HEADERS */}
                  <div className="grid grid-cols-7 gap-0.5 sm:gap-1.5 text-center border-b border-slate-100 pb-1 mb-1 min-w-[270px]">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                      <div key={d} className={`text-[9px] sm:text-xs font-black uppercase ${i === 0 ? 'text-rose-500' : 'text-slate-500'}`}>
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* CALENDAR DAY CELLS */}
                  <div className="grid grid-cols-7 gap-0.5 sm:gap-1.5 min-w-[270px]">
                    {calendarGrid.map((item, idx) => {
                      if (!item) {
                        return <div key={`blank-${idx}`} className="h-9 sm:h-14 rounded-lg sm:rounded-xl bg-transparent" />;
                      }

                      const { day, isSunday, record } = item;
                      const isPresent = record?.status === 'present';
                      const isAbsent = record?.status === 'absent' || record?.status === 'leave';

                      let cellBg = 'bg-white border-slate-200/80 text-slate-700 hover:border-slate-300';
                      if (isPresent) {
                        cellBg = 'bg-emerald-50 border-emerald-200 text-emerald-950 shadow-2xs';
                      } else if (isAbsent) {
                        cellBg = 'bg-rose-50 border-rose-200 text-rose-950 shadow-2xs';
                      } else if (isSunday) {
                        cellBg = 'bg-slate-50/60 border-slate-100 text-slate-400';
                      }

                      return (
                        <div
                          key={item.dateString}
                          className={`h-9 sm:h-14 p-0.5 sm:p-1.5 rounded-lg sm:rounded-xl border transition-all duration-150 flex flex-col justify-between ${cellBg}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] sm:text-xs font-black ${isSunday ? 'text-rose-500' : 'text-slate-900'}`}>
                              {day}
                            </span>
                          </div>

                          {/* STATUS BADGE */}
                          {record ? (
                            <div className="mt-auto">
                              <span
                                className={`inline-flex items-center justify-center w-full px-0.5 py-0.5 rounded-md text-[8px] sm:text-[10px] font-black uppercase shadow-2xs ${
                                  isPresent ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                                }`}
                              >
                                <span className="sm:hidden">{isPresent ? 'P' : 'A'}</span>
                                <span className="hidden sm:inline">{isPresent ? 'PRESENT' : 'ABSENT'}</span>
                              </span>
                            </div>
                          ) : isSunday ? (
                            <span className="text-[7px] sm:text-[8px] font-bold text-slate-400 text-center mt-auto">Off</span>
                          ) : (
                            <span className="text-[7px] sm:text-[8px] text-slate-300 text-center mt-auto">-</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* LEGEND FOOTER */}
                  <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-md bg-emerald-600 inline-block"></span> Present
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-md bg-rose-600 inline-block"></span> Absent
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <span className="h-3 w-3 rounded-md bg-slate-100 border border-slate-200 inline-block"></span> Weekend / Unmarked
                    </span>
                  </div>
                </div>
              </div>
            ) : filteredHistory.length > 0 ? (
              viewMode === 'grid' ? (
                /* GRID CARDS VIEW */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
                  {filteredHistory.map((h) => {
                    const dObj = new Date(h.dateString);
                    const dayShort = isNaN(dObj.getTime())
                      ? ''
                      : dObj.toLocaleDateString('en-US', { weekday: 'short' });
                    const monthDay = isNaN(dObj.getTime())
                      ? h.dateString
                      : dObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

                    const isPresent = h.status === 'present';

                    const cardBg = isPresent
                      ? 'border-emerald-200/90 bg-emerald-50/40 text-emerald-950'
                      : 'border-rose-200/90 bg-rose-50/40 text-rose-950';

                    const badgeStyle = isPresent
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rose-600 text-white';

                    return (
                      <div
                        key={h._id || h.dateString}
                        className={`p-3 rounded-2xl border ${cardBg} shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between`}
                      >
                        <div className="flex items-center justify-between border-b border-slate-200/40 pb-1.5 mb-1.5">
                          <span className="text-xs font-black text-slate-800">{monthDay}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{dayShort}</span>
                        </div>

                        <div className="my-1 flex items-center justify-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase shadow-xs ${badgeStyle}`}>
                            {isPresent ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5" />
                            )}
                            <span>{isPresent ? 'PRESENT' : 'ABSENT'}</span>
                          </span>
                        </div>

                        <div className="mt-1.5 pt-1 border-t border-slate-200/40 text-[10px] text-slate-500 font-semibold truncate text-center">
                          By: {h.recordedBy}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* TABLE VIEW */
                <div className="rounded-2xl border border-slate-200 overflow-x-auto bg-white shadow-2xs">
                  <Table className="min-w-[500px] sm:min-w-full">
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-bold text-slate-800 text-xs py-2.5">Date</TableHead>
                        <TableHead className="font-bold text-slate-800 text-xs py-2.5">Day</TableHead>
                        <TableHead className="text-center font-bold text-slate-800 text-xs py-2.5">Status</TableHead>
                        <TableHead className="font-bold text-slate-800 text-xs py-2.5">Recorded By</TableHead>
                        <TableHead className="text-right font-bold text-slate-800 text-xs py-2.5">Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHistory.map((h) => {
                        const dObj = new Date(h.dateString);
                        const dayName = isNaN(dObj.getTime())
                          ? ''
                          : dObj.toLocaleDateString('en-US', { weekday: 'long' });

                        const isPresent = h.status === 'present';

                        return (
                          <TableRow key={h._id || h.dateString} className="hover:bg-slate-50/80 transition-colors">
                            <TableCell className="font-extrabold text-slate-900 text-xs sm:text-sm py-2">
                              {h.dateString}
                            </TableCell>
                            <TableCell className="font-bold text-slate-500 text-xs py-2">
                              {dayName}
                            </TableCell>
                            <TableCell className="text-center py-2">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase border ${
                                  isPresent
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                    : 'bg-rose-100 text-rose-800 border-rose-200'
                                }`}
                              >
                                <span>{isPresent ? 'PRESENT' : 'ABSENT'}</span>
                              </span>
                            </TableCell>
                            <TableCell className="text-slate-600 font-medium text-xs py-2">
                              {h.recordedBy}
                            </TableCell>
                            <TableCell className="text-right text-slate-500 font-medium text-xs py-2">
                              {h.remarks || '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )
            ) : (
              <div className="py-10 text-center text-slate-400 font-medium text-xs bg-white rounded-2xl border">
                No attendance records found
              </div>
            )}
          </ErpSection>
        </>
      ) : (
        <div className="py-10 text-center text-slate-400 font-medium text-xs bg-white rounded-2xl border">
          No attendance data available for this student
        </div>
      )}
    </PageStack>
  );
}
