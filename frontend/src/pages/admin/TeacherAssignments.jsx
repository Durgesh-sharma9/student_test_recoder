import { useEffect, useState } from "react";

import { toast } from "sonner";

import api from "@/lib/api";
import { formatClassName } from "@/lib/utils";

import { Users, ClipboardList, Plus, Save } from "lucide-react";

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
  const [teachers, setTeachers] = useState([]);

  const [classes, setClasses] = useState([]);

  const [teacherId, setTeacherId] = useState("");

  const [selectedClass, setSelectedClass] = useState("");

  const [subject, setSubject] = useState("");

  const [items, setItems] = useState([]);

  useEffect(() => {
    Promise.all([api.get("/users?role=teacher"), api.get("/classes")]).then(
      ([t, c]) => {
        const activeTeachers = (t.data.users || []).filter(teacher => teacher.status !== 'Inactive');
        setTeachers(activeTeachers);

        setClasses(c.data.classes || []);

        if (activeTeachers.length) {
          setTeacherId(activeTeachers[0]._id);
        }
      },
    );
  }, []);

  useEffect(() => {
    const teacher = teachers.find((t) => t._id === teacherId);

    setItems(
      (teacher?.assignments || []).map((a) => ({
        class: a.class?._id || a.class,

        subject: a.subject,
      })),
    );
  }, [teacherId, teachers]);

  const addItem = () => {
    if (!selectedClass || !subject.trim()) {
      toast.error("Please select class and enter subject");

      return;
    }

    setItems((prev) => [
      ...prev,

      {
        class: selectedClass,

        subject: subject.toUpperCase(),
      },
    ]);

    setSubject("");
  };

  const save = async () => {
    try {
      const uniqueClassIds = [...new Set(items.map((i) => i.class))];

      const uniqueSubjects = [
        ...new Set(
          items

            .map((i) => i.subject)

            .filter(Boolean),
        ),
      ];

      for (const subject of uniqueSubjects) {
        try {
          await api.post("/subjects", {
            subject,
          });
        } catch {
          // ignore duplicate
        }
      }

      await api.put(
        `/users/${teacherId}/assignments`,

        {
          assignedClasses: uniqueClassIds,

          assignments: items,
        },
      );

      toast.success("Assignments saved successfully");
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to save assignments",
      );
    }
  };

  return (
    <PageStack>
      <PageHeader
        title="Assign Subjects"
        description="Manage teacher classes and subjects"
      />

      <ErpSection title="Select Teacher" icon={Users} tone="blue">
        <FormField label="Teacher">
          <Select value={teacherId} onValueChange={setTeacherId}>
            <SelectTrigger>
              <SelectValue placeholder="Select Teacher" />
            </SelectTrigger>

            <SelectContent>
              {teachers.map((teacher) => (
                <SelectItem key={teacher._id} value={teacher._id}>
                  {teacher.teacherName || teacher.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </ErpSection>

      <ErpSection title="Add New Assignment" icon={Plus} tone="orange">
        <div className="grid gap-4 lg:grid-cols-3">
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
      className="h-12 rounded-xl border-slate-200 bg-white shadow-sm transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
    />

    <datalist id="subjects">
      <option value="Maths" />
      <option value="Science" />
      <option value="English" />
      <option value="Hindi" />
      <option value="Social Science" />
      <option value="Physics" />
      <option value="Chemistry" />
      <option value="Biology" />
      <option value="Computer" />
      <option value="GK" />
      <option value="Sanskrit" />
      <option value="EVS" />
      <option value="Drawing" />
      <option value="PT" />
    </datalist>
  </>
</FormField>

          <div className="flex items-end">
            <Button onClick={addItem} className="w-full" variant="success">
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
          <div className="space-y-3">
            {items.map((item, index) => {
              const classInfo = classes.find((c) => c._id === item.class);

              return (
                <div
                  key={`${item.class}-${item.subject}-${index}`}
                  className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="font-medium text-slate-800">
                      {formatClassName(classInfo?.className)}-{classInfo?.section}
                    </div>

                    <div className="text-sm text-slate-500">
                      Subject: {item.subject}
                    </div>
                  </div>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() =>
                      setItems((prev) => prev.filter((_, idx) => idx !== index))
                    }
                  >
                    Remove
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </ErpSection>

      <div className="flex justify-end">
        <Button size="lg" onClick={save} className="px-8">
          <Save className="mr-2 h-4 w-4" />
          Save Assignments
        </Button>
      </div>
    </PageStack>
  );
}
