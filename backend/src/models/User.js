import mongoose from 'mongoose';

const { Schema } = mongoose;

const userSchema = new Schema({
  role: { type: String, enum: ['customer', 'inspector', 'admin'], required: true, index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, select: false },
  phone: { type: String, default: '' },
  city: { type: String, default: '' },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  provider: { type: String, enum: ['password', 'google'], default: 'password' },
  emailVerified: { type: Boolean, default: false },
  passwordChangedAt: Date,                       // sessions issued before this are no longer valid
  resetTokenHash: { type: String, select: false }, resetExpires: { type: Date, select: false },
  verifyTokenHash: { type: String, select: false }, verifyExpires: { type: Date, select: false },
  // customer (kept in the exact shape the frontend uses; sanitised on write)
  addresses: { type: [Schema.Types.Mixed], default: [] },
  paymentMethods: { type: [Schema.Types.Mixed], default: [] },
  // inspector
  specialization: String,
  rating: Number,
  available: { type: Boolean, default: true },
  joinedAt: { type: Date, default: Date.now },
}, { minimize: false });

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id; delete ret.__v; delete ret.passwordHash;
    delete ret.resetTokenHash; delete ret.resetExpires; delete ret.verifyTokenHash; delete ret.verifyExpires; delete ret.passwordChangedAt;
    return ret;
  },
});

export default mongoose.model('User', userSchema);
