import { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from './AuthContext';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [selectedSession, setSelectedSession] = useState(null);
  const [allSessions, setAllSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await api.get('/academic-sessions');
        setAllSessions(res.data.sessions || []);
        
        const activeSession = res.data.sessions?.find(s => s.status === 'active');
        
        if (isAdmin) {
          // Admin: Load saved session from localStorage or default to active
          const savedSessionId = localStorage.getItem('selectedSessionId');
          
          if (savedSessionId) {
            const savedSession = res.data.sessions?.find(s => s._id === savedSessionId);
            if (savedSession) {
              setSelectedSession(savedSession);
              return;
            }
          }
          
          if (activeSession) {
            setSelectedSession(activeSession);
          }
        } else {
          // Teacher: Always use active session, ignore localStorage
          if (activeSession) {
            setSelectedSession(activeSession);
          }
        }
      } catch (error) {
        console.error('Failed to fetch sessions');
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [isAdmin]);

  const selectSession = (session) => {
    if (!isAdmin) return; // Teachers cannot switch sessions
    
    setSelectedSession(session);
    if (session) {
      localStorage.setItem('selectedSessionId', session._id);
    } else {
      localStorage.removeItem('selectedSessionId');
    }
  };

  const isArchived = selectedSession?.status === 'archived';

  return (
    <SessionContext.Provider value={{ 
      selectedSession, 
      allSessions, 
      selectSession, 
      isArchived,
      loading,
      isAdmin
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
};
