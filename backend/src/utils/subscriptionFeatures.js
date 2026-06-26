export const SUBSCRIPTION_FEATURES = [
  { key: 'parent_portal', label: 'Parent Portal' },
  { key: 'teacher_portal', label: 'Teacher Portal' },
  { key: 'student_portal', label: 'Student Portal' },
  { key: 'teacher_performance', label: 'Teacher Performance' },
  { key: 'daily_test', label: 'Daily Test' },
  { key: 'main_exam', label: 'Main Exam' },
  { key: 'reports', label: 'Reports' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'academic_session', label: 'Academic Session' },
  { key: 'import_teachers', label: 'Import Teachers' },
  { key: 'import_students', label: 'Import Students' },
  { key: 'excel_export', label: 'Excel Export' },
  { key: 'pdf_export', label: 'PDF Export' },
  { key: 'email', label: 'Email' },
  { key: 'dashboard_analytics', label: 'Dashboard Analytics' },
  { key: 'website_builder', label: 'Website Builder' },
  { key: 'priority_support', label: 'Priority Support' },
];

export const isFeatureEnabled = (plan, featureKey) => {
  if (!plan) return true;
  const features = plan.features;
  if (!features) return true;

  // Mongoose Map supports .get; plain objects use bracket access
  const value = typeof features.get === 'function' ? features.get(featureKey) : features[featureKey];

  // Missing key defaults to enabled (backward compatibility)
  if (typeof value === 'undefined') return true;
  return Boolean(value);
};

