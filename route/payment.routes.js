import express from 'express';
import {
  startBkashPayment,
  confirmBkashPayment,
} from '../controller/payment.controller.js';

import {authorizeRoles, protect} from '../utils/auth.middleware.js';

const router = express.Router();

router.post('/bkash/start', protect, authorizeRoles('user'), startBkashPayment);
router.post('/bkash/confirm', protect, authorizeRoles('user'), confirmBkashPayment);

export default router;
