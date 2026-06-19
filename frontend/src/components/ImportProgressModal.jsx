import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function ImportProgressModal({
  open,
  onClose,
  importType = 'Import',
  onImport,
  totalRecords = 0,
}) {
  const [progress, setProgress] = useState(0);
  const [processed, setProcessed] = useState(0);
  const [success, setSuccess] = useState(0);
  const [failed, setFailed] = useState(0);
  const [status, setStatus] = useState('idle'); // idle, importing, completed, error
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (open && status === 'idle') {
      startImport();
    }
  }, [open]);

  const startImport = async () => {
    setStatus('importing');
    setProgress(0);
    setProcessed(0);
    setSuccess(0);
    setFailed(0);

    // Simulate progress while import is running
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        return prev + Math.random() * 5;
      });
    }, 200);

    try {
      const importResults = await onImport();
      setResults(importResults);
      
      // Set final values based on actual results
      setProcessed(importResults.totalRows || 0);
      setSuccess(importResults.imported || importResults.studentsCreated || 0);
      setFailed(importResults.failed || 0);
      setProgress(100);
      setStatus('completed');
    } catch (error) {
      setStatus('error');
      setFailed(totalRecords);
      setResults({ errors: [{ row: 0, error: error.message || 'Import failed' }] });
    } finally {
      clearInterval(progressInterval);
    }
  };

  const downloadErrorReport = () => {
    if (!results?.errors?.length) return;

    const errorContent = results.errors
      .map((err) => `Row ${err.row}: ${err.error}`)
      .join('\n');

    const blob = new Blob([errorContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${importType.toLowerCase()}_error_report.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setStatus('idle');
    setProgress(0);
    setProcessed(0);
    setSuccess(0);
    setFailed(0);
    setResults(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-2xl p-0">
        <DialogHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5">
          <DialogTitle className="flex items-center gap-3 text-xl font-bold">
            {status === 'importing' && (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            )}
            {status === 'completed' && <CheckCircle className="h-6 w-6 text-green-600" />}
            {status === 'error' && <XCircle className="h-6 w-6 text-red-600" />}
            {status === 'importing' ? `Importing ${importType}...` : status === 'completed' ? 'Import Completed' : 'Import Failed'}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {status === 'importing' && (
            <>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Processed: {Math.round((progress / 100) * totalRecords)} / {totalRecords}</span>
                  <span className="font-semibold text-blue-600">{Math.round(progress)}%</span>
                </div>

                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-green-50 p-3 text-center border border-green-100">
                    <p className="text-[11px] text-green-600 uppercase tracking-wider">Success</p>
                    <p className="text-2xl font-bold text-green-700 mt-0.5">{success}</p>
                  </div>
                  <div className="rounded-lg bg-red-50 p-3 text-center border border-red-100">
                    <p className="text-[11px] text-red-600 uppercase tracking-wider">Failed</p>
                    <p className="text-2xl font-bold text-red-700 mt-0.5">{failed}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {(status === 'completed' || status === 'error') && results && (
            <>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-white p-3 text-center shadow-sm border">
                    <p className="text-[11px] text-slate-500 uppercase tracking-wider">Total Rows</p>
                    <p className="text-2xl font-bold mt-0.5">{results.totalRows || 0}</p>
                  </div>
                  <div className="rounded-lg bg-green-50 p-3 text-center border border-green-100">
                    <p className="text-[11px] text-green-600 uppercase tracking-wider">Imported</p>
                    <p className="text-2xl font-bold text-green-700 mt-0.5">{results.imported || results.studentsCreated || 0}</p>
                  </div>
                  <div className="rounded-lg bg-purple-50 p-3 text-center border border-purple-100">
                    <p className="text-[11px] text-purple-600 uppercase tracking-wider">Skipped</p>
                    <p className="text-2xl font-bold text-purple-700 mt-0.5">{results.skipped || results.existingParentsLinked || 0}</p>
                  </div>
                  <div className="rounded-lg bg-red-50 p-3 text-center border border-red-100">
                    <p className="text-[11px] text-red-600 uppercase tracking-wider">Failed</p>
                    <p className="text-2xl font-bold text-red-700 mt-0.5">{results.failed || 0}</p>
                  </div>
                </div>

                {results.errors?.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-800 mb-2">
                          {results.errors.length} Error{results.errors.length > 1 ? 's' : ''} Found
                        </p>
                        <div className="max-h-32 overflow-y-auto space-y-1 text-xs text-amber-700">
                          {results.errors.slice(0, 5).map((err, idx) => (
                            <div key={idx} className="border-b border-amber-100/50 pb-1 last:border-0">
                              Row {err.row}: {err.error}
                            </div>
                          ))}
                          {results.errors.length > 5 && (
                            <p className="text-amber-600 italic">
                              ...and {results.errors.length - 5} more errors
                            </p>
                          )}
                        </div>
                        <Button
                          onClick={downloadErrorReport}
                          variant="outline"
                          size="sm"
                          className="mt-3 w-full"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download Error Report
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="border-t px-6 py-4 bg-slate-50">
          <Button
            onClick={handleClose}
            className="w-full"
            disabled={status === 'importing'}
          >
            {status === 'importing' ? 'Importing...' : status === 'completed' ? 'Done' : 'Close'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
