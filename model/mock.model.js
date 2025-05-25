import mongoose from "mongoose";

const InterviewSchema = new mongoose.Schema({
  jobDescription: String,
  questions: [String],
  answers: [{ question: String, answer: String }],
  score: Number,
  feedback: String,
}, { timestamps: true });

export default mongoose.model("Interview", InterviewSchema);
// or alternatively:
// const Interview = mongoose.model("Interview", InterviewSchema);
// export default Interview;