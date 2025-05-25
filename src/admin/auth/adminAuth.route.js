// src/routes/adminAuth.route.js
import { Router } from 'express';
import * as adminAuthCtrl from './adminAuth.controller.js';

const router = Router();

router.post('/login', adminAuthCtrl.login);

export default router;
