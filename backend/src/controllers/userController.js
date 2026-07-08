import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendTeacherCreationEmail, sendTeacherAssignmentEmail } from '../services/emailService.js';
import { parseTeacherImportFile } from '../services/excelService.js';
import School from '../models/School.js';
import AcademicSession from '../models/AcademicSession.js';
import mongoose from 'mongoose';

const normalizeTeacherAssignments = (user) => {
  if (!user || user.role !== 'teacher') return user;

  if (Array.isArray(user.assignments) && user.assignments.length > 0) {
    return user;
  }

  if (Array.isArray(user.assignedClasses) && user.assignedClasses.length > 0) {
    user.assignments = user.assignedClasses.map((cls) => ({
      class: cls,
      subject: 'ASSIGNED',
      totalChapters: 0,
      academicSession: null,
    }));
  } else {
    user.assignments = [];
  }

  return user;
};

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

// Helper function to generate secure password (8-10 chars, avoid O,0,I,l)
const generateSecurePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const length = Math.floor(Math.random() * 3) + 8; // 8-10 characters
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

export const getUsers = asyncHandler(async (req, res) => {

  const { role } = req.query;

  const filter = {};

  if (role) {
    filter.role = role;
  }

  const schoolFilter = req.user.role === 'super_admin' ? {} : { school: req.user.school };
  
  console.log('=== GET USERS START ===');
  console.log('Role filter:', role);
  console.log('School filter:', schoolFilter);
  
  const users = await User.find({ ...filter, ...schoolFilter, isActive: true })
    .select('-password')
    .populate('assignedClasses', 'className section')
    .populate('assignments.class', 'className section')
    .sort('-createdAt');

  const normalizedUsers = users.map(normalizeTeacherAssignments);

  console.log('Total users found:', normalizedUsers.length);
  
  if (role === 'teacher') {
    normalizedUsers.forEach((user, idx) => {
      console.log(`Teacher ${idx}:`, {
        _id: user._id,
        name: user.teacherName || user.name,
        hasAssignments: !!user.assignments,
        assignmentsCount: user.assignments?.length || 0,
        assignmentClass: user.assignments?.[0]?.class,
        assignmentSubject: user.assignments?.[0]?.subject,
        assignments: user.assignments
      });
    });
  }
  
  console.log('=== GET USERS END ===');

  res.json({
    success: true,
    count: normalizedUsers.length,
    users: normalizedUsers,
  });

});

export const getUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid user ID');
  }

  console.log('[getUser] Fetching user with ID:', id);

  const user = await User.findById(id)
    .select('-password')
    .populate('assignedClasses')
    .populate('assignments.class');

  normalizeTeacherAssignments(user);

  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  console.log('[getUser] User found:', user.name || user.teacherName);
  console.log('[getUser] User role:', user.role);
  console.log('[getUser] Assignments count:', user.assignments?.length || 0);
  console.log('[getUser] Assignments:', JSON.stringify(user.assignments, null, 2));

  res.json({
    success: true,
    user,
  });

});

const schoolIdFromUser = (user) => user.school?._id ?? user.school;

export const createUser = asyncHandler(async (req, res) => {
  console.log('[User Controller] Creating new user');
  console.log('[User Controller] Request body:', JSON.stringify(req.body));
  console.log('[User Controller] req.user:', JSON.stringify(req.user));
  
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
  console.log('[User Controller] schoolId:', schoolId);
  if (!schoolId) throw new ApiError(403, 'Your account is not linked to a school.');

  const userRole = role || 'teacher';
  console.log('[User Controller] userRole:', userRole);

  // Check only active users in the same school
  const existing = await User.findOne({
    email,
    school: schoolId,
    isActive: true,
  });

  if (existing) {
    console.log('[User Controller] Email already in use:', email);
    throw new ApiError(400, 'Email already in use.');
  }

  // Auto-generate password for teachers, use provided password for other roles
  let generatedPassword;
  let mustChangePassword = false;
  
  if (userRole === 'teacher' && !password) {
    generatedPassword = generateSecurePassword();
    mustChangePassword = true;
  } else {
    generatedPassword = password || generateSecurePassword();
  }

  // Ensure password is always generated
  if (!generatedPassword || generatedPassword.length < 6) {
    console.error('[User Controller] Generated password is invalid, regenerating');
    generatedPassword = generateSecurePassword();
    mustChangePassword = true;
  }

  console.log('[User Controller] Creating user with role:', userRole);
  console.log('[User Controller] Email:', email);
  console.log('[User Controller] generatedPassword length:', generatedPassword?.length);

  try {
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
      mustChangePassword,
    });

    console.log('[User Controller] User created successfully:', user._id);

    // Send email only to teachers using Resend
    let emailSent = false;
    let emailError = null;

    if (userRole === 'teacher') {
      console.log('[User Controller] Attempting to send teacher creation email');
      try {
        const school = await School.findById(schoolId);
        const schoolName = school?.schoolName || 'Your School';
        
        const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`;
        console.log('[User Controller] Sending email to:', email);
        console.log('[User Controller] School:', schoolName);

        const emailResult = await sendTeacherCreationEmail(
          schoolName,
          teacherName || name || 'Teacher',
          email,
          generatedPassword,
          loginUrl
        );

        if (emailResult.success) {
          console.log('[User Controller] Teacher creation email sent successfully to:', email);
          emailSent = true;
        } else {
          console.log(`[User Controller] Email Failed] Teacher creation email for ${email}: ${emailResult.error || emailResult.message}`);
          emailError = emailResult.error || emailResult.message;
        }
      } catch (emailError) {
        console.error('[User Controller] Email Error] Failed to send teacher creation email:', emailError.message);
        console.error('[User Controller] Email Error Stack:', emailError.stack);
        emailError = emailError.message;
      }
    }

    const userObj = user.toObject();

    // Include password in response for WhatsApp sharing (will be cleared on frontend)
    userObj.tempPassword = generatedPassword;
    delete userObj.password;

    res.status(201).json({
      success: true,
      message:
        userRole === 'teacher'
          ? (emailSent 
              ? 'Teacher created successfully. Credentials email sent.'
              : 'Teacher created successfully but email could not be delivered. Please check SMTP configuration.')
          : 'User created successfully.',
      user: userObj,
      emailSent,
      emailError: emailError || undefined,
    });
  } catch (createError) {
    console.error('[User Controller] Error creating user:', createError.message);
    console.error('[User Controller] Error stack:', createError.stack);
    throw createError;
  }

});

export const bulkImportTeachers = asyncHandler(async (req, res) => {
  console.log('[User Controller] Starting bulk teacher import');
  if (!req.file) {
    throw new ApiError(400, 'No file uploaded.');
  }

  const schoolId = schoolIdFromUser(req.user);
  if (!schoolId) throw new ApiError(403, 'Your account is not linked to a school.');

  const records = parseTeacherImportFile(req.file.buffer, req.file.originalname);
  console.log('[User Controller] Parsed', records.length, 'teacher records');
  const emailsSeen = new Set();
  const errors = [];
  let imported = 0;
  let reactivated = 0;

  const existingUsers = await User.find({
    school: schoolId,
    email: { $in: records.map((r) => r.email) },
    isActive: true,
  }).select('email status');

  const existingByEmail = new Map();
  existingUsers.forEach((user) => {
    existingByEmail.set(user.email, user);
  });

  // Also check for inactive users for reactivation
  const inactiveUsers = await User.find({
    school: schoolId,
    email: { $in: records.map((r) => r.email) },
    isActive: false,
    status: 'Inactive',
  }).select('email status _id');

  const inactiveByEmail = new Map();
  inactiveUsers.forEach((user) => {
    inactiveByEmail.set(user.email, user);
  });

  console.log('[User Controller] Found', existingUsers.length, 'active users');
  console.log('[User Controller] Found', inactiveUsers.length, 'inactive users');

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

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      errors.push({ row: rowNumber, error: 'Invalid Email' });
      continue;
    }

    if (phoneNo) {
      const normalizedPhone = String(phoneNo).replace(/[^0-9+]/g, '');
      if (!/^[+]?\d{7,15}$/.test(normalizedPhone)) {
        errors.push({ row: rowNumber, error: 'Invalid Phone Number' });
        continue;
      }
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

    // Check for inactive teacher - REACTIVATE AND SEND EMAIL
    const inactive = inactiveByEmail.get(email);
    if (inactive) {
      console.log('[User Controller] Reactivating inactive teacher:', email);
      
      // Auto-generate new password for reactivated teacher
      const generatedPassword = password || generateSecurePassword();
      const mustChangePassword = !password;

      try {
        // Reactivate the teacher
        const teacher = await User.findByIdAndUpdate(
          inactive._id,
          {
            isActive: true,
            status: 'Active',
            teacherName,
            name: teacherName,
            password: generatedPassword,
            phoneNo: phoneNo || undefined,
            mustChangePassword,
          },
          { new: true }
        );

        console.log('[User Controller] Teacher reactivated successfully:', teacher._id);

        // Send email to reactivated teacher
        try {
          const school = await School.findById(schoolId);
          const schoolName = school?.schoolName || 'Your School';
          const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`;

          console.log('[User Controller] Sending reactivation email to:', email);

          const emailResult = await sendTeacherCreationEmail(
            schoolName,
            teacherName,
            email,
            generatedPassword,
            loginUrl
          );

          if (emailResult.success) {
            console.log('[User Controller] Reactivation email sent successfully to:', email);
          } else {
            console.log(`[User Controller] Email Failed] Reactivation email for ${email}: ${emailResult.error || emailResult.message}`);
          }
        } catch (emailError) {
          console.error('[User Controller] Email Error] Failed to send reactivation email:', emailError.message);
        }

        reactivated += 1;
      } catch (error) {
        console.error('[User Controller] Failed to reactivate teacher:', error.message);
        errors.push({ row: rowNumber, error: 'Failed to reactivate teacher' });
      }
      continue;
    }

    // Auto-generate password if not provided
    const generatedPassword = password || generateSecurePassword();
    const mustChangePassword = !password; // Force password change if password was auto-generated

    try {
      const teacher = await User.create({
        school: schoolId,
        teacherName,
        name: teacherName,
        email,
        password: generatedPassword,
        role: 'teacher',
        phoneNo,
        mustChangePassword,
      });

      console.log('[User Controller] Teacher created successfully:', teacher._id);

      try {
        const school = await School.findById(schoolId);
        const schoolName = school?.schoolName || 'Your School';
        const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`;

        console.log('[User Controller] Sending creation email to:', email);

        const emailResult = await sendTeacherCreationEmail(
          schoolName,
          teacherName,
          email,
          generatedPassword,
          loginUrl
        );

        if (emailResult.success) {
          console.log('[User Controller] Teacher creation email sent successfully to:', email);
        } else {
          console.log(`[User Controller] Email Failed] Teacher creation email for ${email}: ${emailResult.error || emailResult.message}`);
        }
      } catch (emailError) {
        console.error('[User Controller] Email Error] Failed to send teacher creation email:', emailError.message);
      }

      imported += 1;
    } catch (error) {
      console.error('[User Controller] Failed to create teacher:', error.message);
      errors.push({ row: rowNumber, error: 'Failed to create teacher' });
    }
  }

  console.log('[User Controller] Bulk import completed. Imported:', imported, 'Reactivated:', reactivated, 'Errors:', errors.length);

  res.json({
    success: true,
    message: `Imported ${imported} teachers, reactivated ${reactivated} teachers.`,
    totalRows: records.length,
    imported,
    reactivated,
    failed: errors.length,
    errors,
  });
});

export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { password, ...updates } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid user ID');
  }

  const user = await User.findById(id);

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
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid user ID');
  }

  const user = await User.findById(id);

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
  const { id } = req.params;
  const { assignedClasses = [], assignments = [] } = req.body;

  console.log('[assignTeacherWorkload] id received:', id);
  console.log('[assignTeacherWorkload] id type:', typeof id);
  console.log('[assignTeacherWorkload] request body:', req.body);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    console.error('[assignTeacherWorkload] Invalid ObjectId:', id);
    throw new ApiError(400, 'Invalid user ID');
  }

  const teacher = await User.findById(id);
  if (!teacher || teacher.role !== 'teacher') throw new ApiError(404, 'Teacher not found.');

  // Get active session
  const schoolId = teacher.school?._id ?? teacher.school;
  const activeSession = await getActiveSession(schoolId);

  teacher.assignedClasses = assignedClasses;
  teacher.assignments = assignments.map((a) => ({
    class: a.class,
    subject: String(a.subject).toUpperCase(),
    totalChapters: Number(a.totalChapters) || 0,
    academicSession: activeSession._id,
  }));
  await teacher.save();

  // Send assignment update email using Resend
  try {
    const school = await School.findById(teacher.school);
    const schoolName = school?.schoolName || 'Your School';
    const loginUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    
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
      assignedSubjects,
      schoolName,
      loginUrl
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

export const resendTeacherCredentials = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid user ID');
  }

  const teacher = await User.findById(id);
  if (!teacher || teacher.role !== 'teacher') throw new ApiError(404, 'Teacher not found.');

  console.log('[User Controller] Resending credentials for teacher:', teacher.email);

  // Generate new temporary password
  const generatedPassword = generateSecurePassword();
  teacher.password = generatedPassword;
  teacher.mustChangePassword = true;
  await teacher.save();

  console.log('[User Controller] New password generated for teacher:', teacher._id);

  // Send email
  let emailSent = false;
  let emailError = null;

  try {
    const school = await School.findById(teacher.school);
    const schoolName = school?.schoolName || 'Your School';
    const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`;

    console.log('[User Controller] Sending credentials email to:', teacher.email);

    const emailResult = await sendTeacherCreationEmail(
      schoolName,
      teacher.teacherName || teacher.name,
      teacher.email,
      generatedPassword,
      loginUrl
    );

    if (emailResult.success) {
      console.log('[User Controller] Credentials email sent successfully to:', teacher.email);
      emailSent = true;
    } else {
      console.log(`[User Controller] Email Failed] Credentials email for ${teacher.email}: ${emailResult.error || emailResult.message}`);
      emailError = emailResult.error || emailResult.message;
    }
  } catch (emailError) {
    console.error('[User Controller] Email Error] Failed to send credentials email:', emailError.message);
    emailError = emailError.message;
  }

  const userObj = teacher.toObject();
  userObj.tempPassword = generatedPassword;
  delete userObj.password;

  res.json({
    success: true,
    message: emailSent 
      ? 'Credentials email sent successfully.' 
      : 'Credentials email could not be delivered. Please check SMTP configuration.',
    user: userObj,
    emailSent,
    emailError: emailError || undefined,
  });
});