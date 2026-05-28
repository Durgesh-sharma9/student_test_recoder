import ExcelJS from 'exceljs';
import Class from '../models/Class.js';
import Student from '../models/Student.js';
import User from '../models/User.js';
import ResultSession from '../models/ResultSession.js';
import MarkEntry from '../models/MarkEntry.js';
import Activity from '../models/Activity.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const round2 = (v) => Math.round(v * 100) / 100;

const computeCompetitionRanks = (items, valueKey) => {
  const sorted = [...items].sort((a, b) => b[valueKey] - a[valueKey]);
  let prev = null;
  let rank = 0;
  return sorted.map((item, idx) => {
    if (prev !== item[valueKey]) rank = idx + 1;
    prev = item[valueKey];
    return { ...item, rank };
  });
};

const checkTeacherAccess = async (userId, classId, subject) => {
  const teacher = await User.findById(userId).select('assignments assignedClasses');
  if (!teacher) throw new ApiError(404, 'Teacher not found.');
  const hasAccess = (teacher.assignments || []).some(
    (a) => a.class.toString() === classId.toString() && a.subject === String(subject).toUpperCase()
  );
  if (!hasAccess) throw new ApiError(403, 'Access denied for selected class and subject.');
};

const recalcSubjectRanks = async (sessionId) => {
  const entries = await MarkEntry.find({ session: sessionId });
  const ranked = computeCompetitionRanks(entries.map((e) => ({ id: e._id.toString(), marks: e.marksObtained })), 'marks');
  for (const row of ranked) {
    await MarkEntry.findByIdAndUpdate(row.id, { rankSubject: row.rank });
  }
};

export const upsertSession = asyncHandler(async (req, res) => {
  const { classId, subject, month, year, examType, maxMarks } = req.body;
  if (req.user.role === 'teacher') await checkTeacherAccess(req.user._id, classId, subject);
  const classDoc = await Class.findById(classId);
  if (!classDoc || !classDoc.isActive) throw new ApiError(404, 'Class not found.');

  const session = await ResultSession.findOneAndUpdate(
    { class: classId, subject: String(subject).toUpperCase(), month, year, examType },
    {
      class: classId,
      subject: String(subject).toUpperCase(),
      month,
      year,
      examType,
      maxMarks,
      teacher: req.user._id,
    },
    { upsert: true, new: true, runValidators: true }
  );

  await Activity.create({ actor: req.user._id, action: 'SESSION_UPSERTED', meta: { sessionId: session._id } });
  res.json({ success: true, session });
});

export const saveMarks = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { entries } = req.body;
  const session = await ResultSession.findById(sessionId);
  if (!session) throw new ApiError(404, 'Session not found.');
  if (req.user.role === 'teacher') await checkTeacherAccess(req.user._id, session.class, session.subject);

  const classStudents = await Student.find({ class: session.class, isActive: true }).select('_id');
  const validStudentIds = new Set(classStudents.map((s) => s._id.toString()));

  for (const entry of entries || []) {
    if (!validStudentIds.has(String(entry.studentId))) continue;
    if (entry.marksObtained < 0 || entry.marksObtained > session.maxMarks) {
      throw new ApiError(400, `Marks for student ${entry.studentId} exceed max marks.`);
    }
    const percentage = round2((entry.marksObtained / session.maxMarks) * 100);
    await MarkEntry.findOneAndUpdate(
      { session: session._id, student: entry.studentId },
      {
        session: session._id,
        student: entry.studentId,
        marksObtained: entry.marksObtained,
        percentage,
        updatedBy: req.user._id,
      },
      { upsert: true, new: true, runValidators: true }
    );
  }

  await recalcSubjectRanks(session._id);
  await Activity.create({ actor: req.user._id, action: 'MARKS_UPDATED', meta: { sessionId: session._id } });
  res.json({ success: true, message: 'Marks saved and ranks recalculated.' });
});

export const getMarksEntryData = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const session = await ResultSession.findById(sessionId);
  if (!session) throw new ApiError(404, 'Session not found.');
  if (req.user.role === 'teacher') await checkTeacherAccess(req.user._id, session.class, session.subject);

  const students = await Student.find({ class: session.class, isActive: true }).sort('rollNo');
  const marks = await MarkEntry.find({ session: session._id });
  const map = new Map(marks.map((m) => [m.student.toString(), m]));

  const rows = students.map((s) => ({
    studentId: s._id,
    rollNo: s.rollNo,
    name: s.name,
    gender: s.gender,
    marksObtained: map.get(s._id.toString())?.marksObtained ?? '',
    rankSubject: map.get(s._id.toString())?.rankSubject ?? null,
    percentage: map.get(s._id.toString())?.percentage ?? null,
  }));

  res.json({ success: true, session, rows });
});

export const getSessions = asyncHandler(async (req, res) => {
  const { classId, month, year, examType, subject, teacher } = req.query;
  const filter = {};
  if (classId) filter.class = classId;
  if (month) filter.month = Number(month);
  if (year) filter.year = Number(year);
  if (examType) filter.examType = examType;
  if (subject) filter.subject = String(subject).toUpperCase();
  if (teacher) filter.teacher = teacher;
  if (req.user.role === 'teacher') filter.teacher = req.user._id;

  const sessions = await ResultSession.find(filter)
    .populate('class', 'className section academicYear')
    .populate('teacher', 'name email')
    .sort({ year: -1, month: -1, createdAt: -1 });
  res.json({ success: true, sessions });
});

export const getResults = asyncHandler(async (req, res) => {
  const { classId, month, year, examType, subject, teacher, rankingType = 'overall' } = req.query;
  const sFilter = {};
  if (classId) sFilter.class = classId;
  if (month) sFilter.month = Number(month);
  if (year) sFilter.year = Number(year);
  if (examType) sFilter.examType = examType;
  if (subject) sFilter.subject = String(subject).toUpperCase();
  if (teacher) sFilter.teacher = teacher;
  if (req.user.role === 'teacher') sFilter.teacher = req.user._id;

  const sessions = await ResultSession.find(sFilter).populate('class', 'className section').lean();
  const sessionIds = sessions.map((s) => s._id);
  const entries = await MarkEntry.find({ session: { $in: sessionIds } })
    .populate('student', 'name rollNo')
    .lean();
  const sessionMap = new Map(sessions.map((s) => [s._id.toString(), s]));

  if (rankingType === 'subject') {
    const rows = entries.map((e) => {
      const s = sessionMap.get(e.session.toString());
      return {
        sessionId: s._id,
        class: s.class,
        subject: s.subject,
        month: s.month,
        year: s.year,
        examType: s.examType,
        student: e.student,
        marksObtained: e.marksObtained,
        maxMarks: s.maxMarks,
        percentage: e.percentage,
        rank: e.rankSubject,
      };
    });
    return res.json({ success: true, results: rows });
  }

  const grouped = new Map();
  for (const e of entries) {
    const s = sessionMap.get(e.session.toString());
    const key = `${s.class._id}-${s.month}-${s.year}-${s.examType}-${e.student._id}`;
    const prev = grouped.get(key) || {
      student: e.student,
      class: s.class,
      month: s.month,
      year: s.year,
      examType: s.examType,
      totalObtained: 0,
      totalMax: 0,
      subjects: [],
    };
    prev.totalObtained += e.marksObtained;
    prev.totalMax += s.maxMarks;
    prev.subjects.push({ subject: s.subject, marksObtained: e.marksObtained, maxMarks: s.maxMarks });
    grouped.set(key, prev);
  }

  const rows = [...grouped.values()].map((r) => ({
    ...r,
    average: round2(r.totalObtained / Math.max(r.subjects.length, 1)),
    percentage: round2((r.totalObtained / Math.max(r.totalMax, 1)) * 100),
  }));
  const ranked = computeCompetitionRanks(rows, 'totalObtained').map((r) => ({ ...r, rank: r.rank }));
  res.json({ success: true, results: ranked });
});

export const downloadResults = asyncHandler(async (req, res) => {
  const fakeReq = { ...req, query: { ...req.query, rankingType: req.query.rankingType || 'overall' } };
  let payload = null;
  await getResults(fakeReq, {
    json: (data) => {
      payload = data;
    },
  });
  const results = payload?.results || [];
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Results');
  sheet.addRow(['Rank', 'Student', 'Roll No', 'Class', 'Exam Type', 'Month', 'Year', 'Total', 'Max', 'Percentage']);
  results.forEach((r) => {
    sheet.addRow([
      r.rank,
      r.student?.name,
      r.student?.rollNo,
      `${r.class?.className}-${r.class?.section}`,
      r.examType,
      r.month,
      r.year,
      r.totalObtained ?? r.marksObtained,
      r.totalMax ?? r.maxMarks,
      r.percentage,
    ]);
  });
  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="results.xlsx"');
  res.send(Buffer.from(buffer));
});

export const dashboardSummary = asyncHandler(async (req, res) => {
  if (req.user.role === 'admin') {
    const [teachers, students, classes, sessions, activities] = await Promise.all([
      User.countDocuments({ role: 'teacher', isActive: true }),
      Student.countDocuments({ isActive: true }),
      Class.countDocuments({ isActive: true }),
      ResultSession.countDocuments(),
      Activity.find().sort('-createdAt').limit(10).populate('actor', 'name'),
    ]);
    const topper = await getTopper();
    return res.json({ success: true, stats: { teachers, students, classes, sessions }, topper, recentActivities: activities });
  }
  const me = await User.findById(req.user._id).populate('assignedClasses', 'className section');
  const sessions = await ResultSession.find({ teacher: req.user._id }).sort('-createdAt').limit(6).lean();
  const topper = await getTopper({ teacher: req.user._id });
  const weak = await getWeakStudents(req.user._id);
  res.json({ success: true, assignedClasses: me.assignedClasses, sessions, topper, weakStudents: weak });
});

const getTopper = async (filter = {}) => {
  const sessions = await ResultSession.find(filter).lean();
  if (!sessions.length) return null;
  const entries = await MarkEntry.find({ session: { $in: sessions.map((s) => s._id) } }).populate('student', 'name rollNo').lean();
  if (!entries.length) return null;
  const best = [...entries].sort((a, b) => b.percentage - a.percentage)[0];
  return { student: best.student, percentage: best.percentage };
};

const getWeakStudents = async (teacherId) => {
  const sessions = await ResultSession.find({ teacher: teacherId }).lean();
  if (!sessions.length) return [];
  const entries = await MarkEntry.find({ session: { $in: sessions.map((s) => s._id) } }).populate('student', 'name rollNo').lean();
  return [...entries]
    .filter((e) => e.percentage < 40)
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 10)
    .map((e) => ({ student: e.student, percentage: e.percentage }));
};
