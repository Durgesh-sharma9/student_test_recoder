import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  School,
  GraduationCap,
  ClipboardList,
  BarChart3,
  LogOut,
  Menu,
  X,
  Calendar,
  FileText,
  Building2,
  Settings,
  ChevronDown,
  Lock,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSession } from '@/context/SessionContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const navByRole = {
  super_admin: [
    { to: '/super-admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/super-admin/schools', label: 'Schools', icon: Building2 },
    { to: '/super-admin/plans', label: 'Plans', icon: ClipboardList },
  ],
  school_admin: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/teachers', label: 'Teachers', icon: Users },
    { to: '/admin/classes', label: 'Classes', icon: School },
    { to: '/admin/students', label: 'Students', icon: GraduationCap },
    { to: '/admin/parents', label: 'Parents', icon: UserCheck },
    { to: '/admin/assignments', label: 'Assign Subjects', icon: ClipboardList },
    { to: '/admin/results', label: 'Results', icon: BarChart3 },
    { to: '/admin/class-results', label: 'Class Results', icon: FileText },
    { to: '/admin/academic-sessions', label: 'Academic Sessions', icon: Settings },
  ],
  teacher: [
    { to: '/teacher', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/teacher/classes', label: 'My Classes', icon: School },
    { to: '/teacher/daily-test', label: 'Daily Test', icon: Calendar },
    { to: '/teacher/main-exam', label: 'Main Exam', icon: FileText },
    { to: '/teacher/results', label: 'Results', icon: BarChart3 },
  ],
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { selectedSession, allSessions, selectSession, isArchived } = useSession();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const role = user?.role === 'admin' ? 'school_admin' : user?.role;
  const navItems = navByRole[role] || [];
  const isAdmin = role === 'school_admin';

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white shadow-sm transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
            <School className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">School ERP</p>
            <p className="text-xs text-slate-500">Result Management</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Signed in</p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-800">{user?.name}</p>
        </div>
      </aside>

      {open ? (
        <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm sm:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen((v) => !v)}>
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <p className="hidden text-sm text-slate-500 sm:block">Welcome back, {user?.name}</p>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin ? (
              <div className="hidden items-center gap-2 sm:flex">
                <Select value={selectedSession?._id} onValueChange={(value) => {
                  const session = allSessions.find(s => s._id === value);
                  if (session) selectSession(session);
                }}>
                  <SelectTrigger className="w-[200px]">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <SelectValue placeholder="Select session" />
                  </SelectTrigger>
                  <SelectContent>
                    {allSessions.map((session) => (
                      <SelectItem key={session._id} value={session._id}>
                        {session.sessionName} {session.status === 'archived' && '(Archived)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isArchived && (
                  <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 border border-amber-200">
                    <Lock className="h-4 w-4 text-amber-600" />
                    <span className="text-xs font-medium text-amber-700">Read Only</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 sm:flex">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">
                  {selectedSession ? `Session: ${selectedSession.sessionName}` : 'No Active Session'}
                </span>
              </div>
            )}
            <Button
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
