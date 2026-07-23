import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  Calendar,
  Search,
  RotateCcw,
  Save,
  Trash2,
  Lock,
  Plus,
  Info,
  Check,
  Grid,
  HelpCircle,
  FileText,
  Download,
  Printer,
  Edit2,
  X,
  Copy,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clipboard
} from 'lucide-react';
import api from '@/lib/api';
import { formatClassName } from '@/lib/utils';
import { PageHeader, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/DatePicker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter
} from '@/components/ui/dialog';

// Import Reusable Sub-components & Exporters
import PlannerLibrary from '@/components/planner/PlannerLibrary';
import { exportPlannerToPDF } from '@/components/planner/PlannerPDFExporter';
import { exportPlannerToExcel } from '@/components/planner/PlannerExcelExporter';

// Color system configuration for subjects
const SUBJECT_COLORS = {
  'Maths': { bg: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-500' },
  'Science': { bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
  'English': { bg: 'bg-orange-100 text-orange-800 border-orange-200', dot: 'bg-orange-500' },
  'Hindi': { bg: 'bg-rose-100 text-rose-800 border-rose-200', dot: 'bg-rose-500' },
  'Computer': { bg: 'bg-purple-100 text-purple-800 border-purple-200', dot: 'bg-purple-500' },
  'SST': { bg: 'bg-teal-100 text-teal-800 border-teal-200', dot: 'bg-teal-500' },
  'GK': { bg: 'bg-pink-100 text-pink-800 border-pink-200', dot: 'bg-pink-500' },
  'No Test': { bg: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' }
};

const DEFAULT_CLASSES = [
  { id: 'nursery-a', name: 'Nursery-A' },
  { id: 'lkg-a', name: 'LKG-A' },
  { id: 'ukg-a', name: 'UKG-A' },
  { id: '1-a', name: '1-A' },
  { id: '2-a', name: '2-A' },
  { id: '3-a', name: '3-A' },
  { id: '4-a', name: '4-A' },
  { id: '5-a', name: '5-A' },
  { id: '6-a', name: '6-A' },
  { id: '7-a', name: '7-A' }
];

const WEEK_DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

const INITIAL_PLANNERS = [
  {
    id: 'august-daily-test',
    name: 'August Daily Test',
    assessmentType: 'Daily Test',
    selectedMainExam: '',
    classes: ['5-a', '6-a', '7-a'],
    startDate: '2026-08-01',
    endDate: '2026-08-14',
    status: 'Draft',
    createdBy: 'School Admin',
    createdDate: '2026-07-22',
    updatedDate: '2026-07-23',
    gridData: {
      '2026-08-03_5-a': { subject: 'Maths', notes: 'Chapter 1 revision' },
      '2026-08-03_6-a': { subject: 'Science', notes: 'Practical preparation' },
      '2026-08-05_5-a': { subject: 'English', notes: 'Spelling Bee test' },
      '2026-08-06_7-a': { subject: 'Hindi', notes: 'Oral session' },
    },
    skipDays: [0],
    skipSpecificDates: ['2026-08-15'],
  },
  {
    id: 'pa-1-planner',
    name: 'PA-1 Planner',
    assessmentType: 'Main Exam',
    selectedMainExam: 'PA-1',
    classes: ['5-a', '6-a', '7-a'],
    startDate: '2026-07-20',
    endDate: '2026-07-28',
    status: 'Published',
    createdBy: 'School Admin',
    createdDate: '2026-07-20',
    updatedDate: '2026-07-22',
    gridData: {
      '2026-07-20_5-a': { subject: 'Maths', notes: 'PA-1 Main Exam' },
      '2026-07-20_6-a': { subject: 'Science', notes: 'PA-1 Main Exam' },
      '2026-07-21_7-a': { subject: 'English', notes: 'Syllabus check' },
    },
    skipDays: [0],
    skipSpecificDates: [],
  }
];

const getClassFallbackSubjects = (className) => {
  const name = String(className || '').toUpperCase();
  if (name.includes('NURSERY') || name.includes('LKG') || name.includes('UKG') || name.includes('PREP')) {
    return ['Maths', 'English', 'Hindi', 'GK', 'No Test'];
  }
  if (name.includes('11') || name.includes('12')) {
    if (name.includes('COMMERCE') || name.includes('CO')) {
      return ['Accounts', 'Business Studies', 'Economics', 'English', 'No Test'];
    }
    if (name.includes('ARTS') || name.includes('HUMANITIES')) {
      return ['History', 'Geography', 'Political Science', 'English', 'No Test'];
    }
    return ['Physics', 'Chemistry', 'Biology', 'Maths', 'English', 'Computer', 'No Test'];
  }
  return ['Maths', 'Science', 'English', 'Hindi', 'Computer', 'SST', 'GK', 'No Test'];
};

export default function AssessmentPlanner() {
  // Library State
  const [planners, setPlanners] = useState(() => {
    const local = localStorage.getItem('testmaster_assessment_planners');
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        console.error('Failed to parse planners from localStorage, using mock data:', e);
      }
    }
    return INITIAL_PLANNERS;
  });

  // Active workspace metadata properties
  const [currentPlannerId, setCurrentPlannerId] = useState(null);
  const [plannerName, setPlannerName] = useState('');
  const [plannerStatus, setPlannerStatus] = useState('Draft');

  // Config & Selection state
  const [assessmentType, setAssessmentType] = useState('Daily Test');
  const [mainExamSessions, setMainExamSessions] = useState([]);
  const [selectedMainExam, setSelectedMainExam] = useState('');
  const [loadingExams, setLoadingExams] = useState(false);
  const [availableClasses, setAvailableClasses] = useState(DEFAULT_CLASSES);
  const [selectedClasses, setSelectedClasses] = useState(['5-a', '6-a', '7-a']);
  
  // Date pickers for generation
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [endDate, setEndDate] = useState(() => {
    const target = new Date();
    target.setDate(target.getDate() + 14); // 2 weeks default
    const y = target.getFullYear();
    const m = String(target.getMonth() + 1).padStart(2, '0');
    const d = String(target.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  
  const [skipDays, setSkipDays] = useState([0]); // Default skip Sundays
  const [skipSpecificDateInput, setSkipSpecificDateInput] = useState('');
  const [skipSpecificDates, setSkipSpecificDates] = useState([]);
  
  // Generating state
  const [isGenerated, setIsGenerated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Dynamic Workspace Grid Layout States
  const [datesList, setDatesList] = useState([]);
  const [selectedClassesList, setSelectedClassesList] = useState([]);
  const [gridData, setGridData] = useState({}); // Key: "dateString_classId" => { subject, notes }
  const [savedGridData, setSavedGridData] = useState({}); // For draft check & discard
  
  // Toolbar filters
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightToday, setHighlightToday] = useState(false);
  
  // Dialog / Edit Cell variables
  const [editingCell, setEditingCell] = useState(null); // { date, classItem }
  const [cellSubject, setCellSubject] = useState('Maths');
  const [cellNotes, setCellNotes] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [classSubjects, setClassSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // Modal Dialogue control states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [plannerToDelete, setPlannerToDelete] = useState(null);

  const [editDetailsDialogOpen, setEditDetailsDialogOpen] = useState(false);
  const [addClassDialogOpen, setAddClassDialogOpen] = useState(false);
  const [addDateDialogOpen, setAddDateDialogOpen] = useState(false);
  const [renameDateDialogOpen, setRenameDateDialogOpen] = useState(false);
  const [skipDatesDialogOpen, setSkipDatesDialogOpen] = useState(false);

  // Sub-selector target references
  const [newDateValue, setNewDateValue] = useState('');
  const [renamedDateValue, setRenamedDateValue] = useState('');
  const [dateToRename, setDateToRename] = useState(null);
  const [classToSelectState, setClassToSelectState] = useState([]);

  // Temp holder details for edit dialog
  const [tempPlannerName, setTempPlannerName] = useState('');
  const [tempPlannerStatus, setTempPlannerStatus] = useState('Draft');
  const [tempAssessmentType, setTempAssessmentType] = useState('Daily Test');
  const [tempMainExam, setTempMainExam] = useState('');

  // ==========================================
  // NEW INTERACTIVE SPREADSHEET STATES
  // ==========================================
  const [contextMenu, setContextMenu] = useState(null); // { x, y, type: 'date'|'class', target: dateStr|classId }
  const [insertIndex, setInsertIndex] = useState(null); // position to insert new row/column
  const [duplicatingClassId, setDuplicatingClassId] = useState(null);
  const [duplicatingDateStr, setDuplicatingDateStr] = useState(null);

  // Inline Double-Click Editor States
  const [editingPlannerName, setEditingPlannerName] = useState(false);
  const [editingClassId, setEditingClassId] = useState(null);

  // Copy / Paste Selection States
  const [selectedCellKey, setSelectedCellKey] = useState(null); // "dateStr_classId"
  const [copiedCellData, setCopiedCellData] = useState(null); // { subject, notes }

  // Drag and Drop drag indices
  const [draggedRowIndex, setDraggedRowIndex] = useState(null);
  const [draggedColIndex, setDraggedColIndex] = useState(null);

  const todayStr = useRef(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }).current();

  // Sync planners to LocalStorage
  useEffect(() => {
    localStorage.setItem('testmaster_assessment_planners', JSON.stringify(planners));
  }, [planners]);

  // Load Classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get('/classes');
        if (res.data && res.data.classes && res.data.classes.length > 0) {
          const formatted = res.data.classes.map(c => ({
            id: c._id || `${c.className}-${c.section}`.toLowerCase(),
            name: `${formatClassName(c.className)}-${c.section}`
          }));
          setAvailableClasses(formatted);
          // Set standard defaults if found
          const defaults = formatted.filter(f => ['5-A', '6-A', '7-A', '5-a', '6-a', '7-a'].some(term => f.name.toLowerCase() === term.toLowerCase()));
          if (defaults.length > 0) {
            setSelectedClasses(defaults.map(d => d.id));
          } else {
            setSelectedClasses(formatted.slice(0, 3).map(f => f.id));
          }
        }
      } catch (err) {
        console.warn('API error fetching classes, using local fallback.', err);
        setAvailableClasses(DEFAULT_CLASSES);
      }
    };
    fetchClasses();
  }, []);

  // Load Main Exam sessions on mount
  useEffect(() => {
    const fetchMainExams = async () => {
      setLoadingExams(true);
      try {
        const res = await api.get('/results/sessions', { params: { category: 'main' } });
        if (res.data && res.data.sessions) {
          const uniqueTypes = [...new Set(res.data.sessions.map(s => s.examType).filter(Boolean))].sort();
          if (uniqueTypes.length > 0) {
            setMainExamSessions(uniqueTypes);
          } else {
            setMainExamSessions(['PA-1', 'PA-2', 'Half Yearly', 'Annual', 'Mid Term', 'Final']);
          }
        } else {
          setMainExamSessions(['PA-1', 'PA-2', 'Half Yearly', 'Annual', 'Mid Term', 'Final']);
        }
      } catch (err) {
        console.warn('Failed to load main exam sessions from API, using fallback:', err);
        setMainExamSessions(['PA-1', 'PA-2', 'Half Yearly', 'Annual', 'Mid Term', 'Final']);
      } finally {
        setLoadingExams(false);
      }
    };
    fetchMainExams();
  }, []);

  // Keyboard Shortcuts for Cell Copy / Paste / Clear
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedCellKey) return;

      // Ctrl+C or Cmd+C (Copy)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        const data = gridData[selectedCellKey];
        if (data && data.subject) {
          setCopiedCellData(data);
          toast.success(`Copied cell data: ${data.subject}`);
        } else {
          toast.info('Selected cell is empty.');
        }
      }

      // Ctrl+V or Cmd+V (Paste)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (!copiedCellData) {
          toast.info('No copied data to paste.');
          return;
        }

        if (plannerStatus === 'Published') {
          toast.error('Published Planner is Read-Only');
          return;
        }

        setGridData(prev => ({
          ...prev,
          [selectedCellKey]: { ...copiedCellData }
        }));
        toast.success(`Pasted subject: ${copiedCellData.subject}`);
      }

      // Delete or Backspace (Clear Cell)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (plannerStatus === 'Published') {
          toast.error('Published Planner is Read-Only');
          return;
        }

        if (gridData[selectedCellKey]) {
          setGridData(prev => {
            const updated = { ...prev };
            delete updated[selectedCellKey];
            return updated;
          });
          toast.info('Cell data cleared.');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCellKey, copiedCellData, gridData, plannerStatus]);

  // Close context menu on global window clicks
  useEffect(() => {
    const handleWindowClick = () => {
      setContextMenu(null);
    };
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  // Format Helper for specific dates display
  const formatDateLabel = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    const dateObj = new Date(year, month - 1, day);
    return dateObj.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
  };

  // Excluded holidays configurations
  const handleAddSkipDate = (dateStr) => {
    if (!dateStr) return;
    if (skipSpecificDates.includes(dateStr)) {
      toast.info('Date already excluded');
      return;
    }
    setSkipSpecificDates([...skipSpecificDates, dateStr]);
    setSkipSpecificDateInput('');
  };

  const handleRemoveSkipDate = (dateToRemove) => {
    setSkipSpecificDates(skipSpecificDates.filter(d => d !== dateToRemove));
  };

  const handleToggleSkipDay = (dayValue) => {
    if (skipDays.includes(dayValue)) {
      setSkipDays(skipDays.filter(d => d !== dayValue));
    } else {
      setSkipDays([...skipDays, dayValue]);
    }
  };

  // Class checklist multi selection
  const handleToggleClass = (classId) => {
    if (selectedClasses.includes(classId)) {
      setSelectedClasses(selectedClasses.filter(id => id !== classId));
    } else {
      setSelectedClasses([...selectedClasses, classId]);
    }
  };

  const handleSelectAllClasses = () => {
    if (selectedClasses.length === availableClasses.length) {
      setSelectedClasses([]);
    } else {
      setSelectedClasses(availableClasses.map(c => c.id));
    }
  };

  // Generator trigger
  const handleGeneratePlanner = () => {
    if (!startDate || !endDate) {
      toast.error('Please configure both Start Date and End Date.');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      toast.error('End Date cannot be before Start Date.');
      return;
    }

    const tempDates = [];
    let current = new Date(start);
    const limit = new Date(start);
    limit.setMonth(limit.getMonth() + 3);

    while (current <= end && current <= limit) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const dayOfWeek = current.getDay();

      const isHoliday = skipDays.includes(dayOfWeek) || skipSpecificDates.includes(dateStr);

      tempDates.push({
        dateStr,
        dayOfWeek,
        isHoliday,
        label: `${current.getDate()} ${current.toLocaleDateString('en-US', { month: 'short' })}`,
        dayName: current.toLocaleDateString('en-US', { weekday: 'long' }),
        formattedYear: year
      });

      current.setDate(current.getDate() + 1);
    }

    const classesItems = availableClasses.filter(c => selectedClasses.includes(c.id));
    if (classesItems.length === 0) {
      toast.error('Please select at least one class to generate planner.');
      return;
    }

    setIsLoading(true);
    
    setTimeout(() => {
      setDatesList(tempDates);
      setSelectedClassesList(classesItems);
      setIsGenerated(true);
      setIsLoading(false);
      
      const initialGrid = {};
      setGridData(initialGrid);
      setSavedGridData(initialGrid);
      
      if (!plannerName.trim()) {
        const typeStr = assessmentType === 'Main Exam' ? `${assessmentType} (${selectedMainExam})` : assessmentType;
        setPlannerName(`${typeStr} - ${tempDates[0]?.label}`);
      }
      
      toast.success(`Planning spreadsheet successfully generated.`);
    }, 600);
  };

  // Dynamic class subject fetcher
  const fetchSubjectsForClass = async (classId, className) => {
    setLoadingSubjects(true);
    try {
      const res = await api.get('/subjects', { params: { classId } });
      if (res.data && res.data.subjects && res.data.subjects.length > 0) {
        setClassSubjects(res.data.subjects);
      } else {
        setClassSubjects(getClassFallbackSubjects(className));
      }
    } catch (err) {
      console.warn('Failed to load class subjects from API, using fallback:', err);
      setClassSubjects(getClassFallbackSubjects(className));
    } finally {
      setLoadingSubjects(false);
    }
  };

  // Cell clicks
  const handleCellClick = (dateItem, classItem) => {
    if (dateItem.isHoliday) {
      toast.error('Holiday - Not Editable');
      return;
    }

    const cellKey = `${dateItem.dateStr}_${classItem.id}`;
    setSelectedCellKey(cellKey);

    if (plannerStatus === 'Published') {
      toast.error('Published Planner Is Read Only', {
        icon: <Lock className="h-4 w-4 text-rose-500" />
      });
      return;
    }

    setEditingCell({ date: dateItem, classItem });
    const existing = gridData[cellKey];
    
    const defaultSubjectsList = getClassFallbackSubjects(classItem.name);
    setCellSubject(existing?.subject || defaultSubjectsList[0] || 'Maths');
    setCellNotes(existing?.notes || '');
    
    fetchSubjectsForClass(classItem.id, classItem.name);
    setDialogOpen(true);
  };

  const handleSaveCell = () => {
    if (!editingCell || !editingCell.date || !editingCell.classItem) {
      console.error('Save failed: editingCell state is null or incomplete');
      return;
    }
    
    try {
      const cellKey = `${editingCell.date.dateStr}_${editingCell.classItem.id}`;
      
      setGridData(prev => {
        const updated = { ...prev };
        updated[cellKey] = {
          subject: cellSubject,
          notes: cellNotes
        };
        return updated;
      });
      
      toast.success(`Scheduled ${cellSubject} for ${editingCell.classItem.name}`);
      setDialogOpen(false);
      setEditingCell(null);
    } catch (err) {
      console.error('Error saving cell planning details:', err);
      toast.error('Failed to save assessment details');
    }
  };

  const handleSaveAllPlanner = () => {
    if (!plannerName.trim()) {
      toast.error('Please enter a name for this planner before saving.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const todayString = new Date().toISOString().split('T')[0];

      if (currentPlannerId) {
        setPlanners(prev => prev.map(p => {
          if (p.id === currentPlannerId) {
            return {
              ...p,
              name: plannerName,
              status: plannerStatus,
              assessmentType,
              selectedMainExam,
              classes: selectedClasses,
              startDate: datesList[0]?.dateStr || startDate,
              endDate: datesList[datesList.length - 1]?.dateStr || endDate,
              gridData,
              skipDays,
              skipSpecificDates,
              updatedDate: todayString
            };
          }
          return p;
        }));
        toast.success(`Planner "${plannerName}" updated successfully!`);
      } else {
        if (planners.length >= 5) {
          toast.error('Maximum limit of 5 planners reached. Delete one to save a new planner.');
          setIsLoading(false);
          return;
        }

        const newId = `planner_${Date.now()}`;
        const newPlannerObj = {
          id: newId,
          name: plannerName,
          status: plannerStatus,
          assessmentType,
          selectedMainExam,
          classes: selectedClasses,
          startDate: datesList[0]?.dateStr || startDate,
          endDate: datesList[datesList.length - 1]?.dateStr || endDate,
          createdBy: 'School Admin',
          createdDate: todayString,
          updatedDate: todayString,
          gridData,
          skipDays,
          skipSpecificDates
        };

        setPlanners(prev => [...prev, newPlannerObj]);
        setCurrentPlannerId(newId);
        toast.success(`Planner "${plannerName}" saved to library as ${plannerStatus}.`);
      }

      setSavedGridData(gridData);
      setIsLoading(false);
    }, 800);
  };

  const handleDiscardChanges = () => {
    setGridData(savedGridData);
    toast.info('Changes discarded.');
  };

  const handleResetPlanner = () => {
    setGridData({});
    setSavedGridData({});
    setIsGenerated(false);
    setCurrentPlannerId(null);
    setPlannerName('');
    setPlannerStatus('Draft');
    toast.success('Workspace cleared.');
  };

  // Load from library card
  const handleEditPlannerFromLibrary = (planner) => {
    setIsLoading(true);
    setTimeout(() => {
      setCurrentPlannerId(planner.id);
      setPlannerName(planner.name);
      setPlannerStatus(planner.status || 'Draft');
      setAssessmentType(planner.assessmentType);
      setSelectedMainExam(planner.selectedMainExam || '');
      setSelectedClasses(planner.classes || []);
      setStartDate(planner.startDate);
      setEndDate(planner.endDate);
      setSkipDays(planner.skipDays || []);
      setSkipSpecificDates(planner.skipSpecificDates || []);
      setGridData(planner.gridData || {});
      setSavedGridData(planner.gridData || {});
      
      const start = new Date(planner.startDate);
      const end = new Date(planner.endDate);
      const tempDates = [];
      let current = new Date(start);
      const limit = new Date(start);
      limit.setMonth(limit.getMonth() + 3);

      while (current <= end && current <= limit) {
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        const day = String(current.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const dayOfWeek = current.getDay();

        const isHoliday = (planner.skipDays || []).includes(dayOfWeek) || (planner.skipSpecificDates || []).includes(dateStr);

        tempDates.push({
          dateStr,
          dayOfWeek,
          isHoliday,
          label: `${current.getDate()} ${current.toLocaleDateString('en-US', { month: 'short' })}`,
          dayName: current.toLocaleDateString('en-US', { weekday: 'long' }),
          formattedYear: year
        });
        current.setDate(current.getDate() + 1);
      }

      const classesItems = availableClasses.filter(c => (planner.classes || []).includes(c.id));

      setDatesList(tempDates);
      setSelectedClassesList(classesItems);
      setIsGenerated(true);
      setIsLoading(false);
      
      toast.info(`Loaded planner board "${planner.name}"`);
    }, 400);
  };

  const handleDeleteTrigger = (planner) => {
    setPlannerToDelete(planner);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!plannerToDelete) return;
    setPlanners(prev => prev.filter(p => p.id !== plannerToDelete.id));
    
    if (currentPlannerId === plannerToDelete.id) {
      handleResetPlanner();
    }
    
    toast.success(`Planner "${plannerToDelete.name}" deleted successfully.`);
    setDeleteDialogOpen(false);
    setPlannerToDelete(null);
  };

  const handlePrintPlanner = (planner) => {
    if (currentPlannerId !== planner.id) {
      handleEditPlannerFromLibrary(planner);
    }
    setTimeout(() => {
      window.print();
    }, 500);
  };

  // PDF Export loading trigger wrapper
  const handleDownloadPDF = async (plannerObj) => {
    const loadingId = toast.loading('Generating PDF...');
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      
      if (!plannerObj) {
        throw new Error('No planner available to export.');
      }
      
      exportPlannerToPDF(plannerObj, availableClasses);
      toast.dismiss(loadingId);
      toast.success('PDF generated and downloaded successfully.');
    } catch (err) {
      toast.dismiss(loadingId);
      console.error('PDF generation failure:', err);
      toast.error('Unable to generate PDF.', {
        description: err.message || 'Please check your configurations and try again.'
      });
    }
  };

  // Trigger new planner creation
  const handleCreateNewPlanner = () => {
    handleResetPlanner();
    toast.info('Workspace ready for new planning session.');
  };

  // ==========================================
  // SPREADSHEET ROW AND COLUMN CONFIGURATORS
  // ==========================================

  // Shift row up/down
  const handleMoveRow = (index, direction) => {
    if (plannerStatus === 'Published') {
      toast.error('Published Planner is Read-Only');
      return;
    }
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= selectedClassesList.length) return;
    
    setSelectedClassesList(prev => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIdx];
      updated[targetIdx] = temp;
      return updated;
    });
    setSelectedClasses(prev => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIdx];
      updated[targetIdx] = temp;
      return updated;
    });
    toast.success('Row reordered successfully');
  };

  // Shift column left/right
  const handleMoveCol = (index, direction) => {
    if (plannerStatus === 'Published') {
      toast.error('Published Planner is Read-Only');
      return;
    }
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= datesList.length) return;
    
    setDatesList(prev => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIdx];
      updated[targetIdx] = temp;
      return updated;
    });
    toast.success('Column reordered successfully');
  };

  // Add class row trigger
  const handleOpenAddClassDialog = () => {
    if (plannerStatus === 'Published') {
      toast.error('Published Planner is Read-Only');
      return;
    }
    const unselected = availableClasses.filter(c => !selectedClasses.includes(c.id));
    setClassToSelectState(unselected);
    setInsertIndex(null);
    setDuplicatingClassId(null);
    setAddClassDialogOpen(true);
  };

  const handleInsertClassAt = (index) => {
    if (plannerStatus === 'Published') {
      toast.error('Published Planner is Read-Only');
      return;
    }
    const unselected = availableClasses.filter(c => !selectedClasses.includes(c.id));
    setClassToSelectState(unselected);
    setInsertIndex(index);
    setDuplicatingClassId(null);
    setAddClassDialogOpen(true);
  };

  const handleDuplicateClass = (classId) => {
    if (plannerStatus === 'Published') {
      toast.error('Published Planner is Read-Only');
      return;
    }
    const unselected = availableClasses.filter(c => !selectedClasses.includes(c.id));
    setClassToSelectState(unselected);
    const targetIndex = selectedClassesList.findIndex(c => c.id === classId);
    setInsertIndex(targetIndex + 1);
    setDuplicatingClassId(classId);
    setAddClassDialogOpen(true);
    toast.info('Select the class target to duplicate schedules into.');
  };

  const handleAddClassRowConfirm = (classId) => {
    const clsObj = availableClasses.find(c => c.id === classId);
    if (!clsObj) return;

    setSelectedClassesList(prev => {
      const updated = [...prev];
      if (insertIndex !== null) {
        updated.splice(insertIndex, 0, clsObj);
      } else {
        updated.push(clsObj);
      }
      return updated;
    });

    setSelectedClasses(prev => {
      const updated = [...prev];
      if (insertIndex !== null) {
        updated.splice(insertIndex, 0, classId);
      } else {
        updated.push(classId);
      }
      return updated;
    });

    // Copy schedules if duplicating
    if (duplicatingClassId) {
      setGridData(prev => {
        const updated = { ...prev };
        datesList.forEach(dt => {
          const oldKey = `${dt.dateStr}_${duplicatingClassId}`;
          const newKey = `${dt.dateStr}_${classId}`;
          if (updated[oldKey]) {
            updated[newKey] = { ...updated[oldKey] };
          }
        });
        return updated;
      });
      setDuplicatingClassId(null);
      toast.success(`Duplicated class schedules successfully into ${clsObj.name}`);
    } else {
      toast.success(`Appended class row: ${clsObj.name}`);
    }

    setAddClassDialogOpen(false);
    setInsertIndex(null);
  };

  const handleDeleteClass = (classId) => {
    if (plannerStatus === 'Published') {
      toast.error('Published Planner is Read-Only');
      return;
    }
    setSelectedClassesList(prev => prev.filter(c => c.id !== classId));
    setSelectedClasses(prev => prev.filter(id => id !== classId));
    toast.success('Class row removed from worksheet.');
  };

  // Add Date Column triggers
  const handleOpenAddDateDialog = () => {
    if (plannerStatus === 'Published') {
      toast.error('Published Planner is Read-Only');
      return;
    }
    setInsertIndex(null);
    setDuplicatingDateStr(null);
    setAddDateDialogOpen(true);
  };

  const handleInsertDateAt = (index) => {
    if (plannerStatus === 'Published') {
      toast.error('Published Planner is Read-Only');
      return;
    }
    setInsertIndex(index);
    setDuplicatingDateStr(null);
    setAddDateDialogOpen(true);
  };

  const handleDuplicateDate = (dateStr) => {
    if (plannerStatus === 'Published') {
      toast.error('Published Planner is Read-Only');
      return;
    }
    const targetIndex = datesList.findIndex(d => d.dateStr === dateStr);
    setInsertIndex(targetIndex + 1);
    setDuplicatingDateStr(dateStr);
    setAddDateDialogOpen(true);
    toast.info('Choose the date target to duplicate column schedules into.');
  };

  const handleAddDateConfirm = () => {
    if (!newDateValue) {
      toast.error('Please choose a valid date.');
      return;
    }

    if (datesList.some(d => d.dateStr === newDateValue)) {
      toast.error('This date is already present in the planner.');
      return;
    }

    const dateObj = new Date(newDateValue);
    const dateItem = {
      dateStr: newDateValue,
      dayOfWeek: dateObj.getDay(),
      isHoliday: skipDays.includes(dateObj.getDay()) || skipSpecificDates.includes(newDateValue),
      label: `${dateObj.getDate()} ${dateObj.toLocaleDateString('en-US', { month: 'short' })}`,
      dayName: dateObj.toLocaleDateString('en-US', { weekday: 'long' }),
      formattedYear: dateObj.getFullYear()
    };

    setDatesList(prev => {
      const updated = [...prev];
      if (insertIndex !== null) {
        updated.splice(insertIndex, 0, dateItem);
      } else {
        updated.push(dateItem);
      }
      return updated;
    });

    // Copy schedules if duplicating
    if (duplicatingDateStr) {
      setGridData(prev => {
        const updated = { ...prev };
        selectedClassesList.forEach(cls => {
          const oldKey = `${duplicatingDateStr}_${cls.id}`;
          const newKey = `${newDateValue}_${cls.id}`;
          if (updated[oldKey]) {
            updated[newKey] = { ...updated[oldKey] };
          }
        });
        return updated;
      });
      setDuplicatingDateStr(null);
      toast.success(`Duplicated date schedules successfully into ${dateItem.label}`);
    } else {
      toast.success(`Added date column: ${dateItem.label}`);
    }

    setAddDateDialogOpen(false);
    setInsertIndex(null);
    setNewDateValue('');
  };

  const handleDeleteDate = (dateStr) => {
    if (plannerStatus === 'Published') {
      toast.error('Published Planner is Read-Only');
      return;
    }
    setDatesList(prev => prev.filter(d => d.dateStr !== dateStr));
    toast.success(`Date column removed: ${formatDateLabel(dateStr)}`);
  };

  // Date Renaming trigger
  const handleRenameTrigger = (dtItem) => {
    if (plannerStatus === 'Published') {
      toast.error('Published Planner is Read-Only');
      return;
    }
    setDateToRename(dtItem);
    setRenamedDateValue(dtItem.dateStr);
    setRenameDateDialogOpen(true);
  };

  const handleRenameDateConfirm = () => {
    if (!renamedDateValue) return;
    if (renamedDateValue === dateToRename.dateStr) {
      setRenameDateDialogOpen(false);
      return;
    }

    if (datesList.some(d => d.dateStr === renamedDateValue)) {
      toast.error('This date is already present in another column.');
      return;
    }

    const dateObj = new Date(renamedDateValue);
    const renamedItem = {
      dateStr: renamedDateValue,
      dayOfWeek: dateObj.getDay(),
      isHoliday: skipDays.includes(dateObj.getDay()) || skipSpecificDates.includes(renamedDateValue),
      label: `${dateObj.getDate()} ${dateObj.toLocaleDateString('en-US', { month: 'short' })}`,
      dayName: dateObj.toLocaleDateString('en-US', { weekday: 'long' }),
      formattedYear: dateObj.getFullYear()
    };

    setDatesList(prev => prev.map(d => d.dateStr === dateToRename.dateStr ? renamedItem : d));

    setGridData(prev => {
      const updated = { ...prev };
      selectedClassesList.forEach(cls => {
        const oldKey = `${dateToRename.dateStr}_${cls.id}`;
        const newKey = `${renamedDateValue}_${cls.id}`;
        if (updated[oldKey]) {
          updated[newKey] = updated[oldKey];
          delete updated[oldKey];
        }
      });
      return updated;
    });

    setRenameDateDialogOpen(false);
    setDateToRename(null);
    toast.success(`Date column renamed to ${renamedItem.label}`);
  };

  const handleRenameClass = (classId, newName) => {
    setSelectedClassesList(prev => prev.map(c => c.id === classId ? { ...c, name: newName } : c));
  };

  // Header Details modal edit
  const handleOpenEditDetailsDialog = () => {
    setTempPlannerName(plannerName);
    setTempPlannerStatus(plannerStatus);
    setTempAssessmentType(assessmentType);
    setTempMainExam(selectedMainExam);
    setEditDetailsDialogOpen(true);
  };

  const handleSaveDetailsConfirm = () => {
    if (!tempPlannerName.trim()) {
      toast.error('Planner name cannot be blank.');
      return;
    }
    setPlannerName(tempPlannerName);
    setPlannerStatus(tempPlannerStatus);
    setAssessmentType(tempAssessmentType);
    setSelectedMainExam(tempMainExam);
    setEditDetailsDialogOpen(false);
    toast.success('Planner details updated successfully.');
  };

  // Apply Skip dates to layout
  const handleSaveSkipDatesConfirm = () => {
    setDatesList(prev => prev.map(d => {
      const isHoliday = skipDays.includes(d.dayOfWeek) || skipSpecificDates.includes(d.dateStr);
      return { ...d, isHoliday };
    }));
    setSkipDatesDialogOpen(false);
    toast.success('Skip settings applied to workspace grid.');
  };

  // HTML5 Native Drag & Drop operations
  const handleRowDragStart = (e, index) => {
    if (plannerStatus === 'Published') {
      e.preventDefault();
      return;
    }
    setDraggedRowIndex(index);
  };

  const handleRowDrop = (dropIndex) => {
    if (draggedRowIndex === null || draggedRowIndex === dropIndex) return;

    setSelectedClassesList(prev => {
      const updated = [...prev];
      const draggedItem = updated[draggedRowIndex];
      updated.splice(draggedRowIndex, 1);
      updated.splice(dropIndex, 0, draggedItem);
      return updated;
    });

    setSelectedClasses(prev => {
      const updated = [...prev];
      const draggedId = updated[draggedRowIndex];
      updated.splice(draggedRowIndex, 1);
      updated.splice(dropIndex, 0, draggedId);
      return updated;
    });

    setDraggedRowIndex(null);
    toast.success('Row reordered');
  };

  const handleRowDragOver = (e) => {
    e.preventDefault();
  };

  const handleColDragOver = (e) => {
    e.preventDefault();
  };

  const handleColDragStart = (e, index) => {
    if (plannerStatus === 'Published') {
      e.preventDefault();
      return;
    }
    setDraggedColIndex(index);
  };

  const handleColDrop = (dropIndex) => {
    if (draggedColIndex === null || draggedColIndex === dropIndex) return;

    setDatesList(prev => {
      const updated = [...prev];
      const draggedItem = updated[draggedColIndex];
      updated.splice(draggedColIndex, 1);
      updated.splice(dropIndex, 0, draggedItem);
      return updated;
    });

    setDraggedColIndex(null);
    toast.success('Column reordered');
  };

  // Right-Click Context Menu Trigger
  const handleRightClick = (e, type, target) => {
    e.preventDefault();
    if (plannerStatus === 'Published') return;
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      type,
      target
    });
  };

  const filteredClassesList = selectedClassesList.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const safeDatesList = Array.isArray(datesList) ? datesList : [];

  return (
    <PageStack className="max-w-full overflow-x-hidden p-1 sm:p-2">
      {/* Dynamic Printing CSS override */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #print-friendly-area, #print-friendly-area * {
            visibility: visible;
          }
          #print-friendly-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          header, aside, .no-print, button, select, input, .Sonner {
            display: none !important;
            height: 0 !important;
            width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}} />

      {/* PLANNER LIBRARY SECTION */}
      <div className="no-print">
        <PlannerLibrary
          planners={planners}
          onEdit={handleEditPlannerFromLibrary}
          onDelete={handleDeleteTrigger}
          onDownloadPDF={handleDownloadPDF}
          onDownloadExcel={(p) => exportPlannerToExcel(p, availableClasses)}
          onPrint={handlePrintPlanner}
          onNewPlanner={handleCreateNewPlanner}
        />
      </div>

      {/* WORKSPACE SEPARATOR */}
      <div className="border-t border-slate-200/80 my-4 no-print" />

      {/* CONFIGURATION SETUP CARD (Before Generation) */}
      {!isGenerated && !isLoading && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm shadow-slate-100 overflow-hidden transition-all duration-300 no-print">
          <div className="bg-gradient-to-r from-indigo-50/70 via-indigo-50/20 to-transparent border-b border-slate-100 px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                <Grid className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">1. Planner Configuration</h2>
                <p className="text-xs text-slate-500">Configure parameters to generate your spreadsheet layout</p>
              </div>
            </div>
            <div className="hidden sm:inline-flex items-center rounded-full bg-indigo-50 border border-indigo-100/50 px-3 py-1 text-xs font-semibold text-indigo-700">
              🛠️ Setup Mode
            </div>
          </div>

          <div className="p-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Type, Name and Datepicker Row */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Planner Name</label>
                    <Input
                      value={plannerName}
                      onChange={(e) => setPlannerName(e.target.value)}
                      placeholder="e.g. August Board"
                      className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
                    <select
                      value={plannerStatus}
                      onChange={(e) => setPlannerStatus(e.target.value)}
                      className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 hover:border-slate-300"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Published">Published</option>
                      <option value="Archived">Archived</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Assessment Type</label>
                  <select
                    value={assessmentType}
                    onChange={(e) => {
                      setAssessmentType(e.target.value);
                      if (e.target.value !== 'Main Exam') {
                        setSelectedMainExam('');
                      }
                    }}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 hover:border-slate-300"
                  >
                    <option value="Daily Test">Daily Test</option>
                    <option value="Main Exam">Main Exam</option>
                  </select>
                </div>

                {assessmentType === 'Main Exam' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Main Exam</label>
                    <select
                      value={selectedMainExam}
                      onChange={(e) => setSelectedMainExam(e.target.value)}
                      className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 hover:border-slate-300"
                    >
                      <option value="">Select Main Exam Session...</option>
                      {mainExamSessions.map((exam) => (
                        <option key={exam} value={exam}>{exam}</option>
                      ))}
                    </select>
                    {selectedMainExam === '' && (
                      <p className="text-xs text-rose-500 mt-1.5 flex items-center gap-1 font-medium">
                        ⚠️ Please select a Main Exam before generating the planner.
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Start Date</label>
                    <DatePicker
                      value={startDate}
                      onChange={setStartDate}
                      placeholder="DD/MM/YYYY"
                      className="w-full h-11 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">End Date</label>
                    <DatePicker
                      value={endDate}
                      onChange={setEndDate}
                      placeholder="DD/MM/YYYY"
                      className="w-full h-11 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Class Checklist */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700">Class Selection</label>
                  <button
                    type="button"
                    onClick={handleSelectAllClasses}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer animate-none"
                  >
                    {selectedClasses.length === availableClasses.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="border border-slate-200 rounded-2xl bg-slate-50/50 p-4 max-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                    {availableClasses.map((cls) => {
                      if (!cls || !cls.id) return null;
                      const isChecked = selectedClasses.includes(cls.id);
                      return (
                        <label
                          key={cls.id}
                          className={`flex items-center gap-2.5 cursor-pointer text-sm font-medium transition-colors select-none ${
                            isChecked ? 'text-indigo-600 font-semibold' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleClass(cls.id)}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30 cursor-pointer"
                          />
                          <span>{cls.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Exclude/Skip items */}
              <div className="space-y-4 md:col-span-2 lg:col-span-1">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Skip Days (Recurring)</label>
                  <div className="flex flex-wrap gap-2">
                    {WEEK_DAYS.map((day) => {
                      const isSkipped = skipDays.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => handleToggleSkipDay(day.value)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                            isSkipped
                              ? 'bg-red-50 border-red-200 text-red-600'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Skip Specific Dates (Holidays)</label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <DatePicker
                        value={skipSpecificDateInput}
                        onChange={handleAddSkipDate}
                        placeholder="Add date to exclude..."
                        className="w-full h-10 rounded-xl"
                      />
                    </div>
                  </div>
                  
                  {skipSpecificDates.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto p-1 bg-slate-50/70 border border-slate-100 rounded-xl">
                      {skipSpecificDates.map((date) => (
                        <span
                          key={date}
                          className="inline-flex items-center gap-1 bg-red-100/70 text-red-700 px-2 py-0.5 rounded-lg text-xs font-medium border border-red-200/50"
                        >
                          {formatDateLabel(date)}
                          <button
                            type="button"
                            onClick={() => handleRemoveSkipDate(date)}
                            className="hover:bg-red-200 rounded p-0.5 cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-slate-100 flex justify-end">
              <Button
                onClick={handleGeneratePlanner}
                size="lg"
                disabled={assessmentType === 'Main Exam' && selectedMainExam === ''}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-2xl shadow-md shadow-indigo-600/10 font-bold flex items-center gap-2 border-0 cursor-pointer h-12 px-8 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Grid className="h-4.5 w-4.5" />
                {assessmentType === 'Daily Test' ? 'Generate Daily Test Planner' : 'Generate Main Exam Planner'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* COMPACT METADATA SUMMARY CARD (After Generation) */}
      {isGenerated && !isLoading && (
        <div className="bg-white/70 backdrop-blur-md border border-slate-200/50 shadow-lg shadow-indigo-100/30 rounded-3xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 no-print transition-all duration-300">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  {editingPlannerName ? (
                    <Input
                      autoFocus
                      value={plannerName}
                      onChange={(e) => setPlannerName(e.target.value)}
                      onBlur={() => setEditingPlannerName(false)}
                      onKeyDown={(e) => { if (e.key === 'Enter') setEditingPlannerName(false); }}
                      className="h-8 text-xs font-bold w-48 rounded-xl border-indigo-300 focus:ring-indigo-500/25"
                    />
                  ) : (
                    <span 
                      onDoubleClick={() => { if (plannerStatus !== 'Published') setEditingPlannerName(true); }}
                      className="cursor-pointer hover:bg-slate-50 px-1 py-0.5 rounded transition"
                      title="Double click to rename planner inline"
                    >
                      {plannerName || 'Assessment Planner'}
                    </span>
                  )}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                    plannerStatus === 'Published' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : plannerStatus === 'Archived'
                        ? 'bg-slate-100 text-slate-600 border-slate-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {plannerStatus}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">Double-click planner name to edit inline</p>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-150 hidden md:block" />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-xs">
              <div>
                <span className="text-slate-400 font-medium block text-[10px] uppercase tracking-wider">Type</span>
                <span className="font-bold text-slate-700">
                  {assessmentType === 'Main Exam' && selectedMainExam ? `Main Exam (${selectedMainExam})` : assessmentType}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-[10px] uppercase tracking-wider">Classes Count</span>
                <span className="font-bold text-slate-700">{selectedClassesList.length} Classes</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-slate-400 font-medium block text-[10px] uppercase tracking-wider">Date Range</span>
                <span className="font-bold text-slate-700">
                  {datesList.length > 0 
                    ? `${formatDateLabel(datesList[0].dateStr)} - ${formatDateLabel(datesList[datesList.length - 1].dateStr)}`
                    : 'No dates configured'}
                </span>
              </div>
            </div>
          </div>

          <Button
            onClick={handleOpenEditDetailsDialog}
            variant="outline"
            size="sm"
            className="rounded-xl h-9 px-4 border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer shrink-0 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Edit2 className="h-3.5 w-3.5 mr-1.5 text-indigo-500" />
            Edit Details
          </Button>
        </div>
      )}

      {/* SKELETON LOADER ANIMATION */}
      {isLoading && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6 animate-pulse no-print">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="space-y-2">
              <div className="h-7 w-48 bg-slate-100 rounded-lg" />
              <div className="h-4 w-72 bg-slate-50 rounded-md" />
            </div>
            <div className="h-10 w-24 bg-slate-100 rounded-xl" />
          </div>

          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div key={idx} className="grid grid-cols-4 gap-3">
                <div className="h-14 bg-slate-50 rounded-lg" />
                <div className="h-14 bg-slate-50 rounded-lg" />
                <div className="h-14 bg-slate-50 rounded-lg" />
                <div className="h-14 bg-slate-50 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GENERATED PLANNING GRID & TOOLBAR */}
      {isGenerated && !isLoading && (
        <div className="space-y-4" id="print-friendly-area">
          {/* SIMPLIFIED GRID TOOLBAR */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between no-print">
            {/* Left Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={handleOpenAddClassDialog}
                size="sm"
                className="bg-indigo-50 border border-indigo-200/60 text-indigo-700 hover:bg-indigo-100 rounded-xl h-9 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 text-indigo-600" />
                + Class
              </Button>
              <Button
                onClick={handleOpenAddDateDialog}
                size="sm"
                className="bg-indigo-50 border border-indigo-200/60 text-indigo-700 hover:bg-indigo-100 rounded-xl h-9 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 text-indigo-600" />
                + Date
              </Button>
              <Button
                onClick={() => setSkipDatesDialogOpen(true)}
                variant="outline"
                size="sm"
                className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl h-9 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Skip Dates
              </Button>

              <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

              {/* Inline Class Search Filter */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by class..."
                  className="pl-8.5 h-8.5 text-xs rounded-xl bg-slate-50/50 border-slate-200 w-36"
                />
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2 ml-auto sm:ml-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadPDF({
                  name: plannerName || 'Assessment Planner',
                  assessmentType,
                  selectedMainExam,
                  classes: selectedClasses,
                  startDate: datesList[0]?.dateStr,
                  endDate: datesList[datesList.length - 1]?.dateStr,
                  createdBy: 'School Admin',
                  gridData,
                  skipDays,
                  skipSpecificDates,
                  status: plannerStatus
                })}
                className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl h-9 text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <FileText className="h-3.5 w-3.5 text-emerald-500" />
                Download PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl h-9 text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Printer className="h-3.5 w-3.5 text-indigo-500" />
                Print
              </Button>
              <Button
                onClick={handleSaveAllPlanner}
                size="sm"
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl h-9 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/10 hover:scale-[1.02] active:scale-[0.98] transition-all border-0"
              >
                <Save className="h-3.5 w-3.5" />
                Save Planner
              </Button>
            </div>
          </div>

          {/* COMPACT SPREADSHEET GRID */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm shadow-slate-100/50 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50/30 border-b border-slate-100 flex items-center justify-between text-xs font-medium text-slate-400">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 text-[10px] tracking-wide uppercase">
                  {assessmentType === 'Main Exam' ? `Main Exam: ${selectedMainExam}` : assessmentType}
                </span>
                <span>• Classes: {filteredClassesList.length} • Dates: {datesList.length}</span>
                {plannerStatus === 'Published' && (
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 font-bold border border-emerald-100 rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider ml-2">
                    <Lock className="h-2.5 w-2.5" /> Published (Read Only)
                  </span>
                )}
              </div>
              <div className="hidden md:block">
                💡 Double click Class/Name to edit inline • Right-click rows/headers for context menu • Drag to reorder
              </div>
            </div>

            {/* Colors Legend Row in Grid Head */}
            <div className="no-print border-b border-slate-100 px-4 py-2 bg-slate-50/20 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">Legend:</span>
              {Object.entries(SUBJECT_COLORS).map(([sub, meta]) => (
                <div key={sub} className="flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-sm">
                  <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                  <span>{sub}</span>
                </div>
              ))}
            </div>

            {/* Horizontal Scroll Wrapper */}
            <div className="overflow-auto max-h-[550px] w-full relative scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-slate-50">
              {filteredClassesList.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center">
                  <HelpCircle className="h-12 w-12 text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-500">No classes found matching "{searchQuery}"</p>
                </div>
              ) : (
                <div
                  className="min-w-max pb-4"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `130px repeat(${datesList.length}, 100px) 60px`,
                  }}
                >
                  {/* sticky Top row dates */}
                  <div className="sticky top-0 left-0 z-40 bg-slate-100 border-b border-r border-slate-200 text-slate-500 font-bold p-2 text-xs flex items-center justify-center shadow-[2px_2px_4px_rgba(0,0,0,0.04)] select-none uppercase tracking-wider text-center min-h-[64px] h-[64px]">
                    Classes
                  </div>
                  
                  {/* Date Column headers */}
                  {safeDatesList.map((dt, index) => {
                    if (!dt || !dt.dateStr) return null;
                    const isToday = dt.dateStr === todayStr;
                    return (
                      <div
                        key={dt.dateStr}
                        draggable={plannerStatus !== 'Published'}
                        onDragStart={(e) => handleColDragStart(e, index)}
                        onDragOver={handleColDragOver}
                        onDrop={() => handleColDrop(index)}
                        onContextMenu={(e) => handleRightClick(e, 'date', dt.dateStr)}
                        className={`sticky top-0 z-30 border-b border-r border-slate-200 p-1 text-center flex flex-col justify-center items-center select-none shadow-[0_2px_4px_-1px_rgba(0,0,0,0.02)] min-h-[64px] h-[64px] group relative cursor-grab active:cursor-grabbing ${
                          isToday && highlightToday
                            ? 'bg-yellow-50 text-yellow-900 border-b-yellow-400 border-b-2 font-bold'
                            : isToday
                              ? 'bg-indigo-50/90 text-indigo-700 font-bold border-b-indigo-400 border-b-2'
                              : dt.isHoliday
                                ? 'bg-slate-100/90 text-slate-400 italic'
                                : 'bg-slate-50 text-slate-600 font-bold'
                        }`}
                      >
                        <span 
                          onDoubleClick={() => { if (plannerStatus !== 'Published') handleRenameTrigger(dt); }}
                          className="text-[15px] font-bold text-slate-800 leading-tight block hover:bg-slate-200/50 rounded px-1 cursor-pointer transition"
                          title="Double click to rename column date"
                        >
                          {dt.label}
                        </span>
                        <span className="text-[12px] font-medium text-slate-400 block leading-tight mt-0.5">{dt.dayName}</span>

                        {/* HOVER DATE COLOUMN INSERTION TRIGGER (Notion-style vertical separator) */}
                        <div className="absolute right-0 top-0 bottom-0 w-1.5 group/col-insert hover:w-3 cursor-pointer flex justify-center items-center z-30 no-print">
                          <div className="h-full w-0.5 bg-indigo-400 opacity-0 group-hover/col-insert:opacity-100 transition-opacity" />
                          <button
                            onClick={(e) => { e.stopPropagation(); handleInsertDateAt(index + 1); }}
                            className="opacity-0 group-hover/col-insert:opacity-100 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-0.5 shadow-md hover:scale-110 transition h-4.5 w-4.5 flex items-center justify-center absolute left-1/2 -translate-x-1/2"
                            title="Insert Date Column Here"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add Date Header spacer */}
                  <button
                    onClick={handleOpenAddDateDialog}
                    className="sticky top-0 z-30 border-b border-r border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-400 font-bold text-xs flex items-center justify-center min-h-[64px] h-[64px] cursor-pointer no-print transition-colors"
                    title="Add Date Column"
                  >
                    + Date
                  </button>

                  {/* Rows (Classes) */}
                  {Array.isArray(filteredClassesList) && filteredClassesList.map((cls, rowIndex) => {
                    if (!cls || !cls.id) return null;
                    return (
                      <React.Fragment key={cls.id}>
                        {/* sticky Left class column */}
                        <div
                          draggable={plannerStatus !== 'Published'}
                          onDragStart={(e) => handleRowDragStart(e, rowIndex)}
                          onDragOver={handleRowDragOver}
                          onDrop={() => handleRowDrop(rowIndex)}
                          onContextMenu={(e) => handleRightClick(e, 'class', cls.id)}
                          className="sticky left-0 z-20 bg-slate-50 border-r border-b border-slate-200 px-3.5 py-2 font-bold text-slate-700 text-xs flex items-center justify-between min-h-[40px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] uppercase tracking-wide whitespace-nowrap group cursor-grab active:cursor-grabbing"
                        >
                          {editingClassId === cls.id ? (
                            <input
                              autoFocus
                              value={cls.name}
                              onChange={(e) => handleRenameClass(cls.id, e.target.value)}
                              onBlur={() => setEditingClassId(null)}
                              onKeyDown={(e) => { if (e.key === 'Enter') setEditingClassId(null); }}
                              className="w-full text-xs font-bold bg-white border border-indigo-300 rounded px-1 py-0.5 focus:outline-none"
                            />
                          ) : (
                            <span 
                              onDoubleClick={() => { if (plannerStatus !== 'Published') setEditingClassId(cls.id); }}
                              className="cursor-pointer hover:bg-slate-200/50 rounded px-1"
                              title="Double click to rename class row inline"
                            >
                              {cls.name || 'Class'}
                            </span>
                          )}
                          
                          {/* Row Delete Button on hover */}
                          <button
                            onClick={() => handleDeleteClass(cls.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-50 text-red-500 cursor-pointer no-print ml-2"
                            title="Delete Class Row"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Cell date coordinate */}
                        {safeDatesList.map((dt) => {
                          if (!dt || !dt.dateStr) return null;
                          const cellKey = `${dt.dateStr}_${cls.id}`;
                          const cell = gridData?.[cellKey];
                          const hasSubject = cell && cell.subject;
                          const colorMeta = hasSubject ? (SUBJECT_COLORS[cell.subject] || { bg: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' }) : null;
                          const isSelected = selectedCellKey === cellKey;

                          // Excluded Date Cell
                          if (dt.isHoliday) {
                            return (
                              <div
                                key={cellKey}
                                className="border-r border-b border-slate-200 bg-slate-100/60 text-slate-400 text-[10px] font-semibold flex items-center justify-center select-none cursor-not-allowed h-10"
                                title="Holiday - Not Editable"
                              >
                                Holiday
                              </div>
                            );
                          }

                          // Active Cell
                          return (
                            <div
                              key={cellKey}
                              onClick={() => handleCellClick(dt, cls)}
                              title={plannerStatus === 'Published' ? 'Published - Read Only' : 'Click to edit • Ctrl+C/V to copy/paste'}
                              className={`border-r border-b border-slate-100 h-10 flex items-center justify-center hover:bg-slate-50/60 transition-colors select-none relative ${
                                plannerStatus === 'Published' ? 'cursor-not-allowed' : 'cursor-pointer'
                              } ${
                                isSelected ? 'ring-2 ring-indigo-500 ring-inset z-10' : ''
                              }`}
                            >
                              {hasSubject ? (
                                <span
                                  className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide border shadow-sm ${colorMeta?.bg || 'bg-slate-100 text-slate-700 border-slate-200'}`}
                                  title={cell.notes ? `Notes: ${cell.notes}` : ''}
                                >
                                  {cell.subject}
                                </span>
                              ) : (
                                plannerStatus === 'Published' ? (
                                  <Lock className="h-3 w-3 text-slate-200" />
                                ) : (
                                  <div className="group/cell w-full h-full flex items-center justify-center min-h-[38px] transition-all">
                                    <span className="text-slate-350 font-medium text-xs group-hover/cell:hidden transition-all duration-200 opacity-60">—</span>
                                    <span className="hidden group-hover/cell:inline-flex text-indigo-600 font-extrabold text-[9.5px] uppercase tracking-widest transition-all duration-200 scale-95 group-hover/cell:scale-100 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg shadow-sm">
                                      Schedule
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          );
                        })}

                        {/* Add Date Spacer cell inside row */}
                        <div className="border-r border-b border-slate-100 bg-slate-50/20 h-10 no-print" />

                        {/* ROW HOVER INSERTION TRIGGER (Notion-style horizontal separator line) */}
                        <div
                          style={{ gridColumn: '1 / -1' }}
                          className="h-1 relative group/row-insert no-print bg-transparent hover:bg-indigo-50 flex items-center justify-start transition-all"
                        >
                          <div className="absolute left-[30px] h-0.5 bg-indigo-400 opacity-0 group-hover/row-insert:opacity-100 transition-opacity w-[90px]" />
                          <button
                            onClick={() => handleInsertClassAt(rowIndex + 1)}
                            className="opacity-0 group-hover/row-insert:opacity-100 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-0.5 shadow-md hover:scale-110 transition h-4.5 w-4.5 flex items-center justify-center absolute left-[125px] z-30"
                            title="Insert Class Row Here"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </React.Fragment>
                    );
                  })}

                  {/* INLINE ADD CLASS ROW extension trigger */}
                  <button
                    onClick={handleOpenAddClassDialog}
                    className="sticky left-0 z-20 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 hover:from-indigo-50 hover:to-purple-50 border-r border-b border-dashed border-indigo-200 px-3.5 py-3 font-bold text-indigo-600 text-xs flex items-center justify-center gap-2 min-h-[44px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.03)] cursor-pointer no-print hover:text-indigo-700 transition-all"
                  >
                    <Plus className="h-4 w-4 text-indigo-500" />
                    <span>Add Class Row</span>
                  </button>
                  {safeDatesList.map(dt => (
                    <div key={`add-class-row-spacer-${dt.dateStr}`} className="border-r border-b border-dashed border-slate-200 bg-slate-50/10 h-[44px] no-print" />
                  ))}
                  {/* Plus one extra spacer cell for the + Date column */}
                  <div className="border-r border-b border-dashed border-slate-200 bg-slate-50/10 h-[44px] no-print" />
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM STATUS DETAILS BAR */}
          <div className="no-print bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-md flex flex-col sm:flex-row gap-3 items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-slate-300">
              <Info className="h-4.5 w-4.5 text-indigo-400 shrink-0" />
              <span>
                {Object.keys(gridData).length} tests scheduled.
                {JSON.stringify(gridData) !== JSON.stringify(savedGridData) && (
                  <span className="text-amber-400 ml-1.5 font-bold animate-pulse">● Unsaved Draft Edits</span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={handleResetPlanner}
                className="text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-semibold h-10 rounded-xl cursor-pointer"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Reset Layout
              </Button>

              {JSON.stringify(gridData) !== JSON.stringify(savedGridData) && (
                <Button
                  variant="outline"
                  onClick={handleDiscardChanges}
                  className="bg-transparent border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold h-10 rounded-xl cursor-pointer"
                >
                  Discard Changes
                </Button>
              )}

              <Button
                onClick={handleSaveAllPlanner}
                className="bg-gradient-to-r from-indigo-500 to-indigo-500 hover:from-indigo-600 hover:to-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/10 text-xs font-bold flex items-center gap-1.5 h-10 px-5 border-0 cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                Save Planner
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING RIGHT-CLICK CONTEXT MENU */}
      {contextMenu && (
        <div
          style={{
            position: 'absolute',
            left: contextMenu.x + window.scrollX,
            top: contextMenu.y + window.scrollY,
          }}
          className="absolute z-50 bg-white border border-slate-200 rounded-2xl shadow-xl p-1 w-44 text-xs font-semibold text-slate-700 no-print"
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'date' ? (
            <>
              <button
                onClick={() => {
                  setInsertIndex(datesList.findIndex(d => d.dateStr === contextMenu.target));
                  setDuplicatingDateStr(null);
                  setAddDateDialogOpen(true);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Plus className="h-3.5 w-3.5 text-slate-400" />
                Insert Before
              </button>
              <button
                onClick={() => {
                  setInsertIndex(datesList.findIndex(d => d.dateStr === contextMenu.target) + 1);
                  setDuplicatingDateStr(null);
                  setAddDateDialogOpen(true);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Plus className="h-3.5 w-3.5 text-slate-400" />
                Insert After
              </button>
              <button
                onClick={() => {
                  setDuplicatingDateStr(contextMenu.target);
                  setAddDateDialogOpen(true);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Copy className="h-3.5 w-3.5 text-slate-400" />
                Duplicate Column
              </button>
              <button
                onClick={() => {
                  handleMoveCol(datesList.findIndex(d => d.dateStr === contextMenu.target), -1);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5 text-slate-400" />
                Move Left
              </button>
              <button
                onClick={() => {
                  handleMoveCol(datesList.findIndex(d => d.dateStr === contextMenu.target), 1);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                Move Right
              </button>
              <div className="h-px bg-slate-100 my-1" />
              <button
                onClick={() => {
                  handleDeleteDate(contextMenu.target);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 hover:bg-red-50 hover:text-red-600 rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-400" />
                Delete Date
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setInsertIndex(selectedClassesList.findIndex(c => c.id === contextMenu.target));
                  setDuplicatingClassId(null);
                  setAddClassDialogOpen(true);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Plus className="h-3.5 w-3.5 text-slate-400" />
                Insert Above
              </button>
              <button
                onClick={() => {
                  setInsertIndex(selectedClassesList.findIndex(c => c.id === contextMenu.target) + 1);
                  setDuplicatingClassId(null);
                  setAddClassDialogOpen(true);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Plus className="h-3.5 w-3.5 text-slate-400" />
                Insert Below
              </button>
              <button
                onClick={() => {
                  handleDuplicateClass(contextMenu.target);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Copy className="h-3.5 w-3.5 text-slate-400" />
                Duplicate Row
              </button>
              <button
                onClick={() => {
                  handleMoveRow(selectedClassesList.findIndex(c => c.id === contextMenu.target), -1);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
              >
                <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                Move Up
              </button>
              <button
                onClick={() => {
                  handleMoveRow(selectedClassesList.findIndex(c => c.id === contextMenu.target), 1);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
              >
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                Move Down
              </button>
              <div className="h-px bg-slate-100 my-1" />
              <button
                onClick={() => {
                  handleDeleteClass(contextMenu.target);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 hover:bg-red-50 hover:text-red-600 rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-400" />
                Delete Class
              </button>
            </>
          )}
        </div>
      )}

      {/* POPUP PANEL FOR CELL SUBJECT / NOTES EDITING */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-0 overflow-hidden bg-gradient-to-br from-white to-slate-50/50 border-slate-200 shadow-2xl">
          <DialogHeader className="bg-gradient-to-r from-indigo-50/70 to-indigo-50/20 px-6 py-5 border-b border-slate-100 flex items-start">
            <div className="space-y-1">
              <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                📅 Schedule Assessment
              </DialogTitle>
              {editingCell && (
                <p className="text-xs text-slate-500 font-medium">
                  Class {editingCell.classItem.name} • {formatDateLabel(editingCell.date.dateStr)} ({editingCell.date.dayName})
                </p>
              )}
            </div>
          </DialogHeader>

          <DialogBody className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Select Subject ({editingCell?.classItem?.name})
              </label>

              {loadingSubjects ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-sm text-slate-400">
                  <span className="h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <span>Loading assigned subjects...</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {classSubjects.length === 0 ? (
                    <p className="text-sm text-slate-400 italic col-span-2 text-center py-4">No subjects configured</p>
                  ) : (
                    classSubjects.map((sub) => {
                      const isSelected = cellSubject === sub;
                      const colorMeta = SUBJECT_COLORS[sub] || SUBJECT_COLORS['No Test'];
                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => setCellSubject(sub)}
                          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-left text-sm font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? `${colorMeta.bg} ring-2 ring-indigo-500/15 shadow-sm`
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50/80 hover:border-slate-300'
                          }`}
                        >
                          <span className={`h-2.5 w-2.5 rounded-full ${colorMeta.dot} shrink-0`} />
                          <span className="truncate">{sub}</span>
                          {isSelected && <Check className="h-4 w-4 ml-auto text-indigo-600 shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Notes</label>
              <Textarea
                value={cellNotes}
                onChange={(e) => setCellNotes(e.target.value)}
                placeholder="e.g. Chapter 5, Revision, MCQ..."
                className="min-h-[85px] rounded-xl border-slate-200 placeholder:text-slate-400 text-sm focus:ring-indigo-500/20 focus:border-indigo-500 p-3"
              />
            </div>
          </DialogBody>

          <DialogFooter className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setEditingCell(null);
              }}
              className="rounded-xl h-10 px-5 text-sm font-semibold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCell}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 px-5 text-sm font-bold shadow-sm"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DELETE MODAL */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm rounded-3xl p-0 overflow-hidden bg-white border-slate-200 shadow-2xl">
          <DialogHeader className="bg-red-50 px-6 py-5 border-b border-red-100">
            <DialogTitle className="text-base font-bold text-red-700 flex items-center gap-2">
              ⚠️ Delete Planner
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="p-6 text-sm text-slate-600 space-y-2">
            <p>Are you sure you want to delete the planner <strong>{plannerToDelete?.name}</strong>?</p>
            <p className="text-xs text-slate-400">This action cannot be undone and will remove the saved boards and schedules.</p>
          </DialogBody>
          <DialogFooter className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setPlannerToDelete(null);
              }}
              className="rounded-xl h-10 px-5 text-sm font-semibold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl h-10 px-5 text-sm font-bold shadow-sm"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT PLANNER DETAILS MODAL */}
      <Dialog open={editDetailsDialogOpen} onOpenChange={setEditDetailsDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-0 overflow-hidden bg-white border-slate-200 shadow-2xl">
          <DialogHeader className="bg-slate-50 px-6 py-5 border-b border-slate-100">
            <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              📝 Edit Planner Details
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Planner Name</label>
              <Input
                value={tempPlannerName}
                onChange={(e) => setTempPlannerName(e.target.value)}
                placeholder="e.g. August Daily Test"
                className="h-10 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</label>
                <select
                  value={tempPlannerStatus}
                  onChange={(e) => setTempPlannerStatus(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800"
                >
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assessment Type</label>
                <select
                  value={tempAssessmentType}
                  onChange={(e) => {
                    setTempAssessmentType(e.target.value);
                    if (e.target.value !== 'Main Exam') setTempMainExam('');
                  }}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800"
                >
                  <option value="Daily Test">Daily Test</option>
                  <option value="Main Exam">Main Exam</option>
                </select>
              </div>
            </div>

            {tempAssessmentType === 'Main Exam' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Main Exam Session</label>
                <select
                  value={tempMainExam}
                  onChange={(e) => setTempMainExam(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800"
                >
                  <option value="">Select Main Exam...</option>
                  {mainExamSessions.map((exam) => (
                    <option key={exam} value={exam}>{exam}</option>
                  ))}
                </select>
              </div>
            )}
          </DialogBody>
          <DialogFooter className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setEditDetailsDialogOpen(false)}
              className="rounded-xl h-10 px-5 text-sm font-semibold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveDetailsConfirm}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 px-5 text-sm font-bold shadow-sm"
            >
              Save Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADD CLASS MODAL */}
      <Dialog open={addClassDialogOpen} onOpenChange={setAddClassDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-0 overflow-hidden bg-white border-slate-200 shadow-2xl">
          <DialogHeader className="bg-indigo-50 px-6 py-5 border-b border-indigo-100">
            <DialogTitle className="text-base font-bold text-indigo-700 flex items-center gap-2">
              🏫 Add Class Row
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="p-6 space-y-4">
            <p className="text-xs text-slate-500">
              {duplicatingClassId ? 'Select the class row to duplicate the schedules and notes into:' : 'Select an available class to add as a row in your spreadsheet grid:'}
            </p>
            
            <div className="max-h-[200px] overflow-y-auto border border-slate-100 rounded-xl p-3 bg-slate-50/50 grid grid-cols-2 gap-2">
              {classToSelectState.length === 0 ? (
                <p className="text-xs text-slate-400 italic col-span-2 text-center py-4">All available classes are already in this planner.</p>
              ) : (
                classToSelectState.map((cls) => (
                  <button
                    key={cls.id}
                    onClick={() => handleAddClassRowConfirm(cls.id)}
                    className="flex items-center gap-2 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl p-2.5 text-xs text-slate-700 font-bold transition text-left cursor-pointer"
                  >
                    <Plus className="h-3 w-3 text-indigo-600" />
                    {cls.name}
                  </button>
                ))
              )}
            </div>
          </DialogBody>
          <DialogFooter className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setAddClassDialogOpen(false);
                setInsertIndex(null);
                setDuplicatingClassId(null);
              }}
              className="rounded-xl h-10 px-5 text-sm font-semibold"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADD DATE MODAL */}
      <Dialog open={addDateDialogOpen} onOpenChange={setAddDateDialogOpen}>
        <DialogContent className="sm:max-w-sm rounded-3xl p-0 overflow-hidden bg-white border-slate-200 shadow-2xl">
          <DialogHeader className="bg-indigo-50 px-6 py-5 border-b border-indigo-100">
            <DialogTitle className="text-base font-bold text-indigo-700 flex items-center gap-2">
              📅 Add Date Column
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {duplicatingDateStr ? 'Select Date to Duplicate Into' : 'Choose Date'}
              </label>
              <DatePicker
                value={newDateValue}
                onChange={setNewDateValue}
                placeholder="Select date to append..."
                className="w-full h-11 rounded-xl"
              />
            </div>
          </DialogBody>
          <DialogFooter className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setAddDateDialogOpen(false);
                setNewDateValue('');
                setInsertIndex(null);
                setDuplicatingDateStr(null);
              }}
              className="rounded-xl h-10 px-5 text-sm font-semibold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddDateConfirm}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 px-5 text-sm font-bold shadow-sm"
            >
              Confirm Date
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RENAME DATE MODAL */}
      <Dialog open={renameDateDialogOpen} onOpenChange={setRenameDateDialogOpen}>
        <DialogContent className="sm:max-w-sm rounded-3xl p-0 overflow-hidden bg-white border-slate-200 shadow-2xl">
          <DialogHeader className="bg-slate-50 px-6 py-5 border-b border-slate-100">
            <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              ✏️ Rename Date Column
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="p-6 space-y-4">
            <p className="text-xs text-slate-400">Changing this date will automatically migrate all scheduled assessment cell values to the new date column coordinates.</p>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Date</label>
              <DatePicker
                value={renamedDateValue}
                onChange={setRenamedDateValue}
                placeholder="Choose new date..."
                className="w-full h-11 rounded-xl"
              />
            </div>
          </DialogBody>
          <DialogFooter className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setRenameDateDialogOpen(false);
                setDateToRename(null);
              }}
              className="rounded-xl h-10 px-5 text-sm font-semibold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameDateConfirm}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 px-5 text-sm font-bold shadow-sm"
            >
              Rename Date
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SKIP DATES / HOLIDAYS MANAGER DIALOG */}
      <Dialog open={skipDatesDialogOpen} onOpenChange={setSkipDatesDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-0 overflow-hidden bg-white border-slate-200 shadow-2xl">
          <DialogHeader className="bg-slate-50 px-6 py-5 border-b border-slate-100">
            <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              🛠️ Excluded Holidays Configuration
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="p-6 space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Skip Days (Recurring)</label>
              <div className="flex flex-wrap gap-2">
                {WEEK_DAYS.map((day) => {
                  const isSkipped = skipDays.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => handleToggleSkipDay(day.value)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                        isSkipped
                          ? 'bg-red-50 border-red-200 text-red-600'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Skip Specific Dates (Holidays)</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <DatePicker
                    value={skipSpecificDateInput}
                    onChange={handleAddSkipDate}
                    placeholder="Choose specific holiday date..."
                    className="w-full h-10 rounded-xl"
                  />
                </div>
              </div>
              
              {skipSpecificDates.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto p-2 bg-slate-50/70 border border-slate-100 rounded-xl">
                  {skipSpecificDates.map((date) => (
                    <span
                      key={date}
                      className="inline-flex items-center gap-1 bg-red-100/70 text-red-700 px-2 py-0.5 rounded-lg text-xs font-medium border border-red-200/50"
                    >
                      {formatDateLabel(date)}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkipDate(date)}
                        className="hover:bg-red-200 rounded p-0.5 cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </DialogBody>
          <DialogFooter className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
            <Button
              onClick={handleSaveSkipDatesConfirm}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 px-5 text-sm font-bold shadow-sm border-0"
            >
              Apply Configurations
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageStack>
  );
}
