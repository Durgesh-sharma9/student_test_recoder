import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Search, Users, Eye, Lock, Unlock, Key } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function ManageParents() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchStudent, setSearchStudent] = useState('');
  const [searchParent, setSearchParent] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [classes, setClasses] = useState([]);
  const [selectedParent, setSelectedParent] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    loadStudents();
  }, [searchStudent, searchParent, classFilter, statusFilter]);

  const loadClasses = async () => {
    try {
      const res = await api.get('/classes');
      setClasses(res.data.classes || []);
    } catch (err) {
      console.error('Failed to load classes:', err);
    }
  };

  const loadStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (searchStudent) params.append('search', searchStudent);
      if (searchParent) params.append('searchParent', searchParent);
      if (classFilter && classFilter !== 'all') params.append('classId', classFilter);
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      console.log('Loading students with params:', params.toString());
      const res = await api.get(`/parents/admin/list?${params}`);
      console.log('Students response:', res.data);
      
      if (res.data && Array.isArray(res.data.students)) {
        setStudents(res.data.students);
      } else {
        console.error('Invalid response format:', res.data);
        setStudents([]);
      }
    } catch (err) {
      console.error('Failed to load students:', err);
      toast.error(err.response?.data?.message || 'Failed to load students');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (student) => {
    if (!student.parentId) {
      toast.error('No parent linked to this student');
      return;
    }
    setSelectedParent({ _id: student.parentId, parentName: student.parentName });
    loadParentDetails(student.parentId);
  };

  const handleToggleStatus = async (student) => {
    if (!student.parentId) {
      toast.error('No parent linked to this student');
      return;
    }
    try {
      const newStatus = student.parentStatus === 'Active' ? 'Inactive' : 'Active';
      await api.put(`/parents/admin/${student.parentId}/status`, { status: newStatus });
      toast.success(`Parent status updated to ${newStatus}`);
      loadStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleResetPassword = async (student) => {
    if (!student.parentId) {
      toast.error('No parent linked to this student');
      return;
    }
    try {
      const res = await api.post(`/parents/admin/${student.parentId}/reset-password`);
      if (res.data.newPassword) {
        setNewPassword(res.data.newPassword);
        toast.success('Password reset. New password generated.');
      } else {
        toast.success('Password reset and email sent to parent.');
      }
      setResetPasswordOpen(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    }
  };

  const loadParentDetails = async (parentId) => {
    try {
      const res = await api.get(`/parents/admin/${parentId}`);
      setSelectedParent(res.data.parent);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load parent details');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  // Add error boundary check
  if (!students) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500">Error loading data</div>
      </div>
    );
  }

  return (
    <PageStack>
      <PageHeader
        title="Parent Management"
        description="Manage parent accounts and view linked students"
      />

      <ErpSection title="Search & Filter" icon={Search} tone="blue">
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Search Student</label>
            <Input
              placeholder="Search by name or roll no"
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              className="h-10"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Search Parent</label>
            <Input
              placeholder="Search by parent name"
              value={searchParent}
              onChange={(e) => setSearchParent(e.target.value)}
              className="h-10"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Class</label>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls._id} value={cls._id}>
                    {cls.className} {cls.section ? `(${cls.section})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Parent Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </ErpSection>

      <ErpSection title="Students with Parents" icon={Users} tone="green">
        {!students || students.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No students found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Roll No</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Parent Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student._id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="font-medium">{student.studentName}</TableCell>
                    <TableCell>{student.rollNo}</TableCell>
                    <TableCell>{student.class} {student.section ? `(${student.section})` : ''}</TableCell>
                    <TableCell>{student.parentName}</TableCell>
                    <TableCell>{student.parentPhone}</TableCell>
                    <TableCell>{student.parentEmail}</TableCell>
                    <TableCell>
                      {student.parentLastLogin 
                        ? new Date(student.parentLastLogin).toLocaleDateString() 
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                        student.parentStatus === 'Active' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {student.parentStatus === 'Active' ? '🟢 Active' : '🔴 Inactive'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedParent({ _id: student.parentId, parentName: student.parentName });
                            loadParentDetails(student.parentId);
                            setDetailsOpen(true);
                          }}
                          disabled={!student.parentId}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleStatus(student)}
                          disabled={!student.parentId}
                        >
                          {student.parentStatus === 'Active' ? (
                            <Lock className="h-4 w-4" />
                          ) : (
                            <Unlock className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleResetPassword(student)}
                          disabled={!student.parentId}
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </ErpSection>

      {/* Parent Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Parent Details</DialogTitle>
          </DialogHeader>
          {selectedParent && (
            <div className="space-y-6">
              <div className="rounded-lg border bg-slate-50 p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-800">Parent Information</h3>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Name:</span>
                    <span className="font-medium">{selectedParent.parentName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phone:</span>
                    <span className="font-medium">{selectedParent.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Email:</span>
                    <span className="font-medium">{selectedParent.email || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span className={`font-medium ${
                      selectedParent.status === 'Active' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {selectedParent.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Last Login:</span>
                    <span className="font-medium">
                      {selectedParent.lastLogin 
                        ? new Date(selectedParent.lastLogin).toLocaleDateString() 
                        : 'Never'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Created Date:</span>
                    <span className="font-medium">
                      {selectedParent.createdAt 
                        ? new Date(selectedParent.createdAt).toLocaleDateString() 
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-slate-50 p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-800">Linked Students</h3>
                {selectedParent.linkedStudents && selectedParent.linkedStudents.length > 0 ? (
                  <div className="space-y-2">
                    {selectedParent.linkedStudents.map((student) => (
                      <div key={student._id} className="flex justify-between rounded border bg-white p-3 text-sm">
                        <div>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-slate-500">{student.className} {student.section && `(${student.section})`}</div>
                        </div>
                        <div className="font-medium">Roll No: {student.rollNo}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No linked students</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password Reset</DialogTitle>
          </DialogHeader>
          {newPassword ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                The parent does not have an email address. Here is the new temporary password:
              </p>
              <div className="rounded-lg border bg-slate-50 p-4">
                <p className="text-center text-2xl font-bold text-slate-900">{newPassword}</p>
              </div>
              <p className="text-xs text-slate-500">
                Please share this password with the parent securely.
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              A new password has been generated and sent to the parent's email address.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </PageStack>
  );
}
