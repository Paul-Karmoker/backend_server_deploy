// src/services/admin.service.js
import UserModel from '../../client/auth/auth.model.js';

export async function getDashboardData() {
  const now = new Date();
  const totalUsers     = await UserModel.countDocuments();
  const totalFreeTrial = await UserModel.countDocuments({ subscriptionPlan: 'freeTrial' });
  const totalPremium   = await UserModel.countDocuments({ subscriptionPlan: 'premium' });
  const totalActive    = await UserModel.countDocuments({
    $or: [
      { subscriptionPlan: 'freeTrial',    freeTrialExpiresAt: { $gt: now } },
      { subscriptionPlan: 'premium',      subscriptionExpiresAt: { $gt: now } }
    ]
  });
  // Exclude password hashes
  const users = await UserModel.find().select('-password').lean();
  return { totalUsers, totalFreeTrial, totalPremium, totalActive, users };
}
