import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc,
  query, where, orderBy, serverTimestamp, Timestamp, limit, startAfter,
} from 'firebase/firestore'
import { db } from '../firebase/config'

export async function createJob(companyId, data) {
  const ref = await addDoc(collection(db, 'job_offers'), {
    ...data,
    company_id: companyId,
    status: 'Active',
    created_at: serverTimestamp(),
    application_deadline: data.application_deadline
      ? Timestamp.fromDate(new Date(data.application_deadline))
      : null,
  })
  return ref.id
}

export async function updateJob(jobId, data) {
  const payload = { ...data }
  if (data.application_deadline)
    payload.application_deadline = Timestamp.fromDate(new Date(data.application_deadline))
  await updateDoc(doc(db, 'job_offers', jobId), payload)
}

export async function deleteJob(jobId) {
  await deleteDoc(doc(db, 'job_offers', jobId))
}

export async function getJobsByCompany(companyId) {
  const q    = query(collection(db, 'job_offers'), where('company_id', '==', companyId), orderBy('created_at', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getActiveJobs() {
  const q    = query(collection(db, 'job_offers'), where('status', '==', 'Active'), orderBy('created_at', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

const JOBS_PAGE_SIZE = 20

export async function getActiveJobsPaginated(lastDoc = null) {
  const constraints = [
    where('status', '==', 'Active'),
    orderBy('created_at', 'desc'),
    limit(JOBS_PAGE_SIZE),
  ]
  if (lastDoc) constraints.push(startAfter(lastDoc))

  const q    = query(collection(db, 'job_offers'), ...constraints)
  const snap = await getDocs(q)
  return {
    jobs:    snap.docs.map(d => ({ id: d.id, ...d.data() })),
    lastDoc: snap.docs[snap.docs.length - 1] || null,
    hasMore: snap.docs.length === JOBS_PAGE_SIZE,
  }
}

export async function getJob(jobId) {
  const snap = await getDoc(doc(db, 'job_offers', jobId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}
