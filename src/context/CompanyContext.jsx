import { createContext, useContext, useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from './AuthContext'

const CompanyContext = createContext(null)

export function CompanyProvider({ children }) {
  const { userDoc } = useAuth()
  const [company, setCompany]           = useState(null)
  const [companyLoading, setCompanyLoading] = useState(true)

  useEffect(() => {
    if (!userDoc?.company_id) {
      setCompany(null)
      setCompanyLoading(false)
      return
    }

    const unsub = onSnapshot(doc(db, 'companies', userDoc.company_id), (snap) => {
      if (snap.exists()) {
        setCompany({ id: snap.id, ...snap.data() })
      }
      setCompanyLoading(false)
    })

    return unsub
  }, [userDoc?.company_id])

  return (
    <CompanyContext.Provider value={{ company, companyLoading, currentUserRole: userDoc?.role }}>
      {children}
    </CompanyContext.Provider>
  )
}

export const useCompany = () => useContext(CompanyContext)
