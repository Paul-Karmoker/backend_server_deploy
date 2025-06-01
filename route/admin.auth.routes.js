// src/routes/adminAuth.route.js
import { Router } from 'express';
import * as adminAuthCtrl from '../controller/admin.controller.js';
import * as ctrl from '../controller/admin.withdraw.controller.js';
import { protect, authorizeRoles } from '../utils/auth.middleware.js';

const router = Router();

router.post('/login', adminAuthCtrl.login);
router.get('/dashboard',protect,
    authorizeRoles('admin'), adminAuthCtrl.getDashboard);
  
  // GET    /api/admin/withdrawals
  router.get('/withdrawalslist', protect, authorizeRoles('admin'), ctrl.listWithdrawals);
  
  // PATCH  /api/admin/withdrawals/:id/approve
  router.patch('/withdrawals/:id/approve', protect, authorizeRoles('admin'), ctrl.approveWithdrawal);
  
  // PATCH  /api/admin/withdrawals/:id/reject
  router.patch('/withdrawals/:id/reject', protect, authorizeRoles('admin'), ctrl.rejectWithdrawal);
  router.patch('/:id/approve-subscription', protect, authorizeRoles('admin'), ctrl.approveSubscription);
  router.get('/pendingpay', protect, authorizeRoles('admin'), ctrl.getpending);
  router.get('/allapprovedpay', protect, authorizeRoles('admin'), ctrl.allApproved);

export default router;
