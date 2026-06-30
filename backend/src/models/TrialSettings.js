import mongoose from 'mongoose';

const trialSettingsSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    durationDays: { type: Number, default: 14, min: 1, max: 365 },
  },
  { timestamps: true }
);

// Ensure only one trial settings document exists
trialSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

export default mongoose.model('TrialSettings', trialSettingsSchema);
