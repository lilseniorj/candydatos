import {
  collection, doc, addDoc, deleteDoc, getDocs,
  query, where, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from '../firebase/config'
import { extractResumeData } from './gemini'

export async function uploadResume(candidateId, file, name) {
  // 1. Upload file to Firebase Storage
  const storageRef    = ref(storage, `resumes/${candidateId}/${Date.now()}_${file.name}`)
  await uploadBytes(storageRef, file)
  const document_url  = await getDownloadURL(storageRef)
  const storage_path  = storageRef.fullPath

  // 2. Try Gemini analysis — resume is still saved even if AI fails
  let extracted_data = {}
  let suggestions    = []
  try {
    const base64 = await fileToBase64(file)
    const result = await extractResumeData(base64, file.type)
    extracted_data = result.extracted_data ?? {}
    suggestions    = result.suggestions    ?? []
  } catch (err) {
    console.warn('[Resumes] Gemini analysis failed — continuing without AI data:', err?.message || err)
  }

  // 3. Save to Firestore
  const docRef = await addDoc(collection(db, 'candidate_resumes'), {
    candidate_id: candidateId,
    name,
    document_url,
    storage_path,
    extracted_data,
    suggestions,
    created_at:  serverTimestamp(),
    updated_at:  serverTimestamp(),
  })

  // Return all fields needed by the UI immediately (no re-fetch required)
  return { id: docRef.id, name, document_url, storage_path, extracted_data, suggestions }
}

export async function getResumesByCandidate(candidateId) {
  const q    = query(collection(db, 'candidate_resumes'), where('candidate_id', '==', candidateId), orderBy('created_at', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function deleteResume(resumeId, storagePath) {
  await deleteDoc(doc(db, 'candidate_resumes', resumeId))
  if (storagePath) {
    try { await deleteObject(ref(storage, storagePath)) } catch (_) {}
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload  = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
  })
}
