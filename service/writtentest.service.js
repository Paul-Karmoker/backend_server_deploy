import TestSession from '../model/writtenTest.js';
import { generateAIText } from '../utils/writtenttestai.js';
import { questionGenSystemPrompt, gradingPrompt } from '../utils/promptTemplates.js';
import { tryParseJsonStrict } from '../utils/json.js';

/** Helper */
async function ensureActiveAndNotExpired(session) {
  if (!session) throw new Error('Session not found');
  if (session.status === 'completed') throw new Error('Session already completed');
  if (session.status === 'expired') throw new Error('Session expired');
  if (session.status !== 'active') throw new Error('Session not active');

  if (session.expiresAt && Date.now() > new Date(session.expiresAt).getTime()) {
    session.status = 'expired';
    await session.save();
    throw new Error('Time is over. Session expired');
  }
}

/** AI helpers */
async function callAIForQuestions(prompt) {
  let text = await generateAIText(prompt);
  let parsed = tryParseJsonStrict(text);

  if (!parsed?.questions || parsed.questions.length !== 5) {
    text = await generateAIText(`${prompt}
IMPORTANT: Return ONLY valid JSON with array "questions" of length 5.`);
    parsed = tryParseJsonStrict(text);
  }
  return parsed;
}

async function callAIForGrade(prompt) {
  let text = await generateAIText(prompt);
  let parsed = tryParseJsonStrict(text);

  if (!parsed || typeof parsed.score !== 'number') {
    text = await generateAIText(`${prompt}
IMPORTANT: Return ONLY JSON with fields is_correct, score, feedback, corrected_answer.`);
    parsed = tryParseJsonStrict(text);
  }
  return parsed;
}

/** Step 1: Init session */
export const initSession = async ({
  userId,
  jobTitle,
  experienceYears,
  skills = [],
  jobDescription,
  durationMinutes = 20
}) => {
  if (!userId) throw new Error('userId is required');

  const prompt = questionGenSystemPrompt({
    jobTitle,
    experienceYears,
    skills,
    jobDescription
  });

  const parsed = await callAIForQuestions(prompt);
  if (!parsed?.questions || parsed.questions.length !== 5) {
    throw new Error('AI question generation failed');
  }

  const questions = parsed.questions.map((q, i) => ({
    index: typeof q.index === 'number' ? q.index : i,
    question: q.question,
    idealAnswer: q.idealAnswer,
    topicTags: Array.isArray(q.topicTags) ? q.topicTags : [],
    difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty)
      ? q.difficulty
      : 'medium'
  }));

  return TestSession.create({
    userId,
    jobTitle,
    experienceYears,
    skills,
    jobDescription,
    durationMinutes,
    status: 'pending',
    questions
  });
};

/** Step 2: Start session */
export const startSession = async (sessionId) => {
  const session = await TestSession.findById(sessionId);
  if (!session) throw new Error('Session not found');
  if (session.status !== 'pending') throw new Error('Session not pending');

  const now = new Date();
  session.startedAt = now;
  session.expiresAt = new Date(now.getTime() + session.durationMinutes * 60000);
  session.status = 'active';

  await session.save();
  return session;
};

/** Step 3: Get current question */
export const getCurrentQuestion = async (sessionId) => {
  const session = await TestSession.findById(sessionId);
  await ensureActiveAndNotExpired(session);

  const q = session.questions[session.currentQuestion];
  const remainingSeconds = Math.max(
    0,
    Math.floor((session.expiresAt.getTime() - Date.now()) / 1000)
  );

  return {
    sessionId: session.id,
    index: q.index,
    question: q.question,
    total: session.questions.length,
    remainingSeconds
  };
};

/** Step 4: Submit answer */
export const submitAnswer = async ({ sessionId, answer }) => {
  const session = await TestSession.findById(sessionId);
  await ensureActiveAndNotExpired(session);

  const q = session.questions[session.currentQuestion];

  const prompt = gradingPrompt({
    question: q.question,
    idealAnswer: q.idealAnswer,
    userAnswer: answer || ''
  });

  const graded = await callAIForGrade(prompt);

  q.userAnswer = answer || '';
  q.feedback = graded.feedback || '';
  q.isCorrect = !!graded.is_correct;
  q.score = graded.score === 1 ? 1 : 0;

  session.totalScore += q.score;
  session.currentQuestion += 1;

  if (session.currentQuestion >= session.questions.length) {
    session.status = 'completed';
    session.completedAt = new Date();
  }

  await session.save();
  return session;
};

export const getResult = async (sessionId) => {
  const session = await TestSession.findById(sessionId)
    .populate('userId', 'name email');

  if (!session) throw new Error('Session not found');
  return session;
};
