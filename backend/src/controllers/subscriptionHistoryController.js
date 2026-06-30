import SubscriptionHistory from '../models/SubscriptionHistory.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getSubscriptionHistory = asyncHandler(async (req, res) => {
  const history = await SubscriptionHistory.find({ school: req.user.school })
    .populate('plan', 'name slug planType billingCycle')
    .populate('previousPlan', 'name slug planType billingCycle')
    .sort({ createdAt: -1 });

  res.json({ success: true, history });
});

export const createSubscriptionHistory = asyncHandler(async (req, res) => {
  const { plan, action, previousPlan, expiryDate, scheduledDowngradeDate } = req.body;

  const history = await SubscriptionHistory.create({
    school: req.user.school,
    plan,
    action,
    previousPlan,
    expiryDate,
    scheduledDowngradeDate,
  });

  await history.populate('plan', 'name slug planType billingCycle');
  if (previousPlan) await history.populate('previousPlan', 'name slug planType billingCycle');

  res.json({ success: true, history });
});
