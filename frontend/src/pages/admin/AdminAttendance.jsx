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
      setPreviewData(res.data);
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

  // Toggle Student Status in Marking Mode
  const toggleStudentStatus = (studentId, currentStatus) => {
    if (!previewData) return;
    const nextMap = { present: 'absent', absent: 'leave', leave: 'present' };
    const nextStatus = nextMap[currentStatus] || 'present';

    setPreviewData((prev) => {
      const updatedRecords = prev.records.map((r) =>
        r.studentId === studentId ? { ...r, status: nextStatus } : r
      );
      const totalPresent = updatedRecords.filter((r) => r.status === 'present').length;
      const totalAbsent = updatedRecords.filter((r) => r.status === 'absent').length;
      const totalLeave = updatedRecords.filter((r) => r.status === 'leave').length;

      return {
        ...prev,
        records: updatedRecords,
        summary: {
          ...prev.summary,
          totalPresent,
          totalAbsent,
          totalLeave,
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
        totalLeave: 0,
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
      loadReports();
    }
  }, [activeTab]);

  return (
    <PageStack className="pb-10">
      <PageHeader
        title="Attendance Management"
        description="Assign attendance duties, manage dedicated attenders, and view real-time class attendance analytics."
      />

      {/* TABS HEADER */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <Button
          variant={activeTab === 'manage' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('manage')}
          className="gap-2"
        >
          <ShieldCheck className="h-4 w-4" />
          Attenders & Permissions
        </Button>
        <Button
          variant={activeTab === 'mark' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('mark')}
          className="gap-2"
        >
          <UserCheck className="h-4 w-4" />
          Mark Attendance
        </Button>
        <Button
          variant={activeTab === 'reports' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('reports')}
          className="gap-2"
        >
          <Calendar className="h-4 w-4" />
          Attendance Reports
        </Button>
      </div>

      {/* TAB 1: MANAGING ATTENDERS & TEACHER DUTIES */}
      {activeTab === 'manage' && (
        <div className="space-y-6">
          <ErpSection
            title="Dedicated Attenders"
            icon={Users}
            tone="emerald"
            action={
              <Button onClick={openAddAttenderModal} size="sm" variant="success" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Attender User
              </Button>
            }
          >
            {attenders.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">No dedicated attenders created yet. Click above to add one.</p>
            ) : (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Attender Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Assigned Classes</TableHead>
                      <TableHead>Duty Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attenders.map((att) => (
                      <TableRow key={att._id}>
                        <TableCell className="font-bold text-slate-800">{att.name}</TableCell>
                        <TableCell className="text-slate-600">{att.email}</TableCell>
                        <TableCell className="text-slate-600">{att.phoneNo || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-between gap-2">
                            {att.assignedClasses?.length > 0 ? (
                              <span className="inline-flex flex-wrap gap-1">
                                {att.assignedClasses.map((c) => (
                                  <span key={typeof c === 'object' ? c._id : c} className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                    {typeof c === 'object' ? `${c.className} - ${c.section}` : c}
                                  </span>
                                ))}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">All Classes</span>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => openClassEditModal(att)}
                              className="text-xs text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 font-bold shrink-0 ml-auto"
                            >
                              Edit Classes
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                            Active Attender
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </ErpSection>

          <ErpSection title="Teacher Attendance Duty Permissions" icon={ShieldCheck} tone="purple">
            <p className="text-xs text-slate-500 mb-4">
              Toggle Attendance Permission for teachers. When enabled, the teacher will see the <strong>Attendance tab</strong> in their sidebar.
            </p>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Assigned Classes</TableHead>
                    <TableHead className="text-right">Attendance Duty Access</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.map((t) => (
                    <TableRow key={t._id}>
                      <TableCell className="font-bold text-slate-800">{t.name || t.teacherName}</TableCell>
                      <TableCell className="text-slate-600">{t.email}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-between gap-2">
                          {t.assignedClasses?.length > 0 ? (
                            <span className="inline-flex flex-wrap gap-1">
                              {t.assignedClasses.map((c) => (
                                <span key={typeof c === 'object' ? c._id : c} className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                                  {typeof c === 'object' ? `${c.className} - ${c.section}` : c}
                                </span>
                              ))}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">All Classes</span>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openClassEditModal(t)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 font-bold shrink-0 ml-auto"
                          >
                            Edit Classes
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Switch
                            id={`perm-${t._id}`}
                            checked={Boolean(t.canTakeAttendance)}
                            onCheckedChange={() => handleTogglePermission(t, Boolean(t.canTakeAttendance))}
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant={t.canTakeAttendance ? "danger" : "success"}
                            onClick={() => handleTogglePermission(t, Boolean(t.canTakeAttendance))}
                            className="text-xs font-bold px-3 py-1 h-8"
                          >
                            {t.canTakeAttendance ? "Disable Access" : "Enable Duty"}
                          </Button>
                        </div>
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
                    {previewData.records.map((st) => (
                      <TableRow key={st.studentId} className="hover:bg-slate-50/80 transition-colors">
                        <TableCell className="font-bold text-slate-700">{st.rollNo || '-'}</TableCell>
                        <TableCell className="font-semibold text-slate-900">{st.name}</TableCell>
                        <TableCell className="text-slate-500">{st.fatherName || '-'}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => toggleStudentStatus(st.studentId, st.status)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                                st.status === 'present'
                                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-600/30'
                                  : st.status === 'absent'
                                  ? 'bg-rose-600 text-white ring-2 ring-rose-600/30'
                                  : 'bg-amber-500 text-white ring-2 ring-amber-500/30'
                              }`}
                            >
                              {st.status === 'present' && <CheckCircle2 className="h-3.5 w-3.5" />}
                              {st.status === 'absent' && <XCircle className="h-3.5 w-3.5" />}
                              {st.status === 'leave' && <Clock className="h-3.5 w-3.5" />}
                              <span className="uppercase">{st.status}</span>
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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

      {/* TAB 3: ATTENDANCE REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <ErpSection title="Filter Attendance Reports" icon={Filter} tone="purple">
            <div className="grid gap-4 sm:grid-cols-3 items-end">
              <FormField label="Filter by Class">
                <select
                  value={reportClass}
                  onChange={(e) => setReportClass(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Classes</option>
                  {classes.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.className} - {c.section}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Start Date">
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </FormField>

              <FormField label="End Date">
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </FormField>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={loadReports} disabled={reportLoading} className="gap-2">
                Apply Filters
              </Button>
            </div>
          </ErpSection>

          {/* REPORT SUMMARY STATS */}
          {reportData?.stats && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                <div className="text-xs text-slate-500 font-semibold">Days Marked</div>
                <div className="text-xl font-bold text-slate-900">{reportData.stats.totalDaysMarked}</div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 shadow-sm">
                <div className="text-xs text-emerald-700 font-semibold">Total Present</div>
                <div className="text-xl font-bold text-emerald-800">{reportData.stats.grandTotalPresent}</div>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 shadow-sm">
                <div className="text-xs text-rose-700 font-semibold">Total Absent</div>
                <div className="text-xl font-bold text-rose-800">{reportData.stats.grandTotalAbsent}</div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 shadow-sm">
                <div className="text-xs text-amber-700 font-semibold">Total Leave</div>
                <div className="text-xl font-bold text-amber-800">{reportData.stats.grandTotalLeave}</div>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3.5 shadow-sm col-span-2 sm:col-span-1">
                <div className="text-xs text-indigo-700 font-semibold">Overall Attendance %</div>
                <div className="text-xl font-bold text-indigo-900">{reportData.stats.overallPercentage}%</div>
              </div>
            </div>
          )}

          {/* REPORT TABLE */}
          {reportLoading ? (
            <div className="py-12 text-center text-slate-500">Loading attendance reports...</div>
          ) : reportData?.reports?.length > 0 ? (
            <ErpSection title="Marked Attendance History" icon={Calendar} tone="emerald">
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Marked By</TableHead>
                      <TableHead className="text-center">Total Students</TableHead>
                      <TableHead className="text-center text-emerald-700">Present</TableHead>
                      <TableHead className="text-center text-rose-700">Absent</TableHead>
                      <TableHead className="text-center text-amber-700">Leave</TableHead>
                      <TableHead className="text-right">Attendance %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.reports.map((rep) => {
                      const pct = rep.totalStudents > 0 ? Math.round((rep.totalPresent / rep.totalStudents) * 100) : 0;
                      return (
                        <TableRow key={rep._id}>
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
                          <TableCell className="text-center font-bold text-amber-700">{rep.totalLeave}</TableCell>
                          <TableCell className="text-right font-bold text-indigo-700">{pct}%</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </ErpSection>
          ) : (
            <div className="py-12 text-center text-slate-400">No attendance reports found for selected filters</div>
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
