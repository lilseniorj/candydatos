import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs,
  getDoc, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase/config'

export async function getTests() {
  const q    = query(collection(db, 'tests'), orderBy('created_at', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getTest(testId) {
  const snap = await getDoc(doc(db, 'tests', testId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function createTest(data) {
  const ref = await addDoc(collection(db, 'tests'), {
    ...data,
    created_at: serverTimestamp(),
  })
  return ref.id
}

export async function updateTest(testId, data) {
  await updateDoc(doc(db, 'tests', testId), data)
}

export async function deleteTest(testId) {
  await deleteDoc(doc(db, 'tests', testId))
}
