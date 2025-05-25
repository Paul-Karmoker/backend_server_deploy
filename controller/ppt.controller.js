import PPT from '../model/ppt.model.js';
import { PPTService } from '../service/ppt.service.js';

export const generatePPT = async (req, res) => {
  try {
    // Destructure with improved defaults and validation
    let { 
      content, 
      slideCount = 10, 
      design = 'professional', 
      animation = true, 
      includeGraphics = true, 
      youtubeUrl 
    } = req.body;

    let sourceType = 'text';
    let sourceMetadata = {};

    // Enhanced validation with better error messages
    if (!content && !youtubeUrl && !req.file) {
      return res.status(400).json({ 
        error: 'You must provide either: content text, a YouTube URL, or a file upload',
        details: {
          required: 'At least one input source',
          options: [
            'Plain text content',
            'YouTube video URL',
            'PDF or DOCX file upload'
          ]
        }
      });
    }

    // Validate slide count with better range checking
    slideCount = parseInt(slideCount);
    if (isNaN(slideCount)) {  // Added missing parenthesis here
      return res.status(400).json({
        error: 'Slide count must be a number',
        validRange: '1-50 slides'
      });
    }

    if (slideCount < 1 || slideCount > 50) {
      return res.status(400).json({
        error: 'Invalid slide count',
        validRange: 'Must be between 1 and 50'
      });
    }

    // Validate design option
    const validDesigns = ['modern', 'professional', 'creative'];
    if (design && !validDesigns.includes(design)) {
      return res.status(400).json({
        error: 'Invalid design option',
        validOptions: validDesigns
      });
    }

    // Handle YouTube URL if provided
    if (youtubeUrl) {
      try {
        sourceType = 'youtube';
        content = await PPTService.getYouTubeTranscript(youtubeUrl);
        sourceMetadata = {
          youtubeUrl,
          videoId: youtubeUrl.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/)?.[1] || null,
          transcriptLength: content?.length || 0
        };

        if (!content) {
          return res.status(400).json({
            error: 'Failed to extract transcript from YouTube video',
            details: 'The video might not have captions available'
          });
        }
      } catch (error) {
        console.error('YouTube transcript error:', error);
        return res.status(400).json({
          error: 'YouTube processing failed',
          details: error.message.includes('transcript') 
            ? 'Could not extract transcript' 
            : 'Invalid YouTube URL'
        });
      }
    }

    // Handle file uploads if present
    if (req.file) {
      const fileBuffer = req.file.buffer;
      const fileType = req.file.mimetype;

      try {
        if (fileType === 'application/pdf') {
          sourceType = 'pdf';
          content = await PPTService.extractTextFromPDF(fileBuffer);
          sourceMetadata = {
            originalFilename: req.file.originalname,
            pages: content.split('\f').length,
            fileSize: req.file.size
          };
        } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          sourceType = 'docx';
          content = await PPTService.extractTextFromDocx(fileBuffer);
          sourceMetadata = {
            originalFilename: req.file.originalname,
            fileSize: req.file.size
          };
        } else {
          return res.status(400).json({
            error: 'Unsupported file type',
            supportedTypes: ['PDF', 'DOCX']
          });
        }

        if (!content) {
          return res.status(400).json({
            error: 'Could not extract text from uploaded file',
            details: 'The file might be corrupted or empty'
          });
        }
      } catch (error) {
        console.error('File processing error:', error);
        return res.status(400).json({
          error: 'Failed to process uploaded file',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    }

    // Generate presentation with enhanced error handling
    let result;
    try {
      result = await PPTService.generatePresentation(
        content, 
        slideCount, 
        design, 
        animation,
        includeGraphics,
        sourceType,
        sourceMetadata
      );
    } catch (error) {
      console.error('Generation error:', error);
      return res.status(500).json({
        error: 'Failed to generate presentation',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        suggestion: 'Try reducing the content length or slide count'
      });
    }

    const { pptBuffer, pdfBuffer, metadata } = result;

    // Save to database with improved data structure
    const pptRecord = new PPT({
      content: content.substring(0, 1000), // Store preview
      slideCount,
      design,
      animation,
      includeGraphics,
      sourceType,
      sourceMetadata: {
        ...sourceMetadata,
        contentLength: content.length
      },
      pptFile: pptBuffer,
      pdfFile: pdfBuffer,
      metadata: {
        ...metadata,
        source: sourceType,
        inputCharacteristics: {
          length: content.length,
          wordCount: content.split(/\s+/).length,
          slideRatio: content.length / slideCount
        }
      },
      ...(includeGraphics && {
        aiFeatures: {
          narratives: metadata?.narratives || [],
          visuals: metadata?.visualSuggestions || []
        }
      })
    });

    await pptRecord.save();

    // Enhanced response format
    const response = {
      success: true,
      id: pptRecord._id,
      message: 'Presentation generated successfully',
      metadata: {
        design,
        slides: slideCount,
        duration: `${metadata.processingTime}ms`,
        fileSizes: {
          ppt: `${Math.round(metadata.fileSize.ppt / 1024)} KB`,
          pdf: `${Math.round(metadata.fileSize.pdf / 1024)} KB`
        },
        source: {
          type: sourceType,
          ...(sourceType === 'youtube' && { videoId: sourceMetadata.videoId }),
          ...(sourceType === 'file' && { filename: sourceMetadata.originalFilename })
        }
      },
      links: {
        download: {
          pptx: `/api/presentations/${pptRecord._id}/download/pptx`,
          pdf: `/api/presentations/${pptRecord._id}/download/pdf`
        },
        details: `/api/presentations/${pptRecord._id}`
      },
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          contentPreview: content.substring(0, 200) + '...',
          aiMetadata: metadata.aiMetadata
        }
      })
    };

    // Flexible response handling
    if (req.accepts('json')) {
      res.json(response);
    } else {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const pptFilename = `presentation-${timestamp}.pptx`;
      
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${pptFilename}"`);
      res.send(pptBuffer);
    }

  } catch (error) {
    console.error('Controller error:', error);
    res.status(500).json({ 
      error: 'Presentation generation failed',
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack
      } : undefined,
      suggestion: 'Please check your input and try again'
    });
  }
};

// Rest of your controller methods remain unchanged
export const downloadFile = async (req, res) => {
  try {
    const { id, type = 'pptx' } = req.params;
    
    const presentation = await PPT.findById(id);
    if (!presentation) {
      return res.status(404).json({ error: 'Presentation not found' });
    }

    const fileBuffer = type === 'pdf' ? presentation.pdfFile : presentation.pptFile;
    const contentType = type === 'pdf' 
      ? 'application/pdf' 
      : 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    
    const extension = type === 'pdf' ? 'pdf' : 'pptx';
    const filename = `presentation-${id}.${extension}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(fileBuffer);

  } catch (error) {
    console.error('Error in downloadFile:', error);
    res.status(500).json({ 
      error: `Failed to download ${type.toUpperCase()}`,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getPresentationDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    const presentation = await PPT.findById(id)
      .select('-pptFile -pdfFile -__v'); // Exclude large binary files

    if (!presentation) {
      return res.status(404).json({ error: 'Presentation not found' });
    }

    // Format the response with AI metadata if available
    const response = {
      id: presentation._id,
      contentPreview: presentation.content,
      slideCount: presentation.slideCount,
      design: presentation.design,
      animation: presentation.animation,
      includeGraphics: presentation.includeGraphics,
      sourceType: presentation.sourceType,
      sourceMetadata: presentation.sourceMetadata,
      createdAt: presentation.createdAt,
      metadata: presentation.metadata,
      ...(presentation.includeGraphics && {
        aiFeatures: {
          hasNarratives: presentation.aiNarratives?.length > 0,
          hasVisuals: presentation.visualMetadata?.icons?.length > 0 || 
                     presentation.visualMetadata?.images?.length > 0
        }
      }),
      downloadLinks: {
        pptx: `/api/presentations/${id}/download/pptx`,
        pdf: `/api/presentations/${id}/download/pdf`
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error in getPresentationDetails:', error);
    res.status(500).json({ 
      error: 'Failed to fetch presentation details',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getUserPresentations = async (req, res) => {
  try {
    // Get all presentations with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [presentations, total] = await Promise.all([
      PPT.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-pptFile -pdfFile -__v'),
      PPT.countDocuments()
    ]);

    // Format response with pagination info and AI features
    const formattedPresentations = presentations.map(pres => ({
      id: pres._id,
      topic: pres.content.substring(0, 100) + (pres.content.length > 100 ? '...' : ''),
      slideCount: pres.slideCount,
      design: pres.design,
      animation: pres.animation,
      includeGraphics: pres.includeGraphics,
      createdAt: pres.createdAt,
      ...(pres.includeGraphics && {
        aiEnhanced: pres.aiNarratives?.length > 0 || 
                   pres.visualMetadata?.icons?.length > 0 ||
                   pres.visualMetadata?.images?.length > 0
      }),
      downloadLink: `/api/presentations/${pres._id}/download/pptx`
    }));

    res.json({
      data: formattedPresentations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error in getUserPresentations:', error);
    res.status(500).json({ 
      error: 'Failed to fetch presentations',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getGenerationStats = async (req, res) => {
  try {
    const [stats, recentTopics, aiStats] = await Promise.all([
      PPT.aggregate([
        {
          $group: {
            _id: null,
            totalPresentations: { $sum: 1 },
            avgSlideCount: { $avg: '$slideCount' },
            designs: {
              modern: { $sum: { $cond: [{ $eq: ['$design', 'modern'] }, 1, 0] } },
              classic: { $sum: { $cond: [{ $eq: ['$design', 'classic'] }, 1, 0] } },
              professional: { $sum: { $cond: [{ $eq: ['$design', 'professional'] }, 1, 0] } },
              creative: { $sum: { $cond: [{ $eq: ['$design', 'creative'] }, 1, 0] } },
              minimalist: { $sum: { $cond: [{ $eq: ['$design', 'minimalist'] }, 1, 0] } }
            },
            animationsEnabled: { $sum: { $cond: ['$animation', 1, 0] } },
            withGraphics: { $sum: { $cond: ['$includeGraphics', 1, 0] } },
            avgProcessingTime: { $avg: '$metadata.processingTime' },
            avgFileSize: { $avg: { $add: ['$metadata.fileSize.ppt', '$metadata.fileSize.pdf'] } }
          }
        }
      ]),
      PPT.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .select('content createdAt'),
      PPT.aggregate([
        {
          $match: { includeGraphics: true }
        },
        {
          $group: {
            _id: null,
            withNarratives: { $sum: { $cond: [{ $gt: [{ $size: '$aiNarratives' }, 0] }, 1, 0] } },
            withVisuals: { $sum: { $cond: [{ $or: [
              { $gt: [{ $size: '$visualMetadata.icons' }, 0] },
              { $gt: [{ $size: '$visualMetadata.images' }, 0] }
            ] }, 1, 0] } }
          }
        }
      ])
    ]);

    const response = {
      ...stats[0],
      recentTopics: recentTopics.map(t => ({
        preview: t.content.substring(0, 50) + (t.content.length > 50 ? '...' : ''),
        createdAt: t.createdAt
      })),
      aiUsage: aiStats[0] || { withNarratives: 0, withVisuals: 0 }
    };

    res.json(response);
  } catch (error) {
    console.error('Error in getGenerationStats:', error);
    res.status(500).json({ 
      error: 'Failed to get statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};