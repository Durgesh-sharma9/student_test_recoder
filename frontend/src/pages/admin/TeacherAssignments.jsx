import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatClassName, cn } from "@/lib/utils";
import { useSession } from '@/context/SessionContext';
import { useSubscriptionExpiry } from '@/hooks/useSubscriptionExpiry';
import { Users, ClipboardList, Plus, Save, BookOpen, Trash2, Edit, X, Search, ChevronDown, ChevronUp, User, ArrowRight, Book } from "lucide-react";
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
  const [expandedCards, setExpandedCards] = useState({});
  const assignSectionRef = React.useRef(null);
  const addAssignmentSectionRef = React.useRef(null);
  const [highlightDropdown, setHighlightDropdown] = useState(false);
  const [expandedSubjects, setExpandedSubjects] = useState({});

  // Subject color mapping
  const getSubjectColor = (subject) => {
    const colors = {
      'MATHS': 'bg-blue-100 text-blue-700 border-blue-200',
      'ENGLISH': 'bg-green-100 text-green-700 border-green-200',
      'HINDI': 'bg-orange-100 text-orange-700 border-orange-200',
      'SCIENCE': 'bg-cyan-100 text-cyan-700 border-cyan-200',
      'PHYSICS': 'bg-purple-100 text-purple-700 border-purple-200',
      'CHEMISTRY': 'bg-pink-100 text-pink-700 border-pink-200',
      'BIOLOGY': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'COMPUTER': 'bg-indigo-100 text-indigo-700 border-indigo-200',
      'DRAWING': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'SOCIAL SCIENCE': 'bg-red-100 text-red-700 border-red-200',
      'SST': 'bg-red-100 text-red-700 border-red-200',
    };
    const upperSubject = subject.toUpperCase();
    return colors[upperSubject] || 'bg-slate-100 text-slate-700 border-slate-200';
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

  const addItem = () => {
    if (!checkAndBlock(() => {
      if (!selectedClass || !subject.trim() || !totalChapters) {
        toast.error("Please select class, enter subject and total chapters");
        return;
      }

      setItems((prev) => [
        ...prev,
        {
          class: selectedClass,
          subject: subject.toUpperCase(),
          totalChapters: Number(totalChapters),
        },
      ]);

      setSubject("");
      setTotalChapters("");
    })) return;
  };

  const handleRemoveItem = (indexToRemove, className, subjectName) => {
    const classDisplay = className ? formatClassName(className) : "this class";
    const confirmMessage = `Are you sure you want to remove ${subjectName} from ${classDisplay}?`;
    
    if (window.confirm(confirmMessage)) {
      setItems((prev) => prev.filter((_, idx) => idx !== indexToRemove));
      toast.success("Assignment removed from list (Click Save to apply changes)");
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
    if (!checkAndBlock(() => {
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
      setItems((prev) => {
        const updated = [...prev];
        updated[editingIndex] = {
          class: editForm.classId,
          subject: editForm.subject.toUpperCase(),
          totalChapters: chapters,
        };
        return updated;
      });

      setEditDialogOpen(false);
      toast.success("Assignment updated (Click Save to apply changes)");
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

  const save = async () => {
    if (!checkAndBlock(async () => {
      try {
        if (!teacherId) {
          toast.error("Please select a teacher first");
          return;
        }

        const uniqueClassIds = [...new Set(items.map((i) => i.class))];
        const uniqueSubjects = [
          ...new Set(
            items
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
          assignments: items,
        };
        
        await api.put(
          `/users/${teacherId}/assignments`,
          payload,
        );

        toast.success("Assignments saved successfully");
      } catch (error) {
        console.error('[TeacherAssignments] Error:', error);
        toast.error(
          error?.response?.data?.message || "Failed to save assignments",
        );
      }
    })) return;
  };

  return (
    <PageStack>
      <PageHeader
        title="Assign Subjects"
        description="Manage teacher classes and subjects"
      />

      {/* Teacher Assignment Overview Section */}
      <ErpSection title="Teacher Assignment Overview" icon={User} tone="indigo">
        <div className="space-y-4">
          {/* Subtitle */}
          <p className="text-sm text-slate-600">Quickly view which classes and subjects are assigned to each teacher.</p>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by teacher name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 text-sm bg-white border-slate-200 shadow-sm"
            />
          </div>

          {/* Teacher Cards Grid */}
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {teachers
              .filter(teacher => 
                teacher.name?.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .sort((a, b) => {
                const aHasAssignments = (a.assignments || []).length > 0;
                const bHasAssignments = (b.assignments || []).length > 0;
                if (aHasAssignments && !bHasAssignments) return -1;
                if (!aHasAssignments && bHasAssignments) return 1;
                return 0;
              })
              .map((teacher) => {
                const assignments = teacher.assignments || [];
                const hasAssignments = assignments.length > 0;
                const isExpanded = expandedCards[teacher._id];
                
                // Group assignments by class
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
                    className="border border-slate-200 rounded-lg bg-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-purple-300 transition-all cursor-pointer overflow-hidden h-full flex flex-col"
                    onClick={() => setExpandedCards(prev => ({ ...prev, [teacher._id]: !prev[teacher._id] }))}
                  >
                    {/* Compact Header */}
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-3 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-white" />
                        <div className="flex flex-col">
                          <h3 className="text-xs font-bold text-white">{teacher.name}</h3>
                          {hasAssignments && (
                            <div className="text-[9px] text-white/80">
                              {totalClasses} Classes • {totalSubjects} Subjects
                            </div>
                          )}
                        </div>
                      </div>
                      {hasAssignments && (
                        <Button
                          size="sm"
                          className="h-6 px-2.5 text-[10px] font-medium bg-white text-purple-600 hover:bg-purple-50 rounded-md shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTeacherId(teacher._id);
                            setHighlightDropdown(true);
                            setTimeout(() => {
                              assignSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              // Focus the teacher dropdown
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

                    {/* Compact Content */}
                    <div className="p-3 flex-1">
                      {hasAssignments ? (
                        <div className="space-y-2">
                          {visibleClassGroups.map(([className, subjects]) => {
                            const isSubjectsExpanded = expandedSubjects[`${teacher._id}-${className}`];
                            const visibleSubjects = isSubjectsExpanded ? subjects : subjects.slice(0, 4);
                            const remainingSubjectCount = subjects.length - 4;
                            
                            return (
                              <div key={className} className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-semibold text-blue-600">{className}</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {visibleSubjects.map((subject, idx) => (
                                    <span
                                      key={idx}
                                      className={cn("px-1.5 py-0.5 text-[9px] font-medium rounded-sm border", getSubjectColor(subject))}
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
                                      className="text-[9px] font-medium text-purple-600 hover:text-purple-700"
                                    >
                                      +{remainingSubjectCount}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          
                          {!isExpanded && remainingClassCount > 0 && (
                            <div className="text-[10px] font-medium text-indigo-600 pt-1">
                              +{remainingClassCount} more class{remainingClassCount > 1 ? 'es' : ''}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-6 h-full">
                          <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                            <Book className="h-5 w-5 text-emerald-500" />
                          </div>
                          <p className="text-xs font-semibold text-slate-700 mb-3">No Assignments Yet</p>
                          <Button
                            size="sm"
                            className="h-7 text-[10px] font-medium bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-md shadow-sm px-3"
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
        </div>
      </ErpSection>

      <ErpSection title="Select Teacher" icon={Users} tone="blue" id="select-teacher-section" ref={assignSectionRef}>
        {/* Blue tone soft gradient background matching heading */}
        <div className={cn("p-4 rounded-xl border border-blue-50 bg-gradient-to-br from-blue-50/70 via-transparent to-transparent transition-all duration-500", highlightDropdown && "ring-2 ring-purple-500 ring-offset-2")}>
          <FormField label="Teacher">
            <SearchableTeacherSelect
              value={teacherId}
              onChange={setTeacherId}
              teachers={teachers}
              placeholder="Search or select teacher"
              emptyMessage="No teachers available"
            />
          </FormField>
        </div>
      </ErpSection>

      <ErpSection title="Add New Assignment" icon={Plus} tone="orange" ref={addAssignmentSectionRef}>
        {/* Orange tone soft gradient background matching heading */}
        <div className="p-4 rounded-xl border border-orange-50 bg-gradient-to-br from-orange-50/70 via-transparent to-transparent">
          <div className="grid gap-4 lg:grid-cols-4 items-end">
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
        </div>
      </ErpSection>

      <ErpSection title="Current Assignments" icon={ClipboardList} tone="green">
        {/* Green tone soft gradient background matching heading */}
        <div className="p-4 rounded-xl border border-emerald-50 bg-gradient-to-br from-emerald-50/70 via-transparent to-transparent">
          {items.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center border-2 border-dashed border-emerald-200/60 rounded-xl bg-gradient-to-b from-emerald-50/50 to-white">
              <div className="h-12 w-12 flex items-center justify-center rounded-full bg-emerald-50 text-emerald-500 mb-3 shadow-sm border border-emerald-100">
                <ClipboardList className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-semibold text-slate-700">Ready to assign subjects?</h4>
              <p className="text-xs text-slate-500 mt-1">Select the class, subject, and total chapters above, then click "Add Assignment" to begin.</p>
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

                    {/* Bottom Footer: Teacher Name, Status & Action Buttons */}
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
      </ErpSection>

      <div className="flex justify-end mt-2">
        <Button 
          size="sm" 
          onClick={save} 
          className="px-6 h-9 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md border-0" 
          disabled={isArchived}
        >
          <Save className="mr-1.5 h-4 w-4" />
          Save Assignments
        </Button>
      </div>

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