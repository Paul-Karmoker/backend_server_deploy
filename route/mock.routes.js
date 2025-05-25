import express from "express";
import multer from "multer";
import { extractText, generateQuestions, analyzeAnswers } from "../controller/mock.controller.js";

const router = express.Router();
const upload = multer({ dest: "../uploads/" });

// All routes now match what your frontend expects
router.post("/extract-text", upload.single("file"), extractText);
router.post("/generate-questions", generateQuestions);
router.post("/analyze-answers", analyzeAnswers);

export default router;