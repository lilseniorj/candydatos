import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../../components/ui/Spinner'

export default function CandidateGuard() {
  const { firebaseUser, userType, hasDualAccount, choosePortal, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>

  if (!firebaseUser) {
    sessionStorage.setItem('redirect_after_login', location.pathname)
    return <Navigate to="/login" replace />
  }

  // User has both accounts and is currently on company portal — auto-switch
  if (userType !== 'candidate' && hasDualAccount) {
    choosePortal('candidate')
    return <Outlet />
  }

  if (userType === 'both') {
    sessionStorage.setItem('redirect_after_login', location.pathname)
    return <Navigate to="/choose-portal" replace />
  }

  if (userType !== 'candidate') {
    sessionStorage.setItem('redirect_after_login', location.pathname)
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
