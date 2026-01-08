import Transaction from '../model/Teansaction.model.js';
import {
  getBkashToken,
  createBkashPayment,
  executeBkashPayment,
} from "../service/bkash.service.js";

import {
  getPlanAmount,
  activateSubscription,
} from '../service/subscription.service.js';

export async function startBkashPayment(req, res, next) {
  try {
    const { plan } = req.body;
    const amount = getPlanAmount(plan);
    if (!amount) throw new Error('Invalid subscription plan');

    const token = await getBkashToken();

    const payload = {
      mode: '0011',
      payerReference: req.user.email,
      callbackURL: `${process.env.CLIENT_URL}/bkash-success`,
      amount,
      currency: 'BDT',
      intent: 'sale',
      merchantInvoiceNumber: `INV-${Date.now()}`,
    };

    const response = await createBkashPayment(token, payload);

    await Transaction.create({
      user: req.user._id,
      provider: 'bkash',
      paymentID: response.paymentID,
      merchantInvoiceNumber: payload.merchantInvoiceNumber,
      plan,
      amount,
      payerReference: payload.payerReference,
    });

    res.json({
      bkashURL: response.bkashURL,
      paymentID: response.paymentID,
    });
  } catch (err) {
    next(err);
  }
}

export async function confirmBkashPayment(req, res, next) {
  try {
    const { paymentID, plan } = req.body;

    const transaction = await Transaction.findOne({ paymentID });
    if (!transaction) throw new Error('Transaction not found');

    const token = await getBkashToken();
    const data = await executeBkashPayment(token, paymentID);

    if (data.transactionStatus !== 'Completed') {
      transaction.status = 'failed';
      await transaction.save();
      throw new Error('Payment failed');
    }

    transaction.status = 'success';
    transaction.transactionId = data.trxID;
    transaction.executedAt = new Date();
    transaction.rawResponse = data;
    await transaction.save();

    await activateSubscription(req.user._id, plan, data.trxID, data.amount);

    res.json({
      message: 'Payment successful. Subscription activated.',
    });
  } catch (err) {
    next(err);
  }
}
