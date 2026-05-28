import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function TeacherAssignments() {
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teacherId, setTeacherId] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [subject, setSubject] = useState('');
  const [items, setItems] = useState([]);

  useEffect(() => {
    Promise.all([api.get('/users?role=teacher'), api.get('/classes')]).then(([t, c]) => {
      setTeachers(t.data.users || []);
      setClasses(c.data.classes || []);
      if (t.data.users?.length) setTeacherId(t.data.users[0]._id);
    });
  }, []);

  useEffect(() => {
    const t = teachers.find((x) => x._id === teacherId);
    setItems((t?.assignments || []).map((a) => ({ class: a.class?._id || a.class, subject: a.subject })));
  }, [teacherId, teachers]);

  const addItem = () => {
    if (!selectedClass || !subject) return;
    setItems((prev) => [...prev, { class: selectedClass, subject: subject.toUpperCase() }]);
    setSubject('');
  };

  const save = async () => {
    const uniqueClassIds = [...new Set(items.map((i) => i.class))];
    await api.put(`/users/${teacherId}/assignments`, { assignedClasses: uniqueClassIds, assignments: items });
    toast.success('Assignments saved');
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Teacher Assignment</h1>
      <Card><CardHeader><CardTitle>Assign Classes and Subjects</CardTitle></CardHeader><CardContent className="space-y-3">
        <Select value={teacherId} onValueChange={setTeacherId}><SelectTrigger><SelectValue placeholder="Teacher" /></SelectTrigger><SelectContent>{teachers.map((t) => <SelectItem key={t._id} value={t._id}>{t.teacherName || t.name}</SelectItem>)}</SelectContent></Select>
        <div className="grid md:grid-cols-3 gap-2">
          <Select value={selectedClass} onValueChange={setSelectedClass}><SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger><SelectContent>{classes.map((c) => <SelectItem key={c._id} value={c._id}>{c.className}-{c.section}</SelectItem>)}</SelectContent></Select>
          <Input placeholder="Subject (Maths)" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Button onClick={addItem}>Add</Button>
        </div>
        <div className="space-y-2">{items.map((i, idx) => <div key={`${i.class}-${i.subject}-${idx}`} className="border rounded p-2 flex justify-between text-sm"><span>{classes.find((c) => c._id === i.class)?.className}-{classes.find((c) => c._id === i.class)?.section} / {i.subject}</span><Button variant="ghost" size="sm" onClick={() => setItems((prev) => prev.filter((_, pidx) => pidx !== idx))}>Remove</Button></div>)}</div>
        <Button onClick={save}>Save Assignment</Button>
      </CardContent></Card>
    </div>
  );
}
