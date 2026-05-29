import School from '../models/School.js';
import Class from '../models/Class.js';
import ResultSession from '../models/ResultSession.js';
import MarkEntry from '../models/MarkEntry.js';
import { ApiError } from './ApiError.js';
import { withSchool } from './tenantQuery.js';
import { normalizeSubject } from './subjectAccess.js';
import { formatDateDDMMYYYY, eachDayInRange, dateKeyFromDb } from './dateFormat.js';

const round2 = (v) => Math.round(v * 100) / 100;

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

const computeRanks = (items, valueKey) => {
  const sorted = [...items].sort((a, b) => b[valueKey] - a[valueKey]);
  let prev = null;
  let rank = 0;
  return sorted.map((item, idx) => {
    if (prev !== item[valueKey]) rank = idx + 1;
    prev = item[valueKey];
    return { ...item, rank };
  });
};

const sortStudentRows = (rows, sortBy) => {
  const list = [...rows];
  switch (sortBy) {
    case 'marks_asc':
      return list.sort((a, b) => (a.sortValue ?? 0) - (b.sortValue ?? 0));
    case 'rollNo':
      return list.sort((a, b) =>
        String(a.rollNo).localeCompare(String(b.rollNo), undefined, { numeric: true })
      );
    case 'name':
      return list.sort((a, b) => String(a.studentName).localeCompare(String(b.studentName)));
    case 'marks_desc':
    default:
      return list.sort((a, b) => (b.sortValue ?? 0) - (a.sortValue ?? 0));
  }
};

const safeFilenamePart = (s) =>
  String(s || 'Report')
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 40);

export const isDailyRangeExport = (query) => Boolean(query.dateFrom || query.dateTo);

export const buildDailyTestExport = async (req, query) => {
  const { classId, subject, testDate, dateFrom, dateTo, sortBy = 'marks_desc' } = query;
  if (!classId) throw new ApiError(400, 'Class is required for daily test export.');
  const schoolId = req.user.school?._id ?? req.user.school;

  const [school, classDoc] = await Promise.all([
    School.findById(schoolId).select('schoolName').lean(),
    Class.findOne(withSchool(req, { _id: classId })).lean(),
  ]);

  const schoolName = school?.schoolName || 'School';
  const classLabel = classDoc ? `${classDoc.className}${classDoc.section}` : '-';
  const subjectLabel = normalizeSubject(subject) || 'ALL';
  const generatedAt = formatDateDDMMYYYY(new Date());

  const sFilter = withSchool(req, { category: 'daily', class: classId });
  if (subject) sFilter.subject = normalizeSubject(subject);
  if (req.user.role === 'teacher') sFilter.teacher = req.user._id;

  const useRange = isDailyRangeExport(query);
  let rangeFrom = dateFrom;
  let rangeTo = dateTo;

  if (useRange) {
    sFilter.testDate = {};
    if (dateFrom) sFilter.testDate.$gte = startOfDay(dateFrom);
    if (dateTo) sFilter.testDate.$lte = endOfDay(dateTo);
    if (!dateFrom && dateTo) rangeFrom = dateTo;
    if (dateFrom && !dateTo) rangeTo = dateFrom;
  } else {
    const day = testDate || new Date();
    sFilter.testDate = { $gte: startOfDay(day), $lte: endOfDay(day) };
  }

  const sessions = await ResultSession.find(sFilter).sort({ testDate: 1 }).lean();
  const entries = await MarkEntry.find({ session: { $in: sessions.map((s) => s._id) } })
    .populate('student', 'name rollNo')
    .lean();
  const sessionMap = new Map(sessions.map((s) => [s._id.toString(), s]));

  const meta = {
    schoolName,
    classLabel,
    subject: subjectLabel,
    generatedAt,
    testDate: useRange ? null : formatDateDDMMYYYY(testDate || sessions[0]?.testDate),
    dateFrom: useRange ? formatDateDDMMYYYY(rangeFrom || sessions[0]?.testDate) : null,
    dateTo: useRange ? formatDateDDMMYYYY(rangeTo || sessions[sessions.length - 1]?.testDate) : null,
    totalStudents: 0,
  };

  if (!useRange) {
    const byStudent = new Map();
    for (const e of entries) {
      const sid = e.student._id.toString();
      const s = sessionMap.get(e.session.toString());
      byStudent.set(sid, {
        rollNo: e.student.rollNo,
        studentName: e.student.name,
        rank: e.rankSubject,
        obtained: e.marksObtained,
        maxMarks: s?.maxMarks ?? 0,
        percentage: e.percentage ?? round2((e.marksObtained / (s?.maxMarks || 1)) * 100),
        sortValue: e.marksObtained,
      });
    }

    let rows = [...byStudent.values()];
    rows = computeRanks(rows, 'obtained').map((r) => ({
      rollNo: r.rollNo,
      studentName: r.studentName,
      rank: r.rank,
      obtained: r.obtained,
      maxMarks: r.maxMarks,
      percentage: r.percentage,
      sortValue: r.obtained,
    }));
    rows = sortStudentRows(rows, sortBy);

    meta.totalStudents = rows.length;
    const datePart = meta.testDate.replace(/-/g, '-');
    const filename = `${safeFilenamePart(classLabel)}_${safeFilenamePart(subjectLabel)}_DailyTest_${datePart}`;

    return {
      mode: 'single',
      meta,
      headers: ['Roll No', 'Student Name', 'Rank', 'Obtained Marks', 'Max Marks', 'Percentage'],
      rows: rows.map((r) => [
        r.rollNo,
        r.studentName,
        r.rank,
        r.obtained,
        r.maxMarks,
        `${r.percentage}%`,
      ]),
      filename,
    };
  }

  const sessionDates = sessions.map((s) => ({
    key: dateKeyFromDb(s.testDate),
    label: formatDateDDMMYYYY(s.testDate),
    sessionId: s._id.toString(),
    maxMarks: s.maxMarks,
  }));

  const uniqueDateKeys = [...new Set(sessionDates.map((d) => d.key))].sort();
  const dateColumns = uniqueDateKeys.map((key) => {
    const match = sessionDates.find((d) => d.key === key);
    return { key, label: match?.label || formatDateDDMMYYYY(key) };
  });

  if (!dateColumns.length && (rangeFrom || rangeTo)) {
    eachDayInRange(rangeFrom || rangeTo, rangeTo || rangeFrom).forEach((d) => {
      const key = dateKeyFromDb(d);
      if (!dateColumns.find((c) => c.key === key)) {
        dateColumns.push({ key, label: formatDateDDMMYYYY(d) });
      }
    });
  }

  const byStudent = new Map();
  for (const e of entries) {
    const sid = e.student._id.toString();
    const s = sessionMap.get(e.session.toString());
    const dKey = dateKeyFromDb(s?.testDate);
    if (!byStudent.has(sid)) {
      byStudent.set(sid, {
        rollNo: e.student.rollNo,
        studentName: e.student.name,
        marksByDate: {},
        totalObtained: 0,
      });
    }
    const row = byStudent.get(sid);
    row.marksByDate[dKey] = {
      obtained: e.marksObtained,
      max: s?.maxMarks ?? 0,
    };
    row.totalObtained += e.marksObtained;
  }

  let rows = [...byStudent.values()].map((r) => ({
    ...r,
    sortValue: r.totalObtained,
  }));
  rows = computeRanks(rows, 'totalObtained');
  rows = sortStudentRows(rows, sortBy);

  meta.totalStudents = rows.length;

  const headers = ['Roll No', 'Student Name', 'Rank', ...dateColumns.map((d) => d.label)];
  const dataRows = rows.map((r) => [
    r.rollNo,
    r.studentName,
    r.rank,
    ...dateColumns.map((d) => {
      const cell = r.marksByDate[d.key];
      return cell ? `${cell.obtained}/${cell.max}` : '-';
    }),
  ]);

  const fromPart = meta.dateFrom || 'start';
  const toPart = meta.dateTo || 'end';
  const filename = `${safeFilenamePart(classLabel)}_${safeFilenamePart(subjectLabel)}_DailyTest_${fromPart}_to_${toPart}`;

  return {
    mode: 'range',
    meta,
    headers,
    rows: dataRows,
    dateColumns,
    filename,
  };
};
