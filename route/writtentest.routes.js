import { Router } from 'express';
import {
  initSession,
  startSession,
  getCurrent,
  submitAnswer,
  getResult,
  downloadPdf,
  timeLeft
} from '../controller/writtentest.controller.js';
import { validate, initSchema, answerSchema } from '../middlewares/validate.js';
import { protect, authorizeRoles } from '../utils/auth.middleware.js';
const router = Router();

// Step 1: User submits JD + details; system prepares 5 questions (status=pending)
router.post(
  "/init",
  protect,
  authorizeRoles("user"),
  validate(initSchema),
  initSession
);

// Step 2: “Are you ready?” → start (timer begins; status=active)
router.post('/start/:sessionId', protect, startSession);

// Step 3: Fetch current question (server enforces time & sequence)
router.get('/current/:sessionId', protect, getCurrent);

// Step 4: Submit answer for current question (AI grades; auto-advance)
router.post('/answer', protect, validate(answerSchema), submitAnswer);

// Step 5: Get final/anytime result summary
router.get('/result/:sessionId', protect, getResult);

// Time left endpoint (for countdown UI)
router.get('/time/:sessionId', protect, timeLeft);

// Download PDF report
router.get('/result/:sessionId/pdf', protect, downloadPdf);

export default router;
