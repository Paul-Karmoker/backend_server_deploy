import * as authService from './auth.service.js';

import {
  forgotPassword as forgotPasswordSvc,
  resetPassword   as resetPasswordSvc,
  // … other exports like signUp, login, etc.
} from './auth.service.js';

export async function signUp(req, res, next) {
  try {
    const result = await authService.signUp(req.body);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
}

export async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  } catch (e) {
    next(e);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    await forgotPasswordSvc(req.body.email);
    res.json({ message: 'Password reset link sent to your email' });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;
    await resetPasswordSvc(token, newPassword);
    res.json({ message: 'Password has been reset' });
  } catch (err) {
    next(err);
  }
}


export async function changePassword(req, res, next) {
  try {
    const { oldPassword, newPassword } = req.body;
    const result = await authService.changePassword(
      req.user._id,
      oldPassword,
      newPassword
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}


export async function verifyEmail(req, res, next) {
  try {
    await authService.verifyEmail(req.query.token);
    res.json({ message: 'Email verified! You can now log in.' });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const updatedUser = await authService.updateProfile(req.user._id, req.body);
    res.json({ user: updatedUser });
  } catch (err) {
    next(err);
  }
}

export async function subscribe(req, res, next) {
  try {
    const updatedUser = await authService.Subscribe(req.user._id, req.body);
    res.json({ user: updatedUser });
  } catch (err) {
    next(err);
  }
} 


