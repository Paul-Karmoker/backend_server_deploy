import * as svc from './adminWithdrawal.service.js';
import *as asvc from "../../client/auth/auth.service.js"

export async function listWithdrawals(req, res, next) {
  try {
    const list = await svc.listWithdrawals();
    res.json({ withdrawals: list });
  } catch (e) {
    next(e);
  }
}

export async function approveWithdrawal(req, res, next) {
  try {
    const w = await svc.approveWithdrawal(req.params.id, req.user._id);
    res.json({ withdrawal: w });
  } catch (e) {
    next(e);
  }
}

export async function rejectWithdrawal(req, res, next) {
  try {
    const w = await svc.rejectWithdrawal(req.params.id, req.user._id);
    res.json({ withdrawal: w });
  } catch (e) {
    next(e);
  }
}

export async function approveSubscription(req, res, next) {
  try {
    const userId = req.params.id;
    const updatedUser = await asvc.approveSubscription(userId);
    res.json({ user: updatedUser });
  } catch (e) {
    next(e);
  }
}

export async function getpending(req,res, next) {
  try {
    const list = await svc.PendingdpaymentList();
    res.json({ withdrawals: list });
  } catch (error) {
    next(error);
  }
}

export async function allApproved(req, res, next) {
  try {
    const list = await svc.approvedpaymentList();
    res.json({ withdrawals: list });
  } catch (e) {
    next(e);
  }
  
}