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
      r.name?.toLowerCase().includes(query) || 
      r.rollNo?.toLowerCase().includes(query) ||
      r.fatherName?.toLowerCase().includes(query)
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

  const toggleAbsent = (idx) => {
    setRows((prev) =>
      prev.map((x, i) => {
        if (i !== idx) return x;
        const isCurrentlyAbsent = x.status === 'absent';
        return {
          ...x,
          status: isCurrentlyAbsent ? 'present' : 'absent',
          marksObtained: isCurrentlyAbsent ? (x.prevMarks ?? '') : 0,
          prevMarks: isCurrentlyAbsent ? x.prevMarks : x.marksObtained,
        };
      })
    );
    if (errorFields.includes(idx)) {
      setErrorFields((prev) => prev.filter((i) => i !== idx));
    }
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

    // Check for empty marks (only present students require marks)
    const emptyFields = [];
    rows.forEach((r, idx) => {
      if (r.status !== 'absent' && (r.marksObtained === '' || r.marksObtained == null)) {
        emptyFields.push(idx);
      }
    });

    if (emptyFields.length > 0) {
      setErrorFields(emptyFields);
      toast.error('Marks are required for all present students.');
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

    // Check for excess marks (only present students)
    const excessFields = [];
    const maxMarks = Number(form.maxMarks);
    rows.forEach((r, idx) => {
      if (r.status !== 'absent') {
        const marks = Number(r.marksObtained);
        if (marks > maxMarks) {
          excessFields.push({ idx, name: r.name, marks, maxMarks });
        }
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
      status: r.status === 'absent' ? 'absent' : 'present',
      marksObtained: r.status === 'absent' ? 0 : (r.marksObtained === '' || r.marksObtained == null ? 0 : Number(r.marksObtained)),
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

  const cardThemeClass = isDaily
    ? 'border-orange-200/80 bg-gradient-to-br from-[#FFFDF9] via-[#FFF6EC]/60 to-[#FFFDF9]'
    : 'border-indigo-200/80 bg-gradient-to-br from-[#F5F8FF] via-[#EEF2FF]/70 to-[#F5F8FF]';

  const inputThemeClass = isDaily
    ? 'h-8.5 text-xs rounded-lg bg-white border-orange-200/80 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 shadow-xs'
    : 'h-8.5 text-xs rounded-lg bg-white border-indigo-200/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 shadow-xs';

  return (
    <PageStack>
      <PageHeader title={title} description={`Enter and save ${isDaily ? 'daily test' : 'main exam'} marks for your students.`} />

      <ErpSection title="Session Setup" icon={SlidersHorizontal} tone={isDaily ? 'orange' : 'indigo'} className="relative z-20">
        <div className={cn('rounded-xl border p-2.5 sm:p-3.5 space-y-2.5 sm:space-y-3 shadow-xs', cardThemeClass)}>
          <div className={`grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 ${isDaily ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
            <FormField label="Class">
              <Select
                value={form.classId || undefined}
                onValueChange={(v) => {
                  setForm({ ...form, classId: v, subject: '' });
                  clearLoadedData();
                }}
              >
                <SelectTrigger className={inputThemeClass}><SelectValue placeholder="Class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c._id} value={c._id} className="text-xs">{formatClassName(c.className)} {c.section}</SelectItem>
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
                inputClassName={inputThemeClass}
              />
            </FormField>

            {isDaily ? (
              <FormField label="Test Date">
                <Input
                  type="date"
                  className={inputThemeClass}
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
                    <SelectTrigger className={inputThemeClass}><SelectValue placeholder="Exam Type" /></SelectTrigger>
                    <SelectContent>
                      {MAIN_EXAMS.map((e) => <SelectItem key={e} value={e} className="text-xs">{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Exam Date">
                  <Input
                    type="date"
                    className={inputThemeClass}
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
                className={inputThemeClass}
                value={form.maxMarks}
                onChange={(e) => setForm({ ...form, maxMarks: e.target.value })}
              />
            </FormField>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="button"
              onClick={loadEntry}
              disabled={loadingStudents}
              className={cn(
                'h-8 sm:h-8.5 px-5 sm:px-6 text-xs font-bold rounded-lg text-white shadow-sm transition-all cursor-pointer hover:opacity-95 active:scale-[0.98] w-full sm:w-auto',
                isDaily
                  ? 'bg-gradient-to-r from-[#FF7A00] via-[#FF8C00] to-[#FFA000] hover:from-[#E66E00] hover:to-[#E68E00] shadow-orange-500/20'
                  : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-indigo-500/20'
              )}
            >
              {loadingStudents ? 'Loading...' : loadButtonLabel}
            </Button>
          </div>
        </div>
      </ErpSection>

      {!loaded && (
        <div className={cn(
          "flex flex-col items-center justify-center p-4 sm:p-7 rounded-xl border text-center shadow-xs",
          isDaily
            ? "border-dashed border-orange-200/80 bg-gradient-to-b from-orange-50/30 via-white to-amber-50/20"
            : "border-dashed border-indigo-200/80 bg-gradient-to-b from-indigo-50/30 via-white to-blue-50/20"
        )}>
          <div className={cn(
            "flex h-8.5 sm:h-9.5 w-8.5 sm:w-9.5 items-center justify-center rounded-lg text-white mb-2 shadow-xs",
            isDaily
              ? "bg-gradient-to-tr from-[#FF7A00] to-[#FFA000]"
              : "bg-gradient-to-tr from-indigo-600 via-purple-600 to-blue-600"
          )}>
            <ClipboardCheck className="h-4.5 sm:h-5 w-4.5 sm:w-5" />
          </div>
          <h3 className="text-xs sm:text-base font-bold text-slate-800 mb-0.5">
            Ready to enter marks?
          </h3>
          <p className="text-[10.5px] sm:text-[11px] text-slate-500 max-w-md">
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
              <span className="text-[11px] sm:text-xs font-normal text-slate-500">
                {isDaily ? 'Existing test — editing saved marks' : 'Existing exam — editing saved marks'}
              </span>
            ) : isDaily ? (
              <span className="text-[11px] sm:text-xs font-normal text-slate-500">
                New test — marks will be saved on Submit
              </span>
            ) : null
          }
        >
          <div className="space-y-2.5 sm:space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <Input
                placeholder="Search by name, father's name, or roll number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 sm:h-8.5 text-xs w-full sm:max-w-xs rounded-lg"
              />
              <span className="text-[11px] sm:text-xs font-medium text-slate-500">
                Click <strong className="text-slate-700">Present</strong> button to mark a student <strong className="text-red-600">ABSENT</strong>
              </span>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <Table className="w-full sm:min-w-[480px]">
                <TableHeader className="bg-slate-50 border-b border-slate-200">
                  <TableRow>
                    <TableHead className="w-9 sm:w-14 py-1.5 sm:py-2 px-1.5 sm:px-3 text-[10px] sm:text-[11px] font-bold text-slate-600 uppercase">Roll</TableHead>
                    <TableHead className="py-1.5 sm:py-2 px-1.5 sm:px-3 text-[10px] sm:text-[11px] font-bold text-slate-600 uppercase">Name</TableHead>
                    <TableHead className="w-16 sm:w-24 py-1.5 sm:py-2 px-1.5 sm:px-3 text-[10px] sm:text-[11px] font-bold text-slate-600 uppercase text-center">Status</TableHead>
                    <TableHead className="w-16 sm:w-32 py-1.5 sm:py-2 px-1.5 sm:px-3 text-[10px] sm:text-[11px] font-bold text-slate-600 uppercase text-center">Marks</TableHead>
                    <TableHead className="hidden sm:table-cell w-16 py-2 px-3 text-[11px] font-bold text-slate-600 uppercase text-center">Rank</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((r) => {
                    const originalIdx = rows.findIndex(row => row.studentId === r.studentId);
                    return (
                      <TableRow key={r.studentId} className="hover:bg-slate-50/80 transition-colors">
                        <TableCell className="py-1 sm:py-1.5 px-1.5 sm:px-3 font-mono text-[11px] sm:text-xs text-slate-600">{r.rollNo}</TableCell>
                        <TableCell className="py-1 sm:py-1.5 px-1.5 sm:px-3 text-xs font-medium text-slate-800">
                          <div className="font-semibold text-slate-900 leading-tight">{r.name}</div>
                          {r.fatherName && (
                            <div className="text-[9.5px] sm:text-[10.5px] text-slate-500 font-normal leading-tight mt-0.5">
                              Father: {r.fatherName}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-1 sm:py-1.5 px-1 sm:px-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleAbsent(originalIdx)}
                            className={cn(
                              "px-1.5 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer shadow-xs select-none",
                              r.status === 'absent'
                                ? "bg-red-500 hover:bg-red-600 text-white border border-red-600 shadow-red-500/20"
                                : "bg-emerald-50 hover:bg-red-50 text-emerald-700 hover:text-red-600 border border-emerald-200/80 hover:border-red-200"
                            )}
                          >
                            {r.status === 'absent' ? 'ABSENT' : 'Present'}
                          </button>
                        </TableCell>
                        <TableCell className="py-1 sm:py-1.5 px-1 sm:px-3 text-center">
                          {r.status === 'absent' ? (
                            <div className="h-7 sm:h-8 text-[11px] sm:text-xs font-extrabold text-red-600 bg-red-50 border border-red-200/80 rounded-lg flex items-center justify-center mx-auto w-14 sm:w-24 select-none shadow-xs">
                              AB
                            </div>
                          ) : (
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
                              className={`h-7 sm:h-8 text-xs font-medium text-slate-900 text-center rounded-lg border-slate-200 focus:ring-1 focus:ring-orange-500 mx-auto w-14 sm:w-24 ${errorFields.includes(originalIdx) ? 'border-red-500 ring-1 ring-red-500 bg-red-50' : 'bg-white'}`}
                            />
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell py-1.5 px-3 text-center text-xs font-semibold text-indigo-600">
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
                className="h-8.5 sm:h-9 px-5 text-xs sm:text-sm font-medium rounded-lg text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-sm cursor-pointer w-full sm:w-auto"
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
