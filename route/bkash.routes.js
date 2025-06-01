import { Router } from 'express';
import * as payCtrl from '../controller/bkash.controller.js';

const router = Router();

// Step 1: Create payment & get checkout URL
router.post('/create',   payCtrl.createBkashPayment);

// Step 2: bKash will call this callback URL
router.get('/callback',   payCtrl.bkashCallback);

export default router;
