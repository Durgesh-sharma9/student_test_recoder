import Class from '../models/Class.js';
import Student from '../models/Student.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getClasses = asyncHandler(async (req, res) => {
  const filter = { isActive: true };

  if (req.user.role === 'teacher') {
    filter.teacher = req.user._id;
  }

  const classes = await Class.find(filter)
    .populate('teacher', 'name email')
    .sort('grade name section');

  res.json({ success: true, count: classes.length, classes });
});

export const getClass = asyncHandler(async (req, res) => {
  const classDoc = await Class.findById(req.params.id).populate('teacher', 'name email');
  if (!classDoc) throw new ApiError(404, 'Class not found.');

  if (req.user.role === 'teacher' && classDoc.teacher?._id?.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Not authorized for this class.');
  }

  res.json({ success: true, class: classDoc });
});

export const createClass = asyncHandler(async (req, res) => {
  const classDoc = await Class.create(req.body);

  if (classDoc.teacher) {
    await Class.findByIdAndUpdate(classDoc._id, { teacher: classDoc.teacher });
    const User = (await import('../models/User.js')).default;
    await User.findByIdAndUpdate(classDoc.teacher, {
      $addToSet: { assignedClasses: classDoc._id },
    });
  }

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
    .populate('parent', 'name email phone')
    .sort('rollNumber');

  res.json({ success: true, count: students.length, students });
});
