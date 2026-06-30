import mongoose from 'mongoose';

const REQUEST_STATUS = ['pending', 'approved', 'rejected'];
const REJECT_REASONS = ['wrong_utr', 'wrong_amount', 'screenshot_missing', 'other'];

const subscriptionRequestSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    adminUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    currentPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
    requestedPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },

    billingCycle: { type: String, trim: true },

    basePrice: { type: Number, default: 0 },
    taxName: { type: String, trim: true },
    taxPercentage: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    finalAmount: { type: Number, default: 0 },

    // Coupon information
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
    couponCode: { type: String, trim: true, uppercase: true },
    discountAmount: { type: Number, default: 0 },

    mobileNumber: { type: String, trim: true },
    state: { type: String, trim: true },
    utr: { type: String, required: true, trim: true, uppercase: true },

    paymentScreenshotUrl: { type: String, trim: true },
    paymentScreenshotName: { type: String, trim: true },
    paymentScreenshotType: { type: String, trim: true },

    status: { type: String, enum: REQUEST_STATUS, default: 'pending', index: true },
    submittedAt: { type: Date, default: Date.now, index: true },

    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },

    rejectReason: { type: String, enum: REJECT_REASONS },
    rejectMessage: { type: String, trim: true },

    // Future compatibility (e.g. Razorpay)
    paymentProvider: { type: String, default: 'upi_manual' },
    providerRef: { type: String, trim: true },
  },
  { timestamps: true }
);

subscriptionRequestSchema.index({ status: 1, submittedAt: -1 });
subscriptionRequestSchema.index({ school: 1, submittedAt: -1 });

export default mongoose.model('SubscriptionRequest', subscriptionRequestSchema);

