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

    // Get all students in the class as the base dataset
    const students = await Student.find({
      school: req.user.school,
      class: classId,
      isActive: true,
    }).sort('rollNo');
    students.sort((a, b) => Number(a.rollNo) - Number(b.rollNo));

    // Build student results with date-wise columns - base from Student collection
    const studentMap = new Map();
    students.forEach(student => {
      studentMap.set(student._id.toString(), {
        studentId: student._id,
        name: student.name,
        rollNo: student.rollNo,
        admissionDate: student.admissionDate,
        assessments: {},
        totalObtained: 0,
        totalMax: 0,
      });
    });

    // Merge marks from entries into student rows
    entries.forEach(entry => {
      const studentId = entry.student._id.toString();
      const student = studentMap.get(studentId);
      if (student) {
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
            status: entry.status || 'present'
          };
          student.totalObtained += entry.marksObtained || 0;
          student.totalMax += session.maxMarks || 0;
          // DEBUG LOG for absent students
          if (entry.status === 'absent') {
            console.log(`=== CLASS RESULTS ASSESSMENTS DEBUG ===`);
            console.log(`Student Name: ${entry.student.name}`);
            console.log(`Marks: ${entry.marksObtained}`);
            console.log(`Status: ${entry.status}`);
            console.log(`Session: ${session.subject} - ${session.assessmentDate}`);
            console.log(`======================================`);
          }
        }
      }
    });

    // Apply admission date logic for each assessment
    studentMap.forEach((student, studentId) => {
      const admissionDate = student.admissionDate ? new Date(student.admissionDate) : null;
      allSessions.forEach(session => {
        const key = `${session.examType}_${session._id}`;
        const assessmentDate = session.assessmentDate ? new Date(session.assessmentDate) : null;
        
        // If student has no marks for this assessment, check admission date
        if (!student.assessments[key] && admissionDate && assessmentDate && admissionDate > assessmentDate) {
          student.assessments[key] = {
            examType: session.examType,
            subject: session.subject,
            maxMarks: session.maxMarks,
            marksObtained: null,
            percentage: null,
            date: session.assessmentDate,
            category: session.category,
            status: 'not_admitted_yet'
          };
        }
      });
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
          status: entry.status || 'present'
        };
        // DEBUG LOG for absent students
        if (entry.status === 'absent') {
          console.log(`=== CLASS RESULTS DAILY TESTS DEBUG ===`);
          console.log(`Student Name: ${entry.student.name}`);
          console.log(`Marks: ${entry.marksObtained}`);
          console.log(`Status: ${entry.status}`);
          console.log(`Session: ${session.subject} - ${session.testDate}`);
          console.log(`=======================================`);
        }
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
          status: entry.status || 'present'
        };
        // DEBUG LOG for absent students
        if (entry.status === 'absent') {
          console.log(`=== CLASS RESULTS MAIN EXAMS DEBUG ===`);
          console.log(`Student Name: ${entry.student.name}`);
          console.log(`Marks: ${entry.marksObtained}`);
          console.log(`Status: ${entry.status}`);
          console.log(`Session: ${session.subject} - ${session.examDate}`);
          console.log(`======================================`);
        }
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
  const { classId, examTypes, reportType, testDate, dateFrom, dateTo } = req.query;

  if (!classId) throw new ApiError(400, 'Class ID is required.');
  if (!examTypes) throw new ApiError(400, 'Exam Types are required.');

  const classDoc = await Class.findOne(withSchool(req, { _id: classId }));
  if (!classDoc) throw new ApiError(404, 'Class not found.');

  const school = await School.findById(req.user.school);
  const examTypesArray = examTypes.split(',');

  // Check if Daily Test is included
  const isDailyTest = examTypesArray.includes('Daily Test');

  let results, headers, rows, meta;

  if (isDailyTest && reportType === 'daily') {
    // Handle Daily Test export
    const sFilter = withSchool(req, { class: classId, category: 'daily' });

    // Apply date filters
    if (testDate) {
      sFilter.testDate = { $gte: startOfDay(testDate), $lte: endOfDay(testDate) };
    } else if (dateFrom && dateTo) {
      sFilter.testDate = { $gte: startOfDay(dateFrom), $lte: endOfDay(dateTo) };
    }

    const sessions = await ResultSession.find(sFilter)
      .populate('class', 'className section')
      .populate('teacher', 'name')
      .sort({ testDate: 1 })
      .lean();

    if (!sessions.length) {
      throw new ApiError(404, 'No daily tests found for the selected criteria.');
    }

    const students = await Student.find({
      class: classId,
      school: req.user.school,
      isActive: true
    }).sort('rollNo').lean();

    const sessionIds = sessions.map(s => s._id);
    const entries = await MarkEntry.find({ session: { $in: sessionIds } }).lean();

    // Build results
    const studentResults = students.map(student => {
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

    // Calculate ranks
    const rankedResults = computeCompetitionRanks(studentResults, 'totalObtained');

    // Get top 3 students
    const top3Students = rankedResults.slice(0, 3).map(r => ({
      name: r.student.name,
      percentage: r.percentage,
      rank: r.rank
    }));

    // Build headers
    headers = ['Total', 'Average', '%', 'Rank', 'Roll No', 'Student Name'];
    sessions.forEach((test, idx) => {
      headers.push(`DT${idx + 1} Max`, `DT${idx + 1} Obtained`);
    });

    // Build rows
    rows = rankedResults.map(r => {
      const row = [r.totalObtained, r.average, r.percentage, r.rank, r.student.rollNo, r.student.name];
      sessions.forEach(test => {
        const mark = r.testMarks[test._id.toString()];
        const displayValue = mark && mark.status === 'absent' ? 'A' : (mark ? mark.marksObtained : '');
        row.push(test.maxMarks, displayValue);
      });
      return row;
    });

    // Build meta
    const dateStr = testDate
      ? formatDateDDMMYYYY(testDate)
      : dateFrom && dateTo
        ? `${formatDateDDMMYYYY(dateFrom)} to ${formatDateDDMMYYYY(dateTo)}`
        : 'N/A';

    meta = {
      schoolName: school?.schoolName || 'School',
      examType: 'Daily Test',
      classLabel: `Class ${classDoc.className} ${classDoc.section || ''}`,
      subject: 'All Subjects',
      testDate: testDate ? formatDateDDMMYYYY(testDate) : undefined,
      dateFrom: dateFrom ? formatDateDDMMYYYY(dateFrom) : undefined,
      dateTo: dateTo ? formatDateDDMMYYYY(dateTo) : undefined,
      generatedAt: formatDateDDMMYYYY(new Date()),
      generatedBy: req.user.name || 'System',
      totalStudents: rankedResults.length,
      top3Students
    };
  } else {
    // Handle Main Exam export
    const validExamTypes = examTypesArray.filter(t => MAIN_EXAM_TYPES.includes(t));
    if (!validExamTypes.length) {
      throw new ApiError(400, 'No valid exam types provided.');
    }

    const sessions = await ResultSession.find({
      school: req.user.school,
      class: classId,
      category: 'main',
      examType: { $in: validExamTypes }
    }).lean();

    if (!sessions.length) {
      throw new ApiError(404, 'No results found for this class and exam type.');
    }

    const sessionIds = sessions.map((s) => s._id);
    const entries = await MarkEntry.find({ session: { $in: sessionIds } })
      .populate('student', 'name rollNo')
      .lean();

    const uniqueSubjects = [...new Set(sessions.map((s) => s.subject))].sort();

    const students = await Student.find({
      school: req.user.school,
      class: classId,
      isActive: true,
    }).sort('rollNo');
    students.sort((a, b) => Number(a.rollNo) - Number(b.rollNo));

    const studentMap = new Map();
    students.forEach((student) => {
      studentMap.set(student._id.toString(), {
        studentId: student._id,
        rollNo: student.rollNo,
        name: student.name,
        subjects: {},
      });
    });

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

    const resultsArray = Array.from(studentMap.values()).map((student) => {
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

    const rankedResults = computeCompetitionRanks(resultsArray, 'totalObtained');

    // Get top 3 students
    const top3Students = rankedResults.slice(0, 3).map(r => ({
      name: r.name,
      percentage: r.percentage,
      rank: r.rank
    }));

    headers = ['Rank', 'Roll No', 'Student Name', ...uniqueSubjects, 'Total', 'Average', 'Percentage'];
    rows = rankedResults.map((r) => {
      const subjectMarks = uniqueSubjects.map((s) => r.subjects[s]?.marksObtained || '-');
      return [
        r.rank,
        r.rollNo,
        r.name,
        ...subjectMarks,
        r.totalObtained,
        r.average,
        r.percentage,
      ];
    });

    meta = {
      schoolName: school?.schoolName || 'School',
      examType: validExamTypes.join(', '),
      classLabel: `Class ${classDoc.className} ${classDoc.section || ''}`,
      subject: 'All Subjects',
      generatedAt: formatDateDDMMYYYY(new Date()),
      generatedBy: req.user.name || 'System',
      totalStudents: rankedResults.length,
      top3Students
    };
  }

  // Generate PDF using professional format
  const landscape = headers.length > 8;
  const doc = new PDFDocument({
    margin: 36,
    size: 'A4',
    layout: landscape ? 'landscape' : 'portrait',
  });

  res.setHeader('Content-Type', 'application/pdf');
  const filename = `class-results-${examTypesArray.join('-')}-${new Date().toISOString().split('T')[0]}.pdf`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  // Professional Header
  doc.font('Helvetica-Bold').fontSize(16).text(meta.schoolName, { align: 'center' });
  doc.moveDown(0.3);

  doc.font('Helvetica').fontSize(11);
  doc.text(`Exam Type: ${meta.examType}`, { align: 'center' });
  doc.text(`Class: ${meta.classLabel}`, { align: 'center' });
  doc.text(`Subject: ${meta.subject}`, { align: 'center' });
  if (meta.testDate) {
    doc.text(`Date: ${meta.testDate}`, { align: 'center' });
  } else if (meta.dateFrom && meta.dateTo) {
    doc.text(`Date Range: ${meta.dateFrom} to ${meta.dateTo}`, { align: 'center' });
  }
  doc.moveDown(0.4);

  // Draw separator line
  doc.moveTo(36, doc.y)
     .lineTo(doc.page.width - 36, doc.y)
     .stroke();
  doc.moveDown(0.4);

  // Table title
  doc.font('Helvetica-Bold').fontSize(13).text('CLASS RESULTS REPORT', { align: 'center' });
  doc.moveDown(0.6);

  // Draw table
  drawPdfTable(doc, headers, rows, landscape);

  // Top 3 Students section
  if (meta.top3Students && meta.top3Students.length > 0) {
    doc.moveDown(1);
    doc.font('Helvetica-Bold').fontSize(12).text('Top 3 Students', { align: 'center' });
    doc.moveDown(0.4);

    meta.top3Students.forEach((student, idx) => {
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
      doc.font('Helvetica').fontSize(10).text(
        `${medal} Rank ${student.rank}: ${student.name} - ${student.percentage}%`,
        { align: 'center' }
      );
    });
  }

  // Professional Footer
  const footerY = Math.min(doc.y + 32, doc.page.height - 48);
  const contentWidth = doc.page.width - 72;

  // Draw separator line
  doc.moveTo(36, footerY - 8)
     .lineTo(doc.page.width - 36, footerY - 8)
     .stroke();

  doc.font('Helvetica').fontSize(9);
  doc.text(`Generated On: ${meta.generatedAt}`, 36, footerY, { width: contentWidth / 2, align: 'left' });
  doc.text(`Generated By: ${meta.generatedBy}`, 36 + contentWidth / 2, footerY, { width: contentWidth / 2, align: 'right' });
  doc.text(`Total Students: ${meta.totalStudents}`, 36, footerY + 12, { width: contentWidth / 2, align: 'left' });

  doc.end();
});
