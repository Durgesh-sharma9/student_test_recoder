import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export function useSubjects(classId, options = {}) {
  const { enabled = true, fetchAllAssignments = false } = options;
  const { user } = useAuth();
  const role = user?.role === 'admin' ? 'school_admin' : user?.role;
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [canAddSubjects, setCanAddSubjects] = useState(false);
  const [loading, setLoading] = useState(enabled);
  const classFilter = fetchAllAssignments ? null : classId;

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        if (role === 'teacher') {
          const params = classFilter ? { classId: classFilter } : {};
          const res = await api.get('/teacher/subjects', { params });
          if (cancelled) return;
          setSubjects(res.data.subjects || []);
          setAssignments(res.data.assignments || []);
          setCanAddSubjects(false);
        } else if (role === 'school_admin') {
          const params = classFilter ? { classId: classFilter } : {};
          const res = await api.get('/subjects', { params });
          if (cancelled) return;
          setSubjects(res.data.subjects || []);
          setAssignments([]);
          setCanAddSubjects(true);
        } else {
          setSubjects([]);
          setAssignments([]);
        }
      } catch {
        if (!cancelled) {
          setSubjects([]);
          setAssignments([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (role === 'teacher' || role === 'school_admin') load();
    else setLoading(false);

    return () => { cancelled = true; };
  }, [classFilter, role, enabled]);

  const registerSubject = async (subject) => {
    const name = String(subject || '').trim().toUpperCase();
    if (!name || !canAddSubjects) return name;
    await api.post('/subjects', { subject: name });
    setSubjects((prev) => [...new Set([...prev, name])].sort());
    return name;
  };

  return {
    subjects,
    assignments,
    loading,
    canAddSubjects,
    allowCustom: role === 'school_admin' || role === 'teacher',
    isTeacher: role === 'teacher',
    registerSubject,
    emptyMessage:
      role === 'teacher'
        ? 'No subjects assigned for this class. Contact your School Admin.'
        : 'No subjects found yet. Type a name to add one to your school catalog.',
  };
}
