import { asyncHandler } from '../middlewares/asyncHandler.js';
import * as svc from '../service/writtentest.service.js';
import { generatePDF } from '../utils/pdf.js';

export const initSession = asyncHandler(async (req, res) => {
  const {
    jobTitle,
    experienceYears,
    skills,
    jobDescription,
    durationMinutes
  } = req.body;

  const session = await svc.initSession({
    userId: req.user._id,          // ✅ FIX: userId from auth middleware
    jobTitle,
    experienceYears,
    skills,
    jobDescription,
    durationMinutes
  });

  res.status(201).json({
    sessionId: session.id,
    status: session.status,
    total: session.questions.length
  });
});

export const startSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const session = await svc.startSession(sessionId);

  res.json({
    sessionId: session.id,
    status: session.status,
    startedAt: session.startedAt,
    expiresAt: session.expiresAt
  });
});

export const getCurrent = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const q = await svc.getCurrentQuestion(sessionId);
  res.json(q);
});

export const submitAnswer = asyncHandler(async (req, res) => {
  const { sessionId, answer } = req.body;
  const data = await svc.submitAnswer({ sessionId, answer });
  res.json(data);
});

export const getResult = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const session = await svc.getResult(sessionId);
  res.json(session);
});

export const timeLeft = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const t = await svc.getRemainingTime(sessionId);
  res.json(t);
});

export const downloadPdf = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const session = await svc.getResult(sessionId);
  const pdfBuffer = await generatePDF(session);

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename=exam_${sessionId}.pdf`
  });

  res.send(pdfBuffer);
});
