import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

const googleProvider = new GoogleAuthProvider()

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

export const loginUser     = (email, password) => signInWithEmailAndPassword(auth, email, password)
export const logoutUser    = ()                => { sessionStorage.removeItem('portal_preference'); return signOut(auth) }
export const resetPassword = (email)         => sendPasswordResetEmail(auth, email)

/**
 * Sign in with Google. Portal type ('company' | 'candidate') determines
 * which Firestore doc gets created for first-time users.
 */
export async function signInWithGoogle(portal) {
  // Store portal preference so AuthContext routes correctly
  sessionStorage.setItem('portal_preference', portal)

  const cred = await signInWithPopup(auth, googleProvider)
  await ensureUserDoc(cred.user, portal)
  return cred.user
}

/**
 * Create the appropriate Firestore doc if it doesn't exist yet.
 */
export async function ensureUserDoc(user, portal) {
  if (!user || !portal) return

  if (portal === 'company') {
    const snap = await getDoc(doc(db, 'company_users', user.uid))
    if (!snap.exists()) {
      await setDoc(doc(db, 'company_users', user.uid), {
        email: user.email,
        full_name: user.displayName || user.email.split('@')[0],
        company_id: null,
        role: 'admin',
        created_at: serverTimestamp(),
      })
    }
  } else if (portal === 'candidate') {
    const snap = await getDoc(doc(db, 'candidates', user.uid))
    if (!snap.exists()) {
      const displayName = user.displayName || ''
      const [first_name, ...rest] = displayName.trim().split(' ')
      await setDoc(doc(db, 'candidates', user.uid), {
        email: user.email,
        first_name: first_name || '',
        last_name: rest.join(' ') || '',
        phone: user.phoneNumber || '',
        city: '',
        country: '',
        identification_type: '',
        identification_number: '',
        avatar_url: user.photoURL || '',
        profile_completion_pct: 0,
        created_at: serverTimestamp(),
      })
    }
  }

  // Keep portal_preference for AuthContext routing
}

// Keep old exports for backward compatibility with register pages
export const signInWithGoogleCompany   = () => signInWithGoogle('company')
export const signInWithGoogleCandidate = () => signInWithGoogle('candidate')
