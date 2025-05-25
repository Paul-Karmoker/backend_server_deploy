import mongoose from 'mongoose';

const pptSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  slideCount: {
    type: Number,
    required: true,
    min: 3,
    max: 45
  },
  design: {
    type: String,
    required: true,
    enum: ['modern', 'classic', 'professional', 'creative', 'minimalist'],
    default: 'modern'
  },
  animation: {
    type: Boolean,
    default: true
  },
  includeGraphics: {
    type: Boolean,
    default: true
  },
  pptFile: {
    type: Buffer,
    required: true
  },
  pdfFile: {
    type: Buffer,
    required: true
  },
  sourceType: {
    type: String,
    enum: ['text', 'pdf', 'docx', 'youtube', 'ai-enhanced'],
    default: 'text'
  },
  sourceMetadata: {
    type: mongoose.Schema.Types.Mixed
  },
  aiNarratives: {
    type: [String],
    default: []
  },
  visualMetadata: {
    type: {
      icons: [String],
      images: [String],
      theme: String
    },
    default: null
  },
  transcriptSource: {
    type: {
      youtubeUrl: String,
      videoId: String,
      language: String
    },
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  processingTime: {
    type: Number // in seconds
  },
  fileSize: {
    ppt: Number, // in KB
    pdf: Number  // in KB
  }
}, {
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.pptFile;
      delete ret.pdfFile;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Virtual for formatted creation date
pptSchema.virtual('createdAtFormatted').get(function() {
  return this.createdAt.toLocaleString();
});

// Virtual for content preview
pptSchema.virtual('contentPreview').get(function() {
  return this.content.length > 100 
    ? this.content.substring(0, 100) + '...' 
    : this.content;
});

// Virtual for AI content check
pptSchema.virtual('hasAIContent').get(function() {
  return this.aiNarratives?.length > 0 || this.sourceType === 'ai-enhanced';
});

// Indexes for better query performance
pptSchema.index({ createdAt: -1 });
pptSchema.index({ design: 1 });
pptSchema.index({ sourceType: 1 });
pptSchema.index({ 'transcriptSource.videoId': 1 });

// Pre-save hook to calculate processing time
pptSchema.pre('save', function(next) {
  if (this.isNew) {
    this.generatedAt = new Date();
  }
  next();
});

// Post-save hook to calculate file sizes and processing time
pptSchema.post('save', function(doc) {
  if (doc.pptFile && doc.pdfFile) {
    const pptSizeKB = Math.round(doc.pptFile.length / 1024);
    const pdfSizeKB = Math.round(doc.pdfFile.length / 1024);
    const processingTime = (doc.generatedAt - doc.createdAt) / 1000;
    
    // Only update if values have changed
    if (!doc.fileSize || 
        doc.fileSize.ppt !== pptSizeKB || 
        doc.fileSize.pdf !== pdfSizeKB ||
        doc.processingTime !== processingTime) {
      doc.fileSize = { ppt: pptSizeKB, pdf: pdfSizeKB };
      doc.processingTime = processingTime;
      return doc.save();
    }
  }
});

const PPT = mongoose.model('PPT', pptSchema);

export default PPT;