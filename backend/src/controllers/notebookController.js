import NotebookCheck from '../models/NotebookCheck.js';
import Student from '../models/Student.js';
import User from '../models/User.js';
import Class from '../models/Class.js';
import AcademicSession from '../models/AcademicSession.js';
import Parent from '../models/Parent.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import ExcelJS from 'exceljs';

const getActiveSession = async (schoolId) => {
  const session = await AcademicSession.findOne({ school: schoolId, status: 'active' });
  if (!session) throw new ApiError(404, 'No active academic session found.');
  return session;
};

// ==========================================
// TEACHER FLOW
// ==========================================

export const getNotebookGrid = asyncHandler(async (req, res) => {
  const { classId, subject } = req.query;
  const schoolId = req.user.school?._id ?? req.user.school;

  if (!classId || !subject) {
    throw new ApiError(400, 'classId and subject are required');
  }

  const normalizedSubject = String(subject).toUpperCase().trim();
  const activeSession = await getActiveSession(schoolId);

  // Validate teacher assignment and get total chapters
  const teacher = await User.findById(req.user._id);
  const assignment = teacher.assignments.find(
    (a) => a.class.toString() === classId && a.subject === normalizedSubject
  );

  if (!assignment) {
    throw new ApiError(403, 'You are not assigned to this class and subject.');
  }

  const totalChapters = assignment.totalChapters || 0;

  // Fetch all active students in this class
  const students = await Student.find({
    school: schoolId,
    class: classId,
    isActive: true,
  }).sort({ rollNo: 1 });

  // Fetch existing notebook checks for these students
  const checks = await NotebookCheck.find({
    school: schoolId,
    academicSession: activeSession._id,
    class: classId,
    subject: normalizedSubject,
  });

  const checkMap = new Map(checks.map((c) => [c.student.toString(), c]));

  // Build grid data
  const grid = students.map((student) => {
    const existingCheck = checkMap.get(student._id.toString());
    const chapters = [];

    // Map existing chapters or default to Pending
    for (let i = 1; i <= totalChapters; i++) {
      const existingChap = existingCheck?.chapters.find((ch) => ch.chapterNumber === i);
      chapters.push({
        chapterNumber: i,
        status: existingChap ? existingChap.status : 'Pending',
      });
    }

    return {
      studentId: student._id,
      name: student.name,
      rollNo: student.rollNo,
      chapters,
    };
  });

  // Calculate teacher progress cards
  let totalChecked = 0;
  let totalPending = 0;
  let totalNotSubmitted = 0;

  grid.forEach((row) => {
    row.chapters.forEach((ch) => {
      if (ch.status === 'Checked') totalChecked++;
      else if (ch.status === 'Copy Not Submitted') totalNotSubmitted++;
      else totalPending++;
    });
  });

  const totalCells = totalChecked + totalPending + totalNotSubmitted;
  const progressPercentage = totalCells > 0 ? Math.round((totalChecked / totalCells) * 100) : 0;

  res.json({
    success: true,
    totalChapters,
    grid,
    stats: {
      checked: totalChecked,
      pending: totalPending,
      notSubmitted: totalNotSubmitted,
      progressPercentage,
    },
  });
});

export const updateChapterStatus = asyncHandler(async (req, res) => {
  const { classId, studentId, subject, chapterNumber, status } = req.body;
  const schoolId = req.user.school?._id ?? req.user.school;

  if (!classId || !studentId || !subject || !chapterNumber || !status) {
    throw new ApiError(400, 'All fields are required.');
  }

  const normalizedSubject = String(subject).toUpperCase().trim();
  const activeSession = await getActiveSession(schoolId);

  // Validate teacher assignment
  const teacher = await User.findById(req.user._id);
  const assignment = teacher.assignments.find(
    (a) => a.class.toString() === classId && a.subject === normalizedSubject
  );

  if (!assignment) {
    throw new ApiError(403, 'Not authorized to update this subject.');
  }

  let checkDoc = await NotebookCheck.findOne({
    school: schoolId,
    academicSession: activeSession._id,
    class: classId,
    student: studentId,
    subject: normalizedSubject,
  });

  if (!checkDoc) {
    checkDoc = new NotebookCheck({
      school: schoolId,
      academicSession: activeSession._id,
      class: classId,
      student: studentId,
      subject: normalizedSubject,
      chapters: [],
    });
  }

  const chapterIndex = checkDoc.chapters.findIndex((ch) => ch.chapterNumber === Number(chapterNumber));

  if (chapterIndex > -1) {
    checkDoc.chapters[chapterIndex].status = status;
    checkDoc.chapters[chapterIndex].updatedAt = new Date();
  } else {
    checkDoc.chapters.push({
      chapterNumber: Number(chapterNumber),
      status,
      updatedAt: new Date(),
    });
  }

  await checkDoc.save();

  res.json({ success: true, message: 'Auto-saved successfully' });
});

// ==========================================
// ADMIN ANALYTICS FLOW
// ==========================================

export const getAdminAnalytics = asyncHandler(async (req, res) => {
  const schoolId = req.user.school?._id ?? req.user.school;
  const {
    classId,
    subject,
    teacherId,
    filterType, // e.g., 'top_5', 'bottom_10', 'below_90', 'pending_only'
    exportFormat // 'excel', 'csv'
  } = req.query;

  const activeSession = await getActiveSession(schoolId);
  const query = { school: schoolId, isActive: true };
  if (classId) query.class = classId;

  // Step 1: Find Students
  let students = await Student.find(query).populate('class', 'className section');

  // Step 2: Resolve subject & total chapters based on teacher assignments
  let totalChaptersMap = new Map(); // key: "classId_subject", value: totalChapters
  const teacherQuery = { school: schoolId, role: 'teacher', isActive: true };
  if (teacherId) teacherQuery._id = teacherId;

  const teachers = await User.find(teacherQuery);
  teachers.forEach(t => {
    t.assignments.forEach(a => {
      const matchSubject = subject ? a.subject === String(subject).toUpperCase() : true;
      const matchClass = classId ? a.class.toString() === classId : true;
      if (matchSubject && matchClass) {
        const key = `${a.class.toString()}_${a.subject}`;
        totalChaptersMap.set(key, a.totalChapters || 0);
      }
    });
  });

  // Collect relevant checks
  const checksQuery = { school: schoolId, academicSession: activeSession._id };
  if (classId) checksQuery.class = classId;
  if (subject) checksQuery.subject = String(subject).toUpperCase();
  
  const checks = await NotebookCheck.find(checksQuery);
  const checksByStudentMap = new Map();
  checks.forEach(c => {
    const key = `${c.student.toString()}_${c.subject}`;
    checksByStudentMap.set(key, c);
  });

  // Step 3: Build Analytic Rows
  let analyticsData = [];

  students.forEach(student => {
    // For each student, check against assigned subjects from totalChaptersMap
    totalChaptersMap.forEach((maxChapters, classSubjKey) => {
      const [assignedClassId, assignedSubject] = classSubjKey.split('_');
      
      if (student.class._id.toString() === assignedClassId) {
        const checkKey = `${student._id.toString()}_${assignedSubject}`;
        const existingCheck = checksByStudentMap.get(checkKey);
        
        let checkedCount = 0;
        let pendingCount = maxChapters; // assume pending initially
        let notSubmittedCount = 0;

        if (existingCheck) {
          existingCheck.chapters.forEach(ch => {
            if (ch.chapterNumber <= maxChapters) {
              if (ch.status === 'Checked') { checkedCount++; pendingCount--; }
              if (ch.status === 'Copy Not Submitted') { notSubmittedCount++; pendingCount--; }
            }
          });
        }

        const percentage = maxChapters > 0 ? Math.round((checkedCount / maxChapters) * 100) : 0;

        analyticsData.push({
          studentId: student._id,
          name: student.name,
          rollNo: student.rollNo,
          className: student.class.className,
          section: student.class.section,
          subject: assignedSubject,
          totalChapters: maxChapters,
          checkedCount,
          pendingCount,
          notSubmittedCount,
          percentage
        });
      }
    });
  });

  // Step 4: Apply Advanced Filters
  if (filterType) {
    if (filterType.startsWith('top_')) {
      const limit = parseInt(filterType.split('_')[1]);
      analyticsData.sort((a, b) => b.percentage - a.percentage);
      analyticsData = analyticsData.slice(0, limit);
    } else if (filterType.startsWith('bottom_')) {
      const limit = parseInt(filterType.split('_')[1]);
      analyticsData.sort((a, b) => a.percentage - b.percentage);
      analyticsData = analyticsData.slice(0, limit);
    } else if (filterType.startsWith('below_')) {
      const threshold = parseInt(filterType.split('_')[1]);
      analyticsData = analyticsData.filter(item => item.percentage < threshold);
    } else if (filterType === 'pending_only') {
      analyticsData = analyticsData.filter(item => item.pendingCount > 0);
    } else if (filterType === 'not_submitted_only') {
      analyticsData = analyticsData.filter(item => item.notSubmittedCount > 0);
    }
  }

  // Calculate top level stats
  let totalOverallChecked = 0;
  let totalOverallChapters = 0;
  analyticsData.forEach(d => {
    totalOverallChecked += d.checkedCount;
    totalOverallChapters += d.totalChapters;
  });
  const overallPercentage = totalOverallChapters > 0 ? Math.round((totalOverallChecked / totalOverallChapters) * 100) : 0;

  // Export Logic
  if (exportFormat === 'excel') {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Notebook Analytics');
    sheet.addRow(['Roll No', 'Name', 'Class', 'Section', 'Subject', 'Total Chapters', 'Checked', 'Pending', 'Not Submitted', 'Progress %']);
    
    analyticsData.forEach(r => {
      sheet.addRow([r.rollNo, r.name, r.className, r.section, r.subject, r.totalChapters, r.checkedCount, r.pendingCount, r.notSubmittedCount, r.percentage]);
    });

    sheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=notebook_analytics.xlsx');
    return res.send(buffer);
  }

  res.json({
    success: true,
    data: analyticsData,
    overallPercentage
  });
});

// ==========================================
// PARENT FLOW
// ==========================================

export const getParentProgress = asyncHandler(async (req, res) => {
  const schoolId = req.user.school?._id ?? req.user.school;
  const { studentId } = req.params;

  // Validate Parent
  const parent = await Parent.findOne({ _id: req.user._id, school: schoolId, status: 'Active' });
  if (!parent || !parent.linkedStudents.includes(studentId)) {
    throw new ApiError(403, 'You are not authorized to view this student.');
  }

  const student = await Student.findOne({ _id: studentId, school: schoolId, isActive: true });
  if (!student) throw new ApiError(404, 'Student not found.');

  const activeSession = await getActiveSession(schoolId);

  // Get total chapters per subject from teacher assignments for this class
  const classId = student.class.toString();
  const teachers = await User.find({ school: schoolId, role: 'teacher', isActive: true });
  
  const subjectsMap = new Map(); // key: subject, value: maxChapters
  teachers.forEach(t => {
    t.assignments.forEach(a => {
      if (a.class.toString() === classId) {
        subjectsMap.set(a.subject, a.totalChapters || 0);
      }
    });
  });

  const checks = await NotebookCheck.find({
    school: schoolId,
    academicSession: activeSession._id,
    student: studentId
  });

  const subjectProgress = [];
  let totalAllChecked = 0;
  let totalAllChapters = 0;

  subjectsMap.forEach((maxChapters, subject) => {
    const existingCheck = checks.find(c => c.subject === subject);
    let checked = 0;
    let pending = maxChapters;
    let notSubmitted = 0;

    const chaptersDetail = [];

    for (let i = 1; i <= maxChapters; i++) {
      let status = 'Pending';
      if (existingCheck) {
        const ch = existingCheck.chapters.find(c => c.chapterNumber === i);
        if (ch) status = ch.status;
      }
      
      chaptersDetail.push({ chapterNumber: i, status });
      
      if (status === 'Checked') { checked++; pending--; }
      else if (status === 'Copy Not Submitted') { notSubmitted++; pending--; }
    }

    const percentage = maxChapters > 0 ? Math.round((checked / maxChapters) * 100) : 0;
    
    totalAllChecked += checked;
    totalAllChapters += maxChapters;

    subjectProgress.push({
      subject,
      totalChapters: maxChapters,
      checked,
      pending,
      notSubmitted,
      percentage,
      chaptersDetail
    });
  });

  const overallPercentage = totalAllChapters > 0 ? Math.round((totalAllChecked / totalAllChapters) * 100) : 0;

  res.json({
    success: true,
    overallPercentage,
    subjectProgress
  });
});