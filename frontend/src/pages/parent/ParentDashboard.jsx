import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ParentDashboard() {
  const { user } = useAuth();
  const [results, setResults] = useState([]);

  useEffect(() => {
    api.get('/tests').then((res) => setResults(res.data.results));
  }, []);

  const children = user?.children || [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Parent Dashboard</h1>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {children.map((child) => (
          <Card key={child._id}>
            <CardHeader>
              <CardTitle className="text-lg">{child.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Roll: {child.rollNumber}</p>
            </CardContent>
          </Card>
        ))}
        {!children.length && (
          <Card><CardContent className="pt-6 text-muted-foreground">No children linked to your account.</CardContent></Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Latest Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Test</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Percentage</TableHead>
                <TableHead>Rank</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r) => (
                <TableRow key={r._id}>
                  <TableCell className="font-medium">{r.student?.name}</TableCell>
                  <TableCell>{r.testName}</TableCell>
                  <TableCell>{new Date(r.testDate).toLocaleDateString()}</TableCell>
                  <TableCell>{r.totalObtained}/{r.totalMax}</TableCell>
                  <TableCell>{r.percentage}%</TableCell>
                  <TableCell><Badge variant="success">#{r.rank}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!results.length && <p className="py-8 text-center text-muted-foreground">No test results yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
