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
  const { classId, subject, exportFormat } = req.query;

  if (!classId || !subject) {
    throw new ApiError(400, 'classId and subject are required');
  }

  const normalizedSubject = String(subject).toUpperCase().trim();
  const activeSession = await getActiveSession(schoolId);

  // Get total chapters from teacher assignments
  const teacher = await User.findOne({
    school: schoolId,
    role: 'teacher',
    isActive: true,
    'assignments.class': classId,
    'assignments.subject': normalizedSubject
  });

  if (!teacher) {
    throw new ApiError(404, 'No teacher assigned to this class and subject');
  }

  const assignment = teacher.assignments.find(
    (a) => a.class.toString() === classId && a.subject === normalizedSubject
  );

  const totalChapters = assignment?.totalChapters || 0;

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

  // Build grid data with progress percentage
  const grid = students.map((student) => {
    const existingCheck = checkMap.get(student._id.toString());
    const chapters = [];

    let checkedCount = 0;

    // Map existing chapters or default to Pending
    for (let i = 1; i <= totalChapters; i++) {
      const existingChap = existingCheck?.chapters.find((ch) => ch.chapterNumber === i);
      const status = existingChap ? existingChap.status : 'Pending';
      chapters.push({
        chapterNumber: i,
        status,
      });
      if (status === 'Checked') checkedCount++;
    }

    const progressPercentage = totalChapters > 0 ? Math.round((checkedCount / totalChapters) * 100) : 0;

    return {
      studentId: student._id,
      name: student.name,
      rollNo: student.rollNo,
      chapters,
      progressPercentage,
    };
  });

  // Export Logic
  if (exportFormat === 'excel') {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Notebook Analytics');
    sheet.addRow(['Roll No', 'Name', ...Array.from({ length: totalChapters }, (_, i) => `Ch ${i + 1}`), 'Progress %']);
    
    grid.forEach(r => {
      sheet.addRow([r.rollNo, r.name, ...r.chapters.map(ch => ch.status), r.progressPercentage + '%']);
    });
    
    const buffer = await workbook.xlsx.writeBuffer();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=notebook_analytics.xlsx');
    return res.send(buffer);
  }

  res.json({
    success: true,
    grid,
    totalChapters,
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