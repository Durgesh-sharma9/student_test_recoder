import mongoose from 'mongoose';

const paymentSettingsSchema = new mongoose.Schema(
  {
    upiId: { type: String, trim: true },
    merchantName: { type: String, trim: true },
    qrExpiryMinutes: { type: Number, min: 1, max: 60, default: 5 },
    razorpayEnabled: { type: Boolean, default: false },
    razorpayKeyId: { type: String, trim: true },
    razorpayKeySecret: { type: String, trim: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

paymentSettingsSchema.index({ createdAt: -1 });

export default mongoose.model('PaymentSettings', paymentSettingsSchema);

