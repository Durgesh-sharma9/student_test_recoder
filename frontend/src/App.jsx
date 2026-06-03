import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { SessionProvider } from '@/context/SessionContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import SuperDashboard from '@/pages/super/SuperDashboard';
import SuperSchools from '@/pages/super/SuperSchools';
import SuperSchoolDetails from '@/pages/super/SuperSchoolDetails';
import SuperPlans from '@/pages/super/SuperPlans';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import ManageUsers from '@/pages/admin/ManageUsers';
import ManageClasses from '@/pages/admin/ManageClasses';
import ManageStudents from '@/pages/admin/ManageStudents';
import TeacherAssignments from '@/pages/admin/TeacherAssignments';
import ResultManagement from '@/pages/admin/ResultManagement';
import ClassResults from '@/pages/admin/ClassResults';
import AcademicSessions from '@/pages/admin/AcademicSessions';
import ManageParents from '@/pages/admin/ManageParents';
import TeacherDashboard from '@/pages/teacher/TeacherDashboard';
import TeacherClasses from '@/pages/teacher/TeacherClasses';
import DailyTestEntry from '@/pages/teacher/DailyTestEntry';
import MainExamEntry from '@/pages/teacher/MainExamEntry';
import TeacherResults from '@/pages/teacher/TeacherResults';
import ParentDashboard from '@/pages/parent/Dashboard';
import ParentLogin from '@/pages/ParentLogin';
import StudentDetails from '@/pages/parent/StudentDetails';
import ResultsHistory from '@/pages/parent/ResultsHistory';
import ParentDailyTests from '@/pages/parent/DailyTests';
import ParentMainExams from '@/pages/parent/MainExams';
import ParentExamDetails from '@/pages/parent/ExamDetails';

function HomeRoute() {
  const { user, loading } = useAuth();
  console.log('[HomeRoute] Component mounted');
  console.log('[HomeRoute] loading:', loading);
  console.log('[HomeRoute] user:', user);
  
  if (loading) return null;
  
  if (!user) {
    console.log('[HomeRoute] No user, returning Landing');
    return <Landing />;
  }
  
  const role = user.role === 'admin' ? 'school_admin' : user.role;
  console.log('[HomeRoute] User role:', role);
  
  if (role === 'super_admin') {
    console.log('[HomeRoute] Redirecting to /super-admin');
    return <Navigate to="/super-admin" replace />;
  }
  if (role === 'school_admin') {
    console.log('[HomeRoute] Redirecting to /admin');
    return <Navigate to="/admin" replace />;
  }
  if (role === 'parent') {
    console.log('[HomeRoute] Redirecting to /parent/dashboard');
    return <Navigate to="/parent/dashboard" replace />;
  }
  console.log('[HomeRoute] Redirecting to /teacher');
  return <Navigate to="/teacher" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <SessionProvider>
        <BrowserRouter>
          <Toaster position="top-right" richColors />
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/login" element={<Login />} />
            <Route path="/parent-login" element={<ParentLogin />} />
            <Route path="/signup" element={<Signup />} />

            <Route element={<ProtectedRoute roles={['super_admin', 'school_admin', 'admin', 'teacher', 'parent']}><DashboardLayout /></ProtectedRoute>}>
              <Route path="/super-admin" element={<ProtectedRoute roles={['super_admin']}><SuperDashboard /></ProtectedRoute>} />
              <Route path="/super-admin/schools" element={<ProtectedRoute roles={['super_admin']}><SuperSchools /></ProtectedRoute>} />
              <Route path="/super-admin/schools/:id" element={<ProtectedRoute roles={['super_admin']}><SuperSchoolDetails /></ProtectedRoute>} />
              <Route path="/super-admin/plans" element={<ProtectedRoute roles={['super_admin']}><SuperPlans /></ProtectedRoute>} />

              <Route path="/admin" element={<ProtectedRoute roles={['school_admin', 'admin']}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/teachers" element={<ProtectedRoute roles={['school_admin', 'admin']}><ManageUsers /></ProtectedRoute>} />
              <Route path="/admin/classes" element={<ProtectedRoute roles={['school_admin', 'admin']}><ManageClasses /></ProtectedRoute>} />
              <Route path="/admin/students" element={<ProtectedRoute roles={['school_admin', 'admin']}><ManageStudents /></ProtectedRoute>} />
              <Route path="/admin/parents" element={<ProtectedRoute roles={['school_admin', 'admin']}><ManageParents /></ProtectedRoute>} />
              <Route path="/admin/assignments" element={<ProtectedRoute roles={['school_admin', 'admin']}><TeacherAssignments /></ProtectedRoute>} />
              <Route path="/admin/results" element={<ProtectedRoute roles={['school_admin', 'admin']}><ResultManagement /></ProtectedRoute>} />
              <Route path="/admin/class-results" element={<ProtectedRoute roles={['school_admin', 'admin']}><ClassResults /></ProtectedRoute>} />
              <Route path="/admin/academic-sessions" element={<ProtectedRoute roles={['school_admin', 'admin']}><AcademicSessions /></ProtectedRoute>} />

              <Route path="/teacher" element={<ProtectedRoute roles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
              <Route path="/teacher/classes" element={<ProtectedRoute roles={['teacher']}><TeacherClasses /></ProtectedRoute>} />
              <Route path="/teacher/daily-test" element={<ProtectedRoute roles={['teacher']}><DailyTestEntry /></ProtectedRoute>} />
              <Route path="/teacher/main-exam" element={<ProtectedRoute roles={['teacher']}><MainExamEntry /></ProtectedRoute>} />
              <Route path="/teacher/results" element={<ProtectedRoute roles={['teacher']}><TeacherResults /></ProtectedRoute>} />
              <Route path="/teacher/marks-entry" element={<Navigate to="/teacher/daily-test" replace />} />

              <Route path="/parent/dashboard" element={<ProtectedRoute roles={['parent']}><ParentDashboard /></ProtectedRoute>} />
              <Route path="/parent/student/:studentId" element={<ProtectedRoute roles={['parent']}><StudentDetails /></ProtectedRoute>} />
              <Route path="/parent/student/:studentId/results-history" element={<ProtectedRoute roles={['parent']}><ResultsHistory /></ProtectedRoute>} />
              <Route path="/parent/student/:studentId/daily-tests" element={<ProtectedRoute roles={['parent']}><ParentDailyTests /></ProtectedRoute>} />
              <Route path="/parent/student/:studentId/main-exams" element={<ProtectedRoute roles={['parent']}><ParentMainExams /></ProtectedRoute>} />
              <Route path="/parent/student/:studentId/main-exams/:examType" element={<ProtectedRoute roles={['parent']}><ParentExamDetails /></ProtectedRoute>} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SessionProvider>
    </AuthProvider>
  );
}
