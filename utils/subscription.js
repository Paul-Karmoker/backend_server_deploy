export const calculateReferralPoints = (plan) => {
  const planPoints = {
    monthly: 150,
    quarterly: 260,
    semiannual: 450,
    yearly: 520,
  };
  return planPoints[plan] || 0;
};

export const calculateSubscriptionDuration = (plan) => {
  const planDurations = {
    monthly: { unit: 'month', value: 1 },
    quarterly: { unit: 'month', value: 3 },
    semiannual: { unit: 'month', value: 6 },
    yearly: { unit: 'year', value: 1 },
  };
  return planDurations[plan] || { unit: 'month', value: 1 };
};
