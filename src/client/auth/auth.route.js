// src/routes/user.router.js
import { Router } from 'express';
import * as authCtrl from './auth.controller.js';
import { protect } from './utils/auth.middleware.js';

const router = Router();

// Public routes
router.post('/signup',           authCtrl.signUp);
router.post('/login',            authCtrl.login);
router.post('/forgot-password',  authCtrl.forgotPassword);
router.post('/reset-password',   authCtrl.resetPassword);
router.get ('/verify-email',     authCtrl.verifyEmail);

// Protected routes
router.patch('/profile',         protect, authCtrl.updateProfile);
router.patch('/change-password', protect, authCtrl.changePassword);
router.post('/subcribe',         protect, authCtrl.subscribe);

export default router;
