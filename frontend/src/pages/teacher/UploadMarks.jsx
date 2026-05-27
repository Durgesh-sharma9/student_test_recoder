import { useEffect, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function UploadMarks() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [testName, setTestName] = useState('');
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/classes').then((res) => {
      setClasses(res.data.classes);
      if (res.data.classes.length) setClassId(res.data.classes[0]._id);
    });
  }, []);

  const downloadTemplate = async () => {
    if (!classId || !testName || !testDate) {
      toast.error('Select class, test name, and date first');
      return;
    }
    try {
      const res = await api.get('/tests/template', {
        params: { classId, testName, testDate },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `marks_template_${testName}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Template downloaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Download failed');
    }
  };

  const uploadFile = async () => {
    if (!file) {
      toast.error('Select an Excel file');
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/tests/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(res.data.message);
      setFile(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Upload Daily Test Marks</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Download Template</CardTitle>
            <CardDescription>Template includes student list. Fill only Marks Obt. columns.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Class</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c._id} value={c._id}>{c.name} - {c.section}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Test Name</Label><Input value={testName} onChange={(e) => setTestName(e.target.value)} placeholder="Daily Test 1" /></div>
            <div><Label>Test Date</Label><Input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} /></div>
            <Button onClick={downloadTemplate} className="w-full">
              <Download className="mr-2 h-4 w-4" /> Download Excel Template
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Step 2: Upload Filled Excel</CardTitle>
            <CardDescription>System auto-calculates Total, Average, Percentage, and Rank.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Excel File (.xlsx)</Label>
              <Input type="file" accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files[0])} />
            </div>
            <Button onClick={uploadFile} disabled={loading} className="w-full">
              <Upload className="mr-2 h-4 w-4" />
              {loading ? 'Processing...' : 'Upload & Calculate Rankings'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
