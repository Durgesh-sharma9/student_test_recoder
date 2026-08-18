import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { SlidersHorizontal, ClipboardList, ClipboardCheck, Save } from 'lucide-react';
import api from '@/lib/api';
import { formatClassName, cn } from '@/lib/utils';
import { useSubjects } from '@/hooks/useSubjects';
import SubjectSelect from '@/components/SubjectSelect';
import { PageHeader, ErpSection, FormField, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const MAIN_EXAMS = ['PA1', 'PA2', 'PA3', 'PA4', 'FA1', 'FA2', 'Half Yearly', 'Final'];

export default function MarksEntryForm({ category, title }) {
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

  const loadEntry = async () => {
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

    // Check for empty marks
    const emptyFields = [];
    rows.forEach((r, idx) => {
      if (r.marksObtained === '' || r.marksObtained == null) {
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
      marksObtained: r.marksObtained === '' || r.marksObtained == null ? 0 : Number(r.marksObtained),
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

  const loadButtonLabel = isDaily ? 'Load Daily Test' : 'Load Main Exam';

  return (
    <PageStack>
      <PageHeader title={title} description={`Enter and save ${isDaily ? 'daily test' : 'main exam'} marks for your students.`} />

      <ErpSection title="Session Setup" icon={SlidersHorizontal} tone={isDaily ? 'orange' : 'indigo'} className="relative z-20">
        <div className="rounded-2xl border border-orange-200/60 p-4 sm:p-5 bg-white space-y-4">
          <div className={`grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 ${isDaily ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
            <FormField label="Class">
              <Select
                value={form.classId || undefined}
                onValueChange={(v) => {
                  setForm({ ...form, classId: v, subject: '' });
                  clearLoadedData();
                }}
              >
                <SelectTrigger className="h-10 text-xs sm:text-sm rounded-xl border-orange-200/70 focus:border-orange-500 focus:ring-orange-500/20"><SelectValue placeholder="Class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c._id} value={c._id} className="text-xs sm:text-sm">{formatClassName(c.className)} {c.section}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Subject">
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
                placeholder="Search assigned subject"
              />
            </FormField>

            {isDaily ? (
              <FormField label="Test Date">
                <Input
                  type="date"
                  className="h-10 text-xs sm:text-sm rounded-xl border-orange-200/70 focus:border-orange-500 focus:ring-orange-500/20"
                  value={form.testDate}
                  onChange={(e) => {
                    setForm({ ...form, testDate: e.target.value });
                    clearLoadedData();
                  }}
                />
              </FormField>
            ) : (
              <>
                <FormField label="Exam Type">
                  <Select
                    value={form.examType}
                    onValueChange={(v) => {
                      setForm({ ...form, examType: v });
                      clearLoadedData();
                    }}
                  >
                    <SelectTrigger className="h-10 text-xs sm:text-sm rounded-xl border-orange-200/70 focus:border-orange-500 focus:ring-orange-500/20"><SelectValue placeholder="Exam Type" /></SelectTrigger>
                    <SelectContent>
                      {MAIN_EXAMS.map((e) => <SelectItem key={e} value={e} className="text-xs sm:text-sm">{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Exam Date">
                  <Input
                    type="date"
                    className="h-10 text-xs sm:text-sm rounded-xl border-orange-200/70 focus:border-orange-500 focus:ring-orange-500/20"
                    value={form.examDate}
                    onChange={(e) => {
                      setForm({ ...form, examDate: e.target.value });
                      clearLoadedData();
                    }}
                  />
                </FormField>
              </>
            )}

            <FormField label="Max Marks">
              <Input
                type="number"
                placeholder="Max Marks"
                className="h-10 text-xs sm:text-sm rounded-xl border-orange-200/70 focus:border-orange-500 focus:ring-orange-500/20"
                value={form.maxMarks}
                onChange={(e) => setForm({ ...form, maxMarks: e.target.value })}
              />
            </FormField>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              onClick={loadEntry}
              disabled={loadingStudents}
              className={cn(
                'h-10 px-7 text-xs sm:text-sm font-bold rounded-xl text-white shadow-md transition-all cursor-pointer hover:opacity-95 active:scale-[0.98]',
                isDaily
                  ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 shadow-orange-500/25'
                  : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 shadow-indigo-500/25'
              )}
            >
              {loadingStudents ? 'Loading...' : loadButtonLabel}
            </Button>
          </div>
        </div>
      </ErpSection>

      {!loaded && (
        <div className="flex flex-col items-center justify-center p-6 sm:p-10 rounded-xl border border-dashed border-orange-200 bg-orange-50/20 text-center shadow-xs">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-500 mb-2.5 shadow-xs">
            <ClipboardCheck className="h-5.5 w-5.5" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 mb-0.5">
            Ready to enter marks?
          </h3>
          <p className="text-xs text-slate-500 max-w-md">
            Select {isDaily ? 'the class, subject, and date' : 'class, subject, and exam details'} above, then click &quot;{loadButtonLabel}&quot; to begin.
          </p>
        </div>
      )}

      {loaded && rows.length > 0 && (
        <ErpSection
          title="Marks Table"
          icon={ClipboardList}
          tone="green"
          action={
            session ? (
              <span className="text-xs font-normal text-slate-500">
                {isDaily ? 'Existing test — editing saved marks' : 'Existing exam — editing saved marks'}
              </span>
            ) : isDaily ? (
              <span className="text-xs font-normal text-slate-500">
                New test — marks will be saved on Submit
              </span>
            ) : null
          }
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Input
                placeholder="Search by name or roll number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8.5 text-xs w-full sm:max-w-xs rounded-lg"
              />
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <Table className="min-w-[480px]">
                <TableHeader className="bg-slate-50 border-b border-slate-200">
                  <TableRow>
                    <TableHead className="w-16 py-2 px-3 text-[11px] font-bold text-slate-600 uppercase">Roll</TableHead>
                    <TableHead className="min-w-[140px] py-2 px-3 text-[11px] font-bold text-slate-600 uppercase">Name</TableHead>
                    <TableHead className="w-28 sm:w-36 py-2 px-3 text-[11px] font-bold text-slate-600 uppercase text-center">Marks</TableHead>
                    <TableHead className="w-16 py-2 px-3 text-[11px] font-bold text-slate-600 uppercase text-center">Rank</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((r) => {
                    const originalIdx = rows.findIndex(row => row.studentId === r.studentId);
                    return (
                      <TableRow key={r.studentId} className="hover:bg-slate-50/80 transition-colors">
                        <TableCell className="py-1.5 px-3 font-mono text-xs text-slate-600">{r.rollNo}</TableCell>
                        <TableCell className="py-1.5 px-3 text-xs font-medium text-slate-800">{r.name}</TableCell>
                        <TableCell className="py-1.5 px-3 text-center">
                          <Input
                            data-index={originalIdx}
                            type="number"
                            min="0"
                            max={form.maxMarks}
                            value={r.marksObtained}
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
                            className={`h-8 text-xs font-medium text-slate-900 text-center rounded-lg border-slate-200 focus:ring-1 focus:ring-orange-500 mx-auto w-20 sm:w-24 ${errorFields.includes(originalIdx) ? 'border-red-500 ring-1 ring-red-500 bg-red-50' : 'bg-white'}`}
                          />
                        </TableCell>
                        <TableCell className="py-1.5 px-3 text-center text-xs font-semibold text-indigo-600">
                          {r.rankSubject || '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-col sm:flex-row justify-start gap-2 pt-1">
              <Button
                onClick={save}
                disabled={saving}
                className="h-9 px-5 text-xs sm:text-sm font-medium rounded-lg text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-sm cursor-pointer w-full sm:w-auto"
              >
                <Save className="mr-1.5 h-4 w-4" />
                {saving ? 'Saving...' : session ? 'Update Marks' : 'Save Marks'}
              </Button>
            </div>
          </div>
        </ErpSection>
      )}
    </PageStack>
  );
}
