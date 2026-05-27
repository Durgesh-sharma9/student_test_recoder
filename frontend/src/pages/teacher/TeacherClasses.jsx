import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function TeacherClasses() {
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    api.get('/classes').then((res) => setClasses(res.data.classes));
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">My Classes</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {classes.map((c) => (
          <Card key={c._id}>
            <CardHeader>
              <CardTitle>{c.name} - Section {c.section}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Grade {c.grade} | {c.academicYear}</p>
              <p className="mt-2 text-xs font-mono text-muted-foreground">ID: {c._id}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {classes.length === 0 && (
        <p className="text-muted-foreground">No classes assigned yet. Contact admin.</p>
      )}
    </div>
  );
}
