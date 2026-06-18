import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Users, UserPlus, Search, Download, Upload, Bell, MessageCircle, Copy, X } from 'lucide-react';
import api from '@/lib/api';
import { useSession } from '@/context/SessionContext';
import { PageHeader, ErpSection, FormField, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ManageUsers() {
  const { isArchived } = useSession();
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
  const [reactivateDialog, setReactivateDialog] = useState({ open: false, teacher: null });
  const [activeTab, setActiveTab] = useState('active');
  
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
  const perPage = 8;
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

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/users/bulk-import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setImportResults(response.data);
      toast.success(`Import completed: ${response.data.imported} teachers imported, ${response.data.failed} failed`);
      refresh();
      setFile(null);
      setUploadOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
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
        // Check if teacher with same email exists and is inactive
        const inactiveTeacher = teachers.find(t => t.email === form.email && t.status === 'Inactive');
        if (inactiveTeacher) {
          setReactivateDialog({ open: true, teacher: inactiveTeacher });
        } else {
          const res = await api.post('/users', { ...form, role: 'teacher' });
          toast.success('Teacher created successfully');
          setOpen(false);
          setForm({ teacherName: '', email: '', phoneNo: '' });
          refresh();
          
          // Show credentials modal if tempPassword is returned
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

      const formData = new FormData();
      formData.append('title', notificationForm.title);
      formData.append('message', notificationForm.message);
      formData.append('priority', notificationForm.priority);
      formData.append('recipientIds', JSON.stringify([selectedTeacher._id]));
      
      if (attachmentFile) {
        formData.append('attachment', attachmentFile);
      }

      await api.post('/notifications', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

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
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Download Template
          </Button>
          <Button variant="outline" onClick={() => setUploadOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Teachers
          </Button>
          <Button onClick={() => setOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Teacher
          </Button>
        </div>
      </PageHeader>

      <ErpSection title="Search Teachers" icon={Search} tone="blue">
        <FormField label="Search by name or email">
          <Input
            placeholder="Search teacher"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </FormField>
      </ErpSection>

      <ErpSection title="Teachers List" icon={Users} tone="green">
        <div className="flex gap-4 mb-4 border-b border-slate-200">
          <button
            onClick={() => { setActiveTab('active'); setPage(1); }}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'active'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Active Teachers ({activeCount})
          </button>
          <button
            onClick={() => { setActiveTab('inactive'); setPage(1); }}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'inactive'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Inactive Teachers ({inactiveCount})
          </button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Password Status</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((t) => (
                <TableRow key={t._id} className="hover:bg-slate-50 transition-colors">
                  <TableCell className="font-medium">{t.teacherName || t.name}</TableCell>
                  <TableCell>{t.email}</TableCell>
                  <TableCell>{t.phoneNo || '-'}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                      t.mustChangePassword ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {t.mustChangePassword ? 'Temporary Password' : 'Password Changed'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                      t.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      <span className={`h-2 w-2 rounded-full ${t.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`} />
                      {t.status || 'Active'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {activeTab === 'active' ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
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
                            className="bg-gradient-to-r from-purple-600 to-blue-500 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 transition-all duration-200"
                            disabled={isArchived}
                            onClick={() => {
                              setSelectedTeacher(t);
                              setNotifyModalOpen(true);
                            }}
                            title={`Send Notification to ${t.teacherName || t.name}`}
                          >
                            <Bell className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-orange-600 border-orange-200 hover:bg-orange-50"
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
                            Reset Password
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            disabled={isArchived}
                            onClick={async () => {
                              if (confirm('Deactivate Teacher?\n\nThis teacher will no longer be able to log in but historical data will remain.')) {
                                await api.put(`/users/${t._id}`, { status: 'Inactive' });
                                toast.success('Teacher deactivated');
                                refresh();
                              }
                            }}
                          >
                            Deactivate
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
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
                            className="text-green-600 border-green-200 hover:bg-green-50"
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
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </Button>
          <span className="text-sm text-slate-600">
            {page}/{pages}
          </span>
          <Button size="sm" variant="outline" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </ErpSection>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-4xl rounded-3xl p-8">
          <DialogHeader>
            <DialogTitle>{edit ? 'Edit Teacher' : 'Add Teacher'}</DialogTitle>
          </DialogHeader>
          <form className="space-y-8" onSubmit={submit}>
  <div className="grid gap-8 md:grid-cols-2">
    <FormField label="Teacher Name">
      <Input
        placeholder="Teacher Name"
        value={form.teacherName}
        onChange={(e) =>
          setForm({ ...form, teacherName: e.target.value })
        }
        className="h-14 rounded-2xl"
        required
      />
    </FormField>

    <FormField label="Email">
      <Input
        type="email"
        placeholder="Email"
        value={form.email}
        onChange={(e) =>
          setForm({ ...form, email: e.target.value })
        }
        className="h-14 rounded-2xl"
        required
      />
    </FormField>

    <FormField label="Phone No">
      <Input
        placeholder="Phone No"
        value={form.phoneNo}
        onChange={(e) =>
          setForm({ ...form, phoneNo: e.target.value })
        }
        className="h-14 rounded-2xl"
        required
      />
    </FormField>
  </div>

  <Button
    className="h-12 w-full rounded-xl text-base font-semibold"
    variant={edit ? "default" : "success"}
  >
    {edit ? "Save Teacher" : "Create Teacher"}
  </Button>
</form>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border-0 p-0">
          <DialogHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5">
            <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
              <Upload className="h-6 w-6 text-blue-600" />
              Bulk Upload Teachers
            </DialogTitle>
            <p className="text-sm text-slate-500 mt-1">
              Upload teacher records using CSV or XLSX files
            </p>
          </DialogHeader>

          <div className="space-y-6 p-6">
            <div className="rounded-xl border bg-slate-50 p-4">
              <h4 className="mb-2 text-sm font-semibold text-slate-800">
                Required File Format
              </h4>
              <ul className="space-y-1 text-xs text-slate-600 grid grid-cols-2 gap-2">
                <li>• Teacher Name (required)</li>
                <li>• Email (required)</li>
                <li>• Phone No (optional)</li>
                <li>• Password will be auto-generated</li>
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

            {importResults && (
              <div className="rounded-xl border bg-slate-50 p-4">
                <h4 className="mb-3 text-sm font-semibold">
                  Import Summary
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-white p-3 text-center shadow-sm border">
                    <p className="text-[11px] text-slate-500 uppercase tracking-wider">Total Rows</p>
                    <p className="text-2xl font-bold mt-0.5">{importResults.totalRows}</p>
                  </div>
                  <div className="rounded-lg bg-green-50 p-3 text-center border border-green-100">
                    <p className="text-[11px] text-green-600 uppercase tracking-wider">Imported</p>
                    <p className="text-2xl font-bold text-green-700 mt-0.5">{importResults.imported}</p>
                  </div>
                  <div className="rounded-lg bg-red-50 p-3 text-center border border-red-100">
                    <p className="text-[11px] text-red-600 uppercase tracking-wider">Failed</p>
                    <p className="text-2xl font-bold text-red-700 mt-0.5">{importResults.failed}</p>
                  </div>
                </div>

                {importResults.errors?.length > 0 && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="mb-2 text-xs font-semibold text-red-700">Errors</p>
                    <div className="max-h-32 overflow-y-auto space-y-1 text-xs text-red-600 custom-scrollbar">
                      {importResults.errors.map((err, idx) => (
                        <div key={idx} className="border-b border-red-100/50 pb-1 last:border-0">
                          Row {err.row}: {err.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <Button
              className="h-11 w-full rounded-xl text-base font-semibold shadow-sm"
              onClick={handleBulkImport}
              disabled={!file || importing}
            >
              {importing ? 'Importing Teachers...' : 'Import Teachers'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reactivateDialog.open} onOpenChange={(open) => setReactivateDialog({ open, teacher: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reactivate Teacher</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Teacher already exists and is inactive.
            </p>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="font-medium text-slate-800">{reactivateDialog.teacher?.teacherName || reactivateDialog.teacher?.name}</p>
              <p className="text-sm text-slate-600">{reactivateDialog.teacher?.email}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReactivateDialog({ open: false, teacher: null })}>
                Cancel
              </Button>
              <Button onClick={handleReactivate}>
                Reactivate Teacher
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={notifyModalOpen} onOpenChange={setNotifyModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Notification</DialogTitle>
            <DialogDescription>
              Send a notification to {selectedTeacher?.teacherName || selectedTeacher?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <FormField label="Title">
              <Input
                placeholder="Enter notification title"
                value={notificationForm.title}
                onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
              />
            </FormField>
            <FormField label="Message">
              <Textarea
                placeholder="Enter notification message"
                value={notificationForm.message}
                onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                rows={4}
              />
            </FormField>
            <FormField label="Priority">
              <Select value={notificationForm.priority} onValueChange={(value) => setNotificationForm({ ...notificationForm, priority: value })}>
                <SelectTrigger>
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
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const maxSize = 10 * 1024 * 1024; // 10MB
                    if (file.size > maxSize) {
                      toast.error('File size exceeds 10MB limit');
                      return;
                    }
                    setAttachmentFile(file);
                  }
                }}
              />
              {attachmentFile && (
                <p className="mt-1 text-xs text-slate-600">
                  Selected: {attachmentFile.name}
                </p>
              )}
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setNotifyModalOpen(false);
              setAttachmentFile(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleSendNotification}>
              <Bell className="mr-2 h-4 w-4" />
              Send Notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={credentialsModal.open} onOpenChange={(open) => setCredentialsModal({ ...credentialsModal, open })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Account Created Successfully</DialogTitle>
            <DialogDescription>
              Share these credentials with the teacher
            </DialogDescription>
          </DialogHeader>
          {credentialsModal.data && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-700">Name:</span>
                  <span className="text-sm text-slate-900">{credentialsModal.data.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-700">Email:</span>
                  <span className="text-sm text-slate-900">{credentialsModal.data.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-700">Password:</span>
                  <span className="text-sm text-slate-900 font-semibold">{credentialsModal.data.password}</span>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                {credentialsModal.data.phone && (
                  <Button onClick={handleWhatsAppShare} className="flex-1 bg-green-600 hover:bg-green-700">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Send WhatsApp
                  </Button>
                )}
                <Button onClick={handleCopyCredentials} variant="outline" className="flex-1">
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Credentials
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCredentialsModal({ open: false, data: null })}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageStack>
  );
}
