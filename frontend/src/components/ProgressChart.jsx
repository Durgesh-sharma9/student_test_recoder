import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function PercentageLineChart({ data }) {
  if (!data?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Progress Over Time</CardTitle>
        </CardHeader>
        <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
          No test data available yet.
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    name: d.testName,
    percentage: d.percentage,
    rank: d.rank,
    date: new Date(d.testDate).toLocaleDateString(),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Percentage Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="percentage" stroke="hsl(221, 83%, 53%)" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function RankBarChart({ data }) {
  if (!data?.length) return null;

  const chartData = data.map((d) => ({
    name: d.testName,
    rank: d.rank,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Rank by Test</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis reversed allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="rank" fill="hsl(221, 83%, 53%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
