import express from 'express';
import { generateQuestionsController } from '../controller/qa.controller.js';

const router = express.Router();

router.post('/generate', generateQuestionsController);

export default router;