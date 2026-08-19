import React, { useEffect, useState, useMemo, Fragment } from 'react';
import { toast } from 'sonner';
import {
  UserCheck,
  Plus,
  Calendar,
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Users,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  School,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  PieChart as PieChartIcon,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  User,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '@/lib/api';
import { PageHeader, ErpSection, FormField, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';

export default function AdminAttendance() {
  const [activeTab, setActiveTab] = useState('manage'); // 'manage' | 'mark' | 'reports'

  // Data States
  const [classes, setClasses] = useState([]);
  const [attenders, setAttenders] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [studentCountMap, setStudentCountMap] = useState({});
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleExpandUser = (userId) => {
    setExpandedUserId((prev) => (prev === userId ? null : userId));
  };

  // Attender Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [attenderForm, setAttenderForm] = useState({
    name: '',
    email: '',
    phoneNo: '',
    assignedClasses: [],
  });

  // Class Assignment Modal State
  const [classEditModalOpen, setClassEditModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [selectedClassesForTeacher, setSelectedClassesForTeacher] = useState([]);

  const openClassEditModal = (teacher) => {
    setEditingTeacher(teacher);
    const assigned = teacher.assignedClasses || [];
    const initialIds = assigned.length > 0
      ? assigned.map((c) => (typeof c === 'object' ? c._id : c))
      : classes.map((c) => c._id);
    setSelectedClassesForTeacher(initialIds);
    setClassEditModalOpen(true);
  };

  const openAddAttenderModal = () => {
    setAttenderForm({
      name: '',
      email: '',
      phoneNo: '',
      assignedClasses: classes.map((c) => c._id),
    });
    setCreateModalOpen(true);
  };

  const handleSaveTeacherClasses = async () => {
    if (!editingTeacher) return;
    setLoading(true);
    try {
      await api.patch(`/attendance/attenders/${editingTeacher._id}/permission`, {
        assignedClasses: selectedClassesForTeacher,
      });
      toast.success(`Assigned classes updated for ${editingTeacher.name || editingTeacher.teacherName}`);
      setClassEditModalOpen(false);
      setEditingTeacher(null);
      loadData();
    } catch (err) {
      toast.error('Failed to update assigned classes');
    } finally {
      setLoading(false);
    }
  };

  // Marking Attendance State
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Reports State
  const [reportClass, setReportClass] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [datePreset, setDatePreset] = useState('week'); // 'today', 'week', 'month', 'custom'
  const [reportViewMode, setReportViewMode] = useState('matrix'); // 'matrix', 'history'

  const applyDatePreset = (preset) => {
    setDatePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'week') {
      const d = new Date(today);
      d.setDate(d.getDate() - 6);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === '30days') {
      const d = new Date(today);
      d.setDate(d.getDate() - 29);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(todayStr);
    }
  };

  const buildMatrixData = () => {
    if (!reportData?.reports || reportData.reports.length === 0) return null;

    const datesSet = new Set();
    reportData.reports.forEach((rep) => {
      datesSet.add(rep.dateString);
    });
    const sortedDates = Array.from(datesSet).sort();

    const studentMap = new Map();
    reportData.reports.forEach((rep) => {
      if (rep.records) {
        rep.records.forEach((rec) => {
          const sId = String(rec.student?._id || rec.student);
          const sName = rec.student?.name || 'Student';
          const sRoll = rec.student?.rollNo || '';

          if (!studentMap.has(sId)) {
            studentMap.set(sId, {
              id: sId,
              name: sName,
              rollNo: sRoll,
              attendanceByDate: {},
            });
          }

          const stObj = studentMap.get(sId);
          stObj.attendanceByDate[rep.dateString] = rec.status;
        });
      }
    });

    const students = Array.from(studentMap.values()).sort((a, b) => {
      const numA = parseInt(a.rollNo, 10);
      const numB = parseInt(b.rollNo, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return String(a.rollNo || '').localeCompare(String(b.rollNo || ''), undefined, { numeric: true });
    });

    return { sortedDates, students };
  };

  // Student Analytics Tab State
  const [analyticsClassId, setAnalyticsClassId] = useState('');
  const [analyticsStudentId, setAnalyticsStudentId] = useState('');
  const [analyticsStudentsList, setAnalyticsStudentsList] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsSearchQuery, setAnalyticsSearchQuery] = useState('');
  const [analyticsViewMode, setAnalyticsViewMode] = useState('calendar'); // 'calendar' | 'grid' | 'table'
  const [analyticsCurrentMonth, setAnalyticsCurrentMonth] = useState(new Date());

  // Load Students for selected Class in Analytics tab
  useEffect(() => {
    if (!analyticsClassId) {
      setAnalyticsStudentsList([]);
      setAnalyticsStudentId('');
      setAnalyticsData(null);
      return;
    }

    const fetchClassStudents = async () => {
      try {
        const res = await api.get('/students', { params: { class: analyticsClassId } });
        const list = res.data.students || [];
        setAnalyticsStudentsList(list);
        if (list.length > 0) {
          setAnalyticsStudentId(list[0]._id);
        } else {
          setAnalyticsStudentId('');
          setAnalyticsData(null);
        }
      } catch (err) {
        toast.error('Failed to load students for class');
      }
    };
    fetchClassStudents();
  }, [analyticsClassId]);

  // Load Attendance Analytics for selected Student
  useEffect(() => {
    if (!analyticsStudentId) {
      setAnalyticsData(null);
      return;
    }

    const fetchStudentAnalytics = async () => {
      setAnalyticsLoading(true);
      try {
        const res = await api.get(`/parents/students/${analyticsStudentId}/attendance`);
        setAnalyticsData(res.data);
      } catch (err) {
        toast.error('Failed to fetch student attendance analytics');
        setAnalyticsData(null);
      } finally {
        setAnalyticsLoading(false);
      }
    };
    fetchStudentAnalytics();
  }, [analyticsStudentId]);

  // Map history records by dateString for instant calendar lookup
  const analyticsHistoryMap = useMemo(() => {
    const map = new Map();
    (analyticsData?.history || []).forEach((h) => {
      map.set(h.dateString, h);
    });
    return map;
  }, [analyticsData]);

  // Compute Day-wise Daily Attendance Trend for Selected Month
  const analyticsDailyTrendData = useMemo(() => {
    if (!analyticsData?.history || analyticsData.history.length === 0) return [];

    const year = analyticsCurrentMonth.getFullYear();
    const month = analyticsCurrentMonth.getMonth(); // 0-indexed
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const monthShort = analyticsCurrentMonth.toLocaleDateString('en-US', { month: 'short' });

    const data = [];
    let cumulativePresent = 0;
    let cumulativeTotal = 0;

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(day).padStart(2, '0');
      const dateString = `${year}-${mStr}-${dStr}`;

      const rec = analyticsHistoryMap.get(dateString);
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

    if (data.length === 0) {
      const reversed = [...analyticsData.history].reverse();
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
  }, [analyticsData, analyticsCurrentMonth, analyticsHistoryMap]);

  // Calendar Days Calculation for Current Selected Month in Admin Analytics
  const analyticsCalendarGrid = useMemo(() => {
    const year = analyticsCurrentMonth.getFullYear();
    const month = analyticsCurrentMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
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
        record: analyticsHistoryMap.get(dateString) || null,
      });
    }

    return days;
  }, [analyticsCurrentMonth, analyticsHistoryMap]);

  // Load Classes & Users
  const loadData = async () => {
    setLoading(true);
    try {
      const [classRes, userRes, studentRes] = await Promise.all([
        api.get('/classes'),
        api.get('/attendance/attenders'),
        api.get('/students'),
      ]);
      const clsList = classRes.data.classes || [];
      setClasses(clsList);
      setAttenders(userRes.data.attenders || []);
      setTeachers(userRes.data.teachers || []);

      const countMap = {};
      (studentRes.data.students || []).forEach((st) => {
        const cid = typeof st.class === 'object' ? st.class?._id : st.class;
        if (cid) {
          countMap[String(cid)] = (countMap[String(cid)] || 0) + 1;
        }
      });
      setStudentCountMap(countMap);

      if (clsList.length > 0) {
        setSelectedClass(clsList[0]._id);
        setAnalyticsClassId((prev) => prev || clsList[0]._id);
      }
    } catch (err) {
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const resolveAssignedClasses = (assignedList) => {
    if (!assignedList || assignedList.length === 0) {
      return classes; // All classes assigned
    }
    return assignedList.map((c) => {
      if (typeof c === 'object' && c._id) return c;
      return classes.find((cls) => String(cls._id) === String(c)) || { _id: c, className: String(c), section: '' };
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch Attendance Preview for Marking
  const loadPreview = async () => {
    if (!selectedClass) return;
    setPreviewLoading(true);
    try {
      const res = await api.get('/attendance/preview', {
        params: { classId: selectedClass, date: selectedDate },
      });
      const data = res.data;
      if (data?.records) {
        data.records.sort((a, b) => {
          const numA = parseInt(a.rollNo, 10);
          const numB = parseInt(b.rollNo, 10);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return String(a.rollNo || '').localeCompare(String(b.rollNo || ''), undefined, { numeric: true });
        });
      }
      setPreviewData(data);
    } catch (err) {
      toast.error('Failed to fetch class attendance list');
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'mark' && selectedClass) {
      loadPreview();
    }
  }, [activeTab, selectedClass, selectedDate]);

  // Handle Create Attender
  const handleCreateAttender = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/attendance/attenders', attenderForm);
      toast.success(res.data.message || 'Attender created & email sent!');
      setCreateModalOpen(false);
      setAttenderForm({ name: '', email: '', phoneNo: '', assignedClasses: [] });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create attender');
    } finally {
      setLoading(false);
    }
  };

  // Toggle Teacher Attendance Duty
  const handleTogglePermission = async (user, currentVal) => {
    try {
      await api.patch(`/attendance/attenders/${user._id}/permission`, {
        canTakeAttendance: !currentVal,
      });
      toast.success(`Attendance duty ${!currentVal ? 'assigned to' : 'removed from'} ${user.name}`);
      loadData();
    } catch (err) {
      toast.error('Failed to update attendance permission');
    }
  };

  // Toggle Student Status in Marking Mode (2-State Present <-> Absent)
  const toggleStudentStatus = (studentId, currentStatus) => {
    if (!previewData) return;
    const nextStatus = currentStatus === 'present' ? 'absent' : 'present';

    setPreviewData((prev) => {
      const updatedRecords = prev.records.map((r) =>
        r.studentId === studentId ? { ...r, status: nextStatus } : r
      );
      const totalPresent = updatedRecords.filter((r) => r.status === 'present').length;
      const totalAbsent = updatedRecords.filter((r) => r.status === 'absent').length;

      return {
        ...prev,
        records: updatedRecords,
        summary: {
          ...prev.summary,
          totalPresent,
          totalAbsent,
        },
      };
    });
  };

  // Mark All Present Shortcut
  const markAllPresent = () => {
    if (!previewData) return;
    setPreviewData((prev) => ({
      ...prev,
      records: prev.records.map((r) => ({ ...r, status: 'present' })),
      summary: {
        totalStudents: prev.records.length,
        totalPresent: prev.records.length,
        totalAbsent: 0,
      },
    }));
    toast.info('All students set to Present');
  };

  // Save Attendance
  const handleSaveAttendance = async () => {
    if (!previewData) return;
    setLoading(true);
    try {
      await api.post('/attendance/save', {
        classId: selectedClass,
        date: selectedDate,
        records: previewData.records,
      });
      toast.success('Attendance marked & saved successfully!');
      loadPreview();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save attendance');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Attendance Reports
  const loadReports = async () => {
    setReportLoading(true);
    try {
      const res = await api.get('/attendance/reports', {
        params: {
          classId: reportClass || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });
      setReportData(res.data);
    } catch (err) {
      toast.error('Failed to load attendance report');
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reports') {
      if (!startDate && !endDate) {
        applyDatePreset('week');
      }
      loadReports();
    }
  }, [activeTab, startDate, endDate, reportClass]);

  return (
    <PageStack className="pb-10">
      <PageHeader
        title="Attendance Management"
        description="Assign attendance duties, manage dedicated attenders, and view real-time class attendance analytics."
      />

      {/* TABS SEGMENTED HEADER (RESPONSIVE HORIZONTAL SCROLL ON MOBILE) */}
      <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/80 w-full sm:w-fit overflow-x-auto scrollbar-none shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab('manage')}
          className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-black rounded-xl transition-all shrink-0 ${
            activeTab === 'manage'
              ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 font-bold'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span>Attenders & Duty</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('mark')}
          className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-black rounded-xl transition-all shrink-0 ${
            activeTab === 'mark'
              ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 font-bold'
          }`}
        >
          <UserCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span>Mark Attendance</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-black rounded-xl transition-all shrink-0 ${
            activeTab === 'reports'
              ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 font-bold'
          }`}
        >
          <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span>Reports</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('student_analytics')}
          className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-black rounded-xl transition-all shrink-0 ${
            activeTab === 'student_analytics'
              ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 font-bold'
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600" />
          <span>Student Analytics</span>
        </button>
      </div>

      {/* TAB 1: MANAGING ATTENDERS & TEACHER DUTIES */}
      {activeTab === 'manage' && (
        <div className="space-y-6">
          <ErpSection
            title="Dedicated Attenders"
            icon={Users}
            tone="purple"
            action={
              <Button onClick={openAddAttenderModal} size="sm" className="gap-2 rounded-xl font-bold">
                <Plus className="h-4 w-4" />
                Add Attender User
              </Button>
            }
          >
            {attenders.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center font-medium">No dedicated attenders created yet. Click above to add one.</p>
            ) : (
              <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-xs">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold text-slate-800">Attender Name</TableHead>
                      <TableHead className="font-bold text-slate-800">Email</TableHead>
                      <TableHead className="font-bold text-slate-800">Mobile</TableHead>
                      <TableHead className="font-bold text-slate-800">Assigned Classes</TableHead>
                      <TableHead className="font-bold text-slate-800">Duty Status</TableHead>
                      <TableHead className="text-right font-bold text-slate-800">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attenders.map((att) => {
                      const isExpanded = expandedUserId === att._id;
                      const resolvedList = resolveAssignedClasses(att.assignedClasses);
                      const totalManagedStudents = resolvedList.reduce(
                        (acc, cls) => acc + (studentCountMap[String(cls._id)] || 0),
                        0
                      );

                      return (
                        <React.Fragment key={att._id}>
                          <TableRow className="hover:bg-slate-50/80 transition-colors">
                            <TableCell className="font-bold text-slate-900">{att.name}</TableCell>
                            <TableCell className="text-slate-600 font-medium">{att.email}</TableCell>
                            <TableCell className="text-slate-600 font-medium">{att.phoneNo || '-'}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {resolvedList.length > 3 ? (
                                  <>
                                    {resolvedList.slice(0, 3).map((c) => (
                                      <span key={c._id} className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-100/80">
                                        {c.className}-{c.section}
                                      </span>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={() => toggleExpandUser(att._id)}
                                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-extrabold text-xs transition-all cursor-pointer shadow-2xs ${
                                        isExpanded
                                          ? 'bg-purple-600 text-white shadow-xs'
                                          : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/80'
                                      }`}
                                    >
                                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                      {isExpanded ? 'Close' : `+${resolvedList.length - 3} More`}
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    {resolvedList.map((c) => (
                                      <span key={c._id} className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-100/80">
                                        Class {c.className}-{c.section}
                                      </span>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={() => toggleExpandUser(att._id)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 font-extrabold text-xs transition-all cursor-pointer ml-1"
                                    >
                                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                      {isExpanded ? 'Hide' : 'Students'}
                                    </button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-extrabold text-emerald-800 border border-emerald-200">
                                <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
                                Active Attender
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => openClassEditModal(att)}
                                className="text-xs font-bold text-indigo-700 hover:text-indigo-900 border-slate-200 rounded-xl"
                              >
                                Edit Classes
                              </Button>
                            </TableCell>
                          </TableRow>

                          {/* EXPANDABLE ACCORDION ROW FOR ATTENDER */}
                          {isExpanded && (
                            <TableRow className="bg-slate-50/90 border-b-2 border-indigo-100">
                              <TableCell colSpan={6} className="p-4 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-purple-50/30">
                                <div className="space-y-3 bg-white p-4 rounded-2xl border border-indigo-100 shadow-xs">
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                                    <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                                      <School className="h-4 w-4 text-indigo-600" />
                                      <span>Assigned Classes & Student Count Breakdown ({resolvedList.length} Classes)</span>
                                    </div>
                                    <div className="text-xs font-bold text-slate-600 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-100">
                                      Total Students Managed: <span className="font-black text-indigo-700 text-sm ml-1">{totalManagedStudents}</span>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-1">
                                    {resolvedList.map((clsObj) => {
                                      const count = studentCountMap[String(clsObj._id)] || 0;
                                      return (
                                        <div key={clsObj._id} className="rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white p-3 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between border-l-4 border-l-indigo-600">
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs font-black text-slate-900">Class {clsObj.className}-{clsObj.section}</span>
                                            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                                          </div>
                                          <div className="flex items-center justify-between text-xs font-extrabold text-indigo-700 mt-2.5">
                                            <span className="flex items-center gap-1.5">
                                              <Users className="h-3.5 w-3.5 text-indigo-500" />
                                              {count} Students
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </ErpSection>

          <ErpSection
            title="Teacher Attendance Duty Permissions"
            icon={ShieldCheck}
            tone="purple"
            action={
              <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search teacher by name, email..."
                  value={teacherSearchQuery}
                  onChange={(e) => setTeacherSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 h-8 text-xs rounded-xl border-slate-200 focus:ring-2 focus:ring-purple-500 bg-white"
                />
              </div>
            }
          >
            <p className="text-xs text-slate-500 mb-4 font-medium">
              Toggle Attendance Duty Permission for teachers. When enabled, teachers will see the <strong>Attendance tab</strong> in their portal sidebar.
            </p>
            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-xs">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-slate-800">Teacher Name</TableHead>
                    <TableHead className="font-bold text-slate-800">Email</TableHead>
                    <TableHead className="font-bold text-slate-800">Assigned Classes</TableHead>
                    <TableHead className="text-center font-bold text-slate-800">Duty Permission</TableHead>
                    <TableHead className="text-right font-bold text-slate-800">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                  <TableBody>
                    {teachers
                      .filter((t) => {
                        if (!teacherSearchQuery.trim()) return true;
                        const q = teacherSearchQuery.toLowerCase();
                        const name = (t.name || t.teacherName || '').toLowerCase();
                        const email = (t.email || '').toLowerCase();
                        const classesStr = (t.assignedClasses || [])
                          .map((c) => (typeof c === 'object' ? `${c.className}-${c.section}` : String(c)))
                          .join(' ')
                          .toLowerCase();
                        return name.includes(q) || email.includes(q) || classesStr.includes(q);
                      })
                      .map((t) => {
                      const isExpanded = expandedUserId === t._id;
                      const resolvedList = resolveAssignedClasses(t.assignedClasses);
                      const totalManagedStudents = resolvedList.reduce(
                        (acc, cls) => acc + (studentCountMap[String(cls._id)] || 0),
                        0
                      );

                      return (
                        <React.Fragment key={t._id}>
                          <TableRow className="hover:bg-slate-50/80 transition-colors">
                            <TableCell className="font-bold text-slate-900">{t.name || t.teacherName}</TableCell>
                            <TableCell className="text-slate-600 font-medium">{t.email}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {resolvedList.length > 3 ? (
                                  <>
                                    {resolvedList.slice(0, 3).map((c) => (
                                      <span key={c._id} className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-100/80">
                                        {c.className}-{c.section}
                                      </span>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={() => toggleExpandUser(t._id)}
                                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-extrabold text-xs transition-all cursor-pointer shadow-2xs ${
                                        isExpanded
                                          ? 'bg-purple-600 text-white shadow-xs'
                                          : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/80'
                                      }`}
                                    >
                                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                      {isExpanded ? 'Close' : `+${resolvedList.length - 3} More`}
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    {resolvedList.map((c) => (
                                      <span key={c._id} className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-100/80">
                                        Class {c.className}-{c.section}
                                      </span>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={() => toggleExpandUser(t._id)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 font-extrabold text-xs transition-all cursor-pointer ml-1"
                                    >
                                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                      {isExpanded ? 'Hide' : 'Students'}
                                    </button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Switch
                                  id={`perm-${t._id}`}
                                  checked={Boolean(t.canTakeAttendance)}
                                  onCheckedChange={() => handleTogglePermission(t, Boolean(t.canTakeAttendance))}
                                />
                                <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                                  t.canTakeAttendance ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                                }`}>
                                  {t.canTakeAttendance ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => openClassEditModal(t)}
                                className="text-xs font-bold text-indigo-700 hover:text-indigo-900 border-slate-200 rounded-xl"
                              >
                                Edit Classes
                              </Button>
                            </TableCell>
                          </TableRow>

                          {/* EXPANDABLE ACCORDION ROW FOR TEACHER */}
                          {isExpanded && (
                            <TableRow className="bg-slate-50/90 border-b-2 border-indigo-100">
                              <TableCell colSpan={6} className="p-4 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-purple-50/30">
                                <div className="space-y-3 bg-white p-4 rounded-2xl border border-indigo-100 shadow-xs">
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                                    <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                                      <School className="h-4 w-4 text-indigo-600" />
                                      <span>Assigned Classes & Student Count Breakdown ({resolvedList.length} Classes)</span>
                                    </div>
                                    <div className="text-xs font-bold text-slate-600 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-100">
                                      Total Students Managed: <span className="font-black text-indigo-700 text-sm ml-1">{totalManagedStudents}</span>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-1">
                                    {resolvedList.map((clsObj) => {
                                      const count = studentCountMap[String(clsObj._id)] || 0;
                                      return (
                                        <div key={clsObj._id} className="rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white p-3 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between border-l-4 border-l-indigo-600">
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs font-black text-slate-900">Class {clsObj.className}-{clsObj.section}</span>
                                            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                                          </div>
                                          <div className="flex items-center justify-between text-xs font-extrabold text-indigo-700 mt-2.5">
                                            <span className="flex items-center gap-1.5">
                                              <Users className="h-3.5 w-3.5 text-indigo-500" />
                                              {count} Students
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
              </Table>
            </div>
          </ErpSection>
        </div>
      )}

      {/* TAB 2: MARKING ATTENDANCE */}
      {activeTab === 'mark' && (
        <div className="space-y-6">
          <ErpSection title="Select Class & Date" icon={Calendar} tone="blue">
            <div className="grid gap-3 sm:grid-cols-12 items-end">
              <div className="sm:col-span-6">
                <FormField label="Class & Section">
                  <Select value={selectedClass} onValueChange={(val) => setSelectedClass(val)}>
                    <SelectTrigger className="rounded-xl border-slate-200 font-bold text-slate-900 bg-white">
                      <SelectValue placeholder="Select Class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c._id} value={c._id}>
                          Class {c.className} - {c.section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>

              <div className="sm:col-span-5">
                <FormField label="Date">
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="rounded-xl border-slate-200 font-semibold"
                  />
                </FormField>
              </div>

              <div className="sm:col-span-1 flex justify-end">
                <Button onClick={loadPreview} variant="outline" size="icon" title="Refresh Student List" className="h-[42px] w-[42px] rounded-xl border-slate-200">
                  <RefreshCw className="h-4 w-4 text-slate-600" />
                </Button>
              </div>
            </div>
          </ErpSection>

          {/* SUMMARY CARDS */}
          {previewData && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="text-xs text-slate-500 font-semibold">Total Students</div>
                <div className="text-xl font-bold text-slate-800">{previewData.summary?.totalStudents || 0}</div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 shadow-sm">
                <div className="text-xs text-emerald-700 font-semibold">Present</div>
                <div className="text-xl font-bold text-emerald-800">{previewData.summary?.totalPresent || 0}</div>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 shadow-sm">
                <div className="text-xs text-rose-700 font-semibold">Absent</div>
                <div className="text-xl font-bold text-rose-800">{previewData.summary?.totalAbsent || 0}</div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 shadow-sm">
                <div className="text-xs text-amber-700 font-semibold">Leave</div>
                <div className="text-xl font-bold text-amber-800">{previewData.summary?.totalLeave || 0}</div>
              </div>
            </div>
          )}

          {/* STUDENTS LIST TABLE */}
          {previewLoading ? (
            <div className="py-12 text-center text-slate-500">Loading student attendance list...</div>
          ) : previewData ? (
            <ErpSection title={`Student List (${previewData.records?.length || 0})`} icon={UserCheck} tone="purple">
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Roll No</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Father's Name</TableHead>
                      <TableHead className="text-center">Attendance Status (Tap to Toggle)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.records.map((st) => {
                      const isPresent = st.status === 'present';
                      return (
                        <TableRow key={st.studentId} className="hover:bg-slate-50/80 transition-colors">
                          <TableCell className="font-bold text-slate-700">{st.rollNo || '-'}</TableCell>
                          <TableCell className="font-semibold text-slate-900">{st.name}</TableCell>
                          <TableCell className="text-slate-500">{st.fatherName || '-'}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => toggleStudentStatus(st.studentId, st.status)}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 uppercase ${
                                  isPresent
                                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-600/30'
                                    : 'bg-rose-600 text-white ring-2 ring-rose-600/30'
                                }`}
                              >
                                {isPresent ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                                <span>{isPresent ? 'Present' : 'Absent'}</span>
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-6 flex justify-end">
                <Button onClick={handleSaveAttendance} variant="success" size="lg" disabled={loading} className="gap-2 px-8">
                  <CheckCircle2 className="h-5 w-5" />
                  Submit Attendance
                </Button>
              </div>
            </ErpSection>
          ) : (
            <div className="py-12 text-center text-slate-400">Select a class to mark attendance</div>
          )}
        </div>
      )}

      {/* TAB 3: ATTENDANCE REPORTS & MATRIX REGISTER */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <ErpSection title="Attendance Register & Analytics Filters" icon={Filter} tone="purple">
            <div className="space-y-4">
              {/* TOP ROW: QUICK DATE PRESETS & VIEW MODE SWITCHER */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">Quick Range:</span>
                  <Button
                    type="button"
                    variant={datePreset === 'today' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => applyDatePreset('today')}
                    className="h-7 px-3 text-xs font-bold rounded-lg"
                  >
                    Today
                  </Button>
                  <Button
                    type="button"
                    variant={datePreset === 'week' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => applyDatePreset('week')}
                    className="h-7 px-3 text-xs font-bold rounded-lg"
                  >
                    This Week
                  </Button>
                  <Button
                    type="button"
                    variant={datePreset === 'month' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => applyDatePreset('month')}
                    className="h-7 px-3 text-xs font-bold rounded-lg"
                  >
                    This Month
                  </Button>
                  <Button
                    type="button"
                    variant={datePreset === '30days' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => applyDatePreset('30days')}
                    className="h-7 px-3 text-xs font-bold rounded-lg"
                  >
                    Last 30 Days
                  </Button>
                  <Button
                    type="button"
                    variant={datePreset === 'custom' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDatePreset('custom')}
                    className="h-7 px-3 text-xs font-bold rounded-lg"
                  >
                    Custom Range
                  </Button>
                </div>

                {/* VIEW MODE TOGGLE BUTTONS */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setReportViewMode('matrix')}
                    className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all ${
                      reportViewMode === 'matrix'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    📊 Register Matrix
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportViewMode('history')}
                    className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all ${
                      reportViewMode === 'history'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    📜 Daily History Log
                  </button>
                </div>
              </div>

              {/* SECOND ROW: CLASS SELECTOR & DATE INPUTS */}
              <div className="grid gap-3 sm:grid-cols-12 items-end">
                <div className="sm:col-span-4">
                  <FormField label="Select Class">
                    <Select value={reportClass} onValueChange={(val) => setReportClass(val)}>
                      <SelectTrigger className="rounded-xl border-slate-200 font-bold text-slate-900 bg-white">
                        <SelectValue placeholder="-- Choose a Class --" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((c) => (
                          <SelectItem key={c._id} value={c._id}>
                            Class {c.className} - {c.section}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>

                <div className="sm:col-span-3">
                  <FormField label="Start Date">
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setDatePreset('custom');
                      }}
                      className="rounded-xl border-slate-200 font-semibold"
                    />
                  </FormField>
                </div>

                <div className="sm:col-span-3">
                  <FormField label="End Date">
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setDatePreset('custom');
                      }}
                      className="rounded-xl border-slate-200 font-semibold"
                    />
                  </FormField>
                </div>

                <div className="sm:col-span-2">
                  <Button onClick={loadReports} disabled={reportLoading || !reportClass} className="w-full gap-2 font-bold rounded-xl h-[42px]">
                    <Filter className="h-4 w-4" />
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          </ErpSection>

          {/* REPORT SUMMARY KPI CARDS (ULTRA COMPACT) */}
          {reportClass && reportData?.stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase">
                  <span>Days Marked</span>
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <div className="text-xl font-black text-slate-900 mt-1">{reportData.stats.totalDaysMarked}</div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-400" />
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between text-emerald-700 text-[11px] font-bold uppercase">
                  <span>Total Present</span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <div className="text-xl font-black text-emerald-800 mt-1">{reportData.stats.grandTotalPresent}</div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
              </div>

              <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between text-rose-700 text-[11px] font-bold uppercase">
                  <span>Total Absent</span>
                  <XCircle className="h-3.5 w-3.5 text-rose-600" />
                </div>
                <div className="text-xl font-black text-rose-800 mt-1">{reportData.stats.grandTotalAbsent}</div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500" />
              </div>

              <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between text-indigo-700 text-[11px] font-bold uppercase">
                  <span>Attendance Rate</span>
                  <Users className="h-3.5 w-3.5 text-indigo-600" />
                </div>
                <div className="text-xl font-black text-indigo-900 mt-1">{reportData.stats.overallPercentage}%</div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500" />
              </div>
            </div>
          )}

          {/* VIEW RENDERER */}
          {!reportClass ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-xs">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 shadow-xs mb-3">
                <School className="h-7 w-7" />
              </div>
              <h3 className="text-base font-black text-slate-900">Select a Class to View Register</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto font-medium">
                Choose a specific class from the dropdown above to load its complete student attendance matrix and monthly performance.
              </p>
            </div>
          ) : reportLoading ? (
            <div className="py-12 text-center text-slate-500 font-medium">Loading class attendance register...</div>
          ) : reportViewMode === 'matrix' ? (
            (() => {
              const matrix = buildMatrixData();
              const selectedClsObj = classes.find((c) => String(c._id) === String(reportClass));
              const classTitle = selectedClsObj ? `Class ${selectedClsObj.className} - ${selectedClsObj.section}` : 'Class';

              if (!matrix || matrix.students.length === 0) {
                return (
                  <div className="py-12 text-center text-slate-400 font-medium bg-white rounded-2xl border p-8">
                    No attendance records found for {classTitle} in the selected date range.
                  </div>
                );
              }

              return (
                <ErpSection title={`${classTitle} • Daily Attendance Register Matrix`} icon={Calendar} tone="emerald">
                  {/* COMPACT LEGEND HEADER BAR (NOT MARKED REMOVED) */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200 mb-2 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-500 uppercase text-[10px]">Legend:</span>
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-800 text-[11px]">
                        <span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-emerald-600 text-white text-[9px] font-black">P</span>
                        Present
                      </span>
                      <span className="inline-flex items-center gap-1 font-bold text-rose-800 text-[11px]">
                        <span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-rose-600 text-white text-[9px] font-black">A</span>
                        Absent
                      </span>
                    </div>

                    <div className="text-slate-500 font-semibold text-[11px]">
                      Showing <strong className="text-slate-800">{matrix.students.length} Students</strong> across <strong className="text-slate-800">{matrix.sortedDates.length} Days</strong>
                    </div>
                  </div>

                  {/* COMPACT MATRIX REGISTER TABLE */}
                  <div className="rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-xs">
                    <Table className="min-w-full text-xs">
                      <TableHeader className="bg-slate-100/80">
                        <TableRow>
                          {/* STICKY LEFT COLUMNS */}
                          <TableHead className="w-12 min-w-[48px] font-black text-slate-800 text-center sticky left-0 z-20 bg-slate-100 border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] py-1.5">
                            Roll
                          </TableHead>
                          <TableHead className="w-44 min-w-[176px] font-black text-slate-800 sticky left-[48px] z-20 bg-slate-100 border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] py-1.5">
                            Student Name
                          </TableHead>

                          {/* DATE COLUMNS */}
                          {matrix.sortedDates.map((dStr) => {
                            const dateObj = new Date(dStr);
                            const dayNum = dateObj.getDate();
                            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                            const monthShort = dateObj.toLocaleDateString('en-US', { month: 'short' });
                            return (
                              <TableHead key={dStr} className="text-center font-bold text-slate-700 px-1 min-w-[42px] py-1 border-r border-slate-200/60">
                                <div className="font-black text-slate-900 text-xs leading-none">{dayNum}</div>
                                <div className="text-[8px] text-slate-400 font-bold uppercase">{monthShort}</div>
                                <div className="text-[8px] text-indigo-600 font-bold uppercase">{dayName}</div>
                              </TableHead>
                            );
                          })}

                          {/* STICKY RIGHT SUMMARY COLUMNS */}
                          <TableHead className="text-center font-extrabold text-emerald-800 bg-emerald-100/60 min-w-[50px] border-l py-1.5">Present</TableHead>
                          <TableHead className="text-center font-extrabold text-rose-800 bg-rose-100/60 min-w-[50px] py-1.5">Absent</TableHead>
                          <TableHead className="text-center font-extrabold text-indigo-900 bg-indigo-100/60 min-w-[55px] py-1.5">%</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {matrix.students.map((st) => {
                          let pCount = 0;
                          let aCount = 0;

                          matrix.sortedDates.forEach((dStr) => {
                            const stt = st.attendanceByDate[dStr];
                            if (stt === 'present') pCount++;
                            if (stt === 'absent') aCount++;
                          });

                          const totalMarkedDays = pCount + aCount;
                          const stPct = totalMarkedDays > 0 ? Math.round((pCount / totalMarkedDays) * 100) : 0;
                          const pctBadgeClass =
                            stPct >= 80
                              ? 'text-emerald-800 bg-emerald-100'
                              : stPct >= 60
                              ? 'text-amber-800 bg-amber-100'
                              : 'text-rose-800 bg-rose-100';

                          return (
                            <TableRow key={st.id} className="hover:bg-indigo-50/20 transition-colors">
                              {/* STICKY LEFT ROLL & NAME */}
                              <TableCell className="font-black text-slate-700 text-center sticky left-0 z-10 bg-white border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] py-1">
                                {st.rollNo || '-'}
                              </TableCell>
                              <TableCell className="font-bold text-slate-900 truncate max-w-[160px] sticky left-[48px] z-10 bg-white border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] py-1 text-xs">
                                {st.name}
                              </TableCell>

                              {/* DAILY STATUS CELLS */}
                              {matrix.sortedDates.map((dStr) => {
                                const status = st.attendanceByDate[dStr];
                                return (
                                  <TableCell key={dStr} className="text-center p-0.5 border-r border-slate-100">
                                    {status === 'present' ? (
                                      <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-white font-black text-[10px] shadow-2xs" title={`${st.name} • Present on ${dStr}`}>
                                        P
                                      </span>
                                    ) : status === 'absent' ? (
                                      <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-rose-600 text-white font-black text-[10px] shadow-2xs" title={`${st.name} • Absent on ${dStr}`}>
                                        A
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 font-bold text-[10px]">-</span>
                                    )}
                                  </TableCell>
                                );
                              })}

                              {/* RIGHT SUMMARY VALUES */}
                              <TableCell className="text-center font-black text-emerald-700 bg-emerald-50/30 border-l">
                                {pCount}
                              </TableCell>
                              <TableCell className="text-center font-black text-rose-700 bg-rose-50/30">
                                {aCount}
                              </TableCell>
                              <TableCell className="text-center p-1.5">
                                <span className={`inline-block w-full py-0.5 rounded-md font-black text-xs ${pctBadgeClass}`}>
                                  {stPct}%
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </ErpSection>
              );
            })()
          ) : (
            /* DAILY HISTORY LOG VIEW */
            reportData?.reports?.length > 0 ? (
              <ErpSection title="Marked Attendance History Log" icon={Calendar} tone="emerald">
                <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-bold">Date</TableHead>
                        <TableHead className="font-bold">Class</TableHead>
                        <TableHead className="font-bold">Marked By</TableHead>
                        <TableHead className="text-center font-bold">Total Students</TableHead>
                        <TableHead className="text-center font-bold text-emerald-700">Present</TableHead>
                        <TableHead className="text-center font-bold text-rose-700">Absent</TableHead>
                        <TableHead className="text-right font-bold">Attendance %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.reports.map((rep) => {
                        const pct = rep.totalStudents > 0 ? Math.round((rep.totalPresent / rep.totalStudents) * 100) : 0;
                        return (
                          <TableRow key={rep._id} className="hover:bg-slate-50 transition-colors">
                            <TableCell className="font-bold text-slate-800">{rep.dateString}</TableCell>
                            <TableCell className="font-semibold text-slate-700">
                              {rep.class ? `${rep.class.className} - ${rep.class.section}` : '-'}
                            </TableCell>
                            <TableCell className="text-slate-600 font-medium">
                              {rep.recordedBy ? (rep.recordedBy.name || rep.recordedBy.teacherName) : 'Admin'}
                            </TableCell>
                            <TableCell className="text-center font-semibold">{rep.totalStudents}</TableCell>
                            <TableCell className="text-center font-bold text-emerald-700">{rep.totalPresent}</TableCell>
                            <TableCell className="text-center font-bold text-rose-700">{rep.totalAbsent}</TableCell>
                            <TableCell className="text-right font-bold text-indigo-700">{pct}%</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </ErpSection>
            ) : (
              <div className="py-12 text-center text-slate-400 font-medium bg-white rounded-2xl border">No attendance reports found for selected class</div>
            )
          )}
        </div>
      )}

      {/* TAB 4: INDIVIDUAL STUDENT ATTENDANCE ANALYTICS */}
      {activeTab === 'student_analytics' && (
        <div className="space-y-4">
          {/* SELECTION BAR: CLASS SELECTOR + STUDENT SELECTOR */}
          <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-indigo-600 shrink-0" />
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                  Student Analytics Selection
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Select a class and student to view detailed attendance history & charts
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full sm:w-auto">
              {/* CLASS SELECTOR */}
              <div className="w-full sm:w-48">
                <Select value={analyticsClassId} onValueChange={setAnalyticsClassId}>
                  <SelectTrigger className="w-full h-9 text-xs sm:text-sm font-extrabold rounded-xl border-slate-200 bg-slate-50/70 focus:ring-2 focus:ring-indigo-500">
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl max-h-60">
                    {classes.map((cls) => (
                      <SelectItem key={cls._id} value={cls._id} className="text-xs sm:text-sm font-bold">
                        Class {cls.className}-{cls.section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* STUDENT SELECTOR */}
              <div className="w-full sm:w-64">
                <Select
                  value={analyticsStudentId}
                  onValueChange={setAnalyticsStudentId}
                  disabled={analyticsStudentsList.length === 0}
                >
                  <SelectTrigger className="w-full h-9 text-xs sm:text-sm font-extrabold rounded-xl border-slate-200 bg-slate-50/70 focus:ring-2 focus:ring-indigo-500">
                    <SelectValue placeholder={analyticsStudentsList.length > 0 ? "Select Student" : "No students"} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl max-h-60">
                    {analyticsStudentsList.map((st) => (
                      <SelectItem key={st._id} value={st._id} className="text-xs sm:text-sm font-bold">
                        {st.name} {st.rollNo ? `(Roll: ${st.rollNo})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ANALYTICS CONTENT AREA */}
          {analyticsLoading ? (
            <div className="py-12 text-center text-slate-400 font-bold flex items-center justify-center gap-2 text-xs">
              <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
              Fetching student attendance analytics...
            </div>
          ) : analyticsData ? (
            (() => {
              const pct = analyticsData?.stats?.attendancePercentage || 0;
              const stats = analyticsData?.stats || { totalDaysMarked: 0, totalPresent: 0, totalAbsent: 0 };
              const strokeDasharray = 2 * Math.PI * 38;
              const strokeDashoffset = strokeDasharray - (strokeDasharray * pct) / 100;
              const monthName = analyticsCurrentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

              const prevMonth = () => {
                setAnalyticsCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
              };
              const nextMonth = () => {
                setAnalyticsCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
              };

              const filteredHistory = (analyticsData?.history || []).filter((h) => {
                if (!analyticsSearchQuery.trim()) return true;
                const q = analyticsSearchQuery.toLowerCase();
                return (
                  h.dateString.toLowerCase().includes(q) ||
                  h.status.toLowerCase().includes(q) ||
                  (h.remarks || '').toLowerCase().includes(q)
                );
              });

              return (
                <div className="space-y-4">
                  {/* VISUAL HERO ROW: CIRCULAR GRAPH + DAY-WISE TREND CHART */}
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

                    {/* DAY-WISE TREND CHART */}
                    <div className="lg:col-span-2 p-3.5 sm:p-4.5 rounded-2xl border border-slate-200/90 bg-white shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-1.5">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                          <TrendingUp className="h-4 w-4 text-indigo-600" />
                          Attendance Trend ({monthName})
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">Daily % Trend</span>
                      </div>

                      {analyticsDailyTrendData.length > 0 ? (
                        <div className="w-full h-[150px] sm:h-[170px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analyticsDailyTrendData} margin={{ top: 8, right: 10, left: -22, bottom: 0 }}>
                              <defs>
                                <linearGradient id="adminAttendanceGradient" x1="0" y1="0" x2="0" y2="1">
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
                              <RechartsTooltip
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
                                fill="url(#adminAttendanceGradient)"
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
                            onClick={() => setAnalyticsViewMode('calendar')}
                            className={`px-2 py-1 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1 ${
                              analyticsViewMode === 'calendar'
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
                            onClick={() => setAnalyticsViewMode('grid')}
                            className={`px-2 py-1 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1 ${
                              analyticsViewMode === 'grid'
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
                            onClick={() => setAnalyticsViewMode('table')}
                            className={`px-2 py-1 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1 ${
                              analyticsViewMode === 'table'
                                ? 'bg-white text-emerald-700 shadow-2xs'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                            title="Table View"
                          >
                            <List className="h-3.5 w-3.5" />
                            <span>Table</span>
                          </button>
                        </div>

                        {analyticsViewMode !== 'calendar' && (
                          <div className="relative w-32 sm:w-44">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                            <Input
                              type="text"
                              placeholder="Search date..."
                              value={analyticsSearchQuery}
                              onChange={(e) => setAnalyticsSearchQuery(e.target.value)}
                              className="pl-7 pr-2.5 py-1 h-8 text-xs rounded-xl border-slate-200 focus:ring-2 focus:ring-emerald-500 bg-white"
                            />
                          </div>
                        )}
                      </div>
                    }
                  >
                    {analyticsViewMode === 'calendar' ? (
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
                            {analyticsCalendarGrid.map((item, idx) => {
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
                      analyticsViewMode === 'grid' ? (
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
                </div>
              );
            })()
          ) : (
            <div className="py-12 text-center text-slate-400 font-medium bg-white rounded-2xl border">
              Select a class and student above to view attendance report
            </div>
          )}
        </div>
      )}

      {/* MODAL: CREATE NEW ATTENDER */}
      {createModalOpen && (
        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl border-none">
            <DialogHeader className="p-4 sm:p-5 border-b border-slate-100 bg-white sticky top-0 z-10 shrink-0">
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-extrabold text-slate-900">
                <UserCheck className="h-5 w-5 text-emerald-600" />
                Add Attender User
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateAttender} className="flex flex-col min-h-0 flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
                <FormField label="Full Name" required>
                  <Input
                    placeholder="e.g. Ramesh Kumar"
                    value={attenderForm.name}
                    onChange={(e) => setAttenderForm((s) => ({ ...s, name: e.target.value }))}
                    required
                    className="rounded-xl border-slate-200 text-xs sm:text-sm font-semibold"
                  />
                </FormField>
                <FormField label="Email Address (Credentials will be sent here)" required>
                  <Input
                    type="email"
                    placeholder="attender@school.com"
                    value={attenderForm.email}
                    onChange={(e) => setAttenderForm((s) => ({ ...s, email: e.target.value }))}
                    required
                    className="rounded-xl border-slate-200 text-xs sm:text-sm font-semibold"
                  />
                </FormField>
                <FormField label="Mobile Number">
                  <Input
                    placeholder="9876543210"
                    value={attenderForm.phoneNo}
                    onChange={(e) => setAttenderForm((s) => ({ ...s, phoneNo: e.target.value }))}
                    className="rounded-xl border-slate-200 text-xs sm:text-sm font-semibold"
                  />
                </FormField>

                {/* Class Selection for New Attender */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">Assign Classes (All Selected by Default)</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAttenderForm((s) => ({ ...s, assignedClasses: classes.map((c) => c._id) }))}
                        className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={() => setAttenderForm((s) => ({ ...s, assignedClasses: [] }))}
                        className="text-xs font-bold text-slate-500 hover:underline cursor-pointer"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-44 overflow-y-auto p-2 border border-slate-200/90 rounded-2xl bg-slate-50/70">
                    {classes.map((cls) => {
                      const isChecked = attenderForm.assignedClasses.includes(cls._id);
                      return (
                        <label
                          key={cls._id}
                          className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                            isChecked
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-950 shadow-2xs'
                              : 'border-slate-200/90 bg-white text-slate-700 hover:bg-slate-100/70'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAttenderForm((s) => ({ ...s, assignedClasses: [...s.assignedClasses, cls._id] }));
                              } else {
                                setAttenderForm((s) => ({ ...s, assignedClasses: s.assignedClasses.filter((id) => id !== cls._id) }));
                              }
                            }}
                            className="rounded text-emerald-600 focus:ring-0"
                          />
                          <span>{cls.className}-{cls.section}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50/80 sticky bottom-0 z-10 shrink-0 gap-2 flex items-center justify-end">
                <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" variant="success" disabled={loading} className="rounded-xl font-bold">
                  {loading ? 'Creating...' : 'Create & Send Email'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL: EDIT ASSIGNED CLASSES */}
      {classEditModalOpen && (
        <Dialog open={classEditModalOpen} onOpenChange={setClassEditModalOpen}>
          <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl border-none">
            <DialogHeader className="p-4 sm:p-5 border-b border-slate-100 bg-white sticky top-0 z-10 shrink-0">
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-extrabold text-slate-900">
                <Users className="h-5 w-5 text-indigo-600" />
                Assign Classes for {editingTeacher?.name || editingTeacher?.teacherName}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 font-medium">
                    Select allowed classes for marking attendance:
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedClassesForTeacher(classes.map((c) => c._id))}
                      className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedClassesForTeacher([])}
                      className="text-xs font-bold text-slate-500 hover:underline cursor-pointer"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto p-2 border border-slate-200/90 rounded-2xl bg-slate-50/70">
                  {classes.map((cls) => {
                    const isChecked = selectedClassesForTeacher.includes(cls._id);
                    return (
                      <label
                        key={cls._id}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                          isChecked
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-950 shadow-2xs'
                            : 'border-slate-200/90 bg-white text-slate-700 hover:bg-slate-100/70'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedClassesForTeacher((prev) => [...prev, cls._id]);
                            } else {
                              setSelectedClassesForTeacher((prev) => prev.filter((id) => id !== cls._id));
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-0"
                        />
                        <span>{cls.className}-{cls.section}</span>
                      </label>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span>Selected: {selectedClassesForTeacher.length} class(es)</span>
                  <button
                    type="button"
                    onClick={() => setSelectedClassesForTeacher(classes.map((c) => c._id))}
                    className="text-indigo-600 font-semibold hover:underline cursor-pointer"
                  >
                    Select All Classes
                  </button>
                </div>
              </div>

              <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50/80 sticky bottom-0 z-10 shrink-0 gap-2 flex items-center justify-end">
                <Button type="button" variant="outline" onClick={() => setClassEditModalOpen(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button type="button" variant="success" onClick={handleSaveTeacherClasses} disabled={loading} className="rounded-xl font-bold">
                  {loading ? 'Saving...' : 'Save Assigned Classes'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </PageStack>
  );
}
