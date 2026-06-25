import mongoose from 'mongoose';
import AcademicSession from '../models/AcademicSession.js';
import ResultSession from '../models/ResultSession.js';
import User from '../models/User.js';
import Class from '../models/Class.js';
import { normalizeSubject } from '../utils/subjectAccess.js';
import { startOfDay, endOfDay } from '../utils/sessionHelpers.js';

const toObjectId = (id) => (id ? new mongoose.Types.ObjectId(String(id)) : null);

const round1 = (v) => Math.round((Number(v) || 0) * 10) / 10;

const normalizeExamType = (v) => {
  const x = String(v || '').trim();
  if (!x) return '';
  if (x.toLowerCase() === 'final exam') return 'Final';
  return x;
};

const parseAssessmentTypes = (raw) => {
  if (!raw) return null;
  const arr = String(raw)
    .split(',')
    .map((s) => normalizeExamType(s))
    .map((s) => s.trim())
    .filter(Boolean);
  if (!arr.length) return null;
  const hasAll = arr.some((s) => s.toLowerCase() === 'all assessments');
  if (hasAll) return null;
  return [...new Set(arr)];
};

const startOfWeekMonday = (d) => {
  const x = new Date(d);
  const day = x.getDay(); // 0 (Sun) - 6 (Sat)
  const diff = (day + 6) % 7; // Mon = 0
  x.setDate(x.getDate() - diff);
  return startOfDay(x);
};

const endOfWeekSunday = (d) => {
  const s = startOfWeekMonday(d);
  const x = new Date(s);
  x.setDate(x.getDate() + 6);
  return endOfDay(x);
};

const startOfMonth = (d) => startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
const endOfMonth = (d) => endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));

const buildSessionDateMatch = ({ dateFilter, specificDate, dateFrom, dateTo }) => {
  const type = String(dateFilter || 'overall').toLowerCase();
  if (!type || type === 'overall') return null;

  const now = new Date();

  if (type === 'today') {
    return { $gte: startOfDay(now), $lte: endOfDay(now) };
  }
  if (type === 'this_week') {
    return { $gte: startOfWeekMonday(now), $lte: endOfWeekSunday(now) };
  }
  if (type === 'this_month') {
    return { $gte: startOfMonth(now), $lte: endOfMonth(now) };
  }
  if (type === 'specific_date') {
    if (!specificDate) return null;
    return { $gte: startOfDay(specificDate), $lte: endOfDay(specificDate) };
  }
  if (type === 'date_range') {
    if (!dateFrom && !dateTo) return null;
    const match = {};
    if (dateFrom) match.$gte = startOfDay(dateFrom);
    if (dateTo) match.$lte = endOfDay(dateTo);
    return match;
  }

  return null;
};

export const getActiveAcademicSession = async (schoolId) => {
  let activeSession = await AcademicSession.findOne({ school: schoolId, status: 'active' });

  if (!activeSession) {
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    const sessionName = `${currentYear}-${nextYear.toString().slice(-2)}`;
    const startDate = new Date(currentYear, 5, 1);
    const endDate = new Date(nextYear, 2, 31);
    activeSession = await AcademicSession.create({
      school: schoolId,
      sessionName,
      startDate,
      endDate,
      status: 'active',
    });
  }

  return activeSession;
};

export const getTeacherPerformanceSummary = async (schoolId, query = {}) => {
  const activeSession = await getActiveAcademicSession(schoolId);

  const teacherId = toObjectId(query.teacherId);
  const classId = toObjectId(query.classId);
  const subject = query.subject ? normalizeSubject(query.subject) : null;
  const assessmentTypes = parseAssessmentTypes(query.assessmentTypes);
  const sessionDateMatch = buildSessionDateMatch(query);

  const match = {
    school: toObjectId(schoolId),
    academicSession: toObjectId(activeSession._id),
  };
  if (teacherId) match.teacher = teacherId;
  if (classId) match.class = classId;
  if (subject) match.subject = subject;
  if (assessmentTypes) match.examType = { $in: assessmentTypes };

  const pipeline = [
    { $match: match },
    {
      $addFields: {
        sessionDate: { $ifNull: ['$testDate', '$examDate'] },
      },
    },
  ];

  if (sessionDateMatch) pipeline.push({ $match: { sessionDate: sessionDateMatch } });

  pipeline.push(
    {
      $lookup: {
        from: 'markentries',
        localField: '_id',
        foreignField: 'session',
        as: 'marks',
      },
    },
    { $unwind: '$marks' },
    {
      $group: {
        _id: {
          teacher: '$teacher',
          class: '$class',
          subject: '$subject',
        },
        averagePercentage: { $avg: '$marks.percentage' },
        studentSet: { $addToSet: '$marks.student' },
        sessionSet: { $addToSet: '$_id' },
        lastTestDate: { $max: '$sessionDate' },
      },
    },
    {
      $project: {
        _id: 0,
        teacherId: '$_id.teacher',
        classId: '$_id.class',
        subject: '$_id.subject',
        performancePercentage: { $round: ['$averagePercentage', 1] },
        studentsCount: { $size: '$studentSet' },
        testsConducted: { $size: '$sessionSet' },
        lastTestDate: 1,
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'teacherId',
        foreignField: '_id',
        as: 'teacher',
      },
    },
    { $unwind: { path: '$teacher', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'classes',
        localField: 'classId',
        foreignField: '_id',
        as: 'class',
      },
    },
    { $unwind: { path: '$class', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        teacherName: { $ifNull: ['$teacher.teacherName', '$teacher.name'] },
        classLabel: {
          $cond: [
            { $and: ['$class.className', '$class.section'] },
            { $concat: [{ $toString: '$class.className' }, '-', { $toString: '$class.section' }] },
            '',
          ],
        },
      },
    }
  );

  const sortKey = String(query.sortBy || 'performance_desc');
  const sortStage = (() => {
    switch (sortKey) {
      case 'performance_asc':
        return { performancePercentage: 1, studentsCount: -1 };
      case 'teacher_az':
        return { teacherName: 1, subject: 1, classLabel: 1 };
      case 'teacher_za':
        return { teacherName: -1, subject: 1, classLabel: 1 };
      case 'most_students':
        return { studentsCount: -1, performancePercentage: -1 };
      case 'most_tests':
        return { testsConducted: -1, performancePercentage: -1 };
      case 'recently_active':
        return { lastTestDate: -1, performancePercentage: -1 };
      case 'performance_desc':
      default:
        return { performancePercentage: -1, studentsCount: -1 };
    }
  })();

  pipeline.push({ $sort: sortStage });

  const rows = await ResultSession.aggregate(pipeline);
  return rows.map((r) => ({
    teacher: r.teacher
      ? { _id: r.teacher._id, name: r.teacherName || r.teacher.name, email: r.teacher.email }
      : { _id: r.teacherId, name: r.teacherName || 'Unknown', email: '' },
    subject: r.subject,
    class: r.class
      ? { _id: r.class._id, className: r.class.className, section: r.class.section }
      : { _id: r.classId, className: '', section: '' },
    performancePercentage: round1(r.performancePercentage),
    studentsCount: r.studentsCount || 0,
    testsConducted: r.testsConducted || 0,
    lastTestDate: r.lastTestDate || null,
  }));
};

export const getTeacherPerformanceDetail = async (schoolId, query = {}) => {
  const activeSession = await getActiveAcademicSession(schoolId);
  const teacherId = toObjectId(query.teacherId);
  const classId = toObjectId(query.classId);
  const subject = query.subject ? normalizeSubject(query.subject) : null;
  const assessmentTypes = parseAssessmentTypes(query.assessmentTypes);
  const sessionDateMatch = buildSessionDateMatch(query);

  if (!teacherId || !classId || !subject) {
    return null;
  }

  const baseMatch = {
    school: toObjectId(schoolId),
    academicSession: toObjectId(activeSession._id),
    teacher: teacherId,
    class: classId,
    subject,
  };
  if (assessmentTypes) baseMatch.examType = { $in: assessmentTypes };

  const sessionsPipeline = [
    { $match: baseMatch },
    { $addFields: { sessionDate: { $ifNull: ['$testDate', '$examDate'] } } },
  ];
  if (sessionDateMatch) sessionsPipeline.push({ $match: { sessionDate: sessionDateMatch } });

  const sessionStatsPipeline = [
    ...sessionsPipeline,
    {
      $lookup: {
        from: 'markentries',
        localField: '_id',
        foreignField: 'session',
        as: 'marks',
      },
    },
    { $unwind: '$marks' },
    {
      $group: {
        _id: '$_id',
        examType: { $first: '$examType' },
        category: { $first: '$category' },
        sessionDate: { $first: '$sessionDate' },
        averagePercentage: { $avg: '$marks.percentage' },
        studentSet: { $addToSet: '$marks.student' },
      },
    },
    {
      $project: {
        _id: 1,
        examType: 1,
        category: 1,
        sessionDate: 1,
        averagePercentage: { $round: ['$averagePercentage', 1] },
        studentsCount: { $size: '$studentSet' },
      },
    },
    { $sort: { sessionDate: 1 } },
  ];

  const [perSession, summaryRows, teacherDoc, classDoc] = await Promise.all([
    ResultSession.aggregate(sessionStatsPipeline),
    ResultSession.aggregate([
      ...sessionsPipeline,
      {
        $lookup: {
          from: 'markentries',
          localField: '_id',
          foreignField: 'session',
          as: 'marks',
        },
      },
      { $unwind: '$marks' },
      {
        $group: {
          _id: null,
          averagePercentage: { $avg: '$marks.percentage' },
          studentSet: { $addToSet: '$marks.student' },
          sessionSet: { $addToSet: '$_id' },
          lastTestDate: { $max: { $ifNull: ['$testDate', '$examDate'] } },
        },
      },
      {
        $project: {
          _id: 0,
          averagePercentage: { $round: ['$averagePercentage', 1] },
          studentsCount: { $size: '$studentSet' },
          testsConducted: { $size: '$sessionSet' },
          lastTestDate: 1,
        },
      },
    ]),
    User.findOne({ _id: teacherId, school: schoolId }).select('name teacherName email').lean(),
    Class.findOne({ _id: classId, school: schoolId }).select('className section').lean(),
  ]);

  const summary = summaryRows?.[0] || {
    averagePercentage: 0,
    studentsCount: 0,
    testsConducted: 0,
    lastTestDate: null,
  };

  // Student aggregates (top + attention)
  const studentAggPipeline = [
    ...sessionsPipeline,
    {
      $lookup: {
        from: 'markentries',
        localField: '_id',
        foreignField: 'session',
        as: 'marks',
      },
    },
    { $unwind: '$marks' },
    {
      $group: {
        _id: '$marks.student',
        averagePercentage: { $avg: '$marks.percentage' },
      },
    },
    {
      $project: {
        _id: 0,
        studentId: '$_id',
        averagePercentage: { $round: ['$averagePercentage', 1] },
      },
    },
    {
      $lookup: {
        from: 'students',
        localField: 'studentId',
        foreignField: '_id',
        as: 'student',
      },
    },
    { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        studentId: 1,
        studentName: { $ifNull: ['$student.name', 'Unknown'] },
        rollNo: '$student.rollNo',
        averagePercentage: 1,
      },
    },
  ];

  const assessmentComparisonPipeline = [
    ...sessionsPipeline,
    {
      $lookup: {
        from: 'markentries',
        localField: '_id',
        foreignField: 'session',
        as: 'marks',
      },
    },
    { $unwind: '$marks' },
    {
      $group: {
        _id: '$examType',
        averagePercentage: { $avg: '$marks.percentage' },
      },
    },
    {
      $project: {
        _id: 0,
        examType: '$_id',
        averagePercentage: { $round: ['$averagePercentage', 1] },
      },
    },
    { $sort: { examType: 1 } },
  ];

  const [studentAverages, assessmentComparisonRaw] = await Promise.all([
    ResultSession.aggregate(studentAggPipeline),
    ResultSession.aggregate(assessmentComparisonPipeline),
  ]);

  const topStudents = [...studentAverages]
    .sort((a, b) => (b.averagePercentage ?? 0) - (a.averagePercentage ?? 0))
    .slice(0, 5);

  const studentsNeedingAttention = [...studentAverages]
    .sort((a, b) => (a.averagePercentage ?? 0) - (b.averagePercentage ?? 0))
    .slice(0, 5);

  // Ensure fixed keys (as per UI requirement list)
  const desiredExamTypes = ['Daily Test', 'PA1', 'PA2', 'Half Yearly', 'FA2', 'Final'];
  const comparisonMap = new Map(assessmentComparisonRaw.map((x) => [x.examType, x.averagePercentage]));
  const assessmentComparison = desiredExamTypes.map((t) => ({
    examType: t === 'Final' ? 'Final Exam' : t,
    averagePercentage: round1(comparisonMap.get(t) ?? 0),
  }));

  return {
    teacherId: String(teacherId),
    teacherName: teacherDoc?.teacherName || teacherDoc?.name || 'Unknown',
    teacherEmail: teacherDoc?.email || '',
    classId: String(classId),
    className: classDoc?.className || '',
    section: classDoc?.section || '',
    subject,
    studentsCount: summary.studentsCount || 0,
    testsConducted: summary.testsConducted || 0,
    averagePercentage: round1(summary.averagePercentage),
    lastTestDate: summary.lastTestDate || null,
    performanceTrend: perSession.map((s) => ({
      sessionId: String(s._id),
      examType: s.examType,
      date: s.sessionDate,
      averagePercentage: round1(s.averagePercentage),
    })),
    testWiseBreakdown: perSession.map((s, idx) => ({
      sessionId: String(s._id),
      testName: s.examType === 'Daily Test' ? `Daily Test ${idx + 1}` : s.examType,
      assessmentType: s.examType === 'Final' ? 'Final Exam' : s.examType,
      date: s.sessionDate,
      averagePercentage: round1(s.averagePercentage),
    })),
    topStudents,
    studentsNeedingAttention,
    assessmentComparison,
  };
};
