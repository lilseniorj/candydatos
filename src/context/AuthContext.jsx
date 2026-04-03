import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null)
  const [userType, setUserType]         = useState(null) // 'company' | 'candidate' | 'both' | null
  const [userDoc, setUserDoc]           = useState(null)
  const [loading, setLoading]           = useState(true)
  // Store both docs when user has dual accounts
  const [_snaps, setSnaps]              = useState({ company: null, candidate: null })

  function resolveType(companySnap, candidateSnap) {
    const hasCompany   = companySnap?.exists()
    const hasCandidate = candidateSnap?.exists()
    const preferred    = sessionStorage.getItem('portal_preference')

    if (hasCompany && hasCandidate) {
      if (preferred === 'company')   return 'company'
      if (preferred === 'candidate') return 'candidate'
      return 'both' // No preference yet — ask the user
    }
    if (hasCompany)   return 'company'
    if (hasCandidate) return 'candidate'
    return null
  }

  function applyType(type, companySnap, candidateSnap) {
    setUserType(type)
    if (type === 'company') {
      setUserDoc({ id: companySnap.id, ...companySnap.data() })
    } else if (type === 'candidate') {
      setUserDoc({ id: candidateSnap.id, ...candidateSnap.data() })
    } else {
      setUserDoc(null)
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setFirebaseUser(null)
        setUserType(null)
        setUserDoc(null)
        setSnaps({ company: null, candidate: null })
        setLoading(false)
        return
      }

      setFirebaseUser(fbUser)

      const [companySnap, candidateSnap] = await Promise.all([
        getDoc(doc(db, 'company_users', fbUser.uid)),
        getDoc(doc(db, 'candidates',    fbUser.uid)),
      ])

      setSnaps({ company: companySnap, candidate: candidateSnap })
      const type = resolveType(companySnap, candidateSnap)
      applyType(type, companySnap, candidateSnap)
      setLoading(false)
    })

    return unsub
  }, [])

  const refreshUserDoc = useCallback(async () => {
    const user = firebaseUser || auth.currentUser
    if (!user) return

    const [companySnap, candidateSnap] = await Promise.all([
      getDoc(doc(db, 'company_users', user.uid)),
      getDoc(doc(db, 'candidates',    user.uid)),
    ])

    setSnaps({ company: companySnap, candidate: candidateSnap })
    setFirebaseUser(user)
    const type = resolveType(companySnap, candidateSnap)
    applyType(type, companySnap, candidateSnap)
  }, [firebaseUser])

  // Called from PortalChooser when user picks a portal
  const choosePortal = useCallback((portal) => {
    sessionStorage.setItem('portal_preference', portal)
    if (_snaps.company && _snaps.candidate) {
      applyType(portal, _snaps.company, _snaps.candidate)
    }
  }, [_snaps])

  const hasDualAccount = _snaps.company?.exists() && _snaps.candidate?.exists()

  return (
    <AuthContext.Provider value={{ firebaseUser, userType, userDoc, loading, refreshUserDoc, choosePortal, hasDualAccount }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
