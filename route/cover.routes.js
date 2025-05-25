import express from "express";
import coverController from "../controller/cover.controller.js";

const router = express.Router();

router.post("/generate-cover-letter", coverController.generateCoverLetter);
router.post("/generate-docx", coverController.generateDocx);

export default router;