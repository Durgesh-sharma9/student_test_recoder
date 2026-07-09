import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Settings2, ClipboardList, Download, Save, Search, CheckCircle2, XCircle } from 'lucide-react';
import api from '@/lib/api';
import { formatClassName } from '@/lib/utils';
import { useSubjects } from '@/hooks/useSubjects';
import { useSubscriptionExpiry } from '@/hooks/useSubscriptionExpiry';
import SubjectSelect from '@/components/SubjectSelect';
import { PageHeader, ErpSection, FormField, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import SubscriptionExpiredDialog from '@/components/subscription/SubscriptionExpiredDialog';

const MAIN_EXAMS = ['PA1', 'PA2', 'PA3', 'PA4', 'FA1', 'FA2', 'Half Yearly', 'Final'];

export default function MarksEntryForm({ category, title }) {
  const { isSubscriptionExpired, dialogOpen: expiredDialogOpen, setDialogOpen: setExpiredDialogOpen, checkAndBlock } = useSubscriptionExpiry();
  const isDaily = category === 'daily';
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({
    classId: '',
    subject: '',
    testDate: new Date().toISOString().split('T')[0],
    examType: 'PA1',
    examDate: new Date().toISOString().split('T')[0],
    maxMarks: isDaily ? 20 : 80,
  });
  const [session, setSession] = useState(null);
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorFields, setErrorFields] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const loadRef = useRef(0);
  const [showDailyTestModal, setShowDailyTestModal] = useState(false);
  const [pendingLoadData, setPendingLoadData] = useState(null);
  const [showSessionSelectModal, setShowSessionSelectModal] = useState(false);
  const [availableSessions, setAvailableSessions] = useState([]);

  const { subjects, assignments, loading: subjectsLoading, allowCustom, canAddSubjects, registerSubject, emptyMessage } =
    useSubjects(form.classId, { fetchAllAssignments: isDaily });

  const subjectOptions = useMemo(() => {
    if (!isDaily || !form.classId) return subjects;
    const forClass = assignments
      .filter((a) => a.classId === form.classId)
      .map((a) => a.subject);
    return [...new Set(forClass)].filter(Boolean).sort();
  }, [isDaily, form.classId, subjects, assignments]);

  const filteredRows = useMemo(() => {
    if (!searchQuery) return rows;
    const query = searchQuery.toLowerCase();
    return rows.filter((r) => 
      r.name.toLowerCase().includes(query) || 
      r.rollNo.toLowerCase().includes(query)
    );
  }, [rows, searchQuery]);

  useEffect(() => {
    api.get('/classes').then((c) => {
      setClasses(c.data.classes || []);
    });
  }, []);

  const clearLoadedData = () => {
    setLoaded(false);
    setSession(null);
    setRows([]);
  };

  const loadEntry = async (forceNew = false) => {
    if (!form.classId) return toast.error('Select a class');
    if (!form.subject) return toast.error('Select a subject');
    if (isDaily && !form.testDate) return toast.error('Select a test date');
    if (!isDaily && (!form.examType || !form.examDate)) {
      return toast.error('Select exam type and exam date');
    }

    // Prevent future test dates
    const today = new Date().toISOString().split('T')[0];
    const selectedDate = isDaily ? form.testDate : form.examDate;
    if (selectedDate > today) {
      return toast.error('Future test dates are not allowed.');
    }

    const id = ++loadRef.current;
    setLoadingStudents(true);
    try {
      const params = {
        classId: form.classId,
        subject: form.subject,
        category,
        maxMarks: form.maxMarks,
        ...(isDaily
          ? { testDate: form.testDate }
          : { examType: form.examType, examDate: form.examDate }),
      };
      const res = await api.get('/results/entry-preview', { params });
      if (id !== loadRef.current) return;

      // For daily tests, check if existing sessions exist and show modal
      if (isDaily && res.data.existingCount > 0 && !forceNew) {
        setAvailableSessions(res.data.existingSessions || []);
        if (res.data.existingCount > 1) {
          // Multiple sessions exist - show selection dialog
          setShowSessionSelectModal(true);
          setLoadingStudents(false);
          return;
        } else {
          // Only one session exists - show edit/create modal
          setPendingLoadData({ session: res.data.session, rows: res.data.rows, maxMarks: res.data.maxMarks });
          setShowDailyTestModal(true);
          setLoadingStudents(false);
          return;
        }
      }

      setSession(res.data.session || null);
      setRows(res.data.rows || []);
      setLoaded(true);
      if (res.data.maxMarks) {
        setForm((f) => ({ ...f, maxMarks: res.data.maxMarks }));
      }

      if (res.data.existing) {
        toast.info(res.data.message || (isDaily ? 'Existing Daily Test Loaded' : 'Existing Main Exam Loaded'));
      } else if (isDaily) {
        toast.success('Students loaded. Enter marks and click Save to create the Daily Test.');
      } else {
        toast.success('Students loaded. Enter marks and click Save.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load');
      clearLoadedData();
    } finally {
      if (id === loadRef.current) setLoadingStudents(false);
    }
  };

  const save = async () => {
    if (!loaded || !rows.length) {
      return toast.error(`Click "${isDaily ? 'Load Daily Test' : 'Load Main Exam'}" first to load students`);
    }
    if (!form.classId || !form.subject) {
      return toast.error('Select class and subject');
    }

    // Clear any existing errors before validation
    setErrorFields([]);

    // Check for empty marks (skip absent and not admitted yet students)
    const emptyFields = [];
    rows.forEach((r, idx) => {
      if (r.status !== 'absent' && !r.isNotAdmittedYet && (r.marksObtained === '' || r.marksObtained == null)) {
        emptyFields.push(idx);
      }
    });

    if (emptyFields.length > 0) {
      setErrorFields(emptyFields);
      toast.error('Marks are required for all students.');
      // Scroll to first empty field
      setTimeout(() => {
        const firstErrorInput = document.querySelector(`input[data-index="${emptyFields[0]}"]`);
        if (firstErrorInput) {
          firstErrorInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstErrorInput.focus();
        }
      }, 100);
      return;
    }

    // Check for excess marks
    const excessFields = [];
    const maxMarks = Number(form.maxMarks);
    rows.forEach((r, idx) => {
      const marks = Number(r.marksObtained);
      if (marks > maxMarks) {
        excessFields.push({ idx, name: r.name, marks, maxMarks });
      }
    });

    if (excessFields.length > 0) {
      const firstError = excessFields[0];
      setErrorFields(excessFields.map(e => e.idx));
      toast.error(`${firstError.name} marks exceed maximum marks (${maxMarks}).`);
      // Scroll to first invalid field
      setTimeout(() => {
        const firstErrorInput = document.querySelector(`input[data-index="${firstError.idx}"]`);
        if (firstErrorInput) {
          firstErrorInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstErrorInput.focus();
        }
      }, 100);
      return;
    }

    const entries = rows.map((r) => ({
      studentId: r.studentId,
      marksObtained: r.isNotAdmittedYet ? 0 : (r.marksObtained === '' || r.marksObtained == null ? 0 : Number(r.marksObtained)),
      status: r.isNotAdmittedYet ? 'present' : (r.status || 'present'),
    }));

    setSaving(true);
    try {
      const payload = {
        classId: form.classId,
        subject: form.subject,
        category,
        maxMarks: Number(form.maxMarks),
        entries,
        sessionId: session?._id,
        ...(isDaily
          ? { testDate: form.testDate }
          : { examType: form.examType, examDate: form.examDate }),
      };
      const res = await api.post('/results/entry-save', payload);
      setSession(res.data.session);
      setRows(res.data.rows || []);
      setLoaded(true);
      toast.success(res.data.message || 'Marks saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save marks');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectSession = async (selectedSession) => {
    setShowSessionSelectModal(false);
    setAvailableSessions([]);
    
    setLoadingStudents(true);
    try {
      const params = {
        classId: form.classId,
        subject: form.subject,
        category,
        maxMarks: form.maxMarks,
        sessionId: selectedSession._id,
        ...(isDaily
          ? { testDate: form.testDate }
          : { examType: form.examType, examDate: form.examDate }),
      };
      const res = await api.get('/results/entry-preview', { params });
      
      setSession(res.data.session || null);
      setRows(res.data.rows || []);
      setLoaded(true);
      if (res.data.maxMarks) {
        setForm((f) => ({ ...f, maxMarks: res.data.maxMarks }));
      }
      
      toast.info('Existing Daily Test Loaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load');
      clearLoadedData();
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleCancelSessionSelect = () => {
    setShowSessionSelectModal(false);
    setAvailableSessions([]);
  };

  const handleEditExisting = () => {
    if (pendingLoadData) {
      setSession(pendingLoadData.session);
      setRows(pendingLoadData.rows);
      setLoaded(true);
      if (pendingLoadData.maxMarks) {
        setForm((f) => ({ ...f, maxMarks: pendingLoadData.maxMarks }));
      }
      toast.info('Existing Daily Test Loaded');
    }
    setShowDailyTestModal(false);
    setPendingLoadData(null);
  };

  const handleCreateNew = async () => {
    // Close both modals
    setShowDailyTestModal(false);
    setShowSessionSelectModal(false);
    setPendingLoadData(null);
    setAvailableSessions([]);
    
    // Force load without checking for existing - pass forceNew=true to backend
    setLoadingStudents(true);
    try {
      const params = {
        classId: form.classId,
        subject: form.subject,
        category,
        maxMarks: form.maxMarks,
        forceNew: 'true',
        ...(isDaily
          ? { testDate: form.testDate }
          : { examType: form.examType, examDate: form.examDate }),
      };
      const res = await api.get('/results/entry-preview', { params });
      
      // Explicitly set session to null to ensure new session is created on save
      setSession(null);
      setRows(res.data.rows || []);
      setLoaded(true);
      if (res.data.maxMarks) {
        setForm((f) => ({ ...f, maxMarks: res.data.maxMarks }));
      }
      
      toast.success('Students loaded. Enter marks and click Save to create the Daily Test.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load');
      clearLoadedData();
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleCancelModal = () => {
    setShowDailyTestModal(false);
    setPendingLoadData(null);
  };

  const download = () => {
    if (!loaded) return toast.error('Load the test before downloading');
    const csv = ['Roll No,Name,Marks,Date'];
    const dateCol = isDaily ? form.testDate : form.examDate;
    rows.forEach((r) => csv.push(`${r.rollNo},${r.name},${r.marksObtained ?? ''},${dateCol}`));
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${category}_marks.csv`;
    a.click();
  };

  const loadButtonLabel = isDaily ? 'Load Daily Test' : 'Load Main Exam';

  return (
    <PageStack>
      <PageHeader title={title} description={`Enter and save ${isDaily ? 'daily test' : 'main exam'} marks for your students.`} />

      <ErpSection title="Session Setup" icon={Settings2} tone="orange">
        <div className="rounded-xl border border-orange-100 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/30 p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 items-start">
            <FormField label="Class" className="space-y-1.5">
              <Select
                value={form.classId || undefined}
                onValueChange={(v) => {
                  setForm({ ...form, classId: v, subject: '' });
                  clearLoadedData();
                }}
              >
                <SelectTrigger className="h-9 rounded-md bg-white border-orange-200 focus:ring-orange-500 shadow-sm"><SelectValue placeholder="Class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c._id} value={c._id}>{formatClassName(c.className)} {c.section}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Subject" className="space-y-1.5">
              <div className="[&>button]:h-9 [&>button]:rounded-md [&>button]:bg-white [&>button]:border-orange-200 [&>button]:shadow-sm">
                <SubjectSelect
                  value={form.subject}
                  onChange={(subject) => {
                    setForm((f) => ({ ...f, subject }));
                    clearLoadedData();
                  }}
                  subjects={subjectOptions}
                  loading={subjectsLoading}
                  allowCustom={allowCustom}
                  canAddSubjects={canAddSubjects}
                  onRegisterSubject={registerSubject}
                  emptyMessage={emptyMessage}
                  placeholder="Search subject"
                />
              </div>
            </FormField>

            {isDaily ? (
              <FormField label="Test Date" className="space-y-1.5">
                <Input
                  type="date"
                  value={form.testDate}
                  onChange={(e) => {
                    setForm({ ...form, testDate: e.target.value });
                    clearLoadedData();
                  }}
                  className="h-9 rounded-md bg-white border-orange-200 focus-visible:ring-orange-500 shadow-sm"
                />
              </FormField>
            ) : (
              <>
                <FormField label="Exam Type" className="space-y-1.5">
                  <Select
                    value={form.examType}
                    onValueChange={(v) => {
                      setForm({ ...form, examType: v });
                      clearLoadedData();
                    }}
                  >
                    <SelectTrigger className="h-9 rounded-md bg-white border-orange-200 shadow-sm"><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      {MAIN_EXAMS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Exam Date" className="space-y-1.5">
                  <Input
                    type="date"
                    value={form.examDate}
                    onChange={(e) => {
                      setForm({ ...form, examDate: e.target.value });
                      clearLoadedData();
                    }}
                    className="h-9 rounded-md bg-white border-orange-200 focus-visible:ring-orange-500 shadow-sm"
                  />
                </FormField>
              </>
            )}

            <FormField label="Max Marks" className="space-y-1.5">
              <Input
                type="number"
                placeholder="Max Marks"
                value={form.maxMarks}
                onChange={(e) => setForm({ ...form, maxMarks: e.target.value })}
                className="h-9 rounded-md bg-white border-orange-200 focus-visible:ring-orange-500 shadow-sm"
              />
            </FormField>

            <div className="flex sm:col-span-2 md:col-span-3 lg:col-span-5 justify-end pt-2 border-t border-orange-100/60 mt-1">
              <Button 
                type="button" 
                onClick={() => { if (!checkAndBlock(() => loadEntry())) return; }} 
                disabled={loadingStudents} 
                className="h-9 rounded-md w-full sm:w-auto bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-sm px-8 font-medium transition-all"
              >
                {loadingStudents ? 'Loading Students...' : loadButtonLabel}
              </Button>
            </div>
          </div>
        </div>
      </ErpSection>

      {loaded && rows.length > 0 && (
        <ErpSection
          title="Marks Table"
          icon={ClipboardList}
          tone="green"
          action={
            <div className="flex items-center">
              <span className="inline-flex items-center rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold tracking-wide text-indigo-700 shadow-sm">
                MAX MARKS: {form.maxMarks}
              </span>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Toolbar above table */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search roll or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 rounded-full bg-slate-50 border-slate-200 focus-visible:ring-indigo-500 text-sm shadow-sm transition-all hover:bg-white focus:bg-white"
                />
              </div>
              
              <div className="flex items-center gap-2 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-full shadow-sm">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {session ? (isDaily ? 'Editing saved daily test' : 'Editing saved main exam') : 'New entry active'}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 border-b border-slate-200">
                    <TableHead className="h-10 py-2 text-xs font-bold text-slate-600 uppercase tracking-wider w-[80px]">Roll</TableHead>
                    <TableHead className="h-10 py-2 text-xs font-bold text-slate-600 uppercase tracking-wider">Name</TableHead>
                    <TableHead className="h-10 py-2 text-xs font-bold text-slate-600 uppercase tracking-wider w-[140px]">Status</TableHead>
                    <TableHead className="h-10 py-2 text-xs font-bold text-slate-600 uppercase tracking-wider w-[120px]">Marks</TableHead>
                    <TableHead className="h-10 py-2 text-xs font-bold text-slate-600 uppercase tracking-wider w-[80px]">Rank</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-slate-500 bg-slate-50/50">
                        No students found matching your search.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((r, idx) => {
                      const originalIdx = rows.findIndex(row => row.studentId === r.studentId);
                      const isAbsent = r.status === 'absent';
                      const isNotAdmittedYet = r.isNotAdmittedYet;
                      return (
                        <TableRow 
                          key={r.studentId}
                          className={`transition-colors ${
                            isNotAdmittedYet 
                              ? 'bg-slate-100/50 hover:bg-slate-100' 
                              : isAbsent 
                                ? 'bg-rose-50/30 hover:bg-rose-50/50' 
                                : 'hover:bg-blue-50/30'
                          }`}
                        >
                          <TableCell className={`py-2 text-sm ${isNotAdmittedYet || isAbsent ? 'text-slate-400' : 'text-slate-600'}`}>
                            {r.rollNo}
                          </TableCell>
                          <TableCell className={`py-2 text-sm ${isNotAdmittedYet || isAbsent ? 'font-normal text-slate-400' : 'font-semibold text-slate-800'}`}>
                            {r.name}
                          </TableCell>
                          <TableCell className="py-2">
                            {isNotAdmittedYet ? (
                              <div className="h-8 w-28 flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                                Not Admitted Yet
                              </div>
                            ) : (
                              <Select
                                value={r.status || 'present'}
                                onValueChange={(value) => {
                                  setRows((prev) =>
                                    prev.map((x, i) => {
                                      if (i === originalIdx) {
                                        const newStatus = value;
                                        const newMarks = newStatus === 'absent' ? '' : x.marksObtained;
                                        return { ...x, status: newStatus, marksObtained: newMarks };
                                      }
                                      return x;
                                    })
                                  );
                                }}
                              >
                                <SelectTrigger 
                                  className={`h-8 w-28 text-xs font-medium rounded-md border shadow-sm transition-colors ${
                                    isAbsent 
                                      ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100' 
                                      : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                  }`}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="present" className="text-xs font-medium text-emerald-700">Present</SelectItem>
                                  <SelectItem value="absent" className="text-xs font-medium text-rose-700">Absent</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                          <TableCell className="py-2">
                            <Input
                              data-index={originalIdx}
                              type="number"
                              min="0"
                              max={form.maxMarks}
                              value={r.marksObtained}
                              disabled={isAbsent || isNotAdmittedYet}
                              placeholder={isAbsent ? 'AB' : isNotAdmittedYet ? 'NA' : '0'}
                              onChange={(e) => {
                                setRows((prev) =>
                                  prev.map((x, i) => (i === originalIdx ? { ...x, marksObtained: e.target.value } : x))
                                );
                                if (errorFields.includes(originalIdx)) {
                                  setErrorFields((prev) => prev.filter((i) => i !== originalIdx));
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const nextInput = document.querySelector(`input[data-index="${originalIdx + 1}"]`);
                                  if (nextInput) {
                                    nextInput.focus();
                                  }
                                }
                              }}
                              className={`h-8 w-20 text-center text-sm font-bold rounded-md [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all ${
                                errorFields.includes(originalIdx) 
                                  ? 'border-red-500 ring-2 ring-red-500/20 focus-visible:ring-red-500 bg-red-50 text-red-700' 
                                  : isNotAdmittedYet 
                                    ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                                    : isAbsent 
                                      ? 'bg-transparent border-transparent text-rose-400 font-medium'
                                      : 'bg-white border-slate-200 text-indigo-700 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 shadow-sm'
                              }`}
                            />
                          </TableCell>
                          <TableCell className="py-2 text-sm font-medium text-slate-400">
                            {r.rankSubject ? (
                              <span className="inline-flex items-center justify-center bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-600">
                                #{r.rankSubject}
                              </span>
                            ) : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Sticky Action Footer */}
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/50 to-blue-50/50 p-3.5 shadow-sm">
              <span className="text-sm font-medium text-indigo-800 px-2 text-center sm:text-left flex items-center flex-wrap gap-1.5">
                Double-check entries before saving. Press 
                <kbd className="px-1.5 py-0.5 rounded-md border border-indigo-200 bg-white font-mono text-[11px] text-indigo-600 shadow-sm">Enter</kbd> 
                to jump to the next student.
              </span>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button 
                  onClick={() => { if (!checkAndBlock(() => save())) return; }} 
                  disabled={saving} 
                  className="h-10 rounded-md w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-700 hover:to-green-600 text-white shadow-md px-8 font-semibold transition-all"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Saving...' : session ? 'Update Marks' : 'Save Marks'}
                </Button>
              </div>
            </div>
          </div>
        </ErpSection>
      )}

      {!loaded && (
        <div className="mt-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-10 text-center transition-all hover:bg-slate-50 hover:border-slate-300">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
            <ClipboardList className="h-6 w-6 text-orange-500" />
          </div>
          <h3 className="text-sm font-bold text-slate-700 mb-1">Ready to enter marks?</h3>
          <p className="text-sm font-medium text-slate-500">
            Select the class, subject, and {isDaily ? 'date' : 'exam details'} above, then click "{loadButtonLabel}" to begin.
          </p>
        </div>
      )}

      <SubscriptionExpiredDialog
        open={expiredDialogOpen}
        onOpenChange={setExpiredDialogOpen}
      />

      {/* Session Selection Modal for Multiple Existing Tests */}
      {showSessionSelectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
              <h3 className="text-lg font-bold text-white">Select Daily Test</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                Multiple Daily Tests exist for the selected Class, Subject and Date.
                Select which one to edit:
              </p>
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                {availableSessions.map((session, idx) => {
                  const createdDate = new Date(session.createdAt);
                  const formattedDate = createdDate.toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  });
                  const formattedTime = createdDate.toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  return (
                    <button
                      key={session._id}
                      onClick={() => handleSelectSession(session)}
                      className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                    >
                      <div className="text-xs font-semibold text-slate-700">
                        Daily Test #{idx + 1}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {formattedDate} at {formattedTime}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col gap-2">
                <Button
                  onClick={handleCreateNew}
                  className="w-full h-10 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-md font-medium"
                >
                  + Create New Daily Test
                </Button>
                <Button
                  onClick={handleCancelSessionSelect}
                  variant="outline"
                  className="w-full h-10 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-md font-medium"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily Test Already Exists Modal */}
      {showDailyTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
              <h3 className="text-lg font-bold text-white">Daily Test Already Exists</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-6">
                A Daily Test already exists for the selected Class, Subject and Date.
                What would you like to do?
              </p>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={handleEditExisting}
                  className="w-full h-10 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-md font-medium"
                >
                  ✏ Edit Existing Test
                </Button>
                <Button
                  onClick={handleCreateNew}
                  className="w-full h-10 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-md font-medium"
                >
                  ➕ Create New Daily Test
                </Button>
                <Button
                  onClick={handleCancelModal}
                  variant="outline"
                  className="w-full h-10 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-md font-medium"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageStack>
  );
}