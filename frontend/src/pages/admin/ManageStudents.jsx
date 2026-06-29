import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { GraduationCap, Search, UserPlus, Download, Upload, X, CheckCircle, AlertCircle, Download as DownloadIcon } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
import { formatClassName } from '@/lib/utils';
import { useSession } from '@/context/SessionContext';
import { PageHeader, ErpSection, FormField, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ManageStudents() {
  const { isArchived } = useSession();
  const [searchParams] = useSearchParams();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ rollNo: '', name: '', gender: 'male', parentName: '', parentPhone: '', parentEmail: '' });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const [importing, setImporting] = useState(false);
  const [uploadClassId, setUploadClassId] = useState('');
  const [importProgress, setImportProgress] = useState({
    processed: 0,
    total: 0,
    success: 0,
    failed: 0,
    currentStudent: '',
  });

  useEffect(() => {
    api.get('/classes').then((r) => {
      setClasses(r.data.classes || []);
      // Check if classId is in URL
      const classIdFromUrl = searchParams.get('classId');
      if (classIdFromUrl) {
        setSelectedClass(classIdFromUrl);
      } else if (r.data.classes?.length) {
        setSelectedClass(r.data.classes[0]._id);
      }
    });
  }, [searchParams]);

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
      else {
        const response = await api.post('/students', payload);
        
        // Send parent credential email if parent was created and has email
        if (response.data.parentData && response.data.parentData.isNew && response.data.parentData.parent.email) {
          try {
            await api.post('/parents/send-credentials', {
              parentId: response.data.parentData.parent._id,
              schoolName: 'Your School', // This should come from school data
              loginUrl: window.location.origin
            });
            toast.success('Student added and parent credentials sent');
          } catch (emailErr) {
            console.error('Failed to send parent email:', emailErr);
            toast.success('Student added (parent email failed)');
          }
        } else {
          toast.success('Student added');
        }
      }
      setOpen(false); setEdit(null); setForm({ rollNo: '', name: '', gender: 'male', parentName: '', parentPhone: '', parentEmail: '' });
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
    setImportProgress({
      processed: 0,
      total: 100,
      success: 0,
      failed: 0,
      currentStudent: '',
    });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('classId', uploadClassId);

    // Simulate progress while importing
    let simulatedProgress = 0;
    const progressInterval = setInterval(() => {
      simulatedProgress += Math.random() * 5;
      if (simulatedProgress > 95) {
        clearInterval(progressInterval);
        simulatedProgress = 95;
      }
      setImportProgress(prev => ({
        ...prev,
        processed: Math.round((simulatedProgress / 100) * 100),
        total: 100,
        currentStudent: `Processing student ${Math.round(simulatedProgress)}...`,
      }));
    }, 200);

    try {
      const response = await api.post('/students/bulk-import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      clearInterval(progressInterval);
      
      setImportResults(response.data);
      setImportProgress({
        processed: response.data.totalRows || 0,
        total: response.data.totalRows || 0,
        success: response.data.studentsCreated || 0,
        failed: response.data.failed || 0,
        currentStudent: '',
      });
      
      toast.success(`Import completed: ${response.data.studentsCreated} students imported, ${response.data.failed} failed`);
      loadStudents(uploadClassId);
      setFile(null);
    } catch (err) {
      clearInterval(progressInterval);
      toast.error(err.response?.data?.message || 'Import failed');
      setImportProgress(prev => ({
        ...prev,
        failed: prev.total,
        currentStudent: '',
      }));
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
        </div>
      </PageHeader>

      <ErpSection title="Select Class" icon={GraduationCap} tone="blue">
        {/* Container me justify-between lagaya hai taaki button right end me chala jaye */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 w-full">
          <FormField label="Class" className="w-full sm:max-w-xs mb-0">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-full">
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

          {/* Button right end me align ho chuka hai */}
          <Button onClick={() => setOpen(true)} disabled={!selectedClass} className="w-full sm:w-auto">
            <UserPlus className="mr-2 h-4 w-4" />
            Add Student
          </Button>
        </div>

        {/* Top indicator for filtered class view */}
        {searchParams.get('classId') && selectedClass && (
          <div className="mt-4 flex items-center justify-between rounded-lg bg-blue-50 px-4 py-2">
            <span className="text-sm font-medium text-blue-900">
              Viewing Students of Class {classes.find(c => c._id === selectedClass)?.className}-{classes.find(c => c._id === selectedClass)?.section}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedClass('')}
              className="h-8 px-2 text-blue-700 hover:text-blue-900 hover:bg-blue-100"
            >
              <X className="h-4 w-4 mr-1" />
              Clear Filter
            </Button>
          </div>
        )}
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
                <TableRow key={s._id} className="hover:bg-slate-50 transition-colors">
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

      {/* --- ADD / EDIT STUDENT DIALOG FIXES --- */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600" />
              {edit ? 'Edit' : 'Add'} Student Details
            </DialogTitle>
          </DialogHeader>

          <DialogBody>
          <form className="space-y-5" onSubmit={submit}>
            <FormField label="Roll No">
              <Input
                placeholder="Enter Roll No"
                value={form.rollNo}
                onChange={(e) => setForm({ ...form, rollNo: e.target.value })}
                required
                className="h-10 rounded-lg"
              />
            </FormField>
            <FormField label="Name">
              <Input
                placeholder="Enter Student Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="h-10 rounded-lg"
              />
            </FormField>
            <FormField label="Gender">
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger className="h-10 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <div className="border-t pt-4 mt-4">
              <p className="text-sm font-medium text-slate-700 mb-3">Parent/Guardian Information</p>
            </div>
            <FormField label="Parent/Guardian Name">
              <Input
                placeholder="Enter Parent Name"
                value={form.parentName}
                onChange={(e) => setForm({ ...form, parentName: e.target.value })}
                className="h-10 rounded-lg"
              />
            </FormField>
            <FormField label="Parent Phone (Required)">
              <Input
                placeholder="Enter Parent Phone"
                value={form.parentPhone}
                onChange={(e) => setForm({ ...form, parentPhone: e.target.value })}
                className="h-10 rounded-lg"
              />
            </FormField>
            <FormField label="Parent Email (Optional)">
              <Input
                type="email"
                placeholder="Enter Parent Email"
                value={form.parentEmail}
                onChange={(e) => setForm({ ...form, parentEmail: e.target.value })}
                className="h-10 rounded-lg"
              />
            </FormField>
            <div className="pt-2">
              <Button className="w-full h-11 rounded-xl text-base font-medium" variant={edit ? 'default' : 'success'}>
                {edit ? 'Save Changes' : 'Create Student'}
              </Button>
            </div>
          </form>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* --- BULK IMPORT DIALOG FIXES --- */}
      <Dialog open={uploadOpen} onOpenChange={(open) => {
        if (!importing) setUploadOpen(open);
      }}>
        <DialogContent className="sm:max-w-2xl rounded-2xl border-0 p-0">
          <DialogHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5">
            <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
              {importing ? (
                <>
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  Importing Students...
                </>
              ) : importResults ? (
                <>
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  Import Complete
                </>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-blue-600" />
                  Bulk Import Students
                </>
              )}
            </DialogTitle>
            <p className="text-sm text-slate-500 mt-1">
              {importing ? 'Please wait while students are being imported...' : importResults ? 'Import summary' : 'Upload student records using CSV or XLSX files'}
            </p>
          </DialogHeader>

          <DialogBody>
          <div className="space-y-6 p-6">
            {!importing && !importResults && (
              <>
                <FormField label="Select Class">
                  <Select value={uploadClassId} onValueChange={setUploadClassId}>
                    <SelectTrigger className="h-11 rounded-xl">
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

                <div className="rounded-xl border bg-slate-50 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-slate-800">
                    Required File Format
                  </h4>
                  <ul className="space-y-1 text-xs text-slate-600 grid grid-cols-3 gap-2">
                    <li>• Roll No (required)</li>
                    <li>• Student Name (required)</li>
                    <li>• Gender (male/female/other)</li>
                    <li>• Parent/Guardian Name</li>
                    <li>• Parent Phone</li>
                    <li>• Parent Email (Optional)</li>
                  </ul>
                </div>

                <FormField label="Upload File">
                  <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition-all hover:border-blue-400 hover:bg-blue-50">
                    <Upload className="mx-auto mb-3 h-10 w-10 text-blue-500" />
                    <h3 className="text-sm font-semibold text-slate-700">
                      Upload CSV or XLSX File
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Drag & drop or click below to browse
                    </p>
                    <Input
                      type="file"
                      accept=".csv,.xlsx"
                      onChange={handleFileChange}
                      className="mt-3 max-w-xs mx-auto text-xs h-9"
                    />
                    {file && (
                      <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-2 max-w-sm mx-auto">
                        <p className="text-xs font-medium text-green-700 truncate">
                          ✓ {file.name}
                        </p>
                      </div>
                    )}
                  </div>
                </FormField>
              </>
            )}

            {importing && (
              <div className="space-y-6">
                <div className="rounded-xl border bg-slate-50 p-6">
                  <div className="space-y-4">
                    {importProgress.currentStudent && (
                      <div className="rounded-lg bg-blue-50 p-4 border border-blue-100">
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Current Student</p>
                        <p className="text-sm font-medium text-blue-900">{importProgress.currentStudent}</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Processed: {importProgress.processed} / {importProgress.total}</span>
                        <span className="font-semibold text-blue-600">{Math.round((importProgress.processed / importProgress.total) * 100)}%</span>
                      </div>

                      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300 ease-out"
                          style={{ width: `${(importProgress.processed / importProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="rounded-lg bg-green-50 p-3 text-center border border-green-100">
                        <p className="text-[11px] text-green-600 uppercase tracking-wider">Success</p>
                        <p className="text-2xl font-bold text-green-700 mt-0.5">{importProgress.success}</p>
                      </div>
                      <div className="rounded-lg bg-red-50 p-3 text-center border border-red-100">
                        <p className="text-[11px] text-red-600 uppercase tracking-wider">Failed</p>
                        <p className="text-2xl font-bold text-red-700 mt-0.5">{importProgress.failed}</p>
                      </div>
                      <div className="rounded-lg bg-slate-100 p-3 text-center border border-slate-200">
                        <p className="text-[11px] text-slate-600 uppercase tracking-wider">Remaining</p>
                        <p className="text-2xl font-bold text-slate-700 mt-0.5">{importProgress.total - importProgress.processed}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {importResults && !importing && (
              <div className="space-y-6">
                <div className="rounded-xl border bg-slate-50 p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="rounded-lg bg-white p-3 text-center shadow-sm border">
                      <p className="text-[11px] text-slate-500 uppercase tracking-wider">Total Rows</p>
                      <p className="text-2xl font-bold mt-0.5">{importResults.totalRows}</p>
                    </div>
                    <div className="rounded-lg bg-green-50 p-3 text-center border border-green-100">
                      <p className="text-[11px] text-green-600 uppercase tracking-wider">Students</p>
                      <p className="text-2xl font-bold text-green-700 mt-0.5">{importResults.studentsCreated}</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-3 text-center border border-blue-100">
                      <p className="text-[11px] text-blue-600 uppercase tracking-wider">Parents</p>
                      <p className="text-2xl font-bold text-blue-700 mt-0.5">{importResults.parentsCreated}</p>
                    </div>
                    <div className="rounded-lg bg-red-50 p-3 text-center border border-red-100">
                      <p className="text-[11px] text-red-600 uppercase tracking-wider">Failed</p>
                      <p className="text-2xl font-bold text-red-700 mt-0.5">{importResults.failed}</p>
                    </div>
                  </div>

                  {importResults.errors?.length > 0 && (
                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-amber-800 mb-2">
                            {importResults.errors.length} Error{importResults.errors.length > 1 ? 's' : ''} Found
                          </p>
                          <div className="max-h-32 overflow-y-auto space-y-1 text-xs text-amber-700">
                            {importResults.errors.slice(0, 5).map((err, idx) => (
                              <div key={idx} className="border-b border-amber-100/50 pb-1 last:border-0">
                                Row {err.row}: {err.error}
                              </div>
                            ))}
                            {importResults.errors.length > 5 && (
                              <p className="text-amber-600 italic">
                                ...and {importResults.errors.length - 5} more errors
                              </p>
                            )}
                          </div>
                          <Button
                            onClick={() => {
                              const errorContent = importResults.errors
                                .map((err) => `Row ${err.row}: ${err.error}`)
                                .join('\n');
                              const blob = new Blob([errorContent], { type: 'text/plain' });
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = 'student_import_error_report.txt';
                              document.body.appendChild(link);
                              link.click();
                              link.remove();
                              URL.revokeObjectURL(url);
                            }}
                            variant="outline"
                            size="sm"
                            className="mt-3"
                          >
                            <DownloadIcon className="mr-2 h-4 w-4" />
                            Download Error Report
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!importing && !importResults && (
              <Button
                className="h-11 w-full rounded-xl text-base font-semibold shadow-sm"
                onClick={handleBulkImport}
                disabled={!file}
              >
                Import Students
              </Button>
            )}

            {importResults && !importing && (
              <Button
                className="h-11 w-full rounded-xl text-base font-semibold shadow-sm"
                onClick={() => {
                  setImportResults(null);
                  setUploadOpen(false);
                  setUploadClassId('');
                }}
              >
                Done
              </Button>
            )}
          </div>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </PageStack>
  );
}