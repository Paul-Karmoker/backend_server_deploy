import * as resumeService from '../service/resume.Service.js';
import * as aiService from '../service/ai.Service.js';
import {AppError} from '../utils/errorHandler.js';


  export async function createResume(req, res, next) {
  try {
    const resume = await resumeService.createResume(req.body);
    res.status(201).json({ status: 'success', data: resume });
  } catch (error) {
    next(new AppError(error.message, 400));
  }
}

export async function getUserIdResume(req, res, next) {
  try {
    const resume = await resumeService.getResumeByUserId(req.params.id)
    if(!resume) return next(new AppError('Resume not found', 404));
  } catch (error) {
    
  next(new AppError(error.message, 400));
    
  }
}

  export async function getResume(req, res, next) {
    try {
      const resume = await resumeService.getResume(req.params.id);
      if (!resume) return next(new AppError('Resume not found', 404));
      res.json({ status: 'success', data: resume });
    } catch (error) {
      next(new AppError(error.message, 400));
    }
  }

  export async function updateResume(req, res, next) {
    try {
      const resume = await resumeService.updateResume(req.user._id, req.params.id, req.body);
      if (!resume) return next(new AppError('Resume not found', 404));
      res.json({ status: 'success', data: resume });
    } catch (error) {
      next(new AppError(error.message, 400));
    }
  }

  export async function deleteResume(req, res, next) {
    try {
      const resume = await resumeService.deleteResume(req.user._id, req.params.id);
      res.json({ status: 'success', data: resume });
    } catch (error) {
      next(new AppError(error.message, 400));
    }
  }

  export async function addWorkExperience(req, res, next) {
    try {
      const resume = await resumeService.addWorkExperience(req.params.id, req.body);
      res.json({ status: 'success', data: resume });
    } catch (error) {
      next(new AppError(error.message, 400));
    }
  }

  export async function deleteWorkExperience(req, res, next) {
    try {
      const resume = await resumeService.deleteWorkExperience( req.params.id, req.body.index);
      res.json({ status: 'success', data: resume });
    } catch (error) {
      next(new AppError(error.message, 400));
    }
  }

  export async function addEducation(req, res, next) {
    try {
      const resume = await resumeService.addEducation( req.params.id, req.body);
      res.json({ status: 'success', data: resume });
    } catch (error) {
      next(new AppError(error.message, 400));
    }
  }

  export async function deleteEducation(req, res, next) {
    try {
      const resume = await resumeService.deleteEducation( req.params.id, req.body.index);
      res.json({ status: 'success', data: resume });
    } catch (error) {
      next(new AppError(error.message, 400));
    }
  }

  export async function addReference(req, res, next) {
    try {
      const resume = await resumeService.addReference( req.params.id, req.body);
      res.json({ status: 'success', data: resume });
    } catch (error) {
      next(new AppError(error.message, 400));
    }
  }

  export async function deleteReference(req, res, next) {
    try {
      const resume = await resumeService.deleteReference( req.params.id, req.body.index);
      res.json({ status: 'success', data: resume });
    } catch (error) {
      next(new AppError(error.message, 400));
    }
  }

  export async function getJobDescriptionSuggestion(req, res, next) {
    try {
      const suggestions = await aiService.suggestJobDescription(req.body.workExp);
      res.json({ status: 'success', data: { suggestions } });
    } catch (error) {
      next(new AppError(error.message, 500));
    }
  }

  export async function getSkillsSuggestion(req, res, next) {
    try {
      const suggestions = await aiService.suggestSkills(req.body.workExperiences);
      res.json({ status: 'success', data: { suggestions } });
    } catch (error) {
      next(new AppError(error.message, 500));
    }
  }

  export async function getCareerObjectiveSuggestion(req, res, next) {
    try {
      const suggestion = await aiService.suggestCareerObjective(req.body);
      res.json({ status: 'success', data: { suggestion } });
    } catch (error) {
      next(new AppError(error.message, 500));
    }
  }

  export async function getCareerSummarySuggestion(req, res, next) {
    try {
      const suggestion = await aiService.suggestCareerSummary(req.body);
      res.json({ status: 'success', data: { suggestion } });
    } catch (error) {
      next(new AppError(error.message, 500));
    }
  }
