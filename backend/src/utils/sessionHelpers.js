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

export const findDailySession = async (schoolId, classId, subject, testDate) => {
  if (!testDate) return null;
  return ResultSession.findOne({
    school: schoolId,
    class: classId,
    subject: normalizeSubject(subject),
    category: 'daily',
    testDate: { $gte: startOfDay(testDate), $lte: endOfDay(testDate) },
  });
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

export const buildMarksRows = async (session, classId, schoolId) => {
  const students = await Student.find({
    class: classId,
    school: schoolId,
    isActive: true,
  }).sort('rollNo');

  const marksMap = new Map();
  if (session) {
    const marks = await MarkEntry.find({ session: session._id });
    marks.forEach((m) => marksMap.set(m.student.toString(), m));
  }

  return students.map((s) => {
    const m = marksMap.get(s._id.toString());
    return {
      studentId: s._id,
      rollNo: s.rollNo,
      name: s.name,
      gender: s.gender,
      marksObtained: m?.marksObtained ?? '',
      rankSubject: m?.rankSubject ?? null,
      percentage: m?.percentage ?? null,
    };
  });
};
