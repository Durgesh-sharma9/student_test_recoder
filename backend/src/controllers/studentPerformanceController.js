import Student from '../models/Student.js';
import MarkEntry from '../models/MarkEntry.js';
import NotebookCheck from '../models/NotebookCheck.js';
import NotebookChapterUnlock from '../models/NotebookChapterUnlock.js';
import AcademicSession from '../models/AcademicSession.js';
import ResultSession from '../models/ResultSession.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { MAIN_EXAM_TYPES } from '../utils/constants.js';

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

const round2 = (v) => Math.round(v * 100) / 100;

const calculateGrade = (percentage) => {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
};

const computeCompetitionRanks = (items, valueKey) => {
  const sorted = [...items].sort((a, b) => b[valueKey] - a[valueKey]);
  let prev = null;
  let rank = 0;
  return sorted.map((item, idx) => {
    if (prev !== item[valueKey]) rank = idx + 1;
    prev = item[valueKey];
    return { ...item, rank };
  });
};

export const getExamTypes = async (req, res, next) => {
  try {
    const { classId } = req.query;
    const schoolId = req.user.school?._id ?? req.user.school;

    const filter = { 
      school: schoolId, 
      category: 'main' 
    };
    
    if (classId) {
      filter.class = classId;
    }

    const sessions = await ResultSession.find(filter).select('examType').lean();
    const examTypes = [...new Set(sessions.map(s => s.examType).filter(Boolean))].sort();

    res.json({ success: true, examTypes });
  } catch (error) {
    console.error('Error fetching exam types:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch exam types', error: error.message });
  }
};

export const getStudentPerformanceAnalytics = async (req, res, next) => {
  try {
    const { classId, assessmentType, examTypes, dateRange, specificDate, dateFrom, dateTo, academicSession } = req.query;
    const schoolId = req.user.school?._id ?? req.user.school;

    if (!classId) {
      return res.status(400).json({ success: false, message: 'Class ID is required.' });
    }

    // Get active session if not provided
    const activeSession = academicSession 
      ? await AcademicSession.findById(academicSession)
      : await getActiveSession(schoolId);

    if (!activeSession) {
      return res.status(400).json({ success: false, message: 'No active academic session found.' });
    }

    // Fetch all students in the class
    const students = await Student.find({ 
      class: classId, 
      school: schoolId,
      isActive: true 
    }).sort({ rollNo: 1 }).lean();
    
    if (!students.length) {
      return res.json({ success: true, data: [] });
    }
    
    const studentIds = students.map(s => s._id);

    // Parse examTypes if provided
    const selectedExamTypes = examTypes ? examTypes.split(',').map((type) => type.trim()).filter(Boolean) : [];

    // Build date filter (only for Daily Test)
    let dateFilter = {};
    if (dateRange && dateRange !== 'All Time') {
      const now = new Date();
      let startDate = new Date();
      let endDate = new Date();
      
      if (dateRange === 'Today') {
        startDate.setHours(0,0,0,0);
        endDate.setHours(23,59,59,999);
      } else if (dateRange === 'This Week') {
        const day = now.getDay();
        const diff = day === 0 ? 6 : day - 1;
        startDate.setDate(now.getDate() - diff);
        startDate.setHours(0,0,0,0);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23,59,59,999);
      } else if (dateRange === 'This Month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23,59,59,999);
      } else if (dateRange === 'This Year') {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        endDate.setHours(23,59,59,999);
      } else if (dateRange === 'Specific Date' && specificDate) {
        startDate = new Date(specificDate);
        startDate.setHours(0,0,0,0);
        endDate = new Date(specificDate);
        endDate.setHours(23,59,59,999);
      } else if (dateRange === 'Date Range' && dateFrom && dateTo) {
        startDate = new Date(dateFrom);
        startDate.setHours(0,0,0,0);
        endDate = new Date(dateTo);
        endDate.setHours(23,59,59,999);
      }
      
      dateFilter = { $gte: startDate, $lte: endDate };
    }

    // Fetch ResultSessions - Daily Test with date filter, Main Exam without date filter
    const baseSessionFilter = { 
      school: schoolId, 
      class: classId,
      academicSession: activeSession._id 
    };

    // Fetch Daily Test sessions (with date filter if applicable)
    let dailyTestSessions = [];
    if (assessmentType === 'All Assessments' || !assessmentType || assessmentType === 'Daily Test') {
      const dailyFilter = { ...baseSessionFilter, category: 'daily' };
      if (dateRange && dateRange !== 'All Time') {
        dailyFilter.testDate = dateFilter;
      }
      dailyTestSessions = await ResultSession.find(dailyFilter).lean();
    }

    // Fetch Main Exam sessions (NO date filter - always show all main exams in session)
    let mainExamSessions = [];
    if (assessmentType === 'All Assessments' || !assessmentType || assessmentType === 'Main Exam') {
      const requestAllMainExams = selectedExamTypes.length === 0 || selectedExamTypes.includes('All Exams');
      let mainExamTypesToFetch = [];

      if (requestAllMainExams) {
        mainExamTypesToFetch = await ResultSession.find({
          school: schoolId,
          class: classId,
          category: 'main',
          academicSession: activeSession._id,
        }).distinct('examType');
      } else {
        mainExamTypesToFetch = selectedExamTypes.filter((t) => MAIN_EXAM_TYPES.includes(t));
      }

      if (mainExamTypesToFetch.length > 0) {
        mainExamTypesToFetch = MAIN_EXAM_TYPES.filter((type) => mainExamTypesToFetch.includes(type));

        for (const mainExamType of mainExamTypesToFetch) {
          const mainFilter = {
            school: schoolId,
            class: classId,
            category: 'main',
            examType: mainExamType,
            academicSession: activeSession._id
          };

          const typeSessions = await ResultSession.find(mainFilter).lean();

          typeSessions.forEach(s => {
            mainExamSessions.push({ ...s, assessmentDate: s.examDate, examType: mainExamType });
          });
        }
      }
    }

    const sessions = [...dailyTestSessions, ...mainExamSessions];
    const sessionIds = sessions.map(s => s._id);

    let marks = [];
    if (sessionIds.length > 0) {
      marks = await MarkEntry.find({
        session: { $in: sessionIds },
        student: { $in: studentIds }
      }).lean();
    }

    // Fetch Notebook Checks (no date filter for Notebook Checking)
    let notebooks = [];
    if (assessmentType === 'All Assessments' || assessmentType === 'Notebook Checking' || !assessmentType) {
      notebooks = await NotebookCheck.find({
        student: { $in: studentIds },
        academicSession: activeSession._id
      }).lean();
    }

    const chapterUnlocks = await NotebookChapterUnlock.find({
      school: schoolId,
      academicSession: activeSession._id,
      class: classId,
    }).lean();

    const unlockMap = new Map();
    chapterUnlocks.forEach((unlock) => {
      const subject = String(unlock.subject).toUpperCase().trim();
      unlockMap.set(subject, unlock.unlockedChapters || []);
    });

    const teacherAssignments = await User.find({
      school: schoolId,
      role: 'teacher',
      isActive: true,
      'assignments.class': classId,
      'assignments.academicSession': activeSession._id,
    }).select('assignments').lean();

    const totalChaptersBySubject = new Map();
    teacherAssignments.forEach((teacher) => {
      (teacher.assignments || []).forEach((assignment) => {
        if (
          String(assignment.class) === String(classId) &&
          String(assignment.academicSession) === String(activeSession._id)
        ) {
          const subject = String(assignment.subject).toUpperCase().trim();
          const existing = totalChaptersBySubject.get(subject) || 0;
          totalChaptersBySubject.set(subject, Math.max(existing, assignment.totalChapters || 0));
        }
      });
    });

    const sessionMap = new Map(sessions.map(session => [session._id.toString(), session]));
    const dailySessionIds = new Set(dailyTestSessions.map(session => session._id.toString()));
    const mainSessionIds = new Set(mainExamSessions.map(session => session._id.toString()));

    const marksByStudent = new Map();
    marks.forEach(mark => {
      const studentId = mark.student.toString();
      if (!marksByStudent.has(studentId)) {
        marksByStudent.set(studentId, []);
      }
      marksByStudent.get(studentId).push(mark);
    });

    const notebooksByStudent = new Map();
    notebooks.forEach(notebook => {
      const studentId = notebook.student.toString();
      if (!notebooksByStudent.has(studentId)) {
        notebooksByStudent.set(studentId, []);
      }
      notebooksByStudent.get(studentId).push(notebook);
    });

    // Aggregate data per student using the same filtered session set as class results
    const analyticsData = students.map(student => {
      const studentId = student._id.toString();
      const studentMarks = marksByStudent.get(studentId) || [];
      const studentNotebooks = notebooksByStudent.get(studentId) || [];

      let totalNotebookChapters = 0;
      let totalCheckedChapters = 0;
      let totalUnlockedChapters = 0;
      let notebookPercentage = 0;
      const subjectsMap = {};

      // Initialize every subject assigned in this class and session.
      totalChaptersBySubject.forEach((total, subject) => {
        const unlocked = unlockMap.get(subject)?.length || 0;
        const checked = 0;
        const pending = Math.max(unlocked - checked, 0);
        const percent = unlocked > 0 ? 0 : 0;

        subjectsMap[subject] = {
          notebook: percent,
          notebookData: { checked, total, unlocked, pending, percent },
          daily: { totalObtained: 0, totalMax: 0, count: 0 },
          main: { totalObtained: 0, totalMax: 0, count: 0, byExamType: {} }
        };
      });

      // Ensure subjects with unlock records but no assignment still exist.
      unlockMap.forEach((unlockedChapters, subject) => {
        if (!subjectsMap[subject]) {
          const total = totalChaptersBySubject.get(subject) || 0;
          const unlocked = unlockedChapters.length;
          const checked = 0;
          const pending = Math.max(unlocked - checked, 0);
          const percent = unlocked > 0 ? 0 : 0;

          subjectsMap[subject] = {
            notebook: percent,
            notebookData: { checked, total, unlocked, pending, percent },
            daily: { totalObtained: 0, totalMax: 0, count: 0 },
            main: { totalObtained: 0, totalMax: 0, count: 0, byExamType: {} }
          };
        }
      });

      studentNotebooks.forEach(nb => {
        const subject = String(nb.subject).toUpperCase().trim();
        if (!subjectsMap[subject]) {
          const total = totalChaptersBySubject.get(subject) || 0;
          const unlocked = unlockMap.get(subject)?.length || 0;
          const checked = 0;
          const pending = Math.max(unlocked - checked, 0);
          const percent = unlocked > 0 ? 0 : 0;

          subjectsMap[subject] = {
            notebook: percent,
            notebookData: { checked, total, unlocked, pending, percent },
            daily: { totalObtained: 0, totalMax: 0, count: 0 },
            main: { totalObtained: 0, totalMax: 0, count: 0, byExamType: {} }
          };
        }

        const total = totalChaptersBySubject.get(subject) || 0;
        const unlocked = unlockMap.get(subject)?.length || 0;
        const checked = nb.chapters.filter(ch => ch.status === 'Checked').length;
        const pending = Math.max(unlocked - checked, 0);
        const percent = unlocked > 0 ? (checked / unlocked) * 100 : 0;

        subjectsMap[subject].notebook = percent;
        subjectsMap[subject].notebookData = { checked, total, unlocked, pending, percent };

        totalNotebookChapters += total;
        totalCheckedChapters += checked;
        totalUnlockedChapters += unlocked;
      });

      notebookPercentage = totalUnlockedChapters > 0 ? (totalCheckedChapters / totalUnlockedChapters) * 100 : 0;

      let dailyTotalObtained = 0;
      let dailyTotalMax = 0;
      const dailyScores = [];
      let dailyMissed = 0;
      const dailyTestHistory = [];
      let totalDailyTests = 0;

      let mainTotalObtained = 0;
      let mainTotalMax = 0;
      const mainByExamType = {};
      const mainExamHistory = [];

      studentMarks.forEach(mark => {
        const sessionId = typeof mark.session === 'string' ? mark.session : mark.session?.toString();
        const session = sessionMap.get(sessionId);
        if (!session) return;

        const subject = session.subject || 'General';
        if (!subjectsMap[subject]) {
          subjectsMap[subject] = {
            notebook: 0,
            notebookData: { checked: 0, total: 0, unlocked: 0, pending: 0 },
            daily: { totalObtained: 0, totalMax: 0, count: 0 },
            main: { totalObtained: 0, totalMax: 0, count: 0, byExamType: {} }
          };
        }

        const marksObtained = mark.status === 'absent' ? 0 : mark.marksObtained;
        const subjectData = subjectsMap[subject];

        if (session.category === 'daily' && dailySessionIds.has(sessionId)) {
          dailyTotalObtained += marksObtained;
          dailyTotalMax += session.maxMarks;
          subjectData.daily.totalObtained += marksObtained;
          subjectData.daily.totalMax += session.maxMarks;
          subjectData.daily.count++;
          totalDailyTests++;

          if (mark.status === 'absent') {
            dailyMissed++;
          } else {
            dailyScores.push(mark.percentage);
            dailyTestHistory.push({
              date: session.testDate || session.createdAt,
              subject: session.subject,
              percentage: mark.percentage,
              marksObtained: mark.marksObtained,
              maxMarks: session.maxMarks
            });
          }
        } else if (session.category === 'main' && mainSessionIds.has(sessionId)) {
          const examType = session.examType || 'Unknown';
          mainTotalObtained += marksObtained;
          mainTotalMax += session.maxMarks;
          subjectData.main.totalObtained += marksObtained;
          subjectData.main.totalMax += session.maxMarks;
          subjectData.main.count++;

          if (!subjectData.main.byExamType[examType]) {
            subjectData.main.byExamType[examType] = { totalObtained: 0, totalMax: 0, count: 0 };
          }
          subjectData.main.byExamType[examType].totalObtained += marksObtained;
          subjectData.main.byExamType[examType].totalMax += session.maxMarks;
          subjectData.main.byExamType[examType].count++;

          if (!mainByExamType[examType]) {
            mainByExamType[examType] = { totalObtained: 0, totalMax: 0, count: 0 };
          }
          mainByExamType[examType].totalObtained += marksObtained;
          mainByExamType[examType].totalMax += session.maxMarks;
          mainByExamType[examType].count++;

          mainExamHistory.push({
            date: session.examDate || session.testDate || session.createdAt,
            examType,
            subject: session.subject,
            percentage: mark.percentage,
            marksObtained: mark.marksObtained,
            maxMarks: session.maxMarks
          });
        }
      });

      const dailyPercentage = dailyTotalMax > 0 ? (dailyTotalObtained / dailyTotalMax) * 100 : 0;
      const mainPercentage = mainTotalMax > 0 ? (mainTotalObtained / mainTotalMax) * 100 : 0;

      const subjectAnalytics = Object.keys(subjectsMap).map(subj => {
        const data = subjectsMap[subj];
        const dailyAvg = data.daily.totalMax > 0 ? (data.daily.totalObtained / data.daily.totalMax) * 100 : 0;
        const mainAvg = data.main.totalMax > 0 ? (data.main.totalObtained / data.main.totalMax) * 100 : 0;

        let components = 0;
        let totalScore = 0;
        if (data.notebook > 0) { totalScore += data.notebook; components++; }
        if (dailyAvg > 0) { totalScore += dailyAvg; components++; }
        if (mainAvg > 0) { totalScore += mainAvg; components++; }

        const overallAvg = components > 0 ? totalScore / components : 0;

        return {
          subject: subj,
          notebookPercent: data.notebook || 0,
          notebookData: data.notebookData,
          dailyTestAvg: dailyAvg,
          mainExamAvg: mainAvg,
          mainByExamType: data.main.byExamType,
          average: overallAvg
        };
      });

      let strongestSubject = { name: '-', score: 0 };
      let weakestSubject = { name: '-', score: 100 };
      subjectAnalytics.forEach(subject => {
        if (subject.average > strongestSubject.score) strongestSubject = { name: subject.subject, score: subject.average };
        if (subject.average > 0 && subject.average < weakestSubject.score) weakestSubject = { name: subject.subject, score: subject.average };
      });
      if (weakestSubject.name === '-') weakestSubject.score = 0;

      let overallTotalObtained = 0;
      let overallTotalMax = 0;

      if (assessmentType === 'All Assessments' || !assessmentType) {
        overallTotalObtained = dailyTotalObtained + mainTotalObtained;
        overallTotalMax = dailyTotalMax + mainTotalMax;
        if (notebookPercentage > 0) {
          overallTotalObtained += notebookPercentage;
          overallTotalMax += 100;
        }
      } else if (assessmentType === 'Daily Test') {
        overallTotalObtained = dailyTotalObtained;
        overallTotalMax = dailyTotalMax;
      } else if (assessmentType === 'Main Exam') {
        overallTotalObtained = mainTotalObtained;
        overallTotalMax = mainTotalMax;
      } else if (assessmentType === 'Notebook Checking') {
        overallTotalObtained = notebookPercentage;
        overallTotalMax = 100;
      }

      const overallPercentage = overallTotalMax > 0 ? (overallTotalObtained / overallTotalMax) * 100 : 0;

      const assessTypes = [
        { name: 'Notebook', score: notebookPercentage },
        { name: 'Daily Test', score: dailyPercentage },
        { name: 'Main Exam', score: mainPercentage }
      ].filter(a => a.score > 0);
      assessTypes.sort((a, b) => b.score - a.score);

      return {
        _id: student._id,
        rollNo: student.rollNo,
        name: student.name,
        parentName: student.parent?.name || 'N/A',
        overallPercentage: round2(overallPercentage),
        notebookPercentage: round2(notebookPercentage),
        dailyPercentage: round2(dailyPercentage),
        mainPercentage: round2(mainPercentage),
        mainByExamType: Object.keys(mainByExamType).reduce((acc, examType) => {
          const examData = mainByExamType[examType];
          const percentage = examData.totalMax > 0 ? (examData.totalObtained / examData.totalMax) * 100 : 0;
          acc[examType] = {
            percentage: round2(percentage),
            grade: calculateGrade(percentage),
            totalObtained: examData.totalObtained,
            totalMax: examData.totalMax,
            count: examData.count
          };
          return acc;
        }, {}),
        subjectAnalytics,
        dailyStats: {
          average: round2(dailyPercentage),
          highest: dailyScores.length ? Math.max(...dailyScores) : 0,
          lowest: dailyScores.length ? Math.min(...dailyScores) : 0,
          attempted: dailyScores.length,
          missed: dailyMissed,
          total: totalDailyTests,
          history: dailyTestHistory.sort((a, b) => new Date(a.date) - new Date(b.date))
        },
        notebookStats: {
          totalChapters: totalNotebookChapters,
          checkedChapters: totalCheckedChapters,
          unlockedChapters: totalUnlockedChapters,
          pendingChapters: Math.max(totalUnlockedChapters - totalCheckedChapters, 0),
          completionPercentage: round2(notebookPercentage)
        },
        mainExamStats: {
          history: mainExamHistory.sort((a, b) => new Date(a.date) - new Date(b.date))
        },
        insights: {
          strongestSubject: strongestSubject.name,
          weakestSubject: weakestSubject.name,
          highestAssessment: assessTypes.length > 0 ? assessTypes[0].name : '-',
          lowestAssessment: assessTypes.length > 0 ? assessTypes[assessTypes.length - 1].name : '-',
          highestScore: dailyScores.length ? Math.max(...dailyScores) : 0,
          lowestScore: dailyScores.length ? Math.min(...dailyScores) : 0
        }
      };
    });

    const rankedData = computeCompetitionRanks(analyticsData, 'overallPercentage');
    const finalResponse = { success: true, data: rankedData };

    res.json(finalResponse);
  } catch (error) {
    console.error('Error generating student performance analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to generate analytics', error: error.message });
  }
};