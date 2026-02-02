import crypto from "crypto";
import jwt from "jsonwebtoken";
import dayjs from "dayjs";
import UserModel from "../model/user.model.js";
import sendEmail from "../utils/sendEmail.js";
import {
  calculateReferralPoints,
  calculateSubscriptionDuration,
} from "../utils/subscription.js";
import { getAccessLevel } from "../utils/access.util.js";
const { JWT_SECRET, CLIENT_URL } = process.env;

/* ─────────────────────────────
   OTP & SECURITY CONFIG
───────────────────────────── */
const OTP_EXP_MIN = 10; // minutes
const OTP_RESEND_COOLDOWN = 60; // seconds
const OTP_MAX_ATTEMPTS = 5;

/* ─────────────────────────────
   UTILITY FUNCTIONS
───────────────────────────── */
const hash = (v) => crypto.createHash("sha256").update(v).digest("hex");

const genOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// Referral Code
function generateReferralCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

async function getUniqueReferralCode() {
  let code = generateReferralCode();
  while (await UserModel.exists({ referralCode: code })) {
    code = generateReferralCode();
  }
  return code;
}

// JWT helpers
const generateAccessToken = (id) =>
  jwt.sign({ id }, JWT_SECRET, { expiresIn: "1h" });

const generateRefreshToken = (id) =>
  jwt.sign({ id }, JWT_SECRET, { expiresIn: "3d" });
const FREE_TRIAL_DAYS = 3;
/* ─────────────────────────────
   SIGN UP (OTP BASED)
───────────────────────────── */
export async function signUp({
  firstName,
  lastName,
  email,
  password,
  referralCode,
}) {
  if (
    !firstName?.trim() ||
    !lastName?.trim() ||
    !email?.trim() ||
    !password?.trim()
  ) {
    throw new Error("First name, last name, email, and password are required");
  }

  email = email.trim().toLowerCase();

  if (await UserModel.exists({ email })) {
    throw new Error("Email already in use");
  }

  // ── Referral logic ──
  let referredBy = null;
  if (referralCode) {
    const referrer = await UserModel.findOne({ referralCode });
    if (!referrer) throw new Error("Invalid referral code");
    referredBy = referrer._id;
  }

  // ── Trial logic ──
  const uniqueCode = await getUniqueReferralCode();
  const trialExpires = dayjs().add(FREE_TRIAL_DAYS, "day").toDate();

  // ── OTP generation ──
  const otp = genOtp();
  const otpHash = hash(otp);

  // ── Create user (NO TOKEN HERE) ──
  const newUser = await UserModel.create({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email,
    password, // hashed by schema hook
    referralCode: uniqueCode,
    referredBy,
    points: 0,

    subscriptionType: "freeTrial",
    subscriptionPlan: "trial",
    freeTrialExpiresAt: trialExpires,

    emailOtp: otpHash,
    emailOtpExpires: Date.now() + OTP_EXP_MIN * 60 * 1000,
    emailOtpAttempts: 0,
    emailOtpLastSentAt: Date.now(),
    isVerified: false,
  });

  // ── Send OTP email ──
  await sendEmail(
    newUser.email,
    "Verify your email (OTP)",
    `
      <h2>Email Verification</h2>
      <p>Your verification code:</p>
      <h1 style="letter-spacing:3px;">${otp}</h1>
      <p>This code will expire in ${OTP_EXP_MIN} minutes.</p>
    `
  );

  // ── Response (NO TOKEN) ──
  return {
    message: "Signed up successfully. Please verify your email using OTP.",
    user: {
      id: newUser._id,
      firstName: newUser.firstName,
      email: newUser.email,
      freeTrialExpiresAt: newUser.freeTrialExpiresAt,
    },
  };
}


/* ─────────────────────────────
   VERIFY EMAIL OTP
───────────────────────────── */
export async function verifyEmailOtp(email, otp) {
  if (!email?.trim() || !otp?.trim()) {
    throw new Error("Email and OTP are required");
  }

  const user = await UserModel.findOne({ email: email.toLowerCase() });
  if (!user) throw new Error("User not found");

  if (user.isVerified) throw new Error("Email already verified");

  if (user.emailOtpAttempts >= OTP_MAX_ATTEMPTS) {
    throw new Error("Too many invalid attempts");
  }

  if (!user.emailOtp || user.emailOtpExpires < Date.now()) {
    throw new Error("OTP expired");
  }

  if (hash(otp) !== user.emailOtp) {
    user.emailOtpAttempts += 1;
    await user.save();
    throw new Error("Invalid OTP");
  }

  user.isVerified = true;
  user.emailOtp = undefined;
  user.emailOtpExpires = undefined;
  user.emailOtpAttempts = 0;
  await user.save();

  return { message: "Email verified successfully" };
}

/* ─────────────────────────────
   RESEND EMAIL OTP
───────────────────────────── */
export async function resendEmailOtp(email) {
  if (!email?.trim()) throw new Error("Email is required");

  const user = await UserModel.findOne({ email: email.toLowerCase() });
  if (!user) throw new Error("User not found");

  if (user.isVerified) throw new Error("Email already verified");

  const now = Date.now();
  if (
    user.emailOtpLastSentAt &&
    (now - user.emailOtpLastSentAt) / 1000 < OTP_RESEND_COOLDOWN
  ) {
    throw new Error("Please wait before requesting another OTP");
  }

  const otp = genOtp();

  user.emailOtp = hash(otp);
  user.emailOtpExpires = now + OTP_EXP_MIN * 60 * 1000;
  user.emailOtpAttempts = 0;
  user.emailOtpLastSentAt = now;
  await user.save();

  await sendEmail(
    user.email,
    "Resend Email Verification OTP",
    `<h1>${otp}</h1><p>Valid for ${OTP_EXP_MIN} minutes</p>`,
  );

  return { message: "A new OTP has been sent to your email" };
}

// export async function verifyEmail(token) {
//   if (!token?.trim()) throw new Error('Token is required');

//   const user = await UserModel.findOne({
//     emailVerificationToken: token,
//     emailVerificationExpires: { $gt: Date.now() },
//   });

//   if (!user) throw new Error('Invalid or expired token');

//   user.isVerified = true;
//   user.emailVerificationToken = undefined;
//   user.emailVerificationExpires = undefined;
//   await user.save();

//   return {
//     message: 'Email verified successfully',
//     user: {
//       id: user._id,
//       firstName: user.firstName,
//       email: user.email,
//     },
//   };
// }

// ─────────────────────────────
// Login
// ─────────────────────────────
export async function login({ email, password }) {
  if (!email?.trim() || !password?.trim())
    throw new Error("Email and password are required");

  const user = await UserModel.findOne({ email: email.trim().toLowerCase() });
  if (!user) throw new Error("Invalid credentials");
  if (!user.isVerified) throw new Error("Please verify your email first");

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new Error("Invalid credentials");

  // ✅ NEW – NO AUTO LOGOUT
  const accessLevel = getAccessLevel(user);

  const token = jwt.sign(
    {
      id: user._id,
      role: user.role,
      accessLevel, // FULL | LIMITED
    },
    JWT_SECRET,
    { expiresIn: "7d" }, // 🔥 FIXED lifetime
  );

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshTokens.push({ token: refreshToken });
  await user.save();

  return {
    message: "Login successful",
    user: {
      id: user._id,
      firstName: user.firstName,
      email: user.email,
      subscriptionType: user.subscriptionType,
      subscriptionStatus: user.subscriptionStatus,
      freeTrialExpiresAt: user.freeTrialExpiresAt,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
    },
    token,
  };
}

// ─────────────────────────────
// Forgot Password
// ─────────────────────────────
export async function forgotPassword(email) {
  if (!email?.trim()) throw new Error("Email is required");

  const user = await UserModel.findOne({ email: email.trim().toLowerCase() });
  if (!user) throw new Error("Email not found");

  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashed = crypto.createHash("sha256").update(resetToken).digest("hex");

  user.passwordResetToken = hashed;
  user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  await user.save();

  const resetUrl = `${CLIENT_URL}/reset-password/${resetToken}`;
  const html = `
    <!DOCTYPE html>
    <html lang="en" style="margin:0; padding:0; font-family:Arial, sans-serif; background-color:#f4f4f4;">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Password Reset</title>
    </head>
    <body style="margin:0; padding:0; background-color:#f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 0 10px rgba(0,0,0,0.1);">
              <tr>
                <td style="background-color:#28a745; padding:20px 30px; color:#ffffff; text-align:center;">
                  <h1 style="margin:0; font-size:24px;">Password Reset Request</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:30px;">
                  <h2 style="color:#333333;">Hi ${user.firstName},</h2>
                  <p style="color:#555555; font-size:16px;">
                    You requested to reset your password. Click the button below to proceed.
                  </p>
                  <p style="text-align:center; margin: 30px 0;">
                    <a href="${resetUrl}" style="display:inline-block; padding:12px 24px; background-color:#28a745; color:#ffffff; text-decoration:none; border-radius:5px; font-size:16px;">Reset Password</a>
                  </p>
                  <p style="color:#888888; font-size:14px;">
                    If the button above doesn't work, please copy and paste the following URL into your browser:
                  </p>
                  <p style="word-break:break-all; color:#555555; font-size:14px;">
                    <a href="${resetUrl}" style="color:#28a745;">${resetUrl}</a>
                  </p>
                  <hr style="margin:30px 0; border:none; border-top:1px solid #eeeeee;" />
                  <p style="color:#aaaaaa; font-size:12px; text-align:center;">
                    If you did not request this, you can ignore this email.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color:#f0f0f0; padding:20px; text-align:center; color:#999999; font-size:12px;">
                  © ${new Date().getFullYear()} Your Company. All rights reserved.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
  await sendEmail(user.email, "Reset Your Password", html);

  return { message: "Password reset email sent successfully" };
}

// ─────────────────────────────
// Reset Password
// ─────────────────────────────
export async function resetPassword(token, newPassword) {
  if (!token?.trim() || !newPassword?.trim())
    throw new Error("Token and new password are required");

  const hashed = crypto.createHash("sha256").update(token).digest("hex");

  const user = await UserModel.findOne({
    passwordResetToken: hashed,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) throw new Error("Token is invalid or expired");

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  const html = `
    <!DOCTYPE html>
    <html lang="en" style="margin:0; padding:0; font-family:Arial, sans-serif; background-color:#f4f4f4;">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Password Changed</title>
    </head>
    <body style="margin:0; padding:0; background-color:#f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 0 10px rgba(0,0,0,0.1);">
              <tr>
                <td style="background-color:#28a745; padding:20px 30px; color:#ffffff; text-align:center;">
                  <h1 style="margin:0; font-size:24px;">Password Changed Successfully</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:30px;">
                  <h2 style="color:#333333;">Hi ${user.firstName},</h2>
                  <p style="color:#555555; font-size:16px;">
                    Your password has been updated successfully. You can now log in with your new password.
                  </p>
                  <p style="text-align:center; margin: 30px 0;">
                    <a href="https://crosscareers.com/signin" style="display:inline-block; padding:12px 24px; background-color:#28a745; color:#ffffff; text-decoration:none; border-radius:5px; font-size:16px;">Log In</a>
                  </p>
                  <hr style="margin:30px 0; border:none; border-top:1px solid #eeeeee;" />
                  <p style="color:#aaaaaa; font-size:12px; text-align:center;">
                    If you did not make this change, please contact support immediately.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color:#f0f0f0; padding:20px; text-align:center; color:#999999; font-size:12px;">
                  © ${new Date().getFullYear()} Your Company. All rights reserved.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
  await sendEmail(user.email, "Password Changed", html);

  return { message: "Password reset successfully" };
}

// ─────────────────────────────
// Change Password
// ─────────────────────────────
export async function changePassword(userId, oldPassword, newPassword) {
  if (!userId || !oldPassword?.trim() || !newPassword?.trim())
    throw new Error("User ID, old password, and new password are required");

  const user = await UserModel.findById(userId);
  if (!user) throw new Error("User not found");

  const isMatch = await user.comparePassword(oldPassword);
  if (!isMatch) throw new Error("Old password is incorrect");

  user.password = newPassword;
  await user.save();

  const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });

  return {
    message: "Password changed successfully",
    user: {
      id: user._id,
      firstName: user.firstName,
      email: user.email,
    },
    token,
  };
}

// ─────────────────────────────
// Get User
// ─────────────────────────────
export async function getUser(userId) {
  const totalreffers = await UserModel.countDocuments({ referredBy: userId });
  const user = await UserModel.findById(userId);
  if (!user) throw new Error("User not found");
  return user;
}

// ─────────────────────────────
// Update Profile
// ─────────────────────────────
export async function updateProfile(
  userId,
  { firstName, lastName, email, mobileNumber, address, photo },
) {
  if (!userId || !firstName?.trim() || !lastName?.trim() || !email?.trim()) {
    throw new Error("User ID, first name, last name, and email are required");
  }

  const existing = await UserModel.findOne(userId);
  if (!existing) throw new Error("User not found");
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

  if (!user) throw new Error("User not found");

  return {
    message: "Profile updated successfully",
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      mobileNumber: user.mobileNumber,
      address: user.address,
      photo: user.photo,
    },
  };
}

// ─────────────────────────────
// Subscribe
// ─────────────────────────────
export async function subscribe(
  userId,
  {
    subscriptionPlan,
    paymentId,
    transactionId,
    paymentProvider,
    paymentNumber,
    amount,
  },
) {
  if (
    !userId ||
    !subscriptionPlan ||
    !paymentId?.trim() ||
    !transactionId?.trim() ||
    !paymentProvider?.trim() ||
    !paymentNumber?.trim() ||
    !amount
  ) {
    throw new Error("All subscription fields are required");
  }

  const user = await UserModel.findById(userId);
  if (!user) throw new Error("User not found");

  const now = new Date();
  let expectedAmount = 0;

  // Define expected amount per plan
  const planAmounts = {
    monthly: 150,
    quarterly: 260,
    semiannual: 450,
    yearly: 520,
  };

  expectedAmount = planAmounts[subscriptionPlan];
  if (!expectedAmount) throw new Error("Invalid subscription plan");

  // Check if amount is correct
  if (amount !== expectedAmount) {
    throw new Error(
      `Incorrect amount. Expected ${expectedAmount} for ${subscriptionPlan} plan.`,
    );
  }

  // Calculate subscription expiration
  const { unit, value } = calculateSubscriptionDuration(subscriptionPlan);
  const subscriptionExpiresAt = new Date(now);
  if (unit === "month") subscriptionExpiresAt.setMonth(now.getMonth() + value);
  else if (unit === "year")
    subscriptionExpiresAt.setFullYear(now.getFullYear() + value);

  // Prepare update data
  const update = {
    subscriptionPlan,
    subscriptionExpiresAt,
    subscriptionStatus: "pending", // Admin will approve later
    paymentId: paymentId.trim(),
    transactionId: transactionId.trim(),
    paymentProvider: paymentProvider.trim(),
    paymentNumber: paymentNumber.trim(),
    amount,
  };

  const updatedUser = await UserModel.findByIdAndUpdate(userId, update, {
    new: true,
    runValidators: true,
  });

  if (!updatedUser) throw new Error("Failed to update subscription");

  // Reward the referrer only for premium subscriptions if referralEnabled is true
  if (updatedUser.referredBy && subscriptionPlan !== "freeTrial") {
    const referrer = await UserModel.findById(updatedUser.referredBy);
    if (referrer && referrer.referralEnabled) {
      const basePoints = calculateReferralPoints(subscriptionPlan);
      const rewardPoints = Math.floor(basePoints * 0.15); // 15% commission
      referrer.points += rewardPoints;
      await referrer.save();
    }
  }

  return {
    message: "Subscription request submitted successfully",
    user: {
      id: updatedUser._id,
      subscriptionPlan: updatedUser.subscriptionPlan,
      subscriptionStatus: updatedUser.subscriptionStatus,
      subscriptionExpiresAt: updatedUser.subscriptionExpiresAt,
    },
  };
}

// ─────────────────────────────
// Approve Subscription
// ─────────────────────────────
export async function approveSubscription(userId) {
  if (!userId) throw new Error("User ID is required");

  const user = await UserModel.findById(userId);
  if (!user) throw new Error("User not found");

  if (user.subscriptionStatus !== "pending") {
    throw new Error("Subscription is not pending");
  }

  // Define subscription durations based on plan
  const planDurations = {
    trial: 3,
    monthly: 30,
    quarterly: 90,
    semiannual: 180,
    yearly: 365,
  };

  // Get the subscription plan from the user
  const subscriptionPlan = user.subscriptionPlan;
  if (!subscriptionPlan || !planDurations[subscriptionPlan]) {
    throw new Error("Invalid or unsupported subscription plan");
  }

  // Calculate expiration date based on plan
  const currentDate = new Date();
  const durationInDays = planDurations[subscriptionPlan];
  const subscriptionExpiresAt = new Date(currentDate);
  subscriptionExpiresAt.setDate(currentDate.getDate() + durationInDays);

  // Update user with subscription status, type, referral, and calculated expiration
  const updatedUser = await UserModel.findByIdAndUpdate(
    userId,
    {
      subscriptionStatus: "active",
      subscriptionType: "premium",
      referralEnabled: "true",
      subscriptionExpiresAt: subscriptionExpiresAt,
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!updatedUser) throw new Error("Failed to approve subscription");

  return {
    message: "Subscription approved successfully",
    user: {
      id: updatedUser._id,
      subscriptionPlan: updatedUser.subscriptionPlan,
      subscriptionStatus: updatedUser.subscriptionStatus,
      subscriptionType: updatedUser.subscriptionType,
      referralEnabled: updatedUser.referralEnabled,
      subscriptionExpiresAt: updatedUser.subscriptionExpiresAt,
    },
  };
}
