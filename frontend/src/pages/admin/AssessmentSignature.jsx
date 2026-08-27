import { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { 
  FileSignature, Info, Plus, Trash2, Printer, Download, Save, Sparkles, FolderOpen, AlertCircle, FileText, Calendar, RefreshCw, ChevronDown
} from 'lucide-react';
import { PageHeader, ErpSection } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// Shared date formatter utility for DD-MM-YY format
const getFormattedDate = (date = new Date()) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
};

const ensureDMYFormat = (str) => {
  if (!str) return '';
  if (/^\d{2}-\d{2}-\d{2}$/.test(str)) return str;

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const parts = str.split('-');
    return `${parts[2]}-${parts[1]}-${parts[0].slice(-2)}`;
  }

  let cleaned = str.replace(/\//g, '-').trim();

  if (/^\d{8}$/.test(cleaned)) {
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(6)}`;
  }
  if (/^\d{6}$/.test(cleaned)) {
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(4)}`;
  }

  const parts = cleaned.split('-');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    let year = parts[2];
    if (year.length === 4) {
      year = year.slice(-2);
    }
    return `${day}-${month}-${year}`;
  }

  const parsed = Date.parse(cleaned);
  if (!isNaN(parsed)) {
    return getFormattedDate(new Date(parsed));
  }

  return cleaned;
};

// Utility function to paginate students using fixed row count
const paginateStudents = (studentsList, B) => {
  if (studentsList.length === 0) return [];
  // Fixed 25 rows per page
  const ROWS_PER_PAGE = 25;
  const chunks = [];
  const total = studentsList.length;

  for (let i = 0; i < total; i += ROWS_PER_PAGE) {
    const chunkStudents = studentsList.slice(i, i + ROWS_PER_PAGE);
    const isLastChunk = i + ROWS_PER_PAGE >= total;
    
    chunks.push({
      startIndex: i,
      list: chunkStudents,
      isLast: isLastChunk,
      blankRowsCount: isLastChunk ? B : 0
    });
  }
  
  return chunks;
};

export default function AssessmentSignature() {
  const { user } = useAuth();
  const schoolId = user?.school?._id || user?.school || 'default';
  const signatureSheetsKey = `testmaster_signature_sheets_${schoolId}`;
  const plannersKey = `testmaster_assessment_planners_${schoolId}`;
  
  // Basic states
  const [extraBlankRows, setExtraBlankRows] = useState(2);
  const [assessmentTitle, setAssessmentTitle] = useState('');
  const [activeClasses, setActiveClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);

  // Assessment Source state
  const [assessmentSource, setAssessmentSource] = useState('planner'); // 'manual' or 'planner'
  const [selectedPlannerId, setSelectedPlannerId] = useState('');
  const [allPlanners, setAllPlanners] = useState([]);

  // Assessment Columns: Array of { id, subject, date }
  const [assessmentColumns, setAssessmentColumns] = useState([]);

  // Saved templates state
  const [savedSheets, setSavedSheets] = useState([]);
  const [currentSheetId, setCurrentSheetId] = useState(null);
  const [showTemplatesDropdown, setShowTemplatesDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Calendar popover trigger state (column ID)
  const [showCalendarId, setShowCalendarId] = useState(null);

  // Format date on blur (e.g. 110826 -> 11-08-26, 11/08/26 -> 11-08-26)
  const formatOnBlur = (value) => {
    return ensureDMYFormat(value);
  };

  // Convert YYYY-MM-DD to DD-MM-YY
  const convertYMDtoDMY = (ymdStr) => {
    return ensureDMYFormat(ymdStr);
  };

  // Parse DD-MM-YYYY date string to standard Date object
  const parseDMY = (dmyStr) => {
    if (!dmyStr) return null;
    const parts = dmyStr.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month - 1, day);
      }
    }
    return null;
  };

  // Fetch active classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get('/classes');
        const classes = res.data.classes || [];
        setActiveClasses(classes);
        if (classes.length > 0) {
          setSelectedClassId(classes[0]._id);
        }
      } catch (err) {
        console.error('Failed to fetch classes:', err);
        toast.error('Failed to load classes');
      } finally {
        setLoadingClasses(false);
      }
    };
    fetchClasses();
    loadSavedSheetsFromStorage();
    loadAllPlannersFromStorage();
  }, []);

  // Fetch students when class changes
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClassId) {
        setStudents([]);
        return;
      }
      setLoadingStudents(true);
      try {
        const res = await api.get(`/students?class=${selectedClassId}`);
        const loadedStudents = res.data.students || [];
        
        // Sort by Roll Number (numerically if possible, otherwise alphabetically)
        const sorted = [...loadedStudents].sort((a, b) => {
          const rollA = parseInt(a.rollNo, 10);
          const rollB = parseInt(b.rollNo, 10);
          if (isNaN(rollA) && isNaN(rollB)) {
            return String(a.rollNo || '').localeCompare(String(b.rollNo || ''));
          }
          if (isNaN(rollA)) return 1;
          if (isNaN(rollB)) return -1;
          return rollA - rollB;
        });

        setStudents(sorted);
      } catch (err) {
        console.error('Failed to load students:', err);
        toast.error('Failed to load students for selected class');
      } finally {
        setLoadingStudents(false);
      }
    };
    fetchStudents();
  }, [selectedClassId]);

  // Load saved configurations from LocalStorage
  const loadSavedSheetsFromStorage = () => {
    try {
      const stored = localStorage.getItem(signatureSheetsKey);
      if (stored) {
        setSavedSheets(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Error reading local storage:', err);
    }
  };

  // Load all planners from LocalStorage
  const loadAllPlannersFromStorage = () => {
    try {
      const stored = localStorage.getItem(plannersKey);
      if (stored) {
        setAllPlanners(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Error reading local planners:', err);
    }
  };

  // Filter planners associated with selected class ID
  const classPlanners = useMemo(() => {
    if (!selectedClassId) return [];
    
    // Find active class name to support custom offline matchings if needed
    const classObj = activeClasses.find(c => c._id === selectedClassId);
    const fallbackName = classObj ? `${classObj.className}-${classObj.section}`.toLowerCase() : '';

    return allPlanners.filter(p => 
      p.classes && (p.classes.includes(selectedClassId) || (fallbackName && p.classes.includes(fallbackName)))
    );
  }, [allPlanners, selectedClassId, activeClasses]);

  // Handle source planner selection & automatic import
  const handleSelectPlanner = (plannerId) => {
    setSelectedPlannerId(plannerId);
    if (!plannerId) return;

    const planner = classPlanners.find(p => p.id === plannerId);
    if (!planner || !planner.gridData) return;

    const classObj = activeClasses.find(c => c._id === selectedClassId);
    const fallbackName = classObj ? `${classObj.className}-${classObj.section}`.toLowerCase() : '';

    const entries = [];
    Object.keys(planner.gridData).forEach(key => {
      // Key format: YYYY-MM-DD_classId
      const parts = key.split('_');
      if (parts.length === 2) {
        const [dateStr, classId] = parts;
        if (classId === selectedClassId || (fallbackName && classId.toLowerCase() === fallbackName)) {
          const cell = planner.gridData[key];
          if (cell && cell.subject) {
            const subjectLower = cell.subject.toLowerCase().trim();
            const customLabels = Object.values(planner.customDateLabels || {}).map(v => v.toLowerCase().trim());
            const isExcluded =
              subjectLower === 'no test' ||
              subjectLower === 'holiday' ||
              subjectLower === 'nothing' ||
              customLabels.includes(subjectLower);

            if (!isExcluded) {
              entries.push({
                date: dateStr, // YYYY-MM-DD
                subject: cell.subject
              });
            }
          }
        }
      }
    });

    // Chronological sorting
    entries.sort((a, b) => a.date.localeCompare(b.date));

    // Map to columns format
    const formatted = entries.map((entry, index) => ({
      id: `${Date.now()}_${index}`,
      subject: entry.subject,
      date: convertYMDtoDMY(entry.date)
    }));

    setAssessmentColumns(formatted);
    toast.success('Assessment list imported successfully.');
  };

  // Add a new assessment row/column
  const handleAddColumn = () => {
    const newId = Date.now().toString();
    setAssessmentColumns([
      ...assessmentColumns,
      { id: newId, subject: '', date: '' }
    ]);
  };

  // Delete an assessment row/column
  const handleDeleteColumn = (id) => {
    setAssessmentColumns(assessmentColumns.filter(col => col.id !== id));
  };

  // Update specific field in columns
  const handleColumnChange = (id, field, value) => {
    setAssessmentColumns(
      assessmentColumns.map(col => 
        col.id === id ? { ...col, [field]: value } : col
      )
    );
  };

  // Save layout template
  const handleSaveSheet = () => {
    if (!assessmentTitle.trim()) {
      toast.error('Please enter an assessment title');
      return;
    }
    if (!selectedClassId) {
      toast.error('Please select a class');
      return;
    }

    try {
      const newSheet = {
        id: currentSheetId || Date.now().toString(),
        title: assessmentTitle,
        classId: selectedClassId,
        columns: assessmentColumns,
        source: assessmentSource,
        plannerId: selectedPlannerId,
        updatedAt: new Date().toISOString()
      };

      let list = [...savedSheets];
      const existingIndex = list.findIndex(s => s.id === newSheet.id);
      if (existingIndex > -1) {
        list[existingIndex] = newSheet;
        toast.success('Signature sheet updated successfully');
      } else {
        list.push(newSheet);
        toast.success('Signature sheet saved successfully');
      }

      localStorage.setItem(signatureSheetsKey, JSON.stringify(list));
      setSavedSheets(list);
      setCurrentSheetId(newSheet.id);
    } catch (err) {
      console.error('Failed to save to local storage:', err);
      toast.error('Failed to save sheet configuration');
    }
  };

  // Load template
  const handleLoadSheet = (sheet) => {
    setAssessmentTitle(sheet.title);
    setSelectedClassId(sheet.classId);
    setAssessmentColumns(sheet.columns);
    setAssessmentSource(sheet.source || 'manual');
    setSelectedPlannerId(sheet.plannerId || '');
    setCurrentSheetId(sheet.id);
    toast.success(`Loaded template: "${sheet.title}"`);
  };

  // Delete template
  const handleDeleteSheet = (id, e) => {
    e.stopPropagation();
    try {
      const filtered = savedSheets.filter(s => s.id !== id);
      localStorage.setItem(signatureSheetsKey, JSON.stringify(filtered));
      setSavedSheets(filtered);
      if (currentSheetId === id) {
        setCurrentSheetId(null);
      }
      toast.success('Template deleted successfully');
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  };

  // Clear sheet configuration
  const handleResetForm = () => {
    setAssessmentTitle('');
    if (activeClasses.length > 0) {
      setSelectedClassId(activeClasses[0]._id);
    }
    setAssessmentColumns([{ id: Date.now().toString(), subject: '', date: '' }]);
    setAssessmentSource('planner');
    setSelectedPlannerId('');
    setCurrentSheetId(null);
    toast.info('Form cleared');
  };

  // Print trigger
  const handlePrint = () => {
    if (!selectedClassId) {
      toast.error('Select a class to preview and print');
      return;
    }
    window.print();
  };

  // Export dynamically to Landscape A4 PDF without any project branding names
  const handleDownloadPDF = () => {
    if (!selectedClassId) {
      toast.error('Please select a class first');
      return;
    }
    if (assessmentColumns.length === 0) {
      toast.error('Please add at least one assessment column');
      return;
    }
    if (students.length === 0) {
      toast.error('No student records found in this class');
      return;
    }

    // Subtle page watermark using School Logo (rendered on every page behind table)
    const drawWatermark = (pdfDoc) => {
      if (user?.school?.logo) {
        try {
          const pageWidth = pdfDoc.internal.pageSize.width;
          const pageHeight = pdfDoc.internal.pageSize.height;
          const size = 110; // 110mm watermark centered
          const x = (pageWidth - size) / 2;
          const y = (pageHeight - size) / 2;
          
          if (typeof pdfDoc.GState === 'function') {
            const gState = new pdfDoc.GState({ opacity: 0.08 });
            pdfDoc.saveGraphicsState();
            pdfDoc.setGState(gState);
            pdfDoc.addImage(user.school.logo, 'JPEG', x, y, size, size);
            pdfDoc.restoreGraphicsState();
          } else {
            console.warn('jsPDF GState is not supported in this environment');
          }
        } catch (e) {
          console.error('Failed to draw watermark:', e);
        }
      }
    };

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const schoolName = user?.school?.schoolName || 'Demo Public School';
    const selectedClassObj = activeClasses.find(c => c._id === selectedClassId);
    const fullClassName = selectedClassObj 
      ? `${selectedClassObj.className} - ${selectedClassObj.section}`
      : 'Unknown';

    // Header drawer helper - 100% brand-free
    const drawHeader = (pdfDoc) => {
      const pageWidth = pdfDoc.internal.pageSize.width;
      
      // Simple elegant crest emblem outline on PDF (uses custom school logo if uploaded)
      if (user?.school?.logo) {
        try {
          pdfDoc.addImage(user.school.logo, 'JPEG', 15, 8, 8, 8);
        } catch (e) {
          pdfDoc.setDrawColor(0, 0, 0);
          pdfDoc.roundedRect(15, 8, 8, 8, 1.5, 1.5, 'D');
        }
      } else {
        pdfDoc.setDrawColor(0, 0, 0);
        pdfDoc.setLineWidth(0.35);
        pdfDoc.roundedRect(15, 8, 8, 8, 1.5, 1.5, 'D');
        pdfDoc.setFillColor(250, 250, 250);
        pdfDoc.roundedRect(15, 8, 8, 8, 1.5, 1.5, 'F');
        
        pdfDoc.line(16.5, 12, 18, 13.5);
        pdfDoc.line(18, 13.5, 21.5, 10);
      }
      
      // School Name (Left aligned next to logo)
      pdfDoc.setFont('Helvetica', 'bold');
      pdfDoc.setFontSize(11);
      pdfDoc.setTextColor(0, 0, 0);
      pdfDoc.text(schoolName.toUpperCase(), 26, 12.5);
      
      // Document Type subtitle
      pdfDoc.setFont('Helvetica', 'bold');
      pdfDoc.setFontSize(8.5);
      pdfDoc.text('ATTENDANCE SHEET', 26, 15.5);

      // Right-aligned Class & Date
      pdfDoc.setFont('Helvetica', 'bold');
      pdfDoc.setFontSize(8.5);
      pdfDoc.text(`CLASS: ${fullClassName.toUpperCase()}`, pageWidth - 15, 12, { align: 'right' });
      
      pdfDoc.setFont('Helvetica', 'normal');
      pdfDoc.text(`Generated: ${getFormattedDate()}`, pageWidth - 15, 15.5, { align: 'right' });

      // Title Banner under header
      pdfDoc.setFont('Helvetica', 'bold');
      pdfDoc.setFontSize(9);
      pdfDoc.text(`TITLE: ${assessmentTitle.toUpperCase()}`, 15, 22);

      // Solid dividing border line
      pdfDoc.setDrawColor(0, 0, 0);
      pdfDoc.setLineWidth(0.4);
      pdfDoc.line(15, 24, pageWidth - 15, 24);
    };

    // Columns format - S.No, Student Name, Subject Columns
    const tableHeaders = [
      ['S.No', 'Student Name', ...assessmentColumns.map(col => `${col.subject || '—'}\n(${ensureDMYFormat(col.date) || '—'})`)]
    ];

    // Page boundaries
    const totalWidth = 180; // A4 portrait width = 210mm. Total printable width = 210 - 30 margin = 180mm.
    const snoWidth = 12;
    const nameWidth = 48;
    const remWidth = totalWidth - snoWidth - nameWidth; // 120mm
    const subjectColWidth = remWidth / assessmentColumns.length;

    const colStyles = {
      0: { halign: 'center', cellWidth: snoWidth },
      1: { halign: 'left', cellWidth: nameWidth }
    };
    
    for (let i = 2; i < 2 + assessmentColumns.length; i++) {
      colStyles[i] = { halign: 'center', cellWidth: subjectColWidth };
    }

    // Chunk students into pages dynamically to fill unused space
    studentChunks.forEach((chunk, chunkIdx) => {
      // Map actual students in this page chunk
      const chunkRows = chunk.list.map((student, idx) => [
        chunk.startIndex + idx + 1,
        student.name,
        ...assessmentColumns.map(() => '')
      ]);
      
      // Append blank rows to this page chunk (only on the last page chunk)
      for (let j = 0; j < chunk.blankRowsCount; j++) {
        chunkRows.push([
          '', // Blank S.No
          '', // Blank Student Name
          ...assessmentColumns.map(() => '')
        ]);
      }
      
      // If not the first chunk, add a new page
      if (chunkIdx > 0) {
        doc.addPage();
      }

      autoTable(doc, {
        startY: 28, // Start below header banner divider
        margin: { top: 28, bottom: 36, left: 15, right: 15 },
        head: tableHeaders,
        body: chunkRows,
        theme: 'grid',
        tableLineColor: [0, 0, 0],
        tableLineWidth: 0.35,
        rowPageBreak: 'avoid', // Avoid split rows
        headStyles: {
          fillColor: null,
          textColor: [0, 0, 0],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          lineWidth: 0.25,
          lineColor: [0, 0, 0]
        },
        bodyStyles: {
          fillColor: null,
          textColor: [0, 0, 0],
          fontSize: 8,
          valign: 'middle',
          lineWidth: 0.2,
          lineColor: [0, 0, 0],
          minCellHeight: 8.5
        },
        columnStyles: colStyles,
        willDrawPage: function(data) {
          drawWatermark(doc);
        },
        didDrawPage: function(data) {
          drawHeader(doc);
        }
      });
    });

    // Pagination numbers & Invigilator CBSE official footer post-processing loop
    const totalPages = doc.internal.getNumberOfPages();
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      // Draw thin divider line above footer
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.line(15, pageHeight - 34, pageWidth - 15, pageHeight - 34);
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);

      // Row 1: Total Students | Present | Absent (3-column grid layout)
      doc.text('Total Students : __________', 15, pageHeight - 27);
      doc.text('Present : __________', pageWidth / 2, pageHeight - 27, { align: 'center' });
      doc.text('Absent : __________', pageWidth - 15, pageHeight - 27, { align: 'right' });
      
      // Row 2: Invigilator 1 | Invigilator 2 | Checked By (3-column grid layout)
      doc.text('Invigilator 1 : _____________________', 15, pageHeight - 19);
      doc.text('Invigilator 2 : _____________________', pageWidth / 2, pageHeight - 19, { align: 'center' });
      doc.text('Checked By : _____________________', pageWidth - 15, pageHeight - 19, { align: 'right' });
      
      // Bottom row: Generated on (left) | Page X of Y (right)
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.text(`Generated on: ${getFormattedDate()}`, 15, pageHeight - 9);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - 15, pageHeight - 9, { align: 'right' });
    }

    const cleanTitle = assessmentTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    doc.save(`signature_sheet_${cleanTitle || 'assessment'}_${fullClassName.toLowerCase().replace(/\s+/g, '_')}.pdf`);
    toast.success('PDF sheet downloaded successfully');
  };

  // Get active class details
  const selectedClassObj = useMemo(() => {
    return activeClasses.find(c => c._id === selectedClassId);
  }, [activeClasses, selectedClassId]);

  const selectedClassName = selectedClassObj 
    ? `${selectedClassObj.className} - ${selectedClassObj.section}`
    : '';

  const studentChunks = useMemo(() => {
    return paginateStudents(students, extraBlankRows);
  }, [students, extraBlankRows]);  // Update browser document title on mount
  useEffect(() => {
    document.title = "Attendance Sheet | TestMaster Pro";
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowTemplatesDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-4 max-w-7xl mx-auto lg:-mt-10 md:-mt-8 -mt-6 pb-10 px-2 sm:px-4">
      {/* Inject print stylesheet overrides dynamically */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          /* Hide everything by default */
          body * {
            visibility: hidden !important;
          }

          /* Show only the print container and its children */
          .print-area-wrapper,
          .print-area-wrapper * {
            visibility: visible !important;
          }

          /* Position print container - let content flow naturally */
          .print-area-wrapper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            background: white !important;
          }

          /* Force page margins - use standard margins to avoid scaling */
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          .page-break-after-always {
            page-break-after: always !important;
            break-after: always !important;
          }

          /* Watermark: absolute within each page container so it appears on EVERY printed page */
          .print-watermark {
            display: block !important;
            position: absolute !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 110mm !important;
            height: 110mm !important;
            opacity: 0.08 !important;
            z-index: 0 !important;
            pointer-events: none !important;
          }
          .print-watermark img {
            width: 100% !important;
            height: 100% !important;
            object-fit: contain !important;
          }
        }

        /* Watermark — visible in Live Preview and Print, always behind content */
        .print-watermark {
          display: block;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 110mm;
          height: 110mm;
          opacity: 0.08;
          z-index: 0;
          pointer-events: none;
        }
        .print-watermark img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
      `}} />

      <div className="no-print -mb-4 flex items-center justify-between">
        <PageHeader
          title="Attendance Sheet"
          description="Generate and export printable student attendance sheets for classrooms."
        />
        <div className="relative" ref={dropdownRef}>
          <Button
            onClick={() => setShowTemplatesDropdown(!showTemplatesDropdown)}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-semibold text-xs h-10 flex items-center gap-2 border-0"
          >
            <FolderOpen className="h-4 w-4" />
            Saved Templates ({savedSheets.length})
            <ChevronDown className={`h-4 w-4 transition-transform ${showTemplatesDropdown ? 'rotate-180' : ''}`} />
          </Button>
          
          {showTemplatesDropdown && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-lg z-50 max-h-[350px] overflow-y-auto">
              <div className="p-3 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <FolderOpen className="h-4 w-4 text-indigo-500" />
                  Saved Templates
                </h3>
              </div>
              
              {savedSheets.length === 0 ? (
                <div className="p-4">
                  <p className="text-[11px] text-slate-400 text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    No templates saved yet. Configure and save to store.
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {savedSheets.map((sheet) => (
                    <div 
                      key={sheet.id} 
                      className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all group cursor-pointer"
                      onClick={() => {
                        handleLoadSheet(sheet);
                        setShowTemplatesDropdown(false);
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-700 truncate">{sheet.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                          Class: {activeClasses.find(c => c._id === sheet.classId)?.className || 'Unknown'} • Columns: {sheet.columns.length}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={(e) => {
                          handleDeleteSheet(sheet.id, e);
                          e.stopPropagation();
                        }}
                        className="h-7 w-7 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 items-stretch">
        
        {/* TOP TWO-COLUMN CONFIGURATION ROW (no-print) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch no-print">
          {/* LEFT CARD - SHEET CONFIGURATION */}
          <ErpSection
            title="Sheet Configuration"
            icon={FileSignature}
            tone="green"
            className="h-full border border-slate-200/80 shadow-sm"
            contentClassName="p-4"
          >
            <div className="border border-emerald-150/70 rounded-2xl p-4 bg-gradient-to-br from-emerald-50/70 to-teal-50/30 space-y-3">
              {/* Assessment Title */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Assessment Title</label>
                <Input 
                  value={assessmentTitle}
                  onChange={(e) => setAssessmentTitle(e.target.value)}
                  placeholder="Half Yearly Examination / Unit Test"
                  className="rounded-lg border-slate-200 h-9 text-xs"
                />
              </div>

              {/* Class Selector */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Select Class</label>
                {loadingClasses ? (
                  <div className="h-9 w-full bg-slate-50 animate-pulse rounded-lg border border-slate-200" />
                ) : (
                  <Select value={selectedClassId} onValueChange={(val) => { setSelectedClassId(val); setSelectedPlannerId(''); }}>
                    <SelectTrigger className="rounded-lg border-slate-200 text-slate-700 h-9 text-xs bg-white">
                      <SelectValue placeholder="Choose a class" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeClasses.map((cls) => (
                        <SelectItem key={cls._id} value={cls._id}>
                          Class {cls.className} - {cls.section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Assessment Source Radios */}
              {selectedClassId && (
                <div className="space-y-1.5 bg-white/70 backdrop-blur-md p-2.5 rounded-lg border border-slate-200 shadow-sm">
                  <label className="text-xs font-bold text-slate-700 block">Assessment Source</label>
                  <div className="flex gap-4 mt-0.5">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                      <input 
                        type="radio" 
                        name="assessmentSource"
                        value="planner"
                        checked={assessmentSource === 'planner'}
                        onChange={() => setAssessmentSource('planner')}
                        className="text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                      />
                      Fetch from Assessment Planner
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-655 cursor-pointer">
                      <input 
                        type="radio" 
                        name="assessmentSource"
                        value="manual"
                        checked={assessmentSource === 'manual'}
                        onChange={() => setAssessmentSource('manual')}
                        className="text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                      />
                      Manual Entry
                    </label>
                  </div>
                </div>
              )}

              {/* Planner Selector Option */}
              {selectedClassId && assessmentSource === 'planner' && (
                <div className="space-y-1 border-l-2 border-emerald-500 pl-3">
                  <label className="text-xs font-semibold text-slate-700 block">Select Assessment Planner</label>
                  {classPlanners.length === 0 ? (
                    <div className="rounded-lg border border-red-100 bg-red-50/50 p-2.5 flex flex-col gap-1.5">
                      <div className="flex items-start gap-2 text-red-800 text-xs font-medium">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                        <span>No Assessment Planner found for this class.</span>
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setAssessmentSource('manual')}
                        className="h-7 text-[10px] w-fit font-bold border-red-200 text-red-700 bg-white hover:bg-red-50 rounded-md"
                      >
                        Switch to Manual Entry
                      </Button>
                    </div>
                  ) : (
                    <Select value={selectedPlannerId} onValueChange={handleSelectPlanner}>
                      <SelectTrigger className="rounded-lg border-slate-200 text-slate-700 bg-white shadow-xs h-9 text-xs">
                        <SelectValue placeholder="Choose an Assessment Planner" />
                      </SelectTrigger>
                      <SelectContent>
                        {classPlanners.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {/* Extra Blank Rows Selector */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Extra Blank Rows</label>
                <Input 
                  type="number"
                  min={0}
                  max={10}
                  value={extraBlankRows}
                  onChange={(e) => setExtraBlankRows(Math.max(0, Math.min(10, parseInt(e.target.value, 10) || 0)))}
                  className="rounded-lg border-slate-200 h-9 text-xs"
                />
              </div>
            </div>
          </ErpSection>
          <ErpSection
            title="Assessment Columns"
            icon={Calendar}
            tone="green"
            action={
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={handleAddColumn}
                className="h-7.5 text-xs font-semibold text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-md py-0.5 px-2.5"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Column
              </Button>
            }
            className="h-full border border-slate-200/80 shadow-sm"
            contentClassName="p-4"
          >
            <div className="border border-emerald-150/70 rounded-2xl p-4 bg-gradient-to-br from-emerald-50/70 to-teal-50/30 flex flex-col h-full space-y-3.5">
              <div className="flex-1 flex flex-col justify-center min-h-[120px]">
                {assessmentColumns.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center bg-white/50 flex-1 flex flex-col justify-center">
                    <AlertCircle className="h-5 w-5 text-slate-400 mx-auto mb-1.5" />
                    <p className="text-xs text-slate-500 font-medium">No assessment columns added yet.</p>
                    <p className="text-[10px] text-slate-405">Click the 'Add Column' button to add columns manually.</p>
                  </div>
                ) : (
                  <div className="max-h-[160px] overflow-y-auto space-y-2 border border-slate-100 rounded-lg p-2 bg-white/70 backdrop-blur-md scrollbar-thin flex-1">
                    {assessmentColumns.map((col, index) => (
                      <div key={col.id} className="flex gap-2 items-center bg-white p-1.5 rounded-lg border border-slate-200/60 shadow-xs">
                        <div className="text-[11px] font-bold text-slate-400 w-5 text-center">
                          {index + 1}
                        </div>
                        
                        <div className="flex-1">
                          <Input 
                            placeholder="Subject"
                            value={col.subject}
                            onChange={(e) => handleColumnChange(col.id, 'subject', e.target.value)}
                            className="h-8.5 text-xs rounded-md border-slate-200"
                          />
                        </div>
                        
                        <div className="flex-1 relative">
                          <Input 
                            placeholder="DD-MM-YYYY"
                            value={col.date}
                            onChange={(e) => handleColumnChange(col.id, 'date', e.target.value)}
                            onBlur={(e) => handleColumnChange(col.id, 'date', formatOnBlur(e.target.value))}
                            className="h-8.5 text-xs rounded-md border-slate-200 pr-8"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCalendarId(showCalendarId === col.id ? null : col.id)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-655 transition-colors"
                          >
                            <Calendar className="h-3.5 w-3.5" />
                          </button>

                          {showCalendarId === col.id && (
                            <div className="absolute right-0 top-8.5 z-50 bg-white border border-slate-200 rounded-lg shadow-xl p-2">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-1 mb-2 px-1">
                                <span className="text-[10px] font-bold text-slate-500">Pick Date</span>
                                <button 
                                  type="button" 
                                  onClick={() => setShowCalendarId(null)}
                                  className="text-[10px] font-bold text-slate-400 hover:text-slate-600"
                                >
                                  Close
                                </button>
                              </div>
                              <ReactDatePicker
                                inline
                                selected={parseDMY(col.date)}
                                onChange={(date) => {
                                  if (date) {
                                    handleColumnChange(col.id, 'date', getFormattedDate(date));
                                  } else {
                                    handleColumnChange(col.id, 'date', '');
                                  }
                                  setShowCalendarId(null);
                                }}
                              />
                            </div>
                          )}
                        </div>

                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteColumn(col.id)}
                          className="h-8.5 w-8.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-md shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions 2x2 Grid at bottom */}
              <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-100 mt-auto">
                <Button 
                  onClick={handleSaveSheet}
                  className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md shadow-emerald-500/10 font-semibold text-xs h-10 flex items-center justify-center gap-1.5 cursor-pointer border-0"
                >
                  <Save className="h-4 w-4" />
                  Save Template
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleResetForm}
                  className="w-full rounded-lg border-slate-200 bg-white text-slate-655 hover:bg-slate-50 font-semibold text-xs h-10 flex items-center justify-center cursor-pointer"
                >
                  Clear Form
                </Button>
                <Button 
                  onClick={handlePrint}
                  className="w-full rounded-lg bg-slate-900 text-white hover:bg-slate-800 font-semibold text-xs h-10 flex items-center justify-center gap-1.5 cursor-pointer border-0"
                >
                  <Printer className="h-4 w-4" />
                  Print Sheet
                </Button>
                <Button 
                  onClick={handleDownloadPDF}
                  className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md shadow-emerald-500/10 font-semibold text-xs h-10 flex items-center justify-center gap-1.5 cursor-pointer border-0"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </div>
          </ErpSection>
          
        </div>

        {/* RIGHT PANEL - LIVE PREVIEW */}
        <div className="w-full space-y-3">
          
          <div className="flex items-center justify-between no-print max-w-5xl mx-auto w-full">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
              Real-time Print Preview (Portrait A4 aspect)
            </span>
            {students.length > 0 && (
              <span className="text-[11px] font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-100 shadow-2xs">
                {students.length} Records Loaded
              </span>
            )}
          </div>

          <div className="max-w-5xl mx-auto w-full space-y-4 print-area-wrapper">
            {loadingStudents ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-2 no-print bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <p className="text-xs text-slate-400 font-medium">Loading student matrix records...</p>
              </div>
            ) : students.length === 0 ? (
              <div className="w-full bg-white text-black p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-sm print:p-0 print:border-0 print:shadow-none print:rounded-none">
                {/* Header block for empty state */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end border-b border-black pb-2 mb-3 gap-3">
                  <div className="flex items-center gap-2.5">
                    {user?.school?.logo ? (
                      <img 
                        src={user.school.logo} 
                        alt="" 
                        className="h-8 w-8 object-contain rounded-lg border border-black shrink-0"
                      />
                    ) : (
                      <div className="h-8 w-8 flex items-center justify-center rounded-lg border border-black font-bold text-sm select-none print:border-black shrink-0 bg-slate-50/50">
                        🏫
                      </div>
                    )}
                    <div className="text-left">
                      <h2 className="text-sm font-bold uppercase tracking-tight text-slate-900 print:text-black leading-tight">
                        {user?.school?.schoolName || 'Demo Public School'}
                      </h2>
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 print:text-black mt-0.5">
                        Attendance Sheet
                      </h3>
                    </div>
                  </div>
                  <div className="text-center sm:text-right">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-800 print:text-black">
                      CLASS: —
                    </div>
                    <div className="text-[8px] text-slate-400 print:text-black mt-0.5 font-semibold">
                      GENERATED ON: {getFormattedDate()}
                    </div>
                  </div>
                </div>
                <div className="mb-3 bg-transparent py-1 px-2.5 rounded border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Title: </span>
                  <span className="text-xs font-extrabold text-slate-900">{assessmentTitle.trim() || 'ASSESSMENT'}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-black text-[11px] bg-transparent">
                    <thead>
                      <tr className="bg-transparent">
                        <th className="border border-black px-1.5 py-1 text-center font-bold w-10 text-slate-800">S.No</th>
                        <th className="border border-black px-2 py-1 text-left font-bold w-44 text-slate-800">Student Name</th>
                        {assessmentColumns.map((col, idx) => (
                          <th key={col.id || idx} className="border border-black px-1.5 py-1 text-center font-bold min-w-[80px] text-slate-800">
                            <div className="font-bold text-[10px] tracking-wide truncate max-w-[120px] mx-auto">{col.subject || 'Subject'}</div>
                            <div className="text-[8px] font-medium text-slate-450 mt-0.5">{ensureDMYFormat(col.date) || 'Date'}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={2 + assessmentColumns.length} className="border border-black px-4 py-8 text-center text-slate-400 font-semibold italic">
                          No student records loaded. Select a class in the configuration panel.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="space-y-6 print:space-y-0">
                {studentChunks.map((chunk, pageIdx) => (
                  <div key={pageIdx} className="w-full bg-white text-black p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-sm print:p-0 print:border-0 print:shadow-none print:rounded-none page-break-after-always" style={{ position: 'relative' }}>
                    
                    {/* Print Watermark - only visible when printing, behind all content */}
                    {user?.school?.logo && (
                      <div className="print-watermark">
                        <img src={user.school.logo} alt="" aria-hidden="true" />
                      </div>
                    )}

                    {/* Content wrapper: z-index:1 ensures it always paints above the z-index:0 watermark */}
                    <div style={{ position: 'relative', zIndex: 1 }}>

                    {/* Header Block */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end border-b border-black pb-2 mb-3 gap-3">
                      <div className="flex items-center gap-2.5">
                        {user?.school?.logo ? (
                          <img 
                            src={user.school.logo} 
                            alt="" 
                            className="h-8 w-8 object-contain rounded-lg border border-black shrink-0"
                          />
                        ) : (
                          <div className="h-8 w-8 flex items-center justify-center rounded-lg border border-black font-bold text-sm select-none print:border-black shrink-0 bg-slate-50/50">
                            🏫
                          </div>
                        )}
                        <div className="text-left">
                          <h2 className="text-sm font-bold uppercase tracking-tight text-slate-900 print:text-black leading-tight">
                            {user?.school?.schoolName || 'Demo Public School'}
                          </h2>
                          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 print:text-black mt-0.5">
                            Attendance Sheet
                          </h3>
                        </div>
                      </div>
                      
                      <div className="text-center sm:text-right">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-800 print:text-black">
                          CLASS: {selectedClassName || '—'}
                        </div>
                        <div className="text-[8px] text-slate-400 print:text-black mt-0.5 font-semibold">
                          GENERATED ON: {getFormattedDate()}
                        </div>
                      </div>
                    </div>

                    {/* Title Banner */}
                    <div className="mb-3 bg-transparent print:bg-transparent py-1 px-2.5 rounded border border-slate-100 print:border-0 print:px-0">
                      <span className="text-[11px] font-bold text-slate-500 print:text-black uppercase">Title: </span>
                      <span className="text-xs font-extrabold text-slate-900 print:text-black">{assessmentTitle.trim() || 'ASSESSMENT'}</span>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-black text-[11px] bg-transparent print:text-black">
                        <thead>
                          <tr className="bg-transparent print:bg-transparent">
                            <th className="border border-black px-1.5 py-1 text-center font-bold w-10 text-slate-800 print:text-black">S.No</th>
                            <th className="border border-black px-2 py-1 text-left font-bold w-44 text-slate-800 print:text-black">Student Name</th>
                            {assessmentColumns.map((col, idx) => (
                              <th key={col.id || idx} className="border border-black px-1.5 py-1 text-center font-bold min-w-[80px] text-slate-800 print:text-black">
                                <div className="font-bold text-[10px] tracking-wide truncate max-w-[120px] mx-auto">{col.subject || 'Subject'}</div>
                                <div className="text-[8px] font-medium text-slate-450 print:text-black mt-0.5 whitespace-nowrap">{ensureDMYFormat(col.date) || 'Date'}</div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {chunk.list.map((student, idx) => (
                            <tr key={student._id || idx} className="hover:bg-slate-50/50 print:hover:bg-transparent">
                              <td className="border border-black px-1.5 py-0.5 text-center text-slate-800 print:text-black font-semibold">{chunk.startIndex + idx + 1}</td>
                              <td className="border border-black px-2 py-0.5 text-left font-bold text-slate-800 print:text-black whitespace-nowrap">{student.name}</td>
                              {assessmentColumns.map((col, cIdx) => (
                                <td key={col.id || cIdx} className="border border-black px-1.5 py-0.5 text-center select-none">
                                  <span className="text-[10px] text-slate-300 print:text-black opacity-60">________________</span>
                                </td>
                              ))}
                            </tr>
                          ))}
                          {/* Dynamic blank rows on last page */}
                          {Array.from({ length: chunk.blankRowsCount }).map((_, bIdx) => (
                            <tr key={`blank_${bIdx}`} className="print:hover:bg-transparent">
                              <td className="border border-black px-1.5 py-0.5 text-center text-slate-800 print:text-black font-semibold">&nbsp;</td>
                              <td className="border border-black px-2 py-0.5 text-left font-bold text-slate-800 print:text-black whitespace-nowrap">&nbsp;</td>
                              {assessmentColumns.map((col, cIdx) => (
                                <td key={`blank_col_${cIdx}`} className="border border-black px-1.5 py-0.5 text-center select-none">
                                  <span className="text-[10px] text-slate-300 print:text-black opacity-60">________________</span>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Footer */}
                    <div 
                      className="mt-4 pt-3 border-t border-black text-[10px] font-bold text-slate-900 print:text-black"
                      style={{ pageBreakInside: 'avoid', breakInside: 'avoid', width: '100%' }}
                    >
                      <div className="grid grid-cols-3 gap-4 mb-2">
                        <span>Total Students : __________</span>
                        <span className="text-center">Present : __________</span>
                        <span className="text-right">Absent : __________</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <span>Invigilator 1 : _____________________</span>
                        <span className="text-center">Invigilator 2 : _____________________</span>
                        <span className="text-right">Checked By : _____________________</span>
                      </div>
                      <div className="flex justify-between items-center text-[8px] text-slate-500 print:text-black font-medium whitespace-nowrap">
                        <span>Generated on: {getFormattedDate()}</span>
                        <span>Page {pageIdx + 1} of {studentChunks.length}</span>
                      </div>
                    </div>

                    </div> {/* end content wrapper */}

                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* SAVED TEMPLATES (full width below preview) - HIDDEN - now in dropdown */}
        {/* <div className="w-full bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3 no-print max-w-5xl mx-auto">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
            <FolderOpen className="h-4 w-4 text-slate-500" />
            Saved Templates
          </h3>
          
          {savedSheets.length === 0 ? (
            <p className="text-[11px] text-slate-400 text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              No templates saved yet. Configure and save to store.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {savedSheets.map((sheet) => (
                <div 
                  key={sheet.id} 
                  onClick={() => handleLoadSheet(sheet)}
                  className={`flex items-center justify-between p-2.5 bg-slate-50/50 hover:bg-slate-50 border cursor-pointer rounded-lg transition-all group ${currentSheetId === sheet.id ? 'bg-indigo-50/50 border-indigo-200 text-indigo-700 font-semibold' : 'border-slate-200/80 text-slate-600'}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-700 truncate">{sheet.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                      Class: {activeClasses.find(c => c._id === sheet.classId)?.className || 'Unknown'} &bull; Columns: {sheet.columns.length}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={(e) => handleDeleteSheet(sheet.id, e)}
                    className="h-7 w-7 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div> */}

      </div>
    </div>
  );
}
