import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'

/**
 * Save test result.  Both Big Five and EI tests return trait_scores —
 * Big Five: { openness, conscientiousness, extraversion, agreeableness, neuroticism }
 * EI:      { self_awareness, self_regulation, motivation, empathy, social_skills }
 */
export async function saveTestResult(applicationId, testId, geminiResult) {
  const { score, feedback, passed, trait_scores } = geminiResult
  await addDoc(collection(db, 'test_results'), {
    application_id: applicationId,
    test_id:        testId,
    score,
    trait_scores:   trait_scores ?? {},
    gemini_evaluation: { passed, score, feedback },
    completed_at:   serverTimestamp(),
  })
}

export async function getTestResultsByApplication(applicationId) {
  const q    = query(collection(db, 'test_results'), where('application_id', '==', applicationId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
