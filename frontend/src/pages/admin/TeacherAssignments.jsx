import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatClassName, cn } from "@/lib/utils";
import { useSession } from '@/context/SessionContext';
import { useSubscriptionExpiry } from '@/hooks/useSubscriptionExpiry';
import { Users, ClipboardList, Plus, Save, BookOpen, Trash2, Edit, X, Search, ChevronDown, ChevronUp, User, ArrowRight, Book, LayoutGrid, List } from "lucide-react";
import {
  PageHeader,
  ErpSection,
  FormField,
  PageStack,
} from "@/components/erp/PagePrimitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import SearchableTeacherSelect from "@/components/SearchableTeacherSelect";
import SubscriptionExpiredDialog from '@/components/subscription/SubscriptionExpiredDialog';

const COMMON_SUBJECTS = [
  "Maths",
  "Science",
  "English",
  "Hindi",
  "Social Science",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer",
  "GK",
  "Sanskrit",
  "EVS",
  "Drawing",
  "PT",
];

export default function TeacherAssignments() {
  const { isArchived } = useSession();
  const { isSubscriptionExpired, dialogOpen: expiredDialogOpen, setDialogOpen: setExpiredDialogOpen, checkAndBlock } = useSubscriptionExpiry();
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teacherId, setTeacherId] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [subject, setSubject] = useState("");
  const [totalChapters, setTotalChapters] = useState("");
  const [items, setItems] = useState([]);
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editForm, setEditForm] = useState({
    teacherId: "",
    classId: "",
    subject: "",
    totalChapters: "",
    status: "Active",
  });

  // Overview section state
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("table"); // 'table' or 'grid'
  const [expandedCards, setExpandedCards] = useState({});
  const addAssignmentSectionRef = React.useRef(null);
  const assignSectionRef = addAssignmentSectionRef;
  const [highlightDropdown, setHighlightDropdown] = useState(false);
  const [expandedSubjects, setExpandedSubjects] = useState({});

  // Subject color mapping
  const getSubjectColor = (subject) => {
    const colors = {
      'MATHS': 'bg-blue-50 text-blue-700 border-blue-200',
      'ENGLISH': 'bg-green-50 text-green-700 border-green-200',
      'HINDI': 'bg-orange-50 text-orange-700 border-orange-200',
      'SCIENCE': 'bg-cyan-50 text-cyan-700 border-cyan-200',
      'PHYSICS': 'bg-purple-50 text-purple-700 border-purple-200',
      'CHEMISTRY': 'bg-pink-50 text-pink-700 border-pink-200',
      'BIOLOGY': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'COMPUTER': 'bg-violet-50 text-violet-700 border-violet-200',
      'DRAWING': 'bg-yellow-50 text-yellow-700 border-yellow-200',
      'SOCIAL SCIENCE': 'bg-rose-50 text-rose-700 border-rose-200',
      'SST': 'bg-rose-50 text-rose-700 border-rose-200',
    };
    const upperSubject = subject.toUpperCase();
    return colors[upperSubject] || 'bg-slate-50 text-slate-700 border-slate-200';
  };

  useEffect(() => {
    api.get('/classes').then((r) => {
      setClasses(r.data.classes || []);
    });
  }, []);

  useEffect(() => {
    Promise.all([api.get("/users?role=teacher"), api.get("/classes")]).then(
      ([t, c]) => {
        const activeTeachers = (t.data.users || []).filter(teacher => teacher.status !== 'Inactive');
        setTeachers(activeTeachers);
        setClasses(c.data.classes || []);
      },
    );
  }, []);

  useEffect(() => {
    const teacher = teachers.find((t) => t._id === teacherId);

    setItems(
      (teacher?.assignments || []).map((a) => ({
        class: a.class?._id || a.class,
        subject: a.subject,
        totalChapters: a.totalChapters || 0,
      })),
    );
  }, [teacherId, teachers]);

  const saveWithItems = async (itemsToSave) => {
    try {
      if (!teacherId) {
        toast.error("Please select a teacher first");
        return;
      }

      const uniqueClassIds = [...new Set(itemsToSave.map((i) => i.class))];
      const uniqueSubjects = [
        ...new Set(
          itemsToSave
            .map((i) => i.subject)
            .filter(Boolean),
        ),
      ];

      for (const subj of uniqueSubjects) {
        try {
          await api.post("/subjects", {
            subject: subj,
          });
        } catch {
          // ignore duplicate
        }
      }

      const payload = {
        assignedClasses: uniqueClassIds,
        assignments: itemsToSave,
      };
      
      await api.put(
        `/users/${teacherId}/assignments`,
        payload,
      );

      // Refresh teachers list to keep local state updated
      const res = await api.get("/users?role=teacher");
      const activeTeachers = (res.data.users || []).filter(t => t.status !== 'Inactive');
      setTeachers(activeTeachers);

      toast.success("Assignments saved successfully");
    } catch (error) {
      console.error('[TeacherAssignments] Error:', error);
      toast.error(
        error?.response?.data?.message || "Failed to save assignments",
      );
    }
  };

  const addItem = () => {
    if (!checkAndBlock(async () => {
      if (!selectedClass || !subject.trim() || !totalChapters) {
        toast.error("Please select class, enter subject and total chapters");
        return;
      }

      const newItems = [
        ...items,
        {
          class: selectedClass,
          subject: subject.toUpperCase(),
          totalChapters: Number(totalChapters),
        },
      ];

      setItems(newItems);
      setSubject("");
      setTotalChapters("");

      await saveWithItems(newItems);
    })) return;
  };

  const handleRemoveItem = async (indexToRemove, className, subjectName) => {
    const classDisplay = className ? formatClassName(className) : "this class";
    const confirmMessage = `Are you sure you want to remove ${subjectName} from ${classDisplay}?`;
    
    if (window.confirm(confirmMessage)) {
      const newItems = items.filter((_, idx) => idx !== indexToRemove);
      setItems(newItems);
      await saveWithItems(newItems);
    }
  };

  const handleEditItem = (index) => {
    const item = items[index];
    const classInfo = classes.find((c) => c._id === item.class);
    setEditingIndex(index);
    setEditForm({
      teacherId: teacherId,
      classId: item.class,
      subject: item.subject,
      totalChapters: item.totalChapters || 0,
      status: "Active",
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!checkAndBlock(async () => {
      // Validation
      if (!editForm.classId || !editForm.subject.trim()) {
        toast.error("Please select class and enter subject");
        return;
      }
      
      const chapters = Number(editForm.totalChapters);
      if (chapters < 1 || chapters > 100) {
        toast.error("Total Chapters must be between 1 and 100");
        return;
      }

      // Check if reducing chapter count
      const currentItem = items[editingIndex];
      const currentChapters = currentItem.totalChapters || 0;
      
      if (chapters < currentChapters) {
        const confirmMessage = `This assignment already contains ${currentChapters} chapters. Reducing to ${chapters} chapters may hide or invalidate existing notebook records. Do you want to continue?`;
        if (!window.confirm(confirmMessage)) {
          return;
        }
      }

      // Update the item
      const newItems = [...items];
      newItems[editingIndex] = {
        class: editForm.classId,
        subject: editForm.subject.toUpperCase(),
        totalChapters: chapters,
      };
      setItems(newItems);
      setEditDialogOpen(false);

      await saveWithItems(newItems);
    })) return;
  };

  const handleCancelEdit = () => {
    setEditDialogOpen(false);
    setEditingIndex(null);
    setEditForm({
      teacherId: "",
      classId: "",
      subject: "",
      totalChapters: "",
      status: "Active",
    });
  };

  const filteredTeachers = teachers
    .filter(teacher => teacher.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const aHasAssignments = (a.assignments || []).length > 0;
      const bHasAssignments = (b.assignments || []).length > 0;
      if (aHasAssignments && !bHasAssignments) return -1;
      if (!aHasAssignments && bHasAssignments) return 1;
      return 0;
    });

  return (
    <PageStack className="bg-gradient-to-b from-[#f8fbff] via-[#f5f8ff] via-[#f8faff] via-[#fcfdff] to-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <PageHeader
          title="Assign Subjects"
          description="Manage teacher classes and subjects"
        />
        <Button
          onClick={() => {
            addAssignmentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setHighlightDropdown(true);
            setTimeout(() => setHighlightDropdown(false), 800);
          }}
          className="h-9 px-4 text-xs font-bold bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl shadow-md shadow-orange-500/20 cursor-pointer self-start sm:self-auto transition-all active:scale-[0.98]"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add Assignment
        </Button>
      </div>

      {/* Teacher Assignment Overview Section */}
      <ErpSection title="Teacher Assignment Overview" icon={User} tone="indigo">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Quickly view which classes and subjects are assigned to each teacher.</p>

          {/* Search Box & View Mode Toggle */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by teacher name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9 text-sm bg-white border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 shadow-sm"
              />
            </div>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 self-end sm:self-auto">
              <button
                type="button"
                className={cn("h-7 px-3 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer", viewMode === 'table' ? "bg-white shadow-xs text-indigo-700" : "text-slate-600 hover:text-slate-900")}
                onClick={() => setViewMode('table')}
              >
                <List className="h-3.5 w-3.5" /> List View
              </button>
              <button
                type="button"
                className={cn("h-7 px-3 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer", viewMode === 'grid' ? "bg-white shadow-xs text-indigo-700" : "text-slate-600 hover:text-slate-900")}
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Grid View
              </button>
            </div>
          </div>

          {/* TABLE LIST VIEW */}
          {viewMode === 'table' ? (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
              <Table>
                <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700 py-3 px-4 text-xs">Teacher Name</TableHead>
                    <TableHead className="font-bold text-slate-700 py-3 px-4 text-xs">Assigned Classes & Subjects</TableHead>
                    <TableHead className="font-bold text-slate-700 py-3 px-4 text-xs text-center">Summary</TableHead>
                    <TableHead className="font-bold text-slate-700 py-3 px-4 text-xs text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeachers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-xs text-slate-500">
                        No teachers found matching &quot;{searchQuery}&quot;
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTeachers.map((teacher) => {
                      const assignments = teacher.assignments || [];
                      const hasAssignments = assignments.length > 0;
                      
                      const groupedByClass = assignments.reduce((acc, assignment) => {
                        const classId = assignment.class?._id || assignment.class;
                        const classInfo = classes.find(c => c._id === classId);
                        const className = classInfo ? `${formatClassName(classInfo.className)}-${classInfo.section}` : 'Unknown Class';
                        if (!acc[className]) acc[className] = [];
                        acc[className].push(assignment.subject);
                        return acc;
                      }, {});

                      const classEntries = Object.entries(groupedByClass).sort();
                      const totalClasses = classEntries.length;
                      const totalSubjects = assignments.length;

                      return (
                        <TableRow key={teacher._id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                          <TableCell className="py-3 px-4 font-semibold text-xs text-slate-900 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center shrink-0 shadow-xs">
                                <User className="h-4.5 w-4.5 text-indigo-600" />
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 text-sm block">{teacher.name}</span>
                                <span className="text-[10px] text-slate-500 font-medium">{teacher.email || 'Teacher'}</span>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="py-3 px-4">
                            {hasAssignments ? (
                              <div className="flex flex-wrap gap-2 items-center">
                                {classEntries.map(([clsName, subs]) => (
                                  <div key={clsName} className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-xl">
                                    <span className="text-xs font-bold text-slate-800">{clsName}:</span>
                                    <div className="flex flex-wrap gap-1">
                                      {subs.map((s, idx) => (
                                        <span key={idx} className={cn("px-2 py-0.5 text-[10.5px] font-semibold rounded-full border", getSubjectColor(s))}>
                                          {s}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic font-medium">No subjects assigned yet</span>
                            )}
                          </TableCell>

                          <TableCell className="py-3 px-4 text-center whitespace-nowrap">
                            {hasAssignments ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-100 shadow-xs">
                                {totalClasses} Classes • {totalSubjects} Subjects
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium">0 Assignments</span>
                            )}
                          </TableCell>

                          <TableCell className="py-3 px-4 text-right whitespace-nowrap">
                            <Button
                              size="sm"
                              className="h-8 px-3 text.5 text-xs font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-full shadow-xs cursor-pointer"
                              onClick={() => {
                                setTeacherId(teacher._id);
                                setHighlightDropdown(true);
                                setTimeout(() => {
                                  assignSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                  setTimeout(() => {
                                    const teacherInput = document.querySelector('input[placeholder*="Search or select teacher"]');
                                    if (teacherInput) teacherInput.focus();
                                  }, 400);
                                }, 100);
                                setTimeout(() => setHighlightDropdown(false), 600);
                              }}
                            >
                              Manage <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            /* GRID CARDS VIEW */
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {filteredTeachers.map((teacher) => {
                const assignments = teacher.assignments || [];
                const hasAssignments = assignments.length > 0;
                const isExpanded = expandedCards[teacher._id];
                
                const groupedByClass = assignments.reduce((acc, assignment) => {
                  const classId = assignment.class?._id || assignment.class;
                  const classInfo = classes.find(c => c._id === classId);
                  const className = classInfo ? `${formatClassName(classInfo.className)}-${classInfo.section}` : 'Unknown Class';
                  
                  if (!acc[className]) {
                    acc[className] = [];
                  }
                  acc[className].push(assignment.subject);
                  return acc;
                }, {});
                
                const classGroups = Object.entries(groupedByClass).sort();
                const visibleClassGroups = isExpanded ? classGroups : classGroups.slice(0, 2);
                const remainingClassCount = classGroups.length - 2;
                const totalClasses = classGroups.length;
                const totalSubjects = assignments.length;

                return (
                  <div
                    key={teacher._id}
                    className="border border-slate-200 rounded-2xl bg-gradient-to-br from-white via-white to-slate-50 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-purple-300 hover:bg-gradient-to-br hover:from-white hover:to-purple-50 transition-all duration-250 cursor-pointer overflow-hidden h-full flex flex-col"
                    onClick={() => setExpandedCards(prev => ({ ...prev, [teacher._id]: !prev[teacher._id] }))}
                  >
                    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-3 py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center">
                          <User className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div className="flex flex-col">
                          <h3 className="text-sm font-bold text-slate-900">{teacher.name}</h3>
                          {hasAssignments && (
                            <div className="text-[10px] text-slate-500">
                              {totalClasses} Classes • {totalSubjects} Subjects
                            </div>
                          )}
                        </div>
                      </div>
                      {hasAssignments && (
                        <Button
                          size="sm"
                          className="h-7 px-3 text-[11px] font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-full shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTeacherId(teacher._id);
                            setHighlightDropdown(true);
                            setTimeout(() => {
                              assignSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              setTimeout(() => {
                                const teacherInput = document.querySelector('input[placeholder*="Search or select teacher"]');
                                if (teacherInput) teacherInput.focus();
                              }, 400);
                            }, 100);
                            setTimeout(() => setHighlightDropdown(false), 600);
                          }}
                        >
                          Manage <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </div>

                    <div className="p-3 flex-1">
                      {hasAssignments ? (
                        <div className="space-y-2">
                          {visibleClassGroups.map(([className, subjects]) => {
                            const isSubjectsExpanded = expandedSubjects[`${teacher._id}-${className}`];
                            const visibleSubjects = isSubjectsExpanded ? subjects : subjects.slice(0, 4);
                            const remainingSubjectCount = subjects.length - 4;
                            
                            return (
                              <div key={className} className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-1.5">
                                  <Book className="h-3 w-3 text-slate-400" />
                                  <span className="text-[11px] font-semibold text-slate-700">{className}</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {visibleSubjects.map((subject, idx) => (
                                    <span
                                      key={idx}
                                      className={cn("px-2 py-0.5 text-[11px] font-medium rounded-full border", getSubjectColor(subject))}
                                    >
                                      {subject}
                                    </span>
                                  ))}
                                  {!isSubjectsExpanded && remainingSubjectCount > 0 && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedSubjects(prev => ({ ...prev, [`${teacher._id}-${className}`]: true }));
                                      }}
                                      className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700"
                                    >
                                      +{remainingSubjectCount}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          
                          {!isExpanded && remainingClassCount > 0 && (
                            <div className="text-[11px] font-medium text-indigo-600 pt-0.5">
                              +{remainingClassCount} more class{remainingClassCount > 1 ? 'es' : ''}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-6 h-full bg-gradient-to-b from-slate-50/50 to-white border-2 border-dashed border-slate-200 rounded-lg">
                          <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center mb-2">
                            <Book className="h-5 w-5 text-emerald-500" />
                          </div>
                          <p className="text-xs font-semibold text-slate-700 mb-2">No Assignments Yet</p>
                          <Button
                            size="sm"
                            className="h-7 text-[11px] font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-full shadow-sm px-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTeacherId(teacher._id);
                              setTimeout(() => {
                                addAssignmentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                setTimeout(() => {
                                  const classSelect = document.querySelector('[role="combobox"]');
                                  if (classSelect) classSelect.focus();
                                }, 300);
                              }, 100);
                            }}
                          >
                            Assign Subject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ErpSection>

      <ErpSection title="Add New Assignment" icon={Plus} tone="orange" ref={addAssignmentSectionRef}>
        {/* Orange tone soft gradient background matching heading */}
        <div className={cn("p-4 rounded-xl border border-orange-50 bg-gradient-to-br from-orange-50/70 via-transparent to-transparent space-y-4 transition-all duration-500", highlightDropdown && "ring-2 ring-purple-500 ring-offset-2")}>
          
          <FormField label="Teacher" required>
            <SearchableTeacherSelect
              value={teacherId}
              onChange={setTeacherId}
              teachers={teachers}
              placeholder="Search or select teacher"
              emptyMessage="No teachers available"
            />
          </FormField>

          {teacherId ? (
            <>
              {/* Add Assignment Fields Grid */}
              <div className="grid gap-4 lg:grid-cols-4 items-end pt-2 border-t border-slate-100/50">
                <FormField label="Class">
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="h-9 text-sm bg-white shadow-sm border-slate-200 focus:border-orange-300 focus:ring-1 focus:ring-orange-100">
                      <SelectValue placeholder="Select Class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls._id} value={cls._id}>
                          {formatClassName(cls.className)}-{cls.section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="Subject">
                  <>
                    <Input
                      list="subjects"
                      placeholder="Enter Subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="h-9 text-sm rounded-md bg-white border-slate-200 shadow-sm transition-all duration-200 focus:border-orange-300 focus:ring-1 focus:ring-orange-100"
                    />
                    <datalist id="subjects">
                      {COMMON_SUBJECTS.map((sub) => (
                        <option key={sub} value={sub} />
                      ))}
                    </datalist>
                  </>
                </FormField>

                <FormField label="Total Chapters">
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 12"
                    value={totalChapters}
                    onChange={(e) => setTotalChapters(e.target.value)}
                    className="h-9 text-sm rounded-md bg-white border-slate-200 shadow-sm focus:border-orange-300 focus:ring-1 focus:ring-orange-100"
                  />
                </FormField>

                <Button 
                  onClick={addItem} 
                  className="w-full h-9 text-sm bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-sm border-0 transition-all duration-200" 
                  disabled={isArchived}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add Assignment
                </Button>
              </div>

              {/* Current Assignments Divider and Heading */}
              <div className="border-t border-slate-100 pt-4 mt-2">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm mb-3">
                  <ClipboardList className="h-4 w-4 text-emerald-600" /> 
                  <span>Current Assignments ({items.length})</span>
                </div>

                {items.length === 0 ? (
                  <div className="py-8 flex flex-col items-center justify-center text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/30">
                    <ClipboardList className="h-6 w-6 text-slate-400 mb-2" />
                    <p className="text-xs font-semibold text-slate-600">No Assignments Yet</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Use the fields above to add assignments for this teacher.</p>
                  </div>
                ) : (
                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 w-full">
                    {items.map((item, index) => {
                      const classInfo = classes.find((c) => c._id === item.class);
                      return (
                        <div
                          key={`${item.class}-${item.subject}-${index}`}
                          className="relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm overflow-hidden min-h-[130px] hover:shadow-md transition-shadow"
                        >
                          {/* Top Color Accent Bar */}
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600" />

                          {/* Top Layer: Class Info and Icon */}
                          <div className="flex items-start justify-between mt-1">
                            <div className="space-y-0.5">
                              <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                                {classInfo ? `${formatClassName(classInfo.className)}-${classInfo.section}` : "Class N/A"}
                              </h4>
                              <p className="text-[10px] font-medium text-slate-400">Assigned Class</p>
                            </div>
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600 border border-emerald-100/60 shadow-sm">
                              <BookOpen className="h-3.5 w-3.5" />
                            </div>
                          </div>

                          {/* Middle Block: Subject with Color/Gradient Fill */}
                          <div className="my-2 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50/60 border border-emerald-100/70 p-2 shadow-inner">
                            <div className="text-[9px] font-bold text-teal-600 uppercase tracking-wider flex justify-between">
                              <span>Subject</span>
                              <span>Chapters: {item.totalChapters || 0}</span>
                            </div>
                            <div className="text-sm font-extrabold text-emerald-800 tracking-wide uppercase truncate mt-0.5">
                              {item.subject}
                            </div>
                          </div>

                          {/* Bottom Footer: Action Buttons */}
                          <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] font-semibold text-slate-600 truncate max-w-[80px]">
                                {teachers.find(t => t._id === teacherId)?.name || 'Teacher'}
                              </span>
                              <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full w-fit">
                                Active
                              </span>
                            </div>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                disabled={isArchived}
                                onClick={() => handleEditItem(index)}
                                className="text-[10px] font-bold text-blue-600 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100/80 hover:to-blue-200/80 active:from-blue-100 active:to-blue-200 border border-blue-100/70 rounded-md px-2 py-1 transition-all flex items-center gap-1 shadow-sm"
                              >
                                <Edit className="h-3 w-3" />
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={isArchived}
                                onClick={() => handleRemoveItem(index, classInfo?.className, item.subject)}
                                className="text-[10px] font-bold text-red-600 bg-gradient-to-br from-red-50 to-red-100 hover:from-red-100/80 hover:to-red-200/80 active:from-red-100 active:to-red-200 border border-red-100/70 rounded-md px-2 py-1 transition-all flex items-center gap-1 shadow-sm"
                              >
                                <Trash2 className="h-3 w-3" />
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-10 flex flex-col items-center justify-center text-center border border-dashed border-orange-200 rounded-xl bg-orange-50/20">
              <ClipboardList className="h-7 w-7 text-orange-400 mb-2 animate-bounce" />
              <p className="text-sm font-semibold text-slate-700">No Teacher Selected</p>
              <p className="text-xs text-slate-500 mt-1">Please search or select a teacher above to view and assign subjects.</p>
            </div>
          )}
        </div>
      </ErpSection>



      {/* Edit Assignment Dialog */}
      {editDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-black/50 to-black/70 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">Edit Assignment</h3>
                <button
                  onClick={handleCancelEdit}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="p-4 space-y-3 bg-gradient-to-b from-blue-50/30 to-transparent">
              <FormField label="Teacher">
                <Select
                  value={editForm.teacherId}
                  onValueChange={(v) => setEditForm({ ...editForm, teacherId: v })}
                  disabled
                >
                  <SelectTrigger className="h-9 text-sm bg-slate-50">
                    <SelectValue placeholder="Select Teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((t) => (
                      <SelectItem key={t._id} value={t._id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Class">
                <Select
                  value={editForm.classId}
                  onValueChange={(v) => setEditForm({ ...editForm, classId: v })}
                >
                  <SelectTrigger className="h-9 text-sm bg-white border-slate-200">
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls._id} value={cls._id}>
                        {formatClassName(cls.className)}-{cls.section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Subject">
                <Input
                  list="subjects"
                  placeholder="Enter Subject"
                  value={editForm.subject}
                  onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                  className="h-9 text-sm rounded-md bg-white border-slate-200"
                />
                <datalist id="subjects">
                  {COMMON_SUBJECTS.map((sub) => (
                    <option key={sub} value={sub} />
                  ))}
                </datalist>
              </FormField>

              <FormField label="Total Chapters">
                <Input
                  type="number"
                  min="1"
                  max="100"
                  placeholder="e.g. 12"
                  value={editForm.totalChapters}
                  onChange={(e) => setEditForm({ ...editForm, totalChapters: e.target.value })}
                  className="h-9 text-sm rounded-md bg-white border-slate-200"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">Must be between 1 and 100</p>
              </FormField>

              <FormField label="Status">
                <Select
                  value={editForm.status}
                  onValueChange={(v) => setEditForm({ ...editForm, status: v })}
                  disabled
                >
                  <SelectTrigger className="h-9 text-sm bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            {/* Footer */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 flex gap-2 justify-end border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                className="rounded-lg h-9 text-sm bg-white"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                className="rounded-lg h-9 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-sm"
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      <SubscriptionExpiredDialog
        open={expiredDialogOpen}
        onOpenChange={setExpiredDialogOpen}
      />
    </PageStack>
  );
}