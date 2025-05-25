import Withdrawal from '../../client/withdrawal/withdrawal.model.js';
import User from '../../client/auth/auth.model.js';

export async function listWithdrawals() {
  return Withdrawal.find()
    .populate('user','firstName lastName email points')
    .sort({ requestDate: -1 });
}

export async function approveWithdrawal(withdrawalId, adminId) {
  const w = await Withdrawal.findById(withdrawalId);
  if (!w) throw new Error('Request not found');
  if (w.status !== 'pending') throw new Error('Already processed');
  const user = await User.findById(w.user);
  if (!user) throw new Error('User not found');
  if (user.points < w.points) throw new Error('User has insufficient points');
  user.points -= w.points;
  await user.save();
  w.status = 'approved';
  w.processedDate = new Date();
  w.admin = adminId;
  await w.save();
  return w;
}

export async function rejectWithdrawal(withdrawalId, adminId) {
  const w = await Withdrawal.findById(withdrawalId);
  if (!w) throw new Error('Request not found');
  if (w.status !== 'pending') throw new Error('Already processed');
  w.status = 'rejected';
  w.processedDate = new Date();
  w.admin = adminId;
  await w.save();
  return w;
}

export async function PendingdpaymentList(userId) {
  return User.find({ user: userId, subscriptionStatus: 'pending' });
}

export async function approvedpaymentList(userId) {
  return User.find({ user: userId,subscriptionStatus: 'active' });
}

