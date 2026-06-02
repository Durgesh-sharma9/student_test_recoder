import { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [selectedSession, setSelectedSession] = useState(null);
  const [allSessions, setAllSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await api.get('/academic-sessions');
        setAllSessions(res.data.sessions || []);
        
        // Load saved session from localStorage or default to active
        const savedSessionId = localStorage.getItem('selectedSessionId');
        const activeSession = res.data.sessions?.find(s => s.status === 'active');
        
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
      } catch (error) {
        console.error('Failed to fetch sessions');
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  const selectSession = (session) => {
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
      loading 
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
