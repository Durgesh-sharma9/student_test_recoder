import Class from '../models/Class.js';
import Student from '../models/Student.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import User from '../models/User.js';

export const getClasses = asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.user.role === 'teacher') {
    const teacher = await User.findById(req.user._id).select('assignedClasses');
    filter._id = { $in: teacher?.assignedClasses || [] };
  }
  const classes = await Class.find(filter).sort('className section');

  res.json({ success: true, count: classes.length, classes });
});

export const getClass = asyncHandler(async (req, res) => {
  const classDoc = await Class.findById(req.params.id);
  if (!classDoc) throw new ApiError(404, 'Class not found.');

  if (req.user.role === 'teacher') {
    const teacher = await User.findById(req.user._id).select('assignedClasses');
    const allowed = (teacher?.assignedClasses || []).map((c) => c.toString());
    if (!allowed.includes(classDoc._id.toString())) throw new ApiError(403, 'Not authorized for this class.');
  }

  res.json({ success: true, class: classDoc });
});

export const createClass = asyncHandler(async (req, res) => {
  const payload = { ...req.body, className: String(req.body.className || '').toUpperCase() };
  const classDoc = await Class.create(payload);
  res.status(201).json({ success: true, class: classDoc });
});

export const updateClass = asyncHandler(async (req, res) => {
  const classDoc = await Class.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!classDoc) throw new ApiError(404, 'Class not found.');
  res.json({ success: true, class: classDoc });
});

export const deleteClass = asyncHandler(async (req, res) => {
  const classDoc = await Class.findById(req.params.id);
  if (!classDoc) throw new ApiError(404, 'Class not found.');

  classDoc.isActive = false;
  await classDoc.save();

  res.json({ success: true, message: 'Class deactivated.' });
});

export const getClassStudents = asyncHandler(async (req, res) => {
  const students = await Student.find({ class: req.params.id, isActive: true })
    .sort('rollNo');

  res.json({ success: true, count: students.length, students });
});
