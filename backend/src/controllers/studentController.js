import Student from '../models/Student.js';
import User from '../models/User.js';
import Class from '../models/Class.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { withSchool } from '../utils/tenantQuery.js';
import { parseStudentImportFile } from '../services/excelService.js';

export const getStudents = asyncHandler(async (req, res) => {
  const filter = withSchool(req, { isActive: true });

  if (req.query.class) {
    filter.class = req.query.class;
  }

  const students = await Student.find(filter)
    .populate('class', 'className section');

  students.sort((a, b) => Number(a.rollNo) - Number(b.rollNo));

  res.json({
    success: true,
    count: students.length,
    students,
  });
});

export const getStudent = asyncHandler(async (req, res) => {
  const student = await Student.findOne(withSchool(req, { _id: req.params.id })).populate('class');

  if (!student) throw new ApiError(404, 'Student not found.');

  if (req.user.role === 'teacher') {
    const teacher = await User.findById(req.user._id).select('assignedClasses');
    const allowed = (teacher?.assignedClasses || []).map((c) => c.toString());
    if (!allowed.includes(student.class._id.toString())) throw new ApiError(403, 'Not authorized.');
  }

  res.json({ success: true, student });
});

export const createStudent = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    school: req.user.school,
    rollNo: String(req.body.rollNo || '').trim(),
    name: String(req.body.name || '').trim(),
  };

  const classDoc = await Class.findOne(withSchool(req, { _id: payload.class }));
  if (!classDoc) throw new ApiError(404, 'Class not found.');

  const existing = await Student.findOne({
    school: payload.school,
    class: payload.class,
    rollNo: payload.rollNo,
    isActive: true,
  });
  if (existing) throw new ApiError(400, `Roll No ${payload.rollNo} already exists in this class.`);

  const student = await Student.create(payload);
  const populated = await Student.findById(student._id).populate('class', 'className section');

  res.status(201).json({ success: true, student: populated });
});

export const updateStudent = asyncHandler(async (req, res) => {
  const updates = {
    ...req.body,
    ...(req.body.rollNo !== undefined ? { rollNo: String(req.body.rollNo).trim() } : {}),
    ...(req.body.name !== undefined ? { name: String(req.body.name).trim() } : {}),
  };

  const current = await Student.findOne(withSchool(req, { _id: req.params.id }));
  if (!current) throw new ApiError(404, 'Student not found.');

  const targetClass = updates.class || current.class;
  const targetRoll = updates.rollNo || current.rollNo;

  const duplicate = await Student.findOne({
    _id: { $ne: req.params.id },
    school: current.school,
    class: targetClass,
    rollNo: targetRoll,
    isActive: true,
  });
  if (duplicate) throw new ApiError(400, `Roll No ${targetRoll} already exists in this class.`);

  const student = await Student.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  }).populate('class', 'className section');

  res.json({ success: true, student });
});

export const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findOne(withSchool(req, { _id: req.params.id }));
  if (!student) throw new ApiError(404, 'Student not found.');

  student.isActive = false;
  await student.save();

  res.json({ success: true, message: 'Student deactivated.' });
});

export const bulkImportStudents = asyncHandler(async (req, res) => {
  const { classId } = req.body;
  
  if (!req.file) {
    throw new ApiError(400, 'No file uploaded.');
  }

  if (!classId) {
    throw new ApiError(400, 'Class ID is required.');
  }

  const classDoc = await Class.findOne(withSchool(req, { _id: classId }));
  if (!classDoc) throw new ApiError(404, 'Class not found.');

  const parsedData = parseStudentImportFile(req.file.buffer, req.file.originalname);
  
  const results = {
    totalRows: parsedData.length,
    imported: 0,
    failed: 0,
    errors: [],
  };

  const validGenders = ['male', 'female', 'other'];

  // Check for duplicate roll numbers within the uploaded file
  const rollNumbers = new Map();
  for (const row of parsedData) {
    if (row.rollNo) {
      if (rollNumbers.has(row.rollNo)) {
        rollNumbers.get(row.rollNo).push(row.rowNumber);
      } else {
        rollNumbers.set(row.rollNo, [row.rowNumber]);
      }
    }
  }

  // Mark duplicates in file as failed
  for (const [rollNo, rows] of rollNumbers) {
    if (rows.length > 1) {
      for (const rowNumber of rows) {
        results.failed++;
        results.errors.push({ row: rowNumber, error: `Duplicate Roll No ${rollNo} in uploaded file` });
      }
    }
  }

  for (const row of parsedData) {
    try {
      // Skip if this row was already marked as duplicate in file
      const duplicateError = results.errors.find(e => e.row === row.rowNumber && e.error.includes('Duplicate Roll No'));
      if (duplicateError) continue;

      // Validation
      if (!row.rollNo) {
        results.failed++;
        results.errors.push({ row: row.rowNumber, error: 'Roll No is required' });
        continue;
      }

      if (!row.name) {
        results.failed++;
        results.errors.push({ row: row.rowNumber, error: 'Student Name is required' });
        continue;
      }

      if (!row.gender || !validGenders.includes(row.gender)) {
        results.failed++;
        results.errors.push({ row: row.rowNumber, error: 'Gender must be male, female, or other' });
        continue;
      }

      // Check for duplicate roll no in the same class
      const existing = await Student.findOne({
        school: req.user.school,
        class: classId,
        rollNo: row.rollNo,
        isActive: true,
      });

      if (existing) {
        results.failed++;
        results.errors.push({ row: row.rowNumber, error: `Roll No ${row.rollNo} already exists in this class` });
        continue;
      }

      // Create student
      await Student.create({
        school: req.user.school,
        class: classId,
        rollNo: row.rollNo,
        name: row.name,
        gender: row.gender,
      });

      results.imported++;
    } catch (error) {
      results.failed++;
      results.errors.push({ row: row.rowNumber, error: error.message });
    }
  }

  res.json({
    success: true,
    ...results,
  });
});
