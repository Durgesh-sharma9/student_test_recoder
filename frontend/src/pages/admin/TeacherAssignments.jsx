import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatClassName } from "@/lib/utils";
import { useSession } from '@/context/SessionContext';
import { useSubscriptionExpiry } from '@/hooks/useSubscriptionExpiry';
import { Users, ClipboardList, Plus, Save, BookOpen, Trash2, Edit, X } from "lucide-react";
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

      <ErpSection title="Select Teacher" icon={Users} tone="blue">
        <FormField label="Teacher">
          <SearchableTeacherSelect
            value={teacherId}
            onChange={setTeacherId}
            teachers={teachers}
            placeholder="Search or select teacher"
            emptyMessage="No teachers available"
          />
        </FormField>
      </ErpSection>

      <ErpSection title="Add New Assignment" icon={Plus} tone="orange">
        <div className="grid gap-4 lg:grid-cols-4">
          <FormField label="Class">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
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
                className="h-10 rounded-md border-slate-200 bg-white shadow-sm transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
              className="h-10 rounded-md border-slate-200 bg-white shadow-sm"
            />
          </FormField>

          <div className="flex items-end">
            <Button onClick={addItem} className="w-full h-10" variant="success" disabled={isArchived}>
              <Plus className="mr-2 h-4 w-4" />
              Add Assignment
            </Button>
          </div>
        </div>
      </ErpSection>

      <ErpSection title="Current Assignments" icon={ClipboardList} tone="green">
        {items.length === 0 ? (
          <div className="py-8 text-center text-slate-500">
            No assignments added yet
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 w-full">
            {items.map((item, index) => {
              const classInfo = classes.find((c) => c._id === item.class);

              return (
                <div
                  key={`${item.class}-${item.subject}-${index}`}
                  className="relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm overflow-hidden min-h-[200px]"
                >
                  {/* Top Color Accent Bar */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

                  {/* Top Layer: Class Info and Icon */}
                  <div className="flex items-start justify-between mt-1">
                    <div className="space-y-0.5">
                      <h4 className="text-lg font-bold text-slate-900 tracking-tight">
                        {classInfo ? `${formatClassName(classInfo.className)}-${classInfo.section}` : "Class N/A"}
                      </h4>
                      <p className="text-xs font-medium text-slate-400">Assigned Class</p>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-500 border border-blue-100/60">
                      <BookOpen className="h-4 w-4" />
                    </div>
                  </div>

                  {/* Middle Block: Subject with Color/Gradient Fill */}
                  <div className="my-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-100/70 p-3.5 shadow-inner">
                    <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex justify-between">
                      <span>Subject</span>
                      <span>Chapters: {item.totalChapters || 0}</span>
                    </div>
                    <div className="text-base font-extrabold text-blue-700 tracking-wide uppercase truncate mt-0.5">
                      {item.subject}
                    </div>
                  </div>

                  {/* Bottom Footer: Teacher Name, Status & Action Buttons */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold text-slate-600">
                        {teachers.find(t => t._id === teacherId)?.name || 'Teacher'}
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        Active
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={isArchived}
                        onClick={() => handleEditItem(index)}
                        className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100/80 active:bg-blue-100 border border-blue-100/70 rounded-lg px-3 py-1.5 transition-all flex items-center gap-1 shadow-sm"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={isArchived}
                        onClick={() => handleRemoveItem(index, classInfo?.className, item.subject)}
                        className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100/80 active:bg-red-100 border border-red-100/70 rounded-lg px-3 py-1.5 transition-all flex items-center gap-1 shadow-sm"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ErpSection>

      <div className="flex justify-end">
        <Button size="lg" onClick={save} className="px-8 shadow-md" disabled={isArchived}>
          <Save className="mr-2 h-4 w-4" />
          Save Assignments
        </Button>
      </div>

      {/* Edit Assignment Dialog */}
      {editDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Edit Assignment</h3>
                <button
                  onClick={handleCancelEdit}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4">
              <FormField label="Teacher">
                <Select
                  value={editForm.teacherId}
                  onValueChange={(v) => setEditForm({ ...editForm, teacherId: v })}
                  disabled
                >
                  <SelectTrigger>
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
                  <SelectTrigger>
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
                  className="h-10 rounded-md border-slate-200"
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
                  className="h-10 rounded-md border-slate-200"
                />
                <p className="text-[10px] text-slate-500 mt-1">Must be between 1 and 100</p>
              </FormField>

              <FormField label="Status">
                <Select
                  value={editForm.status}
                  onValueChange={(v) => setEditForm({ ...editForm, status: v })}
                  disabled
                >
                  <SelectTrigger>
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
            <div className="bg-slate-50 px-6 py-4 flex gap-3 justify-end border-t border-slate-200">
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                className="rounded-xl bg-blue-600 hover:bg-blue-700"
              >
                <Save className="mr-2 h-4 w-4" />
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