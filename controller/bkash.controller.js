import * as bkashSvc from '../service/bkash.service.js';

export async function createBkashPayment(req, res, next) {
  try {
    const resp = await bkashSvc.createPayment(req.body);
    res.json(resp);
  } catch (err) {
    next(err);
  }
}

export async function bkashCallback(req, res, next) {
  try {
    const { paymentID, status } = req.query;
    const result = await bkashSvc.handleCallback({ paymentID, status });
    if (result.success) {
      return res.redirect(
        `${process.env.CLIENT_URL}/payment/success?token=${result.token}`
      );
    } else {
      return res.redirect(
        `${process.env.CLIENT_URL}/payment/failure?message=${encodeURIComponent(result.message)}`
      );
    }
  } catch (err) {
    next(err);
  }
}
