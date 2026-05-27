import TestResult from '../models/TestResult.js';
import Student from '../models/Student.js';
import Class from '../models/Class.js';
import {
  generateTemplate,
  parseUploadedExcel,
  exportResultsExcel,
} from '../services/excelService.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const verifyTeacherClass = async (user, classId) => {
  const classDoc = await Class.findById(classId);
  if (!classDoc) throw new ApiError(404, 'Class not found.');

  if (user.role === 'teacher' && classDoc.teacher?.toString() !== user._id.toString()) {
    throw new ApiError(403, 'You are not assigned to this class.');
  }
  return classDoc;
};

export const downloadTemplate = asyncHandler(async (req, res) => {
  const { classId, testName, testDate } = req.query;

  if (!classId || !testName || !testDate) {
    throw new ApiError(400, 'classId, testName, and testDate are required.');
  }

  await verifyTeacherClass(req.user, classId);

  const buffer = await generateTemplate(classId, testName, testDate);
  const filename = `marks_template_${testName.replace(/\s+/g, '_')}.xlsx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(Buffer.from(buffer));
});

export const uploadMarks = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Excel file is required.');

  const parsed = parseUploadedExcel(req.file.buffer);
  await verifyTeacherClass(req.user, parsed.classId);

  const savedResults = [];

  for (const row of parsed.results) {
    let student = null;
    if (row.studentId) {
      student = await Student.findById(row.studentId);
    }
    if (!student && row.rollNumber) {
      student = await Student.findOne({
        rollNumber: row.rollNumber,
        class: parsed.classId,
        isActive: true,
      });
    }

    if (!student) continue;

    const result = await TestResult.findOneAndUpdate(
      {
        student: student._id,
        testName: parsed.testName,
        testDate: parsed.testDate,
      },
      {
        student: student._id,
        class: parsed.classId,
        testName: parsed.testName,
        testDate: parsed.testDate,
        subjects: row.subjects,
        totalObtained: row.totalObtained,
        totalMax: row.totalMax,
        average: row.average,
        percentage: row.percentage,
        rank: row.rank,
        uploadedBy: req.user._id,
      },
      { upsert: true, new: true, runValidators: true }
    );

    savedResults.push(result);
  }

  res.json({
    success: true,
    message: `Processed ${savedResults.length} student records. Rank calculated by highest total marks.`,
    testName: parsed.testName,
    testDate: parsed.testDate,
    count: savedResults.length,
    results: savedResults,
  });
});

export const getTestResults = asyncHandler(async (req, res) => {
  const { classId, testName, studentId } = req.query;
  const filter = {};

  if (classId) filter.class = classId;
  if (testName) filter.testName = testName;
  if (studentId) filter.student = studentId;

  if (req.user.role === 'parent') {
    const childIds = req.user.children.map((c) => c._id?.toString() || c.toString());
    filter.student = { $in: childIds };
  }

  if (req.user.role === 'teacher') {
    const classes = await Class.find({ teacher: req.user._id }).select('_id');
    const classIds = classes.map((c) => c._id);
    filter.class = classId ? classId : { $in: classIds };
  }

  const results = await TestResult.find(filter)
    .populate('student', 'name rollNumber')
    .populate('class', 'name section grade')
    .sort({ testDate: -1, rank: 1 });

  res.json({ success: true, count: results.length, results });
});

export const getTestResult = asyncHandler(async (req, res) => {
  const result = await TestResult.findById(req.params.id)
    .populate('student', 'name rollNumber')
    .populate('class', 'name section grade');

  if (!result) throw new ApiError(404, 'Test result not found.');

  if (req.user.role === 'parent') {
    const childIds = req.user.children.map((c) => c.toString());
    if (!childIds.includes(result.student._id.toString())) {
      throw new ApiError(403, 'Not authorized.');
    }
  }

  res.json({ success: true, result });
});

export const getStudentProgress = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  if (req.user.role === 'parent') {
    const childIds = req.user.children.map((c) => c._id?.toString() || c.toString());
    if (!childIds.includes(studentId)) {
      throw new ApiError(403, 'Not authorized to view this student progress.');
    }
  }

  const results = await TestResult.find({ student: studentId })
    .sort('testDate')
    .select('testName testDate percentage average rank totalObtained totalMax');

  const progress = results.map((r) => ({
    testName: r.testName,
    testDate: r.testDate,
    percentage: r.percentage,
    average: r.average,
    rank: r.rank,
    totalObtained: r.totalObtained,
    totalMax: r.totalMax,
  }));

  res.json({ success: true, progress });
});

export const exportResults = asyncHandler(async (req, res) => {
  const { classId, testName, testDate } = req.query;

  if (!classId || !testName) {
    throw new ApiError(400, 'classId and testName are required.');
  }

  const filter = { class: classId, testName };
  if (testDate) filter.testDate = new Date(testDate);

  const results = await TestResult.find(filter)
    .populate('student', 'name rollNumber')
    .sort('rank');

  if (!results.length) throw new ApiError(404, 'No results found.');

  const exportData = results.map((r) => ({
    rank: r.rank,
    rollNumber: r.student.rollNumber,
    studentName: r.student.name,
    subjects: r.subjects,
    totalObtained: r.totalObtained,
    totalMax: r.totalMax,
    average: r.average,
    percentage: r.percentage,
  }));

  const buffer = await exportResultsExcel(exportData, testName);
  const filename = `results_${testName.replace(/\s+/g, '_')}.xlsx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(Buffer.from(buffer));
});

export const deleteTestResult = asyncHandler(async (req, res) => {
  const result = await TestResult.findByIdAndDelete(req.params.id);
  if (!result) throw new ApiError(404, 'Test result not found.');
  res.json({ success: true, message: 'Test result deleted.' });
});

export const getDashboardStats = asyncHandler(async (req, res) => {
  if (req.user.role === 'admin') {
    const User = (await import('../models/User.js')).default;
    const [teachers, parents, students, classes, tests] = await Promise.all([
      User.countDocuments({ role: 'teacher', isActive: true }),
      User.countDocuments({ role: 'parent', isActive: true }),
      Student.countDocuments({ isActive: true }),
      Class.countDocuments({ isActive: true }),
      TestResult.countDocuments(),
    ]);

    return res.json({
      success: true,
      stats: { teachers, parents, students, classes, tests },
    });
  }

  if (req.user.role === 'teacher') {
    const classes = await Class.find({ teacher: req.user._id, isActive: true });
    const classIds = classes.map((c) => c._id);
    const [students, tests] = await Promise.all([
      Student.countDocuments({ class: { $in: classIds }, isActive: true }),
      TestResult.countDocuments({ class: { $in: classIds } }),
    ]);

    return res.json({
      success: true,
      stats: { classes: classes.length, students, tests },
    });
  }

  if (req.user.role === 'parent') {
    const childIds = req.user.children.map((c) => c._id || c);
    const latestResults = await TestResult.find({ student: { $in: childIds } })
      .sort('-testDate')
      .limit(childIds.length)
      .populate('student', 'name rollNumber');

    return res.json({ success: true, latestResults });
  }

  res.json({ success: true, stats: {} });
});
