import express from "express";
import { getResponse } from "../controller/ai.controller.js"; // Adjust the import path as needed

const router = express.Router();

router.post("/get-review", getResponse); // may be aiController.getResponse need to change with

export default router; // Use ES Modules export