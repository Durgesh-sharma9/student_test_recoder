import React from 'react';
import { FileText, Download, ArrowLeft, BarChart3 } from 'lucide-react';
import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const TeacherResults = ({ results = [], onBack }) => {
  const sampleResults = results.length ? results : [
    { id: 1, student: "Alice Smith", subject: "Mathematics", grade: "A", score: 95 },
    { id: 2, student: "Bob Jones", subject: "Mathematics", grade: "B+", score: 88 },
    { id: 3, student: "Charlie Brown", subject: "Mathematics", grade: "A-", score: 91 },
  ];

  return (
    <PageStack>
      <div className="flex items-center gap-3">
        {onBack && (
          <Button variant="outline" size="sm" onClick={onBack} className="rounded-lg h-9">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        )}
        <PageHeader title="Class Exam Results" description="Overview of student performance and scores." />
      </div>

      <ErpSection title="Results Summary" icon={BarChart3} tone="indigo">
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <Table className="min-w-[500px]">
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold text-slate-700">Student Name</TableHead>
                <TableHead className="font-bold text-slate-700">Subject</TableHead>
                <TableHead className="font-bold text-slate-700">Score</TableHead>
                <TableHead className="font-bold text-slate-700">Grade</TableHead>
                <TableHead className="font-bold text-slate-700 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleResults.map((row) => (
                <TableRow key={row.id} className="hover:bg-slate-50/80 transition-colors">
                  <TableCell className="font-medium text-slate-900">{row.student}</TableCell>
                  <TableCell className="text-slate-600">{row.subject}</TableCell>
                  <TableCell className="font-semibold text-slate-800">{row.score}%</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-100">
                      {row.grade}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-md" title="View PDF Report">
                        <FileText className="h-4 w-4 text-slate-600" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-md" title="Download Raw Data">
                        <Download className="h-4 w-4 text-slate-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ErpSection>
    </PageStack>
  );
};

export default TeacherResults;