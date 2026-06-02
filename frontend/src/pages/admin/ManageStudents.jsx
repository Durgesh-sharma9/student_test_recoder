import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { GraduationCap, Search, UserPlus, Download, Upload } from 'lucide-react';
import api from '@/lib/api';
import { formatClassName } from '@/lib/utils';
import { useSession } from '@/context/SessionContext';
import { PageHeader, ErpSection, FormField, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ManageStudents() {
  const { isArchived } = useSession();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ rollNo: '', name: '', gender: 'male' });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const [importing, setImporting] = useState(false);
  const [uploadClassId, setUploadClassId] = useState('');

  useEffect(() => {
    api.get('/classes').then((r) => {
      setClasses(r.data.classes || []);
      if (r.data.classes?.length) setSelectedClass(r.data.classes[0]._id);
    });
  }, []);

  const loadStudents = async (classId) => {
    if (!classId) return;
    try {
      const res = await api.get(`/students?class=${classId}`);
      setStudents(res.data.students || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load students');
      setStudents([]);
    }
  };
  useEffect(() => { loadStudents(selectedClass); }, [selectedClass]);

  const filtered = useMemo(() => students.filter((s) => `${s.rollNo} ${s.name}`.toLowerCase().includes(query.toLowerCase())), [students, query]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, class: selectedClass };
      if (edit) await api.put(`/students/${edit._id}`, payload);
      else await api.post('/students', payload);
      toast.success(edit ? 'Student updated' : 'Student added');
      setOpen(false); setEdit(null); setForm({ rollNo: '', name: '', gender: 'male' });
      loadStudents(selectedClass);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await api.get('/students/download-template', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'student_import_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Template downloaded successfully');
    } catch (err) {
      toast.error('Failed to download template');
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'];
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.csv')) {
        toast.error('Please upload a valid CSV or XLSX file');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleBulkImport = async () => {
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }
    if (!uploadClassId) {
      toast.error('Please select a class first');
      return;
    }

    setImporting(true);
    setImportResults(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('classId', uploadClassId);

    try {
      const response = await api.post('/students/bulk-import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setImportResults(response.data);
      toast.success(`Import completed: ${response.data.imported} students imported, ${response.data.failed} failed`);
      loadStudents(uploadClassId);
      setFile(null);
      setUploadOpen(false);
      setUploadClassId('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <PageStack>
      <PageHeader
        title="Student Management"
        description="Manage student records by class — roll numbers, names, and profiles."
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Download Template
          </Button>
          <Button variant="outline" onClick={() => {
            setUploadOpen(true);
            setUploadClassId(selectedClass || '');
          }}>
            <Upload className="mr-2 h-4 w-4" />
            Bulk Import
          </Button>
          <Button onClick={() => setOpen(true)} disabled={!selectedClass}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Student
          </Button>
        </div>
      </PageHeader>

      <ErpSection title="Select Class" icon={GraduationCap} tone="blue">
        <FormField label="Class">
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-full sm:max-w-xs">
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
      </ErpSection>

      <ErpSection title="Search Students" icon={Search} tone="blue">
        <FormField label="Search by roll no or name">
          <Input
            placeholder="Search student"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-sm"
          />
        </FormField>
      </ErpSection>

      <ErpSection title="Students List" icon={GraduationCap} tone="green">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Roll No</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s._id}>
                  <TableCell>{s.rollNo}</TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="capitalize">{s.gender}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isArchived}
                        onClick={() => {
                          setEdit(s);
                          setForm({ rollNo: s.rollNo, name: s.name, gender: s.gender });
                          setOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={isArchived}
                        onClick={async () => {
                          await api.delete(`/students/${s._id}`);
                          toast.success('Deleted');
                          loadStudents(selectedClass);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ErpSection>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{edit ? 'Edit' : 'Add'} Student</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <FormField label="Roll No">
              <Input
                placeholder="Roll No"
                value={form.rollNo}
                onChange={(e) => setForm({ ...form, rollNo: e.target.value })}
                required
              />
            </FormField>
            <FormField label="Name">
              <Input
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </FormField>
            <FormField label="Gender">
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <Button className="w-full" variant={edit ? 'default' : 'success'}>
              {edit ? 'Save' : 'Create'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
  <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border-0 p-0">
    <DialogHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5">
      <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
        <Upload className="h-6 w-6 text-blue-600" />
        Bulk Import Students
      </DialogTitle>

      <p className="text-sm text-slate-500">
        Upload student records using CSV or XLSX files
      </p>
    </DialogHeader>

    <div className="space-y-6 p-6">
      <FormField label="Select Class">
        <Select value={uploadClassId} onValueChange={setUploadClassId}>
          <SelectTrigger className="h-12 rounded-xl">
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

      <div className="rounded-2xl border bg-slate-50 p-5">
        <h4 className="mb-3 text-lg font-semibold text-slate-800">
          Required File Format
        </h4>

        <ul className="space-y-2 text-sm text-slate-600">
          <li>• Roll No (required)</li>
          <li>• Student Name (required)</li>
          <li>• Gender (male / female / other)</li>
        </ul>
      </div>

      <FormField label="Upload File">
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center transition-all hover:border-blue-400 hover:bg-blue-50">
          <Upload className="mx-auto mb-4 h-12 w-12 text-blue-500" />

          <h3 className="font-semibold text-slate-700">
            Upload CSV or XLSX File
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Drag & drop or click below to browse
          </p>

          <Input
            type="file"
            accept=".csv,.xlsx"
            onChange={handleFileChange}
            className="mt-4"
          />

          {file && (
            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3">
              <p className="font-medium text-green-700">
                ✓ {file.name}
              </p>
            </div>
          )}
        </div>
      </FormField>

      {importResults && (
        <div className="rounded-2xl border bg-slate-50 p-5">
          <h4 className="mb-4 text-lg font-semibold">
            Import Summary
          </h4>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-white p-4 text-center shadow-sm">
              <p className="text-xs text-slate-500">
                Total Rows
              </p>
              <p className="text-3xl font-bold">
                {importResults.totalRows}
              </p>
            </div>

            <div className="rounded-xl bg-green-50 p-4 text-center">
              <p className="text-xs text-green-600">
                Imported
              </p>
              <p className="text-3xl font-bold text-green-700">
                {importResults.imported}
              </p>
            </div>

            <div className="rounded-xl bg-red-50 p-4 text-center">
              <p className="text-xs text-red-600">
                Failed
              </p>
              <p className="text-3xl font-bold text-red-700">
                {importResults.failed}
              </p>
            </div>
          </div>

          {importResults.errors?.length > 0 && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="mb-3 font-semibold text-red-700">
                Errors
              </p>

              <div className="max-h-40 overflow-y-auto space-y-1 text-sm text-red-600">
                {importResults.errors.map((err, idx) => (
                  <div key={idx}>
                    Row {err.row}: {err.error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Button
        className="h-12 w-full rounded-xl text-base font-semibold"
        onClick={handleBulkImport}
        disabled={!file || importing}
      >
        {importing ? 'Importing Students...' : 'Import Students'}
      </Button>
    </div>
  </DialogContent>
</Dialog>
    </PageStack>
  );
}
