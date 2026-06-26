import School from '../models/School.js';
import Plan from '../models/Plan.js';
import User from '../models/User.js';
import Class from '../models/Class.js';
import Student from '../models/Student.js';
import SubscriptionRequest from '../models/SubscriptionRequest.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendCsv, sendPdfTable } from '../utils/exportService.js';
import { normalizePlanPricing } from '../utils/planPricing.js';

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

  // Subscription analytics (manual UPI verification for now)
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const sumApproved = async (fromDate) => {
    const match = { status: 'approved', reviewedAt: { $gte: fromDate } };
    const agg = await SubscriptionRequest.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$finalAmount' },
          tax: { $sum: '$taxAmount' },
        },
      },
    ]);
    return agg[0] || { revenue: 0, tax: 0 };
  };

  const [todayAgg, monthAgg, yearAgg, totalAgg, pendingCount, rejectedCount, approvedCount] = await Promise.all([
    sumApproved(startOfDay),
    sumApproved(startOfMonth),
    sumApproved(startOfYear),
    (async () => {
      const agg = await SubscriptionRequest.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: null, revenue: { $sum: '$finalAmount' }, tax: { $sum: '$taxAmount' } } },
      ]);
      return agg[0] || { revenue: 0, tax: 0 };
    })(),
    SubscriptionRequest.countDocuments({ status: 'pending' }),
    SubscriptionRequest.countDocuments({ status: 'rejected' }),
    SubscriptionRequest.countDocuments({ status: 'approved' }),
  ]);

  // Plan distributions from current school plans
  const planDistribution = { basic: 0, standard: 0, premium: 0, trial: 0 };
  const billingCycleDistribution = { monthly: 0, quarterly: 0, half_yearly: 0, yearly: 0 };
  for (const s of schools) {
    const plan = s.plan;
    const planTypeRaw = (plan?.planType || plan?.slug || 'trial').toString().toLowerCase();
    const planType = planTypeRaw.includes('_') ? planTypeRaw.split('_')[0] : planTypeRaw;
    const cycle = (plan?.billingCycle || 'monthly').toString().toLowerCase();
    if (planDistribution[planType] !== undefined) planDistribution[planType] += 1;
    if (billingCycleDistribution[cycle] !== undefined) billingCycleDistribution[cycle] += 1;
  }

  // Revenue by month (last 12 months)
  const start12 = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const monthAggRows = await SubscriptionRequest.aggregate([
    { $match: { status: 'approved', reviewedAt: { $gte: start12 } } },
    {
      $group: {
        _id: { y: { $year: '$reviewedAt' }, m: { $month: '$reviewedAt' } },
        revenue: { $sum: '$finalAmount' },
        tax: { $sum: '$taxAmount' },
      },
    },
    { $sort: { '_id.y': 1, '_id.m': 1 } },
  ]);

  const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const monthMap = new Map(monthAggRows.map((r) => [monthKey(new Date(r._id.y, r._id.m - 1, 1)), r]));
  const revenueByMonth = [];
  for (let i = 0; i < 12; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    const key = monthKey(d);
    const row = monthMap.get(key);
    revenueByMonth.push({
      month: d.toLocaleString('en-US', { month: 'short' }),
      year: d.getFullYear(),
      revenue: row ? Number(row.revenue || 0) : 0,
      tax: row ? Number(row.tax || 0) : 0,
    });
  }

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
    subscription: {
      revenue: {
        today: Number(todayAgg.revenue || 0),
        month: Number(monthAgg.revenue || 0),
        year: Number(yearAgg.revenue || 0),
        total: Number(totalAgg.revenue || 0),
      },
      requests: {
        pending: pendingCount,
        rejected: rejectedCount,
        approved: approvedCount,
      },
      distributions: {
        plan: planDistribution,
        billingCycle: billingCycleDistribution,
      },
      charts: {
        revenueByMonth,
        taxCollectedByMonth: revenueByMonth.map((r) => ({ month: r.month, year: r.year, tax: r.tax })),
        monthlyRevenueTrend: revenueByMonth.map((r) => ({ month: r.month, year: r.year, revenue: r.revenue })),
      },
    },
    recentRegistrations,
  });
});

export const getPlans = asyncHandler(async (req, res) => {
  const plans = await Plan.find().sort('slug');
  const normalized = plans.map((p) => {
    const obj = p.toObject({ virtuals: true });
    return { ...obj, ...normalizePlanPricing(obj) };
  });
  res.json({ success: true, plans: normalized });
});

export const upsertPlan = asyncHandler(async (req, res) => {
  // IMPORTANT: findOneAndUpdate does not run document middleware (pre-validate/pre-save),
  // so we must normalize derived pricing fields here to avoid finalPrice becoming 0.
  const pricing = normalizePlanPricing(req.body);
  const updatePayload = {
    ...req.body,
    basePrice: pricing.basePrice,
    finalPrice: pricing.finalPrice,
    price: pricing.price,
    tax: pricing.tax,
  };

  const plan = await Plan.findOneAndUpdate({ slug: req.body.slug }, updatePayload, {
    upsert: true,
    new: true,
    runValidators: true,
  });

  const obj = plan.toObject({ virtuals: true });
  res.json({ success: true, plan: { ...obj, ...normalizePlanPricing(obj) } });
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
