// src/controllers/adminAuth.controller.js
import * as adminAuthService from './adminAuth.service.js';

export async function login(req, res, next) {
  try {
    const { token, user } = await adminAuthService.adminLogin(req.body);
    res.status(200).json({
      message: 'Login successful',
      token,
      user,
    });
  } catch (e) {
    next(e); // Ensure error handler middleware is used
  }
}
