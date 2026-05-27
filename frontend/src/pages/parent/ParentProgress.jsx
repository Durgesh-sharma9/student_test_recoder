import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PercentageLineChart, RankBarChart } from '@/components/ProgressChart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ParentProgress() {
  const { user } = useAuth();
  const children = user?.children || [];
  const [selectedChild, setSelectedChild] = useState('');
  const [progress, setProgress] = useState([]);

  useEffect(() => {
    if (children.length && !selectedChild) {
      setSelectedChild(children[0]._id);
    }
  }, [children, selectedChild]);

  useEffect(() => {
    if (!selectedChild) return;
    api.get(`/tests/progress/${selectedChild}`).then((res) => setProgress(res.data.progress));
  }, [selectedChild]);

  const child = children.find((c) => c._id === selectedChild);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Child Progress</h1>
        {children.length > 1 && (
          <Select value={selectedChild} onValueChange={setSelectedChild}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Select child" /></SelectTrigger>
            <SelectContent>
              {children.map((c) => (
                <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {child && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{child.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Viewing marks, percentage, rank, and progress over time.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <PercentageLineChart data={progress} />
        <RankBarChart data={progress} />
      </div>
    </div>
  );
}
