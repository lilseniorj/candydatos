import {
  collection, doc, addDoc, updateDoc, getDocs,
  query, where, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase/config'

export async function getOrCreateDraftApplication(candidateId, jobOfferId) {
  const q    = query(
    collection(db, 'applications'),
    where('candidate_id', '==', candidateId),
    where('job_offer_id', '==', jobOfferId),
  )
  const snap = await getDocs(q)
  if (!snap.empty) {
    const d = snap.docs[0]
    return { id: d.id, ...d.data() }
  }
  const ref = await addDoc(collection(db, 'applications'), {
    candidate_id: candidateId,
    job_offer_id: jobOfferId,
    resume_id: null,
    status: 'Draft',
    current_step: 'cv_selection',
    fit_check: null,
    reviewer_id: null,
    feedback_to_candidate: null,
    applied_at: null,
    updated_at: serverTimestamp(),
  })
  return { id: ref.id, candidate_id: candidateId, job_offer_id: jobOfferId, status: 'Draft', current_step: 'cv_selection' }
}

export async function updateApplication(appId, data) {
  await updateDoc(doc(db, 'applications', appId), { ...data, updated_at: serverTimestamp() })
}

export async function submitApplication(appId) {
  await updateDoc(doc(db, 'applications', appId), {
    status: 'Pending',
    current_step: 'submitted',
    applied_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  })
}

export async function getApplicationsByCandidate(candidateId) {
  const q    = query(collection(db, 'applications'), where('candidate_id', '==', candidateId), orderBy('updated_at', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getApplicationsByJob(jobOfferId) {
  const q    = query(collection(db, 'applications'), where('job_offer_id', '==', jobOfferId), orderBy('applied_at', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function updateApplicationStatus(appId, status, feedback = null) {
  const payload = { status, updated_at: serverTimestamp() }
  if (feedback !== null) payload.feedback_to_candidate = feedback
  await updateDoc(doc(db, 'applications', appId), payload)
}

export async function assignReviewer(appId, reviewerId) {
  await updateDoc(doc(db, 'applications', appId), {
    reviewer_id: reviewerId,
    updated_at:  serverTimestamp(),
  })
}
