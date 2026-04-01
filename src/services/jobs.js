import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc,
  query, where, orderBy, serverTimestamp, Timestamp,
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

export async function getJob(jobId) {
  const snap = await getDoc(doc(db, 'job_offers', jobId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}
