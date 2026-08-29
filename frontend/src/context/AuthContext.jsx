import { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';

const AuthContext = createContext(null);

export const clearAllAuthStorage = () => {
  console.log('[AuthContext] Purging all stored tokens, user credentials, and impersonation keys');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('superToken');
  localStorage.removeItem('superUser');
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUser');
  localStorage.removeItem('selectedSessionId');
  localStorage.removeItem('pending_activation_plan_id');
  try {
    sessionStorage.clear();
  } catch (e) {
    // Ignore sessionStorage errors
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [cachedUser, setCachedUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[AuthContext] useEffect triggered');
    const token = localStorage.getItem('token');
    console.log('[AuthContext] Token from localStorage:', token ? 'exists' : 'none');
    
    if (!token) { 
      console.log('[AuthContext] No token, clearing user state and setting loading to false');
      clearAllAuthStorage();
      setUser(null);
      setCachedUser(null);
      setLoading(false); 
      return; 
    }
    
    console.log('[AuthContext] Calling /auth/me');
    api.get('/auth/me')
      .then((res) => {
        console.log('[AuthContext] /auth/me success:', res.data.user);
        setUser(res.data.user);
        setCachedUser(res.data.user);
        localStorage.setItem('user', JSON.stringify(res.data.user));
      })
      .catch((err) => {
        console.log('[AuthContext] /auth/me error:', err);
        // Only clear user if it's an auth error (401 or 403)
        if (err.response?.status === 401 || err.response?.status === 403) {
          console.log('[AuthContext] 401/403 error, purging all sessions');
          clearAllAuthStorage();
          setUser(null);
          setCachedUser(null);
        } else {
          // For other errors, keep the cached user from localStorage
          console.log('[AuthContext] Non-auth error, keeping cached user');
          const stored = localStorage.getItem('user');
          if (stored) {
            const parsedUser = JSON.parse(stored);
            setUser(parsedUser);
            setCachedUser(parsedUser);
          }
        }
      })
      .finally(() => {
        console.log('[AuthContext] Setting loading to false');
        setLoading(false);
      });
  }, []);

  const login = async (email, password) => {
    clearAllAuthStorage();
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    setCachedUser(res.data.user);
    return res.data.user;
  };

  const parentLogin = async (email, phone, password) => {
    clearAllAuthStorage();
    const res = await api.post('/auth/parent-login', { email, phone, password });
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    setCachedUser(res.data.user);
    return res.data.user;
  };

  const setSession = (userData, tokenData) => {
    if (tokenData) {
      localStorage.setItem('token', tokenData);
    }
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
    }
    setUser(userData || null);
    setCachedUser(userData || null);
  };

  const logout = () => {
    clearAllAuthStorage();
    setUser(null);
    setCachedUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user: user || cachedUser,
      loading,
      login,
      parentLogin,
      logout,
      setUser: (u) => setSession(u),
      setSession,
      isAuthenticated: !!(user || cachedUser)
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};