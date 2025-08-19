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

const router = Router();

// Step 1: User submits JD + details; system prepares 5 questions (status=pending)
router.post('/init', validate(initSchema), initSession);

// Step 2: “Are you ready?” → start (timer begins; status=active)
router.post('/start/:sessionId', startSession);

// Step 3: Fetch current question (server enforces time & sequence)
router.get('/current/:sessionId', getCurrent);

// Step 4: Submit answer for current question (AI grades; auto-advance)
router.post('/answer', validate(answerSchema), submitAnswer);

// Step 5: Get final/anytime result summary
router.get('/result/:sessionId', getResult);

// Time left endpoint (for countdown UI)
router.get('/time/:sessionId', timeLeft);

// Download PDF report
router.get('/result/:sessionId/pdf', downloadPdf);

export default router;
