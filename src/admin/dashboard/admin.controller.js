// src/controllers/admin.controller.js
import * as adminService from './admin.service.js';

export async function getDashboard(req, res, next) {
  try {
    const data = await adminService.getDashboardData();
    res.json(data);
  } catch (e) {
    next(e);
  }
}
