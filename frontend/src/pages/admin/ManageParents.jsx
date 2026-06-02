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
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedParent, setSelectedParent] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    loadParents();
  }, [search, statusFilter]);

  const loadParents = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      
      const res = await api.get(`/parents/admin/list?${params}`);
      setParents(res.data.parents || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load parents');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (parent) => {
    setSelectedParent(parent);
    setDetailsOpen(true);
  };

  const handleToggleStatus = async (parent) => {
    try {
      const newStatus = parent.status === 'Active' ? 'Inactive' : 'Active';
      await api.put(`/parents/admin/${parent._id}/status`, { status: newStatus });
      toast.success(`Parent status updated to ${newStatus}`);
      loadParents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleResetPassword = async (parent) => {
    try {
      const res = await api.post(`/parents/admin/${parent._id}/reset-password`);
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

  return (
    <PageStack>
      <PageHeader
        title="Parent Management"
        description="Manage parent accounts and view linked students"
      />

      <ErpSection title="Search & Filter" icon={Search} tone="blue">
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Search</label>
            <Input
              placeholder="Search by name, phone, or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </ErpSection>

      <ErpSection title="Parents" icon={Users} tone="green">
        {parents.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No parents found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parent Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Children</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parents.map((parent) => (
                  <TableRow key={parent._id}>
                    <TableCell className="font-medium">{parent.parentName}</TableCell>
                    <TableCell>{parent.phone}</TableCell>
                    <TableCell>{parent.email || '-'}</TableCell>
                    <TableCell>
                      {parent.childrenCount} {parent.childrenCount === 1 ? 'Child' : 'Children'}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                        parent.status === 'Active' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {parent.status === 'Active' ? '🟢 Active' : '🔴 Inactive'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedParent(parent);
                            loadParentDetails(parent._id);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleStatus(parent)}
                        >
                          {parent.status === 'Active' ? (
                            <Lock className="h-4 w-4" />
                          ) : (
                            <Unlock className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleResetPassword(parent)}
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
