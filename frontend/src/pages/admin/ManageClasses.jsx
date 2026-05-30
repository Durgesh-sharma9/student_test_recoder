import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { School, Plus } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErpSection, FormField, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ManageClasses() {
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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c._id}>
                  <TableCell className="font-medium">{c.className}</TableCell>
                  <TableCell>{c.section}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEdit(c);
                          setForm({ className: c.className, section: c.section });
                          setOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          await api.delete(`/classes/${c._id}`);
                          toast.success('Deleted');
                          fetchData();
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl rounded-3xl">
          <DialogHeader>
            <DialogTitle>{edit ? 'Edit' : 'Add'} Class</DialogTitle>
          </DialogHeader>
          <form className="space-y-6" onSubmit={submit}>
  <div className="grid gap-4 md:grid-cols-2">
    <FormField label="Class">
      <Select
        value={form.className || undefined}
        onValueChange={(v) => {
          setForm({ ...form, className: v });
          setCustomClass('');
        }}
      >
        <SelectTrigger className="h-12 rounded-xl">
          <SelectValue placeholder="Select class" />
        </SelectTrigger>

        <SelectContent>
          {suggestions.classSuggestions.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
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

        <SelectContent>
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
        className="h-12 rounded-xl"
        placeholder="Enter custom class"
        value={customClass}
        onChange={(e) =>
          setCustomClass(e.target.value.toUpperCase())
        }
      />
    </FormField>

    <FormField label="Custom Section">
      <Input
        className="h-12 rounded-xl"
        placeholder="Enter custom section"
        value={customSection}
        onChange={(e) =>
          setCustomSection(e.target.value.toUpperCase())
        }
      />
    </FormField>
  </div>

  <Button
    className="h-12 w-full rounded-xl text-base font-semibold"
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
