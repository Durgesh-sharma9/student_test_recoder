import School from '../models/School.js';
import SubscriptionHistory from '../models/SubscriptionHistory.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

/**
 * Process scheduled downgrades
 * This function should be called periodically (e.g., via cron job or on certain API requests)
 * to check for schools whose scheduled downgrade date has passed and execute the downgrade
 */
export const processScheduledDowngrades = async () => {
  try {
    const now = new Date();
    
    // Find schools with scheduled downgrades that are due
    const schoolsToDowngrade = await School.find({
      scheduledDowngradePlan: { $exists: true, $ne: null },
      scheduledDowngradeDate: { $lte: now },
    }).populate('plan').populate('scheduledDowngradePlan');

    console.log(`[processScheduledDowngrades] Found ${schoolsToDowngrade.length} schools to downgrade`);

    for (const school of schoolsToDowngrade) {
      const previousPlan = school.plan;
      const newPlan = school.scheduledDowngradePlan;

      // Execute the downgrade
      school.plan = newPlan._id;
      school.scheduledDowngradePlan = null;
      school.scheduledDowngradeDate = null;
      
      // Extend expiry by the new plan's duration
      const durationDays = newPlan.durationDays || 30;
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + durationDays);
      school.planExpiresAt = newExpiry;

      await school.save();

      // Create subscription history entry
      await SubscriptionHistory.create({
        school: school._id,
        plan: newPlan._id,
        action: 'plan_downgraded',
        previousPlan: previousPlan._id,
        expiryDate: newExpiry,
      });

      // Notify school admin about the downgrade
      const admin = await User.findOne({ school: school._id, role: 'school_admin', isActive: true });
      if (admin) {
        await Notification.create({
          title: 'Plan Downgraded',
          message: `Your plan has been downgraded to ${newPlan.name} as scheduled. Valid until ${newExpiry.toLocaleDateString()}.`,
          priority: 'info',
          senderId: admin._id,
          senderRole: 'system',
          recipientIds: [admin._id],
          schoolId: school._id,
          targetRole: 'school_admin',
          isBroadcast: false,
        });
      }

      console.log(`[processScheduledDowngrades] Downgraded school ${school.schoolName} from ${previousPlan.name} to ${newPlan.name}`);
    }

    return { success: true, processed: schoolsToDowngrade.length };
  } catch (error) {
    console.error('[processScheduledDowngrades] Error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Middleware to check and process scheduled downgrades on each request
 * This ensures downgrades are processed even without a cron job
 */
export const checkScheduledDowngrades = async (req, res, next) => {
  try {
    // Only check periodically (e.g., every 10 minutes) to avoid performance impact
    const lastCheck = req.app.get('lastDowngradeCheck') || 0;
    const now = Date.now();
    const CHECK_INTERVAL = 10 * 60 * 1000; // 10 minutes

    if (now - lastCheck > CHECK_INTERVAL) {
      await processScheduledDowngrades();
      req.app.set('lastDowngradeCheck', now);
    }
  } catch (error) {
    console.error('[checkScheduledDowngrades] Error:', error);
    // Don't block the request if downgrade check fails
  }
  next();
};
