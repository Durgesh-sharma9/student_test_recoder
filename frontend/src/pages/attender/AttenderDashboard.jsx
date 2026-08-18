import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  UserCheck,
  CheckCircle2,
  Clock,
  School,
  Users,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Calendar,
  Settings,
  AlertCircle
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';

export default function AttenderDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [classStats, setClassStats] = useState({});
  const [loading, setLoading] = useState(true);

  const todayString = new Date().toISOString().split('T')[0];
  const formattedToday = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // 1. Fetch All Classes
        const classRes = await api.get('/classes');
        let allClasses = classRes.data.classes || [];

        // Filter assigned classes for attender
        if (user?.assignedClasses && user.assignedClasses.length > 0) {
          const assignedIds = new Set(
            user.assignedClasses.map((c) => (typeof c === 'object' ? String(c._id) : String(c)))
          );
          allClasses = allClasses.filter((c) => assignedIds.has(String(c._id)));
        }

        setClasses(allClasses);

        // 2. Fetch today's attendance status for each assigned class
        const statsMap = {};
        for (const cls of allClasses) {
          try {
            const previewRes = await api.get('/attendance/preview', {
              params: { classId: cls._id, date: todayString },
            });
            const data = previewRes.data;
            statsMap[cls._id] = {
              marked: data?.isSaved || false,
              totalStudents: data?.summary?.totalStudents || 0,
              totalPresent: data?.summary?.totalPresent || 0,
              totalAbsent: data?.summary?.totalAbsent || 0,
            };
          } catch (err) {
            statsMap[cls._id] = { marked: false, totalStudents: 0, totalPresent: 0, totalAbsent: 0 };
          }
        }
        setClassStats(statsMap);
      } catch (err) {
        toast.error('Failed to load attender dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, todayString]);

  // Aggregate Stats
  const totalClasses = classes.length;
  const markedClassesCount = Object.values(classStats).filter((s) => s.marked).length;
  const pendingClassesCount = totalClasses - markedClassesCount;
  const totalStudentsCombined = Object.values(classStats).reduce((acc, curr) => acc + curr.totalStudents, 0);
  const totalPresentCombined = Object.values(classStats).reduce((acc, curr) => acc + curr.totalPresent, 0);
  const overallPercentage = totalStudentsCombined > 0
    ? Math.round((totalPresentCombined / totalStudentsCombined) * 100)
    : 0;

  return (
    <PageStack className="pb-16">
      {/* WELCOME BANNER HEADER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 p-6 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-100 text-xs font-semibold uppercase tracking-wider mb-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formattedToday}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Welcome, {user?.name || user?.teacherName || 'Attender'} 👋
            </h1>
            <p className="text-emerald-100 text-sm mt-1 max-w-xl">
              Daily Attendance Portal • Managed Assigned Classes
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={() => navigate('/attender/entry')}
              className="bg-white text-emerald-800 hover:bg-emerald-50 font-bold shadow-md gap-2 rounded-xl"
            >
              <UserCheck className="h-4 w-4 text-emerald-600" />
              Mark Attendance Now
            </Button>
          </div>
        </div>

        {/* Decorative Circles */}
        <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-xl pointer-events-none" />
      </div>

      {/* KPI HIGHLIGHT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Assigned Classes</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <School className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalClasses}</div>
          <p className="text-[11px] text-slate-400 mt-1">Classes under your duty</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Today's Progress</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {markedClassesCount} / {totalClasses}
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">
            {pendingClassesCount === 0 ? '🎉 All Marked Today' : `${pendingClassesCount} Classes Pending`}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Total Students</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalStudentsCombined}</div>
          <p className="text-[11px] text-slate-400 mt-1">Across assigned classes</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Today's Attendance Rate</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{overallPercentage}%</div>
          <p className="text-[11px] text-slate-400 mt-1">Present percentage</p>
        </div>
      </div>

      {/* ASSIGNED CLASSES LIVE STATUS GRID */}
      <ErpSection title="My Assigned Classes (Today's Status)" icon={School} tone="emerald">
        {loading ? (
          <div className="py-12 text-center text-slate-500 font-medium">Loading classes status...</div>
        ) : classes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((c) => {
              const stat = classStats[c._id] || { marked: false, totalStudents: 0, totalPresent: 0, totalAbsent: 0 };
              return (
                <div
                  key={c._id}
                  className={`rounded-2xl border p-4 transition-all bg-white shadow-sm flex flex-col justify-between ${
                    stat.marked ? 'border-emerald-200 bg-emerald-50/10' : 'border-amber-200 bg-amber-50/10'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-extrabold text-slate-900">
                        {c.className} - {c.section}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          stat.marked
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {stat.marked ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" /> Marked
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3" /> Pending
                          </>
                        )}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                        <div className="text-[10px] text-slate-500 font-bold uppercase">Students</div>
                        <div className="text-sm font-black text-slate-800">{stat.totalStudents}</div>
                      </div>
                      <div className="rounded-lg bg-emerald-50 p-2 border border-emerald-100">
                        <div className="text-[10px] text-emerald-700 font-bold uppercase">Present</div>
                        <div className="text-sm font-black text-emerald-800">{stat.totalPresent}</div>
                      </div>
                      <div className="rounded-lg bg-rose-50 p-2 border border-rose-100">
                        <div className="text-[10px] text-rose-700 font-bold uppercase">Absent</div>
                        <div className="text-sm font-black text-rose-800">{stat.totalAbsent}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">
                      Date: <strong className="text-slate-800">{todayString}</strong>
                    </span>

                    <Button
                      onClick={() => navigate('/attender/entry')}
                      size="sm"
                      variant={stat.marked ? 'outline' : 'success'}
                      className="gap-1 text-xs font-bold rounded-xl"
                    >
                      <span>{stat.marked ? 'View / Edit' : 'Mark Now'}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 font-medium">
            No classes assigned to your attender account. Please contact Admin.
          </div>
        )}
      </ErpSection>

      {/* QUICK LINKS FOOTER CARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Mark Daily Attendance</h4>
              <p className="text-xs text-slate-500">1-tap fast attendance entry for students</p>
            </div>
          </div>
          <Button onClick={() => navigate('/attender/entry')} variant="outline" size="sm" className="rounded-xl font-bold text-xs gap-1">
            Open <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Account Settings</h4>
              <p className="text-xs text-slate-500">Update profile & change password</p>
            </div>
          </div>
          <Button onClick={() => navigate('/attender/settings')} variant="outline" size="sm" className="rounded-xl font-bold text-xs gap-1">
            Settings <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </PageStack>
  );
}
