import Student from '../models/Student.js';
import MarkEntry from '../models/MarkEntry.js';
import NotebookCheck from '../models/NotebookCheck.js';
import AcademicSession from '../models/AcademicSession.js';
import ResultSession from '../models/ResultSession.js';
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
    const selectedExamTypes = examTypes ? examTypes.split(',') : [];

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

    console.log('=== STUDENT PERFORMANCE QUERY DEBUG ===');
    console.log('Base Session Filter:', JSON.stringify(baseSessionFilter, null, 2));
    console.log('Selected Exam Types:', selectedExamTypes);
    console.log('Assessment Type:', assessmentType);
    console.log('Date Range:', dateRange);
    console.log('====================================');

    // Fetch Daily Test sessions (with date filter if applicable)
    let dailyTestSessions = [];
    if (assessmentType === 'All Assessments' || !assessmentType || assessmentType === 'Daily Test') {
      const dailyFilter = { ...baseSessionFilter, category: 'daily' };
      if (dateRange && dateRange !== 'All Time') {
        dailyFilter.testDate = dateFilter;
      }
      console.log('Daily Test Filter:', JSON.stringify(dailyFilter, null, 2));
      dailyTestSessions = await ResultSession.find(dailyFilter).lean();
      console.log('Daily Test Sessions Found:', dailyTestSessions.length);
      if (dailyTestSessions.length > 0) {
        console.log('Sample Daily Test Session:', dailyTestSessions[0]);
      }
    }

    // Fetch Main Exam sessions (NO date filter - always show all main exams in session)
    let mainExamSessions = [];
    if (assessmentType === 'All Assessments' || !assessmentType || assessmentType === 'Main Exam') {
      // Match Class Results logic: loop through each exam type separately
      const mainExamTypesToFetch = selectedExamTypes.length > 0 
        ? selectedExamTypes.filter(t => MAIN_EXAM_TYPES.includes(t))
        : MAIN_EXAM_TYPES;

      console.log('Main Exam Types to Fetch:', mainExamTypesToFetch);

      for (const mainExamType of mainExamTypesToFetch) {
        const mainFilter = {
          school: schoolId,
          class: classId,
          category: 'main',
          examType: mainExamType,
          academicSession: activeSession._id
        };
        console.log(`=== STEP 1: RESULTSESSION QUERY FOR ${mainExamType} ===`);
        console.log('Query Object:', JSON.stringify(mainFilter, null, 2));
        
        let typeSessions = await ResultSession.find(mainFilter).lean();
        console.log('Documents Returned:', typeSessions.length);
        if (typeSessions.length > 0) {
          typeSessions.forEach((s, idx) => {
            console.log(`Document ${idx + 1}:`, {
              _id: s._id,
              examType: s.examType,
              category: s.category,
              academicSession: s.academicSession,
              examDate: s.examDate,
              testDate: s.testDate
            });
          });
        }

        // Fallback for old records without academicSession (same as Class Results)
        if (typeSessions.length === 0) {
          console.log(`No ${mainExamType} sessions found with academicSession, trying fallback without academicSession...`);
          const fallbackFilter = {
            school: schoolId,
            class: classId,
            category: 'main',
            examType: mainExamType
          };
          console.log('Fallback Query Object:', JSON.stringify(fallbackFilter, null, 2));
          typeSessions = await ResultSession.find(fallbackFilter).lean();
          console.log('Fallback Documents Returned:', typeSessions.length);
          if (typeSessions.length > 0) {
            typeSessions.forEach((s, idx) => {
              console.log(`Fallback Document ${idx + 1}:`, {
                _id: s._id,
                examType: s.examType,
                category: s.category,
                academicSession: s.academicSession,
                examDate: s.examDate,
                testDate: s.testDate
              });
            });
          }
        }

        typeSessions.forEach(s => {
          mainExamSessions.push({ ...s, assessmentDate: s.examDate, examType: mainExamType });
        });
        console.log(`=== END STEP 1 FOR ${mainExamType} ===\n`);
      }

      console.log('Total Main Exam Sessions After Loop:', mainExamSessions.length);
      if (mainExamSessions.length > 0) {
        console.log('Sample Main Exam Session:', mainExamSessions[0]);
      }
    }

    // Combine sessions
    let sessions = [...dailyTestSessions, ...mainExamSessions];

    console.log('=== STUDENT PERFORMANCE SESSIONS DEBUG ===');
    console.log('Daily Test Sessions:', dailyTestSessions.length);
    console.log('Main Exam Sessions:', mainExamSessions.length);
    console.log('Total Sessions:', sessions.length);
    console.log('=========================================');

    const sessionIds = sessions.map(s => s._id);

    console.log('=== STEP 2: MARKENTRY QUERY ===');
    console.log('Session IDs:', sessionIds);
    console.log('Student IDs:', studentIds);
    console.log('Query Filter:', JSON.stringify({
      session: { $in: sessionIds },
      student: { $in: studentIds }
    }, null, 2));

    // Fetch MarkEntries for the sessions
    let marks = [];
    if (sessionIds.length > 0) {
      marks = await MarkEntry.find({ 
        session: { $in: sessionIds },
        student: { $in: studentIds }
      }).populate('session').lean();
    }

    console.log('Total MarkEntries Returned:', marks.length);
    console.log('Daily Test MarkEntries:', marks.filter(m => m.session?.category === 'daily').length);
    console.log('Main Exam MarkEntries:', marks.filter(m => m.session?.category === 'main').length);
    
    if (marks.length > 0) {
      console.log('Sample MarkEntry Details:');
      marks.slice(0, 3).forEach((m, idx) => {
        console.log(`MarkEntry ${idx + 1}:`, {
          _id: m._id,
          session: m.session?._id,
          student: m.student,
          marksObtained: m.marksObtained,
          status: m.status,
          percentage: m.percentage,
          populatedSession: m.session ? {
            _id: m.session._id,
            examType: m.session.examType,
            category: m.session.category,
            subject: m.session.subject,
            maxMarks: m.session.maxMarks
          } : null
        });
      });
    }
    console.log('=== END STEP 2 ===\n');

    // Fetch Notebook Checks (no date filter for Notebook Checking)
    let notebooks = [];
    if (assessmentType === 'All Assessments' || assessmentType === 'Notebook Checking' || !assessmentType) {
      notebooks = await NotebookCheck.find({
        student: { $in: studentIds },
        academicSession: activeSession._id
      }).lean();
    }

    // Aggregate data per student using marks-based calculation (same as Class Results)
    const analyticsData = students.map(student => {
      const studentMarks = marks.filter(m => m.student.toString() === student._id.toString());
      const studentNotebooks = notebooks.filter(n => n.student.toString() === student._id.toString());

      console.log(`=== STEP 3: STUDENT AGGREGATION FOR ${student.name} ===`);
      console.log('Student ID:', student._id);
      console.log('Daily Test MarkEntries:', studentMarks.filter(m => m.session?.category === 'daily').length);
      console.log('Main Exam MarkEntries:', studentMarks.filter(m => m.session?.category === 'main').length);
      console.log('Notebook Checks:', studentNotebooks.length);
      console.log('=== END STEP 3 ===\n');

      // Calculate Notebook percentage and detailed stats
      let totalNotebookChapters = 0;
      let totalCheckedChapters = 0;
      let totalUnlockedChapters = 0;
      let notebookPercentage = 0;
      let subjectsMap = {};

      studentNotebooks.forEach(nb => {
        if (!subjectsMap[nb.subject]) {
          subjectsMap[nb.subject] = { 
            notebook: 0, 
            notebookData: { checked: 0, total: 0, unlocked: 0, pending: 0 },
            daily: { totalObtained: 0, totalMax: 0, count: 0 },
            main: { totalObtained: 0, totalMax: 0, count: 0, byExamType: {} }
          };
        }
        const checked = nb.chapters.filter(ch => ch.status === 'Checked').length;
        const unlocked = nb.chapters.filter(ch => ch.status === 'Unlocked').length;
        const pending = nb.chapters.filter(ch => ch.status === 'Pending').length;
        const total = nb.chapters.length;
        const percent = total > 0 ? (checked / total) * 100 : 0;
        
        subjectsMap[nb.subject].notebook = percent;
        subjectsMap[nb.subject].notebookData = { checked, total, unlocked, pending, percent };
        
        totalNotebookChapters += total;
        totalCheckedChapters += checked;
        totalUnlockedChapters += unlocked;
      });

      notebookPercentage = totalNotebookChapters > 0 ? (totalCheckedChapters / totalNotebookChapters) * 100 : 0;

      // Calculate Daily Test percentage using marks-based calculation
      let dailyTotalObtained = 0;
      let dailyTotalMax = 0;
      let dailyScores = [];
      let dailyMissed = 0;
      let dailyTestHistory = []; // For trend analysis

      studentMarks.forEach(m => {
        const session = m.session;
        const subject = session?.subject || 'General';
        if (!subjectsMap[subject]) {
          subjectsMap[subject] = { 
            notebook: 0, 
            notebookData: { checked: 0, total: 0, unlocked: 0, pending: 0 },
            daily: { totalObtained: 0, totalMax: 0, count: 0 },
            main: { totalObtained: 0, totalMax: 0, count: 0, byExamType: {} }
          };
        }

        if (session?.category === 'daily') {
          const marksObtained = m.status === 'absent' ? 0 : m.marksObtained;
          dailyTotalObtained += marksObtained;
          dailyTotalMax += session.maxMarks;
          
          subjectsMap[subject].daily.totalObtained += marksObtained;
          subjectsMap[subject].daily.totalMax += session.maxMarks;
          subjectsMap[subject].daily.count++;
          
          if (m.status === 'absent') {
            dailyMissed++;
          } else {
            dailyScores.push(m.percentage);
            // Add to history for trend
            dailyTestHistory.push({
              date: session.testDate || session.createdAt,
              subject: session.subject,
              percentage: m.percentage,
              marksObtained: m.marksObtained,
              maxMarks: session.maxMarks
            });
          }
        } else if (session?.category === 'main') {
          const marksObtained = m.status === 'absent' ? 0 : m.marksObtained;
          const examType = session.examType || 'Unknown';
          
          subjectsMap[subject].main.totalObtained += marksObtained;
          subjectsMap[subject].main.totalMax += session.maxMarks;
          subjectsMap[subject].main.count++;
          
          if (!subjectsMap[subject].main.byExamType[examType]) {
            subjectsMap[subject].main.byExamType[examType] = { totalObtained: 0, totalMax: 0, count: 0 };
          }
          subjectsMap[subject].main.byExamType[examType].totalObtained += marksObtained;
          subjectsMap[subject].main.byExamType[examType].totalMax += session.maxMarks;
          subjectsMap[subject].main.byExamType[examType].count++;
        }
      });

      const dailyPercentage = dailyTotalMax > 0 ? (dailyTotalObtained / dailyTotalMax) * 100 : 0;
      const totalDailyTests = studentMarks.filter(m => m.session?.category === 'daily').length;

      // Calculate Main Exam percentage using marks-based calculation (per exam type)
      let mainTotalObtained = 0;
      let mainTotalMax = 0;
      let mainByExamType = {};
      let mainExamHistory = []; // For trend analysis

      studentMarks.forEach(m => {
        const session = m.session;
        if (session?.category === 'main') {
          const marksObtained = m.status === 'absent' ? 0 : m.marksObtained;
          const examType = session.examType || 'Unknown';
          
          mainTotalObtained += marksObtained;
          mainTotalMax += session.maxMarks;
          
          if (!mainByExamType[examType]) {
            mainByExamType[examType] = { totalObtained: 0, totalMax: 0, count: 0 };
          }
          mainByExamType[examType].totalObtained += marksObtained;
          mainByExamType[examType].totalMax += session.maxMarks;
          mainByExamType[examType].count++;

          // Add to history for trend
          mainExamHistory.push({
            date: session.examDate || session.testDate || session.createdAt,
            examType: examType,
            subject: session.subject,
            percentage: m.percentage,
            marksObtained: m.marksObtained,
            maxMarks: session.maxMarks
          });
        }
      });

      const mainPercentage = mainTotalMax > 0 ? (mainTotalObtained / mainTotalMax) * 100 : 0;

      console.log('=== STUDENT MAIN EXAM DEBUG ===');
      console.log('Student:', student.name);
      console.log('Main Total Obtained:', mainTotalObtained);
      console.log('Main Total Max:', mainTotalMax);
      console.log('Main Percentage:', mainPercentage);
      console.log('Main By Exam Type:', JSON.stringify(mainByExamType, null, 2));
      console.log('==============================');

      // Calculate grade based on percentage
      const calculateGrade = (percentage) => {
        if (percentage >= 90) return 'A+';
        if (percentage >= 80) return 'A';
        if (percentage >= 70) return 'B+';
        if (percentage >= 60) return 'B';
        if (percentage >= 50) return 'C';
        if (percentage >= 40) return 'D';
        return 'F';
      };

      // Calculate subject analytics
      let strongestSubject = { name: '-', score: 0 };
      let weakestSubject = { name: '-', score: 100 };
      
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

        if (overallAvg > strongestSubject.score) strongestSubject = { name: subj, score: overallAvg };
        if (overallAvg > 0 && overallAvg < weakestSubject.score) weakestSubject = { name: subj, score: overallAvg };

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

      console.log(`=== STEP 4: SUBJECT AGGREGATION FOR ${student.name} ===`);
      subjectAnalytics.forEach(s => {
        console.log(`Subject: ${s.subject}`, {
          'Daily %': s.dailyTestAvg.toFixed(2),
          'Main %': s.mainExamAvg.toFixed(2),
          'Notebook %': s.notebookPercent.toFixed(2),
          'Main By Exam Type': s.mainByExamType
        });
      });
      console.log('=== END STEP 4 ===\n');

      if (weakestSubject.name === '-') weakestSubject.score = 0;

      // Calculate Overall Percentage using marks-based calculation (same as Class Results)
      let overallTotalObtained = 0;
      let overallTotalMax = 0;

      if (assessmentType === 'All Assessments' || !assessmentType) {
        overallTotalObtained = dailyTotalObtained + mainTotalObtained;
        overallTotalMax = dailyTotalMax + mainTotalMax;
        // For notebook, we need to convert percentage to marks equivalent
        // Assuming notebook contributes equally, we add notebook percentage as if it were marks
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

      // Smart Insights
      const assessTypes = [
        { name: 'Notebook', score: notebookPercentage },
        { name: 'Daily Test', score: dailyPercentage },
        { name: 'Main Exam', score: mainPercentage }
      ].filter(a => a.score > 0);
      
      assessTypes.sort((a,b) => b.score - a.score);

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
          pendingChapters: totalNotebookChapters - totalCheckedChapters - totalUnlockedChapters,
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

    // Calculate ranks based on overall percentage
    const rankedData = computeCompetitionRanks(analyticsData, 'overallPercentage');

    const finalResponse = { success: true, data: rankedData };

    console.log('=== STEP 5: FINAL API RESPONSE ===');
    console.log('Total Students in Response:', rankedData.length);
    console.log('Complete Response:', JSON.stringify(finalResponse, null, 2));
    console.log('=== END STEP 5 ===\n');

    res.json(finalResponse);
  } catch (error) {
    console.error('Error generating student performance analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to generate analytics', error: error.message });
  }
};