import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const teacherAssignmentSchema = new mongoose.Schema(
  {
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    subject: { type: String, required: true, trim: true, uppercase: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
    teacherName: { type: String, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: {
      type: String,
      enum: ['super_admin', 'school_admin', 'teacher', 'admin'],
      required: true,
    },
    phoneNo: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    assignedClasses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
    assignments: [teacherAssignmentSchema],
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (this.role === 'admin') this.role = 'school_admin';
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model('User', userSchema);
