import { generateQuestions } from '../model/qa.model.js';

// Input validation middleware
const validateInput = (req, res, next) => {
  const { jobDescription } = req.body;
  
  if (!jobDescription || typeof jobDescription !== 'string') {
    return res.status(400).json({ 
      message: 'Valid job description (string) is required',
      received: jobDescription
    });
  }
  
  if (jobDescription.length < 20) {
    return res.status(400).json({ 
      message: 'Job description must be at least 20 characters',
      length: jobDescription.length
    });
  }

  next();
  
};



export const generateQuestionsController = async (req, res) => {
  try {
    const { jobDescription, jobTitle, experienceLevel, requirements } = req.body;

    const questions = await generateQuestions({
      jobDescription,
      jobTitle,
      experienceLevel,
      requirements: {
        technicalCount: 7,
        situationalCount: 3,
        ...requirements
      }
    });
    
    // Validate the response structure
    if (!questions || 
        !questions.technical || 
        !questions.situational ||
        questions.technical.length === 0 ||
        questions.situational.length === 0) {
      throw new Error('Invalid response structure from question generator');
    }
    
    // Success response
    return res.json({ 
      success: true,
      count: {
        technical: questions.technical.length,
        situational: questions.situational.length
      },
      questions
    });
    
  } catch (error) {
    console.error('Error in generateQuestionsController:', {
      error: error.message,
      stack: error.stack,
      requestBody: req.body
    });
    
    const statusCode = error.message.includes('Invalid') ? 422 : 500;
    
    return res.status(statusCode).json({ 
      success: false,
      message: error.message || 'Failed to generate questions',
      ...(process.env.NODE_ENV === 'development' && {
        errorDetails: {
          name: error.name,
          stack: error.stack
        }
      })
    });
  }
};


export const questionsController = {
  validateInput,
  generateQuestionsController
};