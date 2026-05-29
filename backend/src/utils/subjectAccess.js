import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

export const toIdString = (id) => (id?._id ?? id)?.toString();

export const normalizeSubject = (subject) => String(subject || '').trim().toUpperCase();

export const getTeacherAssignments = (teacher, classId) => {
  const list = (teacher?.assignments || []).map((a) => ({
    classId: toIdString(a.class),
    subject: normalizeSubject(a.subject),
  }));
  if (!classId) return list;
  const cid = toIdString(classId);
  return list.filter((a) => a.classId === cid);
};

export const checkTeacherAccess = async (userId, classId, subject) => {
  const teacher = await User.findById(userId).select('assignments');
  const sub = normalizeSubject(subject);
  const cid = toIdString(classId);
  const hasAccess = getTeacherAssignments(teacher, classId).some(
    (a) => a.classId === cid && a.subject === sub
  );
  if (!hasAccess) {
    throw new ApiError(
      403,
      'You are not assigned to teach this subject for this class. Ask your School Admin to add the assignment or register the subject.'
    );
  }
};
