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

  const classes = await Class.find(filter).lean();

  for (const cls of classes) {
    cls.studentCount = await Student.countDocuments({
      class: cls._id,
      school: cls.school,
      isActive: true,
    });
  }

  const PREDEFINED_ORDER = ['NURSERY', 'LKG', 'UKG', 'PREP'];

  classes.sort((a, b) => {
    const nameA = String(a.className || '').toUpperCase().trim();
    const nameB = String(b.className || '').toUpperCase().trim();
    
    const idxA = PREDEFINED_ORDER.indexOf(nameA);
    const idxB = PREDEFINED_ORDER.indexOf(nameB);
    
    if (idxA !== -1 && idxB !== -1) {
      if (idxA !== idxB) return idxA - idxB;
    } else if (idxA !== -1) {
      return -1;
    } else if (idxB !== -1) {
      return 1;
    } else {
      const numA = Number(nameA);
      const numB = Number(nameB);
      const isNumA = !isNaN(numA) && nameA !== '';
      const isNumB = !isNaN(numB) && nameB !== '';
      
      if (isNumA && isNumB) {
        const diff = numA - numB;
        if (diff !== 0) return diff;
      } else if (isNumA) {
        return 1;
      } else if (isNumB) {
        return -1;
      } else {
        const comp = nameA.localeCompare(nameB);
        if (comp !== 0) return comp;
      }
    }
    
    const secA = String(a.section || '').toUpperCase().trim();
    const secB = String(b.section || '').toUpperCase().trim();
    return secA.localeCompare(secB);
  });

  res.json({
    success: true,
    count: classes.length,
    classes,
  });
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
  const classDoc = await Class.findOne(
    withSchool(req, { _id: req.params.id })
  );

  if (!classDoc) {
    throw new ApiError(404, 'Class not found.');
  }

  const filter = {
    class: req.params.id,
    isActive: true,
    school: classDoc.school,
  };

  // Filter by academic session if provided
  if (req.query.academicSession) {
    filter.academicSession = req.query.academicSession;
  }

  const students = await Student.find(filter).populate('parent', 'parentName phone');

  // Numeric sorting of roll numbers
  students.sort(
    (a, b) => Number(a.rollNo) - Number(b.rollNo)
  );

  res.json({
    success: true,
    count: students.length,
    students,
  });
});
