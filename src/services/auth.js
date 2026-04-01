import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

export async function registerCompanyUser(email, password, fullName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await setDoc(doc(db, 'company_users', cred.user.uid), {
    email,
    full_name: fullName,
    company_id: null,
    role: 'admin',
    created_at: serverTimestamp(),
  })
  return cred.user
}

export async function registerCandidate(email, password, fullName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  const [first_name, ...rest] = fullName.trim().split(' ')
  await setDoc(doc(db, 'candidates', cred.user.uid), {
    email,
    first_name,
    last_name: rest.join(' ') || '',
    phone: '',
    city: '',
    country: '',
    identification_type: '',
    identification_number: '',
    profile_completion_pct: 0,
    created_at: serverTimestamp(),
  })
  return cred.user
}

export const loginUser   = (email, password) => signInWithEmailAndPassword(auth, email, password)
export const logoutUser  = ()                => signOut(auth)
export const resetPassword = (email)         => sendPasswordResetEmail(auth, email)
