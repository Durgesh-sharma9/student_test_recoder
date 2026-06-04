import Parent from '../models/Parent.js';
import Student from '../models/Student.js';
import School from '../models/School.js';
import Class from '../models/Class.js';
import ResultSession from '../models/ResultSession.js';
import MarkEntry from '../models/MarkEntry.js';
import AcademicSession from '../models/AcademicSession.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { withSchool } from '../utils/tenantQuery.js';
import crypto from 'crypto';
import { sendParentCreationEmail } from '../services/emailService.js';
import { startOfDay, endOfDay } from 'date-fns';

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

// Helper function to generate random password (8-10 characters)
const generatePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const length = Math.floor(Math.random() * 3) + 8; // 8-10 characters
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// Helper function to find or create parent
export const findOrCreateParent = async (schoolId, parentData) => {
  const { parentName, email, phone } = parentData;
  
  // Try to find existing parent by email (if provided)
  let parent;
  if (email && email.trim()) {
    parent = await Parent.findOne({
      school: schoolId,
      email: (email || '').trim().toLowerCase(),
      status: 'Active'
    });
  }
  
  // If not found by email, try by phone
  if (!parent && phone && phone.trim()) {
    parent = await Parent.findOne({
      school: schoolId,
      phone: (phone || '').trim(),
      status: 'Active'
    });
  }
  
  // If parent exists, return it
  if (parent) {
    return { parent, isNew: false };
  }
  
  // Create new parent
  const password = generatePassword();
  parent = await Parent.create({
    school: schoolId,
    parentName: (parentName || '').trim(),
    email: email ? (email || '').trim().toLowerCase() : undefined,
    phone: (phone || '').trim(),
    password,
    status: 'Active',
    linkedStudents: []
  });
  
  return { parent, isNew: true, password };
};

export const getParents = asyncHandler(async (req, res) => {
  const filter = withSchool(req, { status: 'Active' });
  
  const parents = await Parent.find(filter)
    .populate('linkedStudents', 'name rollNo class')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: parents.length,
    parents,
  });
});

export const getParent = asyncHandler(async (req, res) => {
  const parent = await Parent.findOne(withSchool(req, { _id: req.params.id }))
    .populate('linkedStudents', 'name rollNo class');

  if (!parent) throw new ApiError(404, 'Parent not found.');

  res.json({ success: true, parent });
});

export const createParent = asyncHandler(async (req, res) => {
  const schoolId = req.user.school?._id ?? req.user.school;
  
  const { parentName, email, phone } = req.body;
  
  if (!parentName || !phone) {
    throw new ApiError(400, 'Parent Name and Phone are required.');
  }
  
  // Check for existing parent by email or phone
  const existingByEmail = email ? await Parent.findOne({
    school: schoolId,
    email: email.trim().toLowerCase(),
    status: 'Active'
  }) : null;
  
  if (existingByEmail) {
    throw new ApiError(400, 'Parent with this email already exists.');
  }
  
  const existingByPhone = await Parent.findOne({
    school: schoolId,
    phone: phone.trim(),
    status: 'Active'
  });
  
  if (existingByPhone) {
    throw new ApiError(400, 'Parent with this phone already exists.');
  }
  
  const password = generatePassword();
  
  const parent = await Parent.create({
    school: schoolId,
    parentName: parentName.trim(),
    email: email ? email.trim().toLowerCase() : undefined,
    phone: phone.trim(),
    password,
    status: 'Active',
    linkedStudents: []
  });

  res.status(201).json({ 
    success: true, 
    parent: {
      ...parent.toObject(),
      password // Return password for email sending
    }
  });
});

export const updateParent = asyncHandler(async (req, res) => {
  const updates = {
    ...req.body,
    ...(req.body.parentName !== undefined ? { parentName: req.body.parentName.trim() } : {}),
    ...(req.body.email !== undefined ? { email: req.body.email ? req.body.email.trim().toLowerCase() : undefined } : {}),
    ...(req.body.phone !== undefined ? { phone: req.body.phone.trim() } : {}),
  };

  const current = await Parent.findOne(withSchool(req, { _id: req.params.id }));
  if (!current) throw new ApiError(404, 'Parent not found.');

  // Check for email uniqueness if email is being changed
  if (updates.email && updates.email !== current.email) {
    const existing = await Parent.findOne({
      _id: { $ne: req.params.id },
      school: current.school,
      email: updates.email,
      status: 'Active'
    });
    if (existing) throw new ApiError(400, 'Parent with this email already exists.');
  }

  // Check for phone uniqueness if phone is being changed
  if (updates.phone && updates.phone !== current.phone) {
    const existing = await Parent.findOne({
      _id: { $ne: req.params.id },
      school: current.school,
      phone: updates.phone,
      status: 'Active'
    });
    if (existing) throw new ApiError(400, 'Parent with this phone already exists.');
  }

  const parent = await Parent.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  res.json({ success: true, parent });
});

export const deleteParent = asyncHandler(async (req, res) => {
  const parent = await Parent.findOne(withSchool(req, { _id: req.params.id }));
  if (!parent) throw new ApiError(404, 'Parent not found.');

  // Check if parent has linked students
  if (parent.linkedStudents && parent.linkedStudents.length > 0) {
    throw new ApiError(400, 'Cannot delete parent with linked students. Please unlink students first.');
  }

  parent.status = 'Inactive';
  await parent.save();

  res.json({ success: true, message: 'Parent deactivated.' });
});

export const linkStudentToParent = asyncHandler(async (req, res) => {
  const { parentId, studentId } = req.body;
  const schoolId = req.user.school?._id ?? req.user.school;
  
  if (!parentId || !studentId) {
    throw new ApiError(400, 'Parent ID and Student ID are required.');
  }
  
  const parent = await Parent.findOne({ _id: parentId, school: schoolId, status: 'Active' });
  if (!parent) throw new ApiError(404, 'Parent not found.');
  
  const student = await Student.findOne({ _id: studentId, school: schoolId, isActive: true });
  if (!student) throw new ApiError(404, 'Student not found.');
  
  // Check if student is already linked to this parent
  if (parent.linkedStudents && parent.linkedStudents.includes(studentId)) {
    throw new ApiError(400, 'Student is already linked to this parent.');
  }
  
  // Link student to parent
  parent.linkedStudents.push(studentId);
  await parent.save();
  
  // Update student's parent reference
  student.parent = parentId;
  await student.save();
  
  res.json({ success: true, message: 'Student linked to parent successfully.' });
});

export const unlinkStudentFromParent = asyncHandler(async (req, res) => {
  const { parentId, studentId } = req.body;
  const schoolId = req.user.school?._id ?? req.user.school;
  
  if (!parentId || !studentId) {
    throw new ApiError(400, 'Parent ID and Student ID are required.');
  }
  
  const parent = await Parent.findOne({ _id: parentId, school: schoolId, status: 'Active' });
  if (!parent) throw new ApiError(404, 'Parent not found.');
  
  const student = await Student.findOne({ _id: studentId, school: schoolId, isActive: true });
  if (!student) throw new ApiError(404, 'Student not found.');
  
  // Remove student from parent's linkedStudents
  parent.linkedStudents = parent.linkedStudents.filter(id => id.toString() !== studentId);
  await parent.save();
  
  // Remove parent reference from student
  student.parent = undefined;
  await student.save();
  
  res.json({ success: true, message: 'Student unlinked from parent successfully.' });
});

export const sendParentCredentials = asyncHandler(async (req, res) => {
  const { parentId, schoolName, loginUrl } = req.body;
  const schoolId = req.user.school?._id ?? req.user.school;
  
  if (!parentId) {
    throw new ApiError(400, 'Parent ID is required.');
  }
  
  const parent = await Parent.findOne({ _id: parentId, school: schoolId, status: 'Active' }).select('+password');
  if (!parent) throw new ApiError(404, 'Parent not found.');
  
  if (!parent.email) {
    throw new ApiError(400, 'Parent does not have an email address.');
  }
  
  // Get school name if not provided
  let finalSchoolName = schoolName;
  if (!finalSchoolName) {
    const school = await School.findById(schoolId);
    if (school) finalSchoolName = school.schoolName;
    else finalSchoolName = 'Your School';
  }
  
  // Send credential email
  const emailResult = await sendParentCreationEmail(
    finalSchoolName,
    parent.parentName,
    parent.email,
    parent.password,
    loginUrl || process.env.CLIENT_URL || 'http://localhost:5173'
  );
  
  if (!emailResult.success) {
    throw new ApiError(500, 'Failed to send parent credential email.');
  }
  
  res.json({ success: true, message: 'Parent credentials sent successfully.' });
});

export const getParentStudents = asyncHandler(async (req, res) => {
  console.log('========== getParentStudents START ==========');
  console.log('[getParentStudents] req.user._id:', req.user._id);
  console.log('[getParentStudents] req.user:', JSON.stringify(req.user, null, 2));
  
  const schoolId = req.user.school?._id ?? req.user.school;
  console.log('[getParentStudents] schoolId:', schoolId);
  
  // Get parent from user (for logged-in parent)
  const parent = await Parent.findOne({ _id: req.user._id, school: schoolId, status: 'Active' });
  console.log('[getParentStudents] Parent query result:', parent);
  
  if (!parent) {
    console.log('[getParentStudents] Parent not found');
    throw new ApiError(404, 'Parent not found.');
  }
  
  console.log('[getParentStudents] Parent found:', parent._id);
  console.log('[getParentStudents] Parent linkedStudents:', parent.linkedStudents);
  console.log('[getParentStudents] Parent linkedStudents length:', parent.linkedStudents?.length);
  
  // Get linked students with their class and academic session info
  const students = await Student.find({
    _id: { $in: parent.linkedStudents },
    school: schoolId,
    isActive: true
  })
  .populate('class', 'className section')
  .populate('academicSession', 'sessionName');
  
  console.log('[getParentStudents] Students found:', students.length);
  console.log('[getParentStudents] Students:', JSON.stringify(students.map(s => ({
    _id: s._id,
    name: s.name,
    className: s.class?.className,
    section: s.class?.section,
    classId: s.class?._id
  })), null, 2));
  
  if (students.length === 0) {
    console.log('[getParentStudents] No linked students found');
    return res.json({
      success: true,
      students: [],
      sessionName: null
    });
  }
  
  // Get current active academic session
  const activeSession = await AcademicSession.findOne({
    school: schoolId,
    status: 'active'
  });
  
  const sessionName = activeSession ? activeSession.sessionName : '2026-27';
  console.log('[getParentStudents] Active session:', activeSession?._id, 'sessionName:', sessionName);
  
  // Reuse Class Results calculation logic - DO NOT create new calculations
  const studentsWithStats = await Promise.all(students.map(async (student) => {
    console.log('[getParentStudents] Processing student:', student._id, student.name);
    console.log('[getParentStudents] Student class:', student.class?._id, student.class?.className);
    console.log('[getParentStudents] Student class type:', typeof student.class, student.class);
    
    // Get all ResultSessions for this student's class in the active session
    // This is the SAME logic used in Admin Class Results
    // Use the same query pattern as Admin Class Results
    const classId = student.class?._id || student.class;
    console.log('[getParentStudents] Using classId:', classId, 'type:', typeof classId);
    
    // Admin Class Results uses: school: req.user.school, class: classId
    // And has fallback for records without academicSession
    const sessions = await ResultSession.find({
      school: schoolId,
      class: classId,
      isActive: true
    }).lean();
    
    console.log('[getParentStudents] ResultSessions found (without academicSession filter):', sessions.length);
    
    // If no sessions found with academicSession filter, try without it (fallback like Admin)
    if (sessions.length === 0) {
      console.log('[getParentStudents] No sessions found, trying without academicSession filter...');
      const sessionsWithoutSession = await ResultSession.find({
        school: schoolId,
        class: classId
      }).lean();
      console.log('[getParentStudents] ResultSessions found (without any session filter):', sessionsWithoutSession.length);
      sessions.push(...sessionsWithoutSession);
    }
    
    console.log('[getParentStudents] Total ResultSessions found:', sessions.length);
    console.log('[getParentStudents] Session IDs:', sessions.map(s => s._id));
    
    const sessionIds = sessions.map(s => s._id);
    
    // Get ALL students in this class (same as Admin Class Results)
    // Admin Class Results doesn't filter by academicSession or isActive for Student query
    const allClassStudents = await Student.find({
      school: schoolId,
      class: classId
    });
    
    console.log('[getParentStudents] All class students found:', allClassStudents.length);
    console.log('[getParentStudents] All class student IDs:', allClassStudents.map(s => s._id));
    
    // Get ALL MarkEntry records for ALL students in these sessions (same as Admin Class Results)
    const allEntries = await MarkEntry.find({
      student: { $in: allClassStudents.map(s => s._id) },
      session: { $in: sessionIds }
    });
    
    console.log('[getParentStudents] All MarkEntry records found:', allEntries.length);
    console.log('[getParentStudents] MarkEntry sample:', allEntries.slice(0, 3).map(e => ({
      student: e.student,
      session: e.session,
      marksObtained: e.marksObtained
    })));
    
    // Calculate stats for ALL students (same as Admin Class Results)
    const studentStats = allClassStudents.map(s => {
      const studentEntries = allEntries.filter(e => e.student.toString() === s._id.toString());
      const totalObtained = studentEntries.reduce((sum, e) => sum + (e.marksObtained || 0), 0);
      const totalMax = sessions.reduce((sum, sess) => sum + (sess.maxMarks || 0), 0);
      const percentage = totalMax > 0 ? round2((totalObtained / totalMax) * 100) : 0;
      
      return {
        _id: s._id,
        name: s.name,
        totalObtained,
        totalMax,
        percentage
      };
    });
    
    console.log('[getParentStudents] Student stats calculated:', JSON.stringify(studentStats, null, 2));
    
    // Compute ranks using the SAME function as Admin Class Results
    const rankedStudents = computeCompetitionRanks(studentStats, 'totalObtained');
    
    console.log('[getParentStudents] Ranked students:', JSON.stringify(rankedStudents, null, 2));
    
    // Filter to get ONLY this student's row from the results (same as filtering Admin Class Results)
    const currentStudentRank = rankedStudents.find(s => s._id.toString() === student._id.toString());
    
    console.log('[getParentStudents] Current student rank:', JSON.stringify(currentStudentRank, null, 2));
    
    // Get latest 5 results (mix of Daily Tests and Main Exams)
    const entries = await MarkEntry.find({
      student: student._id,
      session: { $in: sessionIds }
    });
    
    console.log('[getParentStudents] Student MarkEntry records:', entries.length);
    
    const allResults = [];
    
    for (const session of sessions) {
      const entry = entries.find(e => e.session.toString() === session._id.toString());
      if (entry) {
        const resultDate = session.category === 'daily' ? session.testDate : session.examDate;
        allResults.push({
          date: resultDate,
          examType: session.category === 'daily' ? 'Daily Test' : session.examType,
          subject: session.subject,
          marksObtained: entry.marksObtained,
          maxMarks: session.maxMarks,
          percentage: entry.percentage,
          rank: entry.rankSubject,
          category: session.category
        });
      }
    }
    
    allResults.sort((a, b) => new Date(b.date) - new Date(a.date));
    const recentResults = allResults.slice(0, 5);
    
    console.log('[getParentStudents] Recent results:', JSON.stringify(recentResults, null, 2));
    
    return {
      _id: student._id,
      name: student.name,
      rollNo: student.rollNo,
      className: student.class?.className || '',
      section: student.class?.section || '',
      rank: currentStudentRank?.rank || null,
      percentage: currentStudentRank?.percentage || 0,
      recentResults
    };
  }));
  
  console.log('[getParentStudents] Sending response with rank, percentage, and recent results');
  console.log('[getParentStudents] Final students data:', JSON.stringify(studentsWithStats, null, 2));
  console.log('========== getParentStudents END ==========');
  
  res.json({
    success: true,
    sessionName,
    students: studentsWithStats
  });
});

export const getParentStudentResultsHistory = asyncHandler(async (req, res) => {
  console.log('========== getParentStudentResultsHistory START ==========');
  console.log('[getParentStudentResultsHistory] req.params:', req.params);
  console.log('[getParentStudentResultsHistory] req.query:', req.query);
  console.log('[getParentStudentResultsHistory] studentId:', req.params.studentId);
  console.log('[getParentStudentResultsHistory] dateFrom:', req.query.dateFrom);
  console.log('[getParentStudentResultsHistory] dateTo:', req.query.dateTo);
  
  const schoolId = req.user.school?._id ?? req.user.school;
  const { studentId } = req.params;
  const { dateFrom, dateTo } = req.query;
  
  console.log('[getParentStudentResultsHistory] schoolId:', schoolId);
  
  // Get parent from user (for logged-in parent)
  const parent = await Parent.findOne({ _id: req.user._id, school: schoolId, status: 'Active' });
  console.log('[getParentStudentResultsHistory] Parent found:', parent);
  
  if (!parent) throw new ApiError(404, 'Parent not found.');
  
  // Verify student is linked to this parent
  console.log('[getParentStudentResultsHistory] Parent linkedStudents:', parent.linkedStudents);
  console.log('[getParentStudentResultsHistory] Checking if studentId is linked:', parent.linkedStudents.includes(studentId));
  
  if (!parent.linkedStudents.includes(studentId)) {
    throw new ApiError(403, 'You do not have permission to view this student\'s results.');
  }
  
  // Get student
  const student = await Student.findOne({ _id: studentId, school: schoolId, isActive: true })
    .populate('class', 'className section');
  
  console.log('[getParentStudentResultsHistory] Student found:', student);
  
  if (!student) throw new ApiError(404, 'Student not found.');
  
  // Get current active academic session
  const activeSession = await AcademicSession.findOne({
    school: schoolId,
    status: 'active'
  });
  
  console.log('[getParentStudentResultsHistory] Active session:', activeSession);
  
  // Build date filter
  const dateFilter = {};
  if (dateFrom) {
    dateFilter.$gte = new Date(dateFrom);
    console.log('[getParentStudentResultsHistory] Date from filter:', dateFrom, '->', dateFilter.$gte);
  }
  if (dateTo) {
    dateFilter.$lte = new Date(dateTo);
    console.log('[getParentStudentResultsHistory] Date to filter:', dateTo, '->', dateFilter.$lte);
  }
  
  // Get all ResultSessions for this student's class in the active session
  // Use the same query pattern as Admin Class Results
  const classId = student.class?._id || student.class;
  console.log('[getParentStudentResultsHistory] Using classId:', classId, 'type:', typeof classId);
  
  const sessionFilter = {
    school: schoolId,
    class: classId,
    isActive: true
  };
  
  console.log('[getParentStudentResultsHistory] Session filter:', JSON.stringify(sessionFilter, null, 2));
  
  const sessions = await ResultSession.find(sessionFilter).lean();
  
  console.log('[getParentStudentResultsHistory] Total ResultSessions found (without academicSession filter):', sessions.length);
  
  // If no sessions found with academicSession filter, try without it (fallback like Admin)
  if (sessions.length === 0) {
    console.log('[getParentStudentResultsHistory] No sessions found, trying without academicSession filter...');
    const sessionsWithoutSession = await ResultSession.find({
      school: schoolId,
      class: classId
    }).lean();
    console.log('[getParentStudentResultsHistory] ResultSessions found (without any session filter):', sessionsWithoutSession.length);
    sessions.push(...sessionsWithoutSession);
  }
  
  console.log('[getParentStudentResultsHistory] Total ResultSessions found:', sessions.length);
  console.log('[getParentStudentResultsHistory] Sessions sample:', sessions.slice(0, 3).map(s => ({
    _id: s._id,
    category: s.category,
    testDate: s.testDate,
    examDate: s.examDate,
    subject: s.subject
  })));
  
  // Filter by date if provided
  let filteredSessions = sessions;
  if (Object.keys(dateFilter).length > 0) {
    console.log('[getParentStudentResultsHistory] Applying date filter...');
    filteredSessions = sessions.filter(session => {
      const sessionDate = session.category === 'daily' ? session.testDate : session.examDate;
      console.log('[getParentStudentResultsHistory] Session date:', sessionDate, 'category:', session.category);
      if (!sessionDate) return false;
      const date = new Date(sessionDate);
      if (dateFilter.$gte && date < dateFilter.$gte) {
        console.log('[getParentStudentResultsHistory] Filtered out (before dateFrom):', sessionDate);
        return false;
      }
      if (dateFilter.$lte && date > dateFilter.$lte) {
        console.log('[getParentStudentResultsHistory] Filtered out (after dateTo):', sessionDate);
        return false;
      }
      console.log('[getParentStudentResultsHistory] Session passed filter:', sessionDate);
      return true;
    });
  }
  
  console.log('[getParentStudentResultsHistory] Filtered sessions count:', filteredSessions.length);
  
  const sessionIds = filteredSessions.map(s => s._id);
  
  // Get all students in the class for ranking calculation
  // Admin Class Results doesn't filter by academicSession or isActive for Student query
  const allClassStudents = await Student.find({
    school: schoolId,
    class: classId
  });
  
  console.log('[getParentStudentResultsHistory] All class students count:', allClassStudents.length);
  
  // Get all MarkEntry records for all students in the filtered sessions
  const allEntries = await MarkEntry.find({
    student: { $in: allClassStudents.map(s => s._id) },
    session: { $in: sessionIds }
  }).lean();
  
  console.log('[getParentStudentResultsHistory] All MarkEntry records count:', allEntries.length);
  
  // Calculate stats for all students in the class for ranking
  const studentStats = allClassStudents.map(s => {
    const studentEntries = allEntries.filter(e => e.student.toString() === s._id.toString());
    const totalObtained = studentEntries.reduce((sum, e) => sum + (e.marksObtained || 0), 0);
    const totalMax = filteredSessions.reduce((sum, sess) => sum + (sess.maxMarks || 0), 0);
    const percentage = totalMax > 0 ? round2((totalObtained / totalMax) * 100) : 0;
    
    return {
      _id: s._id,
      totalObtained,
      totalMax,
      percentage
    };
  });
  
  console.log('[getParentStudentResultsHistory] Student stats calculated:', JSON.stringify(studentStats, null, 2));
  
  // Compute ranks across all students
  const rankedStudents = computeCompetitionRanks(studentStats, 'totalObtained');
  
  console.log('[getParentStudentResultsHistory] Ranked students:', JSON.stringify(rankedStudents, null, 2));
  
  // Get the current student's rank and percentage
  const currentStudentRank = rankedStudents.find(s => s._id.toString() === studentId.toString());
  
  console.log('[getParentStudentResultsHistory] Current student rank:', JSON.stringify(currentStudentRank, null, 2));
  
  // Get MarkEntry records for the current student
  const entries = await MarkEntry.find({
    student: studentId,
    session: { $in: sessionIds }
  }).lean();
  
  console.log('[getParentStudentResultsHistory] Current student MarkEntry records count:', entries.length);
  
  // Build results array
  const results = [];
  
  for (const session of filteredSessions) {
    const entry = entries.find(e => e.session.toString() === session._id.toString());
    if (entry) {
      const resultDate = session.category === 'daily' ? session.testDate : session.examDate;
      results.push({
        date: resultDate,
        examType: session.category === 'daily' ? 'Daily Test' : session.examType,
        subject: session.subject,
        marksObtained: entry.marksObtained,
        maxMarks: session.maxMarks,
        percentage: entry.percentage,
        rank: entry.rankSubject,
        category: session.category
      });
    }
  }
  
  // Sort by date ascending (chronological order)
  results.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  console.log('[getParentStudentResultsHistory] Final results count:', results.length);
  console.log('[getParentStudentResultsHistory] Final results:', JSON.stringify(results, null, 2));
  
  res.json({
    success: true,
    student: {
      _id: student._id,
      name: student.name,
      rollNo: student.rollNo,
      className: student.class?.className || '',
      section: student.class?.section || ''
    },
    results,
    classRank: currentStudentRank?.rank || null,
    classPercentage: currentStudentRank?.percentage || 0,
    totalStudents: rankedStudents.length
  });
  
  console.log('========== getParentStudentResultsHistory END ==========');
});

export const getParentStudentDetails = asyncHandler(async (req, res) => {
  console.log('========== getParentStudentDetails START ==========');
  console.log('[getParentStudentDetails] studentId:', req.params.studentId);
  
  const schoolId = req.user.school?._id ?? req.user.school;
  const { studentId } = req.params;
  
  // Get parent from user (for logged-in parent)
  const parent = await Parent.findOne({ _id: req.user._id, school: schoolId, status: 'Active' });
  if (!parent) throw new ApiError(404, 'Parent not found.');
  
  // Check if student is linked to this parent
  if (!parent.linkedStudents.includes(studentId)) {
    throw new ApiError(403, 'You are not authorized to view this student.');
  }
  
  // Get student details
  const student = await Student.findOne({
    _id: studentId,
    school: schoolId,
    isActive: true
  })
  .populate('class', 'className section')
  .populate('academicSession', 'sessionName');
  
  if (!student) throw new ApiError(404, 'Student not found.');
  
  console.log('[getParentStudentDetails] Student found:', student._id, student.name);
  
  // Reuse the SAME calculation logic as getParentStudents
  // Get current active academic session
  const activeSession = await AcademicSession.findOne({
    school: schoolId,
    status: 'active'
  });
  
  const classId = student.class?._id || student.class;
  console.log('[getParentStudentDetails] Using classId:', classId);
  
  // Get all ResultSessions for this student's class
  const sessions = await ResultSession.find({
    school: schoolId,
    class: classId,
    isActive: true
  }).lean();
  
  console.log('[getParentStudentDetails] ResultSessions found:', sessions.length);
  
  // Fallback for records without academicSession
  if (sessions.length === 0) {
    const sessionsWithoutSession = await ResultSession.find({
      school: schoolId,
      class: classId
    }).lean();
    sessions.push(...sessionsWithoutSession);
  }
  
  const sessionIds = sessions.map(s => s._id);
  
  // Get ALL students in this class (same as Admin Class Results)
  const allClassStudents = await Student.find({
    school: schoolId,
    class: classId
  });
  
  console.log('[getParentStudentDetails] All class students found:', allClassStudents.length);
  
  // Get ALL MarkEntry records for ALL students in these sessions
  const allEntries = await MarkEntry.find({
    student: { $in: allClassStudents.map(s => s._id) },
    session: { $in: sessionIds }
  });
  
  console.log('[getParentStudentDetails] All MarkEntry records found:', allEntries.length);
  
  // Calculate stats for ALL students (same as Admin Class Results)
  const studentStats = allClassStudents.map(s => {
    const studentEntries = allEntries.filter(e => e.student.toString() === s._id.toString());
    const totalObtained = studentEntries.reduce((sum, e) => sum + (e.marksObtained || 0), 0);
    const totalMax = sessions.reduce((sum, sess) => sum + (sess.maxMarks || 0), 0);
    const percentage = totalMax > 0 ? round2((totalObtained / totalMax) * 100) : 0;
    
    return {
      _id: s._id,
      totalObtained,
      totalMax,
      percentage
    };
  });
  
  // Compute ranks using the SAME function as Admin Class Results
  const rankedStudents = computeCompetitionRanks(studentStats, 'totalObtained');
  
  // Filter to get ONLY this student's row from the results
  const currentStudentRank = rankedStudents.find(s => s._id.toString() === studentId.toString());
  
  console.log('[getParentStudentDetails] Current student rank:', currentStudentRank?.rank);
  console.log('[getParentStudentDetails] Current student percentage:', currentStudentRank?.percentage);
  
  // Get latest 5 results (mix of Daily Tests and Main Exams)
  const entries = await MarkEntry.find({
    student: studentId,
    session: { $in: sessionIds }
  });
  
  const allResults = [];
  
  for (const session of sessions) {
    const entry = entries.find(e => e.session.toString() === session._id.toString());
    if (entry) {
      const resultDate = session.category === 'daily' ? session.testDate : session.examDate;
      allResults.push({
        date: resultDate,
        examType: session.category === 'daily' ? 'Daily Test' : session.examType,
        subject: session.subject,
        marksObtained: entry.marksObtained,
        maxMarks: session.maxMarks,
        percentage: entry.percentage,
        rank: entry.rankSubject,
        category: session.category
      });
    }
  }
  
  allResults.sort((a, b) => new Date(b.date) - new Date(a.date));
  const recentResults = allResults.slice(0, 5);
  
  console.log('[getParentStudentDetails] Recent results:', JSON.stringify(recentResults, null, 2));
  
  res.json({
    success: true,
    student: {
      _id: student._id,
      name: student.name,
      rollNo: student.rollNo,
      className: student.class?.className || '',
      section: student.class?.section || '',
      rank: currentStudentRank?.rank || null,
      percentage: currentStudentRank?.percentage || 0,
      recentResults
    }
  });
  
  console.log('========== getParentStudentDetails END ==========');
});

export const getParentDailyTests = asyncHandler(async (req, res) => {
  const schoolId = req.user.school?._id ?? req.user.school;
  const { studentId } = req.params;
  const { dateFrom, dateTo, subject } = req.query;
  
  // Get parent from user (for logged-in parent)
  const parent = await Parent.findOne({ _id: req.user._id, school: schoolId, status: 'Active' });
  if (!parent) throw new ApiError(404, 'Parent not found.');
  
  // Check if student is linked to this parent
  if (!parent.linkedStudents.includes(studentId)) {
    throw new ApiError(403, 'You are not authorized to view this student.');
  }
  
  // Get student details
  const student = await Student.findOne({
    _id: studentId,
    school: schoolId,
    isActive: true
  });
  
  if (!student) throw new ApiError(404, 'Student not found.');
  
  // Get active academic session
  const activeSession = await AcademicSession.findOne({
    school: schoolId,
    status: 'active'
  });
  
  if (!activeSession) throw new ApiError(404, 'No active academic session found.');
  
  // Build filter for daily test sessions
  const filter = {
    school: schoolId,
    class: student.class,
    category: 'daily',
    academicSession: activeSession._id
  };
  
  if (subject) filter.subject = subject.toUpperCase();
  
  if (dateFrom && dateTo) {
    filter.testDate = {
      $gte: startOfDay(new Date(dateFrom)),
      $lte: endOfDay(new Date(dateTo))
    };
  } else if (dateFrom) {
    filter.testDate = {
      $gte: startOfDay(new Date(dateFrom))
    };
  } else if (dateTo) {
    filter.testDate = {
      $lte: endOfDay(new Date(dateTo))
    };
  }
  
  // Get daily test sessions
  const sessions = await ResultSession.find(filter)
    .populate('teacher', 'name')
    .sort({ testDate: -1 });
  
  // Get marks for this student from these sessions
  const sessionIds = sessions.map(s => s._id);
  const marks = await MarkEntry.find({
    session: { $in: sessionIds },
    student: studentId
  });
  
  const marksMap = new Map(marks.map(m => [m.session.toString(), m]));
  
  // Combine session data with marks
  const dailyTests = sessions.map(session => {
    const mark = marksMap.get(session._id.toString());
    return {
      _id: session._id,
      date: session.testDate,
      subject: session.subject,
      marksObtained: mark?.marksObtained || 0,
      maxMarks: session.maxMarks,
      percentage: mark?.percentage || 0,
      rankSubject: mark?.rankSubject || 0
    };
  });
  
  res.json({
    success: true,
    dailyTests
  });
});

export const getParentMainExams = asyncHandler(async (req, res) => {
  const schoolId = req.user.school?._id ?? req.user.school;
  const { studentId } = req.params;
  
  // Get parent from user (for logged-in parent)
  const parent = await Parent.findOne({ _id: req.user._id, school: schoolId, status: 'Active' });
  if (!parent) throw new ApiError(404, 'Parent not found.');
  
  // Check if student is linked to this parent
  if (!parent.linkedStudents.includes(studentId)) {
    throw new ApiError(403, 'You are not authorized to view this student.');
  }
  
  // Get student details
  const student = await Student.findOne({
    _id: studentId,
    school: schoolId,
    isActive: true
  });
  
  if (!student) throw new ApiError(404, 'Student not found.');
  
  // Get active academic session
  const activeSession = await AcademicSession.findOne({
    school: schoolId,
    status: 'active'
  });
  
  if (!activeSession) throw new ApiError(404, 'No active academic session found.');
  
  // Get main exam sessions for the student's class
  const sessions = await ResultSession.find({
    school: schoolId,
    class: student.class,
    category: 'main',
    academicSession: activeSession._id
  })
  .sort({ examDate: -1 });
  
  // Group by exam type
  const examTypes = {};
  sessions.forEach(session => {
    if (!examTypes[session.examType]) {
      examTypes[session.examType] = {
        examType: session.examType,
        examDate: session.examDate,
        subjects: []
      };
    }
    examTypes[session.examType].subjects.push({
      subject: session.subject,
      sessionId: session._id
    });
  });
  
  res.json({
    success: true,
    exams: Object.values(examTypes)
  });
});

export const getParentExamDetails = asyncHandler(async (req, res) => {
  const schoolId = req.user.school?._id ?? req.user.school;
  const { studentId, examType } = req.params;
  
  // Get parent from user (for logged-in parent)
  const parent = await Parent.findOne({ _id: req.user._id, school: schoolId, status: 'Active' });
  if (!parent) throw new ApiError(404, 'Parent not found.');
  
  // Check if student is linked to this parent
  if (!parent.linkedStudents.includes(studentId)) {
    throw new ApiError(403, 'You are not authorized to view this student.');
  }
  
  // Get student details
  const student = await Student.findOne({
    _id: studentId,
    school: schoolId,
    isActive: true
  });
  
  if (!student) throw new ApiError(404, 'Student not found.');
  
  // Get active academic session
  const activeSession = await AcademicSession.findOne({
    school: schoolId,
    status: 'active'
  });
  
  if (!activeSession) throw new ApiError(404, 'No active academic session found.');
  
  // Get main exam sessions for this exam type
  const sessions = await ResultSession.find({
    school: schoolId,
    class: student.class,
    category: 'main',
    examType: examType,
    academicSession: activeSession._id
  });
  
  // Get marks for this student
  const sessionIds = sessions.map(s => s._id);
  const marks = await MarkEntry.find({
    session: { $in: sessionIds },
    student: studentId
  });
  
  const marksMap = new Map(marks.map(m => [m.session.toString(), m]));
  
  // Calculate total and percentage
  let totalObtained = 0;
  let totalMax = 0;
  const subjectMarks = sessions.map(session => {
    const mark = marksMap.get(session._id.toString());
    const marksObtained = mark?.marksObtained || 0;
    totalObtained += marksObtained;
    totalMax += session.maxMarks;
    return {
      subject: session.subject,
      marksObtained,
      maxMarks: session.maxMarks,
      percentage: mark?.percentage || 0,
      rankSubject: mark?.rankSubject || 0
    };
  });
  
  const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : 0;
  
  // Get rank (simplified - would need actual calculation)
  const rank = 1;
  
  res.json({
    success: true,
    examDetails: {
      examType,
      subjectMarks,
      totalObtained,
      totalMax,
      percentage,
      rank
    }
  });
});

export const getAdminParents = asyncHandler(async (req, res) => {
  const schoolId = req.user.school?._id ?? req.user.school;
  const { search, searchParent, status, classId } = req.query;
  
  const filter = { school: schoolId, isActive: true };
  
  if (classId) {
    filter.class = classId;
  }
  
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { rollNo: { $regex: search, $options: 'i' } }
    ];
  }
  
  const students = await Student.find(filter)
    .populate('class', 'className section')
    .populate('parent', 'parentName phone email status lastLogin createdAt')
    .sort({ rollNo: 1 });
  
  // Filter by parent name if searchParent is provided
  let filteredStudents = students;
  if (searchParent) {
    filteredStudents = students.filter(s => 
      s.parent && s.parent.parentName && 
      s.parent.parentName.toLowerCase().includes(searchParent.toLowerCase())
    );
  }
  
  // Filter by parent status if provided
  if (status) {
    filteredStudents = filteredStudents.filter(s => s.parent && s.parent.status === status);
  }
  
  // Transform to student-centric format
  const studentParentData = filteredStudents.map(student => ({
    _id: student._id,
    studentName: student.name,
    rollNo: student.rollNo,
    class: student.class?.className || '',
    section: student.class?.section || '',
    classId: student.class?._id || null,
    parentName: student.parent?.parentName || 'Not Linked',
    parentPhone: student.parent?.phone || '-',
    parentEmail: student.parent?.email || '-',
    parentStatus: student.parent?.status || 'Inactive',
    parentLastLogin: student.parent?.lastLogin || null,
    parentCreatedAt: student.parent?.createdAt || null,
    parentId: student.parent?._id || null
  }));
  
  res.json({
    success: true,
    students: studentParentData
  });
});

export const getAdminParentDetails = asyncHandler(async (req, res) => {
  const schoolId = req.user.school?._id ?? req.user.school;
  const { parentId } = req.params;
  
  const parent = await Parent.findOne(withSchool(req, { _id: parentId }));
  if (!parent) throw new ApiError(404, 'Parent not found.');
  
  // Get linked students
  const linkedStudents = await Student.find({
    _id: { $in: parent.linkedStudents },
    school: schoolId,
    isActive: true
  })
  .populate('class', 'className section')
  .sort({ rollNo: 1 });
  
  res.json({
    success: true,
    parent: {
      _id: parent._id,
      parentName: parent.parentName,
      phone: parent.phone,
      email: parent.email,
      status: parent.status,
      lastLogin: parent.lastLogin,
      createdAt: parent.createdAt,
      linkedStudents: linkedStudents.map(s => ({
        _id: s._id,
        name: s.name,
        rollNo: s.rollNo,
        className: s.class?.className || '',
        section: s.class?.section || ''
      }))
    }
  });
});

export const toggleParentStatus = asyncHandler(async (req, res) => {
  const schoolId = req.user.school?._id ?? req.user.school;
  const { parentId } = req.params;
  const { status } = req.body;
  
  if (!['Active', 'Inactive'].includes(status)) {
    throw new ApiError(400, 'Status must be Active or Inactive.');
  }
  
  const parent = await Parent.findOne(withSchool(req, { _id: parentId }));
  if (!parent) throw new ApiError(404, 'Parent not found.');
  
  parent.status = status;
  await parent.save();
  
  res.json({
    success: true,
    message: `Parent status updated to ${status}`,
    parent
  });
});

export const resetParentPassword = asyncHandler(async (req, res) => {
  const schoolId = req.user.school?._id ?? req.user.school;
  const { parentId } = req.params;
  
  const parent = await Parent.findOne(withSchool(req, { _id: parentId }));
  if (!parent) throw new ApiError(404, 'Parent not found.');
  
  // Generate new password
  const newPassword = crypto.randomBytes(8).toString('hex');
  
  // Hash and update password
  parent.password = newPassword;
  await parent.save();
  
  // Get school for email sending
  const school = await School.findById(schoolId);
  
  // Send email if parent has email
  let emailSent = false;
  if (parent.email) {
    try {
      await sendParentCreationEmail(
        school?.schoolName || 'Your School',
        parent.parentName,
        parent.email,
        newPassword,
        process.env.CLIENT_URL || 'http://localhost:5173/parent-login'
      );
      emailSent = true;
    } catch (emailError) {
      console.error('Failed to send parent credential email:', emailError);
    }
  }
  
  res.json({
    success: true,
    message: emailSent ? 'Password reset and email sent' : 'Password reset successfully',
    newPassword: parent.email ? null : newPassword, // Only show password if no email
    emailSent
  });
});
