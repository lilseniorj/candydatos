import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { CompanyProvider } from '../../context/CompanyContext'
import Spinner from '../../components/ui/Spinner'

export default function CompanyGuard() {
  const { firebaseUser, userType, userDoc, loading } = useAuth()

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>
  if (!firebaseUser || userType !== 'company') return <Navigate to="/company/login" replace />
  if (!userDoc?.company_id) return <Navigate to="/company/setup" replace />

  return (
    <CompanyProvider>
      <Outlet />
    </CompanyProvider>
  )
}
