import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { UserCheck, CheckCircle2, XCircle, Clock, RefreshCw, LogOut, Sparkles } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AttenderEntry() {
  const { user, logout } = useAuth();
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
      setPreviewData(res.data);
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

  // Toggle student status (Present -> Absent -> Leave -> Present)
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

  // Shortcut to set all students to Present
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

  // Submit Attendance
  const handleSaveAttendance = async () => {
    if (!previewData) return;
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
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 shadow-inner">
            <UserCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight leading-tight">Daily Attendance</h1>
            <p className="text-xs text-emerald-100 font-medium">Logged in as {user?.name}</p>
          </div>
        </div>

        <Button
          onClick={logout}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/20 hover:text-white gap-1 text-xs"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-4">
        {/* CLASS & DATE SELECTOR CARD */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Select Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500"
              >
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.className} - {c.section}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Attendance Date</label>
              <Input
                type="date"
                value={selectedDate}
                disabled={['teacher', 'attender'].includes(user?.role)}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-xl border-slate-200 bg-slate-100 text-sm font-bold text-slate-700 cursor-not-allowed opacity-90"
              />
              {['teacher', 'attender'].includes(user?.role) && (
                <p className="text-[11px] text-slate-400 mt-1 font-medium">
                  🔒 Today's Date. Only Admin can edit past attendance.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
            <Button
              onClick={markAllPresent}
              variant="outline"
              size="sm"
              className="text-xs font-bold text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              Mark All Present
            </Button>

            <Button onClick={loadPreview} variant="ghost" size="sm" className="text-slate-500 text-xs gap-1">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh List
            </Button>
          </div>
        </div>

        {/* SUMMARY COUNTER PILLS */}
        {previewData && (
          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-center shadow-sm">
              <div className="text-[11px] text-slate-500 font-bold uppercase">Total</div>
              <div className="text-lg font-black text-slate-800">{previewData.summary?.totalStudents || 0}</div>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-center shadow-sm">
              <div className="text-[11px] text-emerald-700 font-bold uppercase">Present</div>
              <div className="text-lg font-black text-emerald-800">{previewData.summary?.totalPresent || 0}</div>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-center shadow-sm">
              <div className="text-[11px] text-rose-700 font-bold uppercase">Absent</div>
              <div className="text-lg font-black text-rose-800">{previewData.summary?.totalAbsent || 0}</div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-center shadow-sm">
              <div className="text-[11px] text-amber-700 font-bold uppercase">Leave</div>
              <div className="text-lg font-black text-amber-800">{previewData.summary?.totalLeave || 0}</div>
            </div>
          </div>
        )}

        {/* STUDENT ATTENDANCE CARDS LIST */}
        {loading ? (
          <div className="py-12 text-center text-slate-500 font-medium">Loading student list...</div>
        ) : previewData?.records?.length > 0 ? (
          <div className="space-y-2">
            {previewData.records.map((st, index) => (
              <div
                key={st.studentId}
                className={`flex items-center justify-between rounded-xl border p-3 bg-white shadow-sm transition-all ${
                  st.status === 'present'
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : st.status === 'absent'
                    ? 'border-rose-200 bg-rose-50/20'
                    : 'border-amber-200 bg-amber-50/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700">
                    {st.rollNo || index + 1}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">{st.name}</h3>
                    <p className="text-xs text-slate-500">{st.fatherName ? `Father: ${st.fatherName}` : 'Student'}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleStudentStatus(st.studentId, st.status)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black tracking-wide transition-all shadow-sm flex items-center gap-1.5 uppercase ${
                    st.status === 'present'
                      ? 'bg-emerald-600 text-white shadow-emerald-600/20 ring-2 ring-emerald-600/30'
                      : st.status === 'absent'
                      ? 'bg-rose-600 text-white shadow-rose-600/20 ring-2 ring-rose-600/30'
                      : 'bg-amber-500 text-white shadow-amber-500/20 ring-2 ring-amber-500/30'
                  }`}
                >
                  {st.status === 'present' && <CheckCircle2 className="h-4 w-4" />}
                  {st.status === 'absent' && <XCircle className="h-4 w-4" />}
                  {st.status === 'leave' && <Clock className="h-4 w-4" />}
                  {st.status}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 font-medium">No students found in this class</div>
        )}
      </main>

      {/* FLOATING SUBMIT FOOTER BAR */}
      {previewData?.records?.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md p-3 shadow-lg flex justify-center">
          <Button
            onClick={handleSaveAttendance}
            variant="success"
            size="lg"
            disabled={saving}
            className="w-full max-w-md gap-2 py-6 text-base font-bold shadow-lg shadow-emerald-600/20"
          >
            <CheckCircle2 className="h-5 w-5" />
            {saving ? 'Saving...' : 'Submit Attendance'}
          </Button>
        </div>
      )}
    </div>
  );
}
