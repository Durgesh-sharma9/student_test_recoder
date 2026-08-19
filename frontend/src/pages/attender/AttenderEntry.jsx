import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { UserCheck, CheckCircle2, XCircle, RefreshCw, Sparkles, Lock } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';

export default function AttenderEntry() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch Classes (Filter by user.assignedClasses if restricted)
  useEffect(() => {
    const loadClasses = async () => {
      try {
        const res = await api.get('/classes');
        let classList = res.data.classes || [];

        if (user?.assignedClasses && user.assignedClasses.length > 0) {
          const assignedIds = new Set(
            user.assignedClasses.map((c) => (typeof c === 'object' ? String(c._id) : String(c)))
          );
          classList = classList.filter((c) => assignedIds.has(String(c._id)));
        }

        setClasses(classList);
        if (classList.length > 0) {
          setSelectedClass(classList[0]._id);
        }
      } catch (err) {
        toast.error('Failed to load classes');
      }
    };
    loadClasses();
  }, [user]);

  // Load Class Attendance Preview
  const loadPreview = async () => {
    if (!selectedClass) return;
    setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClass) {
      loadPreview();
    }
  }, [selectedClass, selectedDate]);

  // Toggle student status strictly between Present <-> Absent
  const toggleStudentStatus = (studentId, currentStatus) => {
    if (!previewData || previewData.isLocked) {
      if (previewData?.isLocked) {
        toast.error('Attendance is locked for this date. Only Admin can edit.');
      }
      return;
    }
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

  // Mark all students as Present
  const markAllPresent = () => {
    if (!previewData || previewData.isLocked) return;
    setPreviewData((prev) => {
      const updatedRecords = prev.records.map((r) => ({ ...r, status: 'present' }));
      return {
        ...prev,
        records: updatedRecords,
        summary: {
          totalStudents: updatedRecords.length,
          totalPresent: updatedRecords.length,
          totalAbsent: 0,
        },
      };
    });
  };

  // Submit attendance
  const handleSaveAttendance = async () => {
    if (!selectedClass || !previewData || previewData.isLocked) return;
    setSaving(true);
    try {
      await api.post('/attendance/save', {
        classId: selectedClass,
        date: selectedDate,
        records: previewData.records,
      });
      toast.success('Attendance saved successfully!');
      loadPreview();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageStack className="pb-24">
      <PageHeader
        title="Daily Attendance"
        description={`Logged in as ${user?.name || user?.teacherName || 'User'}`}
      />

      {/* CLASS & DATE SELECTOR CARD */}
      <ErpSection title="Select Class & Date" icon={UserCheck} tone="emerald">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Select Class</label>
            <Select value={selectedClass} onValueChange={(val) => setSelectedClass(val)}>
              <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50 font-bold text-slate-800">
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
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">Attendance Date</label>
              <button
                type="button"
                onClick={loadPreview}
                className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 font-medium transition-colors"
                title="Refresh List"
              >
                <RefreshCw className="h-3 w-3 text-slate-400" />
                Refresh
              </button>
            </div>
            <Input
              type="date"
              value={selectedDate}
              disabled={['teacher', 'attender'].includes(user?.role)}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl border-slate-200 bg-slate-100 text-sm font-bold text-slate-700 cursor-not-allowed opacity-90"
            />
          </div>
        </div>
      </ErpSection>

      {/* ATTENDANCE LOCK BANNER IF PREVIOUSLY RECORDED BY SOMEONE */}
      {previewData?.isLocked && (
        <div className="p-3.5 bg-amber-50 border border-amber-200/90 rounded-xl text-amber-900 text-xs sm:text-sm font-bold flex items-center gap-2.5 shadow-xs">
          <Lock className="h-4 w-4 text-amber-600 shrink-0" />
          <span>
            Attendance for this date was already recorded by{' '}
            <span className="font-extrabold">{previewData.recordedByInfo?.name || 'Staff'}</span> ({previewData.recordedByInfo?.role || 'Staff'}). Only Admin can edit or modify submitted attendance.
          </span>
        </div>
      )}

      {/* COMPACT SUMMARY COUNTER BAR (3 COLUMNS: TOTAL, PRESENT, ABSENT) */}
      {previewData && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-2 text-center shadow-xs">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total</div>
            <div className="text-sm sm:text-base font-black text-slate-800">{previewData.summary?.totalStudents || 0}</div>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-2 text-center shadow-xs">
            <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Present</div>
            <div className="text-sm sm:text-base font-black text-emerald-800">{previewData.summary?.totalPresent || 0}</div>
          </div>
          <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-2 text-center shadow-xs">
            <div className="text-[10px] text-rose-700 font-bold uppercase tracking-wider">Absent</div>
            <div className="text-sm sm:text-base font-black text-rose-800">{previewData.summary?.totalAbsent || 0}</div>
          </div>
        </div>
      )}

      {/* STUDENT ATTENDANCE LIST (RESPONSIVE & COMPACT - 2-STATE PRESENT/ABSENT TOGGLE) */}
      {loading ? (
        <div className="py-12 text-center text-slate-500 font-medium">Loading student list...</div>
      ) : previewData?.records?.length > 0 ? (
        <ErpSection title={`Student List (${previewData.records.length})`} icon={UserCheck} tone="purple">
          {/* DESKTOP COLUMN HEADERS (BALANCED 3-COLUMN FLEX) */}
          <div className="hidden sm:flex items-center justify-between px-3.5 py-2 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
            <div className="flex items-center gap-3 w-1/3">
              <span className="w-10 shrink-0">Roll No</span>
              <span>Student Name</span>
            </div>
            <div className="w-1/3 text-center">Father's Name</div>
            <div className="w-1/3 text-right pr-2">Attendance Status</div>
          </div>

          <div className="space-y-2">
            {previewData.records.map((st, index) => {
              const isPresent = st.status === 'present';
              return (
                <div
                  key={st.studentId}
                  className={`flex items-center justify-between gap-3 rounded-xl border p-2.5 sm:p-3 bg-white shadow-sm transition-all ${
                    isPresent
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : 'border-rose-200 bg-rose-50/20'
                  }`}
                >
                  {/* LEFT: ROLL NO & STUDENT NAME */}
                  <div className="flex items-center gap-3 w-full sm:w-1/3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700">
                      {st.rollNo || index + 1}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight truncate">
                        {st.name}
                      </h3>
                      {/* Mobile only father name below student name */}
                      <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium sm:hidden">
                        {st.fatherName ? `(${st.fatherName})` : ''}
                      </p>
                    </div>
                  </div>

                  {/* MIDDLE: FATHER NAME (LAPTOP & BIG DEVICES ONLY) */}
                  <div className="hidden sm:block w-1/3 text-center text-xs font-semibold text-slate-600 truncate min-w-0">
                    {st.fatherName ? (
                      <span>{st.fatherName}</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </div>

                  {/* RIGHT: 1-TAP PRESENT / ABSENT BINARY TOGGLE BUTTON */}
                  <div className="w-auto sm:w-1/3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => toggleStudentStatus(st.studentId, st.status)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 shrink-0 uppercase ${
                        isPresent
                          ? 'bg-emerald-600 text-white shadow-emerald-600/20 ring-2 ring-emerald-600/30 hover:bg-emerald-700'
                          : 'bg-rose-600 text-white shadow-rose-600/20 ring-2 ring-rose-600/30 hover:bg-rose-700'
                      }`}
                    >
                      {isPresent ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                      <span>{isPresent ? 'Present' : 'Absent'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </ErpSection>
      ) : (
        <div className="py-12 text-center text-slate-400 font-medium">No students found in this class</div>
      )}

      {/* FLOATING SUBMIT FOOTER BAR (COMPACT & SLEEK) */}
      {previewData?.records?.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/90 backdrop-blur-md p-2 shadow-lg flex justify-center">
          <Button
            onClick={handleSaveAttendance}
            variant={previewData?.isLocked ? 'outline' : 'success'}
            size="sm"
            disabled={saving || previewData?.isLocked}
            className={`w-full max-w-xs gap-2 h-10 text-sm font-bold rounded-xl ${
              previewData?.isLocked
                ? 'border-amber-300 bg-amber-50 text-amber-800 cursor-not-allowed opacity-90'
                : 'shadow-md shadow-emerald-600/20'
            }`}
          >
            {previewData?.isLocked ? (
              <>
                <Lock className="h-4 w-4 text-amber-600" />
                <span>Attendance Locked (Admin Only)</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>{saving ? 'Saving...' : 'Submit Attendance'}</span>
              </>
            )}
          </Button>
        </div>
      )}
    </PageStack>
  );
}
