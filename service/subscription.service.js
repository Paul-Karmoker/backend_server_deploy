import dayjs from 'dayjs';
import User from '../model/user.model.js';

const PLAN_PRICE = {
  monthly: 150,
  quarterly: 260,
  semiannual: 450,
  yearly: 520,
};

const PLAN_DURATION = {
  monthly: { unit: 'month', value: 1 },
  quarterly: { unit: 'month', value: 3 },
  semiannual: { unit: 'month', value: 6 },
  yearly: { unit: 'year', value: 1 },
};


export function getPlanAmount(plan) {
  return PLAN_PRICE[plan];
}

export async function activateSubscription(userId, plan, trxID, amount) {
  const duration = PLAN_DURATION[plan];
  const expiresAt = dayjs().add(duration.value, duration.unit).toDate();

  await User.findByIdAndUpdate(userId, {
    subscriptionType: 'premium',
    subscriptionPlan: plan,
    subscriptionStatus: 'active',
    subscriptionExpiresAt: expiresAt,
    referralEnabled: true,
  });
}
