import { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[AuthContext] useEffect triggered');
    const token = localStorage.getItem('token');
    console.log('[AuthContext] Token from localStorage:', token ? 'exists' : 'none');
    
    if (!token) { 
      console.log('[AuthContext] No token, setting loading to false');
      setLoading(false); 
      return; 
    }
    
    // If we already have user data from localStorage, use it immediately
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        console.log('[AuthContext] Using stored user from localStorage:', parsedUser);
      } catch (e) {
        console.error('[AuthContext] Error parsing stored user:', e);
      }
    }
    
    console.log('[AuthContext] Calling /auth/me');
    api.get('/auth/me')
      .then((res) => {
        console.log('[AuthContext] /auth/me success:', res.data.user);
        setUser(res.data.user);
        localStorage.setItem('user', JSON.stringify(res.data.user));
      })
      .catch((err) => {
        console.log('[AuthContext] /auth/me error:', err);
        // Only clear localStorage if it's a 401 (unauthorized) error
        // This prevents clearing user data on network errors or server issues
        if (err.response?.status === 401) {
          console.log('[AuthContext] 401 error, clearing auth data');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        } else {
          console.log('[AuthContext] Non-401 error, keeping existing user data');
          // Keep the user from localStorage if API call fails for other reasons
        }
      })
      .finally(() => {
        console.log('[AuthContext] Setting loading to false');
        setLoading(false);
      });
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const parentLogin = async (email, phone, password) => {
    const res = await api.post('/auth/parent-login', { email, phone, password });
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, parentLogin, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};