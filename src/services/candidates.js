import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import { computeProfileCompletion } from '../utils/profileCompletion'

export async function updateCandidateProfile(uid, data, resumeCount) {
  const pct = computeProfileCompletion(data, resumeCount)
  await updateDoc(doc(db, 'candidates', uid), {
    ...data,
    profile_completion_pct: pct,
    updated_at: serverTimestamp(),
  })
  return pct
}
