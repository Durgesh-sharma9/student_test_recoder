import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { School, Plus } from 'lucide-react';
import api from '@/lib/api';
import { formatClassName } from '@/lib/utils';
import { useSession } from '@/context/SessionContext';
import { PageHeader, ErpSection, FormField, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ManageClasses() {
  const { isArchived } = useSession();
  const [rows, setRows] = useState([]);
  const [suggestions, setSuggestions] = useState({ classSuggestions: [], sectionSuggestions: [] });
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ className: '', section: '' });
  const [customClass, setCustomClass] = useState('');
  const [customSection, setCustomSection] = useState('');

  const fetchData = async () => {
    const [c, s] = await Promise.all([api.get('/classes'), api.get('/classes/suggestions')]);
    setRows(c.data.classes || []);
    setSuggestions({
      classSuggestions: s.data.classSuggestions || [],
      sectionSuggestions: s.data.sectionSuggestions || [],
    });
  };
  useEffect(() => { fetchData(); }, []);

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

  return (
    <PageStack>
      <PageHeader
        title="Class Management"
        description="Create and manage class sections for your school."
      >
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Class
        </Button>
      </PageHeader>

      <ErpSection title="Classes List" icon={School} tone="green">
  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
    {rows.map((c) => (
      <div
        key={c._id}
        className="group rounded-2xl border bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-800">
              {formatClassName(c.className)}
            </h3>

            <p className="text-sm text-slate-500">
              Section {c.section}
            </p>

            <div className="mt-3 inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
              👨‍🎓 {c.studentCount || 0} Students
            </div>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
            <School className="h-6 w-6 text-blue-600" />
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              disabled={isArchived}
              onClick={() => {
                setEdit(c);
                setForm({
                  className: c.className,
                  section: c.section,
                });
                setOpen(true);
              }}
            >
              Edit
            </Button>

            <Button
              variant="destructive"
              className="flex-1 rounded-xl"
              disabled={isArchived}
              onClick={async () => {
                await api.delete(`/classes/${c._id}`);
                toast.success('Deleted');
                fetchData();
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
    ))}
  </div>
</ErpSection>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-4xl rounded-3xl p-8">
          <DialogHeader>
            <DialogTitle>{edit ? 'Edit' : 'Add'} Class</DialogTitle>
          </DialogHeader>
          <form className="space-y-8" onSubmit={submit}>
  <div className="grid gap-8 md:grid-cols-2">
    <FormField label="Class">
      <Select
        value={form.className || undefined}
        onValueChange={(v) => {
          setForm({ ...form, className: v });
          setCustomClass('');
        }}
      >
        <SelectTrigger className="h-14 rounded-2xl">
          <SelectValue placeholder="Select class" />
        </SelectTrigger>

        <SelectContent className="max-h-60 overflow-y-auto">
          {suggestions.classSuggestions.map((c) => (
            <SelectItem key={c} value={c}>
              {formatClassName(c)}
            </SelectItem>
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
        <SelectTrigger className="h-12 rounded-xl">
          <SelectValue placeholder="Select section" />
        </SelectTrigger>

        <SelectContent className="max-h-60 overflow-y-auto">
          {suggestions.sectionSuggestions.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>

    <FormField label="Custom Class Name">
      <Input
        className="h-14 rounded-2xl"
        placeholder="Enter custom class"
        value={customClass}
        onChange={(e) =>
          setCustomClass(e.target.value.toUpperCase())
        }
      />
    </FormField>

    <FormField label="Custom Section">
      <Input
        className="h-14 rounded-2xl"
        placeholder="Enter custom section"
        value={customSection}
        onChange={(e) =>
          setCustomSection(e.target.value.toUpperCase())
        }
      />
    </FormField>
  </div>

  <Button
    className="h-14 w-full rounded-2xl text-lg font-semibold shadow-lg"
    variant={edit ? 'default' : 'success'}
  >
    {edit ? 'Update Class' : 'Create Class'}
  </Button>
</form>
        </DialogContent>
      </Dialog>
    </PageStack>
  );
}
