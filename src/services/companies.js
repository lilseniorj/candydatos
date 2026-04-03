import {
  doc, setDoc, updateDoc, serverTimestamp, getDoc,
  collection, addDoc, query, where, getDocs, orderBy,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { sendInvitationEmail } from './notifications'

export async function createCompany(uid, data) {
  const ref = doc(collection(db, 'companies'))
  await setDoc(ref, { ...data, created_at: serverTimestamp() })
  await updateDoc(doc(db, 'company_users', uid), { company_id: ref.id })
  return ref.id
}

export async function getCompany(companyId) {
  const snap = await getDoc(doc(db, 'companies', companyId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function updateCompany(companyId, data) {
  await updateDoc(doc(db, 'companies', companyId), data)
}

export async function sendInvitation(companyId, invitedBy, email, role, { companyName, invitedByName } = {}) {
  await addDoc(collection(db, 'company_invitations'), {
    company_id: companyId,
    invited_by: invitedBy,
    email,
    role,
    status: 'Pending',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    created_at: serverTimestamp(),
  })

  if (companyName) {
    await sendInvitationEmail({ email, companyName, role, invitedByName: invitedByName || 'Tu equipo' })
  }
}

export async function getPendingInvitations(email) {
  const q = query(
    collection(db, 'company_invitations'),
    where('email', '==', email),
    where('status', '==', 'Pending')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getCompanyUsers(companyId) {
  const q    = query(collection(db, 'company_users'), where('company_id', '==', companyId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))
}

export async function acceptInvitation(invitationId, uid, companyId, role) {
  await updateDoc(doc(db, 'company_invitations', invitationId), { status: 'Accepted' })
  await updateDoc(doc(db, 'company_users', uid), { company_id: companyId, role })
}
