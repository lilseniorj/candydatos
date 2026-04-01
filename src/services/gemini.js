import { GoogleGenerativeAI } from '@google/generative-ai'

const TAG = '[Gemini]'
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY

if (!API_KEY) {
  console.error(TAG, 'VITE_GEMINI_API_KEY is not set — all Gemini calls will fail')
} else {
  console.info(TAG, 'API key loaded', `(${API_KEY.slice(0, 6)}…${API_KEY.slice(-4)})`)
}

const genAI = new GoogleGenerativeAI(API_KEY || 'missing-key')
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

/**
 * Validate that the Gemini API key is configured and the service is reachable.
 * Returns { ok: true } or { ok: false, error: string }.
 */
export async function validateGeminiConnection() {
  console.info(TAG, 'Validating Gemini connection…')

  if (!API_KEY) {
    const msg = 'VITE_GEMINI_API_KEY is not configured'
    console.error(TAG, 'Validation FAILED:', msg)
    return { ok: false, error: msg }
  }

  try {
    const start = performance.now()
    const result = await model.generateContent('Reply with the single word OK')
    const text = result.response.text().trim()
    const elapsed = (performance.now() - start).toFixed(0)
    console.info(TAG, `Validation OK — response: "${text}" (${elapsed} ms)`)
    return { ok: true, latency: Number(elapsed) }
  } catch (err) {
    const msg = err?.message || String(err)
    console.error(TAG, 'Validation FAILED:', msg)
    return { ok: false, error: msg }
  }
}

const MAX_RETRIES = 3

async function ask(prompt, attempt = 1) {
  const label = prompt.slice(0, 60).replace(/\n/g, ' ').trim()
  console.info(TAG, `ask() attempt ${attempt}/${MAX_RETRIES} — "${label}…"`)
  const start = performance.now()

  try {
    const result = await model.generateContent(prompt)
    const text   = result.response.text()
    const clean  = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const elapsed = (performance.now() - start).toFixed(0)
    console.info(TAG, `ask() success (${elapsed} ms) — response length: ${clean.length} chars`)
    console.debug(TAG, 'Raw response:', clean.slice(0, 200))
    return JSON.parse(clean)
  } catch (err) {
    const elapsed = (performance.now() - start).toFixed(0)
    const status  = err?.status ?? err?.httpCode
    console.error(TAG, `ask() FAILED after ${elapsed} ms:`, err?.message || err)
    console.error(TAG, 'Status:', status, '| Code:', err?.code)

    // Retry on 429 (rate limit) or 503 (overloaded) with exponential backoff
    const retryable = String(err?.message).includes('429') || String(err?.message).includes('503') || status === 429 || status === 503
    if (retryable && attempt < MAX_RETRIES) {
      const delay = Math.pow(2, attempt) * 1000 // 2s, 4s
      console.info(TAG, `Retrying in ${delay} ms…`)
      await new Promise(r => setTimeout(r, delay))
      return ask(prompt, attempt + 1)
    }
    throw err
  }
}

// ─── Resume helpers ──────────────────────────────────────────────────────────

export async function extractResumeData(base64Data, mimeType) {
  console.info(TAG, `extractResumeData() called — mimeType: ${mimeType}, data length: ${base64Data.length} chars`)
  const start = performance.now()

  const prompt = `
You are an expert HR assistant. Analyze the following résumé document and return ONLY a valid JSON object with this exact structure:
{
  "extracted_data": {
    "full_name": "string",
    "email": "string",
    "phone": "string",
    "skills": ["string"],
    "experience": [{ "title": "string", "company": "string", "years": "string" }],
    "education": [{ "degree": "string", "institution": "string" }],
    "summary": "string"
  },
  "suggestions": ["string", "string", "string"]
}
The suggestions array should contain 3–5 specific, actionable improvements for this résumé.
Return ONLY valid JSON, no extra text.
`
  try {
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Data, mimeType } },
    ])
    const text  = result.response.text()
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const elapsed = (performance.now() - start).toFixed(0)
    console.info(TAG, `extractResumeData() success (${elapsed} ms)`)
    return JSON.parse(clean)
  } catch (err) {
    const elapsed = (performance.now() - start).toFixed(0)
    console.error(TAG, `extractResumeData() FAILED after ${elapsed} ms:`, err?.message || err)
    throw err
  }
}

export async function checkFit(extractedData, jobOffer, lang = 'es') {
  console.info(TAG, `checkFit() called — job: "${jobOffer?.title}", candidate skills: ${extractedData?.skills?.length ?? 0}, lang: ${lang}`)
  const langLabel = lang === 'es' ? 'Spanish' : 'English'
  return ask(`
You are an expert recruiter. Given the following candidate profile and job offer, perform a detailed evaluation.

IMPORTANT: Write ALL text in ${langLabel}.

Return ONLY a valid JSON object with this EXACT structure:
{
  "passed": true or false,
  "score": number 0-100 (overall fit score),
  "feedback": "Brief 1-2 sentence summary of the evaluation in ${langLabel}.",
  "experience_score": number 0-100,
  "experience_note": "One sentence about how the candidate's experience aligns in ${langLabel}.",
  "skills_score": number 0-100,
  "skills_matched": ["skill1", "skill2"],
  "skills_missing": ["skill1", "skill2"],
  "education_score": number 0-100,
  "education_note": "One sentence about education fit in ${langLabel}.",
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["suggestion1", "suggestion2"]
}

RULES:
- skills_matched: skills the candidate HAS that are relevant to the job (max 6)
- skills_missing: skills the job NEEDS that the candidate LACKS (max 4)
- strengths: 2-3 key strengths of this candidate for this role
- improvements: 1-2 constructive suggestions to improve their fit
- If the candidate profile is empty or has no data, still return the structure with 0 scores and helpful notes explaining what information is missing

CANDIDATE PROFILE:
${JSON.stringify(extractedData, null, 2)}

JOB OFFER:
Title: ${jobOffer.title}
Description: ${jobOffer.description}
Years of experience required: ${jobOffer.years_experience_required}
Required skills (from description): infer from description above

Return ONLY valid JSON.
`)
}

// ─── Dynamic test generation ─────────────────────────────────────────────────

/**
 * Generate questions for a psychometric test using Gemini.
 * @param {'big_five'|'emotional_intelligence'} testType
 * @param {string} jobTitle   – title of the job offer for context
 * @param {string} lang       – 'es' | 'en'
 * @param {string} [extra]    – optional custom instructions from the company
 */
export async function generateTestQuestions(testType, jobTitle, lang = 'es', extra = '') {
  console.info(TAG, `generateTestQuestions() called — type: ${testType}, job: "${jobTitle}", lang: ${lang}`)
  const langLabel = lang === 'es' ? 'Spanish' : 'English'

  if (testType === 'big_five') {
    return ask(`
You are an expert organizational psychologist. Generate exactly 10 Big Five (OCEAN) personality statements for a candidate applying to a "${jobTitle}" position.
${extra ? `Additional context from the company: ${extra}` : ''}

RULES:
- 2 statements per trait: openness, conscientiousness, extraversion, agreeableness, neuroticism
- Each statement is rated on a 1–5 Likert scale (Strongly Disagree → Strongly Agree)
- Statements must be professional, clear, and job-relevant
- Write everything in ${langLabel}

Return ONLY a valid JSON object:
{
  "questions": [
    { "id": "q1",  "text": "statement text", "trait": "openness" },
    { "id": "q2",  "text": "statement text", "trait": "openness" },
    { "id": "q3",  "text": "statement text", "trait": "conscientiousness" },
    { "id": "q4",  "text": "statement text", "trait": "conscientiousness" },
    { "id": "q5",  "text": "statement text", "trait": "extraversion" },
    { "id": "q6",  "text": "statement text", "trait": "extraversion" },
    { "id": "q7",  "text": "statement text", "trait": "agreeableness" },
    { "id": "q8",  "text": "statement text", "trait": "agreeableness" },
    { "id": "q9",  "text": "statement text", "trait": "neuroticism" },
    { "id": "q10", "text": "statement text", "trait": "neuroticism" }
  ]
}
Return ONLY valid JSON.
`)
  }

  // emotional_intelligence
  return ask(`
You are an expert psychologist specializing in Emotional Intelligence (EI). Generate exactly 5 realistic workplace scenarios for a candidate applying to a "${jobTitle}" position.
${extra ? `Additional context from the company: ${extra}` : ''}

RULES:
- 1 scenario per EI dimension: self_awareness, self_regulation, motivation, empathy, social_skills
- Each scenario has 4 options (A–D) ranging from low to high EI
- Situations must feel realistic and be relevant to the role
- Write everything in ${langLabel}

Return ONLY a valid JSON object:
{
  "questions": [
    {
      "id": "s1",
      "situation": "2–3 sentence workplace scenario",
      "question": "What would you do?",
      "options": [
        { "key": "A", "text": "option A" },
        { "key": "B", "text": "option B" },
        { "key": "C", "text": "option C" },
        { "key": "D", "text": "option D" }
      ],
      "dimension": "self_awareness"
    }
  ]
}
Return ONLY valid JSON.
`)
}

// ─── Dynamic test evaluation ─────────────────────────────────────────────────

/**
 * Evaluate completed test answers using Gemini.
 * Returns a result compatible with saveTestResult.
 */
export async function evaluateTestAnswers(testType, testName, questions, answers) {
  console.info(TAG, `evaluateTestAnswers() called — type: ${testType}, test: "${testName}", questions: ${questions?.length}, answers: ${Object.keys(answers || {}).length}`)
  if (testType === 'big_five') {
    const lines = questions.map(q =>
      `Trait: ${q.trait} | Statement: "${q.text}" | Rating: ${answers[q.id] ?? 3}/5`
    ).join('\n')

    return ask(`
You are an expert organizational psychologist. Evaluate the following Big Five personality assessment for a "${testName}" test.

RESPONSES (Likert 1-5, 1 = Strongly Disagree, 5 = Strongly Agree):
${lines}

Return ONLY a valid JSON object:
{
  "passed": true or false (true if overall profile is healthy — no extreme imbalance),
  "score": number 0–100 (overall personality balance score),
  "feedback": "constructive narrative summary of strengths and areas for growth (2–3 sentences)",
  "trait_scores": {
    "openness": number 0–100,
    "conscientiousness": number 0–100,
    "extraversion": number 0–100,
    "agreeableness": number 0–100,
    "neuroticism": number 0–100
  }
}
Return ONLY valid JSON.
`)
  }

  // emotional_intelligence
  const lines = questions.map(q =>
    `Dimension: ${q.dimension}\nSituation: "${q.situation}"\nChosen: ${answers[q.id]}\nOptions: ${q.options.map(o => `${o.key}: ${o.text}`).join(' | ')}`
  ).join('\n\n')

  return ask(`
You are an expert psychologist specializing in Emotional Intelligence. Evaluate the following EI assessment for a "${testName}" test.

RESPONSES:
${lines}

Return ONLY a valid JSON object:
{
  "passed": true or false (true if score >= 50),
  "score": number 0–100 (overall EI score),
  "feedback": "constructive narrative about EI strengths and development areas (2–3 sentences)",
  "trait_scores": {
    "self_awareness": number 0–100,
    "self_regulation": number 0–100,
    "motivation": number 0–100,
    "empathy": number 0–100,
    "social_skills": number 0–100
  }
}
Return ONLY valid JSON.
`)
}

// ─── Legacy helper (still used by old tests without a type) ──────────────────

export async function evaluateTest(testName, instructions, answers) {
  console.info(TAG, `evaluateTest() [legacy] called — test: "${testName}", answers: ${Object.keys(answers || {}).length}`)
  return ask(`
You are an expert psychologist and HR assessor. Evaluate the following test responses.
Return ONLY a valid JSON object with this structure:
{
  "passed": true or false,
  "score": number between 0 and 100,
  "feedback": "string with a constructive narrative summary",
  "trait_scores": {
    "openness": number 0-100,
    "conscientiousness": number 0-100,
    "extraversion": number 0-100,
    "agreeableness": number 0-100,
    "neuroticism": number 0-100
  }
}

TEST: ${testName}
INSTRUCTIONS: ${instructions}

ANSWERS:
${JSON.stringify(answers, null, 2)}

Return ONLY valid JSON.
`)
}
