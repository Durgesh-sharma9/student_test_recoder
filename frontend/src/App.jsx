import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { SessionProvider } from '@/context/SessionContext';
import { SubscriptionProvider } from '@/context/SubscriptionContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import VerifyEmail from '@/pages/VerifyEmail';
import AuthCallback from '@/pages/AuthCallback';
import SuperDashboard from '@/pages/super/SuperDashboard';
import SuperSchools from '@/pages/super/SuperSchools';
import SuperSchoolDetails from '@/pages/super/SuperSchoolDetails';
import SuperPlans from '@/pages/super/SuperPlans';
import TrialSettings from '@/pages/super/TrialSettings';
import SuperSubscriptionRequests from '@/pages/super/SuperSubscriptionRequests';
import SuperPaymentSettings from '@/pages/super/SuperPaymentSettings';
import AdminDashboard from '@/pages/admin/AdminDashboard';
// App.jsx ke top par ye import add karein:
import AdminNotifications from '@/pages/admin/AdminNotifications';
import AdminPlans from '@/pages/admin/AdminPlans';
import ManageUsers from '@/pages/admin/ManageUsers';
import ManageClasses from '@/pages/admin/ManageClasses';
import ManageStudents from '@/pages/admin/ManageStudents';
import TeacherAssignments from '@/pages/admin/TeacherAssignments';
import ResultManagement from '@/pages/admin/ResultManagement';
import ClassResults from '@/pages/admin/ClassResults';
import AcademicSessions from '@/pages/admin/AcademicSessions';
import ManageParents from '@/pages/admin/ManageParents';
import SecuritySettings from '@/pages/admin/SecuritySettings';
import TeacherPerformance from '@/pages/admin/TeacherPerformance';
import TeacherPerformanceDetail from '@/pages/admin/TeacherPerformanceDetail';
import TeacherDashboard from '@/pages/teacher/TeacherDashboard';
import TeacherClasses from '@/pages/teacher/TeacherClasses';
import DailyTestEntry from '@/pages/teacher/DailyTestEntry';
import MainExamEntry from '@/pages/teacher/MainExamEntry';
import TeacherResults from '@/pages/teacher/TeacherResults';
import TeacherNotifications from '@/pages/teacher/Notifications';
import TeacherSettings from '@/pages/teacher/TeacherSettings';
import ParentDashboard from '@/pages/parent/Dashboard';
import ParentSettings from '@/pages/parent/ParentSettings';
import ParentNotifications from '@/pages/parent/ParentNotifications';
import ParentViewResults from '@/pages/parent/ParentViewResults';
import ParentLogin from '@/pages/ParentLogin';
import StudentDetails from '@/pages/parent/StudentDetails';
import ResultsHistory from '@/pages/parent/ResultsHistory';
import ParentDailyTests from '@/pages/parent/DailyTests';
import ParentMainExams from '@/pages/parent/MainExams';
import ParentExamDetails from '@/pages/parent/ExamDetails';
import ChangePassword from '@/pages/ChangePassword';
import RequireFeature from '@/components/subscription/RequireFeature';
import SuperNotifications from '@/pages/super/SuperNotifications';

import NotebookChecking from '@/pages/teacher/NotebookChecking';
import NotebookAnalytics from '@/pages/admin/NotebookAnalytics';
import NotebookProgress from '@/pages/parent/NotebookProgress';

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
        <SubscriptionProvider>
          <BrowserRouter>
            <Toaster position="top-right" richColors />
            <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/login" element={<Login />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/parent-login" element={<ParentLogin />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            <Route element={<ProtectedRoute roles={['super_admin', 'school_admin', 'admin', 'teacher', 'parent']}><DashboardLayout /></ProtectedRoute>}>
              <Route path="/super-admin" element={<ProtectedRoute roles={['super_admin']}><SuperDashboard /></ProtectedRoute>} />
              <Route path="/super-admin/notifications" element={<ProtectedRoute roles={['super_admin']}><SuperNotifications /></ProtectedRoute>} /> {/* YEH NAYI LINE ADD KI HAI */}
              <Route path="/super-admin/schools" element={<ProtectedRoute roles={['super_admin']}><SuperSchools /></ProtectedRoute>} />
              <Route path="/super-admin/schools/:id" element={<ProtectedRoute roles={['super_admin']}><SuperSchoolDetails /></ProtectedRoute>} />
              <Route path="/super-admin/plans" element={<ProtectedRoute roles={['super_admin']}><SuperPlans /></ProtectedRoute>} />
              <Route path="/super-admin/trial-settings" element={<ProtectedRoute roles={['super_admin']}><TrialSettings /></ProtectedRoute>} />
              <Route path="/super-admin/subscription-requests" element={<ProtectedRoute roles={['super_admin']}><SuperSubscriptionRequests /></ProtectedRoute>} />
              <Route path="/super-admin/payment-settings" element={<ProtectedRoute roles={['super_admin']}><SuperPaymentSettings /></ProtectedRoute>} />

              <Route path="/admin" element={<ProtectedRoute roles={['school_admin', 'admin']}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/notifications" element={<ProtectedRoute roles={['school_admin', 'admin']}><AdminNotifications /></ProtectedRoute>} /> {/* Ye add karein */}
              <Route path="/admin/plans" element={<ProtectedRoute roles={['school_admin', 'admin']}><AdminPlans /></ProtectedRoute>} />
              <Route path="/admin/teachers" element={<ProtectedRoute roles={['school_admin', 'admin']}><RequireFeature featureKey="teacher_portal" label="Teacher Portal"><ManageUsers /></RequireFeature></ProtectedRoute>} />
              <Route path="/admin/classes" element={<ProtectedRoute roles={['school_admin', 'admin']}><ManageClasses /></ProtectedRoute>} />
              <Route path="/admin/students" element={<ProtectedRoute roles={['school_admin', 'admin']}><RequireFeature featureKey="student_portal" label="Student Portal"><ManageStudents /></RequireFeature></ProtectedRoute>} />
              <Route path="/admin/parents" element={<ProtectedRoute roles={['school_admin', 'admin']}><RequireFeature featureKey="parent_portal" label="Parent Portal"><ManageParents /></RequireFeature></ProtectedRoute>} />
              <Route path="/admin/assignments" element={<ProtectedRoute roles={['school_admin', 'admin']}><RequireFeature featureKey="teacher_portal" label="Teacher Portal"><TeacherAssignments /></RequireFeature></ProtectedRoute>} />
              <Route path="/admin/results" element={<ProtectedRoute roles={['school_admin', 'admin']}><RequireFeature featureKey="reports" label="Reports"><ResultManagement /></RequireFeature></ProtectedRoute>} />
              <Route path="/admin/class-results" element={<ProtectedRoute roles={['school_admin', 'admin']}><RequireFeature featureKey="reports" label="Reports"><ClassResults /></RequireFeature></ProtectedRoute>} />
              <Route path="/admin/teacher-performance" element={<ProtectedRoute roles={['school_admin', 'admin']}><RequireFeature featureKey="teacher_performance" label="Teacher Performance"><TeacherPerformance /></RequireFeature></ProtectedRoute>} />
              <Route path="/admin/teacher-performance/view" element={<ProtectedRoute roles={['school_admin', 'admin']}><RequireFeature featureKey="teacher_performance" label="Teacher Performance"><TeacherPerformanceDetail /></RequireFeature></ProtectedRoute>} />
              <Route path="/admin/academic-sessions" element={<ProtectedRoute roles={['school_admin', 'admin']}><RequireFeature featureKey="academic_session" label="Academic Session"><AcademicSessions /></RequireFeature></ProtectedRoute>} />
              <Route path="/admin/security" element={<ProtectedRoute roles={['school_admin', 'admin']}><SecuritySettings /></ProtectedRoute>} />
              <Route path="/admin/notebook-analytics" element={<ProtectedRoute roles={['school_admin', 'admin']}><RequireFeature featureKey="reports" label="Reports"><NotebookAnalytics /></RequireFeature></ProtectedRoute>} />

              <Route path="/teacher" element={<ProtectedRoute roles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
              <Route path="/teacher/notifications" element={<ProtectedRoute roles={['teacher']}><RequireFeature featureKey="notifications" label="Notifications"><TeacherNotifications /></RequireFeature></ProtectedRoute>} />
              <Route path="/teacher/classes" element={<ProtectedRoute roles={['teacher']}><RequireFeature featureKey="teacher_portal" label="Teacher Portal"><TeacherClasses /></RequireFeature></ProtectedRoute>} />
              <Route path="/teacher/daily-test" element={<ProtectedRoute roles={['teacher']}><RequireFeature featureKey="daily_test" label="Daily Test"><DailyTestEntry /></RequireFeature></ProtectedRoute>} />
              <Route path="/teacher/main-exam" element={<ProtectedRoute roles={['teacher']}><RequireFeature featureKey="main_exam" label="Main Exam"><MainExamEntry /></RequireFeature></ProtectedRoute>} />
              <Route path="/teacher/results" element={<ProtectedRoute roles={['teacher']}><RequireFeature featureKey="reports" label="Reports"><TeacherResults /></RequireFeature></ProtectedRoute>} />
              <Route path="/teacher/settings" element={<ProtectedRoute roles={['teacher']}><TeacherSettings /></ProtectedRoute>} />
              <Route path="/teacher/marks-entry" element={<Navigate to="/teacher/daily-test" replace />} />
              <Route path="/teacher/notebook-checking" element={<ProtectedRoute roles={['teacher']}><RequireFeature featureKey="teacher_portal" label="Teacher Portal"><NotebookChecking /></RequireFeature></ProtectedRoute>} />

              <Route path="/parent/dashboard" element={<ProtectedRoute roles={['parent']}><RequireFeature featureKey="parent_portal" label="Parent Portal"><ParentDashboard /></RequireFeature></ProtectedRoute>} />
              <Route path="/parent/notebook-progress" element={<ProtectedRoute roles={['parent']}><RequireFeature featureKey="parent_portal" label="Parent Portal"><NotebookProgress /></RequireFeature></ProtectedRoute>} />
              <Route path="/parent/results" element={<ProtectedRoute roles={['parent']}><RequireFeature featureKey="reports" label="Reports"><ParentViewResults /></RequireFeature></ProtectedRoute>} />
              <Route path="/parent/settings" element={<ProtectedRoute roles={['parent']}><ParentSettings /></ProtectedRoute>} />
              <Route path="/parent/notifications" element={<ProtectedRoute roles={['parent']}><RequireFeature featureKey="notifications" label="Notifications"><ParentNotifications /></RequireFeature></ProtectedRoute>} />
              <Route path="/parent/student/:studentId" element={<ProtectedRoute roles={['parent']}><StudentDetails /></ProtectedRoute>} />
              <Route path="/parent/student/:studentId/results" element={<ProtectedRoute roles={['parent']}><ParentViewResults /></ProtectedRoute>} />
              <Route path="/parent/student/:studentId/results-history" element={<ProtectedRoute roles={['parent']}><ResultsHistory /></ProtectedRoute>} />
              <Route path="/parent/student/:studentId/daily-tests" element={<ProtectedRoute roles={['parent']}><ParentDailyTests /></ProtectedRoute>} />
              <Route path="/parent/student/:studentId/main-exams" element={<ProtectedRoute roles={['parent']}><ParentMainExams /></ProtectedRoute>} />
              <Route path="/parent/student/:studentId/main-exams/:examType" element={<ProtectedRoute roles={['parent']}><ParentExamDetails /></ProtectedRoute>} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </SubscriptionProvider>
      </SessionProvider>
    </AuthProvider>
  );
}
