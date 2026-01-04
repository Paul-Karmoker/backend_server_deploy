import express from "express";
import * as resumeController from "../controller/resume.Controller.js";
import { protect, authorizeRoles } from '../utils/auth.middleware.js';

const router = express.Router();

router.post('/', protect, authorizeRoles('user'), resumeController.createResume);
router.get('/:userId', protect, resumeController.getUserIdResume)
router.get('/:id',protect, authorizeRoles('user'), resumeController.getResume);
router.put('/:id', resumeController.updateResume);
router.delete('/:id', resumeController.deleteResume);

router.post('/:id/work-experience', protect, authorizeRoles('user'), resumeController.addWorkExperience);
router.delete('/:id/work-experience', protect, authorizeRoles('user'), resumeController.deleteWorkExperience);
router.post('/:id/education', protect, authorizeRoles('user'), resumeController.addEducation);
router.delete('/:id/education', protect, authorizeRoles('user'), resumeController.deleteEducation);
router.post('/:id/reference', protect, authorizeRoles('user'), resumeController.addReference);
router.delete('/:id/reference', protect, authorizeRoles('user'), resumeController.deleteReference);

router.post('/suggest/job-description', protect, authorizeRoles('user'),  resumeController.getJobDescriptionSuggestion);
router.post('/suggest/skills', protect, authorizeRoles('user'), resumeController.getSkillsSuggestion);
router.post('/suggest/career-objective', protect, authorizeRoles('user'), resumeController.getCareerObjectiveSuggestion);
router.post('/suggest/career-summary', protect, authorizeRoles('user'), resumeController.getCareerSummarySuggestion);

export default router;