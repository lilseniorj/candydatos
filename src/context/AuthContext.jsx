import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null)
  const [userType, setUserType]         = useState(null) // 'company' | 'candidate' | null
  const [userDoc, setUserDoc]           = useState(null)
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setFirebaseUser(null)
        setUserType(null)
        setUserDoc(null)
        setLoading(false)
        return
      }

      setFirebaseUser(fbUser)

      // Check both collections in parallel
      const [companySnap, candidateSnap] = await Promise.all([
        getDoc(doc(db, 'company_users', fbUser.uid)),
        getDoc(doc(db, 'candidates',    fbUser.uid)),
      ])

      if (companySnap.exists()) {
        setUserType('company')
        setUserDoc({ id: companySnap.id, ...companySnap.data() })
      } else if (candidateSnap.exists()) {
        setUserType('candidate')
        setUserDoc({ id: candidateSnap.id, ...candidateSnap.data() })
      } else {
        // New user — type not yet determined
        setUserType(null)
        setUserDoc(null)
      }

      setLoading(false)
    })

    return unsub
  }, [])

  const refreshUserDoc = async () => {
    if (!firebaseUser) return
    const col = userType === 'company' ? 'company_users' : 'candidates'
    const snap = await getDoc(doc(db, col, firebaseUser.uid))
    if (snap.exists()) setUserDoc({ id: snap.id, ...snap.data() })
  }

  return (
    <AuthContext.Provider value={{ firebaseUser, userType, userDoc, loading, refreshUserDoc }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
