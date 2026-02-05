export function getAccessLevel(user) {
  const now = new Date();

  // PREMIUM ACTIVE
  if (
    user.subscriptionType === "premium" &&
    user.subscriptionStatus === "active" &&
    user.subscriptionExpiresAt &&
    new Date(user.subscriptionExpiresAt) > now
  ) {
    return "FULL";
  }

  // FREE TRIAL ACTIVE (first 3 days)
  if (
    user.subscriptionType === "freeTrial" &&
    user.freeTrialExpiresAt &&
    new Date(user.freeTrialExpiresAt) > now
  ) {
    return "FULL";
  }

  // TRIAL EXPIRED OR FREE USER
  return "LIMITED";
}
