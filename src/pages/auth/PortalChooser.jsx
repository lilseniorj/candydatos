import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { logoutUser } from '../../services/auth'

export default function PortalChooser() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { choosePortal, firebaseUser } = useAuth()

  function handleChoose(portal) {
    choosePortal(portal)
    const saved = sessionStorage.getItem('redirect_after_login')
    const prefix = portal === 'company' ? '/company' : '/candidate'
    const fallback = portal === 'company' ? '/company/dashboard' : '/candidate/profile'

    let dest = fallback
    if (saved?.startsWith(prefix)) {
      dest = saved
      sessionStorage.removeItem('redirect_after_login')
    }
    navigate(dest, { replace: true })
  }

  async function handleLogout() {
    sessionStorage.removeItem('portal_preference')
    sessionStorage.removeItem('redirect_after_login')
    await logoutUser()
    navigate('/', { replace: true })
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('auth.choosePortal')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {t('auth.choosePortalDesc', { email: firebaseUser?.email })}
        </p>
      </div>

      <div className="space-y-3">
        <button onClick={() => handleChoose('company')}
          className="w-full flex items-center gap-4 p-5 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-brand-500 dark:hover:border-brand-500 bg-white dark:bg-gray-800 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-2xl shrink-0">🏢</div>
          <div className="text-left">
            <p className="font-semibold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400">{t('auth.enterAsCompany')}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('auth.enterAsCompanyDesc')}</p>
          </div>
          <svg className="w-5 h-5 text-gray-400 group-hover:text-brand-500 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button onClick={() => handleChoose('candidate')}
          className="w-full flex items-center gap-4 p-5 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 bg-white dark:bg-gray-800 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-2xl shrink-0">👤</div>
          <div className="text-left">
            <p className="font-semibold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400">{t('auth.enterAsCandidate')}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('auth.enterAsCandidateDesc')}</p>
          </div>
          <svg className="w-5 h-5 text-gray-400 group-hover:text-green-500 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <button onClick={handleLogout}
        className="w-full mt-6 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
        {t('common.logout')}
      </button>
    </div>
  )
}
