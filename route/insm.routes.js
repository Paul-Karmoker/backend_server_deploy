import express from 'express';
import multer from 'multer';
import {
  generateQuestions,
  submitAnswer,
  completeInterview,
  downloadResults,
  saveHistory
} from '../controller/insm.controller.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/generate-questions', upload.single('document'), generateQuestions);
router.post('/submit-answer', submitAnswer);
router.post('/complete', completeInterview);
router.post('/download-results', downloadResults);
router.post('/save-history', saveHistory);

export default router;