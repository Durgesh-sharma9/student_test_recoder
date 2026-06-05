import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Settings2, ClipboardList, Download, Save } from 'lucide-react';
import api from '@/lib/api';
import { formatClassName } from '@/lib/utils';
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <FormField label="Class">
            <Select
              value={form.classId || undefined}
              onValueChange={(v) => {
                setForm({ ...form, classId: v, subject: '' });
                clearLoadedData();
              }}
            >
              <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c._id} value={c._id}>{formatClassName(c.className)} {c.section}</SelectItem>
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
                  <SelectTrigger><SelectValue placeholder="Exam Type" /></SelectTrigger>
                  <SelectContent>
                    {MAIN_EXAMS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Exam Date">
                <Input
                  type="date"
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
              value={form.maxMarks}
              onChange={(e) => setForm({ ...form, maxMarks: e.target.value })}
            />
          </FormField>

          <div className="flex items-end">
            <Button type="button" onClick={loadEntry} disabled={loadingStudents} className="w-full">
              {loadingStudents ? 'Loading...' : loadButtonLabel}
            </Button>
          </div>
        </div>
      </ErpSection>

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
          <div className="space-y-4 overflow-x-auto">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search by name or roll number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Roll</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead>Rank</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((r, idx) => {
                  const originalIdx = rows.findIndex(row => row.studentId === r.studentId);
                  return (
                    <TableRow key={r.studentId}>
                      <TableCell>{r.rollNo}</TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>
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
                            // Clear error for this field when user starts typing
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
                          className={errorFields.includes(originalIdx) ? 'border-red-500 ring-1 ring-red-500' : ''}
                        />
                      </TableCell>
                      <TableCell>{r.rankSubject || '-'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="flex flex-wrap gap-2">
              <Button onClick={save} disabled={saving} variant="success">
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : session ? 'Update Marks' : 'Save Marks'}
              </Button>
              <Button variant="outline" onClick={download}>
                <Download className="mr-2 h-4 w-4" />
                Download CSV
              </Button>
            </div>
          </div>
        </ErpSection>
      )}

      {!loaded && (
        <p className="text-sm text-slate-500">
          Select class, subject, and {isDaily ? 'date' : 'exam details'}, then click &quot;{loadButtonLabel}&quot;.
        </p>
      )}
    </PageStack>
  );
}
