// src/routes/admin.route.js
import { Router } from 'express';
import * as adminCtrl        from './admin.controller.js';
import {  protect, authorizeRoles } from '../../client/auth/utils/auth.middleware.js';

const router = Router();

router.get(
  '/',
  protect,
  authorizeRoles('admin'),
  adminCtrl.getDashboard
);

export default router;
