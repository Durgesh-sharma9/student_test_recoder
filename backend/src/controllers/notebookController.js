import NotebookCheck from '../models/NotebookCheck.js';
import NotebookChapterUnlock from '../models/NotebookChapterUnlock.js';
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
  // Fetch fresh teacher data to ensure we have the latest assignment
  const teacher = await User.findById(req.user._id).select('assignments');
  const assignment = teacher.assignments.find(
    (a) => a.class.toString() === classId && a.subject === normalizedSubject
  );

  if (!assignment) {
    throw new ApiError(403, 'You are not assigned to this class and subject.');
  }

  const totalChapters = assignment.totalChapters || 0;

  // Fetch unlocked chapters for this class/subject
  const chapterUnlock = await NotebookChapterUnlock.findOne({
    school: schoolId,
    academicSession: activeSession._id,
    class: classId,
    subject: normalizedSubject,
  });
  const unlockedChapters = chapterUnlock?.unlockedChapters || [];

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

  // Calculate teacher progress cards (only for unlocked chapters)
  let totalChecked = 0;
  let totalPending = 0;
  let totalNotSubmitted = 0;
  let unlockedCount = 0;

  grid.forEach((row) => {
    row.chapters.forEach((ch) => {
      if (unlockedChapters.includes(ch.chapterNumber)) {
        unlockedCount++;
        if (ch.status === 'Checked') totalChecked++;
        else if (ch.status === 'Copy Not Submitted') totalNotSubmitted++;
        else totalPending++;
      }
    });
  });

  const totalUnlockedCells = totalChecked + totalPending + totalNotSubmitted;
  const progressPercentage = totalUnlockedCells > 0 ? Math.round((totalChecked / totalUnlockedCells) * 100) : 0;

  // Calculate chapter-wise progress (checked students / total students)
  const chapterProgress = [];
  for (let i = 1; i <= totalChapters; i++) {
    if (unlockedChapters.includes(i)) {
      const checkedCount = grid.filter(s => s.chapters[i-1]?.status === 'Checked').length;
      chapterProgress.push({
        chapterNumber: i,
        checkedCount,
        totalStudents: grid.length,
      });
    } else {
      chapterProgress.push({
        chapterNumber: i,
        isLocked: true,
      });
    }
  }

  res.json({
    success: true,
    grid,
    totalChapters,
    unlockedChapters,
    chapterProgress,
    progress: {
      totalChecked,
      totalPending,
      totalNotSubmitted,
      progressPercentage,
      unlockedCount,
      totalChapters,
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

export const unlockChapter = asyncHandler(async (req, res) => {
  const { classId, subject, chapterNumber } = req.body;
  const schoolId = req.user.school?._id ?? req.user.school;

  if (!classId || !subject || !chapterNumber) {
    throw new ApiError(400, 'classId, subject, and chapterNumber are required');
  }

  const normalizedSubject = String(subject).toUpperCase().trim();
  const activeSession = await getActiveSession(schoolId);

  // Validate teacher assignment
  const teacher = await User.findById(req.user._id);
  const assignment = teacher.assignments.find(
    (a) => a.class.toString() === classId && a.subject === normalizedSubject
  );

  if (!assignment) {
    throw new ApiError(403, 'You are not assigned to this class and subject.');
  }

  // Find or create chapter unlock record
  let chapterUnlock = await NotebookChapterUnlock.findOne({
    school: schoolId,
    academicSession: activeSession._id,
    class: classId,
    subject: normalizedSubject,
  });

  if (!chapterUnlock) {
    chapterUnlock = new NotebookChapterUnlock({
      school: schoolId,
      academicSession: activeSession._id,
      class: classId,
      subject: normalizedSubject,
      unlockedChapters: [chapterNumber],
    });
  } else {
    // Add chapter to unlocked list if not already present
    if (!chapterUnlock.unlockedChapters.includes(chapterNumber)) {
      chapterUnlock.unlockedChapters.push(chapterNumber);
    }
  }

  await chapterUnlock.save();

  res.json({ success: true, message: 'Chapter unlocked successfully' });
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

  // Fetch unlocked chapters for this class/subject
  const chapterUnlock = await NotebookChapterUnlock.findOne({
    school: schoolId,
    academicSession: activeSession._id,
    class: classId,
    subject: normalizedSubject,
  });
  const unlockedChapters = chapterUnlock?.unlockedChapters || [];

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

  // Build grid data with progress percentage (only for unlocked chapters)
  const grid = students.map((student) => {
    const existingCheck = checkMap.get(student._id.toString());
    const chapters = [];

    let checkedCount = 0;
    let unlockedCount = 0;

    // Map existing chapters or default to Pending
    for (let i = 1; i <= totalChapters; i++) {
      const existingChap = existingCheck?.chapters.find((ch) => ch.chapterNumber === i);
      const status = existingChap ? existingChap.status : 'Pending';
      chapters.push({
        chapterNumber: i,
        status,
      });
      
      if (unlockedChapters.includes(i)) {
        unlockedCount++;
        if (status === 'Checked') checkedCount++;
      }
    }

    const progressPercentage = unlockedCount > 0 ? Math.round((checkedCount / unlockedCount) * 100) : 0;

    return {
      studentId: student._id,
      name: student.name,
      rollNo: student.rollNo,
      chapters,
      progressPercentage,
    };
  });

  // Calculate chapter-wise progress
  const chapterProgress = [];
  for (let i = 1; i <= totalChapters; i++) {
    if (unlockedChapters.includes(i)) {
      const checkedCount = grid.filter(s => s.chapters[i-1]?.status === 'Checked').length;
      chapterProgress.push({
        chapterNumber: i,
        checkedCount,
        totalStudents: grid.length,
      });
    } else {
      chapterProgress.push({
        chapterNumber: i,
        isLocked: true,
      });
    }
  }

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
    unlockedChapters,
    chapterProgress,
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
  
  const subjectsMap = new Map(); // key: subject, value: { maxChapters, unlockedChapters }
  teachers.forEach(t => {
    t.assignments.forEach(a => {
      if (a.class.toString() === classId) {
        subjectsMap.set(a.subject, { maxChapters: a.totalChapters || 0, unlockedChapters: [] });
      }
    });
  });

  // Fetch unlocked chapters for each subject
  const chapterUnlocks = await NotebookChapterUnlock.find({
    school: schoolId,
    academicSession: activeSession._id,
    class: classId,
  });

  chapterUnlocks.forEach(cu => {
    if (subjectsMap.has(cu.subject)) {
      subjectsMap.set(cu.subject, {
        maxChapters: subjectsMap.get(cu.subject).maxChapters,
        unlockedChapters: cu.unlockedChapters || [],
      });
    }
  });

  const checks = await NotebookCheck.find({
    school: schoolId,
    academicSession: activeSession._id,
    student: studentId
  });

  const subjectProgress = [];
  let totalAllChecked = 0;
  let totalAllChapters = 0;

  subjectsMap.forEach((data, subject) => {
    const { maxChapters, unlockedChapters } = data;
    const existingCheck = checks.find(c => c.subject === subject);
    let checked = 0;
    let pending = 0;
    let notSubmitted = 0;
    let unlockedCount = 0;

    const chaptersDetail = [];

    for (let i = 1; i <= maxChapters; i++) {
      let status = 'Pending';
      if (existingCheck) {
        const ch = existingCheck.chapters.find(c => c.chapterNumber === i);
        if (ch) status = ch.status;
      }
      
      const isUnlocked = unlockedChapters.includes(i);
      chaptersDetail.push({ chapterNumber: i, status, isUnlocked });
      
      if (isUnlocked) {
        unlockedCount++;
        if (status === 'Checked') { checked++; }
        else if (status === 'Copy Not Submitted') { notSubmitted++; }
        else { pending++; }
      }
    }

    const percentage = unlockedCount > 0 ? Math.round((checked / unlockedCount) * 100) : 0;
    
    totalAllChecked += checked;
    totalAllChapters += unlockedCount;

    subjectProgress.push({
      subject,
      totalChapters: maxChapters,
      unlockedChapters,
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