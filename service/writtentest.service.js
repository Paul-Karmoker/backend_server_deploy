import TestSession from '../model/writtenTest.js';
import { aiModel } from '../utils/writtenttestai.js';
import { questionGenSystemPrompt, gradingPrompt } from '../utils/promptTemplates.js';
import { tryParseJsonStrict } from '../utils/json.js';

/** Helper: throw if not active / expired */
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

/** AI call with minimal retry/parsing resilience */
async function callAIForQuestions(prompt) {
  const res = await aiModel.generateContent(prompt);
  const text = res.response.text();
  let parsed = tryParseJsonStrict(text);
  if (!parsed?.questions || parsed.questions.length !== 5) {
    // Retry once with a stricter instruction
    const retryPrompt = `${prompt}

IMPORTANT: Return ONLY valid JSON exactly as specified with an array "questions" of length 5.`;
    const res2 = await aiModel.generateContent(retryPrompt);
    const text2 = res2.response.text();
    parsed = tryParseJsonStrict(text2);
  }
  return parsed;
}

async function callAIForGrade(prompt) {
  const res = await aiModel.generateContent(prompt);
  const text = res.response.text();
  let parsed = tryParseJsonStrict(text);
  if (!parsed || typeof parsed.score !== 'number') {
    // Retry once
    const res2 = await aiModel.generateContent(`${prompt}

IMPORTANT: Return ONLY JSON with fields is_correct, score, feedback, corrected_answer.`);
    const text2 = res2.response.text();
    parsed = tryParseJsonStrict(text2);
  }
  return parsed;
}

/** Step 1: Prepare session with 5 questions */
export const initSession = async ({  jobTitle, experienceYears, skills = [], jobDescription, durationMinutes = 20 }) => {
  const prompt = questionGenSystemPrompt({ jobTitle, experienceYears, skills, jobDescription });
  const parsed = await callAIForQuestions(prompt);
  if (!parsed?.questions || parsed.questions.length !== 5) {
    throw new Error('AI question generation failed');
  }

  const questions = parsed.questions.map((q, i) => ({
    index: typeof q.index === 'number' ? q.index : i,
    question: q.question,
    idealAnswer: q.idealAnswer,
    topicTags: Array.isArray(q.topicTags) ? q.topicTags : [],
    difficulty: q.difficulty === 'easy' || q.difficulty === 'hard' ? q.difficulty : 'medium'
  }));

  const session = await TestSession.create({

    jobTitle,
    experienceYears,
    skills,
    jobDescription,
    durationMinutes,
    status: 'pending',
    questions
  });

  return session;
};

/** Step 2: Start session (begin timer) */
export const startSession = async (sessionId) => {
  const session = await TestSession.findById(sessionId);
  if (!session) throw new Error('Session not found');
  if (session.status !== 'pending') throw new Error('Session not pending');

  const now = new Date();
  session.startedAt = now;
  session.expiresAt = new Date(now.getTime() + session.durationMinutes * 60 * 1000);
  session.status = 'active';
  await session.save();
  return session;
};

/** Step 3: Get current question */
export const getCurrentQuestion = async (sessionId) => {
  const session = await TestSession.findById(sessionId);
  await ensureActiveAndNotExpired(session);

  if (session.currentQuestion >= session.questions.length) {
    throw new Error('All questions answered');
  }
  const q = session.questions[session.currentQuestion];
  const remainingMs = new Date(session.expiresAt).getTime() - Date.now();
  return {
    sessionId: session.id,
    index: q.index,
    question: q.question,
    total: session.questions.length,
    remainingSeconds: Math.max(0, Math.floor(remainingMs / 1000))
  };
};

/** Step 4: Submit answer for the current question */
export const submitAnswer = async ({ sessionId, answer }) => {
  const session = await TestSession.findById(sessionId);
  await ensureActiveAndNotExpired(session);

  const idx = session.currentQuestion;
  if (idx >= session.questions.length) throw new Error('No more questions');

  const q = session.questions[idx];

  // Grade via AI
  const prompt = gradingPrompt({ question: q.question, idealAnswer: q.idealAnswer, userAnswer: answer || '' });
  const graded = await callAIForGrade(prompt);

  if (!graded || typeof graded.score !== 'number') {
    throw new Error('AI grading failed');
  }

  q.userAnswer = answer || '';
  q.feedback = graded.feedback || '';
  q.isCorrect = !!graded.is_correct;
  q.score = graded.score === 1 ? 1 : 0;

  // recompute totalScore up to now
  session.totalScore = session.questions.reduce((sum, qq, i) => {
    if (i === idx) return sum + q.score;
    return sum + (qq.score || 0);
  }, 0);

  session.currentQuestion += 1;

  // Finish if last answered
  if (session.currentQuestion >= session.questions.length) {
    session.status = 'completed';
    session.completedAt = new Date();
  }

  await session.save();

  const remainingSeconds =
    session.expiresAt ? Math.max(0, Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000)) : 0;

  return {
    status: session.status,
    nextIndex: session.currentQuestion,
    total: session.questions.length,
    thisQuestion: {
      index: q.index,
      question: q.question,
      userAnswer: q.userAnswer,
      isCorrect: q.isCorrect,
      score: q.score,
      feedback: q.feedback,
      idealAnswer: q.idealAnswer
    },
    totalScore: session.totalScore,
    remainingSeconds
  };
};

/** Step 5: Get full result (and auto-expire if needed) */
export const getResult = async (sessionId) => {
  const session = await TestSession.findById(sessionId).populate();
  if (!session) throw new Error('Session not found');

  if (session.status === 'active' && session.expiresAt && Date.now() > new Date(session.expiresAt).getTime()) {
    session.status = 'expired';
    await session.save();
  }

  return session;
};

/** Timer fetch for UI countdown */
export const getRemainingTime = async (sessionId) => {
  const session = await TestSession.findById(sessionId);
  if (!session) throw new Error('Session not found');

  const remainingSeconds = session.expiresAt
    ? Math.max(0, Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000))
    : 0;

  return { status: session.status, remainingSeconds };
};
