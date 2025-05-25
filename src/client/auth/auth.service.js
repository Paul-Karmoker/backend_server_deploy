import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import dayjs from 'dayjs';
import UserModel from './auth.model.js';
import sendEmail from './utils/sendEmail.js';
import { subscribe } from 'diagnostics_channel';

const {
  JWT_SECRET,
  CLIENT_URL,
  BASE_URL,
  FREE_TRIAL_MINUTES = '3',
} = process.env;

// Utility: Generate a 5-character referral code
function generateReferralCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

// Ensure the referral code is unique in the DB
async function getUniqueReferralCode() {
  let code = generateReferralCode();
  while (await UserModel.exists({ referralCode: code })) {
    code = generateReferralCode();
  }
  return code;
}

// ─────────────────────────────
// Sign Up
// ─────────────────────────────
export async function signUp({ firstName, lastName, email, password, referralCode }) {
  if (await UserModel.exists({ email })) {
    throw new Error('Email already in use');
  }

  // Handle referral
  if (referralCode) {
    const referrer = await UserModel.findOne({ referralCode });
    if (referrer) {
      referrer.points += 10;
      await referrer.save();
    }
  }

  const uniqueCode = await getUniqueReferralCode();
  const verificationToken = crypto.randomBytes(20).toString('hex');
  const verificationExpires = Date.now() + 24 * 60 * 60 * 1000;

  const now = new Date();
  const trialExpires = dayjs(now).add(Number(FREE_TRIAL_MINUTES), 'minute').toDate();

  const newUser = await UserModel.create({
    firstName,
    lastName,
    email,
    password, // hashed in schema pre-save
    referralCode: uniqueCode,
    points: 0,
    subscriptionPlan: 'freeTrial',
    freeTrialExpiresAt: trialExpires,
    emailVerificationToken: verificationToken,
    emailVerificationExpires: verificationExpires,
  });

  const ttlSec = Math.floor((trialExpires.getTime() - now.getTime()) / 1000);
  const token = jwt.sign({ id: newUser._id }, JWT_SECRET, { expiresIn: `${ttlSec}s` });

  const verifyUrl = `${BASE_URL}/auth/verify-email?token=${verificationToken}`;
  const html = `
    <h2>Hi ${newUser.firstName},</h2>
    <p>Thanks for signing up! Please verify your email:</p>
    <a href="${verifyUrl}" style="padding:10px 20px; background:#28a745; color:#fff; border-radius:4px;">Verify Email</a>
    <p>If the button doesn’t work, use this URL:</p>
    <p>${verifyUrl}</p>
  `;

  await sendEmail(newUser.email, 'Verify your email address', html);

  return {
    message: 'Signed up! Please check your email to verify your account.',
    user: newUser,
    token,
  };
}

// ─────────────────────────────
// Verify Email
// ─────────────────────────────
export async function verifyEmail(token) {
  if (!token) throw new Error('Token is required');

  const user = await UserModel.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: Date.now() },
  });

  if (!user) throw new Error('Invalid or expired token');

  user.isVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  return user;
}

// ─────────────────────────────
// Login
// ─────────────────────────────
export async function login({ email, password }) {
  const user = await UserModel.findOne({ email });
  if (!user) throw new Error('Invalid credentials');
  if (!user.isVerified) throw new Error('Please verify your email first');

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new Error('Invalid credentials');

  const now = new Date();
  let token;

  if (user.subscriptionPlan === 'freeTrial') {
    if (user.freeTrialExpiresAt <= now) {
      throw new Error('Free trial expired. Please subscribe.');
    }
    const ttlSec = Math.floor((user.freeTrialExpiresAt - now) / 1000);
    token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: `${ttlSec}s` });
  } else {
    if (!user.subscriptionExpiresAt || user.subscriptionExpiresAt <= now) {
      throw new Error('Subscription expired. Please renew.');
    }
    token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
  }

  return { user, token };
}

// ─────────────────────────────
// Forgot Password
// ─────────────────────────────
export async function forgotPassword(email) {
  const user = await UserModel.findOne({ email });
  if (!user) throw new Error('Email not found');

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashed = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.passwordResetToken = hashed;
  user.passwordResetExpires = Date.now() + 60 * 60 * 1000;
  await user.save();

  const resetUrl = `${CLIENT_URL}/reset-password/${resetToken}`;
  const html = `
    <p>Hi ${user.firstName},</p>
    <p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>
  `;
  await sendEmail(user.email, 'Reset your password', html);
}

// ─────────────────────────────
// Reset Password
// ─────────────────────────────
export async function resetPassword(token, newPassword) {
  if (!token || !newPassword) throw new Error('Token and new password are required');

  const hashed = crypto.createHash('sha256').update(token).digest('hex');

  const user = await UserModel.findOne({
    passwordResetToken: hashed,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) throw new Error('Token is invalid or expired');

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  const html = `<p>Hi ${user.firstName}, your password has been updated successfully.</p>`;
  await sendEmail(user.email, 'Password Changed', html);
}

// ─────────────────────────────
// Change Password
// ─────────────────────────────
export async function changePassword(userId, oldPassword, newPassword) {
  const user = await UserModel.findById(userId);
  if (!user) throw new Error('User not found');

  const isMatch = await user.comparePassword(oldPassword);
  if (!isMatch) throw new Error('Old password is incorrect');

  user.password = newPassword;
  await user.save();

  const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

  return { user, token };
}

// ─────────────────────────────
// Update Profile
// ─────────────────────────────
export async function updateProfile(userId, { firstName, lastName, email, mobileNumber, address, photo }) {
  if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
    throw new Error('First name, last name, and email are required');
  }

  const existing = await UserModel.findOne({ email });
  if (existing && existing._id.toString() !== userId) {
    throw new Error('Email already used by another account');
  }

  const update = {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.trim().toLowerCase(),
    ...(mobileNumber && { mobileNumber: mobileNumber.trim() }),
    ...(address && { address: address.trim() }),
    ...(photo && { photo: photo.trim() }),
  };

  const user = await UserModel.findByIdAndUpdate(userId, update, {
    new: true,
    runValidators: true,
  });

  if (!user) throw new Error('User not found');

  return user;
}


export async function Subscribe(userId, {
  subscriptionPlan,
  paymentId,
  paymentProvider,
  paymentNumber,
  amount
}) {
  const user = await UserModel.findById(userId);
  if (!user) throw new Error('User not found');

  const now = new Date();
  let expectedAmount = 0;
  let subscriptionExpiresAt;

  // Calculate expiration and expected amount based on plan
  if (subscriptionPlan === 'monthly') {
    expectedAmount = 150;
    subscriptionExpiresAt = new Date(now.setMonth(now.getMonth() + 1));
  } else if (subscriptionPlan === '4month') {
    expectedAmount = 260;
    subscriptionExpiresAt = new Date(now.setMonth(now.getMonth() + 4));
  } else if (subscriptionPlan === '6month') {
    expectedAmount = 450;
    subscriptionExpiresAt = new Date(now.setMonth(now.getMonth() + 6));
  } else if (subscriptionPlan === 'annual') {
    expectedAmount = 520;
    subscriptionExpiresAt = new Date(now.setFullYear(now.getFullYear() + 1));
  } else {
    throw new Error('Invalid subscription plan');
  }

  // Check if amount is correct
  if (amount !== expectedAmount) {
    throw new Error(`Incorrect amount. Expected ${expectedAmount} for ${subscriptionPlan} plan.`);
  }

  // Prepare update data without changing access until admin approval
  const update = {
    subscriptionPlan,
    subscriptionExpiresAt,
    subscriptionStatus: 'pending', // Wait for admin to approve
    // subscriptionType is not updated here; still 'freeTrial' or previous
    paymentId,
    paymentProvider,
    paymentNumber,
    amount
  };

  const updatedUser = await UserModel.findByIdAndUpdate(userId, update, {
    new: true,
    runValidators: true
  });

  if (!updatedUser) throw new Error('Failed to update subscription');

  return updatedUser;
}

export async function approveSubscription(userId) {
  const user = await UserModel.findById(userId);
  if (!user) throw new Error('User not found');

  if (user.subscriptionStatus !== 'pending') {
    throw new Error('Subscription is not pending');
  }

  const updatedUser = await UserModel.findByIdAndUpdate(userId, {
    subscriptionStatus: 'active',
    subscriptionType: 'premium'
  }, {
    new: true,
    runValidators: true
  });

  return updatedUser;
}