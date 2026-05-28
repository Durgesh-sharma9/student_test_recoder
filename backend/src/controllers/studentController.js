import Student from '../models/Student.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getStudents = asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.class) filter.class = req.query.class;

  const students = await Student.find(filter)
    .populate('class', 'className section academicYear')
    .sort('rollNo');

  res.json({ success: true, count: students.length, students });
});

export const getStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id)
    .populate('class');

  if (!student) throw new ApiError(404, 'Student not found.');

  if (req.user.role === 'teacher') {
    const teacher = await User.findById(req.user._id).select('assignedClasses');
    const allowed = (teacher?.assignedClasses || []).map((c) => c.toString());
    if (!allowed.includes(student.class._id.toString())) throw new ApiError(403, 'Not authorized to view this student.');
  }

  res.json({ success: true, student });
});

export const createStudent = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    rollNo: String(req.body.rollNo || '').trim(),
    name: String(req.body.name || '').trim(),
  };
  const existing = await Student.findOne({
    class: payload.class,
    rollNo: payload.rollNo,
    isActive: true,
  });
  if (existing) {
    throw new ApiError(400, `Roll No ${payload.rollNo} already exists in this class.`);
  }

  const student = await Student.create(payload);

  const populated = await Student.findById(student._id)
    .populate('class', 'className section academicYear');

  res.status(201).json({ success: true, student: populated });
});

export const updateStudent = asyncHandler(async (req, res) => {
  const updates = {
    ...req.body,
    ...(req.body.rollNo !== undefined ? { rollNo: String(req.body.rollNo).trim() } : {}),
    ...(req.body.name !== undefined ? { name: String(req.body.name).trim() } : {}),
  };
  const current = await Student.findById(req.params.id);
  if (!current) throw new ApiError(404, 'Student not found.');

  const targetClass = updates.class || current.class;
  const targetRoll = updates.rollNo || current.rollNo;
  const duplicate = await Student.findOne({
    _id: { $ne: req.params.id },
    class: targetClass,
    rollNo: targetRoll,
    isActive: true,
  });
  if (duplicate) {
    throw new ApiError(400, `Roll No ${targetRoll} already exists in this class.`);
  }

  const student = await Student.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  })
    .populate('class', 'className section academicYear');

  if (!student) throw new ApiError(404, 'Student not found.');
  res.json({ success: true, student });
});

export const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, 'Student not found.');

  student.isActive = false;
  await student.save();

  res.json({ success: true, message: 'Student deactivated.' });
});
