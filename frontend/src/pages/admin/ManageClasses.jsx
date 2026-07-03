import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { School, Plus, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { formatClassName } from '@/lib/utils';
import { useSession } from '@/context/SessionContext';
import { useSubscriptionExpiry } from '@/hooks/useSubscriptionExpiry';
import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog';
import SubscriptionExpiredDialog from '@/components/subscription/SubscriptionExpiredDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField } from '@/components/erp/PagePrimitives';

export default function ManageClasses() {
  const { isArchived } = useSession();
  const { isSubscriptionExpired, dialogOpen: expiredDialogOpen, setDialogOpen: setExpiredDialogOpen, checkAndBlock } = useSubscriptionExpiry();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [suggestions, setSuggestions] = useState({ classSuggestions: [], sectionSuggestions: [] });
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ className: '', section: '' });
  const [customClass, setCustomClass] = useState('');
  const [customSection, setCustomSection] = useState('');
  
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState(null);

  const fetchData = async () => {
    const [c, s] = await Promise.all([api.get('/classes'), api.get('/classes/suggestions')]);
    setRows(c.data.classes || []);
    setSuggestions({
      classSuggestions: s.data.classSuggestions || [],
      sectionSuggestions: s.data.sectionSuggestions || [],
    });
  };
  
  useEffect(() => { 
    fetchData(); 
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const className = (customClass || form.className || '').trim().toUpperCase();
    const section = (customSection || form.section || '').trim().toUpperCase();
    
    if (!className || !section) {
      return toast.error('Please select or enter class name and section');
    }
    
    try {
      const payload = { className, section };
      if (edit) await api.put(`/classes/${edit._id}`, payload);
      else await api.post('/classes', payload);
      
      toast.success(edit ? 'Class updated' : 'Class created');
      setOpen(false);
      setEdit(null);
      setForm({ className: '', section: '' });
      setCustomClass('');
      setCustomSection('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleDelete = async () => {
    if (!classToDelete) return;
    try {
      await api.delete(`/classes/${classToDelete._id}`);
      toast.success('Deleted successfully');
      setDeleteOpen(false);
      setClassToDelete(null);
      fetchData();
    } catch (err) {
      toast.error('Failed to delete class');
    }
  };

  return (
    <PageStack>
      <PageHeader
        title="Class Management"
        description="Create and manage class sections for your school."
      >
        <Button 
          size="sm" 
          className="h-9 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm border-0"
          onClick={() => {
            if (!checkAndBlock(() => {
              setEdit(null);
              setForm({ className: '', section: '' });
              setCustomClass('');
              setCustomSection('');
              setOpen(true);
            })) return;
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add Class
        </Button>
      </PageHeader>

      <ErpSection title="Classes List" icon={School} tone="green">
        <div className="p-4 rounded-xl border border-emerald-50 bg-gradient-to-br from-emerald-50/70 via-transparent to-transparent">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rows.map((c) => (
              <div
                key={c._id}
                onClick={(e) => {
                  if (e.target.closest('button')) return;
                  navigate(`/admin/students?classId=${c._id}`);
                }}
                className="relative group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md overflow-hidden min-h-[140px] cursor-pointer"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600" />
                <div className="flex items-start justify-between mt-1 mb-3">
                  <div className="space-y-0.5">
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight">{formatClassName(c.className)}</h3>
                    <p className="text-xs font-medium text-slate-500">Section {c.section}</p>
                    <div className="mt-2 inline-flex items-center rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700 border border-blue-100">
                      👨‍🎓 {c.studentCount || 0} Students
                    </div>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-100/60 shadow-sm">
                    <School className="h-4 w-4 text-emerald-600" />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <Button
                    variant="outline" size="sm"
                    className="flex-1 h-8 text-xs font-bold text-blue-600 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100/80 hover:to-blue-200/80 border-blue-100/70 rounded-lg shadow-sm"
                    disabled={isArchived}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!checkAndBlock(() => {
                        setEdit(c);
                        setForm({ className: c.className, section: c.section });
                        setCustomClass('');
                        setCustomSection('');
                        setOpen(true);
                      })) return;
                    }}
                  >
                    <Edit className="mr-1.5 h-3 w-3" /> Edit
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    className="flex-1 h-8 text-xs font-bold text-red-600 bg-gradient-to-br from-red-50 to-red-100 hover:from-red-100/80 hover:to-red-200/80 border-red-100/70 rounded-lg shadow-sm"
                    disabled={isArchived}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!checkAndBlock(() => {
                        setClassToDelete(c);
                        setDeleteOpen(true);
                      })) return;
                    }}
                  >
                    <Trash2 className="mr-1.5 h-3 w-3" /> Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ErpSection>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="bg-red-50 px-6 py-4 border-b border-red-100">
            <DialogTitle className="flex items-center gap-2 text-red-700 text-base">
              <AlertTriangle className="h-5 w-5" /> Confirm Deletion
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="p-6 text-sm text-slate-600">
            Are you sure you want to delete class <strong>{classToDelete ? `${formatClassName(classToDelete.className)} - ${classToDelete.section}` : ''}</strong>? This action cannot be undone.
          </DialogBody>
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>Yes, Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl rounded-2xl p-0 overflow-hidden bg-gradient-to-br from-white to-slate-50 border-slate-200 shadow-xl">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50/50 px-6 py-4 border-b border-slate-100">
            <DialogTitle className="text-lg font-bold text-slate-800">
              {edit ? 'Edit Class' : 'Add Class'}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="p-6">
            <form className="space-y-5" onSubmit={submit}>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Class">
                  <Select
                    value={form.className || undefined}
                    onValueChange={(v) => {
                      setForm({ ...form, className: v });
                      setCustomClass('');
                    }}
                  >
                    <SelectTrigger className="h-9 text-sm rounded-lg bg-white border-slate-200 shadow-sm">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      {suggestions.classSuggestions.map((c) => (
                        <SelectItem key={c} value={c}>{formatClassName(c)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Section">
                  <Select
                    value={form.section || undefined}
                    onValueChange={(v) => {
                      setForm({ ...form, section: v });
                      setCustomSection('');
                    }}
                  >
                    <SelectTrigger className="h-9 text-sm rounded-lg bg-white border-slate-200 shadow-sm">
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      {suggestions.sectionSuggestions.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Custom Class Name">
                  <Input
                    className="h-9 text-sm rounded-lg bg-white border-slate-200 shadow-sm"
                    placeholder="Enter custom class"
                    value={customClass}
                    onChange={(e) => setCustomClass(e.target.value.toUpperCase())}
                  />
                </FormField>
                <FormField label="Custom Section">
                  <Input
                    className="h-9 text-sm rounded-lg bg-white border-slate-200 shadow-sm"
                    placeholder="Enter custom section"
                    value={customSection}
                    onChange={(e) => setCustomSection(e.target.value.toUpperCase())}
                  />
                </FormField>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" className="h-9 text-sm bg-white" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" size="sm" className="h-9 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-sm">
                  {edit ? 'Update Class' : 'Create Class'}
                </Button>
              </div>
            </form>
          </DialogBody>
        </DialogContent>
      </Dialog>
      <SubscriptionExpiredDialog open={expiredDialogOpen} onOpenChange={setExpiredDialogOpen} />
    </PageStack>
  );
}