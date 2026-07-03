import Student from '../models/Student.js';
import MarkEntry from '../models/MarkEntry.js';
import NotebookCheck from '../models/NotebookCheck.js';
import AcademicSession from '../models/AcademicSession.js';
import ResultSession from '../models/ResultSession.js';
import mongoose from 'mongoose';

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
    const { classId, assessmentType, examType, dateRange, specificDate, dateFrom, dateTo, academicSession } = req.query;
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

    // Build date filter
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

    // Fetch ResultSessions based on assessment type
    let sessionFilter = { 
      school: schoolId, 
      class: classId,
      academicSession: activeSession._id 
    };

    if (dateRange && dateRange !== 'All Time') {
      sessionFilter.$or = [
        { testDate: dateFilter },
        { examDate: dateFilter }
      ];
    }

    let sessions = [];
    if (assessmentType === 'All Assessments' || !assessmentType) {
      // Fetch all sessions
      sessions = await ResultSession.find(sessionFilter).lean();
    } else if (assessmentType === 'Daily Test') {
      sessions = await ResultSession.find({ ...sessionFilter, category: 'daily' }).lean();
    } else if (assessmentType === 'Main Exam') {
      if (examType && examType !== 'All Exams') {
        sessions = await ResultSession.find({ ...sessionFilter, category: 'main', examType }).lean();
      } else {
        sessions = await ResultSession.find({ ...sessionFilter, category: 'main' }).lean();
      }
    } else if (assessmentType === 'Notebook Checking') {
      // Notebook doesn't use ResultSession, handle separately
      sessions = [];
    }

    const sessionIds = sessions.map(s => s._id);

    // Fetch MarkEntries for the sessions
    let marks = [];
    if (sessionIds.length > 0) {
      marks = await MarkEntry.find({ 
        session: { $in: sessionIds },
        student: { $in: studentIds }
      }).populate('session').lean();
    }

    // Fetch Notebook Checks
    let notebooks = [];
    if (assessmentType === 'All Assessments' || assessmentType === 'Notebook Checking' || !assessmentType) {
      notebooks = await NotebookCheck.find({
        student: { $in: studentIds },
        academicSession: activeSession._id
      }).lean();

      // Apply date filter to notebooks if needed
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
        
        notebooks = notebooks.filter(nb => {
          const checkDate = nb.checkedAt || nb.createdAt;
          return new Date(checkDate) >= startDate && new Date(checkDate) <= endDate;
        });
      }
    }

    // Aggregate data per student using marks-based calculation
    const analyticsData = students.map(student => {
      const studentMarks = marks.filter(m => m.student.toString() === student._id.toString());
      const studentNotebooks = notebooks.filter(n => n.student.toString() === student._id.toString());

      // Calculate Notebook percentage
      let totalNotebookChapters = 0;
      let totalCheckedChapters = 0;
      let notebookPercentage = 0;
      let subjectsMap = {};

      studentNotebooks.forEach(nb => {
        if (!subjectsMap[nb.subject]) {
          subjectsMap[nb.subject] = { 
            notebook: 0, 
            notebookData: { checked: 0, total: 0 },
            daily: { totalObtained: 0, totalMax: 0, count: 0 },
            main: { totalObtained: 0, totalMax: 0, count: 0 }
          };
        }
        const checked = nb.chapters.filter(ch => ch.status === 'Checked').length;
        const total = nb.chapters.length;
        const percent = total > 0 ? (checked / total) * 100 : 0;
        
        subjectsMap[nb.subject].notebook = percent;
        subjectsMap[nb.subject].notebookData = { checked, total, percent };
        
        totalNotebookChapters += total;
        totalCheckedChapters += checked;
      });

      notebookPercentage = totalNotebookChapters > 0 ? (totalCheckedChapters / totalNotebookChapters) * 100 : 0;

      // Calculate Daily Test percentage using marks-based calculation
      let dailyTotalObtained = 0;
      let dailyTotalMax = 0;
      let dailyScores = [];

      studentMarks.forEach(m => {
        const session = m.session;
        const subject = session?.subject || 'General';
        if (!subjectsMap[subject]) {
          subjectsMap[subject] = { 
            notebook: 0, 
            notebookData: { checked: 0, total: 0 },
            daily: { totalObtained: 0, totalMax: 0, count: 0 },
            main: { totalObtained: 0, totalMax: 0, count: 0 }
          };
        }

        if (session?.category === 'daily') {
          const marksObtained = m.status === 'absent' ? 0 : m.marksObtained;
          dailyTotalObtained += marksObtained;
          dailyTotalMax += session.maxMarks;
          
          subjectsMap[subject].daily.totalObtained += marksObtained;
          subjectsMap[subject].daily.totalMax += session.maxMarks;
          subjectsMap[subject].daily.count++;
          
          if (m.status !== 'absent') {
            dailyScores.push(m.percentage);
          }
        } else if (session?.category === 'main') {
          const marksObtained = m.status === 'absent' ? 0 : m.marksObtained;
          subjectsMap[subject].main.totalObtained += marksObtained;
          subjectsMap[subject].main.totalMax += session.maxMarks;
          subjectsMap[subject].main.count++;
        }
      });

      const dailyPercentage = dailyTotalMax > 0 ? (dailyTotalObtained / dailyTotalMax) * 100 : 0;

      // Calculate Main Exam percentage using marks-based calculation
      let mainTotalObtained = 0;
      let mainTotalMax = 0;

      studentMarks.forEach(m => {
        const session = m.session;
        if (session?.category === 'main') {
          const marksObtained = m.status === 'absent' ? 0 : m.marksObtained;
          mainTotalObtained += marksObtained;
          mainTotalMax += session.maxMarks;
        }
      });

      const mainPercentage = mainTotalMax > 0 ? (mainTotalObtained / mainTotalMax) * 100 : 0;

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
          average: overallAvg
        };
      });

      if (weakestSubject.name === '-') weakestSubject.score = 0;

      // Calculate Overall Percentage using marks-based calculation
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
        subjectAnalytics,
        dailyStats: {
          average: round2(dailyPercentage),
          highest: dailyScores.length ? Math.max(...dailyScores) : 0,
          lowest: dailyScores.length ? Math.min(...dailyScores) : 0,
          attempted: studentMarks.filter(m => m.session?.category === 'daily').length
        },
        insights: {
          strongestSubject: strongestSubject.name,
          weakestSubject: weakestSubject.name,
          highestAssessment: assessTypes.length > 0 ? assessTypes[0].name : '-',
          lowestAssessment: assessTypes.length > 0 ? assessTypes[assessTypes.length - 1].name : '-'
        }
      };
    });

    // Calculate ranks based on overall percentage
    const rankedData = computeCompetitionRanks(analyticsData, 'overallPercentage');

    res.json({ success: true, data: rankedData });
  } catch (error) {
    console.error('Error generating student performance analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to generate analytics', error: error.message });
  }
};