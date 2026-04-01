import { GoogleGenerativeAI } from '@google/generative-ai'

const TAG = '[InterviewEval]'
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

/**
 * Evaluate the interview transcript and produce scores.
 * Uses the standard generateContent API (not Live).
 */
export async function evaluateInterview({ transcript, job, resumeData, fitScore, lang }) {
  console.info(TAG, `Evaluating interview — ${transcript.length} messages`)
  const langLabel = lang === 'es' ? 'Spanish' : 'English'

  const conversationText = transcript
    .map(m => `${m.role === 'assistant' ? 'Interviewer' : 'Candidate'}: ${m.text}`)
    .join('\n')

  const prompt = `You are an expert HR evaluator. Analyze the following live interview transcript and produce a detailed assessment.

IMPORTANT: Write ALL feedback in ${langLabel}.

INTERVIEW CONTEXT:
- Position: ${job.title}
- Required experience: ${job.years_experience_required} years
- Job description: ${job.description}
- Candidate skills: ${(resumeData.skills || []).join(', ')}
- Fit Score (from resume): ${fitScore}/100

TRANSCRIPT:
${conversationText || '(No transcript captured — the candidate may not have spoken)'}

EVALUATION CRITERIA:
1. Communication (0-100): Clarity, articulation, confidence in responses
2. Emotional Intelligence (0-100): Self-awareness, empathy, handling of emotional scenarios
3. Experience Relevance (0-100): How well their experience matches the role
4. Problem Solving (0-100): Analytical thinking, approach to challenges
5. Professionalism (0-100): Demeanor, preparation, engagement

Return ONLY a valid JSON object:
{
  "passed": true or false (true if overall score >= 50),
  "score": number 0-100 (weighted average),
  "feedback": "2-3 sentence constructive summary in ${langLabel}",
  "trait_scores": {
    "communication": number 0-100,
    "emotional_intelligence": number 0-100,
    "experience_relevance": number 0-100,
    "problem_solving": number 0-100,
    "professionalism": number 0-100
  }
}

Return ONLY valid JSON.`

  const start = performance.now()
  try {
    const result = await model.generateContent(prompt)
    const text   = result.response.text()
    const clean  = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const elapsed = (performance.now() - start).toFixed(0)
    console.info(TAG, `Evaluation complete (${elapsed} ms)`)
    return JSON.parse(clean)
  } catch (err) {
    console.error(TAG, 'Evaluation failed:', err)
    throw err
  }
}
