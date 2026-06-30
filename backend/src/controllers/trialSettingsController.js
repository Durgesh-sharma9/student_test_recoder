import TrialSettings from '../models/TrialSettings.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getTrialSettings = asyncHandler(async (req, res) => {
  const settings = await TrialSettings.getSettings();
  res.json({ success: true, settings });
});

export const updateTrialSettings = asyncHandler(async (req, res) => {
  const { enabled, durationDays } = req.body;

  const settings = await TrialSettings.getSettings();
  
  if (enabled !== undefined) settings.enabled = enabled;
  if (durationDays !== undefined) {
    if (durationDays < 1 || durationDays > 365) {
      throw new ApiError(400, 'Duration must be between 1 and 365 days');
    }
    settings.durationDays = durationDays;
  }

  await settings.save();

  res.json({ success: true, settings });
});
