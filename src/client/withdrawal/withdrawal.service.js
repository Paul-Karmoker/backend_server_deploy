import Withdrawal from './withdrawal.model.js';
import User from '../auth/auth.model.js';

export async function requestWithdrawal(userId, { points, paymentProvider, paymentNumber }) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  if (points <= 0) throw new Error('Points must be positive');
  if (points > user.points) throw new Error('Insufficient points');
  const req = await Withdrawal.create({ user: userId, points, paymentProvider, paymentNumber });
  return req;
}

export async function getUserWithdrawals(userId) {
  return Withdrawal.find({ user: userId }).sort({ requestDate: -1 });
}
