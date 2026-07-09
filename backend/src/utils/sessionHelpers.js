import ResultSession from '../models/ResultSession.js';
import Student from '../models/Student.js';
import MarkEntry from '../models/MarkEntry.js';
import { normalizeSubject } from './subjectAccess.js';

export const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

/** Store one canonical instant per calendar day */
export const normalizeStoredDate = (d) => startOfDay(d);

// Helper to find ALL daily sessions for a class+subject+date (not just one)
export const findDailySessions = async (schoolId, classId, subject, testDate) => {
  if (!testDate) return [];
  return ResultSession.find({
    school: schoolId,
    class: classId,
    subject: normalizeSubject(subject),
    category: 'daily',
    testDate: { $gte: startOfDay(testDate), $lte: endOfDay(testDate) },
  }).sort({ createdAt: -1 }); // Return most recent first
};

// Keep the old findOne for backward compatibility (used in saveMarksEntry)
export const findDailySession = async (schoolId, classId, subject, testDate) => {
  const sessions = await findDailySessions(schoolId, classId, subject, testDate);
  return sessions.length > 0 ? sessions[0] : null;
};

export const findMainSession = async (schoolId, classId, subject, examType, examDate) => {
  const filter = {
    school: schoolId,
    class: classId,
    subject: normalizeSubject(subject),
    category: 'main',
    examType,
  };
  if (examDate) {
    filter.examDate = { $gte: startOfDay(examDate), $lte: endOfDay(examDate) };
  }
  return ResultSession.findOne(filter);
};

export const buildMarksRows = async (session, classId, schoolId, testDateOverride = null) => {
  const students = await Student.find({
    class: classId,
    school: schoolId,
    isActive: true,
  }).sort('rollNo');
  students.sort((a, b) => Number(a.rollNo) - Number(b.rollNo));

  const marksMap = new Map();
  if (session) {
    const marks = await MarkEntry.find({ session: session._id });
    marks.forEach((m) => marksMap.set(m.student.toString(), m));
  }

  // Get test date for admission comparison - use override if provided, otherwise from session
  const testDate = testDateOverride || session?.testDate || session?.examDate;
  const testDateObj = testDate ? new Date(testDate) : null;

  return students.map((s) => {
    const m = marksMap.get(s._id.toString());
    
    // Check if student was admitted on or before test date
    const admissionDate = s.admissionDate ? new Date(s.admissionDate) : null;
    const isNotAdmittedYet = testDateObj && admissionDate && admissionDate > testDateObj;

    return {
      studentId: s._id,
      rollNo: s.rollNo,
      name: s.name,
      gender: s.gender,
      admissionDate: s.admissionDate,
      marksObtained: m?.marksObtained ?? '',
      rankSubject: m?.rankSubject ?? null,
      percentage: m?.percentage ?? null,
      status: m?.status ?? 'present',
      isNotAdmittedYet,
    };
  });
};
