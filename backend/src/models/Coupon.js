import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    discountType: {
      type: String,
      enum: ['percentage'],
      default: 'percentage',
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    maxUses: {
      type: Number,
      default: null,
      min: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    unlimitedUses: {
      type: Boolean,
      default: false,
    },
    applicablePlans: [{
      type: String,
      enum: ['basic', 'standard', 'elite'],
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Virtual to check if coupon is expired
couponSchema.virtual('isExpired').get(function () {
  if (!this.expiryDate) return false;
  return new Date() > this.expiryDate;
});

// Virtual to check if coupon usage limit is reached
couponSchema.virtual('isUsageLimitReached').get(function () {
  if (this.unlimitedUses) return false;
  if (!this.maxUses) return false;
  return this.usedCount >= this.maxUses;
});

// Virtual to check if coupon is valid
couponSchema.virtual('isValid').get(function () {
  return this.isActive && !this.isExpired && !this.isUsageLimitReached;
});

couponSchema.set('toJSON', { virtuals: true });
couponSchema.set('toObject', { virtuals: true });

export default mongoose.model('Coupon', couponSchema);
