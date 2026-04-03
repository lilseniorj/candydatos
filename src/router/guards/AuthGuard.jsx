import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../../components/ui/Spinner'

function consumeRedirect(portalPrefix, fallback) {
  const saved = sessionStorage.getItem('redirect_after_login')
  if (saved?.startsWith(portalPrefix)) {
    sessionStorage.removeItem('redirect_after_login')
    return saved
  }
  return fallback
}

export default function AuthGuard({ portal }) {
  const { firebaseUser, userType, userDoc, loading } = useAuth()

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>

  if (firebaseUser) {
    if (userType === 'both') return <Navigate to="/choose-portal" replace />

    if (!portal || userType === portal) {
      if (userType === 'company') {
        const dest = userDoc?.company_id
          ? consumeRedirect('/company', '/company/dashboard')
          : '/company/setup'
        return <Navigate to={dest} replace />
      }
      if (userType === 'candidate') {
        return <Navigate to={consumeRedirect('/candidate', '/candidate/profile')} replace />
      }
    }
  }

  return <Outlet />
}
