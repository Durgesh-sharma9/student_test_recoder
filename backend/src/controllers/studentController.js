import Student from '../models/Student.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getStudents = asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.class) filter.class = req.query.class;

  const students = await Student.find(filter)
    .populate('class', 'name section grade')
    .populate('parent', 'name email phone')
    .sort('rollNumber');

  res.json({ success: true, count: students.length, students });
});

export const getStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id)
    .populate('class')
    .populate('parent', 'name email phone');

  if (!student) throw new ApiError(404, 'Student not found.');

  if (req.user.role === 'parent') {
    const childIds = req.user.children.map((c) => c.toString());
    if (!childIds.includes(student._id.toString())) {
      throw new ApiError(403, 'Not authorized to view this student.');
    }
  }

  res.json({ success: true, student });
});

export const createStudent = asyncHandler(async (req, res) => {
  const student = await Student.create(req.body);

  if (student.parent) {
    await User.findByIdAndUpdate(student.parent, {
      $addToSet: { children: student._id },
    });
  }

  const populated = await Student.findById(student._id)
    .populate('class', 'name section grade')
    .populate('parent', 'name email');

  res.status(201).json({ success: true, student: populated });
});

export const updateStudent = asyncHandler(async (req, res) => {
  const student = await Student.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })
    .populate('class', 'name section grade')
    .populate('parent', 'name email');

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
