import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  UserCheck,
  Plus,
  Calendar,
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
} from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErpSection, FormField, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';

export default function AdminAttendance() {
  const [activeTab, setActiveTab] = useState('manage'); // 'manage' | 'mark' | 'reports'

  // Data States
  const [classes, setClasses] = useState([]);
  const [attenders, setAttenders] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);

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

  // Load Classes & Users
  const loadData = async () => {
    setLoading(true);
    try {
      const [classRes, userRes] = await Promise.all([
        api.get('/classes'),
        api.get('/attendance/attenders'),
      ]);
      setClasses(classRes.data.classes || []);
      setAttenders(userRes.data.attenders || []);
      setTeachers(userRes.data.teachers || []);

      if (classRes.data.classes?.length > 0) {
        setSelectedClass(classRes.data.classes[0]._id);
      }
    } catch (err) {
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
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

      {/* TABS SEGMENTED HEADER (MATCHES SYSTEM THEME) */}
      <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/80 w-fit shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab('manage')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl transition-all ${
            activeTab === 'manage'
              ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 font-bold'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          Attenders & Permissions
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('mark')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl transition-all ${
            activeTab === 'mark'
              ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 font-bold'
          }`}
        >
          <UserCheck className="h-4 w-4" />
          Mark Attendance
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl transition-all ${
            activeTab === 'reports'
              ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 font-bold'
          }`}
        >
          <Calendar className="h-4 w-4" />
          Attendance Reports
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
                    {attenders.map((att) => (
                      <TableRow key={att._id} className="hover:bg-slate-50/80 transition-colors">
                        <TableCell className="font-bold text-slate-900">{att.name}</TableCell>
                        <TableCell className="text-slate-600 font-medium">{att.email}</TableCell>
                        <TableCell className="text-slate-600 font-medium">{att.phoneNo || '-'}</TableCell>
                        <TableCell>
                          {att.assignedClasses?.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[280px]">
                              {att.assignedClasses.slice(0, 4).map((c) => (
                                <span key={typeof c === 'object' ? c._id : c} className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-100">
                                  {typeof c === 'object' ? `${c.className}-${c.section}` : c}
                                </span>
                              ))}
                              {att.assignedClasses.length > 4 && (
                                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-600">
                                  +{att.assignedClasses.length - 4} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 font-semibold">All Classes</span>
                          )}
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
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </ErpSection>

          <ErpSection title="Teacher Attendance Duty Permissions" icon={ShieldCheck} tone="purple">
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
                  {teachers.map((t) => (
                    <TableRow key={t._id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="font-bold text-slate-900">{t.name || t.teacherName}</TableCell>
                      <TableCell className="text-slate-600 font-medium">{t.email}</TableCell>
                      <TableCell>
                        {t.assignedClasses?.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[280px]">
                            {t.assignedClasses.slice(0, 4).map((c) => (
                              <span key={typeof c === 'object' ? c._id : c} className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-100">
                                {typeof c === 'object' ? `${c.className}-${c.section}` : c}
                              </span>
                            ))}
                            {t.assignedClasses.length > 4 && (
                              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-600">
                                +{t.assignedClasses.length - 4} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-semibold">All Classes</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            id={`perm-${t._id}`}
                            checked={Boolean(t.canTakeAttendance)}
                            onCheckedChange={() => handleTogglePermission(t, Boolean(t.canTakeAttendance))}
                          />
                          <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
                            t.canTakeAttendance ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
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
                  ))}
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
            <div className="grid gap-4 sm:grid-cols-3 items-end">
              <FormField label="Class & Section">
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                >
                  {classes.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.className} - {c.section}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Date">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </FormField>

              <div className="flex gap-2">
                <Button onClick={markAllPresent} variant="outline" className="w-full text-xs font-bold text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100">
                  Mark All Present
                </Button>
                <Button onClick={loadPreview} variant="ghost" size="icon" title="Refresh">
                  <RefreshCw className="h-4 w-4" />
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
                    <select
                      value={reportClass}
                      onChange={(e) => setReportClass(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-purple-500 bg-white"
                    >
                      <option value="">-- Choose a Class --</option>
                      {classes.map((c) => (
                        <option key={c._id} value={c._id}>
                          Class {c.className} - {c.section}
                        </option>
                      ))}
                    </select>
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

      {/* MODAL: CREATE NEW ATTENDER */}
      {createModalOpen && (
        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-600" />
                Add Attender User
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateAttender} className="space-y-4 py-2">
              <FormField label="Full Name" required>
                <Input
                  placeholder="e.g. Ramesh Kumar"
                  value={attenderForm.name}
                  onChange={(e) => setAttenderForm((s) => ({ ...s, name: e.target.value }))}
                  required
                />
              </FormField>
              <FormField label="Email Address (Credentials will be sent here)" required>
                <Input
                  type="email"
                  placeholder="attender@school.com"
                  value={attenderForm.email}
                  onChange={(e) => setAttenderForm((s) => ({ ...s, email: e.target.value }))}
                  required
                />
              </FormField>
              <FormField label="Mobile Number">
                <Input
                  placeholder="9876543210"
                  value={attenderForm.phoneNo}
                  onChange={(e) => setAttenderForm((s) => ({ ...s, phoneNo: e.target.value }))}
                />
              </FormField>

              {/* Class Selection for New Attender */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Assign Classes (All Selected by Default)</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAttenderForm((s) => ({ ...s, assignedClasses: classes.map((c) => c._id) }))}
                      className="text-xs font-bold text-emerald-600 hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setAttenderForm((s) => ({ ...s, assignedClasses: [] }))}
                      className="text-xs font-bold text-slate-500 hover:underline"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto p-2 border rounded-xl bg-slate-50">
                  {classes.map((cls) => {
                    const isChecked = attenderForm.assignedClasses.includes(cls._id);
                    return (
                      <label
                        key={cls._id}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                          isChecked
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                            : 'border-slate-200 bg-white text-slate-700'
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
                          className="rounded text-emerald-600"
                        />
                        <span>{cls.className} - {cls.section}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <DialogFooter className="gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="success" disabled={loading}>
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                Assign Classes for {editingTeacher?.name || editingTeacher?.teacherName}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Select allowed classes for marking attendance:
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedClassesForTeacher(classes.map((c) => c._id))}
                    className="text-xs font-bold text-indigo-600 hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => setSelectedClassesForTeacher([])}
                    className="text-xs font-bold text-slate-500 hover:underline"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 border rounded-xl bg-slate-50">
                {classes.map((cls) => {
                  const isChecked = selectedClassesForTeacher.includes(cls._id);
                  return (
                    <label
                      key={cls._id}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
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
                        className="rounded text-indigo-600"
                      />
                      <span>{cls.className} - {cls.section}</span>
                    </label>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>Selected: {selectedClassesForTeacher.length} class(es)</span>
                <button
                  type="button"
                  onClick={() => setSelectedClassesForTeacher(classes.map((c) => c._id))}
                  className="text-indigo-600 font-semibold hover:underline"
                >
                  Select All Classes
                </button>
              </div>

              <DialogFooter className="gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setClassEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" variant="success" onClick={handleSaveTeacherClasses} disabled={loading}>
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
