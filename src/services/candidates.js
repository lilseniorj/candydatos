import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import { computeProfileCompletion } from '../utils/profileCompletion'

export async function getCandidate(uid) {
  const snap = await getDoc(doc(db, 'candidates', uid))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function updateCandidateProfile(uid, data, resumeCount) {
  const pct = computeProfileCompletion(data, resumeCount)
  await updateDoc(doc(db, 'candidates', uid), {
    ...data,
    profile_completion_pct: pct,
    updated_at: serverTimestamp(),
  })
  return pct
}
