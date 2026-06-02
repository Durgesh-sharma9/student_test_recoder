import Class from '../models/Class.js';
import Student from '../models/Student.js';
import ResultSession from '../models/ResultSession.js';
import MarkEntry from '../models/MarkEntry.js';
import School from '../models/School.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { withSchool } from '../utils/tenantQuery.js';
import { MAIN_EXAM_TYPES } from '../utils/constants.js';
import PDFDocument from 'pdfkit';
import { formatDateDDMMYYYY } from '../utils/dateFormat.js';

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

export const getClassResults = asyncHandler(async (req, res) => {
  const { classId, examType, examTypes, reportType, testDate, dateFrom, dateTo, sessionId } = req.query;

  if (!classId) throw new ApiError(400, 'Class ID is required.');
  
  // Support both single examType and multiple examTypes
  const selectedExamTypes = examTypes ? examTypes.split(',') : (examType ? [examType] : []);
  if (selectedExamTypes.length === 0) throw new ApiError(400, 'At least one exam type is required.');

  const classDoc = await Class.findOne(withSchool(req, { _id: classId }));
  if (!classDoc) throw new ApiError(404, 'Class not found.');

  const school = await School.findById(req.user.school);

  // Build session filter if sessionId is provided
  const sessionFilter = sessionId ? { academicSession: sessionId } : {};

  // Handle multiple exam types - merge all assessments and sort by date
  if (selectedExamTypes.length > 1 || (selectedExamTypes.length === 1 && selectedExamTypes[0] !== 'Daily Test')) {
    // This is a combined report with date-wise ordering
    const allSessions = [];
    const hasDailyTest = selectedExamTypes.includes('Daily Test');
    const mainExamTypes = selectedExamTypes.filter(t => t !== 'Daily Test');

    // Fetch Daily Test sessions if selected
    if (hasDailyTest) {
      const dateFilter = { school: req.user.school, class: classId, category: 'daily', ...sessionFilter };
      
      if (testDate) {
        const startDate = new Date(testDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(testDate);
        endDate.setHours(23, 59, 59, 999);
        dateFilter.testDate = { $gte: startDate, $lte: endDate };
      } else if (dateFrom && dateTo) {
        const startDate = new Date(dateFrom);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        dateFilter.testDate = { $gte: startDate, $lte: endDate };
      }

      let dailySessions = await ResultSession.find(dateFilter).lean();
      
      // Fallback for old records without academicSession
      if (!dailySessions.length && sessionId) {
        dailySessions = await ResultSession.find({
          school: req.user.school,
          class: classId,
          category: 'daily',
          testDate: dateFilter.testDate,
        }).lean();
      }

      dailySessions.forEach(s => {
        allSessions.push({ ...s, category: 'daily', assessmentDate: s.testDate, examType: 'Daily Test' });
      });
    }

    // Fetch Main Exam sessions if selected
    for (const mainExamType of mainExamTypes) {
      if (!MAIN_EXAM_TYPES.includes(mainExamType)) continue;
      
      let mainSessions = await ResultSession.find({
        school: req.user.school,
        class: classId,
        category: 'main',
        examType: mainExamType,
        ...sessionFilter,
      }).lean();

      // Fallback for old records without academicSession
      if (!mainSessions.length && sessionId) {
        mainSessions = await ResultSession.find({
          school: req.user.school,
          class: classId,
          category: 'main',
          examType: mainExamType,
        }).lean();
      }

      mainSessions.forEach(s => {
        allSessions.push({ ...s, category: 'main', assessmentDate: s.examDate, examType: mainExamType });
      });
    }

    // Sort all sessions by assessment date
    allSessions.sort((a, b) => new Date(a.assessmentDate) - new Date(b.assessmentDate));

    if (!allSessions.length) {
      return res.json({
        success: true,
        schoolName: school?.schoolName || 'School',
        className: `${classDoc.className}-${classDoc.section}`,
        examType: selectedExamTypes.join(' + '),
        generatedDate: new Date().toISOString(),
        assessments: [],
        results: [],
      });
    }

    const sessionIds = allSessions.map(s => s._id);
    const entries = await MarkEntry.find({ session: { $in: sessionIds } })
      .populate('student', 'name rollNo')
      .lean();

    // Build student results with date-wise columns
    const studentMap = new Map();
    entries.forEach(entry => {
      const studentId = entry.student._id.toString();
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          studentId: entry.student._id,
          name: entry.student.name,
          rollNo: entry.student.rollNo,
          assessments: {},
          totalObtained: 0,
          totalMax: 0,
        });
      }
      const student = studentMap.get(studentId);
      const session = allSessions.find(s => s._id.toString() === entry.session.toString());
      if (session) {
        const key = `${session.examType}_${session._id}`;
        student.assessments[key] = {
          examType: session.examType,
          subject: session.subject,
          maxMarks: session.maxMarks,
          marksObtained: entry.marksObtained,
          percentage: entry.percentage,
          date: session.assessmentDate,
          category: session.category,
        };
        student.totalObtained += entry.marksObtained || 0;
        student.totalMax += session.maxMarks || 0;
      }
    });

    const results = Array.from(studentMap.values()).map(s => ({
      ...s,
      average: s.totalMax > 0 ? round2(s.totalObtained / s.totalMax) : 0,
      percentage: s.totalMax > 0 ? round2((s.totalObtained / s.totalMax) * 100) : 0,
    }));

    // Compute ranks
    const rankedResults = computeCompetitionRanks(results, 'totalObtained');

    return res.json({
      success: true,
      schoolName: school?.schoolName || 'School',
      className: `${classDoc.className}-${classDoc.section}`,
      examType: selectedExamTypes.join(' + '),
      generatedDate: new Date().toISOString(),
      assessments: allSessions.map(s => ({
        _id: s._id,
        examType: s.examType,
        subject: s.subject,
        maxMarks: s.maxMarks,
        date: s.assessmentDate,
        category: s.category,
      })),
      results: rankedResults,
    });
  }

  // Handle single Daily Test report (existing logic)
  if (reportType === 'daily' || (selectedExamTypes.length === 1 && selectedExamTypes[0] === 'Daily Test')) {
    // Build date filter
    const dateFilter = { school: req.user.school, class: classId, category: 'daily', ...sessionFilter };

    if (testDate) {
      const startDate = new Date(testDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(testDate);
      endDate.setHours(23, 59, 59, 999);
      dateFilter.testDate = { $gte: startDate, $lte: endDate };
    } else if (dateFrom && dateTo) {
      const startDate = new Date(dateFrom);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      dateFilter.testDate = { $gte: startDate, $lte: endDate };
    } else {
      throw new ApiError(400, 'Date filter is required for Daily Test reports.');
    }

    // Fetch daily test sessions
    let sessions = await ResultSession.find(dateFilter).lean();

    // Fallback: if no results with session filter and sessionId was provided, try without session filter for backward compatibility
    if (!sessions.length && sessionId) {
      const dateFilterWithoutSession = { school: req.user.school, class: classId, category: 'daily' };
      if (testDate) {
        const startDate = new Date(testDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(testDate);
        endDate.setHours(23, 59, 59, 999);
        dateFilterWithoutSession.testDate = { $gte: startDate, $lte: endDate };
      } else if (dateFrom && dateTo) {
        const startDate = new Date(dateFrom);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        dateFilterWithoutSession.testDate = { $gte: startDate, $lte: endDate };
      }
      sessions = await ResultSession.find(dateFilterWithoutSession).lean();
    }

    if (!sessions.length) {
      return res.json({
        success: true,
        schoolName: school?.schoolName || 'School',
        className: `${classDoc.className}-${classDoc.section}`,
        examType: 'Daily Test',
        generatedDate: new Date().toISOString(),
        dailyTests: [],
        results: [],
      });
    }

    // Sort sessions by date
    sessions.sort((a, b) => new Date(a.testDate) - new Date(b.testDate));

    const sessionIds = sessions.map((s) => s._id);
    const entries = await MarkEntry.find({ session: { $in: sessionIds } })
      .populate('student', 'name rollNo')
      .lean();

    // Get all students in the class
    const students = await Student.find({
      school: req.user.school,
      class: classId,
      isActive: true,
    }).sort('rollNo');
    students.sort((a, b) => Number(a.rollNo) - Number(b.rollNo));

    // Build daily test info
    const dailyTests = sessions.map((s, idx) => ({
      _id: s._id.toString(),
      name: `DT${idx + 1}`,
      testDate: s.testDate,
      subject: s.subject,
      maxMarks: s.maxMarks,
    }));

    // Build results with dynamic daily test columns
    const studentMap = new Map();
    students.forEach((student) => {
      studentMap.set(student._id.toString(), {
        studentId: student._id,
        rollNo: student.rollNo,
        name: student.name,
        dailyTests: {},
      });
    });

    // Populate marks for each student and daily test
    entries.forEach((entry) => {
      const studentId = entry.student._id.toString();
      const session = sessions.find((s) => s._id.toString() === entry.session.toString());
      if (session && studentMap.has(studentId)) {
        const student = studentMap.get(studentId);
        student.dailyTests[session._id.toString()] = {
          marksObtained: entry.marksObtained,
          maxMarks: session.maxMarks,
          percentage: entry.percentage,
        };
      }
    });

    // Calculate totals, averages, percentages
    const results = Array.from(studentMap.values()).map((student) => {
      const dtMarks = Object.values(student.dailyTests);
      const totalObtained = dtMarks.reduce((sum, m) => sum + m.marksObtained, 0);
      const totalMax = dtMarks.reduce((sum, m) => sum + m.maxMarks, 0);
      const average = dtMarks.length > 0 ? round2(totalObtained / dtMarks.length) : 0;
      const percentage = totalMax > 0 ? round2((totalObtained / totalMax) * 100) : 0;

      return {
        ...student,
        totalObtained,
        totalMax,
        average,
        percentage,
      };
    });

    // Assign ranks (equal marks get same rank)
    const rankedResults = computeCompetitionRanks(results, 'totalObtained');

    return res.json({
      success: true,
      schoolName: school?.schoolName || 'School',
      className: `${classDoc.className}-${classDoc.section}`,
      examType: 'Daily Test',
      generatedDate: new Date().toISOString(),
      dailyTests,
      results: rankedResults,
    });
  }

  // Handle single Main Exam report (existing logic)
  if (selectedExamTypes.length === 1 && MAIN_EXAM_TYPES.includes(selectedExamTypes[0])) {
    const examType = selectedExamTypes[0];

    // Fetch all sessions for this class and exam type
    let sessions = await ResultSession.find({
      school: req.user.school,
      class: classId,
      category: 'main',
      examType: examType,
      ...sessionFilter,
    }).lean();

    // Fallback: if no results with session filter and sessionId was provided, try without session filter for backward compatibility
    if (!sessions.length && sessionId) {
      sessions = await ResultSession.find({
        school: req.user.school,
        class: classId,
        category: 'main',
        examType: examType,
      }).lean();
    }

    if (!sessions.length) {
      return res.json({
        success: true,
        schoolName: school?.schoolName || 'School',
        className: `${classDoc.className}-${classDoc.section}`,
        examType,
        generatedDate: new Date().toISOString(),
        subjects: [],
        results: [],
      });
    }

    const sessionIds = sessions.map((s) => s._id);
    const entries = await MarkEntry.find({ session: { $in: sessionIds } })
      .populate('student', 'name rollNo')
      .lean();

    // Get unique subjects from actual exam data
    const uniqueSubjects = [...new Set(sessions.map((s) => s.subject))].sort();

    // Get all students in the class
    const students = await Student.find({
      school: req.user.school,
      class: classId,
      isActive: true,
    }).sort('rollNo');
    students.sort((a, b) => Number(a.rollNo) - Number(b.rollNo));

    // Build results with dynamic subject columns
    const studentMap = new Map();
    students.forEach((student) => {
      studentMap.set(student._id.toString(), {
        studentId: student._id,
        rollNo: student.rollNo,
        name: student.name,
        subjects: {},
      });
    });

    // Populate marks for each student and subject
    entries.forEach((entry) => {
      const studentId = entry.student._id.toString();
      const session = sessions.find((s) => s._id.toString() === entry.session.toString());
      if (session && studentMap.has(studentId)) {
        const student = studentMap.get(studentId);
        student.subjects[session.subject] = {
          marksObtained: entry.marksObtained,
          maxMarks: session.maxMarks,
          percentage: entry.percentage,
        };
      }
    });

    // Calculate totals, averages, percentages
    const results = Array.from(studentMap.values()).map((student) => {
      const subjectMarks = Object.values(student.subjects);
      const totalObtained = subjectMarks.reduce((sum, s) => sum + s.marksObtained, 0);
      const totalMax = subjectMarks.reduce((sum, s) => sum + s.maxMarks, 0);
      const average = subjectMarks.length > 0 ? round2(totalObtained / subjectMarks.length) : 0;
      const percentage = totalMax > 0 ? round2((totalObtained / totalMax) * 100) : 0;

      return {
        ...student,
        totalObtained,
        totalMax,
        average,
        percentage,
      };
    });

    // Assign ranks (equal marks get same rank)
    const rankedResults = computeCompetitionRanks(results, 'totalObtained');

    res.json({
      success: true,
      schoolName: school?.schoolName || 'School',
      className: `${classDoc.className}-${classDoc.section}`,
      examType,
      generatedDate: new Date().toISOString(),
      subjects: uniqueSubjects,
      results: rankedResults,
    });
  }
});

export const exportClassResultsPDF = asyncHandler(async (req, res) => {
  const { classId, examType } = req.query;

  if (!classId) throw new ApiError(400, 'Class ID is required.');
  if (!examType) throw new ApiError(400, 'Exam Type is required.');
  if (!MAIN_EXAM_TYPES.includes(examType)) {
    throw new ApiError(400, 'Invalid exam type.');
  }

  const classDoc = await Class.findOne(withSchool(req, { _id: classId }));
  if (!classDoc) throw new ApiError(404, 'Class not found.');

  const school = await School.findById(req.user.school);

  // Fetch all sessions for this class and exam type
  const sessions = await ResultSession.find({
    school: req.user.school,
    class: classId,
    category: 'main',
    examType: examType,
  }).lean();

  if (!sessions.length) {
    throw new ApiError(404, 'No results found for this class and exam type.');
  }

  const sessionIds = sessions.map((s) => s._id);
  const entries = await MarkEntry.find({ session: { $in: sessionIds } })
    .populate('student', 'name rollNo')
    .lean();

  // Get unique subjects from actual exam data
  const uniqueSubjects = [...new Set(sessions.map((s) => s.subject))].sort();

  // Get all students in the class
  const students = await Student.find({
    school: req.user.school,
    class: classId,
    isActive: true,
  }).sort('rollNo');
  students.sort((a, b) => Number(a.rollNo) - Number(b.rollNo));

  // Build results with dynamic subject columns
  const studentMap = new Map();
  students.forEach((student) => {
    studentMap.set(student._id.toString(), {
      studentId: student._id,
      rollNo: student.rollNo,
      name: student.name,
      subjects: {},
    });
  });

  // Populate marks for each student and subject
  entries.forEach((entry) => {
    const studentId = entry.student._id.toString();
    const session = sessions.find((s) => s._id.toString() === entry.session.toString());
    if (session && studentMap.has(studentId)) {
      const student = studentMap.get(studentId);
      student.subjects[session.subject] = {
        marksObtained: entry.marksObtained,
        maxMarks: session.maxMarks,
        percentage: entry.percentage,
      };
    }
  });

  // Calculate totals, averages, percentages
  const results = Array.from(studentMap.values()).map((student) => {
    const subjectMarks = Object.values(student.subjects);
    const totalObtained = subjectMarks.reduce((sum, s) => sum + s.marksObtained, 0);
    const totalMax = subjectMarks.reduce((sum, s) => sum + s.maxMarks, 0);
    const average = subjectMarks.length > 0 ? round2(totalObtained / subjectMarks.length) : 0;
    const percentage = totalMax > 0 ? round2((totalObtained / totalMax) * 100) : 0;

    return {
      ...student,
      totalObtained,
      totalMax,
      average,
      percentage,
    };
  });

  // Assign ranks (equal marks get same rank)
  const rankedResults = computeCompetitionRanks(results, 'totalObtained');

  // Generate PDF
  const landscape = uniqueSubjects.length > 6;
  const doc = new PDFDocument({
    margin: 36,
    size: 'A4',
    layout: landscape ? 'landscape' : 'portrait',
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=class-results-${examType}-${new Date().toISOString().split('T')[0]}.pdf`);
  doc.pipe(res);

  // Header
  doc.font('Helvetica-Bold').fontSize(14).text(school?.schoolName || 'School', { align: 'center' });
  doc.moveDown(0.4);
  doc.font('Helvetica').fontSize(10);
  doc.text(`Class: ${classDoc.className}-${classDoc.section}`, { align: 'center' });
  doc.text(`Exam Type: ${examType}`, { align: 'center' });
  doc.text(`Generated: ${formatDateDDMMYYYY(new Date())}`, { align: 'center' });
  doc.moveDown(0.6);
  doc.font('Helvetica-Bold').fontSize(13).text('CLASS RESULTS REPORT', { align: 'center' });
  doc.moveDown(0.8);

  // Table setup
  const headers = ['Rank', 'Roll No', 'Student Name', ...uniqueSubjects, 'Total', 'Average', 'Percentage'];
  const pageWidth = doc.page.width - 72;
  const colWidth = pageWidth / headers.length;
  const rowHeight = 18;
  const headerHeight = 22;
  let y = doc.y;

  const drawHeaderRow = () => {
    doc.fontSize(9).font('Helvetica-Bold');
    headers.forEach((h, i) => {
      doc.rect(36 + i * colWidth, y, colWidth, headerHeight).stroke();
      doc.text(String(h), 38 + i * colWidth, y + 5, { width: colWidth - 6, align: 'center' });
    });
    y += headerHeight;
  };

  const ensureSpace = (needed) => {
    const limit = doc.page.height - 56;
    if (y + needed > limit) {
      doc.addPage({ layout: landscape ? 'landscape' : 'portrait', margin: 36, size: 'A4' });
      y = 36;
      drawHeaderRow();
    }
  };

  drawHeaderRow();
  doc.font('Helvetica').fontSize(8);

  rankedResults.forEach((student) => {
    ensureSpace(rowHeight);
    const subjectMarks = uniqueSubjects.map((s) => student.subjects[s]?.marksObtained || '-');
    const row = [
      student.rank,
      student.rollNo,
      student.name,
      ...subjectMarks,
      student.totalObtained,
      student.average,
      `${student.percentage}%`,
    ];
    row.forEach((cell, i) => {
      doc.rect(36 + i * colWidth, y, colWidth, rowHeight).stroke();
      doc.text(String(cell ?? ''), 38 + i * colWidth, y + 4, {
        width: colWidth - 6,
        align: i === 0 ? 'left' : 'center',
      });
    });
    y += rowHeight;
  });

  // Footer
  const footerY = Math.min(doc.y + 28, doc.page.height - 48);
  const contentWidth = doc.page.width - 72;
  doc.font('Helvetica').fontSize(9);
  doc.text(`Total Students: ${rankedResults.length}`, 36, footerY, { width: contentWidth / 2, align: 'left' });
  doc.text('Generated By System', 36 + contentWidth / 2, footerY, { width: contentWidth / 2, align: 'right' });

  doc.end();
});
