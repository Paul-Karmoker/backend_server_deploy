import Content from '../model/doc.model.js';
import docService from '../service/doc.service.js';
import { promisify } from 'util';
import { Readable } from 'stream';

export const generateContent = async (req, res) => {
  try {
    const { 
      sourceText, 
      contentType = 'blog', 
      tone = 'professional',
      wordCount = 0,
      pageCount = 0,
      includeCharts = true,
      includeImages = true,
      documentType = 'report', 
      style = 'professional' 
    } = req.body;
    
    // Use file content if available
    const contentToProcess = req.file ? 
      (await extractFileContent(req.file)) : 
      (typeof sourceText === 'string' ? sourceText : JSON.stringify(sourceText));
    
    if (!contentToProcess) {
      return res.status(400).json({ 
        success: false,
        error: 'No source text or file content provided' 
      });
    }

    // Generate enhanced content using the service layer
    const enhanced = await docService.enhanceContentWithAI(
      contentToProcess,
      documentType || contentType,
      style || tone
    );

    // Convert to HTML for preview
    const htmlContent = convertToHtml(enhanced);
    
    // Save to database if user is authenticated
    if (req.user) {
      await Content.create({
        userId: req.user._id,
        sourceText: contentToProcess,
        generatedContent: enhanced,
        documentType: documentType || contentType,
        style: style || tone,
        metadata: {
          ...enhanced.metadata,
          wordCount,
          pageCount,
          includeCharts,
          includeImages
        }
      });
    }

    res.json({ 
      success: true,
      content: enhanced,
      htmlPreview: htmlContent,
      metadata: {
        ...enhanced.metadata,
        wordCount,
        pageCount,
        includeCharts,
        includeImages
      }
    });
  } catch (error) {
    console.error('Error in content generation:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Content generation failed',
      fallbackContent: {
        title: req.body.documentType || 'Report',
        subtitle: '',
        sections: [{
          title: 'Content',
          content: req.body.sourceText || '',
          type: 'text'
        }],
        metadata: {
          recommendations: [],
          references: [],
          wordCount: 0,
          complexity: 'basic'
        }
      }
    });
  }
};

// Helper function to extract content from different file types
async function extractFileContent(file) {
  try {
    if (!file || !file.buffer) {
      throw new Error('Invalid file object');
    }

    if (file.mimetype === 'application/pdf') {
      return await docService.extractTextFromPdf(file.buffer);
    } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return await docService.extractTextFromDocx(file.buffer);
    } else if (
      file.mimetype === 'application/vnd.ms-excel' || 
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      return await docService.extractTextFromExcel(file.buffer);
    } else if (file.mimetype === 'text/plain') {
      return file.buffer.toString();
    }
    throw new Error('Unsupported file type');
  } catch (error) {
    console.error('Error extracting file content:', error);
    throw new Error('Failed to extract content from file');
  }
}

// Helper function to convert enhanced content to HTML
function convertToHtml(enhancedData) {
  if (!enhancedData || typeof enhancedData !== 'object') {
    return '<div class="document-container"><p>No content available</p></div>';
  }

  let html = `<div class="document-container">`;
  
  // Add title
  html += `<h1 class="document-title">${enhancedData.title || 'Generated Document'}</h1>`;
  
  // Add subtitle if exists
  if (enhancedData.subtitle) {
    html += `<h2 class="document-subtitle">${enhancedData.subtitle}</h2>`;
  }
  
  // Process each section
  if (Array.isArray(enhancedData.sections)) {
    enhancedData.sections.forEach(section => {
      if (!section) return;
      
      html += `<section class="document-section ${section.type || ''}">`;
      
      // Section title
      if (section.title) {
        const headingLevel = section.style === 'heading1' ? 'h2' : 
                          section.style === 'heading2' ? 'h3' : 'h4';
        html += `<${headingLevel} class="section-title">${section.title}</${headingLevel}>`;
      }
      
      // Section content
      if (section.content) {
        const content = typeof section.content === 'string' ? section.content : JSON.stringify(section.content);
        html += `<div class="section-content">${content.replace(/\n/g, '<br>')}</div>`;
      }
      
      // Bullet points
      if (Array.isArray(section.bullets)) {
        html += '<ul class="section-bullets">';
        section.bullets.forEach(bullet => {
          if (bullet) {
            html += `<li>${typeof bullet === 'string' ? bullet : JSON.stringify(bullet)}</li>`;
          }
        });
        html += '</ul>';
      }
      
      // Charts placeholders
      if (Array.isArray(section.charts)) {
        html += '<div class="section-charts">';
        section.charts.forEach(chart => {
          if (chart) {
            html += `<div class="chart-placeholder">[CHART: ${typeof chart === 'string' ? chart : JSON.stringify(chart)}]</div>`;
          }
        });
        html += '</div>';
      }
      
      // Callouts
      if (Array.isArray(section.callouts)) {
        html += '<div class="section-callouts">';
        section.callouts.forEach(callout => {
          if (callout) {
            html += `<div class="callout-box">${typeof callout === 'string' ? callout : JSON.stringify(callout)}</div>`;
          }
        });
        html += '</div>';
      }
      
      html += '</section>';
    });
  }
  
  html += '</div>';
  return html;
}

export const generateDocx = async (req, res) => {
  try {
    const { 
      content, 
      documentType = 'report', 
      style = 'professional',
      wordCount = 0,
      pageCount = 0,
      includeCharts = true,
      includeImages = true
    } = req.body;
    
    const fileContent = req.file ? 
      (await extractFileContent(req.file)) : 
      (typeof content === 'string' ? content : JSON.stringify(content));
    
    if (!fileContent) {
      return res.status(400).json({ 
        success: false,
        error: 'No content provided' 
      });
    }

    // Generate DOCX using the service layer with all options
    const docxBuffer = await docService.convertHtmlToDocx(
      fileContent,
      documentType,
      style
    );
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename=generated-content.docx');
    res.send(docxBuffer);
  } catch (error) {
    console.error('Error in DOCX generation:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'DOCX generation failed' 
    });
  }
};

export const getContentHistory = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }

    const contents = await Content.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .select('-__v');

    res.json({ 
      success: true,
      data: contents 
    });
  } catch (error) {
    console.error('Error fetching content history:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to fetch content history' 
    });
  }
};