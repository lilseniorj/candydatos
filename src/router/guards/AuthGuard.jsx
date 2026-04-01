// Redirects already-logged-in users away from auth pages
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../../components/ui/Spinner'

export default function AuthGuard({ portal }) {
  const { firebaseUser, userType, userDoc, loading } = useAuth()

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>

  if (firebaseUser && userType === portal) {
    if (portal === 'company') {
      return <Navigate to={userDoc?.company_id ? '/company/dashboard' : '/company/setup'} replace />
    }
    return <Navigate to="/candidate/profile" replace />
  }

  return <Outlet />
}
