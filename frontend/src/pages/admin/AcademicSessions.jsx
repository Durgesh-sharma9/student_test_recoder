import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Calendar, Lock, Plus, Edit2, Download, FileText, BarChart3 } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AcademicSessions() {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [showReports, setShowReports] = useState(false);
  const [reportFilters, setReportFilters] = useState({
    sessionId: '',
    classId: '',
    reportType: 'daily',
    examType: 'PA1',
  });

  const [formData, setFormData] = useState({
    sessionName: '',
    startDate: '',
    endDate: '',
  });

  const [classes, setClasses] = useState([]);

  useEffect(() => {
    fetchSessions();
    fetchActiveSession();
    fetchClasses();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await api.get('/academic-sessions');
      setSessions(res.data.sessions);
    } catch (error) {
      toast.error('Failed to fetch sessions');
    }
  };

  const fetchActiveSession = async () => {
    try {
      const res = await api.get('/academic-sessions/active');
      setActiveSession(res.data.session);
    } catch (error) {
      console.error('Failed to fetch active session');
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      setClasses(res.data.classes || []);
    } catch (error) {
      console.error('Failed to fetch classes');
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    try {
      await api.post('/academic-sessions', formData);
      toast.success('New session created successfully');
      setShowCreateForm(false);
      setFormData({ sessionName: '', startDate: '', endDate: '' });
      fetchSessions();
      fetchActiveSession();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create session');
    }
  };

  const handleUpdateSession = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/academic-sessions/${editingSession._id}`, formData);
      toast.success('Session updated successfully');
      setShowEditForm(false);
      setEditingSession(null);
      setFormData({ sessionName: '', startDate: '', endDate: '' });
      fetchSessions();
      fetchActiveSession();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update session');
    }
  };

  const handleEditClick = (session) => {
    if (session.status !== 'active') {
      toast.error('Only active sessions can be edited');
      return;
    }
    setEditingSession(session);
    setFormData({
      sessionName: session.sessionName,
      startDate: new Date(session.startDate).toISOString().split('T')[0],
      endDate: new Date(session.endDate).toISOString().split('T')[0],
    });
    setShowEditForm(true);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleDownloadReport = async (format) => {
    try {
      const params = new URLSearchParams({
        sessionId: reportFilters.sessionId,
        classId: reportFilters.classId,
        format,
      });

      if (reportFilters.reportType === 'main') {
        params.append('category', 'main');
        params.append('examType', reportFilters.examType);
      } else {
        params.append('category', 'daily');
        params.append('view', 'daily');
      }

      const res = await api.get(`/results/download?${params.toString()}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `session-report.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Report downloaded successfully');
    } catch (error) {
      toast.error('Failed to download report');
    }
  };

  return (
    <PageStack>
      <PageHeader
        title="Academic Sessions"
        description="Manage academic sessions and view session reports."
      />

      {/* Current Active Session */}
      {activeSession && (
        <ErpSection title="Current Active Session" icon={Calendar} tone="blue">
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Session Name</p>
                  <p className="text-lg font-semibold text-slate-900">{activeSession.sessionName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Start Date</p>
                  <p className="text-lg font-semibold text-slate-900">{formatDate(activeSession.startDate)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">End Date</p>
                  <p className="text-lg font-semibold text-slate-900">{formatDate(activeSession.endDate)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Status</p>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-2 w-2 rounded-full bg-green-500" />
                    <p className="text-lg font-semibold text-green-600">Active</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditClick(activeSession)}
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit Session
                </Button>
              </div>
            </CardContent>
          </Card>
        </ErpSection>
      )}

      {/* Create New Session */}
      <ErpSection title="Create New Session" icon={Plus} tone="green">
        {!showCreateForm ? (
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create New Session
          </Button>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>New Academic Session</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateSession} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Session Name
                  </label>
                  <input
                    type="text"
                    value={formData.sessionName}
                    onChange={(e) => setFormData({ ...formData, sessionName: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="e.g., 2027-28"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit">Create Session</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      setFormData({ sessionName: '', startDate: '', endDate: '' });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </ErpSection>

      {/* Edit Session Form */}
      {showEditForm && editingSession && (
        <ErpSection title="Edit Session" icon={Edit2} tone="yellow">
          <Card>
            <CardHeader>
              <CardTitle>Edit Academic Session</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateSession} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Session Name
                  </label>
                  <input
                    type="text"
                    value={formData.sessionName}
                    onChange={(e) => setFormData({ ...formData, sessionName: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit">Update Session</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowEditForm(false);
                      setEditingSession(null);
                      setFormData({ sessionName: '', startDate: '', endDate: '' });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </ErpSection>
      )}

      {/* Session History */}
      <ErpSection title="Session History" icon={FileText} tone="purple">
        <Card>
          <CardContent className="p-6">
            {sessions.length === 0 ? (
              <p className="text-sm text-slate-500">No sessions found.</p>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session._id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-4"
                  >
                    <div className="flex items-center gap-4">
                      {session.status === 'active' ? (
                        <Calendar className="h-5 w-5 text-blue-500" />
                      ) : (
                        <Lock className="h-5 w-5 text-slate-400" />
                      )}
                      <div>
                        <p className="font-semibold text-slate-900">{session.sessionName}</p>
                        <p className="text-sm text-slate-500">
                          {formatDate(session.startDate)} - {formatDate(session.endDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {session.status === 'active' ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                          🟢 Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                          🔒 Archived
                        </span>
                      )}
                      {session.status === 'active' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(session)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </ErpSection>

      {/* Session Reports */}
      <ErpSection title="Session Reports" icon={BarChart3} tone="orange">
        <Card>
          <CardHeader>
            <CardTitle>Generate Session Reports</CardTitle>
          </CardHeader>
          <CardContent>
            {!showReports ? (
              <Button onClick={() => setShowReports(true)}>
                <BarChart3 className="mr-2 h-4 w-4" />
                View Reports
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Session
                    </label>
                    <select
                      value={reportFilters.sessionId}
                      onChange={(e) => setReportFilters({ ...reportFilters, sessionId: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      required
                    >
                      <option value="">Select Session</option>
                      {sessions.map((session) => (
                        <option key={session._id} value={session._id}>
                          {session.sessionName} ({session.status})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Class
                    </label>
                    <select
                      value={reportFilters.classId}
                      onChange={(e) => setReportFilters({ ...reportFilters, classId: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">All Classes</option>
                      {classes.map((cls) => (
                        <option key={cls._id} value={cls._id}>
                          {cls.className}-{cls.section}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Report Type
                    </label>
                    <select
                      value={reportFilters.reportType}
                      onChange={(e) => setReportFilters({ ...reportFilters, reportType: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="daily">Daily Test</option>
                      <option value="main">Main Exam</option>
                    </select>
                  </div>
                  {reportFilters.reportType === 'main' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Exam Type
                      </label>
                      <select
                        value={reportFilters.examType}
                        onChange={(e) => setReportFilters({ ...reportFilters, examType: e.target.value })}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      >
                        <option value="PA1">PA1</option>
                        <option value="PA2">PA2</option>
                        <option value="PA3">PA3</option>
                        <option value="PA4">PA4</option>
                        <option value="FA1">FA1</option>
                        <option value="FA2">FA2</option>
                        <option value="Half Yearly">Half Yearly</option>
                        <option value="Final">Final</option>
                      </select>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleDownloadReport('csv')}
                    disabled={!reportFilters.sessionId}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download CSV
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDownloadReport('pdf')}
                    disabled={!reportFilters.sessionId}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setShowReports(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </ErpSection>
    </PageStack>
  );
}
