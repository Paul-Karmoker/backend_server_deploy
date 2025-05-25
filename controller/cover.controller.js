import { getResponse } from "../model/cover.model.js"; // Import named export
import { generateCoverLetterDocx } from "../utils/docxGenerator.js";

export const generateCoverLetter = async (req, res) => {
  const { jobDescription, resumeText, style = "European" } = req.body;
  
  const coverLetter = await getResponse( // Use the imported function directly
    jobDescription, 
    resumeText, 
    style
  );

  res.json({ coverLetter });
};

export const generateDocx = async (req, res) => {
  const { content } = req.body;
  const docxBuffer = await generateCoverLetterDocx(content);
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.send(docxBuffer);
};

// Export as named exports
export default {
  generateCoverLetter,
  generateDocx
};