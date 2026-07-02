import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { normalizeSubject, toIdString } from '../utils/subjectAccess.js';

export const getAssignedSubjects = asyncHandler(async (req, res) => {
  const { classId } = req.query;

  // Fetch fresh teacher data to ensure we have the latest assignments
  const teacher = await User.findById(req.user._id).populate(
    'assignments.class',
    'className section'
  );

  if (!teacher) {
    return res.status(404).json({ success: false, message: 'Teacher not found' });
  }

  let assignments = (teacher.assignments || []).map((a) => ({
    classId: toIdString(a.class),
    className: a.class?.className,
    section: a.class?.section,
    subject: normalizeSubject(a.subject),
    totalChapters: a.totalChapters || 0,
    label: a.class
      ? `${a.class.className}-${a.class.section} · ${normalizeSubject(a.subject)}`
      : normalizeSubject(a.subject),
  }));

  if (classId) {
    const cid = toIdString(classId);
    assignments = assignments.filter((a) => a.classId === cid);
  }

  const subjects = [...new Set(assignments.map((a) => a.subject))].filter(Boolean).sort();

  res.json({
    success: true,
    subjects,
    assignments,
    canAddSubjects: false,
  });
});
