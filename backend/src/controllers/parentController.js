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
