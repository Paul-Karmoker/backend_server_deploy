import { Router } from 'express';
import * as ctrl from './adminWithdrawal.controller.js';
import { protect, authorizeRoles } from '../../client/auth/utils/auth.middleware.js';

const router = Router();

// GET    /api/admin/withdrawals
router.get('/', protect, authorizeRoles('admin'), ctrl.listWithdrawals);

// PATCH  /api/admin/withdrawals/:id/approve
router.patch('/:id/approve', protect, authorizeRoles('admin'), ctrl.approveWithdrawal);

// PATCH  /api/admin/withdrawals/:id/reject
router.patch('/:id/reject', protect, authorizeRoles('admin'), ctrl.rejectWithdrawal);
router.patch('/:id/approve-subscription', protect, authorizeRoles('admin'), ctrl.approveSubscription);
router.get('/pendingpay', protect, authorizeRoles('admin'), ctrl.getpending);
router.get('/allapprovedpay', protect, authorizeRoles('admin'), ctrl.allApproved);

export default router;
