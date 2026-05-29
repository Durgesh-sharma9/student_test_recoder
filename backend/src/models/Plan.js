import mongoose from 'mongoose';
import { PLAN_TYPES } from '../utils/constants.js';

const planSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, enum: PLAN_TYPES, required: true, unique: true },
    durationDays: { type: Number, required: true, default: 30 },
    maxTeachers: { type: Number, default: 50 },
    maxStudents: { type: Number, default: 500 },
    price: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Plan', planSchema);
