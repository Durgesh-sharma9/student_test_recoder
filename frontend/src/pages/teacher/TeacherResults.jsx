import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export default function TeacherResults() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [results, setResults] = useState([]);
  const [testNames, setTestNames] = useState([]);
  const [testName, setTestName] = useState('');

  useEffect(() => {
    api.get('/classes').then((res) => {
      setClasses(res.data.classes);
      if (res.data.classes.length) setClassId(res.data.classes[0]._id);
    });
  }, []);

  useEffect(() => {
    if (!classId) return;
    api.get('/tests', { params: { classId } }).then((res) => {
      setResults(res.data.results);
      const names = [...new Set(res.data.results.map((r) => r.testName))];
      setTestNames(names);
      if (names.length) setTestName(names[0]);
    });
  }, [classId]);

  const filtered = testName ? results.filter((r) => r.testName === testName) : results;

  const exportExcel = async () => {
    if (!classId || !testName) return;
    try {
      const res = await api.get('/tests/export', {
        params: { classId, testName },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `results_${testName}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Results exported');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Export failed');
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Test Results & Rankings</h1>
        <div className="flex gap-2">
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c._id} value={c._id}>{c.name} - {c.section}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={testName} onValueChange={setTestName}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Test" /></SelectTrigger>
            <SelectContent>
              {testNames.map((n) => (
                <SelectItem key={n} value={n}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportExcel}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Roll No</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Average</TableHead>
                <TableHead>Percentage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.sort((a, b) => a.rank - b.rank).map((r) => (
                <TableRow key={r._id}>
                  <TableCell>
                    <Badge variant={r.rank <= 3 ? 'success' : 'secondary'}>#{r.rank}</Badge>
                  </TableCell>
                  <TableCell>{r.student?.rollNumber}</TableCell>
                  <TableCell className="font-medium">{r.student?.name}</TableCell>
                  <TableCell>{r.totalObtained} / {r.totalMax}</TableCell>
                  <TableCell>{r.average}</TableCell>
                  <TableCell>{r.percentage}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!filtered.length && <p className="py-8 text-center text-muted-foreground">No results for this test.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
