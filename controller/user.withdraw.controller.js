import * as svc from '../service/userwithdraw.service.js';

export async function requestWithdrawal(req, res, next) {
  try {
    const w = await svc.requestWithdrawal(req.user._id, req.body);
    res.status(201).json({ withdrawal: w });
  } catch (e) {
    next(e);
  }
}

export async function getUserWithdrawals(req, res, next) {
  try {
    const list = await svc.getUserWithdrawals(req.user._id);
    res.json({ withdrawals: list });
  } catch (e) {
    next(e);
  }
}
