import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    // ─────────────────────────────
    // Basic Information
    // ─────────────────────────────
    firstName: { type: String, required: true, trim: true },
    lastName:  { type: String, required: true, trim: true },
    email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    photo:     { type: String },

    // ─────────────────────────────
    // Authentication & Security
    // ─────────────────────────────
    password:  { type: String, required: true },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },

    // OTP Verification
   emailOtp: String,
   emailOtpExpires: Date,
   emailOtpAttempts: { type: Number, default: 0 },
   emailOtpLastSentAt: Date,
   isVerified: { type: Boolean, default: false },

    // ── Password Reset
    passwordResetToken:      { type: String },
    passwordResetExpires:    { type: Date },

    // ─────────────────────────────
    // Referral & Points System
    // ─────────────────────────────
    referralCode: { type: String, required: true, unique: true },
    referralEnabled: { type: Boolean, default: false },
    points: { type: Number, default: 0 },
    referredBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
   

    // ─────────────────────────────
    // Subscription System
    // ─────────────────────────────
    subscriptionType: {
      type: String,
      enum: ['freeTrial', 'premium']
    },
    subscriptionPlan: {
      type: String,
      enum: ['trial','monthly', 'quarterly', 'semiannual', 'yearly']
    },
    provider: {
  type: String,
  enum: ['local', 'google', 'facebook', 'linkedin'],
  default: 'local'
},
socialId: { type: String },
    paymentId: { type: String },
    transactionId: { type: String },
    paymentProvider: { type: String, enum: ['bkash', 'nagad'] },
    paymentNumber: { type: String },
    amount: { type: Number },
    subscriptionStatus: { type: String, enum: ['pending', 'active', 'expired'], default: 'pending' },
    freeTrialExpiresAt:    { type: Date, required: true },
    subscriptionExpiresAt: { type: Date },

    // ─────────────────────────────
    // Contact Details (Optional)
    // ─────────────────────────────
    mobileNumber: { type: String, trim: true },
    address:      { type: String, trim: true },

    // ─────────────────────────────
    // Soft Delete Fields
    // ─────────────────────────────
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    // ─── Refresh Tokens ─────────────────────
    refreshTokens: [{
      token: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    }],
  },
  {
    timestamps: true,
  }
);

// ─────────────────────────────
// Hooks
// ─────────────────────────────
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    const saltRounds = 10;
    this.password = await bcrypt.hash(this.password, saltRounds);
  }
  next();
});

// ─────────────────────────────
// Instance Methods
// ─────────────────────────────
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─────────────────────────────
// Soft Delete Helper (Optional Utility)
// ─────────────────────────────
userSchema.methods.softDelete = async function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  await this.save();
};

// ─────────────────────────────
// Model Export
// ─────────────────────────────
const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
