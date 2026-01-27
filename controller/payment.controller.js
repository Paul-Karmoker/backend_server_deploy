import Transaction from "../model/Teansaction.model.js";
import {
  getBkashToken,
  createBkashPayment,
  executeBkashPayment,
} from "../service/bkash.service.js";

import {
  getPlanAmount,
  activateSubscription,
} from "../service/subscription.service.js";

/* ─────────────────────────────
   START bKASH PAYMENT
───────────────────────────── */
export async function startBkashPayment(req, res, next) {
  try {
    const { plan } = req.body;

    const amount = getPlanAmount(plan);
    if (!amount) throw new Error("Invalid subscription plan");

    const token = await getBkashToken();

    const payload = {
  mode: "0011",
  payerReference: req.user.email,
  callbackURL: `${process.env.CLIENT_URL}/bkash-success?source=bkash`,
  amount,
  currency: "BDT",
  intent: "sale",
  merchantInvoiceNumber: `INV-${Date.now()}`,
};

    const response = await createBkashPayment(token, payload);

    await Transaction.create({
      user: req.user._id,
      provider: "bkash",
      paymentID: response.paymentID,
      merchantInvoiceNumber: payload.merchantInvoiceNumber,
      plan,
      amount,
      payerReference: payload.payerReference,
      status: "created",
    });

    res.json({
      bkashURL: response.bkashURL,
      paymentID: response.paymentID,
    });
  } catch (err) {
    next(err);
  }
}

/* ─────────────────────────────
   CONFIRM bKASH PAYMENT
───────────────────────────── */
export async function confirmBkashPayment(req, res, next) {
  try {
    const { paymentID } = req.body;

    const transaction = await Transaction.findOne({ paymentID });
    if (!transaction) throw new Error("Transaction not found");

    // 🔐 Prevent double execution
    if (transaction.status === "success") {
      return res.json({
        message: "Payment already confirmed",
        subscription: {
          plan: transaction.plan,
        },
      });
    }

    const token = await getBkashToken();
    const data = await executeBkashPayment(token, paymentID);

    if (data.transactionStatus !== "Completed") {
      transaction.status = "failed";
      await transaction.save();
      throw new Error("Payment failed");
    }

    // ✅ Update transaction
    transaction.status = "success";
    transaction.transactionId = data.trxID;
    transaction.executedAt = new Date();
    transaction.rawResponse = data;
    await transaction.save();

    // ✅ AUTO SUBSCRIPTION ACTIVATION
    const user = await activateSubscription(
      transaction.user,
      transaction.plan,           // 🔥 plan from DB, NOT body
      data.trxID,
      Number(data.amount)
    );

    res.json({
      message: "Payment successful. Subscription activated.",
      subscription: {
        plan: user.subscriptionPlan,
        status: user.subscriptionStatus,
        expiresAt: user.subscriptionExpiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
}
