import Class from '../models/Class.js';
import Student from '../models/Student.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { withSchool } from '../utils/tenantQuery.js';
import { CLASS_SUGGESTIONS, SECTION_SUGGESTIONS } from '../utils/constants.js';

export const getSuggestions = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    classSuggestions: CLASS_SUGGESTIONS,
    sectionSuggestions: SECTION_SUGGESTIONS,
  });
});

export const getClasses = asyncHandler(async (req, res) => {
  const filter = withSchool(req, { isActive: true });

  if (req.user.role === 'teacher') {
    const teacher = await User.findById(req.user._id).select('assignedClasses');
    filter._id = { $in: teacher?.assignedClasses || [] };
  }

  const classes = await Class.find(filter).sort('className section');
  res.json({ success: true, count: classes.length, classes });
});

export const getClass = asyncHandler(async (req, res) => {
  const classDoc = await Class.findOne(withSchool(req, { _id: req.params.id }));
  if (!classDoc) throw new ApiError(404, 'Class not found.');

  if (req.user.role === 'teacher') {
    const teacher = await User.findById(req.user._id).select('assignedClasses');
    const allowed = (teacher?.assignedClasses || []).map((c) => c.toString());
    if (!allowed.includes(classDoc._id.toString())) throw new ApiError(403, 'Not authorized for this class.');
  }

  res.json({ success: true, class: classDoc });
});

export const createClass = asyncHandler(async (req, res) => {
  const className = String(req.body.className || '').toUpperCase().trim();
  const section = String(req.body.section || '').toUpperCase().trim();
  const school = req.user.school?._id ?? req.user.school;
  if (!school) throw new ApiError(403, 'Your account is not linked to a school.');
  if (!className || !section) throw new ApiError(400, 'Class name and section are required.');

  const exists = await Class.findOne({ school, className, section, isActive: true });
  if (exists) throw new ApiError(400, 'Class with this section already exists.');

  const classDoc = await Class.create({ school, className, section });
  res.status(201).json({ success: true, class: classDoc });
});

export const updateClass = asyncHandler(async (req, res) => {
  const updates = { ...req.body };
  if (updates.className) updates.className = String(updates.className).toUpperCase().trim();
  if (updates.section) updates.section = String(updates.section).toUpperCase().trim();

  const classDoc = await Class.findOneAndUpdate(withSchool(req, { _id: req.params.id }), updates, {
    new: true,
    runValidators: true,
  });

  if (!classDoc) throw new ApiError(404, 'Class not found.');
  res.json({ success: true, class: classDoc });
});

export const deleteClass = asyncHandler(async (req, res) => {
  const classDoc = await Class.findOne(withSchool(req, { _id: req.params.id }));
  if (!classDoc) throw new ApiError(404, 'Class not found.');

  classDoc.isActive = false;
  await classDoc.save();

  res.json({ success: true, message: 'Class deactivated.' });
});

export const getClassStudents = asyncHandler(async (req, res) => {
  const classDoc = await Class.findOne(withSchool(req, { _id: req.params.id }));
  if (!classDoc) throw new ApiError(404, 'Class not found.');

  const students = await Student.find({ class: req.params.id, isActive: true, school: classDoc.school }).sort('rollNo');
  res.json({ success: true, count: students.length, students });
});
