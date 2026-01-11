import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    index: { type: Number, required: true }, // 0..4
    question: { type: String, required: true },
    idealAnswer: { type: String, required: true },
    topicTags: [{ type: String }],
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },

    userAnswer: { type: String, default: '' },
    feedback: { type: String, default: '' },
    isCorrect: { type: Boolean, default: false },
    score: { type: Number, default: 0 } // 0 or 1
  },
  { _id: false }
);

const testSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    jobTitle: { type: String, trim: true, required: true },
    experienceYears: { type: Number, default: 0, min: 0 },
    skills: [{ type: String }],
    jobDescription: { type: String, default: '' },

    status: { type: String, enum: ['pending', 'active', 'completed', 'expired'], default: 'pending' },

    durationMinutes: { type: Number, default: 20, min: 1, max: 240 },
    startedAt: { type: Date },
    expiresAt: { type: Date },
    completedAt: { type: Date },

    currentQuestion: { type: Number, default: 0 }, // next index to serve
    questions: { type: [questionSchema], default: [] },

    totalScore: { type: Number, default: 0 }
  },
  { timestamps: true }
);

testSessionSchema.index({ userId: 1, createdAt: -1 });
testSessionSchema.index({ status: 1 });

export default mongoose.model('TestSession', testSessionSchema);
