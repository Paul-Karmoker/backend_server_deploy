import dayjs from "dayjs";
import User from "../model/user.model.js";

/* ─────────────────────────────
   PLAN AMOUNT MAP
───────────────────────────── */
const PLAN_AMOUNTS = {
  monthly: 89,
  quarterly: 199,
  semiannual: 399,
  yearly: 599,
};

/* ─────────────────────────────
   GET PLAN AMOUNT
───────────────────────────── */
export function getPlanAmount(plan) {
  return PLAN_AMOUNTS[plan] || null;
}

/* ─────────────────────────────
   ACTIVATE SUBSCRIPTION (AUTO)
───────────────────────────── */
export async function activateSubscription(
  userId,
  plan,
  transactionId,
  amount
) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const expectedAmount = getPlanAmount(plan);
  const paidAmount = Number(amount); // 🔥 FIX

  if (!expectedAmount || expectedAmount !== paidAmount) {
    throw new Error("Invalid subscription amount");
  }

  const planConfig = {
    monthly: { unit: "month", value: 1 },
    quarterly: { unit: "month", value: 3 },
    semiannual: { unit: "month", value: 6 },
    yearly: { unit: "year", value: 1 },
  };

  const config = planConfig[plan];
  if (!config) {
    throw new Error("Invalid subscription plan");
  }

  let expiresAt = dayjs();
  expiresAt =
    config.unit === "month"
      ? expiresAt.add(config.value, "month")
      : expiresAt.add(config.value, "year");

  // ✅ FORCE PREMIUM
  user.subscriptionType = "premium";
  user.subscriptionPlan = plan;
  user.subscriptionStatus = "active";
  user.subscriptionExpiresAt = expiresAt.toDate();

  // ❌ REMOVE TRIAL COMPLETELY
  user.freeTrialExpiresAt = undefined;

  user.transactionId = transactionId;
  user.amount = paidAmount; // 🔥 store number

  await user.save();
  return user;
}
