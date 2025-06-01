
import * as adminAuthService from '../service/adminAuth.service.js';

export async function login(req, res, next) {
  try {
    const { token, user } = await adminAuthService.adminLogin(req.body);
    res.status(200).json({
      message: 'Login successful',
      token,
      user,
    });
  } catch (e) {
    next(e);
  }
}


export async function getDashboard(req, res, next) {
  try {
    const data = await adminAuthService.getDashboardData();
    res.json(data);
  } catch (e) {
    next(e);
  }
}