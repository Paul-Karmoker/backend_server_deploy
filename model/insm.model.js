import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  type: { type: String, enum: ['technical', 'scenario'], required: true },
  category: { type: String }
}, { _id: false });

const answerSchema = new mongoose.Schema({
  question: { type: String, required: true },
  questionType: { type: String, required: true },
  transcript: { type: String },
  score: { type: Number },
  feedback: { type: String },
  suggestedAnswer: { type: String },
  timeSpent: { type: Number }
}, { _id: false });

const interviewSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  jobDescription: { type: String },
  documentText: { type: String },
  practiceMode: { type: String },
  questions: [questionSchema],
  answers: [answerSchema],
  overallScore: { type: Number },
  improvementSuggestions: [String],
  commonQuestions: [questionSchema],
  createdAt: { type: Date, default: Date.now }
});

export const InterviewSession = mongoose.model('InterviewSession', interviewSessionSchema);