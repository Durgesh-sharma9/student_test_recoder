import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Search, Users, Eye, Lock, Unlock, Key, ShieldCheck, ShieldAlert } from 'lucide-react';
import api from '@/lib/api';
import { formatDisplayDate, formatRelativeTime } from '@/lib/dateFormatter';
import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';

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
    <PageStack className="bg-slate-50 dark:bg-slate-950">
      <PageHeader
        title="Parent Management"
        description="Manage parent accounts and view linked students"
      />

      <ErpSection title="Search & Filter" icon={Search} tone="blue">
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Search Student</label>
            <Input
              placeholder="Search by name or roll no"
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              className="h-10 focus-visible:ring-indigo-500 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Search Parent</label>
            <Input
              placeholder="Search by parent name"
              value={searchParent}
              onChange={(e) => setSearchParent(e.target.value)}
              className="h-10 focus-visible:ring-indigo-500 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Class</label>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="h-10 focus:ring-indigo-500 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50">
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
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Parent Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 focus:ring-indigo-500 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50">
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
      </ErpSection>

      <ErpSection title="Students with Parents" icon={Users} tone="green">
        {error ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-rose-200 dark:border-rose-800">
            <p className="text-rose-600 dark:text-rose-400 font-medium">{error}</p>
          </div>
        ) : !loading && sortedStudents.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
            <Users className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">No records found matched your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                  <TableHead className="font-bold text-slate-700 dark:text-slate-200 px-5 py-3.5">Student Name</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-200 px-5 py-3.5">Roll No</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-200 px-5 py-3.5">Class</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-200 px-5 py-3.5">Father Name</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-200 px-5 py-3.5">Phone</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-200 px-5 py-3.5">Email</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-200 px-5 py-3.5">Last Login</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-200 px-5 py-3.5 text-center">Status</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-200 px-5 py-3.5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="px-5 py-10 text-center text-slate-500 dark:text-slate-400">
                      Loading parent records...
                    </TableCell>
                  </TableRow>
                ) : (
                sortedStudents.map((student) => {
                  const isActive = student.parentStatus === 'Active';
                  return (
                    <TableRow key={student._id} className="hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors border-b border-slate-100 dark:border-slate-800">
                      <TableCell className="font-semibold text-slate-900 dark:text-slate-50 px-5 py-4 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{student.studentName}</TableCell>
                      <TableCell className="px-5 py-4 font-mono text-xs text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100">{student.rollNo}</TableCell>
                      <TableCell className="px-5 py-4">
                        <span className="inline-flex items-center rounded-md bg-indigo-50 dark:bg-indigo-950 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 ring-1 ring-inset ring-indigo-700/10 dark:ring-indigo-300/10">
                          Class {student.class} {student.section}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">{student.parentName}</TableCell>
                      <TableCell className="px-5 py-4 text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100">{student.parentPhone}</TableCell>
                      <TableCell className="px-5 py-4 text-slate-500 dark:text-slate-400 max-w-[180px] truncate group-hover:text-slate-900 dark:group-hover:text-slate-100">{student.parentEmail || '-'}</TableCell>
                      <TableCell className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100">
                        {formatRelativeTime(student.parentLastLogin)}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm ${
                          isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        }`}>
                          {isActive ? (
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <ShieldAlert className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                          )}
                          {student.parentStatus}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-right">
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
                            className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-600 dark:hover:bg-blue-600 hover:text-white transition-all duration-200 shadow-sm cursor-pointer disabled:opacity-40"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            title={isActive ? "Lock Parent Account" : "Unlock Parent Account"}
                            onClick={() => handleToggleStatus(student)}
                            disabled={!student.parentId}
                            className={`h-8 w-8 rounded-lg transition-all duration-200 shadow-sm cursor-pointer disabled:opacity-40 ${
                              isActive 
                                ? 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 hover:bg-amber-600 dark:hover:bg-amber-600 hover:text-white' 
                                : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 dark:hover:bg-emerald-600 hover:text-white'
                            }`}
                          >
                            {isActive ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            title="Reset Parent Password"
                            onClick={() => handleResetPassword(student)}
                            disabled={!student.parentId}
                            className="h-8 w-8 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 hover:bg-purple-600 dark:hover:bg-purple-600 hover:text-white transition-all duration-200 shadow-sm cursor-pointer disabled:opacity-40"
                          >
                            <Key className="h-4 w-4" />
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
      </ErpSection>

      {/* Parent Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-2xl dark:bg-slate-950 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-50">Parent Profile Overview</DialogTitle>
          </DialogHeader>
          <DialogBody>
          {selectedParent && (
            <div className="space-y-6 mt-2">
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-5 shadow-inner">
                <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Parent Details</h3>
                <div className="grid gap-3 text-sm">
                  <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Full Name</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{selectedParent.parentName}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Contact Number</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{selectedParent.phone}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Email Address</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{selectedParent.email || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Account Status</span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      selectedParent.status === 'Active' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200' : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200'
                    }`}>
                      {selectedParent.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
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

              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-5 shadow-inner">
                <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Linked Students ({selectedParent.linkedStudents?.length || 0})</h3>
                {selectedParent.linkedStudents && selectedParent.linkedStudents.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {selectedParent.linkedStudents.map((student) => (
                      <div key={student._id} className="flex flex-col rounded-xl border border-slate-200/60 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
                        <div className="font-bold text-slate-800 dark:text-slate-100 text-base">{student.name}</div>
                        <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mt-1">Class {student.className} {student.section}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-3 border-t border-slate-50 dark:border-slate-800 pt-2 flex justify-between">
                          <span>Roll Position</span>
                          <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">#{student.rollNo}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No linked students found.</p>
                )}
              </div>
            </div>
          )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
        <DialogContent className="sm:max-w-md dark:bg-slate-950 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-50">Security: Password Updated</DialogTitle>
          </DialogHeader>
          <DialogBody>
          {newPassword ? (
            <div className="space-y-4 mt-2">
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                The parent profile lacks an active email channel. Deliver this temporary code to them directly:
              </p>
              <div className="rounded-xl border border-dashed border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/50 p-5 shadow-inner">
                <p className="text-center text-3xl font-mono font-bold tracking-wider text-purple-700 dark:text-purple-300">{newPassword}</p>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center">
                Ensure security standards are met when sharing details.
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mt-2">
              A secure initialization string has been formatted and triggered to the verified account communication email.
            </p>
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
