import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { FileText, Search, Download } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErpSection, FormField, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const EXAM_TYPES = ['PA1', 'PA2', 'PA3', 'PA4', 'FA1', 'FA2', 'Half Yearly', 'Final'];

export default function ClassResults() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('rollNo_asc');

  useEffect(() => {
    api.get('/classes').then((r) => {
      setClasses(r.data.classes || []);
    });
  }, []);

  const fetchResults = async () => {
    if (!selectedClass || !selectedExamType) return;

    setLoading(true);
    try {
      const res = await api.get('/class-results', {
        params: { classId: selectedClass, examType: selectedExamType },
      });
      setResults(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch results');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = useMemo(() => {
    if (!results?.results) return [];
    const query = searchQuery.toLowerCase();
    let filtered = results.results.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.rollNo.toString().toLowerCase().includes(query)
    );

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'rollNo_asc':
          return Number(a.rollNo) - Number(b.rollNo);
        case 'rollNo_desc':
          return Number(b.rollNo) - Number(a.rollNo);
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'marks_desc':
          return b.totalObtained - a.totalObtained;
        case 'marks_asc':
          return a.totalObtained - b.totalObtained;
        default:
          return Number(a.rollNo) - Number(b.rollNo);
      }
    });

    return filtered;
  }, [results, searchQuery, sortBy]);

  const exportCSV = () => {
    if (!results) return;

    const headers = ['Rank', 'Roll No', 'Student Name', ...results.subjects, 'Total', 'Average', 'Percentage'];
    const rows = filteredResults.map((r) => {
      const subjectMarks = results.subjects.map((s) => r.subjects[s]?.marksObtained || '-');
      return [
        r.rank,
        r.rollNo,
        r.name,
        ...subjectMarks,
        r.totalObtained,
        r.average,
        r.percentage,
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `class-results-${results.examType}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success('CSV exported successfully');
  };

  const exportPDF = async () => {
    if (!results) return;

    try {
      const response = await api.get('/class-results/export-pdf', {
        params: { classId: selectedClass, examType: selectedExamType },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `class-results-${results.examType}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF exported successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to export PDF');
    }
  };

  return (
    <PageStack>
      <PageHeader
        title="Class Results"
        description="View complete class-wise exam results with dynamic subject columns."
      />

      <ErpSection title="Filters" icon={FileText} tone="blue">
        <div className="grid gap-4 lg:grid-cols-3">
          <FormField label="Class">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.className}-{c.section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Exam Type">
            <Select value={selectedExamType} onValueChange={setSelectedExamType}>
              <SelectTrigger>
                <SelectValue placeholder="Select exam type" />
              </SelectTrigger>
              <SelectContent>
                {EXAM_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Sort By">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rollNo_asc">Roll No (Ascending)</SelectItem>
                <SelectItem value="rollNo_desc">Roll No (Descending)</SelectItem>
                <SelectItem value="name_asc">Student Name (A-Z)</SelectItem>
                <SelectItem value="name_desc">Student Name (Z-A)</SelectItem>
                <SelectItem value="marks_desc">Marks (High to Low)</SelectItem>
                <SelectItem value="marks_asc">Marks (Low to High)</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={fetchResults} disabled={!selectedClass || !selectedExamType || loading}>
            {loading ? 'Loading...' : 'View Results'}
          </Button>
          {results && (
            <>
              <Button variant="outline" onClick={exportCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={exportPDF}>
                <Download className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
            </>
          )}
        </div>
      </ErpSection>

      {results && (
        <>
          <ErpSection title="Search" icon={Search} tone="blue">
            <FormField label="Search by Student Name or Roll No">
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </FormField>
          </ErpSection>

          <ErpSection title="Results" icon={FileText} tone="green">
            <div className="mb-4 rounded-lg bg-slate-50 p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-slate-700">School:</span>{' '}
                  <span className="text-slate-600">{results.schoolName}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">Class:</span>{' '}
                  <span className="text-slate-600">{results.className}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">Exam Type:</span>{' '}
                  <span className="text-slate-600">{results.examType}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">Generated:</span>{' '}
                  <span className="text-slate-600">
                    {new Date(results.generatedDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {filteredResults.length === 0 ? (
              <div className="py-8 text-center text-slate-500">No results found</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Roll No</TableHead>
                      <TableHead>Student Name</TableHead>
                      {results.subjects.map((subject) => (
                        <TableHead key={subject}>{subject}</TableHead>
                      ))}
                      <TableHead>Total</TableHead>
                      <TableHead>Average</TableHead>
                      <TableHead>Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResults.map((student) => (
                      <TableRow key={student.studentId}>
                        <TableCell className="font-medium">{student.rank}</TableCell>
                        <TableCell>{student.rollNo}</TableCell>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        {results.subjects.map((subject) => (
                          <TableCell key={subject}>
                            {student.subjects[subject]?.marksObtained || '-'}
                          </TableCell>
                        ))}
                        <TableCell className="font-medium">{student.totalObtained}</TableCell>
                        <TableCell>{student.average}</TableCell>
                        <TableCell>{student.percentage}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </ErpSection>
        </>
      )}
    </PageStack>
  );
}
