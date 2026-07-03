import Student from '../models/Student.js';
import User from '../models/User.js';
import Class from '../models/Class.js';
import AcademicSession from '../models/AcademicSession.js';
import Parent from '../models/Parent.js';
import School from '../models/School.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { withSchool } from '../utils/tenantQuery.js';
import { parseStudentImportFile } from '../services/excelService.js';
import { findOrCreateParent } from './parentController.js';
import { sendParentCreationEmail } from '../services/emailService.js';

// Helper function to get active session
const getActiveSession = async (schoolId) => {
  let activeSession = await AcademicSession.findOne({
    school: schoolId,
    status: 'active'
  });
  
  if (!activeSession) {
    // Auto-create if doesn't exist
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    const sessionName = `${currentYear}-${nextYear.toString().slice(-2)}`;
    const startDate = new Date(currentYear, 5, 1);
    const endDate = new Date(nextYear, 2, 31);
    
    activeSession = await AcademicSession.create({
      school: schoolId,
      sessionName,
      startDate,
      endDate,
      status: 'active'
    });
  }
  
  return activeSession;
};

// Helper function to shift roll numbers
const shiftRollNumbers = async (schoolId, classId, academicSessionId, fromRollNo) => {
  const studentsToShift = await Student.find({
    school: schoolId,
    class: classId,
    academicSession: academicSessionId,
    isActive: true,
  });

  const fromRollNum = Number(fromRollNo);
  
  // Sort numerically in descending order to avoid conflicts
  studentsToShift.sort((a, b) => Number(b.rollNo) - Number(a.rollNo));
  
  for (const student of studentsToShift) {
    const currentRoll = Number(student.rollNo);
    if (currentRoll >= fromRollNum) {
      student.rollNo = String(currentRoll + 1);
      await student.save();
    }
  }
};

export const getStudents = asyncHandler(async (req, res) => {
  const filter = withSchool(req, { isActive: true });

  if (req.query.class) {
    filter.class = req.query.class;
  }

  // Filter by academic session if provided, otherwise use active session
  if (req.query.academicSession) {
    filter.academicSession = req.query.academicSession;
  } else {
    const schoolId = req.user.school?._id ?? req.user.school;
    const activeSession = await getActiveSession(schoolId);
    filter.academicSession = activeSession._id;
  }

  const students = await Student.find(filter)
    .populate('class', 'className section')
    .populate('academicSession', 'sessionName')
    .populate('parent', 'parentName email phone');

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
  const schoolId = req.user.school?._id ?? req.user.school;
  
  // Get active session if not provided
  let academicSessionId = req.body.academicSession;
  if (!academicSessionId) {
    const activeSession = await getActiveSession(schoolId);
    academicSessionId = activeSession._id;
  }

  const payload = {
    ...req.body,
    school: schoolId,
    academicSession: academicSessionId,
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

  // Handle roll number shift if requested
  if (existing && req.body.shiftOption === 'insert') {
    await shiftRollNumbers(schoolId, payload.class, academicSessionId, payload.rollNo);
  } else if (existing && req.body.shiftOption === 'last') {
    // Find highest roll number and assign next
    const highestRoll = await Student.findOne({
      school: payload.school,
      class: payload.class,
      academicSession: academicSessionId,
      isActive: true,
    }).sort({ rollNo: -1 });
    
    const nextRoll = highestRoll ? Number(highestRoll.rollNo) + 1 : 1;
    payload.rollNo = String(nextRoll);
  } else if (existing) {
    throw new ApiError(400, `Roll No ${payload.rollNo} already exists in this class.`);
  }

  // Handle parent linking if parent data is provided
  let parentData = null;
  if (req.body.parentName && req.body.parentPhone) {
    const parentResult = await findOrCreateParent(schoolId, {
      parentName: req.body.parentName,
      email: req.body.parentEmail,
      phone: req.body.parentPhone
    });
    
    payload.parent = parentResult.parent._id;
    parentData = {
      parent: parentResult.parent,
      isNew: parentResult.isNew,
      password: parentResult.password
    };
  }

  const student = await Student.create(payload);
  
  // Link student to parent after student is created
  if (payload.parent) {
    const parent = await Parent.findById(payload.parent);
    if (parent && !parent.linkedStudents.includes(student._id)) {
      parent.linkedStudents.push(student._id);
      await parent.save();
    }
  }
  
  const populated = await Student.findById(student._id)
    .populate('class', 'className section')
    .populate('academicSession', 'sessionName')
    .populate('parent', 'parentName email phone');

  res.status(201).json({ 
    success: true, 
    student: populated,
    parentData // Return parent data for email sending
  });
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
  const currentRoll = current.rollNo;

  // Only check for duplicates if rollNo is being changed
  if (updates.rollNo && updates.rollNo !== currentRoll) {
    const duplicate = await Student.findOne({
      _id: { $ne: req.params.id },
      school: current.school,
      class: targetClass,
      rollNo: targetRoll,
      isActive: true,
    });

    if (duplicate) {
      if (req.body.shiftOption === 'insert') {
        // Shift students from targetRoll onward
        await shiftRollNumbers(current.school, targetClass, current.academicSession, targetRoll);
      } else if (req.body.shiftOption === 'last') {
        // Assign highest + 1
        const highestRoll = await Student.findOne({
          school: current.school,
          class: targetClass,
          academicSession: current.academicSession,
          isActive: true,
        }).sort({ rollNo: -1 });
        
        updates.rollNo = String(highestRoll ? Number(highestRoll.rollNo) + 1 : 1);
      } else {
        throw new ApiError(400, `Roll No ${targetRoll} already exists in this class.`);
      }
    }
  }

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

export const checkRollConflicts = asyncHandler(async (req, res) => {
  const { classId, rollNumbers } = req.body;
  const schoolId = req.user.school?._id ?? req.user.school;

  if (!classId || !rollNumbers || !Array.isArray(rollNumbers)) {
    throw new ApiError(400, 'classId and rollNumbers array are required');
  }

  // Get active session
  const activeSession = await getActiveSession(schoolId);

  const conflicts = [];
  const existingStudents = await Student.find({
    school: schoolId,
    class: classId,
    academicSession: activeSession._id,
    isActive: true,
  });

  const existingRolls = new Set(existingStudents.map(s => s.rollNo));

  rollNumbers.forEach((rollNo, index) => {
    if (existingRolls.has(String(rollNo))) {
      const existing = existingStudents.find(s => s.rollNo === String(rollNo));
      conflicts.push({
        row: index + 1,
        rollNo: String(rollNo),
        existingStudent: existing ? existing.name : 'Unknown'
      });
    }
  });

  res.json({
    success: true,
    hasConflicts: conflicts.length > 0,
    conflicts,
    totalConflicts: conflicts.length
  });
});

export const bulkImportStudents = asyncHandler(async (req, res) => {
  const { classId, shiftOption } = req.body;
  const schoolId = req.user.school?._id ?? req.user.school;
  
  if (!req.file) {
    throw new ApiError(400, 'No file uploaded.');
  }

  if (!classId) {
    throw new ApiError(400, 'Class ID is required.');
  }

  const classDoc = await Class.findOne(withSchool(req, { _id: classId }));
  if (!classDoc) throw new ApiError(404, 'Class not found.');

  // Get active session
  const activeSession = await getActiveSession(schoolId);

  // Get school for email sending
  const school = await School.findById(schoolId);

  const parsedData = parseStudentImportFile(req.file.buffer, req.file.originalName);
  
  const results = {
    totalRows: parsedData.length,
    imported: 0,
    shifted: 0,
    addedAtLast: 0,
    skipped: 0,
    parentsCreated: 0,
    existingParentsLinked: 0,
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

  // Get highest roll number for "last" option
  let highestRoll = 0;
  if (shiftOption === 'last') {
    const highestRollDoc = await Student.findOne({
      school: schoolId,
      class: classId,
      academicSession: activeSession._id,
      isActive: true,
    }).sort({ rollNo: -1 });
    highestRoll = highestRollDoc ? Number(highestRollDoc.rollNo) : 0;
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

      // Parent validation
      if (row.parentName && !row.parentPhone) {
        results.failed++;
        results.errors.push({ row: row.rowNumber, error: 'Parent Phone is required when Parent Name is provided' });
        continue;
      }

      // Email validation if provided
      if (row.parentEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(row.parentEmail)) {
          results.failed++;
          results.errors.push({ row: row.rowNumber, error: 'Invalid Parent Email format' });
          continue;
        }
      }

      // Check for duplicate roll no in the same class
      const existing = await Student.findOne({
        school: schoolId,
        class: classId,
        rollNo: row.rollNo,
        isActive: true,
      });

      let finalRollNo = row.rollNo;

      if (existing) {
        if (shiftOption === 'skip') {
          results.skipped++;
          results.errors.push({ row: row.rowNumber, error: `Skipped: Roll No ${row.rollNo} already exists` });
          continue;
        } else if (shiftOption === 'last') {
          highestRoll++;
          finalRollNo = String(highestRoll);
          results.addedAtLast++;
        } else if (shiftOption === 'insert') {
          // Shift students from this roll number onward
          await shiftRollNumbers(schoolId, classId, activeSession._id, row.rollNo);
          results.shifted++;
          results.imported++;
        } else {
          // No shift option provided, fail
          results.failed++;
          results.errors.push({ row: row.rowNumber, error: `Roll No ${row.rollNo} already exists in this class` });
          continue;
        }
      } else {
        results.imported++;
      }

      // Handle parent creation/linking if parent data is provided
      let parentId = null;
      if (row.parentName && row.parentPhone) {
        const parentResult = await findOrCreateParent(schoolId, {
          parentName: row.parentName,
          email: row.parentEmail,
          phone: row.parentPhone
        });
        
        parentId = parentResult.parent._id;
        
        if (parentResult.isNew) {
          results.parentsCreated++;
          
          // Send credential email if parent email exists
          if (row.parentEmail) {
            try {
              await sendParentCreationEmail(
                school?.schoolName || 'Your School',
                parentResult.parent.parentName,
                parentResult.parent.email,
                parentResult.password,
                process.env.CLIENT_URL || 'http://localhost:5173/parent-login'
              );
            } catch (emailError) {
              // Log email error but don't fail the import
              console.error('Failed to send parent credential email:', emailError);
            }
          }
        } else {
          results.existingParentsLinked++;
        }
      }

      // Create student with active session
      const student = await Student.create({
        school: schoolId,
        academicSession: activeSession._id,
        class: classId,
        rollNo: finalRollNo,
        name: row.name,
        gender: row.gender,
        parent: parentId,
      });

      // Link student to parent after student is created
      if (parentId) {
        const parent = await Parent.findById(parentId);
        if (parent && !parent.linkedStudents.includes(student._id)) {
          parent.linkedStudents.push(student._id);
          await parent.save();
        }
      }
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
