import mongoose from 'mongoose';
import crypto from 'crypto';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Class from '../models/Class.js';
import School from '../models/School.js';
import Attendance from '../models/Attendance.js';
import AcademicSession from '../models/AcademicSession.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendAttenderCreationEmail } from '../services/emailService.js';

// Get list of Attenders and Teachers with attendance permissions
export const getAttendersAndTeachers = asyncHandler(async (req, res) => {
  const schoolId = req.user.school;

  const [attenders, teachers] = await Promise.all([
    User.find({ school: schoolId, role: 'attender' })
      .select('name email phoneNo isActive canTakeAttendance assignedClasses createdAt')
      .populate('assignedClasses', 'className section'),
    User.find({ school: schoolId, role: 'teacher' })
      .select('name teacherName email phoneNo status isActive canTakeAttendance assignedClasses createdAt')
      .populate('assignedClasses', 'className section'),
  ]);

  res.json({
    success: true,
    attenders,
    teachers,
  });
});

// Create new Attender user and send email credentials
export const createAttender = asyncHandler(async (req, res) => {
  const { name, email, phoneNo, assignedClasses } = req.body;
  const schoolId = req.user.school;

  if (!name || !email) {
    throw new ApiError(400, 'Name and email are required');
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ApiError(400, 'User with this email already exists');
  }

  const generatedPassword = 'Att' + crypto.randomBytes(3).toString('hex');

  const school = await School.findById(schoolId);
  const schoolName = school ? school.schoolName : 'School';

  const attenderDoc = await User.create({
    school: schoolId,
    name: String(name).trim(),
    email: String(email).toLowerCase().trim(),
    password: generatedPassword,
    role: 'attender',
    phoneNo: phoneNo ? String(phoneNo).trim() : '',
    canTakeAttendance: true,
    assignedClasses: Array.isArray(assignedClasses) ? assignedClasses : [],
    mustChangePassword: true,
  });

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const loginUrl = `${frontendUrl}/login`;

  // Send credentials via email async
  sendAttenderCreationEmail(schoolName, attenderDoc.name, attenderDoc.email, generatedPassword, loginUrl).catch(err => {
    console.error('[Attender Email Error]:', err.message);
  });

  res.status(201).json({
    success: true,
    message: 'Attender created successfully. Credentials sent via email.',
    attender: {
      _id: attenderDoc._id,
      name: attenderDoc.name,
      email: attenderDoc.email,
      role: attenderDoc.role,
      tempPassword: generatedPassword,
    },
  });
});

// Toggle attendance duty permission for teacher or attender
export const toggleAttendancePermission = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { canTakeAttendance, assignedClasses } = req.body;
  const schoolId = req.user.school;

  const user = await User.findOne({ _id: userId, school: schoolId });
  if (!user) throw new ApiError(404, 'User not found');

  if (typeof canTakeAttendance === 'boolean') {
    user.canTakeAttendance = canTakeAttendance;
  }
  if (Array.isArray(assignedClasses)) {
    user.assignedClasses = assignedClasses;
  }

  await user.save();

  res.json({
    success: true,
    message: `Attendance permission updated for ${user.name}`,
    user: {
      _id: user._id,
      name: user.name,
      canTakeAttendance: user.canTakeAttendance,
      assignedClasses: user.assignedClasses,
    },
  });
});

// Fetch attendance preview for class & date (defaults all students to present if unmarked)
export const getAttendancePreview = asyncHandler(async (req, res) => {
  const { classId, date } = req.query;
  const schoolId = req.user.school;

  if (!classId) throw new ApiError(400, 'classId is required');

  const selectedDate = date ? new Date(date) : new Date();
  const dateString = selectedDate.toISOString().split('T')[0];
  const todayString = new Date().toISOString().split('T')[0];

  const isNonAdmin = ['teacher', 'attender'].includes(req.user.role);
  if (isNonAdmin && dateString !== todayString) {
    throw new ApiError(403, 'Teachers and Attenders can only view and mark attendance for today');
  }

  const targetClass = await Class.findOne({ _id: classId, school: schoolId });
  if (!targetClass) throw new ApiError(404, 'Class not found');

  const students = await Student.find({ school: schoolId, class: classId, isActive: true })
    .select('name rollNo parent')
    .populate('parent', 'parentName phone');

  // Sort students by rollNo numerically (1, 2, 3... 10, 11) instead of lexicographically ("1", "10", "2")
  students.sort((a, b) => {
    const numA = parseInt(a.rollNo, 10);
    const numB = parseInt(b.rollNo, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return String(a.rollNo || '').localeCompare(String(b.rollNo || ''), undefined, { numeric: true });
  });

  const existingAttendance = await Attendance.findOne({
    school: schoolId,
    class: classId,
    dateString,
  });

  const recordMap = new Map();
  if (existingAttendance) {
    existingAttendance.records.forEach((r) => {
      recordMap.set(String(r.student), r);
    });
  }

  // Build preview student list with default PRESENT status
  const previewRecords = students.map((s) => {
    const existing = recordMap.get(String(s._id));
    return {
      studentId: s._id,
      name: s.name,
      rollNo: s.rollNo,
      fatherName: s.parent?.parentName || '',
      status: existing ? existing.status : 'present', // Default PRESENT if new
      remarks: existing ? existing.remarks : '',
    };
  });

  res.json({
    success: true,
    class: {
      _id: targetClass._id,
      className: targetClass.className,
      section: targetClass.section,
    },
    dateString,
    isMarked: Boolean(existingAttendance),
    records: previewRecords,
    summary: existingAttendance ? {
      totalStudents: existingAttendance.totalStudents,
      totalPresent: existingAttendance.totalPresent,
      totalAbsent: existingAttendance.totalAbsent,
      totalLeave: existingAttendance.totalLeave,
    } : {
      totalStudents: previewRecords.length,
      totalPresent: previewRecords.length,
      totalAbsent: 0,
      totalLeave: 0,
    },
  });
});

// Save or update daily attendance
export const saveAttendance = asyncHandler(async (req, res) => {
  const { classId, date, records } = req.body;
  const schoolId = req.user.school;

  if (!classId || !records || !Array.isArray(records)) {
    throw new ApiError(400, 'classId and records array are required');
  }

  const selectedDate = date ? new Date(date) : new Date();
  const dateString = selectedDate.toISOString().split('T')[0];
  const todayString = new Date().toISOString().split('T')[0];

  const isNonAdmin = ['teacher', 'attender'].includes(req.user.role);
  if (isNonAdmin && dateString !== todayString) {
    throw new ApiError(403, 'Teachers and Attenders can only mark attendance for today');
  }

  const activeSession = await AcademicSession.findOne({ school: schoolId, status: 'active' });

  const formattedRecords = records.map((r) => ({
    student: r.studentId,
    status: ['present', 'absent', 'leave'].includes(r.status) ? r.status : 'present',
    remarks: r.remarks ? String(r.remarks).trim() : '',
  }));

  const totalStudents = formattedRecords.length;
  const totalPresent = formattedRecords.filter((r) => r.status === 'present').length;
  const totalAbsent = formattedRecords.filter((r) => r.status === 'absent').length;
  const totalLeave = formattedRecords.filter((r) => r.status === 'leave').length;

  const attendanceDoc = await Attendance.findOneAndUpdate(
    { school: schoolId, class: classId, dateString },
    {
      school: schoolId,
      class: classId,
      academicSession: activeSession?._id,
      date: selectedDate,
      dateString,
      recordedBy: req.user._id,
      records: formattedRecords,
      totalStudents,
      totalPresent,
      totalAbsent,
      totalLeave,
    },
    { upsert: true, new: true, runValidators: true }
  );

  res.json({
    success: true,
    message: 'Attendance saved successfully',
    attendance: attendanceDoc,
  });
});

// Get Attendance Reports & Analytics
export const getAttendanceReport = asyncHandler(async (req, res) => {
  const { classId, startDate, endDate } = req.query;
  const schoolId = req.user.school;

  const filter = { school: schoolId };
  if (classId) filter.class = classId;

  if (startDate || endDate) {
    filter.dateString = {};
    if (startDate) filter.dateString.$gte = String(startDate).split('T')[0];
    if (endDate) filter.dateString.$lte = String(endDate).split('T')[0];
  }

  const reports = await Attendance.find(filter)
    .sort('-dateString')
    .populate('class', 'className section')
    .populate('recordedBy', 'name role teacherName')
    .populate('records.student', 'name rollNo');

  let grandTotalStudents = 0;
  let grandTotalPresent = 0;
  let grandTotalAbsent = 0;
  let grandTotalLeave = 0;

  reports.forEach((r) => {
    grandTotalStudents += r.totalStudents;
    grandTotalPresent += r.totalPresent;
    grandTotalAbsent += r.totalAbsent;
    grandTotalLeave += r.totalLeave;
  });

  const overallPercentage = grandTotalStudents > 0
    ? Math.round((grandTotalPresent / grandTotalStudents) * 100)
    : 0;

  res.json({
    success: true,
    reports,
    stats: {
      totalDaysMarked: reports.length,
      grandTotalStudents,
      grandTotalPresent,
      grandTotalAbsent,
      grandTotalLeave,
      overallPercentage,
    },
  });
});
