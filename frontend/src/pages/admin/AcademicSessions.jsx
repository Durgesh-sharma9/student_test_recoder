import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Calendar, Lock, Plus, Edit2, Download, FileText, BarChart3, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '@/lib/api';
import { PageHeader, ErpSection, PageStack, FormField } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatClassName } from '@/lib/utils';

const EXAM_TYPES = ['Daily Test', 'PA1', 'PA2', 'PA3', 'PA4', 'FA1', 'FA2', 'Half Yearly', 'Final'];

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
    examType: '',
    dateFilterType: 'specific',
    specificDate: '',
    dateFrom: '',
    dateTo: '',
  });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('rollNo_asc');

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

  const fetchResults = async () => {
    if (!reportFilters.sessionId || !reportFilters.classId || !reportFilters.examType) return;

    // For Daily Test, require date filter
    if (reportFilters.examType === 'Daily Test') {
      if (reportFilters.dateFilterType === 'specific' && !reportFilters.specificDate) {
        toast.error('Please select a date for Daily Test report');
        return;
      }
      if (reportFilters.dateFilterType === 'range' && (!reportFilters.dateFrom || !reportFilters.dateTo)) {
        toast.error('Please select date range for Daily Test report');
        return;
      }
    }

    setLoading(true);
    try {
      let params = { 
        classId: reportFilters.classId, 
        examType: reportFilters.examType,
        sessionId: reportFilters.sessionId,
      };
      
      if (reportFilters.examType === 'Daily Test') {
        params.reportType = 'daily';
        if (reportFilters.dateFilterType === 'specific') {
          params.testDate = reportFilters.specificDate;
        } else {
          params.dateFrom = reportFilters.dateFrom;
          params.dateTo = reportFilters.dateTo;
        }
      }

      const res = await api.get('/class-results', { params });
      setResults(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch results');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = useMemo(() => {
    if (!results?.results) return [];
    const query = searchQuery.toLowerCase();
    let filtered = results.results.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.rollNo.toString().toLowerCase().includes(query)
    );

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'rollNo_asc':
          return Number(a.rollNo) - Number(b.rollNo);
        case 'rollNo_desc':
          return Number(b.rollNo) - Number(a.rollNo);
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'rank_asc':
          return a.rank - b.rank;
        case 'rank_desc':
          return b.rank - a.rank;
        default:
          return Number(a.rollNo) - Number(b.rollNo);
      }
    });

    return filtered;
  }, [results, searchQuery, sortBy]);

  const exportCSV = () => {
    if (!results) return;

    const isDailyTest = reportFilters.examType === 'Daily Test';
    let csvContent;

    if (isDailyTest) {
      // Daily Test format with multi-row headers
      const headerRow1 = ['Total', 'Average', 'Percentage', 'Rank', 'Roll No', 'Student Name'];
      const headerRow2 = ['', '', '', '', '', ''];
      
      results.dailyTests.forEach((dt, idx) => {
        const testName = `Daily Test ${idx + 1}`;
        const dateStr = new Date(dt.testDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        headerRow1.push(testName, '');
        headerRow2.push(`Date: ${dateStr}`, `Subject: ${dt.subject}`);
      });

      const headerRow3 = ['Total', 'Average', 'Percentage', 'Rank', 'Roll No', 'Student Name'];
      results.dailyTests.forEach((dt) => {
        headerRow3.push('Max Marks', 'Marks Obtained');
      });

      const dataRows = filteredResults.map((r) => {
        const row = [r.totalObtained, r.average, r.percentage, r.rank, r.rollNo, r.name];
        results.dailyTests.forEach((dt) => {
          const mark = r.dailyTests[dt._id];
          row.push(dt.maxMarks, mark ? mark.marksObtained : '');
        });
        return row;
      });

      csvContent = [
        headerRow1.join(','),
        headerRow2.join(','),
        headerRow3.join(','),
        ...dataRows.map((row) => row.join(',')),
      ].join('\n');
    } else {
      // Main Exam format
      const headers = ['Rank', 'Roll No', 'Student Name', ...results.subjects, 'Total', 'Average', 'Percentage'];
      const rows = filteredResults.map((r) => {
        const subjectMarks = results.subjects.map((s) => r.subjects[s]?.marksObtained || '-');
        return [
          r.rank,
          r.rollNo,
          r.name,
          ...subjectMarks,
          r.totalObtained,
          r.average,
          r.percentage,
        ];
      });

      csvContent = [
        headers.join(','),
        ...rows.map((row) => row.join(',')),
      ].join('\n');
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `session-results-${reportFilters.examType}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success('CSV exported successfully');
  };

  const exportXLSX = () => {
    if (!results) return;

    const isDailyTest = reportFilters.examType === 'Daily Test';
    let workbook, worksheet;

    if (isDailyTest) {
      const data = [];
      const headerRow1 = ['Total', 'Average', 'Percentage', 'Rank', 'Roll No', 'Student Name'];
      const headerRow2 = ['', '', '', '', '', ''];
      
      results.dailyTests.forEach((dt, idx) => {
        const testName = `Daily Test ${idx + 1}`;
        const dateStr = new Date(dt.testDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        headerRow1.push(testName, '');
        headerRow2.push(`Date: ${dateStr}`, `Subject: ${dt.subject}`);
      });

      const headerRow3 = ['Total', 'Average', 'Percentage', 'Rank', 'Roll No', 'Student Name'];
      results.dailyTests.forEach((dt) => {
        headerRow3.push('Max Marks', 'Marks Obtained');
      });

      data.push(headerRow1, headerRow2, headerRow3);

      filteredResults.forEach((r) => {
        const row = [r.totalObtained, r.average, r.percentage, r.rank, r.rollNo, r.name];
        results.dailyTests.forEach((dt) => {
          const mark = r.dailyTests[dt._id];
          row.push(dt.maxMarks, mark ? mark.marksObtained : '');
        });
        data.push(row);
      });

      worksheet = XLSX.utils.aoa_to_sheet(data);

      let colIndex = 6;
      results.dailyTests.forEach((dt) => {
        worksheet['!merges'] = worksheet['!merges'] || [];
        worksheet['!merges'].push({ s: { r: 0, c: colIndex }, e: { r: 0, c: colIndex + 1 } });
        colIndex += 2;
      });

      const range = XLSX.utils.decode_range(worksheet['!ref']);
      const colWidths = [];
      for (let C = 0; C <= range.e.c; C++) {
        let maxWidth = 12;
        for (let R = 0; R <= range.e.r; R++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = worksheet[cellAddress];
          if (cell && cell.v) {
            const cellValue = String(cell.v);
            maxWidth = Math.max(maxWidth, Math.min(cellValue.length + 4, 30));
          }
        }
        colWidths.push({ wch: maxWidth });
      }
      worksheet['!cols'] = colWidths;
      worksheet['!freeze'] = { xSplit: 6, ySplit: 3 };
    } else {
      const headers = ['Rank', 'Roll No', 'Student Name', ...results.subjects, 'Total', 'Average', 'Percentage'];
      const data = [headers];

      filteredResults.forEach((r) => {
        const subjectMarks = results.subjects.map((s) => r.subjects[s]?.marksObtained || '-');
        data.push([
          r.rank,
          r.rollNo,
          r.name,
          ...subjectMarks,
          r.totalObtained,
          r.average,
          r.percentage,
        ]);
      });

      worksheet = XLSX.utils.aoa_to_sheet(data);

      const range = XLSX.utils.decode_range(worksheet['!ref']);
      const colWidths = [];
      for (let C = 0; C <= range.e.c; C++) {
        let maxWidth = 12;
        for (let R = 0; R <= range.e.r; R++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = worksheet[cellAddress];
          if (cell && cell.v) {
            const cellValue = String(cell.v);
            maxWidth = Math.max(maxWidth, Math.min(cellValue.length + 4, 30));
          }
        }
        colWidths.push({ wch: maxWidth });
      }
      worksheet['!cols'] = colWidths;
      worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };
    }

    workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
    XLSX.writeFile(workbook, `session-results-${reportFilters.examType}-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('XLSX exported successfully');
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
            <div className="grid gap-4 lg:grid-cols-3">
              <FormField label="Session">
                <Select value={reportFilters.sessionId} onValueChange={(value) => setReportFilters({ ...reportFilters, sessionId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select session" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map((s) => (
                      <SelectItem key={s._id} value={s._id}>
                        {s.sessionName} ({s.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Class">
                <Select value={reportFilters.classId} onValueChange={(value) => setReportFilters({ ...reportFilters, classId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {formatClassName(c.className)}-{c.section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Exam Type">
                <Select value={reportFilters.examType} onValueChange={(value) => setReportFilters({ ...reportFilters, examType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select exam type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXAM_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              {reportFilters.examType === 'Daily Test' && (
                <>
                  <FormField label="Date Filter">
                    <Select value={reportFilters.dateFilterType} onValueChange={(value) => setReportFilters({ ...reportFilters, dateFilterType: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="specific">Specific Date</SelectItem>
                        <SelectItem value="range">Date Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                  {reportFilters.dateFilterType === 'specific' ? (
                    <FormField label="Test Date">
                      <Input type="date" value={reportFilters.specificDate} onChange={(e) => setReportFilters({ ...reportFilters, specificDate: e.target.value })} />
                    </FormField>
                  ) : (
                    <>
                      <FormField label="From">
                        <Input type="date" value={reportFilters.dateFrom} onChange={(e) => setReportFilters({ ...reportFilters, dateFrom: e.target.value })} />
                      </FormField>
                      <FormField label="To">
                        <Input type="date" value={reportFilters.dateTo} onChange={(e) => setReportFilters({ ...reportFilters, dateTo: e.target.value })} />
                      </FormField>
                    </>
                  )}
                </>
              )}
              <FormField label="Sort By">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rollNo_asc">Roll No (Ascending)</SelectItem>
                    <SelectItem value="rollNo_desc">Roll No (Descending)</SelectItem>
                    <SelectItem value="name_asc">Student Name (A-Z)</SelectItem>
                    <SelectItem value="name_desc">Student Name (Z-A)</SelectItem>
                    <SelectItem value="rank_asc">Rank (Ascending)</SelectItem>
                    <SelectItem value="rank_desc">Rank (Descending)</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={fetchResults} disabled={!reportFilters.sessionId || !reportFilters.classId || !reportFilters.examType || loading}>
                {loading ? 'Loading...' : 'Show Results'}
              </Button>
              {results && (
                <>
                  <Button variant="outline" onClick={exportCSV}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button variant="outline" onClick={exportXLSX}>
                    <Download className="mr-2 h-4 w-4" />
                    Export XLSX
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </ErpSection>

      {results && (
        <>
          <ErpSection title="Search" icon={Search} tone="blue">
            <FormField label="Search by Student Name or Roll No">
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </FormField>
          </ErpSection>

          <ErpSection title="Results" icon={FileText} tone="green">
            <div className="mb-4 rounded-lg bg-slate-50 p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-slate-700">Session:</span>{' '}
                  <span className="text-slate-600">{sessions.find(s => s._id === reportFilters.sessionId)?.sessionName || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">Class:</span>{' '}
                  <span className="text-slate-600">{formatClassName(results.className)}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">Exam Type:</span>{' '}
                  <span className="text-slate-600">{results.examType}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">Generated:</span>{' '}
                  <span className="text-slate-600">
                    {new Date(results.generatedDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {filteredResults.length === 0 ? (
              <div className="py-8 text-center text-slate-500">No results found</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200" style={{ minWidth: '100%' }}>
                <Table style={{ minWidth: 'max-content' }}>
                  <TableHeader>
                    {reportFilters.examType === 'Daily Test' && (
                      <TableRow>
                        <TableHead className="sticky left-0 bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '60px' }}>Total</TableHead>
                        <TableHead className="sticky left-[60px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '70px' }}>Average</TableHead>
                        <TableHead className="sticky left-[130px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '50px' }}>%</TableHead>
                        <TableHead className="sticky left-[180px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '50px' }}>Rank</TableHead>
                        <TableHead className="sticky left-[230px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '70px' }}>Roll No</TableHead>
                        <TableHead className="sticky left-[300px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '150px' }}>Student Name</TableHead>
                        {results.dailyTests?.map((dt, idx) => (
                          <TableHead key={`${dt._id}-info`} colSpan={2} className="text-center bg-indigo-100 border-r border-indigo-200" style={{ minWidth: '120px' }}>
                            <div className="rounded-lg bg-indigo-600 px-3 py-2 text-white shadow-sm">
                              <div className="text-sm font-bold">Daily Test {idx + 1}</div>
                              <div className="text-xs text-indigo-100">{new Date(dt.testDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                              <div className="text-xs text-indigo-200">{dt.subject}</div>
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    )}
                    <TableRow>
                      {reportFilters.examType === 'Daily Test' ? (
                        <>
                          <TableHead className="sticky left-0 bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '60px' }}>Total</TableHead>
                          <TableHead className="sticky left-[60px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '70px' }}>Average</TableHead>
                          <TableHead className="sticky left-[130px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '50px' }}>%</TableHead>
                          <TableHead className="sticky left-[180px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '50px' }}>Rank</TableHead>
                          <TableHead className="sticky left-[230px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '70px' }}>Roll No</TableHead>
                          <TableHead className="sticky left-[300px] bg-blue-600 text-white z-10 border-r border-blue-500" style={{ minWidth: '150px' }}>Student Name</TableHead>
                          {results.dailyTests?.map((dt) => (
                            <>
                              <TableHead key={`${dt._id}-max`} className="text-center bg-indigo-50 border-r border-indigo-200 font-semibold text-indigo-700" style={{ minWidth: '80px' }}>Max Marks</TableHead>
                              <TableHead key={`${dt._id}-obt`} className="text-center bg-indigo-50 border-r border-indigo-200 font-semibold text-indigo-700" style={{ minWidth: '80px' }}>Marks Obtained</TableHead>
                            </>
                          ))}
                        </>
                      ) : (
                        <>
                          <TableHead>Rank</TableHead>
                          <TableHead>Roll No</TableHead>
                          <TableHead>Student Name</TableHead>
                          {results.subjects.map((subject) => (
                            <TableHead key={subject}>{subject}</TableHead>
                          ))}
                          <TableHead>Total</TableHead>
                          <TableHead>Average</TableHead>
                          <TableHead>Percentage</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResults.map((student, index) => (
                      <TableRow key={student.studentId} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-slate-100 transition-colors`}>
                        {reportFilters.examType === 'Daily Test' ? (
                          <>
                            <TableCell className="sticky left-0 bg-blue-50 z-10 font-bold text-blue-700 border-r border-slate-200" style={{ minWidth: '60px' }}>{student.totalObtained}</TableCell>
                            <TableCell className="sticky left-[60px] bg-blue-50 z-10 font-semibold text-blue-600 border-r border-slate-200" style={{ minWidth: '70px' }}>{student.average}</TableCell>
                            <TableCell className="sticky left-[130px] bg-blue-50 z-10 font-semibold text-blue-600 border-r border-slate-200" style={{ minWidth: '50px' }}>{student.percentage}%</TableCell>
                            <TableCell className="sticky left-[180px] bg-blue-50 z-10 font-bold text-blue-700 border-r border-slate-200" style={{ minWidth: '50px' }}>{student.rank}</TableCell>
                            <TableCell className="sticky left-[230px] bg-white z-10 border-r border-slate-200" style={{ minWidth: '70px' }}>{student.rollNo}</TableCell>
                            <TableCell className="sticky left-[300px] bg-white z-10 font-medium border-r border-slate-200" style={{ minWidth: '150px' }}>{student.name}</TableCell>
                            {results.dailyTests?.map((dt) => {
                              const mark = student.dailyTests[dt._id];
                              return (
                                <>
                                  <TableCell key={`${dt._id}-max`} className="text-center border-r border-slate-200 text-slate-600" style={{ minWidth: '80px' }}>{dt.maxMarks}</TableCell>
                                  <TableCell key={`${dt._id}-obt`} className="text-center border-r border-slate-200 font-semibold text-indigo-700" style={{ minWidth: '80px' }}>{mark ? mark.marksObtained : ''}</TableCell>
                                </>
                              );
                            })}
                          </>
                        ) : (
                          <>
                            <TableCell className="font-medium">{student.rank}</TableCell>
                            <TableCell>{student.rollNo}</TableCell>
                            <TableCell className="font-medium">{student.name}</TableCell>
                            {results.subjects.map((subject) => (
                              <TableCell key={subject}>
                                {student.subjects[subject]?.marksObtained || '-'}
                              </TableCell>
                            ))}
                            <TableCell className="font-medium">{student.totalObtained}</TableCell>
                            <TableCell>{student.average}</TableCell>
                            <TableCell>{student.percentage}%</TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </ErpSection>
        </>
      )}
    </PageStack>
  );
}
