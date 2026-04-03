import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { signInWithGoogle } from '../../services/auth'
import { useAuth } from '../../context/AuthContext'
import GoogleButton from '../../components/ui/GoogleButton'
import Spinner from '../../components/ui/Spinner'

export default function UnifiedLogin() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { refreshUserDoc } = useAuth()
  const [selected, setSelected] = useState(null) // 'company' | 'candidate'
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleGoogle() {
    setError('')
    setLoading(true)
    try {
      await signInWithGoogle(selected)
      await refreshUserDoc()
      await new Promise(r => setTimeout(r, 500))
      const saved = sessionStorage.getItem('redirect_after_login')
      const prefix = selected === 'company' ? '/company' : '/candidate'
      const fallback = selected === 'company' ? '/company/dashboard' : '/candidate/profile'
      const dest = saved?.startsWith(prefix) ? saved : fallback
      sessionStorage.removeItem('redirect_after_login')
      navigate(dest, { replace: true })
    } catch (err) {
      setError(err.message || t('common.error'))
      setLoading(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('auth.signIn')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('auth.selectRole')}</p>
      </div>

      {/* Role selection */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => setSelected('company')}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
            selected === 'company'
              ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <span className="text-3xl">🏢</span>
          <span className={`text-sm font-semibold ${selected === 'company' ? 'text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300'}`}>
            {t('auth.company')}
          </span>
        </button>
        <button
          onClick={() => setSelected('candidate')}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
            selected === 'candidate'
              ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <span className="text-3xl">👤</span>
          <span className={`text-sm font-semibold ${selected === 'candidate' ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
            {t('auth.candidate')}
          </span>
        </button>
      </div>

      {/* Google button */}
      <div className={`transition-opacity ${selected ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
        <GoogleButton onClick={handleGoogle} label={t('auth.googleSignIn')} />
      </div>

      {error && <p className="text-sm text-red-500 text-center mt-4">{error}</p>}

      <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-6">
        {t('auth.noAccount')}{' '}
        <Link
          to={selected === 'candidate' ? '/candidate/register' : '/company/register'}
          className={`hover:underline font-medium ${selected === 'candidate' ? 'text-green-500' : 'text-brand-500'}`}
        >
          {t('auth.signUp')}
        </Link>
      </p>
      <p className="text-sm text-center mt-2">
        <Link to="/" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">&larr; {t('common.back')}</Link>
      </p>
    </div>
  )
}
