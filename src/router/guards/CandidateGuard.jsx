import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../../components/ui/Spinner'

export default function CandidateGuard() {
  const { firebaseUser, userType, loading } = useAuth()

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>
  if (!firebaseUser || userType !== 'candidate') return <Navigate to="/candidate/login" replace />

  return <Outlet />
}
