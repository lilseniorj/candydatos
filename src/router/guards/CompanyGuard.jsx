import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { CompanyProvider } from '../../context/CompanyContext'
import Spinner from '../../components/ui/Spinner'

export default function CompanyGuard() {
  const { firebaseUser, userType, userDoc, hasDualAccount, choosePortal, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>

  if (!firebaseUser) {
    sessionStorage.setItem('redirect_after_login', location.pathname)
    return <Navigate to="/login" replace />
  }

  // User has both accounts and is currently on candidate portal — auto-switch
  if (userType !== 'company' && hasDualAccount) {
    choosePortal('company')
  }

  if (userType === 'both') {
    sessionStorage.setItem('redirect_after_login', location.pathname)
    return <Navigate to="/choose-portal" replace />
  }

  if (userType !== 'company') {
    sessionStorage.setItem('redirect_after_login', location.pathname)
    return <Navigate to="/login" replace />
  }

  if (!userDoc?.company_id) return <Navigate to="/company/setup" replace />

  return (
    <CompanyProvider>
      <Outlet />
    </CompanyProvider>
  )
}
