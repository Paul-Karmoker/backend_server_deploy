import mongoose from 'mongoose';

const contentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Optional if you want to track user-generated content
  },
  sourceText: {
    type: String,
    required: true
  },
  generatedContent: {
    type: String,
    required: true
  },
  contentType: {
    type: String,
    enum: ['blog', 'report', 'article', 'essay', 'summary', 'concept letter', 'paragraph', 'story', 'case study', 'project proposal' ],
    required: true
  },
  tone: {
    type: String,
    enum: ['professional', 'casual', 'academic', 'persuasive', 'creative', 'critical', 'analysis', 'project proposal'],
    required: true
  },
  wordCount: {
    type: Number,
    required: true
  },
  includeCharts: {
    type: Boolean,
    default: true
  },
  includeImages: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Add text index for search functionality
contentSchema.index({ sourceText: 'text', generatedContent: 'text' });

const Content = mongoose.model('Content', contentSchema);

export default Content;