import Student from '../models/Student.js';
import MarkEntry from '../models/MarkEntry.js';
import NotebookCheck from '../models/NotebookCheck.js';
import mongoose from 'mongoose';

export const getStudentPerformanceAnalytics = async (req, res, next) => {
  try {
    const { classId, studentId, assessments, examType, dateRange, academicSession } = req.query;

    if (!classId) {
      return res.status(400).json({ success: false, message: 'Class ID is required.' });
    }

    // 1. Fetch Students
    const studentQuery = { class: classId, academicSession, isActive: true };
    if (studentId && studentId !== 'all') {
      studentQuery._id = studentId;
    }
    const students = await Student.find(studentQuery).sort({ rollNo: 1 }).lean();
    
    if (!students.length) {
      return res.json({ success: true, data: [] });
    }
    
    const studentIds = students.map(s => s._id);
    const assessmentArray = assessments ? assessments.split(',') : [];

    // 2. Fetch Marks (Daily Tests & Main Exams)
    let marks = [];
    if (assessmentArray.includes('Daily Test') || assessmentArray.includes('Main Exam') || assessmentArray.includes('All Assessments')) {
      // Fetch MarkEntries and populate session to determine exam type/dates
      marks = await MarkEntry.find({
        student: { $in: studentIds },
        academicSession
      }).populate('session').lean();

      // Apply Date Filters if session date exists
      if (dateRange && dateRange !== 'This Year') {
        const now = new Date();
        let startDate = new Date();
        
        if (dateRange === 'Today') startDate.setHours(0,0,0,0);
        else if (dateRange === 'This Week') startDate.setDate(now.getDate() - 7);
        else if (dateRange === 'This Month') startDate.setMonth(now.getMonth() - 1);
        
        marks = marks.filter(m => {
          const examDate = m.session?.date || m.createdAt;
          return new Date(examDate) >= startDate;
        });
      }

      // Filter by Exam Type if Main Exam is specifically selected
      if (examType && examType !== 'All Exams') {
        marks = marks.filter(m => m.session?.title === examType || m.session?.examType === examType);
      }
    }

    // 3. Fetch Notebook Checks
    let notebooks = [];
    if (assessmentArray.includes('Notebook Checking') || assessmentArray.includes('All Assessments')) {
      notebooks = await NotebookCheck.find({
        student: { $in: studentIds },
        academicSession
      }).lean();
    }

    // 4. Aggregate Data Per Student
    const analyticsData = students.map(student => {
      const studentMarks = marks.filter(m => m.student.toString() === student._id.toString());
      const studentNotebooks = notebooks.filter(n => n.student.toString() === student._id.toString());

      let subjectsMap = {};

      // Process Notebooks
      let totalNotebooks = 0;
      let totalCheckedNotebooks = 0;
      studentNotebooks.forEach(nb => {
        if (!subjectsMap[nb.subject]) subjectsMap[nb.subject] = { notebook: 0, daily: [], main: [] };
        const checked = nb.chapters.filter(ch => ch.status === 'Checked').length;
        const total = nb.chapters.length;
        const percent = total > 0 ? (checked / total) * 100 : 0;
        
        subjectsMap[nb.subject].notebook = percent;
        subjectsMap[nb.subject].notebookData = { checked, total, percent };
        
        totalNotebooks += total;
        totalCheckedNotebooks += checked;
      });

      const notebookPercentage = totalNotebooks > 0 ? (totalCheckedNotebooks / totalNotebooks) * 100 : 0;

      // Process Marks (Separate Daily vs Main based on session fields. Assuming session title/type identifies it)
      let dailyTotal = 0, dailyCount = 0;
      let mainTotal = 0, mainCount = 0;
      let dailyScores = [];

      studentMarks.forEach(m => {
        const isMain = m.session?.type === 'Main Exam' || m.session?.examType === 'Main Exam' || (m.session?.title && !m.session.title.toLowerCase().includes('daily'));
        
        // Use subject from session if available, else generic
        const subject = m.session?.subject || 'General';
        if (!subjectsMap[subject]) subjectsMap[subject] = { notebook: 0, daily: [], main: [] };

        if (isMain) {
          subjectsMap[subject].main.push(m.percentage);
          mainTotal += m.percentage;
          mainCount++;
        } else {
          subjectsMap[subject].daily.push(m.percentage);
          dailyTotal += m.percentage;
          dailyCount++;
          dailyScores.push(m.percentage);
        }
      });

      const dailyPercentage = dailyCount > 0 ? dailyTotal / dailyCount : 0;
      const mainPercentage = mainCount > 0 ? mainTotal / mainCount : 0;

      // Calculate Subject Averages
      let strongestSubject = { name: '-', score: 0 };
      let weakestSubject = { name: '-', score: 100 };
      
      const subjectAnalytics = Object.keys(subjectsMap).map(subj => {
        const data = subjectsMap[subj];
        const dailyAvg = data.daily.length ? data.daily.reduce((a,b) => a+b, 0) / data.daily.length : 0;
        const mainAvg = data.main.length ? data.main.reduce((a,b) => a+b, 0) / data.main.length : 0;
        
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

      // Calculate Overall Percentage (Simple Average of active components)
      let activeComponents = 0;
      let overallSum = 0;
      if (notebookPercentage > 0) { overallSum += notebookPercentage; activeComponents++; }
      if (dailyPercentage > 0) { overallSum += dailyPercentage; activeComponents++; }
      if (mainPercentage > 0) { overallSum += mainPercentage; activeComponents++; }
      
      const overallPercentage = activeComponents > 0 ? overallSum / activeComponents : 0;

      // Smart Insights (Highest/Lowest Assessment Type)
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
        overallPercentage,
        notebookPercentage,
        dailyPercentage,
        mainPercentage,
        subjectAnalytics,
        dailyStats: {
          average: dailyPercentage,
          highest: dailyScores.length ? Math.max(...dailyScores) : 0,
          lowest: dailyScores.length ? Math.min(...dailyScores) : 0,
          attempted: dailyCount
        },
        insights: {
          strongestSubject: strongestSubject.name,
          weakestSubject: weakestSubject.name,
          highestAssessment: assessTypes.length > 0 ? assessTypes[0].name : '-',
          lowestAssessment: assessTypes.length > 0 ? assessTypes[assessTypes.length - 1].name : '-'
        }
      };
    });

    // 5. Calculate Ranks
    analyticsData.sort((a, b) => b.overallPercentage - a.overallPercentage);
    let currentRank = 1;
    analyticsData.forEach((student, index) => {
      // Handle ties
      if (index > 0 && student.overallPercentage === analyticsData[index - 1].overallPercentage) {
        student.rank = analyticsData[index - 1].rank;
      } else {
        student.rank = currentRank;
      }
      currentRank++;
    });

    // Re-sort by Roll No as requested
    analyticsData.sort((a, b) => {
      const numA = parseInt(a.rollNo.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.rollNo.replace(/\D/g, '')) || 0;
      return numA - numB;
    });

    res.json({ success: true, data: analyticsData });
  } catch (error) {
    console.error('Error generating student performance analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to generate analytics', error: error.message });
  }
};