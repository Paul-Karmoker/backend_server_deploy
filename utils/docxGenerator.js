import { createCanvas } from 'canvas';
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  AlignmentType, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType,
  Footer,
  Header,
  PageNumber,
  ImageRun,
  ExternalHyperlink,
  ShadingType
} from 'docx';
import mammoth from 'mammoth';
import PDFDocument from 'pdfkit';
import XLSX from 'xlsx';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { marked } from 'marked';
import { PDFDocument as PDFLib } from 'pdf-lib';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';

dotenv.config();

// Apply DOMMatrix polyfill for Node.js environment
if (typeof global.DOMMatrix === 'undefined') {
  const canvas = createCanvas(1, 1);
  global.DOMMatrix = canvas.getContext('2d').getTransform();
}

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_CLIENT_SECRET);
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.0-flash",
  generationConfig: {
    response_mime_type: "application/json",
    temperature: 0.7,
    topP: 0.9,
    topK: 40
  }
});

// Initialize Chart renderer
const chartRenderer = new ChartJSNodeCanvas({
  width: 800,
  height: 600,
  backgroundColour: 'white'
});

const docService = {
  /**
   * Enhanced content generation with professional document structure
   * @param {string} content - Input content
   * @param {string} documentType - Type of document
   * @param {string} style - Writing style
   * @param {string} expertiseLevel - Target audience level
   * @returns {Promise<Object>} Enhanced content and metadata
   */
  async enhanceContentWithAI(content, documentType = 'report', style = 'professional', expertiseLevel = 'senior') {
    try {
      // Document type specific instructions
      const typeSpecificPrompts = {
        general: `Create a general post with:
        - Engaging introduction paragraph
        - 3-5 main points with supporting details
        - Conversational tone
        - No formal sections required
        - Use simple language`,
        
        concept: `Develop a concept note with:
        - Clear problem statement
        - Proposed solution/approach
        - Expected outcomes
        - Implementation considerations
        - Use bullet points for key ideas
        - Keep technical details to a minimum`,
        
        project_proposal: `Create a project proposal with:
        - Executive Summary
        - Background/Context
        - Objectives
        - Methodology
        - Timeline
        - Budget Estimate
        - Expected Outcomes
        - Formal structure required
        - Include section headings`,
        
        blog: `Write a blog post with:
        - Catchy title
        - Engaging introduction
        - 3-5 sections with subheadings
        - Conversational tone
        - Call-to-action at the end
        - No formal structure needed
        - Use personal anecdotes if relevant`,
        
        report: `Prepare a formal report with:
        - Title page
        - Table of Contents
        - Executive Summary
        - Methodology
        - Findings
        - Recommendations
        - Appendix if needed
        - Use formal language
        - Include data visualization suggestions`,
        
        article: `Write an article with:
        - Well-researched content
        - Proper citations
        - Clear structure with introduction, body, conclusion
        - Neutral/formal tone
        - Target educated audience`,
        
        essay: `Compose an essay with:
        - Clear thesis statement
        - Supporting arguments
        - Proper citations
        - Conclusion summarizing main points
        - Academic tone
        - Logical flow between paragraphs`,
        
        summary: `Create a summary with:
        - Key points only
        - Bullet point format preferred
        - No introduction/conclusion needed
        - Concise language
        - Remove all fluff and examples`,
        
        cover_letter: `Create a professional cover letter with:
        - Proper sender/recipient information
        - Date
        - Professional salutation
        - 3-4 compelling body paragraphs
        - Professional closing
        - Formal but engaging tone
        - Tailored to the specific job
        - Highlight relevant skills/experience
        - Show enthusiasm for the position`
      };

      const basePrompt = `As a ${documentType} specialist, create content with these requirements:
      - ${style} tone for ${expertiseLevel} audience
      - Use symbols: ✓ → ⚠ ★ where appropriate
      - Use consistent heading hierarchy
      ${typeSpecificPrompts[documentType] || ''}

      Content to enhance: "${content.substring(0, 15000)}"

      Return in this JSON format:
      {
        "title": "Document Title",
        "subtitle": "Descriptive Subtitle if applicable",
        "sections": [
          {
            "type": "section type",
            "title": "Section Title",
            "content": "Narrative text",
            "bullets": ["✓ Point 1", "⚠ Point 2"],
            "style": "heading1|heading2|normal"
          }
        ],
        "metadata": {
          "recommendations": ["..."],
          "references": ["..."],
          "wordCount": 0,
          "complexity": "basic|intermediate|advanced"
        }
      }`;

      const result = await model.generateContent({
        contents: [{ 
          role: "user", 
          parts: [{ text: basePrompt }] 
        }]
      });
      
      const response = await result.response;
      const text = response.text();
      
      let jsonString = text
        .replace(/```json|```/g, '')
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
        .trim();

      try {
        // First try to parse directly
        const result = JSON.parse(jsonString);
        
        // Validate required fields
        if (!result.title || !result.sections) {
          throw new Error('AI response missing required fields');
        }
        
        // Ensure metadata exists
        result.metadata = result.metadata || {
          recommendations: [],
          references: [],
          wordCount: 0,
          complexity: 'intermediate'
        };
        
        return result;
        
      } catch (parseError) {
        console.warn('JSON parse failed, attempting repair...', parseError);
        
        // Try to fix common JSON issues
        try {
          const fixedJson = this.fixCommonJsonIssues(jsonString);
          const repaired = JSON.parse(fixedJson);
          
          // Ensure minimum structure
          if (!repaired.title) {
            repaired.title = documentType.charAt(0).toUpperCase() + documentType.slice(1);
          }
          if (!repaired.sections) {
            repaired.sections = [{
              title: 'Content',
              content: content.substring(0, 5000),
              type: 'text'
            }];
          }
          if (!repaired.metadata) {
            repaired.metadata = {
              recommendations: [],
              references: [],
              wordCount: content.split(/\s+/).length,
              complexity: 'basic'
            };
          }
          
          return repaired;
        } catch (repairError) {
          console.error('JSON repair failed, using fallback content', repairError);
          return this.createFallbackContent(content, documentType);
        }
      }
    } catch (error) {
      console.error('AI enhancement failed:', error);
      return this.createFallbackContent(content, documentType);
    }
  },

  /**
   * Create fallback content structure when AI fails
   */
  createFallbackContent(content, documentType) {
    return { 
      title: documentType.charAt(0).toUpperCase() + documentType.slice(1),
      subtitle: '',
      sections: [{
        title: 'Content',
        content: content.substring(0, 5000),
        type: 'text'
      }],
      metadata: {
        recommendations: [],
        references: [],
        wordCount: content.split(/\s+/).length,
        complexity: 'basic'
      }
    };
  },

  /**
   * Fix common JSON issues in AI responses
   */
  fixCommonJsonIssues(jsonString) {
    // Fix unescaped quotes
    let fixed = jsonString.replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');
    
    // Fix single quotes
    fixed = fixed.replace(/'/g, '"');
    
    // Fix trailing commas
    fixed = fixed.replace(/,\s*([}\]])/g, '$1');
    
    // Fix unquoted values
    fixed = fixed.replace(/:\s*([^"{\[\d][^,}\]\s]*)/g, (match, p1) => {
      // Don't quote numbers, booleans, or null
      if (/^(true|false|null|\d+)$/.test(p1)) {
        return `: ${p1}`;
      }
      return `: "${p1}"`;
    });
    
    // Fix missing commas between properties
    fixed = fixed.replace(/"\s*([}\]])/g, '"$1');
    fixed = fixed.replace(/"\s*"/g, '", "');
    
    // Ensure proper array formatting
    fixed = fixed.replace(/(\[)\s*([^\]\s])/g, '$1"$2');
    fixed = fixed.replace(/([^\[\s])\s*(\])/g, '$1"$2');
    
    return fixed;
  },

  /**
   * Generate a professional cover letter document
   * @param {string|Object} content - Either raw text or AI-enhanced content structure
   * @param {boolean} enhanceWithAI - Whether to enhance the content with AI
   * @returns {Promise<Buffer>} DOCX file buffer
   */
  async generateCoverLetterDocx(content, enhanceWithAI = true) {
    let enhancedContent;
    
    if (enhanceWithAI) {
      enhancedContent = await this.enhanceContentWithAI(
        typeof content === 'string' ? content : JSON.stringify(content),
        'cover_letter',
        'professional',
        'professional'
      );
    } else {
      enhancedContent = typeof content === 'string' 
        ? this.createFallbackContent(content, 'cover_letter')
        : content;
    }

    // Extract sections from enhanced content
    const sections = enhancedContent.sections || [];
    
    // Find specific sections by type or title
    const findSection = (type, titlePattern) => 
      sections.find(s => s.type === type || 
        (s.title && new RegExp(titlePattern, 'i').test(s.title)));

    const contactInfo = findSection('contact', 'contact|sender') || sections[0];
    const dateSection = findSection('date', 'date') || { content: new Date().toLocaleDateString() };
    const recipientSection = findSection('recipient', 'recipient|hire|manager') || sections[1];
    const subjectSection = findSection('subject', 'subject|re:') || { content: '' };
    const salutationSection = findSection('salutation', 'dear|salutation') || { content: 'Dear Hiring Manager,' };
    const bodySections = sections.filter(s => 
      s.type === 'body' || 
      (!['contact', 'date', 'recipient', 'subject', 'salutation', 'closing'].includes(s.type) &&
      !(s.title?.match(/contact|date|recipient|subject|salutation|closing|sincerely|regards/i))
    ));
    const closingSection = findSection('closing', 'sincerely|regards|closing') || 
      { content: 'Sincerely,\n[Your Name]' };

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440,    // 1 inch (1440 twips)
              right: 1440,
              bottom: 1440,
              left: 1440
            }
          }
        },
        children: [
          // Contact Information (Left-aligned, single-spaced)
          contactInfo && new Paragraph({
            children: (contactInfo.content || '').split('\n').map(line => 
              new TextRun({
                text: line.trim(),
                break: 1,
                size: 24,  // 12pt
                font: "Calibri"
              })
            ),
            spacing: { line: 276, after: 400 } // Single spacing + extra space after
          }),

          // Date (Right-aligned)
          dateSection && new Paragraph({
            text: dateSection.content.trim(),
            alignment: AlignmentType.RIGHT,
            spacing: { after: 400 },
            style: "normalText"
          }),

          // Recipient Address (Left-aligned)
          recipientSection && new Paragraph({
            children: (recipientSection.content || '').split('\n').map(line => 
              new TextRun({
                text: line.trim(),
                break: 1,
                size: 24,
                font: "Calibri"
              })
            ),
            spacing: { after: 400 }
          }),

          // Subject Line (Bold, Left-aligned) - only if exists
          subjectSection.content && subjectSection.content.trim() && new Paragraph({
            text: subjectSection.content.trim(),
            bold: true,
            spacing: { after: 400 }
          }),

          // Salutation (Left-aligned)
          salutationSection && new Paragraph({
            text: salutationSection.content.trim(),
            spacing: { after: 200 }
          }),

          // Body Paragraphs (Justified, First-line indent)
          ...bodySections.map(section => 
            new Paragraph({
              text: (section.content || '').replace(/\n/g, ' ').trim(),
              alignment: AlignmentType.JUSTIFIED,
              indent: { firstLine: 720 }, // 0.5 inch indent
              spacing: { line: 276, after: 200 }, // Single spacing
              style: "normalText"
            })
          ),

          // Closing (Left-aligned)
          closingSection && new Paragraph({
            text: closingSection.content.trim(),
            spacing: { before: 400 }
          })
        ].filter(Boolean) // Remove any falsy values (undefined paragraphs)
      }],
      styles: {
        paragraphStyles: [{
          id: "normalText",
          name: "Normal Text",
          run: {
            size: 24,  // 12pt
            font: "Calibri"
          },
          paragraph: {
            spacing: { line: 276 } // Single spacing (12pt * 1.15)
          }
        }]
      }
    });

    return Packer.toBuffer(doc);
  }
};

export const generateCoverLetterDocx = docService.generateCoverLetterDocx.bind(docService);
export default docService;