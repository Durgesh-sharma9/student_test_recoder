import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendTeacherCreationEmail, sendTeacherAssignmentEmail } from '../services/emailService.js';
import { parseTeacherImportFile } from '../services/excelService.js';
import School from '../models/School.js';
import AcademicSession from '../models/AcademicSession.js';

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

export const getUsers = asyncHandler(async (req, res) => {

  const { role } = req.query;

  const filter = {};

  if (role) {
    filter.role = role;
  }

  const schoolFilter = req.user.role === 'super_admin' ? {} : { school: req.user.school };
  const users = await User.find({ ...filter, ...schoolFilter, isActive: true })
    .select('-password')
    .populate('assignedClasses', 'className section')
    .populate('assignments.class', 'className section')
    .sort('-createdAt');

  res.json({
    success: true,
    count: users.length,
    users,
  });

});

export const getUser = asyncHandler(async (req, res) => {

  const user = await User.findById(req.params.id)
    .select('-password')
    .populate('assignedClasses')
    .populate('assignments.class');

  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  res.json({
    success: true,
    user,
  });

});

const schoolIdFromUser = (user) => user.school?._id ?? user.school;

export const createUser = asyncHandler(async (req, res) => {
  const {
    teacherName,
    name,
    email,
    password,
    role,
    phoneNo,
    assignedClasses,
    assignments,
  } = req.body;

  const schoolId = schoolIdFromUser(req.user);
  if (!schoolId) throw new ApiError(403, 'Your account is not linked to a school.');

  const userRole = role || 'teacher';

  // Check only active users in the same school
  const existing = await User.findOne({
    email,
    school: schoolId,
    isActive: true,
  });

  if (existing) {
    throw new ApiError(400, 'Email already in use.');
  }

  // Generate random password if not provided
  const generatedPassword =
    password || Math.random().toString(36).slice(-8);

  // Create user
  const user = await User.create({
    school: schoolId,
    teacherName: teacherName || name,
    name: userRole === 'teacher' ? teacherName || name : name,
    email,
    password: generatedPassword,
    role: userRole,
    phoneNo,
    assignedClasses,
    assignments,
  });

  // Send email only to teachers using Resend
  if (userRole === 'teacher') {
    try {
      const school = await School.findById(schoolId);
      const schoolName = school?.schoolName || 'Your School';
      
      const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`;
      const emailResult = await sendTeacherCreationEmail(
        schoolName,
        teacherName || name || 'Teacher',
        email,
        generatedPassword,
        loginUrl
      );

      if (!emailResult.success) {
        console.log(`[Email Failed] Teacher creation email for ${email}: ${emailResult.error || emailResult.message}`);
      }
    } catch (emailError) {
      console.error('[Email Error] Failed to send teacher creation email:', emailError.message);
    }
  }

  const userObj = user.toObject();

  delete userObj.password;

  res.status(201).json({
    success: true,
    message:
      userRole === 'teacher'
        ? 'Teacher created successfully.'
        : 'User created successfully.',
    user: userObj,
  });

});

export const bulkImportTeachers = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'No file uploaded.');
  }

  const schoolId = schoolIdFromUser(req.user);
  if (!schoolId) throw new ApiError(403, 'Your account is not linked to a school.');

  const records = parseTeacherImportFile(req.file.buffer, req.file.originalname);
  const emailsSeen = new Set();
  const errors = [];
  let imported = 0;

  const existingUsers = await User.find({
    school: schoolId,
    email: { $in: records.map((r) => r.email) },
    isActive: true,
  }).select('email status');

  const existingByEmail = new Map();
  existingUsers.forEach((user) => {
    existingByEmail.set(user.email, user);
  });

  for (const row of records) {
    const { rowNumber, teacherName, email, password, phoneNo } = row;

    if (!teacherName) {
      errors.push({ row: rowNumber, error: 'Missing Name' });
      continue;
    }
    if (!email) {
      errors.push({ row: rowNumber, error: 'Missing Email' });
      continue;
    }
    if (!password) {
      errors.push({ row: rowNumber, error: 'Missing Password' });
      continue;
    }
    if (!phoneNo) {
      errors.push({ row: rowNumber, error: 'Missing Phone No' });
      continue;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      errors.push({ row: rowNumber, error: 'Invalid Email' });
      continue;
    }

    const normalizedPhone = String(phoneNo).replace(/[^0-9+]/g, '');
    if (!/^[+]?\d{7,15}$/.test(normalizedPhone)) {
      errors.push({ row: rowNumber, error: 'Invalid Phone Number' });
      continue;
    }

    if (emailsSeen.has(email)) {
      errors.push({ row: rowNumber, error: 'Duplicate Email' });
      continue;
    }
    emailsSeen.add(email);

    const existing = existingByEmail.get(email);
    if (existing) {
      if (existing.status === 'Inactive') {
        errors.push({ row: rowNumber, error: 'Teacher already exists and is inactive.' });
      } else {
        errors.push({ row: rowNumber, error: 'Duplicate Email' });
      }
      continue;
    }

    try {
      const teacher = await User.create({
        school: schoolId,
        teacherName,
        name: teacherName,
        email,
        password,
        role: 'teacher',
        phoneNo,
      });

      try {
        const school = await School.findById(schoolId);
        const schoolName = school?.schoolName || 'Your School';
        const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`;

        const emailResult = await sendTeacherCreationEmail(
          schoolName,
          teacherName,
          email,
          password,
          loginUrl
        );

        if (!emailResult.success) {
          console.log(`[Email Failed] Teacher creation email for ${email}: ${emailResult.error || emailResult.message}`);
        }
      } catch (emailError) {
        console.error('[Email Error] Failed to send teacher creation email:', emailError.message);
      }

      imported += 1;
    } catch (error) {
      errors.push({ row: rowNumber, error: 'Failed to create teacher' });
    }
  }

  res.json({
    success: true,
    totalRows: records.length,
    imported,
    failed: errors.length,
    errors,
  });
});

export const updateUser = asyncHandler(async (req, res) => {
  const { password, ...updates } = req.body;

  const user = await User.findById(req.params.id);

  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  Object.assign(user, updates);
  if (updates.teacherName && user.role === 'teacher') {
    user.name = updates.teacherName;
  }

  if (password) {
    user.password = password;
  }

  await user.save();

  const userObj = user.toObject();

  delete userObj.password;

  res.json({
    success: true,
    user: userObj,
  });

});

export const deleteUser = asyncHandler(async (req, res) => {

  const user = await User.findById(req.params.id);

  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  // Soft delete
  user.isActive = false;

  await user.save();

  res.json({
    success: true,
    message: 'User deactivated.',
  });

});

export const assignTeacherWorkload = asyncHandler(async (req, res) => {
  const { assignedClasses = [], assignments = [] } = req.body;
  const teacher = await User.findById(req.params.id);
  if (!teacher || teacher.role !== 'teacher') throw new ApiError(404, 'Teacher not found.');

  // Get active session
  const schoolId = teacher.school?._id ?? teacher.school;
  const activeSession = await getActiveSession(schoolId);

  teacher.assignedClasses = assignedClasses;
  teacher.assignments = assignments.map((a) => ({
    class: a.class,
    subject: String(a.subject).toUpperCase(),
    academicSession: activeSession._id,
  }));
  await teacher.save();

  // Send assignment update email using Resend
  try {
    const school = await School.findById(teacher.school);
    const schoolName = school?.schoolName || 'Your School';
    
    const updated = await User.findById(teacher._id)
      .select('-password')
      .populate('assignedClasses', 'className section')
      .populate('assignments.class', 'className section');

    const assignedClassNames = updated.assignedClasses.map(c => `${c.className}-${c.section}`);
    const assignedSubjects = [...new Set(updated.assignments.map(a => a.subject))];

    const emailResult = await sendTeacherAssignmentEmail(
      teacher.teacherName || teacher.name,
      teacher.email,
      assignedClassNames,
      assignedSubjects
    );

    if (!emailResult.success) {
      console.log(`[Email Failed] Teacher assignment email for ${teacher.email}: ${emailResult.error || emailResult.message}`);
    }
  } catch (emailError) {
    console.error('[Email Error] Failed to send teacher assignment email:', emailError.message);
  }

  const updated = await User.findById(teacher._id)
    .select('-password')
    .populate('assignedClasses', 'className section')
    .populate('assignments.class', 'className section');
  res.json({ success: true, teacher: updated });
});