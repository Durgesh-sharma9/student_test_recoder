import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Search, Users, Eye, Lock, Unlock, Key, ShieldCheck, ShieldAlert } from 'lucide-react';
import api from '@/lib/api';
import { formatDisplayDate, formatRelativeTime } from '@/lib/dateFormatter';
import { PageHeader, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog';

export default function ManageParents() {
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
  const [error, setError] = useState('');
  const latestRequestRef = useRef(0);

  const debouncedSearchStudent = useDebouncedValue(searchStudent, 400);
  const debouncedSearchParent = useDebouncedValue(searchParent, 400);

  const sortedStudents = useMemo(
    () =>
      [...students].sort((a, b) => {
        const aRoll = Number(a.rollNo);
        const bRoll = Number(b.rollNo);
        if (!Number.isNaN(aRoll) && !Number.isNaN(bRoll)) return aRoll - bRoll;
        return String(a.rollNo || '').localeCompare(String(b.rollNo || ''), undefined, { numeric: true });
      }),
    [students]
  );

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    loadStudents();
  }, [debouncedSearchStudent, debouncedSearchParent, classFilter, statusFilter]);

  const loadClasses = async () => {
    try {
      const res = await api.get('/classes');
      setClasses(res.data.classes || []);
    } catch (err) {
      console.error('Failed to load classes:', err);
    }
  };

  const loadStudents = async () => {
    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      
      if (debouncedSearchStudent) params.append('search', debouncedSearchStudent);
      if (debouncedSearchParent) params.append('searchParent', debouncedSearchParent);
      if (classFilter && classFilter !== 'all') params.append('classId', classFilter);
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      const res = await api.get(`/parents/admin/list?${params}`);
      if (requestId !== latestRequestRef.current) return;
      if (res.data && Array.isArray(res.data.students)) {
        setStudents(res.data.students);
      } else {
        setStudents([]);
      }
    } catch (err) {
      if (requestId !== latestRequestRef.current) return;
      console.error('Failed to load students:', err);
      setError(err.response?.data?.message || 'Failed to load students');
      setStudents([]);
    } finally {
      if (requestId === latestRequestRef.current) {
        setLoading(false);
      }
    }
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

  return (
    <PageStack className="min-h-screen bg-[#FAFAFA] dark:bg-slate-950">
      <PageHeader
        title="Parent Management"
        description="Manage parent accounts and view linked students"
      />

      {/* MATCHING THE IMAGE: Custom Orange/Peach Gradient Section */}
      <div className="rounded-xl border border-orange-100 bg-white shadow-sm overflow-hidden mb-6 dark:border-slate-800 dark:bg-slate-900">
        {/* Soft Orange Gradient Header */}
        <div className="bg-gradient-to-r from-[#FFF5ED] to-[#FFF9F5] dark:from-orange-950/30 dark:to-slate-900 px-5 py-3.5 border-b border-orange-100 dark:border-slate-800">
          <div className="flex items-center gap-2 font-bold text-[#C25E1A] dark:text-orange-500 text-sm">
            <Search className="h-4 w-4" />
            Search & Filter
          </div>
        </div>
        
        <div className="p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Search Student</label>
              <Input
                placeholder="Name or roll no..."
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                className="h-10 text-sm shadow-sm focus-visible:ring-orange-500 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 transition-all rounded-lg"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Search Parent</label>
              <Input
                placeholder="Parent name..."
                value={searchParent}
                onChange={(e) => setSearchParent(e.target.value)}
                className="h-10 text-sm shadow-sm focus-visible:ring-orange-500 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 transition-all rounded-lg"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Class</label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="h-10 text-sm shadow-sm focus:ring-orange-500 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 transition-all rounded-lg">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls._id} value={cls._id}>
                      Class {cls.className} {cls.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Parent Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 text-sm shadow-sm focus:ring-orange-500 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 transition-all rounded-lg">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Section */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        <div className="bg-slate-50/80 dark:bg-slate-800/50 px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-700">
          <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 text-sm">
            <Users className="h-4 w-4" />
            Students with Parents
          </div>
        </div>

        {error ? (
          <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-b-xl">
            <p className="text-rose-600 dark:text-rose-400 font-medium text-sm">{error}</p>
          </div>
        ) : !loading && sortedStudents.length === 0 ? (
          <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-b-xl">
            <Users className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">No records found matched your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-b-xl">
            <Table>
              <TableHeader>
                <TableRow className="bg-transparent hover:bg-transparent border-b border-slate-100 dark:border-slate-800">
                  <TableHead className="font-bold text-slate-500 dark:text-slate-400 px-5 py-3 text-[11px] uppercase tracking-wider">Student Name</TableHead>
                  <TableHead className="font-bold text-slate-500 dark:text-slate-400 px-5 py-3 text-[11px] uppercase tracking-wider">Roll No</TableHead>
                  <TableHead className="font-bold text-slate-500 dark:text-slate-400 px-5 py-3 text-[11px] uppercase tracking-wider">Class</TableHead>
                  <TableHead className="font-bold text-slate-500 dark:text-slate-400 px-5 py-3 text-[11px] uppercase tracking-wider">Father Name</TableHead>
                  <TableHead className="font-bold text-slate-500 dark:text-slate-400 px-5 py-3 text-[11px] uppercase tracking-wider">Phone</TableHead>
                  <TableHead className="font-bold text-slate-500 dark:text-slate-400 px-5 py-3 text-[11px] uppercase tracking-wider">Email</TableHead>
                  <TableHead className="font-bold text-slate-500 dark:text-slate-400 px-5 py-3 text-[11px] uppercase tracking-wider">Last Login</TableHead>
                  <TableHead className="font-bold text-slate-500 dark:text-slate-400 px-5 py-3 text-[11px] uppercase tracking-wider text-center">Status</TableHead>
                  <TableHead className="font-bold text-slate-500 dark:text-slate-400 px-5 py-3 text-[11px] uppercase tracking-wider text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="px-5 py-10 text-center text-slate-500 dark:text-slate-400 text-sm">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                        Loading records...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                sortedStudents.map((student) => {
                  const isActive = student.parentStatus === 'Active';
                  return (
                    // Compact padding (py-3)
                    <TableRow key={student._id} className="hover:bg-orange-50/40 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800">
                      <TableCell className="font-semibold text-slate-800 dark:text-slate-100 px-5 py-3 text-[13px]">{student.studentName}</TableCell>
                      <TableCell className="px-5 py-3 font-mono text-[13px] text-slate-600 dark:text-slate-400">{student.rollNo}</TableCell>
                      <TableCell className="px-5 py-3">
                        <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          Class {student.class} {student.section}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-3 text-[13px] text-slate-700 dark:text-slate-300">{student.parentName}</TableCell>
                      <TableCell className="px-5 py-3 text-[13px] text-slate-600 dark:text-slate-400">{student.parentPhone}</TableCell>
                      <TableCell className="px-5 py-3 text-[13px] text-slate-500 dark:text-slate-400 max-w-[160px] truncate">{student.parentEmail || '-'}</TableCell>
                      <TableCell className="px-5 py-3 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {formatRelativeTime(student.parentLastLogin)}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold shadow-sm ${
                          isActive
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50'
                            : 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/50'
                        }`}>
                          {isActive ? (
                            <ShieldCheck className="h-3 w-3" />
                          ) : (
                            <ShieldAlert className="h-3 w-3" />
                          )}
                          {student.parentStatus}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-3 text-right">
                        {/* Compact Action Buttons */}
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="View Parent Info"
                            onClick={() => {
                              setSelectedParent({ _id: student.parentId, parentName: student.parentName });
                              loadParentDetails(student.parentId);
                              setDetailsOpen(true);
                            }}
                            disabled={!student.parentId}
                            className="h-7 w-7 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-600 dark:hover:bg-blue-600 hover:text-white transition-all shadow-sm disabled:opacity-40"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            title={isActive ? "Lock Parent Account" : "Unlock Parent Account"}
                            onClick={() => handleToggleStatus(student)}
                            disabled={!student.parentId}
                            className={`h-7 w-7 rounded-md transition-all shadow-sm disabled:opacity-40 ${
                              isActive 
                                ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white' 
                                : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white'
                            }`}
                          >
                            {isActive ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            title="Reset Parent Password"
                            onClick={() => handleResetPassword(student)}
                            disabled={!student.parentId}
                            className="h-7 w-7 rounded-md bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-600 hover:text-white transition-all shadow-sm disabled:opacity-40"
                          >
                            <Key className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Parent Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden border-0 shadow-2xl dark:bg-slate-950">
          <DialogHeader className="bg-gradient-to-r from-[#FFF5ED] to-[#FFF9F5] dark:from-slate-900 dark:to-slate-800 px-6 py-4 border-b border-orange-100 dark:border-slate-700">
            <DialogTitle className="text-lg font-bold text-[#C25E1A] dark:text-orange-500 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Parent Profile Overview
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="p-6">
          {selectedParent && (
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4 shadow-sm">
                <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Personal Details</h3>
                <div className="grid gap-2.5 text-[13px]">
                  <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-500 dark:text-slate-400">Full Name</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{selectedParent.parentName}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-500 dark:text-slate-400">Contact Number</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{selectedParent.phone}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-500 dark:text-slate-400">Email Address</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{selectedParent.email || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-500 dark:text-slate-400">Account Status</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      selectedParent.status === 'Active' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                    }`}>
                      {selectedParent.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-500 dark:text-slate-400">Last Session</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {formatRelativeTime(selectedParent.lastLogin)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 dark:text-slate-400">Onboarding Date</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {selectedParent.createdAt 
                        ? formatDisplayDate(selectedParent.createdAt) 
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4 shadow-sm">
                <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Linked Students ({selectedParent.linkedStudents?.length || 0})</h3>
                {selectedParent.linkedStudents && selectedParent.linkedStudents.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {selectedParent.linkedStudents.map((student) => (
                      <div key={student._id} className="flex flex-col rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-sm hover:border-orange-200 transition-colors">
                        <div className="font-bold text-slate-800 dark:text-slate-100 text-[14px]">{student.name}</div>
                        <div className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 mt-0.5">Class {student.className} {student.section}</div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 border-t border-slate-100 dark:border-slate-800 pt-2 flex justify-between items-center">
                          <span>Roll Position</span>
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">#{student.rollNo}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-3">No linked students found.</p>
                )}
              </div>
            </div>
          )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 shadow-xl dark:bg-slate-950">
          <DialogHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-slate-900 dark:to-slate-800 px-6 py-4 border-b border-purple-100 dark:border-slate-700">
            <DialogTitle className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Key className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Security Update
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="p-6">
          {newPassword ? (
            <div className="space-y-4">
              <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed text-center">
                The parent profile lacks an active email channel. Deliver this temporary code to them directly:
              </p>
              <div className="rounded-xl border border-dashed border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/50 p-4 shadow-sm">
                <p className="text-center text-2xl font-mono font-black tracking-widest text-purple-700 dark:text-purple-400">{newPassword}</p>
              </div>
              <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 text-center">
                Ensure security standards are met when sharing details.
              </p>
            </div>
          ) : (
            <div className="py-4 text-center">
              <ShieldCheck className="mx-auto h-12 w-12 text-emerald-500 mb-3" />
              <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">
                A secure initialization string has been formatted and triggered to the verified account communication email.
              </p>
            </div>
          )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </PageStack>
  );
}

function useDebouncedValue(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}