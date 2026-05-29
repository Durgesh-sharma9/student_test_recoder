import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useSubjects } from '@/hooks/useSubjects';
import SubjectSelect from '@/components/SubjectSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    maxMarks: 100,
  });
  const [session, setSession] = useState(null);
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
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

    const entries = rows.map((r) => ({
      studentId: r.studentId,
      marksObtained: r.marksObtained === '' || r.marksObtained == null ? 0 : Number(r.marksObtained),
    }));

    if (entries.some((e) => e.marksObtained > Number(form.maxMarks))) {
      return toast.error('Marks cannot exceed maximum marks');
    }

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
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <Card>
        <CardHeader><CardTitle>Session Setup</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-2">
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
                <SelectItem key={c._id} value={c._id}>{c.className}-{c.section}</SelectItem>
              ))}
            </SelectContent>
          </Select>

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

          {isDaily ? (
            <Input
              type="date"
              value={form.testDate}
              onChange={(e) => {
                setForm({ ...form, testDate: e.target.value });
                clearLoadedData();
              }}
            />
          ) : (
            <>
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
              <Input
                type="date"
                value={form.examDate}
                onChange={(e) => {
                  setForm({ ...form, examDate: e.target.value });
                  clearLoadedData();
                }}
              />
            </>
          )}

          <Input
            type="number"
            placeholder="Max Marks"
            value={form.maxMarks}
            onChange={(e) => setForm({ ...form, maxMarks: e.target.value })}
          />

          <Button type="button" onClick={loadEntry} disabled={loadingStudents}>
            {loadingStudents ? 'Loading...' : loadButtonLabel}
          </Button>
        </CardContent>
      </Card>

      {loaded && rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              Marks Table
              {session && (
                <span className="text-sm font-normal text-muted-foreground">
                  {isDaily ? 'Existing test — editing saved marks' : 'Existing exam — editing saved marks'}
                </span>
              )}
              {!session && isDaily && (
                <span className="text-sm font-normal text-muted-foreground">
                  New test — marks will be saved on Submit
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 overflow-x-auto">
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
                {rows.map((r, idx) => (
                  <TableRow key={r.studentId}>
                    <TableCell>{r.rollNo}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        max={form.maxMarks}
                        value={r.marksObtained}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, marksObtained: e.target.value } : x))
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>{r.rankSubject || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex gap-2">
              <Button onClick={save} disabled={saving}>
                {saving ? 'Saving...' : session ? 'Update Marks' : 'Save Marks'}
              </Button>
              <Button variant="outline" onClick={download}>Download CSV</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!loaded && (
        <p className="text-sm text-muted-foreground">
          Select class, subject, and {isDaily ? 'date' : 'exam details'}, then click &quot;{loadButtonLabel}&quot;.
        </p>
      )}
    </div>
  );
}
