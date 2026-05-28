import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TeacherClasses() {
  const [user, setUser] = useState(null);
  useEffect(() => { api.get('/auth/me').then((r) => setUser(r.data.user)); }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">My Classes & Subjects</h1>
      {(user?.assignments || []).map((a, idx) => (
        <Card key={idx}>
          <CardHeader><CardTitle>{a.class?.className}-{a.class?.section}</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">Subject: {a.subject}</p></CardContent>
        </Card>
      ))}
      {!user?.assignments?.length && <p className="text-muted-foreground">No assignments yet.</p>}
    </div>
  );
}
