import { useState } from 'react';
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
  Lock,
  UserCheck,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSession } from '@/context/SessionContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Added customized background and icon configurations for each structural module container box
const navByRole = {
  super_admin: [
    { to: '/super-admin', label: 'Dashboard', icon: LayoutDashboard, iconColor: 'text-blue-600', boxBg: 'bg-blue-50 group-hover:bg-blue-100', end: true },
    { to: '/super-admin/schools', label: 'Schools', icon: Building2, iconColor: 'text-emerald-600', boxBg: 'bg-emerald-50 group-hover:bg-emerald-100' },
    { to: '/super-admin/plans', label: 'Plans', icon: ClipboardList, iconColor: 'text-amber-600', boxBg: 'bg-amber-50 group-hover:bg-amber-100' },
  ],
  school_admin: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, iconColor: 'text-sky-600', boxBg: 'bg-sky-50 group-hover:bg-sky-100', end: true },
    { to: '/admin/teachers', label: 'Teachers', icon: Users, iconColor: 'text-teal-600', boxBg: 'bg-teal-50 group-hover:bg-teal-100' },
    { to: '/admin/classes', label: 'Classes', icon: School, iconColor: 'text-indigo-600', boxBg: 'bg-indigo-50 group-hover:bg-indigo-100' },
    { to: '/admin/students', label: 'Students', icon: GraduationCap, iconColor: 'text-purple-600', boxBg: 'bg-purple-50 group-hover:bg-purple-100' },
    { to: '/admin/parents', label: 'Parents', icon: UserCheck, iconColor: 'text-pink-600', boxBg: 'bg-pink-50 group-hover:bg-pink-100' },
    { to: '/admin/assignments', label: 'Assign Subjects', icon: ClipboardList, iconColor: 'text-orange-600', boxBg: 'bg-orange-50 group-hover:bg-orange-100' },
    { to: '/admin/results', label: 'Results', icon: BarChart3, iconColor: 'text-emerald-600', boxBg: 'bg-emerald-50 group-hover:bg-emerald-100' },
    { to: '/admin/class-results', label: 'Class Results', icon: FileText, iconColor: 'text-rose-600', boxBg: 'bg-rose-50 group-hover:bg-rose-100' },
    { to: '/admin/academic-sessions', label: 'Academic Sessions', icon: Settings, iconColor: 'text-violet-600', boxBg: 'bg-violet-50 group-hover:bg-violet-100' },
  ],
  teacher: [
    { to: '/teacher', label: 'Dashboard', icon: LayoutDashboard, iconColor: 'text-sky-600', boxBg: 'bg-sky-50 group-hover:bg-sky-100', end: true },
    { to: '/teacher/classes', label: 'My Classes', icon: School, iconColor: 'text-indigo-600', boxBg: 'bg-indigo-50 group-hover:bg-indigo-100' },
    { to: '/teacher/daily-test', label: 'Daily Test', icon: Calendar, iconColor: 'text-amber-600', boxBg: 'bg-amber-50 group-hover:bg-amber-100' },
    { to: '/teacher/main-exam', label: 'Main Exam', icon: FileText, iconColor: 'text-rose-600', boxBg: 'bg-rose-50 group-hover:bg-rose-100' },
    { to: '/teacher/results', label: 'Results', icon: BarChart3, iconColor: 'text-emerald-600', boxBg: 'bg-emerald-50 group-hover:bg-emerald-100' },
  ],
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { selectedSession, allSessions, selectSession, isArchived } = useSession();
  const [open, setOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const role = user?.role === 'admin' ? 'school_admin' : user?.role;
  const navItems = navByRole[role] || [];
  const isAdmin = role === 'school_admin';

  return (
    <div className="flex min-h-screen bg-slate-50/50 text-slate-900 transition-colors duration-300">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200/80 bg-white shadow-sm shadow-slate-100 transition-all duration-300 lg:sticky lg:top-0 lg:h-screen',
          isCollapsed ? 'lg:w-20' : 'lg:w-72 w-72',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Colorful Branded Header */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-4 transition-all overflow-hidden whitespace-nowrap">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 text-white shadow-md shadow-indigo-500/20">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className={cn("transition-opacity duration-200", isCollapsed ? "lg:opacity-0" : "opacity-100")}>
            <div className="flex items-center gap-1">
              <p className="text-sm font-extrabold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-500 bg-clip-text text-transparent">
                Test Master
              </p>
              <Sparkles className="h-3 w-3 text-cyan-500 fill-cyan-500" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              Pro Management
            </p>
          </div>
        </div>

        {/* Navigation Items with Box Wrappers */}
        <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-all duration-200 group overflow-hidden whitespace-nowrap',
                  isActive
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-600/15'
                    : 'text-slate-600 hover:bg-slate-50/80 hover:text-indigo-600',
                  isCollapsed && 'lg:justify-center lg:px-0 lg:h-12 lg:w-12 lg:mx-auto'
                )
              }
              title={isCollapsed ? item.label : undefined}
            >
              {({ isActive }) => (
                <>
                  {/* Icon Container Box */}
                  <div className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                    isActive 
                      ? "bg-white/20 text-white shadow-inner" 
                      : item.boxBg
                  )}>
                    <item.icon className={cn(
                      "h-5 w-5 transition-transform duration-200 group-hover:scale-110",
                      isActive ? "text-white" : item.iconColor
                    )} />
                  </div>
                  
                  <span className={cn("transition-opacity duration-200 font-medium tracking-wide", isCollapsed ? "lg:hidden" : "block")}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Workspace Profile Block */}
        <div className="border-t border-slate-100 bg-slate-50/50 p-4 transition-all overflow-hidden whitespace-nowrap">
          <p className={cn("text-[10px] font-bold uppercase tracking-wider text-slate-400", isCollapsed && "lg:hidden")}>
            Signed in as
          </p>
          <p className={cn("mt-0.5 truncate text-sm font-semibold text-slate-800", isCollapsed ? "lg:text-center lg:text-xs" : "")}>
            {isCollapsed ? user?.name?.charAt(0).toUpperCase() : user?.name}
          </p>
          {!isCollapsed && (
            <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
              ({role === 'school_admin' ? 'School Admin' : role === 'super_admin' ? 'Super Admin' : role === 'parent' ? 'Guardian' : role?.charAt(0).toUpperCase() + role?.slice(1)})
            </p>
          )}
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {open ? (
        <div className="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} aria-hidden />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header Dashboard Control */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/60 bg-white/80 px-4 shadow-sm backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-2">
            {/* Mobile Hamburger Trigger */}
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen((v) => !v)}>
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            {/* Desktop Collapse/Expand Toggle Action Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="hidden lg:flex rounded-xl hover:bg-slate-100 text-slate-500"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </Button>

            <p className="hidden text-sm font-medium sm:block text-slate-500">
              Welcome back, <span className="font-semibold text-slate-800">{user?.name}</span>
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {isAdmin ? (
              <div className="hidden items-center gap-2 sm:flex">
                <Select value={selectedSession?._id} onValueChange={(value) => {
                  const session = allSessions.find(s => s._id === value);
                  if (session) selectSession(session);
                }}>
                  <SelectTrigger className="w-[200px] rounded-xl font-medium bg-white border-slate-200 shadow-sm">
                    <Calendar className="h-4 w-4 text-indigo-500" />
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
                  <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-1.5 border border-amber-500/20">
                    <Lock className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-semibold text-amber-500">Read Only</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-1.5 font-medium text-sm text-indigo-700 sm:flex shadow-sm">
                <Calendar className="h-4 w-4" />
                <span>
                  {selectedSession ? `Session: ${selectedSession.sessionName}` : 'No Active Session'}
                </span>
              </div>
            )}

            {/* Logout Action */}
            <Button
              variant="outline"
              className="rounded-xl font-medium border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700 shadow-sm"
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

        {/* Main Content Render View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}