import { GraduationCap } from 'lucide-react';

export default function ParentDashboard() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="text-center p-8">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
            <GraduationCap className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Parent Dashboard</h1>
        <p className="text-slate-600">Coming Soon</p>
      </div>
    </div>
  );
}
