import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const role = user.role === 'admin' ? 'school_admin' : user.role;
  const allowed = roles?.map((r) => (r === 'school_admin' ? ['school_admin', 'admin'] : [r])).flat() || [];

  if (roles && !allowed.includes(role)) {
    if (role === 'super_admin') return <Navigate to="/super-admin" replace />;
    if (role === 'school_admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/teacher" replace />;
  }

  return children;
}
