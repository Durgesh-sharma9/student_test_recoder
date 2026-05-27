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
import UploadMarks from '@/pages/teacher/UploadMarks';
import TeacherResults from '@/pages/teacher/TeacherResults';
import ParentDashboard from '@/pages/parent/ParentDashboard';
import ParentProgress from '@/pages/parent/ParentProgress';

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
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RootRedirect />} />

          <Route
            element={
              <ProtectedRoute roles={['admin', 'teacher', 'parent']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/admin/teachers" element={<ProtectedRoute roles={['admin']}><ManageUsers role="teacher" title="Teachers" /></ProtectedRoute>} />
            <Route path="/admin/parents" element={<ProtectedRoute roles={['admin']}><ManageUsers role="parent" title="Parents" /></ProtectedRoute>} />
            <Route path="/admin/classes" element={<ProtectedRoute roles={['admin']}><ManageClasses /></ProtectedRoute>} />
            <Route path="/admin/students" element={<ProtectedRoute roles={['admin']}><ManageStudents /></ProtectedRoute>} />

            <Route path="/teacher" element={<ProtectedRoute roles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/teacher/classes" element={<ProtectedRoute roles={['teacher']}><TeacherClasses /></ProtectedRoute>} />
            <Route path="/teacher/upload" element={<ProtectedRoute roles={['teacher']}><UploadMarks /></ProtectedRoute>} />
            <Route path="/teacher/results" element={<ProtectedRoute roles={['teacher']}><TeacherResults /></ProtectedRoute>} />

            <Route path="/parent" element={<ProtectedRoute roles={['parent']}><ParentDashboard /></ProtectedRoute>} />
            <Route path="/parent/progress" element={<ProtectedRoute roles={['parent']}><ParentProgress /></ProtectedRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
