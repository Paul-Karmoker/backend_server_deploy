import express from "express";
import * as resumeController from "../controller/resume.Controller.js";
import { protect, authorizeRoles } from '../utils/auth.middleware.js';

const router = express.Router();

//router.use(authMiddleware); // Protect all routes

router.post('/', protect, authorizeRoles('user'), resumeController.createResume);
router.get('/:id',protect, authorizeRoles('user'), resumeController.getResume);
router.put('/:id', resumeController.updateResume);
router.delete('/:id', resumeController.deleteResume);

router.post('/:id/work-experience', resumeController.addWorkExperience);
router.delete('/:id/work-experience', resumeController.deleteWorkExperience);
router.post('/:id/education', resumeController.addEducation);
router.delete('/:id/education', resumeController.deleteEducation);
router.post('/:id/reference', resumeController.addReference);
router.delete('/:id/reference', resumeController.deleteReference);

router.post('/suggest/job-description',  resumeController.getJobDescriptionSuggestion);
router.post('/suggest/skills', resumeController.getSkillsSuggestion);
router.post('/suggest/career-objective', resumeController.getCareerObjectiveSuggestion);
router.post('/suggest/career-summary', resumeController.getCareerSummarySuggestion);

export default router;