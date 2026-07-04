import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { GraduationCap, Search, UserPlus, Download, Upload, X, CheckCircle, AlertCircle, Download as DownloadIcon } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
import { formatClassName } from '@/lib/utils';
import { useSession } from '@/context/SessionContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useSubscriptionExpiry } from '@/hooks/useSubscriptionExpiry';
import { PageHeader, ErpSection, FormField, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import PlanLimitReachedDialog from '@/components/subscription/PlanLimitReachedDialog';
import SubscriptionExpiredDialog from '@/components/subscription/SubscriptionExpiredDialog';

export default function ManageStudents() {
  const { isArchived } = useSession();
  const { canAddStudent, usage } = useSubscription();
  const { isSubscriptionExpired, dialogOpen: expiredDialogOpen, setDialogOpen: setExpiredDialogOpen, checkAndBlock } = useSubscriptionExpiry();
  const [searchParams] = useSearchParams();
  
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState('');
  
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ rollNo: '', name: '', gender: 'male', admissionDate: new Date().toISOString().split('T')[0], parentName: '', parentPhone: '', parentEmail: '' });
  const [rollConflictDialog, setRollConflictDialog] = useState({ open: false, conflict: null, onConfirm: null });
  
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
  const [importOptionsDialog, setImportOptionsDialog] = useState({ open: false, conflicts: [], onConfirm: null });
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);

  useEffect(() => {
    api.get('/classes').then((r) => {
      setClasses(r.data.classes || []);
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

  useEffect(() => { 
    loadStudents(selectedClass); 
  }, [selectedClass]);

  const filtered = useMemo(() => students.filter((s) => `${s.rollNo} ${s.name}`.toLowerCase().includes(query.toLowerCase())), [students, query]);

  const submit = async (e) => {
    e.preventDefault();
    
    // For edit with roll number change, check for conflicts
    if (edit && form.rollNo !== edit.rollNo) {
      try {
        const conflictRes = await api.post('/students/check-roll-conflicts', {
          classId: selectedClass,
          rollNumbers: [form.rollNo]
        });
        
        if (conflictRes.data.hasConflicts && conflictRes.data.conflicts.length > 0) {
          const conflict = conflictRes.data.conflicts[0];
          setRollConflictDialog({
            open: true,
            conflict: conflict,
            onConfirm: async (shiftOption) => {
              try {
                const payload = { ...form, class: selectedClass, shiftOption };
                await api.put(`/students/${edit._id}`, payload);
                toast.success('Student updated');
                setOpen(false);
                setEdit(null);
                setForm({ rollNo: '', name: '', gender: 'male', admissionDate: new Date().toISOString().split('T')[0], parentName: '', parentPhone: '', parentEmail: '' });
                loadStudents(selectedClass);
                setRollConflictDialog({ open: false, conflict: null, onConfirm: null });
              } catch (err) {
                toast.error(err.response?.data?.message || 'Failed to update student');
              }
            }
          });
          return;
        }
      } catch (err) {
        // If conflict check fails, proceed normally
      }
    }
    
    // For add student, check for conflicts
    if (!edit) {
      try {
        const conflictRes = await api.post('/students/check-roll-conflicts', {
          classId: selectedClass,
          rollNumbers: [form.rollNo]
        });
        
        if (conflictRes.data.hasConflicts && conflictRes.data.conflicts.length > 0) {
          const conflict = conflictRes.data.conflicts[0];
          setRollConflictDialog({
            open: true,
            conflict: conflict,
            onConfirm: async (shiftOption) => {
              try {
                const payload = { ...form, class: selectedClass, shiftOption };
                const response = await api.post('/students', payload);
                
                if (response.data.parentData && response.data.parentData.isNew && response.data.parentData.parent.email) {
                  try {
                    await api.post('/parents/send-credentials', {
                      parentId: response.data.parentData.parent._id,
                      schoolName: 'Your School',
                      loginUrl: window.location.origin
                    });
                    toast.success('Student added and parent credentials sent');
                  } catch (emailErr) {
                    toast.success('Student added (parent email failed)');
                  }
                } else {
                  toast.success('Student added');
                }
                
                setOpen(false);
                setEdit(null);
                setForm({ rollNo: '', name: '', gender: 'male', admissionDate: new Date().toISOString().split('T')[0], parentName: '', parentPhone: '', parentEmail: '' });
                loadStudents(selectedClass);
                setRollConflictDialog({ open: false, conflict: null, onConfirm: null });
              } catch (err) {
                toast.error(err.response?.data?.message || 'Failed to add student');
              }
            }
          });
          return;
        }
      } catch (err) {
        // If conflict check fails, proceed normally
      }
    }
    
    // No conflicts or conflict check failed, proceed normally
    try {
      const payload = { ...form, class: selectedClass };
      if (edit) {
        await api.put(`/students/${edit._id}`, payload);
        toast.success('Student updated');
      } else {
        const response = await api.post('/students', payload);
        
        if (response.data.parentData && response.data.parentData.isNew && response.data.parentData.parent.email) {
          try {
            await api.post('/parents/send-credentials', {
              parentId: response.data.parentData.parent._id,
              schoolName: 'Your School',
              loginUrl: window.location.origin
            });
            toast.success('Student added and parent credentials sent');
          } catch (emailErr) {
            toast.success('Student added (parent email failed)');
          }
        } else {
          toast.success('Student added');
        }
      }
      setOpen(false); 
      setEdit(null); 
      setForm({ rollNo: '', name: '', gender: 'male', admissionDate: new Date().toISOString().split('T')[0], parentName: '', parentPhone: '', parentEmail: '' });
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

  const handleBulkImport = async (shiftOption = null) => {
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
    if (shiftOption) {
      formData.append('shiftOption', shiftOption);
    }

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
      setImportOptionsDialog({ open: false, conflicts: [], onConfirm: null });
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

  const handleBulkImportWithConflictCheck = async () => {
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }
    if (!uploadClassId) {
      toast.error('Please select a class first');
      return;
    }

    try {
      // Parse the file to extract roll numbers
      const reader = new FileReader();
      reader.onload = async (e) => {
        const buffer = e.target.result;
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        
        if (rows.length < 2) {
          toast.error('Invalid file format');
          return;
        }

        const rollNumbers = rows.slice(1).map(row => String(row[0] || '').trim()).filter(r => r);
        
        // Check for conflicts
        const conflictRes = await api.post('/students/check-roll-conflicts', {
          classId: uploadClassId,
          rollNumbers
        });

        if (conflictRes.data.hasConflicts && conflictRes.data.conflicts.length > 0) {
          setImportOptionsDialog({
            open: true,
            conflicts: conflictRes.data.conflicts,
            onConfirm: (shiftOption) => {
              handleBulkImport(shiftOption);
            }
          });
        } else {
          handleBulkImport();
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      toast.error('Failed to check for conflicts');
    }
  };

  return (
    <PageStack>
      <PageHeader
        title="Student Management"
        description="Manage student records by class — roll numbers, names, and profiles."
      >
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadTemplate} className="h-9">
            <Download className="mr-2 h-4 w-4" />
            Download Template
          </Button>
          <Button variant="outline" size="sm" className="h-9" onClick={() => {
            if (!checkAndBlock(() => {
              if (!canAddStudent) {
                setLimitDialogOpen(true);
                return;
              }
              setUploadOpen(true);
              setUploadClassId(selectedClass || '');
            })) return;
          }}>
            <Upload className="mr-2 h-4 w-4" />
            Bulk Import
          </Button>
        </div>
      </PageHeader>

      <ErpSection title="Select Class" icon={GraduationCap} tone="blue">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 w-full">
          <FormField label="Class" className="w-full sm:max-w-xs mb-0">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-full h-9">
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

          <Button 
            size="sm"
            onClick={() => {
              if (!checkAndBlock(() => {
                if (!canAddStudent) {
                  setLimitDialogOpen(true);
                  return;
                }
                setOpen(true);
              })) return;
            }} 
            disabled={!selectedClass} 
            className="w-full sm:w-auto h-9 bg-blue-600 hover:bg-blue-700"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add Student
          </Button>
        </div>

        {searchParams.get('classId') && selectedClass && (
          <div className="mt-3 flex items-center justify-between rounded-md bg-blue-50 px-3 py-1.5 border border-blue-100">
            <span className="text-xs font-medium text-blue-900">
              Viewing Students of Class {classes.find(c => c._id === selectedClass)?.className}-{classes.find(c => c._id === selectedClass)?.section}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedClass('')}
              className="h-6 px-2 text-blue-700 hover:text-blue-900 hover:bg-blue-100/50 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear Filter
            </Button>
          </div>
        )}
      </ErpSection>

      <div className="rounded-lg border border-emerald-100 shadow-sm overflow-hidden bg-white">
        
        {/* Added Premium Green Gradient Header */}
        <div className="bg-gradient-to-r from-[#F0FDF4] via-[#E8F8F1] to-[#F0FDF4] px-4 py-3 border-b border-emerald-100">
          <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
            <GraduationCap className="h-4 w-4" /> Students List
          </div>
        </div>

        <div className="p-4 bg-gradient-to-b from-[#F0FDF4]/30 to-transparent">
          <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center border-b border-slate-200 pb-2 mb-4 gap-4">
            
            <div className="flex space-x-6 px-1 w-full sm:w-auto overflow-x-auto">
               <div className="relative text-xs font-bold text-emerald-600 pb-2 border-b-2 border-emerald-500 -mb-[9px] whitespace-nowrap appearance-none">
                 Active Students ({filtered.length})
               </div>
            </div>
            
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search by name or email..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8 h-8 text-xs w-full shadow-sm border-slate-200 focus:ring-emerald-500 rounded-md bg-white transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-100 bg-white">
            <Table>
              <TableHeader className="bg-slate-50/80 border-b border-slate-100">
                <TableRow>
                  <TableHead className="font-semibold text-slate-600 text-[11px] uppercase tracking-wider py-2">Roll No</TableHead>
                  <TableHead className="font-semibold text-slate-600 text-[11px] uppercase tracking-wider py-2">Name</TableHead>
                  {/* Added Parent Name Header */}
                  <TableHead className="font-semibold text-slate-600 text-[11px] uppercase tracking-wider py-2">Parent Name</TableHead>
                  <TableHead className="font-semibold text-slate-600 text-[11px] uppercase tracking-wider py-2">Gender</TableHead>
                  <TableHead className="font-semibold text-slate-600 text-[11px] uppercase tracking-wider py-2 text-right pr-4">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s._id} className="hover:bg-emerald-50/30 transition-colors border-b-slate-100">
                    <TableCell className="font-medium text-slate-700 text-xs py-2">{s.rollNo}</TableCell>
                    <TableCell className="text-slate-800 text-xs py-2">{s.name}</TableCell>
                    {/* Added Parent Name Cell */}
                    <TableCell className="text-slate-600 text-xs py-2">{s.parent?.parentName || 'N/A'}</TableCell>
                    <TableCell className="capitalize text-slate-600 text-xs py-2">{s.gender}</TableCell>
                    <TableCell className="text-right py-2 pr-4">
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isArchived}
                          onClick={() => {
                            setEdit(s);
                            setForm({ 
                              rollNo: s.rollNo, 
                              name: s.name, 
                              gender: s.gender, 
                              admissionDate: s.admissionDate ? new Date(s.admissionDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                              parentName: s.parentName||'', 
                              parentPhone: s.parentPhone||'', 
                              parentEmail: s.parentEmail||'' 
                            });
                            setOpen(true);
                          }}
                          className="h-7 px-2.5 text-[10px] font-medium border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-md"
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isArchived}
                          onClick={async () => {
                            await api.delete(`/students/${s._id}`);
                            toast.success('Deleted');
                            loadStudents(selectedClass);
                          }}
                          className="h-7 px-2.5 text-[10px] font-medium border-red-200 text-red-600 hover:bg-red-50 rounded-md"
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-slate-400 text-xs">
                      No students found matching your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md rounded-xl p-5 shadow-lg border-0">
          <DialogHeader className="mb-3">
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
              <UserPlus className="h-4 w-4 text-blue-600" />
              {edit ? 'Edit' : 'Add'} Student Details
            </DialogTitle>
          </DialogHeader>

          <DialogBody>
            <form className="space-y-4" onSubmit={submit}>
              <FormField label="Roll No">
                {/* CSS added to remove up/down arrows from input */}
                <Input
                  type="text"
                  placeholder="Enter Roll No"
                  value={form.rollNo}
                  onChange={(e) => setForm({ ...form, rollNo: e.target.value })}
                  required
                  className="h-9 rounded-md text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </FormField>
              <FormField label="Name">
                <Input
                  type="text"
                  placeholder="Enter Student Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="h-9 rounded-md text-sm"
                />
              </FormField>
              <FormField label="Gender">
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger className="h-9 rounded-md text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Admission Date">
                <Input
                  type="date"
                  value={form.admissionDate}
                  onChange={(e) => setForm({ ...form, admissionDate: e.target.value })}
                  required
                  className="h-9 rounded-md text-sm"
                />
              </FormField>
              
              <div className="border-t border-slate-100 pt-3 mt-3">
                <p className="text-xs font-semibold text-slate-600 mb-2">Parent/Guardian Information</p>
              </div>
              
              <FormField label="Parent/Guardian Name">
                <Input
                  type="text"
                  placeholder="Enter Parent Name"
                  value={form.parentName}
                  onChange={(e) => setForm({ ...form, parentName: e.target.value })}
                  className="h-9 rounded-md text-sm"
                />
              </FormField>
              <FormField label="Parent Phone (Required)">
                {/* CSS added to remove up/down arrows from input */}
                <Input
                  type="text"
                  placeholder="Enter Parent Phone"
                  value={form.parentPhone}
                  onChange={(e) => setForm({ ...form, parentPhone: e.target.value })}
                  className="h-9 rounded-md text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </FormField>
              <FormField label="Parent Email (Optional)">
                <Input
                  type="email"
                  placeholder="Enter Parent Email"
                  value={form.parentEmail}
                  onChange={(e) => setForm({ ...form, parentEmail: e.target.value })}
                  className="h-9 rounded-md text-sm"
                />
              </FormField>
              
              <div className="pt-1">
                <Button className="w-full h-9 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white">
                  {edit ? 'Save Changes' : 'Create Student'}
                </Button>
              </div>
            </form>
          </DialogBody>
        </DialogContent>
      </Dialog>

      <Dialog open={rollConflictDialog.open} onOpenChange={(open) => {
        if (!open) {
          setRollConflictDialog({ open: false, conflict: null, onConfirm: null });
        }
      }}>
        <DialogContent className="sm:max-w-md rounded-xl p-5 shadow-lg border-0">
          <DialogHeader className="mb-3">
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Roll Number Conflict
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Roll Number <span className="font-semibold text-slate-800">{rollConflictDialog.conflict?.rollNo}</span> is already assigned to <span className="font-semibold text-slate-800">{rollConflictDialog.conflict?.existingStudent}</span>.
              </p>
              <p className="text-sm font-medium text-slate-700">Choose what you want to do:</p>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full h-10 justify-start text-sm border-blue-200 text-blue-700 hover:bg-blue-50"
                  onClick={() => rollConflictDialog.onConfirm?.('insert')}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Insert at Roll No {rollConflictDialog.conflict?.rollNo}</span>
                    <span className="text-xs text-slate-500">Shift all students from Roll No {rollConflictDialog.conflict?.rollNo} onward by +1</span>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-10 justify-start text-sm border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  onClick={() => rollConflictDialog.onConfirm?.('last')}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Insert at Last</span>
                    <span className="text-xs text-slate-500">Automatically assign the next available Roll Number</span>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-10 justify-start text-sm border-slate-200 text-slate-700 hover:bg-slate-50"
                  onClick={() => setRollConflictDialog({ open: false, conflict: null, onConfirm: null })}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>

      <Dialog open={importOptionsDialog.open} onOpenChange={(open) => {
        if (!open) {
          setImportOptionsDialog({ open: false, conflicts: [], onConfirm: null });
        }
      }}>
        <DialogContent className="sm:max-w-md rounded-xl p-5 shadow-lg border-0">
          <DialogHeader className="mb-3">
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Duplicate Roll Numbers Detected
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                {importOptionsDialog.conflicts.length} duplicate Roll Number{importOptionsDialog.conflicts.length > 1 ? 's' : ''} found in the import file.
              </p>
              <div className="max-h-32 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-2">
                {importOptionsDialog.conflicts.slice(0, 5).map((conflict, idx) => (
                  <div key={idx} className="text-xs text-slate-600 border-b border-slate-200 pb-1 last:border-0">
                    Row {conflict.row}: Roll No {conflict.rollNo} (assigned to {conflict.existingStudent})
                  </div>
                ))}
                {importOptionsDialog.conflicts.length > 5 && (
                  <div className="text-xs text-slate-500 pt-1">
                    ...and {importOptionsDialog.conflicts.length - 5} more
                  </div>
                )}
              </div>
              <p className="text-sm font-medium text-slate-700">Choose how you want to continue:</p>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full h-10 justify-start text-sm border-blue-200 text-blue-700 hover:bg-blue-50"
                  onClick={() => importOptionsDialog.onConfirm?.('insert')}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Preserve Excel Roll Numbers</span>
                    <span className="text-xs text-slate-500">Shift existing students automatically</span>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-10 justify-start text-sm border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  onClick={() => importOptionsDialog.onConfirm?.('last')}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Insert Duplicate Students at Last</span>
                    <span className="text-xs text-slate-500">Assign next available Roll Numbers</span>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-10 justify-start text-sm border-amber-200 text-amber-700 hover:bg-amber-50"
                  onClick={() => importOptionsDialog.onConfirm?.('skip')}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Skip Duplicate Roll Numbers</span>
                    <span className="text-xs text-slate-500">Continue importing remaining students</span>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-10 justify-start text-sm border-slate-200 text-slate-700 hover:bg-slate-50"
                  onClick={() => setImportOptionsDialog({ open: false, conflicts: [], onConfirm: null })}
                >
                  Cancel Import
                </Button>
              </div>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadOpen} onOpenChange={(open) => {
        if (!importing) setUploadOpen(open);
      }}>
        <DialogContent className="sm:max-w-xl rounded-xl border-0 p-0 shadow-xl">
          <DialogHeader className="border-b bg-slate-50 px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
              {importing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  Importing...
                </>
              ) : importResults ? (
                <>
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  Import Complete
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5 text-blue-600" />
                  Bulk Import Students
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <DialogBody>
            <div className="p-5 space-y-5">
              {!importing && !importResults && (
                <>
                  <FormField label="Select Class">
                    <Select value={uploadClassId} onValueChange={setUploadClassId}>
                      <SelectTrigger className="h-9 rounded-md text-sm">
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

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <h4 className="mb-1.5 text-xs font-semibold text-slate-700">Required Format</h4>
                    <ul className="text-[11px] text-slate-600 grid grid-cols-2 gap-1.5">
                      <li>• Roll No (req)</li>
                      <li>• Student Name (req)</li>
                      <li>• Gender</li>
                      <li>• Parent Name</li>
                      <li>• Parent Phone</li>
                      <li>• Parent Email</li>
                    </ul>
                  </div>

                  <FormField label="Upload File">
                    <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/50 p-4 text-center hover:bg-blue-50/30 transition-colors">
                      <Input
                        type="file"
                        accept=".csv,.xlsx"
                        onChange={handleFileChange}
                        className="max-w-xs mx-auto text-xs h-8 cursor-pointer"
                      />
                      {file && (
                        <p className="mt-2 text-xs font-medium text-emerald-600 truncate">
                          ✓ {file.name}
                        </p>
                      )}
                    </div>
                  </FormField>
                  <Button
                    className="h-9 w-full rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleBulkImportWithConflictCheck}
                    disabled={!file}
                  >
                    Import Students
                  </Button>
                </>
              )}

              {importing && (
                <div className="space-y-4">
                  {importProgress.currentStudent && (
                    <p className="text-sm font-medium text-blue-800 text-center">{importProgress.currentStudent}</p>
                  )}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${(importProgress.processed / importProgress.total) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs font-medium text-slate-600">
                    <span>Processed: {importProgress.processed}/{importProgress.total}</span>
                    <span className="text-emerald-600">Success: {importProgress.success}</span>
                    <span className="text-red-500">Failed: {importProgress.failed}</span>
                  </div>
                </div>
              )}

              {importResults && !importing && (
                <div className="space-y-4">
                  <div className="grid grid-cols-5 gap-2 text-center">
                    <div className="rounded-md bg-slate-50 p-2 border border-slate-200">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase">Rows</p>
                      <p className="text-lg font-bold text-slate-700">{importResults.totalRows}</p>
                    </div>
                    <div className="rounded-md bg-emerald-50 p-2 border border-emerald-100">
                      <p className="text-[10px] font-semibold text-emerald-600 uppercase">Imported</p>
                      <p className="text-lg font-bold text-emerald-700">{importResults.imported}</p>
                    </div>
                    <div className="rounded-md bg-blue-50 p-2 border border-blue-100">
                      <p className="text-[10px] font-semibold text-blue-600 uppercase">Shifted</p>
                      <p className="text-lg font-bold text-blue-700">{importResults.shifted}</p>
                    </div>
                    <div className="rounded-md bg-purple-50 p-2 border border-purple-100">
                      <p className="text-[10px] font-semibold text-purple-600 uppercase">At Last</p>
                      <p className="text-lg font-bold text-purple-700">{importResults.addedAtLast}</p>
                    </div>
                    <div className="rounded-md bg-amber-50 p-2 border border-amber-100">
                      <p className="text-[10px] font-semibold text-amber-600 uppercase">Skipped</p>
                      <p className="text-lg font-bold text-amber-700">{importResults.skipped}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-md bg-blue-50 p-2 border border-blue-100">
                      <p className="text-[10px] font-semibold text-blue-600 uppercase">Parents</p>
                      <p className="text-lg font-bold text-blue-700">{importResults.parentsCreated}</p>
                    </div>
                    <div className="rounded-md bg-red-50 p-2 border border-red-100">
                      <p className="text-[10px] font-semibold text-red-600 uppercase">Failed</p>
                      <p className="text-lg font-bold text-red-700">{importResults.failed}</p>
                    </div>
                  </div>

                  {importResults.errors?.length > 0 && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                      <p className="text-xs font-bold text-amber-800 mb-1.5">
                        {importResults.errors.length} Errors Found
                      </p>
                      <div className="max-h-24 overflow-y-auto space-y-1 text-[11px] font-medium text-amber-700">
                        {importResults.errors.slice(0, 5).map((err, idx) => (
                          <div key={idx} className="border-b border-amber-200/50 pb-1 last:border-0">
                            Row {err.row}: {err.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <Button
                    className="h-9 w-full rounded-md text-sm font-medium bg-slate-800 hover:bg-slate-900 text-white"
                    onClick={() => {
                      setImportResults(null);
                      setUploadOpen(false);
                      setUploadClassId('');
                    }}
                  >
                    Done
                  </Button>
                </div>
              )}
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>

      <PlanLimitReachedDialog
        open={limitDialogOpen}
        onOpenChange={setLimitDialogOpen}
        limitType="student"
        currentCount={usage?.students || 0}
        limit={usage?.studentLimit || 0}
      />
      <SubscriptionExpiredDialog
        open={expiredDialogOpen}
        onOpenChange={setExpiredDialogOpen}
      />
    </PageStack>
  );
}