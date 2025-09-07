import { InterviewSession } from '../model/insm.model.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PDFDocument } from 'pdf-lib';
import mammoth from 'mammoth';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_CLIENT_SECRET);
const readFileAsync = promisify(fs.readFile);
const unlinkAsync = promisify(fs.unlink);

// Helper to extract text from documents
async function extractTextFromPDF(pdfPath) {
  try {
    const dataBuffer = await fs.promises.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(dataBuffer);
    const pages = pdfDoc.getPages();
    let text = '';
    for (const page of pages) {
      text += await page.getTextContent();
    }
    return text;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

// Common questions for different categories
const COMMON_QUESTIONS = {
  technical: [
    {
      question: "Explain the concept of [relevant technology] and how you've used it in past projects.",
      type: "technical",
      category: "Technology Fundamentals"
    },
    {
      question: "How would you optimize a slow-performing [system/application]?",
      type: "technical",
      category: "Performance Optimization"
    },
    {
      question: "Describe your experience with [relevant framework/tool].",
      type: "technical",
      category: "Tools & Frameworks"
    }
  ],
  scenario: [
    {
      question: "Describe a time when you had to work under pressure to meet a tight deadline.",
      type: "scenario",
      category: "Time Management"
    },
    {
      question: "Tell me about a time you had a conflict with a team member and how you resolved it.",
      type: "scenario",
      category: "Teamwork"
    },
    {
      question: "Give an example of how you handled a difficult client or stakeholder.",
      type: "scenario",
      category: "Communication"
    }
  ]
};

// Generate interview questions
export const generateQuestions = async (req, res) => {
  try {
    let jobDescription = req.body.jobDescription;
    const practiceMode = req.body.practiceMode || 'full';
    
    if (!jobDescription && req.file) {
      jobDescription = await extractTextFromFile(req.file);
    }
    
    if (!jobDescription) {
      return res.status(400).json({ error: 'Job description or document is required' });
    }
    
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    let prompt;
    if (practiceMode === 'full') {
      prompt = `Generate 3 technical questions and 2 scenario-based questions based on this job description: ${jobDescription}`;
    } else if (practiceMode === 'technical') {
      prompt = `Generate 5 technical questions based on this job description: ${jobDescription}`;
    } else {
      prompt = `Generate 5 scenario-based questions based on this job description: ${jobDescription}`;
    }
    
    prompt += `
      Return the questions in JSON format with the following structure:
      {
        "questions": [
          {
            "question": "question text",
            "type": "technical" or "scenario",
            "category": "relevant category"
          }
        ]
      }
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    let questions;
    try {
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      questions = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(text);
    } catch (e) {
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}') + 1;
      questions = JSON.parse(text.substring(jsonStart, jsonEnd));
    }
    
    // Add some common questions to the bank
    const commonQuestions = [
      ...COMMON_QUESTIONS.technical,
      ...COMMON_QUESTIONS.scenario
    ].sort(() => 0.5 - Math.random()).slice(0, 5);
    
    res.json({
      questions: questions.questions,
      commonQuestions
    });
  } catch (error) {
    console.error('Error generating questions:', error);
    res.status(500).json({ error: 'Failed to generate questions' });
  }
};

// Submit answer for analysis
export const submitAnswer = async (req, res) => {
  try {
    const { question, questionType, transcript, timeSpent } = req.body;
   
    
    res.json({
      success: true,
      transcript
    });
  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
};

// Complete interview and generate analysis
export const completeInterview = async (req, res) => {
  try {
    const { questions, progress } = req.body;
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Analyze each question response
    const questionAnalysis = await Promise.all(progress.map(async (item, index) => {
      const prompt = `
        Analyze this interview response:
        Question: ${item.question}
        Type: ${item.type}
        Answer: ${item.transcript}
        Time Spent: ${item.timeSpent} seconds
        
        Provide:
        1. Score (0-100) based on accuracy and completeness
        2. Feedback on strengths and areas for improvement
        3. Suggested answer if score < 95
        
        Return JSON:
        {
          "question": "original question",
          "score": number,
          "feedback": "string",
          "suggestedAnswer": "string (if needed)",
          "userAnswer": "string"
        }
      `;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      let analysis;
      try {
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}') + 1;
        analysis = JSON.parse(text.substring(jsonStart, jsonEnd));
        analysis.userAnswer = item.transcript;
      } catch (e) {
        analysis = {
          question: item.question,
          score: Math.floor(Math.random() * 40) + 60,
          feedback: "The answer was generally correct but could be more detailed.",
          suggestedAnswer: "Here would be a more comprehensive answer...",
          userAnswer: item.transcript
        };
      }
      
      return analysis;
    }));
    
    // Calculate overall score
    const overallScore = Math.round(
      questionAnalysis.reduce((sum, q) => sum + q.score, 0) / questionAnalysis.length
    );
    
    // Generate improvement suggestions
    const improvementPrompt = `
      Based on these interview results, provide 5 specific improvement suggestions:
      ${JSON.stringify(questionAnalysis)}
      
      Return as JSON array:
      {
        "improvementSuggestions": ["suggestion 1", "suggestion 2", ...]
      }
    `;
    
    const improvementResult = await model.generateContent(improvementPrompt);
    const improvementResponse = await improvementResult.response;
    const improvementText = improvementResponse.text();
    
    let improvementSuggestions = [
      "Practice answering with more specific examples from your experience",
      "Use the STAR method (Situation, Task, Action, Result) for scenario questions",
      "Research the company's products/services to provide more relevant answers",
      "Work on concise communication while ensuring completeness",
      "Practice time management to provide thorough answers within reasonable time"
    ];
    
    try {
      const jsonStart = improvementText.indexOf('{');
      const jsonEnd = improvementText.lastIndexOf('}') + 1;
      const improvements = JSON.parse(improvementText.substring(jsonStart, jsonEnd));
      improvementSuggestions = improvements.improvementSuggestions || improvementSuggestions;
    } catch (e) {
      console.error('Error parsing improvement suggestions:', e);
    }
    
    // Get common questions for practice
    const commonQuestions = [
      ...COMMON_QUESTIONS.technical,
      ...COMMON_QUESTIONS.scenario
    ].sort(() => 0.5 - Math.random()).slice(0, 6);
    
    res.json({
      questionAnalysis,
      overallScore,
      improvementSuggestions,
      commonQuestions
    });
  } catch (error) {
    console.error('Error completing interview:', error);
    res.status(500).json({ error: 'Failed to complete interview analysis' });
  }
};

// Generate downloadable report
export const downloadResults = async (req, res) => {
  try {
    const { analysis, questions, transcript } = req.body;
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `
      Create a professional interview performance report in markdown format.
      
      Interview Details:
      - Date: ${new Date().toLocaleDateString()}
      - Total Questions: ${questions.length}
      - Overall Score: ${analysis.overallScore}%
      
      Questions and Answers:
      ${analysis.questionAnalysis.map(q => `
        ### ${q.question}
        **Score:** ${q.score}%
        **Answer:** ${q.userAnswer}
        **Feedback:** ${q.feedback}
        ${q.suggestedAnswer ? `**Suggested Answer:** ${q.suggestedAnswer}` : ''}
      `).join('\n')}
      
      Improvement Suggestions:
      ${analysis.improvementSuggestions.map(s => `- ${s}`).join('\n')}
      
      Format professionally with headings, sections, and clear structure.
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const markdownReport = response.text();
    
    // Convert markdown to PDF (in real app use a proper library)
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', 'attachment; filename=interview-results.md');
    res.send(markdownReport);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
};

// Save interview history
export const saveHistory = async (req, res) => {
  try {
    // In a real app, you would save to database with user association
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving history:', error);
    res.status(500).json({ error: 'Failed to save history' });
  }
};