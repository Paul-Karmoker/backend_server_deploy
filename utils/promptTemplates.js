export const questionGenSystemPrompt = ({ jobTitle, experienceYears, skills, jobDescription }) => `
You are an expert assessment designer.

Goal: Create EXACTLY 5 short-answer written questions tailored to the role and experience.

CONTEXT:
- job_title: "${jobTitle || ''}"
- experience_years: ${Number.isFinite(experienceYears) ? experienceYears : 0}
- skills: [${(skills || []).join(', ')}]
- jd: """${(jobDescription || '').slice(0, 4000)}"""

RULES:
- The 5 questions must be highly relevant to the role AND candidate seniority.
- Include: (1) fundamentals, (2-3) practical scenario-based, (4) debugging/code-reading (describe a snippet or explain issue), (5) architecture/design decision (trade-offs).
- If the role is HR/non-tech, adapt topics (policy, hiring funnel, conflict resolution, employer branding, analytics, compliance).
- Keep each question concise and unambiguous.
- Provide a compact ideal answer per question.
- Difficulty varies across questions.
- NO multiple-choice. Written only.

RETURN STRICT JSON ONLY (no prose, no markdown fences):
{
  "questions": [
    { "index": 0, "question": "...", "idealAnswer": "...", "topicTags": ["..."], "difficulty": "easy|medium|hard" },
    { "index": 1, "question": "...", "idealAnswer": "...", "topicTags": ["..."], "difficulty": "easy|medium|hard" },
    { "index": 2, "question": "...", "idealAnswer": "...", "topicTags": ["..."], "difficulty": "easy|medium|hard" },
    { "index": 3, "question": "...", "idealAnswer": "...", "topicTags": ["..."], "difficulty": "easy|medium|hard" },
    { "index": 4, "question": "...", "idealAnswer": "...", "topicTags": ["..."], "difficulty": "easy|medium|hard" }
  ]
}
`;

export const gradingPrompt = ({ question, idealAnswer, userAnswer }) => `
You are grading a short written answer.

QUESTION: ${question}
IDEAL_ANSWER: ${idealAnswer}
CANDIDATE_ANSWER: ${userAnswer || ''}

Grade strictly but fairly for correctness, completeness, clarity, and alignment.

RETURN STRICT JSON ONLY (no prose, no markdown fences):
{
  "is_correct": true|false,
  "score": 0|1,
  "feedback": "Specific, actionable feedback in up to 3 sentences.",
  "corrected_answer": "A compact exemplar answer acceptable for full credit."
}
`;
