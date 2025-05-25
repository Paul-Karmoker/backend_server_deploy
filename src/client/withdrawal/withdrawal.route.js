import { Router } from 'express';
import * as ctrl from './withdrawal.controller.js';
import { protect } from '../auth/utils/auth.middleware.js';

const router = Router();

// POST /api/withdrawals
router.post('/', protect, ctrl.requestWithdrawal);

// GET /api/withdrawals
router.get('/', protect, ctrl.getUserWithdrawals);

export default router;
