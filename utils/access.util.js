export function getAccessLevel(user) {
  const now = new Date();

  // PREMIUM ACTIVE
  if (
    user.subscriptionType === "premium" &&
    user.subscriptionStatus === "active" &&
    user.subscriptionExpiresAt &&
    user.subscriptionExpiresAt > now
  ) {
    return "FULL";
  }

  // FREE TRIAL ACTIVE
  if (
    user.subscriptionType === "freeTrial" &&
    user.freeTrialExpiresAt &&
    user.freeTrialExpiresAt > now
  ) {
    return "FULL";
  }

  // TRIAL EXPIRED OR FREE USER
  return "LIMITED";
}
