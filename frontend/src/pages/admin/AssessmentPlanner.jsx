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
  HelpCircle
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

// Fallback subjects based on class name pattern
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
  // Standard classes 1-10
  return ['Maths', 'Science', 'English', 'Hindi', 'Computer', 'SST', 'GK', 'No Test'];
};

export default function AssessmentPlanner() {
  // Config & Selection state
  const [assessmentType, setAssessmentType] = useState('Daily Test');
  const [mainExamSessions, setMainExamSessions] = useState([]);
  const [selectedMainExam, setSelectedMainExam] = useState('');
  const [loadingExams, setLoadingExams] = useState(false);
  const [availableClasses, setAvailableClasses] = useState(DEFAULT_CLASSES);
  const [selectedClasses, setSelectedClasses] = useState(['5-a', '6-a', '7-a']);
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
  
  // Grid Data
  const [datesList, setDatesList] = useState([]);
  const [selectedClassesList, setSelectedClassesList] = useState([]);
  const [gridData, setGridData] = useState({}); // Key: "dateString_classId" => { subject, notes }
  const [savedGridData, setSavedGridData] = useState({}); // For draft check & discard
  
  // Toolbar filters
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightToday, setHighlightToday] = useState(false);
  
  // Modal / Cell edit state
  const [editingCell, setEditingCell] = useState(null); // { date, classItem }
  const [cellSubject, setCellSubject] = useState('Maths');
  const [cellNotes, setCellNotes] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [classSubjects, setClassSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  const todayStr = useRef(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }).current();

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

  // Format Helper for specific dates display
  const formatDateLabel = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    const dateObj = new Date(year, month - 1, day);
    return dateObj.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
  };

  // Specific Date Selection Handler
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

  // Skip Days toggler
  const handleToggleSkipDay = (dayValue) => {
    if (skipDays.includes(dayValue)) {
      setSkipDays(skipDays.filter(d => d !== dayValue));
    } else {
      setSkipDays([...skipDays, dayValue]);
    }
  };

  // Class Selection multi select toggler
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

  // Main grid generator function
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

    // Generate list of dates
    const tempDates = [];
    let current = new Date(start);
    
    // Safety break to prevent infinite loops (max 3 months grid)
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
        label: current.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
        dayName: current.toLocaleDateString('en-US', { weekday: 'short' }),
        formattedYear: year
      });

      current.setDate(current.getDate() + 1);
    }

    // Identify selected class items
    const classesItems = availableClasses.filter(c => selectedClasses.includes(c.id));
    if (classesItems.length === 0) {
      toast.error('Please select at least one class to generate planner.');
      return;
    }

    setIsLoading(true);
    
    // Simulate loading transitions
    setTimeout(() => {
      setDatesList(tempDates);
      setSelectedClassesList(classesItems);
      setIsGenerated(true);
      setIsLoading(false);
      // Reset grid data structure
      const initialGrid = {};
      setGridData(initialGrid);
      setSavedGridData(initialGrid);
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

  // Cell interaction
  const handleCellClick = (dateItem, classItem) => {
    if (dateItem.isHoliday) {
      toast.error('Holiday - Not Editable', {
        description: 'Holidays cannot have tests scheduled.'
      });
      return;
    }

    setEditingCell({ date: dateItem, classItem });
    const cellKey = `${dateItem.dateStr}_${classItem.id}`;
    const existing = gridData[cellKey];
    
    // Default subject to first available or Maths
    const defaultSubjectsList = getClassFallbackSubjects(classItem.name);
    setCellSubject(existing?.subject || defaultSubjectsList[0] || 'Maths');
    setCellNotes(existing?.notes || '');
    
    // Fetch actual database assigned subjects for this class
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
      
      toast.success(`Assessment scheduled for ${editingCell.classItem.name}`);
      setDialogOpen(false);
      setEditingCell(null);
    } catch (err) {
      console.error('Error saving cell planning details:', err);
      toast.error('Failed to save assessment details');
    }
  };

  const handleSaveAllPlanner = () => {
    setIsLoading(true);
    setTimeout(() => {
      setSavedGridData(gridData);
      setIsLoading(false);
      toast.success('Planner Saved Successfully!');
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
    toast.success('Planner layouts reset.');
  };

  // Filter classes shown in rows based on search
  const filteredClassesList = selectedClassesList.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageStack className="max-w-full overflow-x-hidden p-1 sm:p-2">
      {/* RESTORED SPACIOUS PAGE HEADER & DESCRIPTION */}
      <PageHeader
        title="Assessment Planner"
        description="Plan and block subjects for upcoming school tests and assignments in a modern grid sheet."
      />

      {/* RESTORED SPACIOUS ORIGINAL CONFIGURATION CARD */}
      {!isGenerated && !isLoading && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm shadow-slate-100 overflow-hidden transition-all duration-300">
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
              {/* Type and Datepicker Row */}
              <div className="space-y-4">
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
                        <option key={exam} value={exam}>
                          {exam}
                        </option>
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
                <div className="border border-slate-200 rounded-2xl bg-slate-50/50 p-4 max-h-[160px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                    {availableClasses.map((cls) => {
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
                  
                  {/* Selected Specific Dates Tags list */}
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
                className="bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-700 hover:via-indigo-700 hover:to-violet-700 text-white rounded-2xl shadow-md shadow-indigo-600/10 font-bold flex items-center gap-2 border-0 cursor-pointer h-12 px-8 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Grid className="h-4.5 w-4.5" />
                {assessmentType === 'Daily Test' ? 'Generate Daily Test Planner' : 'Generate Main Exam Planner'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SKELETON LOADER ANIMATION */}
      {isLoading && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6 animate-pulse">
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
        <div className="space-y-4">
          {/* TOOLBAR FOR GRID FILTERS AND LEGEND */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Search and Today Button */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Class..."
                  className="pl-10 h-10 rounded-xl bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-sm border-slate-200"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setHighlightToday(prev => !prev);
                  if(!highlightToday) {
                    toast.info('Highlighting today in the planner grid');
                  }
                }}
                className={`h-10 px-4 rounded-xl text-xs font-semibold ${
                  highlightToday
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'
                }`}
              >
                📅 Today
              </Button>
            </div>

            {/* Colors Legend */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3 lg:border-t-0 lg:pt-0 border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-1">Legend:</span>
              {Object.entries(SUBJECT_COLORS).map(([sub, meta]) => (
                <div key={sub} className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50/60 px-2.5 py-1 rounded-lg border border-slate-100">
                  <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                  <span>{sub}</span>
                </div>
              ))}
            </div>
          </div>

          {/* COMPACT SPREADSHEET GRID */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm shadow-slate-100/50 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50/30 border-b border-slate-100 flex items-center justify-between text-xs font-medium text-slate-400">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">{assessmentType === 'Main Exam' ? `Main Exam: ${selectedMainExam}` : assessmentType}</span>
                <span>• Selected Classes: {filteredClassesList.length} • Dates: {datesList.length}</span>
              </div>
              <div className="hidden md:block">
                💡 Double scroll to navigate • Click cells to schedule assessment
              </div>
            </div>

            {/* Horizontal Scroll Wrapper */}
            <div className="overflow-auto max-h-[500px] w-full relative scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-slate-50">
              {filteredClassesList.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center">
                  <HelpCircle className="h-12 w-12 text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-500">No classes found matching "{searchQuery}"</p>
                </div>
              ) : (
                <div
                  className="min-w-max"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `130px repeat(${datesList.length}, 100px)`,
                  }}
                >
                  {/* TOP STICKY HEADER ROW (DATES) */}
                  {/* Intersection box (Top Left corner) */}
                  <div className="sticky top-0 left-0 z-40 bg-slate-100 border-b border-r border-slate-200 text-slate-500 font-bold p-2 text-xs flex items-center justify-center shadow-[2px_2px_4px_rgba(0,0,0,0.04)] select-none uppercase tracking-wider text-center min-h-[46px]">
                    Classes
                  </div>
                  {/* Date Column headers */}
                  {Array.isArray(datesList) && datesList.map((dt) => {
                    if (!dt || !dt.dateStr) return null;
                    const isToday = dt.dateStr === todayStr;
                    return (
                      <div
                        key={dt.dateStr}
                        className={`sticky top-0 z-30 border-b border-r border-slate-200 p-1.5 text-center flex flex-col justify-center select-none shadow-[0_2px_4px_-1px_rgba(0,0,0,0.02)] min-h-[46px] ${
                          isToday && highlightToday
                            ? 'bg-yellow-50 text-yellow-900 border-b-yellow-400 border-b-2 font-bold'
                            : isToday
                              ? 'bg-indigo-50/90 text-indigo-700 font-bold border-b-indigo-400 border-b-2'
                              : dt.isHoliday
                                ? 'bg-slate-100/90 text-slate-400 italic'
                                : 'bg-slate-50 text-slate-600 font-bold'
                        }`}
                      >
                        <span className="text-[11px] leading-tight block">{dt.label}</span>
                        <span className="text-[9px] opacity-75 font-normal block leading-tight">{dt.dayName}</span>
                      </div>
                    );
                  })}

                  {/* ROWS (CLASSES) */}
                  {Array.isArray(filteredClassesList) && filteredClassesList.map((cls) => {
                    if (!cls || !cls.id) return null;
                    return (
                      <React.Fragment key={cls.id}>
                        {/* First Sticky Column (Class Item) */}
                        <div
                          className="sticky left-0 z-20 bg-slate-50 border-r border-b border-slate-200 px-3.5 py-2 font-bold text-slate-700 text-xs flex items-center justify-between min-h-[40px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] uppercase tracking-wide whitespace-nowrap"
                        >
                          <span>{cls.name || 'Class'}</span>
                        </div>

                        {/* Date columns under this class row */}
                        {Array.isArray(datesList) && datesList.map((dt) => {
                          if (!dt || !dt.dateStr) return null;
                          const cellKey = `${dt.dateStr}_${cls.id}`;
                          const cell = gridData?.[cellKey];
                          const hasSubject = cell && cell.subject;
                          const colorMeta = hasSubject ? (SUBJECT_COLORS[cell.subject] || { bg: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' }) : null;

                          // Holiday Cell
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

                          // Editable Cell
                          return (
                            <div
                              key={cellKey}
                              onClick={() => handleCellClick(dt, cls)}
                              className="border-r border-b border-slate-100 h-10 flex items-center justify-center hover:bg-slate-50/60 transition-colors cursor-pointer select-none"
                            >
                              {hasSubject ? (
                                <span
                                  className={`inline-flex items-center justify-center rounded px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide shadow-sm border ${colorMeta?.bg || 'bg-slate-100 text-slate-700 border-slate-200'}`}
                                  title={cell.notes ? `Notes: ${cell.notes}` : ''}
                                >
                                  {cell.subject}
                                </span>
                              ) : (
                                <span className="text-slate-300 hover:text-indigo-600 font-bold text-xs transition-colors p-1">
                                  +
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM ACTIONS BAR */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-md flex flex-col sm:flex-row gap-3 items-center justify-between text-xs">
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
    </PageStack>
  );
}
