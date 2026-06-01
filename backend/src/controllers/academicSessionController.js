import AcademicSession from '../models/AcademicSession.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { withSchool } from '../utils/tenantQuery.js';

// Helper function to generate default session name and dates
const generateDefaultSession = () => {
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  const sessionName = `${currentYear}-${nextYear.toString().slice(-2)}`;
  const startDate = new Date(currentYear, 5, 1); // June 1st
  const endDate = new Date(nextYear, 2, 31); // March 31st
  return { sessionName, startDate, endDate };
};

// Auto-create current session if none exists
export const ensureActiveSession = asyncHandler(async (req, res, next) => {
  const schoolId = req.user.school?._id ?? req.user.school;
  
  const existingActive = await AcademicSession.findOne({
    school: schoolId,
    status: 'active'
  });
  
  if (existingActive) {
    req.activeSession = existingActive;
    return next();
  }
  
  // Create default session
  const { sessionName, startDate, endDate } = generateDefaultSession();
  
  const newSession = await AcademicSession.create({
    school: schoolId,
    sessionName,
    startDate,
    endDate,
    status: 'active'
  });
  
  req.activeSession = newSession;
  next();
});

// Get all sessions for a school
export const getSessions = asyncHandler(async (req, res) => {
  const filter = withSchool(req, {});
  const sessions = await AcademicSession.find(filter)
    .sort({ startDate: -1 });
  
  res.json({ success: true, sessions });
});

// Get active session
export const getActiveSession = asyncHandler(async (req, res) => {
  const filter = withSchool(req, { status: 'active' });
  const session = await AcademicSession.findOne(filter);
  
  if (!session) {
    // Auto-create if no active session exists
    const schoolId = req.user.school?._id ?? req.user.school;
    const { sessionName, startDate, endDate } = generateDefaultSession();
    
    const newSession = await AcademicSession.create({
      school: schoolId,
      sessionName,
      startDate,
      endDate,
      status: 'active'
    });
    
    return res.json({ success: true, session: newSession });
  }
  
  res.json({ success: true, session });
});

// Create new session
export const createSession = asyncHandler(async (req, res) => {
  const { sessionName, startDate, endDate } = req.body;
  const schoolId = req.user.school?._id ?? req.user.school;
  
  if (!sessionName || !startDate || !endDate) {
    throw new ApiError(400, 'Session name, start date, and end date are required.');
  }
  
  // Check for duplicate session name
  const existing = await AcademicSession.findOne({
    school: schoolId,
    sessionName
  });
  
  if (existing) {
    throw new ApiError(400, 'A session with this name already exists.');
  }
  
  // Validate dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start >= end) {
    throw new ApiError(400, 'Start date must be before end date.');
  }
  
  // Archive current active session if exists
  const currentActive = await AcademicSession.findOne({
    school: schoolId,
    status: 'active'
  });
  
  if (currentActive) {
    currentActive.status = 'archived';
    await currentActive.save();
  }
  
  // Create new active session
  const newSession = await AcademicSession.create({
    school: schoolId,
    sessionName,
    startDate: start,
    endDate: end,
    status: 'active'
  });
  
  res.status(201).json({ success: true, session: newSession });
});

// Update session (only active session can be edited)
export const updateSession = asyncHandler(async (req, res) => {
  const { sessionName, startDate, endDate } = req.body;
  const session = await AcademicSession.findOne(withSchool(req, { _id: req.params.id }));
  
  if (!session) {
    throw new ApiError(404, 'Session not found.');
  }
  
  if (session.status !== 'active') {
    throw new ApiError(400, 'Only active sessions can be edited.');
  }
  
  // Check for duplicate session name (if changing)
  if (sessionName && sessionName !== session.sessionName) {
    const existing = await AcademicSession.findOne({
      school: session.school,
      sessionName,
      _id: { $ne: session._id }
    });
    
    if (existing) {
      throw new ApiError(400, 'A session with this name already exists.');
    }
  }
  
  // Validate dates if provided
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      throw new ApiError(400, 'Start date must be before end date.');
    }
    
    session.startDate = start;
    session.endDate = end;
  }
  
  if (sessionName) {
    session.sessionName = sessionName;
  }
  
  await session.save();
  
  res.json({ success: true, session });
});

// Get session by ID
export const getSessionById = asyncHandler(async (req, res) => {
  const session = await AcademicSession.findOne(withSchool(req, { _id: req.params.id }));
  
  if (!session) {
    throw new ApiError(404, 'Session not found.');
  }
  
  res.json({ success: true, session });
});
