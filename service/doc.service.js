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
        - Remove all fluff and examples`
      };

      const basePrompt = `As a ${documentType} specialist, create content with these requirements:
      - ${style} tone for ${expertiseLevel} audience
      - Use symbols: ✓ → ⚠ ★ where appropriate
      - Use consistent heading hierarchy
      ${typeSpecificPrompts[documentType] || ''}

      Content to enhance: "${content.substring(0, 15000)}"

      Return in this STRICT JSON format (DO NOT include any markdown syntax like \`\`\`json):
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
      
      // More robust JSON extraction
      let jsonString = text
        .replace(/```json|```/g, '') // Remove markdown code blocks
        .replace(/^[^{[]*/, '') // Remove any text before JSON starts
        .replace(/[^}\]]*$/, '') // Remove any text after JSON ends
        .trim();

      // Try to parse the JSON
      let parsed;
      try {
        parsed = JSON.parse(jsonString);
      } catch (parseError) {
        console.warn('Initial JSON parse failed, attempting repair...', parseError);
        jsonString = this.fixMalformedJson(jsonString);
        parsed = JSON.parse(jsonString);
      }

      // Validate required fields
      if (!parsed.title) {
        parsed.title = documentType.charAt(0).toUpperCase() + documentType.slice(1);
      }
      if (!parsed.sections || !Array.isArray(parsed.sections)) {
        parsed.sections = [{
          title: 'Content',
          content: content.substring(0, 5000),
          type: 'text'
        }];
      }
      if (!parsed.metadata) {
        parsed.metadata = {
          recommendations: [],
          references: [],
          wordCount: content.split(/\s+/).length,
          complexity: 'basic'
        };
      }

      return parsed;
      
    } catch (error) {
      console.error('AI enhancement failed:', error);
      // Return a fallback structure
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
    }
  },

  /**
   * Fix malformed JSON with more robust handling
   */
  fixMalformedJson(jsonString) {
    try {
      // First try to parse directly
      JSON.parse(jsonString);
      return jsonString;
    } catch (initialError) {
      console.log('Attempting to repair JSON...');
      
      // Common fixes for malformed JSON
      let repaired = jsonString
        // Remove any non-printable characters
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
        // Fix common escaping issues
        .replace(/([^\\])\\([^\\])/g, '$1\\\\$2')
        // Fix unquoted property names
        .replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3')
        // Fix single quotes
        .replace(/'/g, '"')
        // Fix trailing commas
        .replace(/,\s*([}\]])/g, '$1')
        // Fix missing quotes around string values
        .replace(/:([^"\d{][^,}\]\s]*)([,}\]])/g, ':"$1"$2')
        // Fix newlines in strings
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');

      // Try to parse again
      try {
        JSON.parse(repaired);
        return repaired;
      } catch (finalError) {
        console.error('Failed to repair JSON:', finalError);
        // Return a minimal valid JSON if all else fails
        return JSON.stringify({
          title: 'Document',
          sections: [],
          metadata: {}
        });
      }
    }
  },

  /**
   * Generate complete professional document
   * @param {string} topic - Document topic
   * @param {Object} options - Generation options
   * @returns {Promise<Buffer>} DOCX buffer
   */
  async generateProfessionalDocument(topic, options = {}) {
    const {
      documentType = 'report',
      style = 'professional',
      expertiseLevel = 'senior',
      template = 'default',
      company,
      author,
      confidentiality,
      includeCharts = true,
      includeImages = true
    } = options;
    
    try {
      const prompt = `Create a comprehensive ${documentType} document about "${topic}" with:

1. PROFESSIONAL STRUCTURE:
   - Title page with [LOGO] placeholder
   - Table of Contents
   - Executive Summary (3 paragraphs)
   - 4-5 main sections with H2 headings
   - Conclusions & Recommendations
   - Appendix with references

2. CONTENT REQUIREMENTS:
   - ${style} tone for ${expertiseLevel} audience
   - Use professional symbols: ✓ → ⚠ ★
   - Include 3 [CHART] placeholders for data visualization
   - Add 2 [CALLOUT] boxes for key insights
   - Use ${template} template structure

3. FORMATTING:
   - Clear heading hierarchy (H1-H3)
   - Balanced text and visual elements
   - Proper paragraph spacing
   - Consistent bullet point styling

Return in this STRICT JSON format (DO NOT include markdown syntax):
{
  "title": "Document Title",
  "subtitle": "Descriptive Subtitle",
  "sections": [
    {
      "type": "title|section|conclusion",
      "title": "Section Title",
      "content": "Professional content",
      "bullets": ["✓ Point 1", "⚠ Point 2"],
      "charts": ["Chart description"],
      "callouts": ["Key insight"],
      "style": "heading1|heading2|normal"
    }
  ],
  "metadata": {
    "author": "${author || 'AI Document Service'}",
    "generatedAt": "${new Date().toISOString()}",
    "wordCount": 0,
    "complexity": "${expertiseLevel}"
  }
}`;

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      });
      
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from response
      let jsonStart = text.indexOf('{');
      let jsonEnd = text.lastIndexOf('}') + 1;
      let jsonContent = text.substring(jsonStart, jsonEnd);
      
      // Parse the JSON content
      const document = JSON.parse(this.fixMalformedJson(jsonContent));

      return this.createProfessionalDocx(document, { 
        documentType,
        company, 
        author, 
        confidentiality,
        includeCharts,
        includeImages
      });
    } catch (error) {
      console.error('Professional document generation failed:', error);
      return this.createErrorDocument(`Failed to generate document: ${error.message}`, topic);
    }
  },

  /**
   * Create professional DOCX document with enhanced features
   * @param {Object} document - Structured content
   * @param {Object} options - Document options
   * @returns {Promise<Buffer>} DOCX buffer
   */
  async createProfessionalDocx(document, options = {}) {
    try {
      const { 
        documentType = 'report',
        company, 
        author, 
        confidentiality,
        includeCharts = true,
        includeImages = true
      } = options;
      
      // Type-specific document configuration
      const docConfig = {
        includeCoverPage: ['report', 'project_proposal'].includes(documentType),
        includeTOC: ['report', 'project_proposal'].includes(documentType),
        formalStructure: ['report', 'project_proposal', 'article', 'essay'].includes(documentType),
        simpleStructure: ['blog', 'general', 'summary'].includes(documentType)
      };
  
      const doc = new Document({
        numbering: this.createNumbering(),
        styles: this.getDocumentStyles(documentType),
        sections: [{
          properties: {
            page: {
              margin: {
                top: docConfig.formalStructure ? 1000 : 500,
                right: 1000,
                bottom: docConfig.formalStructure ? 1500 : 1000,
                left: 1000
              }
            }
          },
          headers: docConfig.formalStructure ? {
            default: new Header({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: document.title,
                      size: 18,
                      color: '2E74B5'
                    }),
                    ...(confidentiality ? [
                      new TextRun({
                        text: " - CONFIDENTIAL",
                        color: 'FF0000',
                        bold: true
                      })
                    ] : [])
                  ],
                  border: { bottom: { color: '2E74B5', size: 4 } },
                  spacing: { after: 200 }
                })
              ]
            })
          } : {},
          footers: docConfig.formalStructure ? {
            default: new Footer({
              children: [
                new Paragraph({
                  children: [
                    new TextRun("Page "),
                    new TextRun({
                      children: [PageNumber.CURRENT],
                    }),
                    new TextRun(" of "),
                    new TextRun({
                      children: [PageNumber.TOTAL_PAGES],
                    })
                  ],
                  alignment: AlignmentType.CENTER,
                  border: { top: { color: '2E74B5', size: 4 } }
                })
              ]
            })
          } : {},
          children: [
            // Enhanced Cover Page if needed
            ...(docConfig.includeCoverPage 
              ? this.createEnhancedCoverPage(document, { company, author, confidentiality })
              : []),
            
            // Table of Contents if needed
            ...(docConfig.includeTOC 
              ? [new Paragraph({
                  text: "Table of Contents",
                  heading: HeadingLevel.HEADING_1,
                  pageBreakBefore: true
                })]
              : []),
  
            // Document sections with appropriate formatting
            ...(await Promise.all(document.sections.map(section => 
              this.createEnhancedSection(section, { 
                includeCharts, 
                includeImages,
                documentType 
              })
            ))).flat()
          ]
        }]
      });
      
      return Packer.toBuffer(doc);
    } catch (error) {
      console.error('DOCX creation failed:', error);
      return this.createErrorDocument('Failed to create document', document.title);
    }
  },

  /**
   * Create enhanced cover page with logo placeholder
   */
  createEnhancedCoverPage(document, options = {}) {
    const { company, author, confidentiality } = options;
    const date = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    return [
      new Paragraph({
        children: [
          new TextRun({
            text: document.title || 'Professional Report',
            bold: true,
            size: 36,
            font: 'Calibri Light',
            color: '2E74B5'
          }),
          new TextRun({ text: '\n\n', break: 2 }),
          new TextRun({
            text: document.subtitle || 'Strategic Analysis Document',
            size: 28,
            color: '404040',
            italics: true
          }),
          new TextRun({ text: '\n\n\n', break: 3 }),
          new TextRun({
            text: `Prepared for: ${company || '[Client Organization]'}`,
            size: 22
          }),
          new TextRun({ text: '\n\n', break: 2 }),
          new TextRun({
            text: `Prepared by: ${author || 'AI Document Service'}`,
            size: 22
          }),
          new TextRun({ text: '\n\n', break: 2 }),
          new TextRun({
            text: date,
            size: 22
          }),
          new TextRun({ text: '\n\n\n', break: 3 }),
          new TextRun({
            text: '[COMPANY LOGO]',
            color: 'AAAAAA',
            size: 16
          }),
          new TextRun({ text: '\n\n', break: 2 }),
          ...(confidentiality ? [
            new TextRun({
              text: `CONFIDENTIAL`,
              bold: true,
              color: 'FF0000',
              size: 22
            })
          ] : [])
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 800 }
      }),
      new Paragraph({
        text: '',
        pageBreakBefore: true
      })
    ];
  },

  /**
   * Create executive summary section
   */
  createExecutiveSummary(section) {
    const elements = [];
    
    elements.push(
      new Paragraph({
        text: "Executive Summary",
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true
      })
    );
    
    if (section.content) {
      section.content.split('\n\n').forEach(para => {
        if (para.trim()) {
          elements.push(
            new Paragraph({
              text: para,
              spacing: { after: 200 }
            })
          );
        }
      });
    }
    
    if (section.bullets?.length > 0) {
      elements.push(
        new Paragraph({
          text: "Key Points:",
          heading: HeadingLevel.HEADING_3
        })
      );
      
      section.bullets.forEach(point => {
        elements.push(new Paragraph({
          text: point,
          bullet: { level: 0 }
        }));
      });
    }
    
    return elements;
  },

  /**
   * Create enhanced document section with visual elements
   */
  async createEnhancedSection(section, options = {}) {
    const { 
      includeCharts = true, 
      includeImages = true,
      documentType = 'report'
    } = options;
    
    const elements = [];
    const isFormal = ['report', 'project_proposal', 'article', 'essay'].includes(documentType);
    
    // Section Heading
    if (section.title) {
      const headingLevel = this.getHeadingLevelFromStyle(section.style);
      elements.push(new Paragraph({
        text: section.title,
        heading: headingLevel,
        pageBreakBefore: section.type === 'title' ? false : section.pageBreakBefore,
        spacing: { 
          before: isFormal ? 400 : 200,
          after: isFormal ? 200 : 100 
        }
      }));
    }
    
    // Content Paragraphs
    if (section.content) {
      if (this.isMarkdown(section.content)) {
        elements.push(...this.parseMarkdownToDocx(section.content));
      } else {
        section.content.split('\n\n').forEach(para => {
          if (para.trim()) {
            elements.push(new Paragraph({
              text: para,
              spacing: { 
                after: isFormal ? 200 : 100,
                line: isFormal ? 276 : 200
              }
            }));
          }
        });
      }
    }
    
    // Bullet Points with Symbols
    if (section.bullets?.length > 0) {
      section.bullets.forEach(point => {
        elements.push(new Paragraph({
          text: point,
          bullet: { level: 0 },
          spacing: { after: isFormal ? 100 : 50 }
        }));
      });
    }
    
    // Chart Placeholders or Actual Charts
    if (section.charts?.length > 0) {
      for (const chartDesc of section.charts) {
        if (includeCharts) {
          try {
            const chartBuffer = await this.generateChart(chartDesc);
            elements.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    data: chartBuffer,
                    transformation: {
                      width: 600,
                      height: 400
                    }
                  })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 400, after: 400 }
              }),
              new Paragraph({
                text: `Figure: ${chartDesc}`,
                style: 'ChartCaption',
                alignment: AlignmentType.CENTER
              })
            );
          } catch (error) {
            console.error('Error generating chart:', error);
            elements.push(
              new Paragraph({
                text: `[CHART: ${chartDesc}]`,
                style: 'ChartPlaceholder',
                alignment: AlignmentType.CENTER,
                spacing: { before: 400, after: 400 }
              })
            );
          }
        } else {
          elements.push(
            new Paragraph({
              text: `[CHART: ${chartDesc}]`,
              style: 'ChartPlaceholder',
              alignment: AlignmentType.CENTER,
              spacing: { before: 400, after: 400 }
            })
          );
        }
      }
    }
    
    // Callout Boxes
    if (section.callouts?.length > 0) {
      section.callouts.forEach(callout => {
        elements.push(
          new Paragraph({
            text: '',
            spacing: { before: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `💡 ${callout}`,
                color: '2E74B5',
                bold: true
              })
            ],
            border: {
              top: { color: '2E74B5', size: 8 },
              bottom: { color: '2E74B5', size: 8 },
              left: { color: '2E74B5', size: 8 },
              right: { color: '2E74B5', size: 8 }
            },
            shading: {
              fill: 'F2F7FC'
            },
            spacing: { before: 200, after: 200 }
          })
        );
      });
    }
    
    // Tables
    if (section.data?.table) {
      elements.push(this.createTable(section.data.table));
    }
    
    return elements;
  },

  /**
   * Generate a chart image from description
   */
  async generateChart(description) {
    const configuration = {
      type: 'bar',
      data: {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [{
          label: 'Sample Data',
          data: [12, 19, 3, 5],
          backgroundColor: [
            'rgba(54, 162, 235, 0.5)'
          ],
          borderColor: [
            'rgba(54, 162, 235, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: description
          }
        }
      }
    };

    return chartRenderer.renderToBuffer(configuration);
  },

  /**
   * Create a table from table data
   */
  createTable(tableData) {
    const rows = [];
    
    tableData.rows?.forEach(row => {
      rows.push(new TableRow({
        children: row.map(cell => new TableCell({
          children: [new Paragraph({ text: cell })]
        }))
      }));
    });
    
    return new Table({
      rows,
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { size: 4, color: 'D9D9D9' },
        bottom: { size: 4, color: 'D9D9D9' },
        left: { size: 4, color: 'D9D9D9' },
        right: { size: 4, color: 'D9D9D9' },
        insideHorizontal: { size: 2, color: 'F2F2F2' },
        insideVertical: { size: 2, color: 'F2F2F2' }
      }
    });
  },

  /**
   * Create error document
   */
  async createErrorDocument(error, title = 'Error') {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: title,
            heading: HeadingLevel.HEADING_1
          }),
          new Paragraph({
            text: 'An error occurred during document generation:',
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: error,
            color: 'FF0000'
          })
        ]
      }]
    });
    
    return Packer.toBuffer(doc);
  },

  /**
   * Get heading level from style
   */
  getHeadingLevelFromStyle(style) {
    switch (style) {
      case 'heading1': return HeadingLevel.HEADING_1;
      case 'heading2': return HeadingLevel.HEADING_2;
      case 'heading3': return HeadingLevel.HEADING_3;
      default: return HeadingLevel.HEADING_2;
    }
  },

  /**
   * Get heading level from depth
   */
  getHeadingLevel(depth) {
    switch (depth) {
      case 1: return HeadingLevel.HEADING_1;
      case 2: return HeadingLevel.HEADING_2;
      case 3: return HeadingLevel.HEADING_3;
      case 4: return HeadingLevel.HEADING_4;
      case 5: return HeadingLevel.HEADING_5;
      default: return HeadingLevel.HEADING_6;
    }
  },

  /**
   * Check if text contains markdown
   */
  isMarkdown(text) {
    return /[*_`\[]/.test(text);
  },

  /**
   * Parse markdown to DOCX elements
   */
  parseMarkdownToDocx(markdown) {
    const elements = [];
    const tokens = marked.lexer(markdown);
    
    tokens.forEach(token => {
      switch (token.type) {
        case 'heading':
          elements.push(new Paragraph({
            text: token.text,
            heading: this.getHeadingLevel(token.depth)
          }));
          break;
          
        case 'paragraph':
          elements.push(new Paragraph({
            text: token.text,
            spacing: { after: 100 }
          }));
          break;
          
        case 'list':
          token.items.forEach(item => {
            elements.push(new Paragraph({
              text: item.text,
              [token.ordered ? 'numbering' : 'bullet']: {
                reference: token.ordered ? 'numbered-list' : 'bullet-list',
                level: 0
              }
            }));
          });
          break;
          
        case 'table':
          elements.push(this.createTable(token));
          break;
          
        case 'blockquote':
          elements.push(new Paragraph({
            text: token.text,
            style: 'Quote'
          }));
          break;
          
        case 'code':
          elements.push(new Paragraph({
            children: [new TextRun({
              text: token.text,
              style: 'Code'
            })]
          }));
          break;
          
        default:
          elements.push(new Paragraph({
            text: token.raw || token.text,
            spacing: { after: 100 }
          }));
      }
    });
    
    return elements;
  },

  /**
   * Create numbering configuration
   */
  createNumbering() {
    return {
      config: [
        {
          reference: "numbered-list",
          levels: [{
            level: 0,
            format: "decimal",
            text: "%1.",
            alignment: AlignmentType.LEFT
          }]
        },
        {
          reference: "bullet-list",
          levels: [{
            level: 0,
            format: "bullet",
            text: "•",
            alignment: AlignmentType.LEFT
          }]
        }
      ]
    };
  },

  /**
   * Enhanced document styles with additional styles
   */
  getDocumentStyles(documentType = 'report') {
    const isFormal = ['report', 'project_proposal', 'article', 'essay'].includes(documentType);
    const isSimple = ['blog', 'general', 'summary'].includes(documentType);

    return {
      paragraphStyles: [
        {
          id: "Title",
          name: "Title",
          run: {
            size: isFormal ? 36 : 32,
            font: isFormal ? "Calibri Light" : "Calibri",
            color: isFormal ? "2E74B5" : "404040",
            bold: true
          },
          paragraph: {
            spacing: { after: isFormal ? 400 : 200 },
            alignment: AlignmentType.CENTER
          }
        },
        {
          id: "Subtitle",
          name: "Subtitle",
          run: {
            size: isFormal ? 28 : 24,
            font: isFormal ? "Calibri Light" : "Calibri",
            color: "404040",
            italics: true
          },
          paragraph: {
            spacing: { before: 200, after: isFormal ? 600 : 400 },
            alignment: AlignmentType.CENTER
          }
        },
        {
          id: "Heading1",
          name: "Heading 1",
          run: {
            size: isFormal ? 28 : 24,
            font: "Calibri",
            color: isFormal ? "2E74B5" : "404040",
            bold: true
          },
          paragraph: {
            spacing: { before: isFormal ? 400 : 200, after: isFormal ? 200 : 100 },
            border: isFormal ? { bottom: { color: "D9D9D9", size: 1 } } : {}
          }
        },
        {
          id: "Heading2",
          name: "Heading 2",
          run: {
            size: isFormal ? 24 : 22,
            font: "Calibri",
            color: "404040",
            bold: true
          },
          paragraph: {
            spacing: { before: isFormal ? 300 : 150, after: isFormal ? 150 : 100 }
          }
        },
        {
          id: "Heading3",
          name: "Heading 3",
          run: {
            size: isFormal ? 22 : 20,
            font: "Calibri",
            color: "404040",
            bold: true,
            italics: isFormal ? true : false
          },
          paragraph: {
            spacing: { before: isFormal ? 200 : 100, after: isFormal ? 100 : 50 }
          }
        },
        {
          id: "Normal",
          name: "Normal",
          run: {
            size: isFormal ? 22 : 20,
            font: "Calibri"
          },
          paragraph: {
            spacing: { 
              line: isFormal ? 276 : 200, 
              before: 100, 
              after: 100 
            },
            indent: { left: 0, firstLine: 0 }
          }
        },
        {
          id: "Quote",
          name: "Quote",
          run: {
            size: isFormal ? 22 : 20,
            italics: true,
            color: "666666"
          },
          paragraph: {
            spacing: { line: isFormal ? 276 : 200 },
            indent: { left: 720, hanging: 360 },
            border: { left: { color: "D9D9D9", size: 8 } }
          }
        },
        {
          id: "ListParagraph",
          name: "List Paragraph",
          run: {
            size: isFormal ? 22 : 20
          },
          paragraph: {
            spacing: { line: isFormal ? 276 : 200 }
          }
        },
        {
          id: "ChartPlaceholder",
          name: "Chart Placeholder",
          run: {
            size: 20,
            color: "888888",
            italics: true
          },
          paragraph: {
            spacing: { before: 400, after: 400 },
            alignment: AlignmentType.CENTER,
            border: {
              top: { color: "D9D9D9", size: 4, style: "dashed" },
              bottom: { color: "D9D9D9", size: 4, style: "dashed" }
            },
            shading: {
              fill: "FAFAFA"
            }
          }
        },
        {
          id: "ChartCaption",
          name: "Chart Caption",
          run: {
            size: 18,
            color: "666666"
          },
          paragraph: {
            spacing: { before: 100, after: 400 },
            alignment: AlignmentType.CENTER
          }
        }
      ],
      characterStyles: [
        {
          id: "Strong",
          name: "Strong",
          run: {
            bold: true
          }
        },
        {
          id: "Emphasis",
          name: "Emphasis",
          run: {
            italics: true
          }
        },
        {
          id: "Code",
          name: "Code",
          run: {
            font: "Courier New",
            color: "2E74B5"
          }
        },
        {
          id: "Symbol",
          name: "Symbol",
          run: {
            font: "Segoe UI Emoji",
            color: "2E74B5"
          }
        }
      ]
    };
  },

  /**
   * Extract text from PDF using pdf-parse
   */
  async extractTextFromPdf(buffer) {
    try {
      const { default: pdfParse } = await import('pdf-parse');
      
      const data = await pdfParse(buffer);
      let rawText = data.text;

      const prompt = `Clean and structure this raw text extracted from a PDF:
      1. Remove page numbers, headers, footers
      2. Fix broken paragraphs
      3. Preserve document structure
      4. Remove duplicate content
      
      Raw text: "${rawText.substring(0, 10000)}"`;

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      });
      const response = await result.response;
      const cleanedText = response.text();

      return cleanedText.trim();
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw new Error('Failed to extract text from PDF');
    }
  },

  async extractTextFromDocx(buffer) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const rawText = result.value;

      const prompt = `This text was extracted from a Word document. Please:
      1. Preserve original headings and structure
      2. Fix any formatting issues
      3. Remove document artifacts
      4. Maintain original bullet points and numbering
      
      Text: "${rawText.substring(0, 10000)}"`;

      const aiResult = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      });
      const response = await aiResult.response;
      const cleanedText = response.text();

      return cleanedText.trim();
    } catch (error) {
      console.error('Error extracting text from DOCX:', error);
      throw new Error('Failed to extract text from DOCX');
    }
  },

  async extractTextFromExcel(buffer) {
    try {
      const workbook = XLSX.read(buffer, { 
        type: 'buffer',
        cellText: false,
        cellDates: true,
      });

      const rawData = workbook.SheetNames.map(name => {
        const worksheet = workbook.Sheets[name];
        return `Sheet: ${name}\n${XLSX.utils.sheet_to_csv(worksheet)}`;
      }).join('\n\n');

      const prompt = `Analyze this Excel data and provide:
      1. Summary of key data points
      2. Notable trends or patterns
      3. Data quality assessment
      4. Suggested visualizations
      
      Data: "${rawData.substring(0, 10000)}"`;

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      });
      const response = await result.response;
      const analysis = response.text();

      return `${rawData}\n\n--- AI ANALYSIS ---\n${analysis}`.trim();
    } catch (error) {
      console.error('Error extracting text from Excel:', error);
      throw new Error('Failed to extract text from Excel');
    }
  },

  async convertHtmlToDocx(htmlContent, documentType = 'report', style = 'professional') {
    try {
      // Remove HTML tags and clean content
      const plainText = htmlContent.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
      
      // Get enhanced content with proper structure
      const enhancedData = await this.enhanceContentWithAI(
        plainText,
        documentType,
        style,
        'senior'
      );

      // Type-specific document configuration
      const isFormal = ['report', 'project_proposal', 'article', 'essay'].includes(documentType);
      const isSimple = ['blog', 'general', 'summary'].includes(documentType);

      // Create document with appropriate styling
      const doc = new Document({
        styles: this.getDocumentStyles(documentType),
        sections: [
          {
            properties: {},
            children: [
              // Title
              new Paragraph({
                text: enhancedData.title || documentType.charAt(0).toUpperCase() + documentType.slice(1),
                heading: HeadingLevel.HEADING_1,
              }),
              
              // Subtitle if exists
              ...(enhancedData.subtitle ? [
                new Paragraph({
                  text: enhancedData.subtitle,
                  style: 'Subtitle'
                })
              ] : []),
              
              // Process each section with appropriate formatting
              ...enhancedData.sections.map(section => {
                const paragraphs = [];
                
                // Add section heading if title exists
                if (section.title) {
                  paragraphs.push(
                    new Paragraph({
                      text: section.title,
                      heading: section.style === 'heading2' 
                        ? HeadingLevel.HEADING_2 
                        : HeadingLevel.HEADING_1,
                    })
                  );
                }
                
                // Add content with proper paragraph breaks
                if (section.content) {
                  const contentParagraphs = section.content.split('\n\n');
                  contentParagraphs.forEach(para => {
                    if (para.trim()) {
                      paragraphs.push(
                        new Paragraph({
                          text: para,
                          spacing: { 
                            after: isFormal ? 100 : 50,
                            line: isFormal ? 276 : 200
                          },
                        })
                      );
                    }
                  });
                }
                
                // Add bullet points if they exist
                if (section.bullets?.length) {
                  section.bullets.forEach(bullet => {
                    paragraphs.push(
                      new Paragraph({
                        text: bullet,
                        bullet: { level: 0 },
                        spacing: { after: isFormal ? 100 : 50 }
                      })
                    );
                  });
                }
                
                return paragraphs;
              }).flat(),
            ],
          },
        ],
      });
  
      return await Packer.toBuffer(doc);
    } catch (error) {
      console.error('Error converting to DOCX:', error);
      return await this.createErrorDocument(`Failed to generate document: ${error.message}`, 'Document Generation Error');
    }
  },

  async extractText(buffer, mimeType) {
    try {
      let rawText;
      
      switch (mimeType) {
        case 'application/pdf':
          rawText = await this.extractTextFromPdf(buffer);
          break;
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          rawText = await this.extractTextFromDocx(buffer);
          break;
        case 'application/vnd.ms-excel':
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
          rawText = await this.extractTextFromExcel(buffer);
          break;
        case 'text/plain':
          rawText = buffer.toString();
          break;
        default:
          throw new Error(`Unsupported file type: ${mimeType}`);
      }

      const prompt = `Clean and standardize this document text:
      1. Fix encoding issues
      2. Standardize line breaks
      3. Remove redundant whitespace
      4. Preserve original structure
      
      Text: "${rawText.substring(0, 10000)}"`;

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      });
      const response = await result.response;
      const cleanedText = response.text();

      return cleanedText.trim();
    } catch (error) {
      console.error('Error extracting text:', error);
      throw new Error(`Failed to extract text: ${error.message}`);
    }
  }
};

export default docService;