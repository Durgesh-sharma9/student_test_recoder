import School from '../models/School.js';
import Plan from '../models/Plan.js';
import User from '../models/User.js';
import Class from '../models/Class.js';
import Student from '../models/Student.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendCsv, sendPdfTable } from '../utils/exportService.js';

export const dashboard = asyncHandler(async (req, res) => {
  const now = new Date();
  const schools = await School.find().populate('plan');
  const active = schools.filter((s) => s.isActive && s.planExpiresAt > now).length;
  const inactive = schools.filter((s) => !s.isActive).length;
  const expired = schools.filter((s) => s.isActive && s.planExpiresAt <= now).length;

  const [teachers, students, classes] = await Promise.all([
    User.countDocuments({ role: 'teacher', isActive: true }),
    Student.countDocuments({ isActive: true }),
    Class.countDocuments({ isActive: true }),
  ]);

  const recentRegistrations = await School.find()
    .sort('-createdAt')
    .limit(10)
    .select('schoolName adminName email createdAt isActive planExpiresAt');

  res.json({
    success: true,
    stats: {
      totalSchools: schools.length,
      activeSchools: active,
      inactiveSchools: inactive,
      expiredSchools: expired,
      teachers,
      students,
      classes,
    },
    recentRegistrations,
  });
});

export const getPlans = asyncHandler(async (req, res) => {
  const plans = await Plan.find().sort('slug');
  res.json({ success: true, plans });
});

export const upsertPlan = asyncHandler(async (req, res) => {
  const plan = await Plan.findOneAndUpdate({ slug: req.body.slug }, req.body, {
    upsert: true,
    new: true,
    runValidators: true,
  });
  res.json({ success: true, plan });
});

export const getSchools = asyncHandler(async (req, res) => {
  const { search, status } = req.query;
  const filter = {};
  if (search) {
    filter.$or = [
      { schoolName: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
      { adminName: new RegExp(search, 'i') },
    ];
  }
  if (status === 'active') filter.isActive = true;
  if (status === 'inactive') filter.isActive = false;

  const schools = await School.find(filter).populate('plan').sort('-createdAt');
  const now = new Date();
  const enriched = schools.map((s) => ({
    ...s.toObject(),
    isExpired: s.planExpiresAt <= now,
  }));

  res.json({ success: true, schools: enriched });
});

export const getSchoolDetails = asyncHandler(async (req, res) => {
  const school = await School.findById(req.params.id).populate('plan');
  if (!school) throw new ApiError(404, 'School not found.');

  const [teachers, students, classes] = await Promise.all([
    User.countDocuments({ school: school._id, role: 'teacher', isActive: true }),
    Student.countDocuments({ school: school._id, isActive: true }),
    Class.countDocuments({ school: school._id, isActive: true }),
  ]);

  res.json({
    success: true,
    school,
    counts: { teachers, students, classes },
    isExpired: school.planExpiresAt && new Date() > school.planExpiresAt,
  });
});

export const updateSchoolStatus = asyncHandler(async (req, res) => {
  const school = await School.findByIdAndUpdate(
    req.params.id,
    { isActive: req.body.isActive },
    { new: true }
  ).populate('plan');
  if (!school) throw new ApiError(404, 'School not found.');
  res.json({ success: true, school });
});

export const extendSchoolPlan = asyncHandler(async (req, res) => {
  const { planId, extendDays } = req.body;
  const school = await School.findById(req.params.id);
  if (!school) throw new ApiError(404, 'School not found.');

  if (planId) {
    const plan = await Plan.findById(planId);
    if (!plan) throw new ApiError(404, 'Plan not found.');
    school.plan = plan._id;
    const base = school.planExpiresAt > new Date() ? school.planExpiresAt : new Date();
    school.planExpiresAt = new Date(base.getTime() + plan.durationDays * 86400000);
  } else if (extendDays) {
    const base = school.planExpiresAt > new Date() ? school.planExpiresAt : new Date();
    school.planExpiresAt = new Date(base.getTime() + Number(extendDays) * 86400000);
  }

  await school.save();
  res.json({ success: true, school: await school.populate('plan') });
});

const exportSchoolData = async (schoolId, type) => {
  if (type === 'teachers') {
    const rows = await User.find({ school: schoolId, role: 'teacher' }).select('teacherName name email phoneNo isActive');
    return {
      title: 'Teachers',
      headers: ['Name', 'Email', 'Phone', 'Status'],
      data: rows.map((t) => [t.teacherName || t.name, t.email, t.phoneNo || '-', t.isActive ? 'Active' : 'Inactive']),
    };
  }
  if (type === 'students') {
    const rows = await Student.find({ school: schoolId, isActive: true })
      .populate('class', 'className section')
      .sort('rollNo');
    rows.sort((a, b) => Number(a.rollNo) - Number(b.rollNo));
    return {
      title: 'Students',
      headers: ['Roll No', 'Name', 'Gender', 'Class', 'Section'],
      data: rows.map((s) => [s.rollNo, s.name, s.gender, s.class?.className, s.class?.section]),
    };
  }
  const rows = await Class.find({ school: schoolId, isActive: true }).sort('className section');
  return {
    title: 'Classes',
    headers: ['Class', 'Section'],
    data: rows.map((c) => [c.className, c.section]),
  };
};

export const downloadSchoolData = asyncHandler(async (req, res) => {
  const { id, type } = req.params;
  const format = req.query.format || 'csv';
  const { title, headers, data } = await exportSchoolData(id, type);
  const filename = `${type}-${id}.${format === 'pdf' ? 'pdf' : 'csv'}`;

  if (format === 'pdf') return sendPdfTable(res, filename, title, headers, data);
  return sendCsv(res, filename, headers, data);
});
