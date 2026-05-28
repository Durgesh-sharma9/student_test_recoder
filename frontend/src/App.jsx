import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Login from '@/pages/Login';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import ManageUsers from '@/pages/admin/ManageUsers';
import ManageClasses from '@/pages/admin/ManageClasses';
import ManageStudents from '@/pages/admin/ManageStudents';
import TeacherDashboard from '@/pages/teacher/TeacherDashboard';
import TeacherClasses from '@/pages/teacher/TeacherClasses';
import TeacherResults from '@/pages/teacher/TeacherResults';
import MarksEntry from '@/pages/teacher/MarksEntry';
import TeacherAssignments from '@/pages/admin/TeacherAssignments';
import ResultManagement from '@/pages/admin/ResultManagement';

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role}`} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<RootRedirect />} />
          <Route element={<ProtectedRoute roles={['admin', 'teacher']}><DashboardLayout /></ProtectedRoute>}>
            <Route path="/admin"                element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/teachers"       element={<ProtectedRoute roles={['admin']}><ManageUsers role="teacher" title="Teachers" /></ProtectedRoute>} />
            <Route path="/admin/classes"        element={<ProtectedRoute roles={['admin']}><ManageClasses /></ProtectedRoute>} />
            <Route path="/admin/students"       element={<ProtectedRoute roles={['admin']}><ManageStudents /></ProtectedRoute>} />
            <Route path="/admin/assignments"    element={<ProtectedRoute roles={['admin']}><TeacherAssignments /></ProtectedRoute>} />
            <Route path="/admin/results"        element={<ProtectedRoute roles={['admin']}><ResultManagement /></ProtectedRoute>} />
            <Route path="/teacher"              element={<ProtectedRoute roles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/teacher/classes"      element={<ProtectedRoute roles={['teacher']}><TeacherClasses /></ProtectedRoute>} />
            <Route path="/teacher/marks-entry"  element={<ProtectedRoute roles={['teacher']}><MarksEntry /></ProtectedRoute>} />
            <Route path="/teacher/results"      element={<ProtectedRoute roles={['teacher']}><TeacherResults /></ProtectedRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}