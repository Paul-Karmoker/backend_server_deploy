import jwt from 'jsonwebtoken';
import UserModel from "../model/user.model.js";

const { JWT_SECRET } = process.env;

export async function adminLogin({ email, password }) {
  const user = await UserModel.findOne({ email });
  if (!user || user.role !== 'admin' || user.isDeleted) {
    throw new Error('Invalid email or password');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new Error('Invalid email or password');
  }

  const token = jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '60d' }
  );

  return {
    token,
    user: {
      id: user._id,
      email: user.email,
      fullName: `${user.firstName} ${user.lastName}`,
      role: user.role,
      photo: user.photo,
    },
  };
}

export async function getDashboardData() {
  const now = new Date();
  const totalUsers     = await UserModel.countDocuments();
  const totalFreeTrial = await UserModel.countDocuments({ subscriptionType: 'freeTrial' });
  const totalPremium   = await UserModel.countDocuments({ subscriptionType: 'premium' });
  const totalActive    = await UserModel.countDocuments({
    $or: [
      { subscriptionType: 'freeTrial',    freeTrialExpiresAt: { $gt: now } },
      { subscriptionType: 'premium',      subscriptionExpiresAt: { $gt: now } }
    ]
  });
  const users = await UserModel.find().select('-password').lean();
  return { totalUsers, totalFreeTrial, totalPremium, totalActive, users };
}
