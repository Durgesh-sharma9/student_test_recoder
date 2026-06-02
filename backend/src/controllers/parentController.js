import Parent from '../models/Parent.js';
import Student from '../models/Student.js';
import School from '../models/School.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { withSchool } from '../utils/tenantQuery.js';
import crypto from 'crypto';
import { sendParentCreationEmail } from '../services/emailService.js';

// Helper function to generate random password
const generatePassword = () => {
  return crypto.randomBytes(8).toString('hex');
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
  const schoolId = req.user.school?._id ?? req.user.school;
  
  // Get parent from user (for logged-in parent)
  const parent = await Parent.findOne({ _id: req.user._id, school: schoolId, status: 'Active' });
  if (!parent) throw new ApiError(404, 'Parent not found.');
  
  // Get school settings
  const school = await School.findById(schoolId);
  const showLeaderboard = school?.showParentLeaderboard || false;
  
  // Get linked students with their class and academic session info
  const students = await Student.find({
    _id: { $in: parent.linkedStudents },
    school: schoolId,
    isActive: true
  })
  .populate('class', 'className section')
  .populate('academicSession', 'sessionName');
  
  // Calculate rank and percentage for each student
  const studentsWithStats = await Promise.all(students.map(async (student) => {
    // Get all students in the same class and academic session for ranking
    const allClassStudents = await Student.find({
      class: student.class,
      academicSession: student.academicSession,
      school: schoolId,
      isActive: true
    }).sort({ rollNo: 1 });
    
    // Calculate total marks and percentage for each student
    const studentStats = await Promise.all(allClassStudents.map(async (s) => {
      // Get all daily tests for this student
      const dailyTests = await Student.findById(s._id).populate('dailyTests');
      // This is a simplified calculation - in production, you'd use the actual result calculation
      const totalObtained = 0; // Placeholder - would calculate from actual marks
      const totalMax = 0; // Placeholder
      const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
      
      return {
        studentId: s._id,
        percentage
      };
    }));
    
    // Sort by percentage to get rank
    studentStats.sort((a, b) => b.percentage - a.percentage);
    const rank = studentStats.findIndex(s => s.studentId.toString() === student._id.toString()) + 1;
    
    // Get current student's percentage
    const currentStudentStats = studentStats.find(s => s.studentId.toString() === student._id.toString());
    const percentage = currentStudentStats?.percentage || 0;
    
    return {
      _id: student._id,
      name: student.name,
      rollNo: student.rollNo,
      className: student.class?.className || '',
      section: student.class?.section || '',
      rank,
      percentage: percentage.toFixed(1)
    };
  }));
  
  // Get top 3 students for leaderboard if enabled
  let topStudents = [];
  if (showLeaderboard) {
    // Get all students in the school for leaderboard
    const allSchoolStudents = await Student.find({
      school: schoolId,
      isActive: true
    })
    .populate('class', 'className section')
    .sort({ rollNo: 1 });
    
    // Calculate percentage for all students (simplified)
    const allStudentStats = allSchoolStudents.map(s => ({
      name: s.name,
      percentage: Math.random() * 40 + 60 // Placeholder - would calculate from actual marks
    }));
    
    // Sort by percentage and get top 3
    allStudentStats.sort((a, b) => b.percentage - a.percentage);
    topStudents = allStudentStats.slice(0, 3).map(s => s.name);
  }
  
  res.json({
    success: true,
    students: studentsWithStats,
    showLeaderboard,
    topStudents
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
