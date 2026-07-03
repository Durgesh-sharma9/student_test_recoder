import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Users, UserPlus, Search, Download, Upload, Bell, MessageCircle, Copy, CheckCircle, AlertCircle, Download as DownloadIcon } from 'lucide-react';
import api from '@/lib/api';
import { useSession } from '@/context/SessionContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useSubscriptionExpiry } from '@/hooks/useSubscriptionExpiry';
import { PageHeader, ErpSection, FormField, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogBody } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PlanLimitReachedDialog from '@/components/subscription/PlanLimitReachedDialog';
import SubscriptionExpiredDialog from '@/components/subscription/SubscriptionExpiredDialog';

export default function ManageUsers() {
  const { isArchived } = useSession();
  const { canAddTeacher, usage } = useSubscription();
  const { isSubscriptionExpired, dialogOpen: expiredDialogOpen, setDialogOpen: setExpiredDialogOpen, checkAndBlock } = useSubscriptionExpiry();
  const [teachers, setTeachers] = useState([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ teacherName: '', email: '', phoneNo: '' });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({
    processed: 0,
    total: 0,
    success: 0,
    failed: 0,
    currentTeacher: '',
  });
  const [reactivateDialog, setReactivateDialog] = useState({ open: false, teacher: null });
  const [activeTab, setActiveTab] = useState('active');
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  
  // Notification modal state
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    priority: 'normal',
  });
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [credentialsModal, setCredentialsModal] = useState({ open: false, data: null });

  useEffect(() => {
    api.get('/users?role=teacher').then((res) => setTeachers(res.data.users || []));
  }, []);

  const filtered = useMemo(() => {
    const statusFiltered = teachers.filter((t) => t.status === (activeTab === 'active' ? 'Active' : 'Inactive'));
    return statusFiltered.filter((t) => `${t.teacherName || t.name} ${t.email}`.toLowerCase().includes(query.toLowerCase()));
  }, [teachers, query, activeTab]);
  
  // Changed items per page to 10
  const perPage = 10;
  const paged = filtered.slice((page - 1) * perPage, page * perPage);
  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const activeCount = teachers.filter((t) => t.status === 'Active').length;
  const inactiveCount = teachers.filter((t) => t.status === 'Inactive').length;

  const refresh = async () => {
    const res = await api.get('/users?role=teacher');
    setTeachers(res.data.users || []);
  };

  const downloadTemplate = async () => {
    try {
      const response = await api.get('/users/download-template', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'teacher_import_template.xlsx');
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

    setImporting(true);
    setImportResults(null);
    setImportProgress({
      processed: 0,
      total: 100,
      success: 0,
      failed: 0,
      currentTeacher: '',
    });

    const formData = new FormData();
    formData.append('file', file);

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
        currentTeacher: `Processing teacher ${Math.round(simulatedProgress)}...`,
      }));
    }, 200);

    try {
      const response = await api.post('/users/bulk-import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      clearInterval(progressInterval);
      
      setImportResults(response.data);
      setImportProgress({
        processed: response.data.totalRows || 0,
        total: response.data.totalRows || 0,
        success: response.data.imported || 0,
        failed: response.data.failed || 0,
        currentTeacher: '',
      });
      
      toast.success(`Import completed: ${response.data.imported} teachers imported, ${response.data.failed} failed`);
      refresh();
      setFile(null);
    } catch (err) {
      clearInterval(progressInterval);
      toast.error(err.response?.data?.message || 'Import failed');
      setImportProgress(prev => ({
        ...prev,
        failed: prev.total,
        currentTeacher: '',
      }));
    } finally {
      setImporting(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (edit) {
        await api.put(`/users/${edit._id}`, form);
        toast.success('Teacher updated');
        setOpen(false);
        setEdit(null);
        setForm({ teacherName: '', email: '', phoneNo: '' });
        refresh();
      } else {
        const inactiveTeacher = teachers.find(t => t.email === form.email && t.status === 'Inactive');
        if (inactiveTeacher) {
          setReactivateDialog({ open: true, teacher: inactiveTeacher });
        } else {
          const res = await api.post('/users', { ...form, role: 'teacher' });
          toast.success('Teacher created successfully');
          setOpen(false);
          setForm({ teacherName: '', email: '', phoneNo: '' });
          refresh();
          
          if (res.data.user?.tempPassword) {
            setCredentialsModal({
              open: true,
              data: {
                name: res.data.user.teacherName || res.data.user.name,
                email: res.data.user.email,
                password: res.data.user.tempPassword,
                phone: res.data.user.phoneNo,
              },
            });
          }
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleReactivate = async () => {
    try {
      const teacher = reactivateDialog.teacher;
      await api.put(`/users/${teacher._id}`, {
        ...form,
        status: 'Active',
      });
      toast.success('Teacher reactivated successfully');
      setReactivateDialog({ open: false, teacher: null });
      setOpen(false);
      setForm({ teacherName: '', email: '', phoneNo: '' });
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reactivation failed');
    }
  };

  const handleSendNotification = async () => {
    try {
      if (!notificationForm.title || !notificationForm.message) {
        toast.error('Please fill in all required fields');
        return;
      }

      const payload = {
        title: notificationForm.title,
        message: notificationForm.message,
        priority: notificationForm.priority,
        recipientIds: [selectedTeacher._id],
      };

      if (attachmentFile) {
        const formData = new FormData();
        formData.append('title', notificationForm.title);
        formData.append('message', notificationForm.message);
        formData.append('priority', notificationForm.priority);
        formData.append('recipientIds', JSON.stringify([selectedTeacher._id]));
        formData.append('attachment', attachmentFile);

        await api.post('/notifications', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        await api.post('/notifications', payload);
      }

      toast.success('Notification sent successfully');
      setNotifyModalOpen(false);
      setSelectedTeacher(null);
      setNotificationForm({ title: '', message: '', priority: 'normal' });
      setAttachmentFile(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send notification');
    }
  };

  const handleWhatsAppShare = () => {
    const { name, email, password, phone } = credentialsModal.data;
    const siteUrl = import.meta.env.VITE_API_URL || 'http://localhost:5173';
    const message = `School Login Credentials\n\nName: ${name}\nEmail: ${email}\nPassword: ${password}\n\nLogin URL:\n${siteUrl}/login`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCopyCredentials = () => {
    const { name, email, password } = credentialsModal.data;
    const siteUrl = import.meta.env.VITE_API_URL || 'http://localhost:5173';
    const message = `School Login Credentials\n\nName: ${name}\nEmail: ${email}\nPassword: ${password}\n\nLogin URL:\n${siteUrl}/login`;
    navigator.clipboard.writeText(message);
    toast.success('Credentials copied to clipboard');
  };

  return (
    <PageStack>
      <PageHeader
        title="Teacher Management"
        description="Register teachers, manage credentials, and maintain your school teaching staff."
      >
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={downloadTemplate} className="h-9 bg-white shadow-sm">
            <Download className="mr-1.5 h-4 w-4" />
            Download Template
          </Button>
          <Button size="sm" variant="outline" className="h-9 bg-white shadow-sm" onClick={() => {
            if (!checkAndBlock(() => {
              if (!canAddTeacher) {
                setLimitDialogOpen(true);
                return;
              }
              setUploadOpen(true);
            })) return;
          }}>
            <Upload className="mr-1.5 h-4 w-4" />
            Upload Teachers
          </Button>
          <Button size="sm" className="h-9 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm border-0" onClick={() => {
            if (!checkAndBlock(() => {
              if (!canAddTeacher) {
                setLimitDialogOpen(true);
                return;
              }
              setOpen(true);
            })) return;
          }}>
            <UserPlus className="mr-1.5 h-4 w-4" />
            Add Teacher
          </Button>
        </div>
      </PageHeader>

      <ErpSection title="Teachers List" icon={Users} tone="green">
        {/* Green tone soft gradient background */}
        <div className="p-4 rounded-xl border border-emerald-50 bg-gradient-to-br from-emerald-50/70 via-transparent to-transparent">
          
          {/* Integrated Search and Tabs Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 border-b border-slate-200 pb-3">
            <div className="flex gap-4">
              <button
                onClick={() => { setActiveTab('active'); setPage(1); }}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === 'active'
                    ? 'text-emerald-700 border-b-2 border-emerald-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Active Teachers ({activeCount})
              </button>
              <button
                onClick={() => { setActiveTab('inactive'); setPage(1); }}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === 'inactive'
                    ? 'text-emerald-700 border-b-2 border-emerald-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Inactive Teachers ({inactiveCount})
              </button>
            </div>
            
            {/* Search Input moved here */}
            <div className="w-full sm:w-72 relative">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name or email..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-8 h-8 text-sm bg-white border-slate-200 shadow-sm w-full"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="h-10 py-2 text-xs font-semibold text-slate-600">Name</TableHead>
                  <TableHead className="h-10 py-2 text-xs font-semibold text-slate-600">Email</TableHead>
                  <TableHead className="h-10 py-2 text-xs font-semibold text-slate-600">Phone</TableHead>
                  <TableHead className="h-10 py-2 text-xs font-semibold text-slate-600">Password Status</TableHead>
                  <TableHead className="h-10 py-2 text-xs font-semibold text-slate-600">Status</TableHead>
                  <TableHead className="h-10 py-2 text-xs font-semibold text-slate-600 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-sm text-slate-500">
                      No teachers found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paged.map((t) => (
                    <TableRow key={t._id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="py-2 text-sm font-medium">{t.teacherName || t.name}</TableCell>
                      <TableCell className="py-2 text-sm text-slate-600">{t.email}</TableCell>
                      <TableCell className="py-2 text-sm text-slate-600">{t.phoneNo || '-'}</TableCell>
                      <TableCell className="py-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                          t.mustChangePassword ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {t.mustChangePassword ? 'Temporary Password' : 'Password Changed'}
                        </span>
                      </TableCell>
                      <TableCell className="py-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                          t.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${t.status === 'Active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          {t.status || 'Active'}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {activeTab === 'active' ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] px-2 text-blue-600 border-blue-200 bg-blue-50/50 hover:bg-blue-100/80 shadow-sm"
                                disabled={isArchived}
                                onClick={() => {
                                  setEdit(t);
                                  setForm({
                                    teacherName: t.teacherName || t.name,
                                    email: t.email,
                                    phoneNo: t.phoneNo || '',
                                  });
                                  setOpen(true);
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                className="h-7 w-7 p-0 bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200 border-0"
                                disabled={isArchived}
                                onClick={() => {
                                  setSelectedTeacher(t);
                                  setNotifyModalOpen(true);
                                }}
                                title={`Send Notification to ${t.teacherName || t.name}`}
                              >
                                <Bell className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] px-2 text-orange-600 border-orange-200 bg-orange-50/50 hover:bg-orange-100/80 shadow-sm"
                                disabled={isArchived}
                                onClick={async () => {
                                  if (confirm('Reset Password?\n\nA new temporary password will be generated and sent to the teacher via email.')) {
                                    try {
                                      await api.post(`/auth/reset-teacher-password/${t._id}`);
                                      toast.success('Password reset successfully. New password sent to teacher.');
                                    } catch (err) {
                                      toast.error(err.response?.data?.message || 'Failed to reset password');
                                    }
                                  }
                                }}
                              >
                                Reset Pass
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] px-2 text-red-600 border-red-200 bg-red-50/50 hover:bg-red-100/80 shadow-sm"
                                disabled={isArchived}
                                onClick={async () => {
                                  if (confirm('Deactivate Teacher?\n\nThis teacher will no longer be able to log in but historical data will remain.')) {
                                    await api.put(`/users/${t._id}`, { status: 'Inactive' });
                                    toast.success('Teacher deactivated');
                                    refresh();
                                  }
                                }}
                              >
                                Disable
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] px-2 text-blue-600 border-blue-200 bg-blue-50/50 hover:bg-blue-100/80 shadow-sm"
                                disabled={isArchived}
                                onClick={() => {
                                  setEdit(t);
                                  setForm({
                                    teacherName: t.teacherName || t.name,
                                    email: t.email,
                                    phoneNo: t.phoneNo || '',
                                  });
                                  setOpen(true);
                                }}
                              >
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] px-2 text-emerald-600 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/80 shadow-sm"
                                disabled={isArchived}
                                onClick={async () => {
                                  await api.put(`/users/${t._id}`, { status: 'Active' });
                                  toast.success('Teacher reactivated');
                                  refresh();
                                }}
                              >
                                Reactivate
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs bg-white" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Prev
            </Button>
            <span className="text-xs font-medium text-slate-600">
              {page}/{pages}
            </span>
            <Button size="sm" variant="outline" className="h-8 text-xs bg-white" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      </ErpSection>

      {/* Add/Edit Teacher Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl rounded-2xl p-0 overflow-hidden bg-gradient-to-br from-white to-slate-50 border-slate-200 shadow-xl">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50/50 px-6 py-4 border-b border-slate-100">
            <DialogTitle className="text-lg font-bold text-slate-800">
              {edit ? 'Edit Teacher' : 'Add Teacher'}
            </DialogTitle>
          </DialogHeader>

          <DialogBody className="p-6">
            <form className="space-y-6" onSubmit={submit}>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Teacher Name">
                  <Input
                    placeholder="e.g. John Doe"
                    value={form.teacherName}
                    onChange={(e) => setForm({ ...form, teacherName: e.target.value })}
                    className="h-9 text-sm rounded-lg bg-white border-slate-200 shadow-sm"
                    required
                  />
                </FormField>

                <FormField label="Email">
                  <Input
                    type="email"
                    placeholder="teacher@school.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="h-9 text-sm rounded-lg bg-white border-slate-200 shadow-sm"
                    required
                  />
                </FormField>

                <FormField label="Phone No">
                  <Input
                    placeholder="e.g. 9876543210"
                    value={form.phoneNo}
                    onChange={(e) => setForm({ ...form, phoneNo: e.target.value })}
                    className="h-9 text-sm rounded-lg bg-white border-slate-200 shadow-sm"
                    required
                  />
                </FormField>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" className="h-9 text-sm" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="h-9 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-sm">
                  {edit ? "Save Changes" : "Create Teacher"}
                </Button>
              </div>
            </form>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Modal */}
      <Dialog open={uploadOpen} onOpenChange={(open) => {
        if (!importing) setUploadOpen(open);
      }}>
        <DialogContent className="sm:max-w-xl rounded-2xl border-0 p-0 shadow-xl overflow-hidden bg-gradient-to-br from-white to-slate-50">
          <DialogHeader className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50/50 px-6 py-4">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-slate-800">
              {importing ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  Importing Teachers...
                </>
              ) : importResults ? (
                <>
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  Import Complete
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5 text-blue-600" />
                  Bulk Upload Teachers
                </>
              )}
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-1">
              {importing ? 'Please wait while teachers are being imported...' : importResults ? 'Import summary' : 'Upload teacher records using CSV or XLSX files'}
            </p>
          </DialogHeader>

          <DialogBody>
            <div className="space-y-4 p-6">
              {!importing && !importResults && (
                <>
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 shadow-sm">
                    <h4 className="mb-1.5 text-xs font-semibold text-blue-800">
                      Required File Format
                    </h4>
                    <ul className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-blue-700/80">
                      <li>• Teacher Name (required)</li>
                      <li>• Email (required)</li>
                      <li>• Phone No (optional)</li>
                      <li>• Password auto-generated</li>
                    </ul>
                  </div>

                  <FormField label="Upload File">
                    <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-5 text-center transition-all hover:border-blue-400 hover:bg-blue-50/50">
                      <Upload className="mx-auto mb-2 h-8 w-8 text-blue-500/80" />
                      <h3 className="text-xs font-semibold text-slate-700">
                        Upload CSV or XLSX File
                      </h3>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        Drag & drop or click below to browse
                      </p>
                      <Input
                        type="file"
                        accept=".csv,.xlsx"
                        onChange={handleFileChange}
                        className="mt-3 max-w-[200px] mx-auto text-xs h-8 bg-white cursor-pointer"
                      />
                      {file && (
                        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 max-w-[200px] mx-auto flex items-center justify-center gap-1.5 shadow-sm">
                          <CheckCircle className="h-3 w-3 text-emerald-600 flex-shrink-0" />
                          <p className="text-[10px] font-medium text-emerald-700 truncate">
                            {file.name}
                          </p>
                        </div>
                      )}
                    </div>
                  </FormField>
                </>
              )}

              {importing && (
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="space-y-4">
                    {importProgress.currentTeacher && (
                      <div className="rounded-lg bg-blue-50 p-3 border border-blue-100">
                        <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider mb-0.5">Current Teacher</p>
                        <p className="text-xs font-medium text-blue-900 truncate">{importProgress.currentTeacher}</p>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">Processed: {importProgress.processed} / {importProgress.total}</span>
                        <span className="font-semibold text-blue-600">{Math.round((importProgress.processed / importProgress.total) * 100)}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300 ease-out"
                          style={{ width: `${(importProgress.processed / importProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg bg-emerald-50 p-2 text-center border border-emerald-100">
                        <p className="text-[10px] text-emerald-600 uppercase tracking-wider">Success</p>
                        <p className="text-lg font-bold text-emerald-700">{importProgress.success}</p>
                      </div>
                      <div className="rounded-lg bg-red-50 p-2 text-center border border-red-100">
                        <p className="text-[10px] text-red-600 uppercase tracking-wider">Failed</p>
                        <p className="text-lg font-bold text-red-700">{importProgress.failed}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-2 text-center border border-slate-200">
                        <p className="text-[10px] text-slate-600 uppercase tracking-wider">Remaining</p>
                        <p className="text-lg font-bold text-slate-700">{importProgress.total - importProgress.processed}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {importResults && !importing && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg bg-white p-2 text-center shadow-sm border border-slate-200">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total Teachers</p>
                      <p className="text-lg font-bold text-slate-800">{importResults.totalRows}</p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-2 text-center border border-emerald-100 shadow-sm">
                      <p className="text-[10px] text-emerald-600 uppercase tracking-wider">Imported</p>
                      <p className="text-lg font-bold text-emerald-700">{importResults.imported}</p>
                    </div>
                    <div className="rounded-lg bg-red-50 p-2 text-center border border-red-100 shadow-sm">
                      <p className="text-[10px] text-red-600 uppercase tracking-wider">Failed</p>
                      <p className="text-lg font-bold text-red-700">{importResults.failed}</p>
                    </div>
                  </div>

                  {importResults.errors?.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 shadow-sm">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-amber-800 mb-1.5">
                            {importResults.errors.length} Error{importResults.errors.length > 1 ? 's' : ''} Found
                          </p>
                          <div className="max-h-24 overflow-y-auto space-y-1 text-[10px] text-amber-700 bg-white/50 p-2 rounded border border-amber-100">
                            {importResults.errors.slice(0, 5).map((err, idx) => (
                              <div key={idx} className="border-b border-amber-200/50 pb-1 last:border-0 last:pb-0">
                                Row {err.row}: {err.error}
                              </div>
                            ))}
                            {importResults.errors.length > 5 && (
                              <p className="text-amber-600/80 italic pt-1">
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
                              link.download = 'teacher_import_error_report.txt';
                              document.body.appendChild(link);
                              link.click();
                              link.remove();
                              URL.revokeObjectURL(url);
                            }}
                            variant="outline"
                            size="sm"
                            className="mt-2 h-7 text-[10px] px-2 border-amber-300 text-amber-700 hover:bg-amber-100"
                          >
                            <DownloadIcon className="mr-1.5 h-3 w-3" />
                            Download Error Report
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-slate-100">
                {!importing && !importResults && (
                  <Button
                    size="sm"
                    className="h-9 px-6 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm border-0"
                    onClick={handleBulkImport}
                    disabled={!file}
                  >
                    Import Teachers
                  </Button>
                )}

                {importResults && !importing && (
                  <Button
                    size="sm"
                    className="h-9 px-6 text-sm bg-white border border-slate-200 text-slate-700 shadow-sm hover:bg-slate-50"
                    onClick={() => {
                      setImportResults(null);
                      setUploadOpen(false);
                    }}
                  >
                    Done
                  </Button>
                )}
              </div>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Reactivate Modal */}
      <Dialog open={reactivateDialog.open} onOpenChange={(open) => setReactivateDialog({ open, teacher: null })}>
        <DialogContent className="sm:max-w-md rounded-xl p-0 overflow-hidden shadow-lg bg-gradient-to-br from-white to-slate-50">
          <DialogHeader className="bg-amber-50 border-b border-amber-100 px-5 py-4">
            <DialogTitle className="text-base font-bold text-amber-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Reactivate Teacher
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="p-5 space-y-4">
            <p className="text-xs text-slate-600">
              A teacher with this email already exists but is marked as inactive. Do you want to reactivate their account?
            </p>
            <div className="rounded-lg bg-white border border-slate-200 p-3 shadow-sm">
              <p className="text-sm font-semibold text-slate-800">{reactivateDialog.teacher?.teacherName || reactivateDialog.teacher?.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{reactivateDialog.teacher?.email}</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" className="h-8 text-xs bg-white" onClick={() => setReactivateDialog({ open: false, teacher: null })}>
                Cancel
              </Button>
              <Button size="sm" className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-sm border-0" onClick={handleReactivate}>
                Reactivate
              </Button>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Notify Modal */}
      <Dialog open={notifyModalOpen} onOpenChange={setNotifyModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden shadow-xl bg-gradient-to-br from-white to-slate-50">
          <DialogHeader className="bg-gradient-to-r from-purple-50 to-indigo-50/80 border-b border-purple-100/50 px-5 py-4">
            <DialogTitle className="text-base font-bold text-slate-800">Send Notification</DialogTitle>
            <DialogDescription className="text-xs mt-0.5">
              To: <span className="font-medium text-slate-700">{selectedTeacher?.teacherName || selectedTeacher?.name}</span>
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="p-5 space-y-4">
            <FormField label="Title">
              <Input
                placeholder="Subject of notification"
                value={notificationForm.title}
                onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                className="h-9 text-sm bg-white shadow-sm"
              />
            </FormField>
            <FormField label="Message">
              <Textarea
                placeholder="Type your message here..."
                value={notificationForm.message}
                onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                rows={3}
                className="text-sm bg-white shadow-sm resize-none"
              />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Priority">
                <Select value={notificationForm.priority} onValueChange={(value) => setNotificationForm({ ...notificationForm, priority: value })}>
                  <SelectTrigger className="h-9 text-sm bg-white shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="important">Important</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Attachment (Optional)">
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.xlsx,.csv,.jpg,.jpeg,.png"
                  className="h-9 text-[10px] bg-white shadow-sm cursor-pointer pt-2"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const maxSize = 10 * 1024 * 1024;
                      if (file.size > maxSize) {
                        toast.error('File size exceeds 10MB limit');
                        return;
                      }
                      setAttachmentFile(file);
                    }
                  }}
                />
              </FormField>
            </div>
            {attachmentFile && (
              <p className="text-[10px] text-slate-500 italic truncate">
                Selected: {attachmentFile.name}
              </p>
            )}
          </DialogBody>
          <DialogFooter className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <Button size="sm" variant="outline" className="h-8 text-xs bg-white" onClick={() => {
              setNotifyModalOpen(false);
              setAttachmentFile(null);
            }}>
              Cancel
            </Button>
            <Button size="sm" className="h-8 text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-sm border-0" onClick={handleSendNotification}>
              <Bell className="mr-1.5 h-3 w-3" />
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials Modal */}
      <Dialog open={credentialsModal.open} onOpenChange={(open) => setCredentialsModal({ ...credentialsModal, open })}>
        <DialogContent className="sm:max-w-sm rounded-xl p-0 overflow-hidden shadow-lg bg-white border border-slate-200">
          <DialogHeader className="bg-emerald-50 border-b border-emerald-100 px-5 py-4">
            <DialogTitle className="text-base font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Account Created
            </DialogTitle>
            <DialogDescription className="text-xs text-emerald-700/80 mt-1">
              Please share these credentials securely.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="p-5">
            {credentialsModal.data && (
              <div className="space-y-4">
                <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 space-y-2">
                  <div className="flex justify-between items-center border-b border-slate-200/60 pb-1.5">
                    <span className="text-[11px] font-medium text-slate-500 uppercase">Name</span>
                    <span className="text-xs font-semibold text-slate-800">{credentialsModal.data.name}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-200/60 pb-1.5">
                    <span className="text-[11px] font-medium text-slate-500 uppercase">Email</span>
                    <span className="text-xs font-semibold text-slate-800">{credentialsModal.data.email}</span>
                  </div>
                  <div className="flex justify-between items-center pt-0.5">
                    <span className="text-[11px] font-medium text-slate-500 uppercase">Temp Password</span>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{credentialsModal.data.password}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {credentialsModal.data.phone && (
                    <Button size="sm" onClick={handleWhatsAppShare} className="flex-1 h-8 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                      <MessageCircle className="mr-1.5 h-3 w-3" />
                      WhatsApp
                    </Button>
                  )}
                  <Button size="sm" onClick={handleCopyCredentials} variant="outline" className="flex-1 h-8 text-[10px] bg-white shadow-sm">
                    <Copy className="mr-1.5 h-3 w-3" />
                    Copy
                  </Button>
                </div>
              </div>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      <PlanLimitReachedDialog
        open={limitDialogOpen}
        onOpenChange={setLimitDialogOpen}
        limitType="teacher"
        currentCount={usage?.teachers || 0}
        limit={usage?.teacherLimit || 0}
      />
      <SubscriptionExpiredDialog
        open={expiredDialogOpen}
        onOpenChange={setExpiredDialogOpen}
      />
    </PageStack>
  );
}