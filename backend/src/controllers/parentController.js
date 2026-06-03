import Parent from '../models/Parent.js';
import Student from '../models/Student.js';
import School from '../models/School.js';
import ResultSession from '../models/ResultSession.js';
import MarkEntry from '../models/MarkEntry.js';
import AcademicSession from '../models/AcademicSession.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { withSchool } from '../utils/tenantQuery.js';
import crypto from 'crypto';
import { sendParentCreationEmail } from '../services/emailService.js';
import { startOfDay, endOfDay } from 'date-fns';

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
      email: email.trim().toLowerCase(),
      status: 'Active'
    });
  }
  
  // If not found by email, try by phone
  if (!parent) {
    parent = await Parent.findOne({
      school: schoolId,
      phone: phone.trim(),
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
    parentName: parentName.trim(),
    email: email ? email.trim().toLowerCase() : undefined,
    phone: phone.trim(),
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
  console.log('[getParentStudents] req.user:', JSON.stringify(req.user, null, 2));
  console.log('[getParentStudents] req.user._id:', req.user._id);
  console.log('[getParentStudents] req.user._id type:', typeof req.user._id);
  
  const schoolId = req.user.school?._id ?? req.user.school;
  console.log('[getParentStudents] schoolId:', schoolId);
  
  // Get parent from user (for logged-in parent)
  console.log('[getParentStudents] Querying parent...');
  const parent = await Parent.findOne({ _id: req.user._id, school: schoolId, status: 'Active' });
  console.log('[getParentStudents] Parent query result:', parent);
  
  if (!parent) {
    console.log('[getParentStudents] Parent not found');
    throw new ApiError(404, 'Parent not found.');
  }
  
  console.log('[getParentStudents] Parent found:', parent._id);
  console.log('[getParentStudents] Parent linkedStudents:', parent.linkedStudents);
  console.log('[getParentStudents] Parent linkedStudents type:', typeof parent.linkedStudents);
  console.log('[getParentStudents] Parent linkedStudents length:', parent.linkedStudents?.length);
  
  // Get linked students with their class and academic session info
  console.log('[getParentStudents] Querying students...');
  console.log('[getParentStudents] Student query filter:', {
    _id: { $in: parent.linkedStudents },
    school: schoolId,
    isActive: true
  });
  
  const students = await Student.find({
    _id: { $in: parent.linkedStudents },
    school: schoolId,
    isActive: true
  })
  .populate('class', 'className section')
  .populate('academicSession', 'sessionName');
  
  console.log('[getParentStudents] Students found:', students.length);
  console.log('[getParentStudents] Students:', JSON.stringify(students, null, 2));
  
  // Return basic student data without rank/percentage calculation
  // Rank and percentage calculation requires MarkEntry/ResultSession architecture
  const studentsWithBasicInfo = students.map(student => ({
    _id: student._id,
    name: student.name,
    rollNo: student.rollNo,
    className: student.class?.className || '',
    section: student.class?.section || '',
    sessionName: student.academicSession?.sessionName || ''
  }));
  
  console.log('[getParentStudents] Sending response');
  console.log('========== getParentStudents END ==========');
  
  res.json({
    success: true,
    students: studentsWithBasicInfo
  });
});

export const getParentStudentDetails = asyncHandler(async (req, res) => {
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
  
  // Get all students in the same class for ranking
  const allClassStudents = await Student.find({
    class: student.class,
    academicSession: student.academicSession,
    school: schoolId,
    isActive: true
  }).sort({ rollNo: 1 });
  
  // Calculate rank and percentage (simplified - would use actual result calculation in production)
  const rank = 1; // Placeholder
  const percentage = 85.5; // Placeholder
  const average = 78.2; // Placeholder
  
  // Get recent daily tests for this student
  const recentDailyTests = []; // Placeholder - would fetch from actual daily test results
  
  res.json({
    success: true,
    student: {
      _id: student._id,
      name: student.name,
      rollNo: student.rollNo,
      className: student.class?.className || '',
      section: student.class?.section || '',
      rank,
      percentage: percentage.toFixed(1),
      average: average.toFixed(1),
      recentDailyTests
    }
  });
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
  const { search, status } = req.query;
  
  const filter = withSchool(req, {});
  
  if (search) {
    filter.$or = [
      { parentName: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }
  
  if (status) {
    filter.status = status;
  }
  
  const parents = await Parent.find(filter).sort({ createdAt: -1 });
  
  // Get linked students count for each parent by checking students where parent field matches
  const parentsWithCounts = await Promise.all(parents.map(async (parent) => {
    const linkedStudents = await Student.find({
      parent: parent._id,
      school: schoolId,
      isActive: true
    });
    
    return {
      _id: parent._id,
      parentName: parent.parentName,
      phone: parent.phone,
      email: parent.email,
      status: parent.status,
      childrenCount: linkedStudents.length
    };
  }));
  
  res.json({
    success: true,
    parents: parentsWithCounts
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
