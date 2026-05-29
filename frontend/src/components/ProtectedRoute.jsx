import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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
