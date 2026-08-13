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
    
    const token = localStorage.getItem('token');
    
    
    if (!token) { 
      
      setLoading(false); 
      return; 
    }
    
    // If we already have user data from localStorage, use it immediately
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        
      } catch (e) {
        console.error('[AuthContext] Error parsing stored user:', e);
      }
    }
    
    
    api.get('/auth/me')
      .then((res) => {
        
        setUser(res.data.user);
        localStorage.setItem('user', JSON.stringify(res.data.user));
      })
      .catch((err) => {
        
        // Only clear localStorage if it's a 401 (unauthorized) error
        // This prevents clearing user data on network errors or server issues
        if (err.response?.status === 401) {
          
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        } else {
          
          // Keep the user from localStorage if API call fails for other reasons
        }
      })
      .finally(() => {
        
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
    <AuthContext.Provider value={{ user, setUser, loading, login, parentLogin, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};