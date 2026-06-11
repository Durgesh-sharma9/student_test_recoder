import Class from '../models/Class.js';
import Student from '../models/Student.js';
import User from '../models/User.js';
import ResultSession from '../models/ResultSession.js';
import MarkEntry from '../models/MarkEntry.js';
import Activity from '../models/Activity.js';
import AcademicSession from '../models/AcademicSession.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { withSchool } from '../utils/tenantQuery.js';
import { sendCsv, sendPdfTable, sendDailyTestCsv, sendDailyTestPdf, formatExportDate } from '../utils/exportService.js';
import { buildDailyTestExport } from '../utils/dailyTestExport.js';
import { OVERALL_EXAM_TYPES } from '../utils/constants.js';
import { checkTeacherAccess, normalizeSubject } from '../utils/subjectAccess.js';
import {
  startOfDay,
  endOfDay,
  normalizeStoredDate,
  findDailySession,
  findMainSession,
  buildMarksRows,
} from '../utils/sessionHelpers.js';

// Helper function to get active session
const getActiveSession = async (schoolId) => {
  let activeSession = await AcademicSession.findOne({
    school: schoolId,
    status: 'active'
  });
  
  if (!activeSession) {
    // Auto-create if doesn't exist
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
      status: 'active'
    });
  }
  
  return activeSession;
};

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

const recalcSubjectRanks = async (sessionId) => {
  const entries = await MarkEntry.find({ session: sessionId });
  const ranked = computeCompetitionRanks(
    entries.map((e) => ({ id: e._id.toString(), marks: e.marksObtained })),
    'marks'
  );
  for (const row of ranked) {
    await MarkEntry.findByIdAndUpdate(row.id, { rankSubject: row.rank });
  }
};

const schoolIdFromReq = (req) => req.user.school?._id ?? req.user.school;

export const previewMarksEntry = asyncHandler(async (req, res) => {
  const { classId, subject, category, testDate, examType, examDate, maxMarks } = req.query;
  const cat = category === 'main' ? 'main' : 'daily';

  if (!classId || !subject) throw new ApiError(400, 'Class and subject are required.');
  if (cat === 'daily' && !testDate) throw new ApiError(400, 'Test date is required.');
  if (cat === 'main' && (!examType || !examDate)) {
    throw new ApiError(400, 'Exam type and exam date are required.');
  }

  if (req.user.role === 'teacher') await checkTeacherAccess(req.user._id, classId, subject);

  const classDoc = await Class.findOne(withSchool(req, { _id: classId }));
  if (!classDoc?.isActive) throw new ApiError(404, 'Class not found.');

  const schoolId = schoolIdFromReq(req);
  let session =
    cat === 'daily'
      ? await findDailySession(schoolId, classId, subject, testDate)
      : await findMainSession(schoolId, classId, subject, examType, examDate);

  const rows = await buildMarksRows(session, classId, schoolId);

  res.json({
    success: true,
    existing: Boolean(session),
    session,
    rows,
    maxMarks: session?.maxMarks ?? (Number(maxMarks) || 100),
    message: session
      ? cat === 'daily'
        ? 'Existing Daily Test Loaded'
        : 'Existing Main Exam Loaded'
      : null,
  });
});

export const saveMarksEntry = asyncHandler(async (req, res) => {
  const {
    classId,
    subject,
    category,
    testDate,
    examType,
    examDate,
    maxMarks,
    entries,
    sessionId,
  } = req.body;
  const cat = category === 'main' ? 'main' : 'daily';

  if (!classId || !subject) throw new ApiError(400, 'Class and subject are required.');
  if (cat === 'daily' && !testDate) throw new ApiError(400, 'Test date is required.');
  if (cat === 'main' && (!examType || !examDate)) {
    throw new ApiError(400, 'Exam type and exam date are required.');
  }

  if (req.user.role === 'teacher') await checkTeacherAccess(req.user._id, classId, subject);

  const classDoc = await Class.findOne(withSchool(req, { _id: classId }));
  if (!classDoc?.isActive) throw new ApiError(404, 'Class not found.');

  const schoolId = schoolIdFromReq(req);
  const sub = normalizeSubject(subject);
  let session = sessionId
    ? await ResultSession.findOne(withSchool(req, { _id: sessionId }))
    : null;

  if (!session) {
    session =
      cat === 'daily'
        ? await findDailySession(schoolId, classId, sub, testDate)
        : await findMainSession(schoolId, classId, sub, examType, examDate);
  }

  if (!session) {
    // Get active session
    const activeSession = await getActiveSession(schoolId);
    
    session = await ResultSession.create({
      school: schoolId,
      academicSession: activeSession._id,
      class: classId,
      subject: sub,
      category: cat,
      examType: cat === 'daily' ? 'Daily Test' : examType,
      testDate: cat === 'daily' ? normalizeStoredDate(testDate) : undefined,
      examDate: cat === 'main' ? normalizeStoredDate(examDate) : undefined,
      maxMarks: Number(maxMarks) || 100,
      teacher: req.user._id,
    });
    await Activity.create({
      school: schoolId,
      actor: req.user._id,
      action: 'SESSION_CREATED',
      meta: { sessionId: session._id, category: cat },
    });
  } else {
    session.maxMarks = Number(maxMarks) || session.maxMarks;
    await session.save();
  }

  const classStudents = await Student.find({ class: classId, school: schoolId, isActive: true });
  const validStudentIds = new Set(classStudents.map((s) => s._id.toString()));

  for (const entry of entries || []) {
    if (!validStudentIds.has(String(entry.studentId))) continue;
    const isAbsent = entry.status === 'absent';

    const marks = isAbsent
      ? 0
      : Number(entry.marksObtained);

    if (
      !isAbsent &&
      (Number.isNaN(marks) ||
        marks < 0 ||
        marks > session.maxMarks)
    ) {
      throw new ApiError(
        400,
        'Marks cannot exceed maximum marks.'
      );
    }

    const percentage = round2(
      (marks / session.maxMarks) * 100
    );

    // DEBUG LOG
    console.log({
      studentId: entry.studentId,
      status: entry.status || 'present',
      marksObtained: marks
    });

    await MarkEntry.findOneAndUpdate(
      { session: session._id, student: entry.studentId },
      {
        session: session._id,
        academicSession: session.academicSession,
        student: entry.studentId,
        marksObtained: marks,
        percentage,
        status: entry.status || 'present',
        updatedBy: req.user._id,
      },
      { upsert: true, new: true }
    );
  }

  await recalcSubjectRanks(session._id);
  await Activity.create({
    school: schoolId,
    actor: req.user._id,
    action: 'MARKS_UPDATED',
    meta: { sessionId: session._id },
  });

  const rows = await buildMarksRows(session, classId, schoolId);

  res.json({
    success: true,
    message: 'Marks saved and ranks recalculated.',
    session,
    rows,
  });
});

export const saveMarks = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { entries } = req.body;
  const session = await ResultSession.findOne(withSchool(req, { _id: sessionId }));
  if (!session) throw new ApiError(404, 'Session not found.');
  if (req.user.role === 'teacher') await checkTeacherAccess(req.user._id, session.class, session.subject);

  const classStudents = await Student.find({ class: session.class, school: session.school, isActive: true });
  const validStudentIds = new Set(classStudents.map((s) => s._id.toString()));

  for (const entry of entries || []) {
    if (!validStudentIds.has(String(entry.studentId))) continue;

    // Handle absent status
    const isAbsent = entry.status === 'absent';
    const marksObtained = isAbsent ? 0 : entry.marksObtained;

    if (!isAbsent && (marksObtained < 0 || marksObtained > session.maxMarks)) {
      throw new ApiError(400, 'Marks cannot exceed maximum marks.');
    }
    const percentage = round2((marksObtained / session.maxMarks) * 100);

    // DEBUG LOG
    console.log({
      studentId: entry.studentId,
      status: entry.status || 'present',
      marksObtained
    });

    await MarkEntry.findOneAndUpdate(
      { session: session._id, student: entry.studentId },
      {
        session: session._id,
        student: entry.studentId,
        marksObtained,
        percentage,
        status: entry.status || 'present',
        updatedBy: req.user._id,
      },
      { upsert: true, new: true }
    );
  }

  await recalcSubjectRanks(session._id);
  await Activity.create({ school: session.school, actor: req.user._id, action: 'MARKS_UPDATED', meta: { sessionId } });
  res.json({ success: true, message: 'Marks saved and ranks recalculated.' });
});

export const getMarksEntryData = asyncHandler(async (req, res) => {
  const session = await ResultSession.findOne(withSchool(req, { _id: req.params.sessionId }));
  if (!session) throw new ApiError(404, 'Session not found.');
  if (req.user.role === 'teacher') await checkTeacherAccess(req.user._id, session.class, session.subject);

  const students = await Student.find({ class: session.class, school: session.school, isActive: true }).sort('rollNo');
  students.sort((a, b) => Number(a.rollNo) - Number(b.rollNo));
  const marks = await MarkEntry.find({ session: session._id });
  const map = new Map(marks.map((m) => [m.student.toString(), m]));

  res.json({
    success: true,
    session,
    rows: students.map((s) => ({
      studentId: s._id,
      rollNo: s.rollNo,
      name: s.name,
      gender: s.gender,
      marksObtained: map.get(s._id.toString())?.marksObtained ?? '',
      rankSubject: map.get(s._id.toString())?.rankSubject ?? null,
      percentage: map.get(s._id.toString())?.percentage ?? null,
      status: map.get(s._id.toString())?.status ?? 'present',
    })),
  });
});

export const getSessions = asyncHandler(async (req, res) => {
  const { classId, category, examType, examDate, subject, teacher, testDate, dateFrom, dateTo } = req.query;
  const filter = withSchool(req, {});
  if (classId) filter.class = classId;
  if (category) filter.category = category;
  if (examType) filter.examType = examType;
  if (subject) filter.subject = normalizeSubject(subject);
  if (teacher) filter.teacher = teacher;
  if (req.user.role === 'teacher') filter.teacher = req.user._id;

  if (examDate) {
    filter.examDate = { $gte: startOfDay(examDate), $lte: endOfDay(examDate) };
  }
  if (testDate) {
    filter.testDate = { $gte: startOfDay(testDate), $lte: endOfDay(testDate) };
  } else if (dateFrom || dateTo) {
    filter.testDate = {};
    if (dateFrom) filter.testDate.$gte = startOfDay(dateFrom);
    if (dateTo) filter.testDate.$lte = endOfDay(dateTo);
  }

  const sessions = await ResultSession.find(filter)
    .populate('class', 'className section')
    .populate('teacher', 'name email')
    .sort({ testDate: -1, createdAt: -1 });

  res.json({ success: true, sessions });
});

const buildResultRows = async (req, query) => {
  const {
    classId,
    category,
    examType,
    subject,
    teacher,
    testDate,
    dateFrom,
    dateTo,
    rankingType = 'subject',
    view = 'main',
  } = query;

  const sFilter = withSchool(req, {});
  if (classId) sFilter.class = classId;
  if (category) sFilter.category = category;
  if (examType) sFilter.examType = examType;
  if (subject) sFilter.subject = normalizeSubject(subject);
  if (teacher) sFilter.teacher = teacher;
  if (req.user.role === 'teacher') sFilter.teacher = req.user._id;

  if (view === 'daily' || category === 'daily') {
    sFilter.category = 'daily';
    if (testDate) sFilter.testDate = { $gte: startOfDay(testDate), $lte: endOfDay(testDate) };
    else if (dateFrom || dateTo) {
      sFilter.testDate = {};
      if (dateFrom) sFilter.testDate.$gte = startOfDay(dateFrom);
      if (dateTo) sFilter.testDate.$lte = endOfDay(dateTo);
    } else if (!dateFrom && !dateTo) {
      const today = new Date();
      sFilter.testDate = { $gte: startOfDay(today), $lte: endOfDay(today) };
    }
  }

  if (view === 'overall') {
    sFilter.category = 'main';
    sFilter.examType = { $in: OVERALL_EXAM_TYPES };
  }

  const { examDate } = query;
  if (examDate && (view === 'main' || category === 'main')) {
    sFilter.examDate = { $gte: startOfDay(examDate), $lte: endOfDay(examDate) };
  }

  const sessions = await ResultSession.find(sFilter).populate('class', 'className section').lean();
  const entries = await MarkEntry.find({ session: { $in: sessions.map((s) => s._id) } })
    .populate('student', 'name rollNo')
    .lean();
  const sessionMap = new Map(sessions.map((s) => [s._id.toString(), s]));

  if (view === 'overall') {
    const grouped = new Map();
    for (const e of entries) {
      const s = sessionMap.get(e.session.toString());
      const key = e.student._id.toString();
      const prev = grouped.get(key) || {
        student: e.student,
        class: s.class,
        totalObtained: 0,
        totalMax: 0,
        subjects: [],
      };
      prev.totalObtained += e.marksObtained;
      prev.totalMax += s.maxMarks;
      prev.subjects.push({ subject: s.subject, examType: s.examType, marksObtained: e.marksObtained, maxMarks: s.maxMarks });
      grouped.set(key, prev);
    }
    return computeCompetitionRanks(
      [...grouped.values()].map((r) => ({
        ...r,
        average: round2(r.totalObtained / Math.max(r.subjects.length, 1)),
        percentage: round2((r.totalObtained / Math.max(r.totalMax, 1)) * 100),
      })),
      'totalObtained'
    );
  }

  if (rankingType === 'overall' && view !== 'daily') {
    const grouped = new Map();
    for (const e of entries) {
      const s = sessionMap.get(e.session.toString());
      const key = `${e.student._id}-${s.examType}`;
      const prev = grouped.get(key) || {
        student: e.student,
        class: s.class,
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
    return computeCompetitionRanks(
      [...grouped.values()].map((r) => ({
        ...r,
        average: round2(r.totalObtained / Math.max(r.subjects.length, 1)),
        percentage: round2((r.totalObtained / Math.max(r.totalMax, 1)) * 100),
      })),
      'totalObtained'
    );
  }

  return entries.map((e) => {
    const s = sessionMap.get(e.session.toString());
    return {
      sessionId: s._id,
      class: s.class,
      subject: s.subject,
      examType: s.examType,
      testDate: s.testDate,
      examDate: s.examDate,
      student: e.student,
      marksObtained: e.marksObtained,
      maxMarks: s.maxMarks,
      percentage: e.percentage,
      rank: e.rankSubject,
    };
  });
};

const sortResults = (rows, sortBy) => {
  const list = [...rows];
  switch (sortBy) {
    case 'rollNo_asc':
      return list.sort((a, b) => String(a.student?.rollNo).localeCompare(String(b.student?.rollNo), undefined, { numeric: true }));
    case 'rollNo_desc':
      return list.sort((a, b) => String(b.student?.rollNo).localeCompare(String(a.student?.rollNo), undefined, { numeric: true }));
    case 'name_asc':
      return list.sort((a, b) => String(a.student?.name).localeCompare(String(b.student?.name)));
    case 'name_desc':
      return list.sort((a, b) => String(b.student?.name).localeCompare(String(a.student?.name)));
    case 'marks_asc':
      return list.sort((a, b) => (a.marksObtained ?? a.totalObtained) - (b.marksObtained ?? b.totalObtained));
    case 'rollNo':
      return list.sort((a, b) => String(a.student?.rollNo).localeCompare(String(b.student?.rollNo), undefined, { numeric: true }));
    case 'name':
      return list.sort((a, b) => String(a.student?.name).localeCompare(String(b.student?.name)));
    case 'marks_desc':
    default:
      return list.sort((a, b) => (b.marksObtained ?? a.totalObtained) - (a.marksObtained ?? b.totalObtained));
  }
};


export const getResults = asyncHandler(async (req, res) => {
  const { view, category, classId, subject, dateFrom, dateTo, testDate, sortBy, teacher } = req.query;
  
  // For daily test view with the new layout, return data in the format expected by the frontend
  if (view === 'daily' || category === 'daily') {
    const sFilter = withSchool(req, {});
    if (classId) sFilter.class = classId;
    if (subject) sFilter.subject = normalizeSubject(subject);
    // Apply teacher filter if provided (for admin viewing teacher results) or if user is teacher
    if (teacher) sFilter.teacher = teacher;
    else if (req.user.role === 'teacher') sFilter.teacher = req.user._id;
    sFilter.category = 'daily';

    // DEBUG LOGS - Detailed
    console.log('=== TEACHER RESULTS DEBUG ===');
    console.log('Teacher ID:', req.user._id);
    console.log('Teacher Name:', req.user.name);
    console.log('Class ID:', classId);
    console.log('Subject:', subject);
    console.log('Subject (normalized):', normalizeSubject(subject));
    console.log('Date From:', dateFrom);
    console.log('Date To:', dateTo);
    console.log('Test Date (specific):', testDate);
    console.log('Filter Object:', JSON.stringify(sFilter, null, 2));
    console.log('User Role:', req.user.role);

    // Handle date filtering - prioritize date range over specific date
    if (dateFrom || dateTo) {
      sFilter.testDate = {};
      if (dateFrom) {
        sFilter.testDate.$gte = startOfDay(dateFrom);
        console.log('Date From filter:', startOfDay(dateFrom));
      }
      if (dateTo) {
        sFilter.testDate.$lte = endOfDay(dateTo);
        console.log('Date To filter:', endOfDay(dateTo));
      }
    } else if (testDate) {
      sFilter.testDate = { $gte: startOfDay(testDate), $lte: endOfDay(testDate) };
      console.log('Using specific date filter:', sFilter.testDate);
    } else if (!dateFrom && !dateTo) {
      const today = new Date();
      sFilter.testDate = { $gte: startOfDay(today), $lte: endOfDay(today) };
      console.log('Using today filter:', sFilter.testDate);
    }

    console.log('Final Filter:', JSON.stringify(sFilter, null, 2));

    // Fetch all matching test sessions - NO LIMIT, NO findOne
    console.log('Executing query to find ALL matching sessions...');
    const sessions = await ResultSession.find(sFilter)
      .populate('class', 'className section')
      .populate('teacher', 'name')
      .sort({ testDate: 1 })
      .lean();

    console.log('Tests Found Count:', sessions.length);
    console.log('TEST DATES:');
    sessions.forEach((t, idx) => {
      console.log(`  ${idx + 1}. ${t.testDate} - ${t.subject} - Teacher: ${t.teacher?.name}`);
    });
    console.log('Full Tests Array:', JSON.stringify(sessions, null, 2));

    if (!sessions.length) {
      console.log('No tests found, returning empty result');
      return res.json({ 
        success: true, 
        results: [], 
        tests: [],
        className: '',
        section: ''
      });
    }

    // Get class info
    const classDoc = await Class.findById(sessions[0].class._id).lean();
    
    // Get all students in the class
    const students = await Student.find({ 
      class: sessions[0].class._id, 
      school: req.user.school, 
      isActive: true 
    }).sort('rollNo').lean();
    
    console.log('Students Count:', students.length);
    
    // Get all mark entries for these sessions
    const sessionIds = sessions.map(s => s._id);
    const entries = await MarkEntry.find({ session: { $in: sessionIds } }).lean();
    
    console.log('Mark Entries Count:', entries.length);
    
    // Build test info array
    const tests = sessions.map(s => ({
      _id: s._id,
      testDate: s.testDate,
      subject: s.subject,
      maxMarks: s.maxMarks,
      teacherName: s.teacher?.name || 'Unknown'
    }));

    console.log('Tests Array for Response:', JSON.stringify(tests, null, 2));

    // Build student results with test marks
    const results = students.map(student => {
      const testMarks = {};
      let totalObtained = 0;
      let totalMax = 0;

      sessions.forEach(session => {
        const entry = entries.find(e => 
          e.session.toString() === session._id.toString() && 
          e.student.toString() === student._id.toString()
        );
        testMarks[session._id.toString()] = entry ? {
          marksObtained: entry.marksObtained,
          status: entry.status || 'present'
        } : null;
        
        if (entry) {
          totalObtained += entry.marksObtained;
          totalMax += session.maxMarks;
        }
      });

      const average = sessions.length > 0 ? round2(totalObtained / sessions.length) : 0;
      const percentage = totalMax > 0 ? round2((totalObtained / totalMax) * 100) : 0;

      return {
        _id: student._id,
        student,
        totalObtained,
        average,
        percentage,
        rank: 0, // Will be calculated after sorting
        testMarks
      };
    });

    // Calculate ranks based on total obtained
    const ranked = computeCompetitionRanks(results, 'totalObtained');
    
    // Sort results based on sortBy parameter
    let sortedResults = ranked;
    if (sortBy === 'rollNo') {
      sortedResults = [...ranked].sort((a, b) => String(a.student.rollNo).localeCompare(String(b.student.rollNo), undefined, { numeric: true }));
    } else if (sortBy === 'name') {
      sortedResults = [...ranked].sort((a, b) => a.student.name.localeCompare(b.student.name));
    } else if (sortBy === 'rank') {
      sortedResults = [...ranked].sort((a, b) => a.rank - b.rank);
    }

    console.log('Final Results Count:', sortedResults.length);
    console.log('Tests in Response:', tests.length);
    console.log('=== END DEBUG ===');

    return res.json({
      success: true,
      results: sortedResults,
      tests,
      className: classDoc?.className || '',
      section: classDoc?.section || ''
    });
  }

  // For main exam and overall views, use the original logic
  let rows = await buildResultRows(req, req.query);
  if (Array.isArray(rows) && rows[0]?.rank !== undefined && req.query.view === 'daily') {
    rows = sortResults(rows, req.query.sortBy);
  } else if (Array.isArray(rows) && rows[0]?.percentage !== undefined) {
    rows = sortResults(rows, req.query.sortBy);
  } else {
    rows = sortResults(rows, req.query.sortBy);
  }
  res.json({ success: true, results: rows });
});

export const downloadResults = asyncHandler(async (req, res) => {
  const format = req.query.format || 'csv';
  const view = req.query.view || req.query.category;

  // For daily test view with the new layout, export all tests in range
  if (view === 'daily' || req.query.category === 'daily') {
    const { classId, subject, dateFrom, dateTo, testDate, sortBy, teacher } = req.query;
    
    const sFilter = withSchool(req, {});
    if (classId) sFilter.class = classId;
    if (subject) sFilter.subject = normalizeSubject(subject);
    // Apply teacher filter if provided (for admin viewing teacher results) or if user is teacher
    if (teacher) sFilter.teacher = teacher;
    else if (req.user.role === 'teacher') sFilter.teacher = req.user._id;
    sFilter.category = 'daily';

    // Handle date filtering - prioritize date range over specific date
    if (dateFrom || dateTo) {
      sFilter.testDate = {};
      if (dateFrom) sFilter.testDate.$gte = startOfDay(dateFrom);
      if (dateTo) sFilter.testDate.$lte = endOfDay(dateTo);
    } else if (testDate) {
      sFilter.testDate = { $gte: startOfDay(testDate), $lte: endOfDay(testDate) };
    } else if (!dateFrom && !dateTo) {
      const today = new Date();
      sFilter.testDate = { $gte: startOfDay(today), $lte: endOfDay(today) };
    }

    // Fetch all matching test sessions
    const sessions = await ResultSession.find(sFilter)
      .populate('class', 'className section')
      .populate('teacher', 'name')
      .sort({ testDate: 1 })
      .lean();

    if (!sessions.length) {
      throw new ApiError(404, 'No tests found for the selected criteria.');
    }

    // Get class info
    const classDoc = await Class.findById(sessions[0].class._id).lean();
    const school = await School.findById(req.user.school).lean();
    
    // Get all students in the class
    const students = await Student.find({ 
      class: sessions[0].class._id, 
      school: req.user.school, 
      isActive: true 
    }).sort('rollNo').lean();
    
    // Get all mark entries for these sessions
    const sessionIds = sessions.map(s => s._id);
    const entries = await MarkEntry.find({ session: { $in: sessionIds } }).lean();
    
    // Build test info array
    const tests = sessions.map(s => ({
      _id: s._id,
      testDate: s.testDate,
      subject: s.subject,
      maxMarks: s.maxMarks,
      teacherName: s.teacher?.name || 'Unknown'
    }));

    // Build student results with test marks
    const results = students.map(student => {
      const testMarks = {};
      let totalObtained = 0;
      let totalMax = 0;

      sessions.forEach(session => {
        const entry = entries.find(e => 
          e.session.toString() === session._id.toString() && 
          e.student.toString() === student._id.toString()
        );
        testMarks[session._id.toString()] = entry ? {
          marksObtained: entry.marksObtained,
          status: entry.status || 'present'
        } : null;
        
        if (entry) {
          totalObtained += entry.marksObtained;
          totalMax += session.maxMarks;
        }
      });

      const average = sessions.length > 0 ? round2(totalObtained / sessions.length) : 0;
      const percentage = totalMax > 0 ? round2((totalObtained / totalMax) * 100) : 0;

      return {
        _id: student._id,
        student,
        totalObtained,
        average,
        percentage,
        rank: 0,
        testMarks
      };
    });

    // Calculate ranks based on total obtained
    const ranked = computeCompetitionRanks(results, 'totalObtained');
    
    // Sort results based on sortBy parameter
    let sortedResults = ranked;
    if (sortBy === 'rollNo') {
      sortedResults = [...ranked].sort((a, b) => String(a.student.rollNo).localeCompare(String(b.student.rollNo), undefined, { numeric: true }));
    } else if (sortBy === 'name') {
      sortedResults = [...ranked].sort((a, b) => a.student.name.localeCompare(b.student.name));
    } else if (sortBy === 'rank') {
      sortedResults = [...ranked].sort((a, b) => a.rank - b.rank);
    }

    // Build CSV headers
    const headers = ['School Name', 'Class', 'Subject', 'Teacher Name', 'Date Range', 'Generated On'];
    const dateRangeStr = dateFrom && dateTo 
      ? `${new Date(dateFrom).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} - ${new Date(dateTo).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
      : testDate 
        ? new Date(testDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'N/A';
    
    const headerRow = [
      school?.name || 'N/A',
      `Class ${classDoc?.className || ''} ${classDoc?.section || ''}`,
      subject || 'All',
      req.user.name || 'N/A',
      dateRangeStr,
      new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    ];

    // Build data headers
    const dataHeaders = ['Total', 'Average', '%', 'Rank', 'Roll No', 'Student Name'];
    tests.forEach((test, idx) => {
      dataHeaders.push(`DT${idx + 1} Max`, `DT${idx + 1} Obtained`);
    });

    // Build data rows
    const dataRows = sortedResults.map(r => {
      const row = [
        r.totalObtained,
        r.average,
        r.percentage,
        r.rank,
        r.student.rollNo,
        r.student.name
      ];
      tests.forEach(test => {
        const mark = r.testMarks[test._id.toString()];
        const displayValue = mark && mark.status === 'absent' ? 'A' : (mark ? mark.marksObtained : '');
        row.push(test.maxMarks, displayValue);
      });
      return row;
    });

    const filename = `teacher-results.${format === 'pdf' ? 'pdf' : 'csv'}`;
    
    if (format === 'pdf') {
      return sendPdfTable(res, filename, 'Teacher Results Report', [headers, headerRow, dataHeaders], dataRows);
    }
    
    const csvContent = [
      headers.join(','),
      headerRow.join(','),
      '',
      dataHeaders.join(','),
      ...dataRows.map(row => row.join(','))
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
    return;
  }

  // For main exam and overall views, use the original logic
  let rows = await buildResultRows(req, req.query);
  rows = sortResults(rows, req.query.sortBy);
  const headers = ['Rank', 'Roll No', 'Student Name', 'Class', 'Subject', 'Exam Type', 'Test Date', 'Exam Date', 'Obtained', 'Max', 'Percentage'];
  const data = rows.map((r) => [
    r.rank ?? '-',
    r.student?.rollNo,
    r.student?.name,
    r.class ? `${r.class.className}-${r.class.section}` : '-',
    r.subject ?? '-',
    r.examType ?? '-',
    r.testDate ? formatExportDate(r.testDate) : '-',
    r.examDate ? formatExportDate(r.examDate) : '-',
    r.marksObtained ?? r.totalObtained,
    r.maxMarks ?? r.totalMax,
    r.percentage != null ? `${r.percentage}%` : '-',
  ]);

  const filename = `results.${format === 'pdf' ? 'pdf' : 'csv'}`;
  if (format === 'pdf') return sendPdfTable(res, filename, 'Results Report', headers, data);
  return sendCsv(res, filename, headers, data);
});

export const dashboardSummary = asyncHandler(async (req, res) => {
  const schoolFilter = withSchool(req, {});

  if (req.user.role === 'school_admin' || req.user.role === 'admin') {
    const [teachers, students, classes, sessions, activities, classPerformance] = await Promise.all([
      User.countDocuments({ ...schoolFilter, role: 'teacher', isActive: true }),
      Student.countDocuments({ ...schoolFilter, isActive: true }),
      Class.countDocuments({ ...schoolFilter, isActive: true }),
      ResultSession.countDocuments(schoolFilter),
      Activity.find(schoolFilter).sort('-createdAt').limit(10).populate('actor', 'name'),
      getClassPerformance(schoolFilter),
    ]);
    return res.json({ success: true, stats: { teachers, students, classes, sessions }, classPerformance, recentActivities: activities });
  }

  const me = await User.findById(req.user._id)
    .populate('assignedClasses', 'className section')
    .populate('assignments.class', 'className section')
    .populate('assignments.academicSession', 'name');
  const assignedClassIds = (me.assignedClasses || []).map((c) => c._id);
  
  // Build assignment details from assignments array if available, otherwise from assignedClasses
  let assignmentDetails = [];
  if (me.assignments && me.assignments.length > 0) {
    assignmentDetails = me.assignments.map((a) => ({
      classId: (a.class?._id || a.class)?.toString(),
      className: a.class?.className,
      section: a.class?.section,
      subject: normalizeSubject(a.subject),
      academicSession: a.academicSession?.name || 'N/A',
    }));
  } else if (me.assignedClasses && me.assignedClasses.length > 0) {
    // Fallback: if assignments array is empty, use assignedClasses
    assignmentDetails = me.assignedClasses.map((c) => ({
      classId: c._id?.toString(),
      className: c.className,
      section: c.section,
      subject: 'Assigned',
      academicSession: 'N/A',
    }));
  }
  
  const subjectCount = new Set(assignmentDetails.map((a) => a.subject)).size;

  const [students, sessions, pendingSessions] = await Promise.all([
    Student.countDocuments({ class: { $in: assignedClassIds }, isActive: true }),
    ResultSession.countDocuments({ teacher: req.user._id }),
    ResultSession.countDocuments({ teacher: req.user._id }).then(async (count) => {
      const withMarks = await MarkEntry.distinct('session', { updatedBy: req.user._id });
      return Math.max(0, count - withMarks.length);
    }),
  ]);

  const recentActivities = await Activity.find({ school: req.user.school, actor: req.user._id })
    .sort('-createdAt')
    .limit(8)
    .populate('actor', 'name');

  const topper = await getTopper({ teacher: req.user._id });
  const weak = await getWeakStudents(req.user._id);

  res.json({
    success: true,
    stats: {
      assignedClasses: assignedClassIds.length,
      assignedSubjects: subjectCount,
      students,
      testsConducted: sessions,
      pendingEntries: pendingSessions,
    },
    assignedClasses: me.assignedClasses,
    assignmentDetails,
    topper,
    weakStudents: weak,
    recentActivities,
  });
});

const getTopper = async (filter = {}) => {
  const sessions = await ResultSession.find(filter).lean();
  if (!sessions.length) return null;
  const entries = await MarkEntry.find({ session: { $in: sessions.map((s) => s._id) } })
    .populate('student', 'name rollNo')
    .lean();
  if (!entries.length) return null;
  const best = [...entries].sort((a, b) => b.percentage - a.percentage)[0];
  return { student: best.student, percentage: best.percentage };
};

const getWeakStudents = async (teacherId) => {
  const sessions = await ResultSession.find({ teacher: teacherId }).lean();
  if (!sessions.length) return [];
  const entries = await MarkEntry.find({ session: { $in: sessions.map((s) => s._id) } })
    .populate('student', 'name rollNo')
    .lean();
  return [...entries]
    .filter((e) => e.percentage < 40)
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 10)
    .map((e) => ({ student: e.student, percentage: e.percentage }));
};

const getClassPerformance = async (schoolFilter) => {
  const classes = await Class.find(schoolFilter).lean();
  if (!classes.length) return [];

  const performance = await Promise.all(
    classes.map(async (cls) => {
      const students = await Student.find({
        school: cls.school,
        class: cls._id,
        isActive: true,
      }).lean();

      if (!students.length) {
        return {
          classId: cls._id,
          className: cls.className,
          section: cls.section,
          studentCount: 0,
          averagePercentage: 0,
          topStudent: null,
          topStudentPercentage: 0,
        };
      }

      const sessions = await ResultSession.find({
        school: cls.school,
        class: cls._id,
      }).lean();

      if (!sessions.length) {
        return {
          classId: cls._id,
          className: cls.className,
          section: cls.section,
          studentCount: students.length,
          averagePercentage: 0,
          topStudent: null,
          topStudentPercentage: 0,
        };
      }

      const sessionIds = sessions.map((s) => s._id);
      const entries = await MarkEntry.find({
        session: { $in: sessionIds },
      })
        .populate('student', 'name rollNo')
        .lean();

      if (!entries.length) {
        return {
          classId: cls._id,
          className: cls.className,
          section: cls.section,
          studentCount: students.length,
          averagePercentage: 0,
          topStudent: null,
          topStudentPercentage: 0,
        };
      }

      const studentPercentages = new Map();
      entries.forEach((entry) => {
        const studentId = entry.student._id.toString();
        if (!studentPercentages.has(studentId)) {
          studentPercentages.set(studentId, { total: 0, count: 0, student: entry.student });
        }
        const data = studentPercentages.get(studentId);
        data.total += entry.percentage;
        data.count += 1;
      });

      const studentAverages = Array.from(studentPercentages.values()).map((data) => ({
        ...data.student,
        averagePercentage: data.count > 0 ? round2(data.total / data.count) : 0,
      }));

      const classAverage = studentAverages.length > 0
        ? round2(studentAverages.reduce((sum, s) => sum + s.averagePercentage, 0) / studentAverages.length)
        : 0;

      const topStudent = studentAverages.length > 0
        ? [...studentAverages].sort((a, b) => b.averagePercentage - a.averagePercentage)[0]
        : null;

      return {
        classId: cls._id,
        className: cls.className,
        section: cls.section,
        studentCount: students.length,
        averagePercentage: classAverage,
        topStudent: topStudent?.name || null,
        topStudentPercentage: topStudent?.averagePercentage || 0,
      };
    })
  );

  return performance.sort((a, b) => b.averagePercentage - a.averagePercentage);
};
