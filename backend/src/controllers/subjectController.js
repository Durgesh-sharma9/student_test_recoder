import School from '../models/School.js';
import User from '../models/User.js';
import ResultSession from '../models/ResultSession.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { normalizeSubject, toIdString } from '../utils/subjectAccess.js';

const schoolIdFromUser = (user) => toIdString(user.school);

export const listSchoolSubjects = asyncHandler(async (req, res) => {
  const schoolId = schoolIdFromUser(req.user);
  if (!schoolId) throw new ApiError(403, 'School account required.');

  const { classId } = req.query;
  const school = await School.findById(schoolId).select('subjects');
  const teachers = await User.find({ school: schoolId, role: 'teacher', isActive: true })
    .select('assignments')
    .populate('assignments.class', 'className section');

  const fromAssignments = [];
  for (const teacher of teachers) {
    for (const a of teacher.assignments || []) {
      const cid = toIdString(a.class);
      if (classId && cid !== classId) continue;
      fromAssignments.push(normalizeSubject(a.subject));
    }
  }

  const sessionFilter = { school: schoolId };
  if (classId) sessionFilter.class = classId;
  const fromSessions = await ResultSession.distinct('subject', sessionFilter);

  const subjects = [
    ...new Set([
      ...(school?.subjects || []).map(normalizeSubject),
      ...fromAssignments,
      ...fromSessions.map(normalizeSubject),
    ]),
  ]
    .filter(Boolean)
    .sort();

  res.json({ success: true, subjects, canAddSubjects: true });
});

export const addSchoolSubject = asyncHandler(async (req, res) => {
  const schoolId = schoolIdFromUser(req.user);
  const subject = normalizeSubject(req.body.subject);
  if (!subject) throw new ApiError(400, 'Subject name is required.');

  const school = await School.findById(schoolId);
  if (!school) throw new ApiError(404, 'School not found.');

  const exists = (school.subjects || []).some((s) => normalizeSubject(s) === subject);
  if (!exists) {
    school.subjects = [...(school.subjects || []), subject];
    await school.save();
  }

  res.status(201).json({
    success: true,
    message: 'Subject added to school catalog.',
    subjects: school.subjects.map(normalizeSubject).sort(),
  });
});
