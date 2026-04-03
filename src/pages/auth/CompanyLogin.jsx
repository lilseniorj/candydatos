import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { signInWithGoogleCompany } from '../../services/auth'
import { useAuth } from '../../context/AuthContext'
import GoogleButton from '../../components/ui/GoogleButton'
import Spinner from '../../components/ui/Spinner'

export default function CompanyLogin() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { refreshUserDoc } = useAuth()
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleGoogle() {
    setError('')
    setLoading(true)
    try {
      await signInWithGoogleCompany()
      await refreshUserDoc()
      // Small delay to let AuthContext pick up the new userDoc
      await new Promise(r => setTimeout(r, 500))
      navigate('/company/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || t('common.error'))
      setLoading(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-900/40 mb-4">🏢</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('auth.signIn')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('landing.portals.company.title')}</p>
      </div>

      <GoogleButton onClick={handleGoogle} label={t('auth.googleSignIn')} />

      {error && <p className="text-sm text-red-500 text-center mt-4">{error}</p>}

      <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-6">
        {t('auth.noAccount')}{' '}
        <Link to="/company/register" className="text-brand-500 hover:underline font-medium">{t('auth.signUp')}</Link>
      </p>
      <p className="text-sm text-center mt-2">
        <Link to="/" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">&larr; {t('common.back')}</Link>
      </p>
    </div>
  )
}
