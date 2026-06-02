import ExcelJS from 'exceljs';
import XLSX from 'xlsx';
import Student from '../models/Student.js';
import { computeStudentStats, assignRanks } from '../utils/calculateStats.js';
import { ApiError } from '../utils/ApiError.js';

const DEFAULT_SUBJECTS = [
  { name: 'Mathematics', maxMarks: 25 },
  { name: 'English', maxMarks: 25 },
  { name: 'Science', maxMarks: 25 },
  { name: 'Social Studies', maxMarks: 25 },
];

export const generateStudentImportTemplate = async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Students');

  const headers = ['Roll No', 'Student Name', 'Gender'];
  sheet.addRow(headers);

  const exampleRow = ['1', 'John Doe', 'male'];
  sheet.addRow(exampleRow);

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE2E8F0' },
  };

  sheet.columns.forEach((col) => {
    col.width = 20;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

export const generateTeacherImportTemplate = async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Teachers');

  const headers = ['Teacher Name', 'Email', 'Password', 'Phone No'];
  sheet.addRow(headers);

  const exampleRow = ['Priya Sharma', 'priya.sharma@example.com', 'welcome123', '+919999999999'];
  sheet.addRow(exampleRow);

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE2E8F0' },
  };

  sheet.columns.forEach((col) => {
    col.width = 25;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

export const parseTeacherImportFile = (buffer, filename) => {
  const rows = (() => {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  })();

  if (rows.length < 2) {
    throw new ApiError(400, 'Invalid file format. File must have at least a header row and one data row.');
  }

  const dataRows = rows.slice(1).filter((row) => row.some((cell) => String(cell).trim()));

  const parsed = dataRows.map((row, index) => {
    const teacherName = String(row[0] || '').trim();
    const email = String(row[1] || '').trim().toLowerCase();
    const password = String(row[2] || '').trim();
    const phoneNo = String(row[3] || '').trim();

    return {
      rowNumber: index + 2,
      teacherName,
      email,
      password,
      phoneNo,
    };
  });

  return parsed;
};

export const parseStudentImportFile = (buffer, filename) => {
  const isCSV = filename.toLowerCase().endsWith('.csv');
  let rows;

  if (isCSV) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  } else {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  }

  if (rows.length < 2) {
    throw new ApiError(400, 'Invalid file format. File must have at least a header row and one data row.');
  }

  const headers = rows[0].map((h) => String(h).trim());
  const dataRows = rows.slice(1).filter((row) => row[0] || row[1]);

  const parsed = dataRows.map((row, index) => {
    const rollNo = String(row[0] || '').trim();
    const name = String(row[1] || '').trim();
    const gender = String(row[2] || '').trim().toLowerCase();

    return {
      rowNumber: index + 2,
      rollNo,
      name,
      gender,
    };
  });

  return parsed;
};

export const generateTemplate = async (classId, testName, testDate, subjects = DEFAULT_SUBJECTS) => {
  const students = await Student.find({ class: classId, isActive: true }).sort('rollNumber');

  if (!students.length) {
    throw new ApiError(404, 'No students found in this class.');
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Daily Test Marks');

  const metaRow = [
    'TEST_NAME',
    testName,
    'TEST_DATE',
    testDate,
    'CLASS_ID',
    classId.toString(),
  ];
  sheet.addRow(metaRow);

  const headers = ['Roll No', 'Student Name', 'Student ID'];
  subjects.forEach((sub) => {
    headers.push(`${sub.name} (Max: ${sub.maxMarks})`);
    headers.push(`${sub.name} Marks Obt.`);
  });
  sheet.addRow(headers);

  students.forEach((student) => {
    const row = [student.rollNumber, student.name, student._id.toString()];
    subjects.forEach((sub) => {
      row.push(sub.maxMarks);
      row.push('');
    });
    sheet.addRow(row);
  });

  const headerRow = sheet.getRow(2);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE2E8F0' },
  };

  sheet.columns.forEach((col) => {
    col.width = 18;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

const parseSubjectsFromHeaders = (headers) => {
  const subjects = [];
  for (let i = 3; i < headers.length; i += 2) {
    const maxHeader = headers[i];
    const marksHeader = headers[i + 1];
    if (!maxHeader || !marksHeader) continue;

    const nameMatch = String(maxHeader).match(/^(.+?)\s*\(Max:/i);
    const marksMatch = String(marksHeader).match(/^(.+?)\s*Marks Obt/i);
    if (!nameMatch || !marksMatch) continue;

    const name = nameMatch[1].trim();
    const maxMarks = parseFloat(String(maxHeader).match(/Max:\s*(\d+)/i)?.[1] || 0);

    subjects.push({ name, maxMarks, marksColIndex: i + 1 });
  }
  return subjects;
};

export const parseUploadedExcel = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (rows.length < 3) {
    throw new ApiError(400, 'Invalid Excel format. Missing metadata or data rows.');
  }

  const meta = rows[0];
  const testName = meta[1];
  const testDate = meta[3];
  const classId = meta[5];

  if (!testName || !testDate || !classId) {
    throw new ApiError(400, 'Missing TEST_NAME, TEST_DATE, or CLASS_ID in row 1.');
  }

  const headers = rows[1].map((h) => String(h).trim());
  const subjectCols = parseSubjectsFromHeaders(headers);

  if (!subjectCols.length) {
    throw new ApiError(400, 'No subject columns found. Use the downloaded template.');
  }

  const studentRows = rows.slice(2).filter((row) => row[0] || row[1]);

  const parsed = studentRows.map((row) => {
    const rollNumber = String(row[0] || '').trim();
    const studentName = String(row[1] || '').trim();
    const studentId = String(row[2] || '').trim();

    const subjects = subjectCols.map((col) => ({
      subject: col.name,
      maxMarks: col.maxMarks,
      marksObtained: parseFloat(row[col.marksColIndex]) || 0,
    }));

    const stats = computeStudentStats(subjects);

    return {
      rollNumber,
      studentName,
      studentId,
      subjects,
      ...stats,
    };
  });

  const ranked = assignRanks(parsed);

  return {
    testName: String(testName).trim(),
    testDate: new Date(testDate),
    classId: String(classId).trim(),
    results: ranked,
  };
};

export const exportResultsExcel = async (results, testName) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Results');

  const subjectNames = results[0]?.subjects?.map((s) => s.subject) || [];

  const headers = [
    'Rank',
    'Roll No',
    'Student Name',
    ...subjectNames.flatMap((s) => [`${s} Obt`, `${s} Max`]),
    'Total Obt',
    'Total Max',
    'Average',
    'Percentage',
  ];
  sheet.addRow(headers);

  results.forEach((r) => {
    const subjectCells = [];
    r.subjects.forEach((s) => {
      subjectCells.push(s.marksObtained, s.maxMarks);
    });

    sheet.addRow([
      r.rank,
      r.rollNumber || r.student?.rollNumber,
      r.studentName || r.student?.name,
      ...subjectCells,
      r.totalObtained,
      r.totalMax,
      r.average,
      r.percentage,
    ]);
  });

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };

  return workbook.xlsx.writeBuffer();
};
