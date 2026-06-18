import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const userStr = searchParams.get('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr));
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        const role = user.role === 'admin' ? 'school_admin' : user.role;
        
        if (role === 'super_admin') navigate('/super-admin');
        else if (role === 'school_admin') navigate('/admin');
        else if (role === 'parent') navigate('/parent');
        else navigate('/teacher');
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/login?error=Authentication failed');
      }
    } else {
      navigate('/login?error=Missing authentication data');
    }
  }, [searchParams, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
        <p className="text-slate-600">Completing authentication...</p>
      </div>
    </div>
  );
}
