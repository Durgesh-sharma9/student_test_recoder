import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, School, GraduationCap, ClipboardList, BarChart3,
  CreditCard, LogOut, Menu, Calendar, FileText, Building2, Settings,
  Lock, UserCheck, Bell, Megaphone,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSession } from '@/context/SessionContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import NotificationPanel from '@/components/NotificationPanel';
import AnnouncementModal from '@/components/AnnouncementModal';
import LockedFeatureDialog from '@/components/subscription/LockedFeatureDialog';

const getDisplayName = (user) => {
  if (!user) return 'User';
  if (user.name && typeof user.name === 'string' && user.name.trim()) return user.name.trim();
  if (user.teacherName && typeof user.teacherName === 'string' && user.teacherName.trim()) return user.teacherName.trim();
  if (user.parentName && typeof user.parentName === 'string' && user.parentName.trim()) return user.parentName.trim();
  if (user.adminName && typeof user.adminName === 'string' && user.adminName.trim()) return user.adminName.trim();
  if (user.role === 'super_admin') return 'Super Admin';
  if (user.role === 'school_admin' || user.role === 'admin') return 'School Admin';
  if (user.role === 'teacher') return 'Teacher';
  if (user.role === 'parent') return 'Parent / Guardian';
  if (user.email && typeof user.email === 'string' && user.email.trim()) return user.email.trim();
  return 'User';
};

const getInitials = (user) => {
  if (!user) return 'U';
  const name = getDisplayName(user);
  if (!name || name === 'User') return 'U';
  if (name.includes('@')) return name.charAt(0).toUpperCase();
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return words.map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
};

const navByRole = {
  super_admin: [
    { to: '/super-admin', label: 'Dashboard', icon: LayoutDashboard, iconColor: 'text-blue-600', boxBg: 'bg-blue-50 group-hover:bg-blue-100', end: true },
    { to: '/super-admin/notifications', label: 'Notifications', icon: Bell, iconColor: 'text-amber-600', boxBg: 'bg-amber-50 group-hover:bg-amber-100' },
    { to: '/super-admin/schools', label: 'Schools', icon: Building2, iconColor: 'text-emerald-600', boxBg: 'bg-emerald-50 group-hover:bg-emerald-100' },
    { to: '/super-admin/plans', label: 'Plans', icon: ClipboardList, iconColor: 'text-amber-600', boxBg: 'bg-amber-50 group-hover:bg-amber-100' },
    { to: '/super-admin/trial-settings', label: 'Trial Settings', icon: Settings, iconColor: 'text-purple-600', boxBg: 'bg-purple-50 group-hover:bg-purple-100' },
    { to: '/super-admin/subscription-requests', label: 'Payments', icon: CreditCard, iconColor: 'text-indigo-600', boxBg: 'bg-indigo-50 group-hover:bg-indigo-100' },
    { to: '/super-admin/payment-settings', label: 'Payment Settings', icon: Settings, iconColor: 'text-slate-600', boxBg: 'bg-slate-50 group-hover:bg-slate-100' },
  ],
  school_admin: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, iconColor: 'text-sky-600', boxBg: 'bg-sky-50 group-hover:bg-sky-100', end: true },
    { to: '/admin/notifications', label: 'Notifications', icon: Bell, iconColor: 'text-amber-600', boxBg: 'bg-amber-50 group-hover:bg-amber-100' },
    { to: '/admin/teachers', label: 'Teachers', icon: Users, iconColor: 'text-teal-600', boxBg: 'bg-teal-50 group-hover:bg-teal-100', featureKey: 'teacher_portal' },
    { to: '/admin/classes', label: 'Classes', icon: School, iconColor: 'text-indigo-600', boxBg: 'bg-indigo-50 group-hover:bg-indigo-100' },
    { to: '/admin/students', label: 'Students', icon: GraduationCap, iconColor: 'text-purple-600', boxBg: 'bg-purple-50 group-hover:bg-purple-100', featureKey: 'student_portal' },
    { to: '/admin/parents', label: 'Parents', icon: UserCheck, iconColor: 'text-pink-600', boxBg: 'bg-pink-50 group-hover:bg-pink-100', featureKey: 'parent_portal' },
    { to: '/admin/assignments', label: 'Assign Subjects', icon: ClipboardList, iconColor: 'text-orange-600', boxBg: 'bg-orange-50 group-hover:bg-orange-100', featureKey: 'teacher_portal', lockLabel: 'Assign Subjects' },
    { to: '/admin/results', label: 'Results', icon: BarChart3, iconColor: 'text-emerald-600', boxBg: 'bg-emerald-50 group-hover:bg-emerald-100', featureKey: 'reports' },
    { to: '/admin/teacher-performance', label: 'Teacher Performance', icon: BarChart3, iconColor: 'text-indigo-600', boxBg: 'bg-indigo-50 group-hover:bg-indigo-100', featureKey: 'teacher_performance' },
    { to: '/admin/class-results', label: 'Class Results', icon: FileText, iconColor: 'text-rose-600', boxBg: 'bg-rose-50 group-hover:bg-rose-100', featureKey: 'reports' },
    { to: '/admin/academic-sessions', label: 'Academic Sessions', icon: Settings, iconColor: 'text-violet-600', boxBg: 'bg-violet-50 group-hover:bg-violet-100', featureKey: 'academic_session' },
    { to: '/admin/plans', label: 'Plans', icon: CreditCard, iconColor: 'text-amber-600', boxBg: 'bg-amber-50 group-hover:bg-amber-100' },
  ],
  teacher: [
    { to: '/teacher', label: 'Dashboard', icon: LayoutDashboard, iconColor: 'text-sky-600', boxBg: 'bg-sky-50 group-hover:bg-sky-100', end: true },
    { to: '/teacher/notifications', label: 'Notifications', icon: Bell, iconColor: 'text-amber-600', boxBg: 'bg-amber-50 group-hover:bg-amber-100', featureKey: 'notifications' },
    { to: '/teacher/classes', label: 'My Classes', icon: School, iconColor: 'text-indigo-600', boxBg: 'bg-indigo-50 group-hover:bg-indigo-100', featureKey: 'teacher_portal' },
    { to: '/teacher/daily-test', label: 'Create Daily Test', icon: Calendar, iconColor: 'text-amber-600', boxBg: 'bg-amber-50 group-hover:bg-amber-100', featureKey: 'daily_test' },
    { to: '/teacher/main-exam', label: 'Main Exam', icon: FileText, iconColor: 'text-rose-600', boxBg: 'bg-rose-50 group-hover:bg-rose-100', featureKey: 'main_exam' },
    { to: '/teacher/results', label: 'View Results', icon: BarChart3, iconColor: 'text-emerald-600', boxBg: 'bg-emerald-50 group-hover:bg-emerald-100', featureKey: 'reports' },
    { to: '/teacher/settings', label: 'Settings', icon: Settings, iconColor: 'text-slate-600', boxBg: 'bg-slate-50 group-hover:bg-slate-100' },
  ],
  parent: [
    { to: '/parent/dashboard', label: 'Dashboard', icon: LayoutDashboard, iconColor: 'text-sky-600', boxBg: 'bg-sky-50 group-hover:bg-sky-100', end: true, featureKey: 'parent_portal' },
    { to: '/parent/results', label: 'View Results', icon: FileText, iconColor: 'text-indigo-600', boxBg: 'bg-indigo-100', featureKey: 'reports', lockLabel: 'Results' },
    { to: '/parent/notifications', label: 'Notifications', icon: Bell, iconColor: 'text-amber-600', boxBg: 'bg-amber-50 group-hover:bg-amber-100', featureKey: 'notifications' },
    { to: '/parent/settings', label: 'Settings', icon: Settings, iconColor: 'text-slate-600', boxBg: 'bg-slate-50 group-hover:bg-slate-100' },
  ],
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { isFeatureEnabled, currentPlan } = useSubscription();
  const [open, setOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [lockedDialog, setLockedDialog] = useState({ open: false, label: '' });
  const navigate = useNavigate();
  const role = user?.role === 'admin' ? 'school_admin' : user?.role;
  const navItems = navByRole[role] || [];
  const isAdmin = role === 'school_admin';
  const isSuperAdmin = role === 'super_admin';

  // Get plan badge text
  const getPlanBadge = () => {
    if (!currentPlan?.planType) return null;
    const planTypeMap = {
      'trial': 'TRIAL',
      'basic': 'BASIC',
      'standard': 'STANDARD',
      'premium': 'ELITE',
    };
    return planTypeMap[currentPlan.planType] || currentPlan.planType.toUpperCase();
  };

  const planBadge = getPlanBadge();

  return (
    <div className="flex min-h-screen bg-slate-50/50 text-slate-900 transition-colors duration-300">
      <aside className={cn('fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200/80 bg-white shadow-sm shadow-slate-100 transition-all duration-300 lg:sticky lg:top-0 lg:h-screen', isCollapsed ? 'lg:w-20' : 'lg:w-72 w-72', open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')}>
        <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-4 transition-all overflow-hidden whitespace-nowrap">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 text-white shadow-md shadow-indigo-500/20">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className={cn("transition-opacity duration-200", isCollapsed ? "lg:opacity-0" : "opacity-100")}>
            <p className="text-sm font-extrabold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-500 bg-clip-text text-transparent">Test Master</p>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Pro Management</p>
          </div>
        </div>
        
        {/* COMPACTED NAV SECTION - Padding and Gap reduced here */}
        <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
          {navItems.map((item) => {
            const locked = item.featureKey ? !isFeatureEnabled(item.featureKey) : false;
            const label = item.lockLabel || item.label;
            const baseClass = ({ isActive }) => cn(
              'flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-medium transition-all duration-200 group overflow-hidden whitespace-nowrap', 
              isActive ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-600/15' : 'text-slate-600 hover:bg-slate-50/80 hover:text-indigo-600', 
              locked && 'opacity-80', 
              isCollapsed && 'lg:justify-center lg:px-0 lg:h-10 lg:w-10 lg:mx-auto'
            );
            const content = ({ isActive }) => (
              <>
                {/* Icon box height and width reduced slightly */}
                <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200', isActive ? 'bg-white/20 text-white shadow-inner' : item.boxBg)}>
                  <item.icon className={cn('h-4 w-4 transition-transform duration-200 group-hover:scale-110', isActive ? 'text-white' : item.iconColor)} />
                </div>
                <span className={cn('transition-opacity duration-200 font-medium tracking-wide', isCollapsed ? 'lg:hidden' : 'block')}>{item.label}</span>
                {!isCollapsed && locked && <span className="ml-auto inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700"><Lock className="h-3 w-3" /> Locked</span>}
              </>
            );
            if (locked) return <button key={item.to} onClick={() => { setOpen(false); setLockedDialog({ open: true, label }); }} className={baseClass({ isActive: false })}>{content({ isActive: false })}</button>;
            return <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setOpen(false)} className={baseClass}>{content}</NavLink>;
          })}
        </nav>
        
        <div className="border-t border-slate-100 bg-slate-50/50 p-4 transition-all overflow-hidden whitespace-nowrap">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white font-bold text-sm shadow-md">{getInitials(user)}</div>
            <div className={cn("flex-1 min-w-0", isCollapsed ? "lg:hidden" : "block")}>
              <p className="truncate text-sm font-semibold text-slate-800">{getDisplayName(user)}</p>
              <p className="mt-0.5 truncate text-xs font-medium text-slate-500">({role})</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/60 bg-white/80 px-4 shadow-sm backdrop-blur-md sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(!open)}><Menu className="h-5 w-5" /></Button>
          <div className="flex items-center gap-3 ml-auto">
            {isAdmin && planBadge && (
              <button
                onClick={() => navigate('/admin/plans')}
                className="rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-1 text-xs font-bold text-white shadow-md hover:from-indigo-700 hover:to-purple-700 transition-all"
              >
                {planBadge}
              </button>
            )}
            {(isSuperAdmin || isAdmin || role === 'teacher' || role === 'parent') && <NotificationPanel />}
            <Button className="rounded-xl bg-gradient-to-r from-purple-600 to-blue-500 text-white" onClick={() => setIsAnnouncementModalOpen(true)}><Megaphone className="h-5 w-5" /></Button>
            <Button variant="outline" className="rounded-xl" onClick={() => { logout(); navigate('/login'); }}><LogOut className="mr-2 h-4 w-4" /> Logout</Button>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8"><Outlet /></main>
      </div>

      <AnnouncementModal open={isAnnouncementModalOpen} onOpenChange={setIsAnnouncementModalOpen} role={role} />
      <LockedFeatureDialog open={lockedDialog.open} onOpenChange={(v) => setLockedDialog({...lockedDialog, open: v})} featureLabel={lockedDialog.label} />
    </div>
  );
}