import { useEffect, useMemo, useState } from 'react';

import { Filter, Trophy, FileBarChart, Download } from 'lucide-react';

import api from '@/lib/api';
import { formatClassName } from '@/lib/utils';

import { downloadFile, buildDownloadQuery } from '@/lib/download';

import { useSubjects } from '@/hooks/useSubjects';

import SubjectSelect from '@/components/SubjectSelect';

import { PageHeader, ErpSection, FormField, PageStack } from '@/components/erp/PagePrimitives';

import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';



const MAIN_EXAMS = ['PA1', 'PA2', 'PA3', 'PA4', 'FA1', 'FA2', 'Half Yearly', 'Final'];



export default function ResultManagement() {

  const [classes, setClasses] = useState([]);

  const [teachers, setTeachers] = useState([]);

  const [view, setView] = useState('daily');

  const [filters, setFilters] = useState({

    classId: '',

    subject: '',

    examType: '',

    examDate: '',

    teacher: '',

    testDate: '',

    dateFrom: '',

    dateTo: '',

    sortBy: 'marks_desc',

  });

  const [rows, setRows] = useState([]);



  const { subjects, loading: subjectsLoading, allowCustom, canAddSubjects, registerSubject, emptyMessage } =

    useSubjects(filters.classId);



  useEffect(() => {

    Promise.all([api.get('/classes'), api.get('/users?role=teacher')]).then(([c, t]) => {

      const cls = c.data.classes || [];

      setClasses(cls);

      setTeachers(t.data.users || []);

      if (cls.length) setFilters((f) => ({ ...f, classId: cls[0]._id }));

    });

  }, []);



  useEffect(() => {

    setFilters((f) => ({ ...f, subject: '' }));

  }, [filters.classId]);



  const load = async () => {

    const params = { ...filters, view };

    if (view === 'daily') params.category = 'daily';

    else if (view === 'main') params.category = 'main';

    const res = await api.get('/results', { params });

    setRows(res.data.results || []);

  };



  const toppers = useMemo(() => rows.filter((r) => r.rank === 1), [rows]);



  const download = (format) => {

    const q = buildDownloadQuery(filters, view, format);

    downloadFile(`/results/download?${q}`, `results.${format}`);

  };



  return (

    <PageStack>

      <PageHeader

        title="Result Management"

        description="Filter, view, and export student results across daily tests and main exams."

      />



      <ErpSection title="Filters" icon={Filter} tone="blue">

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

          <FormField label="View">

            <Select value={view} onValueChange={setView}>

              <SelectTrigger><SelectValue /></SelectTrigger>

              <SelectContent>

                <SelectItem value="daily">Daily Test</SelectItem>

                <SelectItem value="main">Main Exam</SelectItem>

                <SelectItem value="overall">Overall</SelectItem>

              </SelectContent>

            </Select>

          </FormField>

          <FormField label="Class">

            <Select value={filters.classId} onValueChange={(v) => setFilters({ ...filters, classId: v })}>

              <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>

              <SelectContent>{classes.map((c) => <SelectItem key={c._id} value={c._id}>{formatClassName(c.className)}-{c.section}</SelectItem>)}</SelectContent>

            </Select>

          </FormField>

          <FormField label="Subject">

            <SubjectSelect

              value={filters.subject}

              onChange={(subject) => setFilters({ ...filters, subject })}

              subjects={subjects}

              loading={subjectsLoading}

              allowCustom={allowCustom}

              canAddSubjects={canAddSubjects}

              onRegisterSubject={registerSubject}

              emptyMessage={emptyMessage}

              placeholder="All school subjects"

            />

          </FormField>

          {view === 'daily' && (

            <>

              <FormField label="Test Date">

                <Input type="date" value={filters.testDate} onChange={(e) => setFilters({ ...filters, testDate: e.target.value })} />

              </FormField>

              <FormField label="From">

                <Input type="date" placeholder="From" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />

              </FormField>

              <FormField label="To">

                <Input type="date" placeholder="To" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />

              </FormField>

            </>

          )}

          {view === 'main' && (

            <>

              <FormField label="Exam Type">

                <Select value={filters.examType} onValueChange={(v) => setFilters({ ...filters, examType: v })}>

                  <SelectTrigger><SelectValue placeholder="Exam Type" /></SelectTrigger>

                  <SelectContent>{MAIN_EXAMS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>

                </Select>

              </FormField>

              <FormField label="Exam Date">

                <Input type="date" placeholder="Exam Date" value={filters.examDate} onChange={(e) => setFilters({ ...filters, examDate: e.target.value })} />

              </FormField>

            </>

          )}

          <FormField label="Teacher">

            <Select value={filters.teacher} onValueChange={(v) => setFilters({ ...filters, teacher: v })}>

              <SelectTrigger><SelectValue placeholder="Teacher" /></SelectTrigger>

              <SelectContent>{teachers.map((t) => <SelectItem key={t._id} value={t._id}>{t.teacherName || t.name}</SelectItem>)}</SelectContent>

            </Select>

          </FormField>

          <FormField label="Sort By">

            <Select value={filters.sortBy} onValueChange={(v) => setFilters({ ...filters, sortBy: v })}>

              <SelectTrigger><SelectValue /></SelectTrigger>

              <SelectContent>

                <SelectItem value="marks_desc">High → Low</SelectItem>

                <SelectItem value="marks_asc">Low → High</SelectItem>

                <SelectItem value="rollNo">Roll No</SelectItem>

                <SelectItem value="name">Student Name</SelectItem>

              </SelectContent>

            </Select>

          </FormField>

          <div className="flex flex-wrap items-end gap-2 md:col-span-2 lg:col-span-3">

            <Button onClick={load}>Apply</Button>

            <Button variant="purple" onClick={() => download('csv')}>

              <Download className="mr-2 h-4 w-4" />

              CSV

            </Button>

            <Button variant="purple" onClick={() => download('pdf')}>

              <Download className="mr-2 h-4 w-4" />

              PDF

            </Button>

          </div>

        </div>

      </ErpSection>



      <ErpSection title="Topper Students" icon={Trophy} tone="yellow">

        {toppers.length ? (

          <div className="space-y-2">

            {toppers.map((t, i) => (

              <p key={i} className="text-sm font-medium text-slate-700">

                {t.student?.name} — {t.percentage}%

              </p>

            ))}

          </div>

        ) : (

          <p className="text-sm text-slate-500">No data</p>

        )}

      </ErpSection>



      <ErpSection title="Results" icon={FileBarChart} tone="green">

        <div className="overflow-x-auto">

          <Table>

            <TableHeader>

              <TableRow>

                <TableHead>Rank</TableHead>

                <TableHead>Student</TableHead>

                <TableHead>Class</TableHead>

                <TableHead>Exam</TableHead>

                <TableHead>Date</TableHead>

                <TableHead>Marks</TableHead>

                <TableHead>%</TableHead>

              </TableRow>

            </TableHeader>

            <TableBody>

              {rows.map((r, idx) => (

                <TableRow key={idx}>

                  <TableCell>{r.rank ?? '-'}</TableCell>

                  <TableCell className="font-medium">{r.student?.name}</TableCell>

                  <TableCell>{r.class ? `${formatClassName(r.class.className)}-${r.class.section}` : '-'}</TableCell>

                  <TableCell>{r.examType || 'Daily Test'}</TableCell>

                  <TableCell>

                    {r.examDate

                      ? new Date(r.examDate).toLocaleDateString('en-GB')

                      : r.testDate

                        ? new Date(r.testDate).toLocaleDateString('en-GB')

                        : '-'}

                  </TableCell>

                  <TableCell>{(r.totalObtained ?? r.marksObtained)}/{(r.totalMax ?? r.maxMarks)}</TableCell>

                  <TableCell>{r.percentage}%</TableCell>

                </TableRow>

              ))}

            </TableBody>

          </Table>

        </div>

      </ErpSection>

    </PageStack>

  );

}

