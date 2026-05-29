import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, School, GraduationCap, ClipboardList, ChartColumn, LogOut, Menu, X, Calendar, FileText } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navByRole = {
  super_admin: [
    { to: '/super-admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/super-admin/schools', label: 'Schools', icon: School },
    { to: '/super-admin/plans', label: 'Plans', icon: ClipboardList },
  ],
  school_admin: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/teachers', label: 'Teachers', icon: Users },
    { to: '/admin/classes', label: 'Classes', icon: School },
    { to: '/admin/students', label: 'Students', icon: GraduationCap },
    { to: '/admin/assignments', label: 'Assignments', icon: ClipboardList },
    { to: '/admin/results', label: 'Results', icon: ChartColumn },
  ],
  teacher: [
    { to: '/teacher', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/teacher/classes', label: 'My Classes', icon: School },
    { to: '/teacher/daily-test', label: 'Daily Test', icon: Calendar },
    { to: '/teacher/main-exam', label: 'Main Exam', icon: FileText },
    { to: '/teacher/results', label: 'Results', icon: ChartColumn },
  ],
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const role = user?.role === 'admin' ? 'school_admin' : user?.role;
  const navItems = navByRole[role] || [];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className={cn('fixed inset-y-0 left-0 z-40 w-72 border-r bg-white transition-transform lg:static lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="h-16 border-b px-4 flex items-center font-semibold">School Result SaaS</div>
        <div className="p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setOpen(false)} className={({ isActive }) => cn('flex items-center gap-3 rounded-md px-3 py-2 text-sm', isActive ? 'bg-primary text-primary-foreground' : 'text-slate-700 hover:bg-slate-100')}>
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="flex-1">
        <header className="h-16 border-b bg-white px-4 lg:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen((v) => !v)}>
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div>
              <p className="text-xs text-muted-foreground">Logged in as</p>
              <p className="font-semibold">{user?.name}</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => { logout(); navigate('/login'); }}>
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        </header>
        <main className="p-4 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
