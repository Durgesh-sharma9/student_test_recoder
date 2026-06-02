import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const parentSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    parentName: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    linkedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  },
  { timestamps: true }
);

// Compound unique index for school + email (if email exists)
parentSchema.index(
  { school: 1, email: 1 },
  { 
    unique: true, 
    partialFilterExpression: { email: { $exists: true, $ne: '' } }
  }
);

// Compound unique index for school + phone (for cases where email doesn't exist)
parentSchema.index(
  { school: 1, phone: 1 },
  { 
    unique: true,
    partialFilterExpression: { phone: { $exists: true, $ne: '' } }
  }
);

parentSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

parentSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model('Parent', parentSchema);
