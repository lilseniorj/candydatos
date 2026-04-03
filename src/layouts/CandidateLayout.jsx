import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { logoutUser } from '../services/auth'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from '../components/layout/ThemeToggle'
import LanguageToggle from '../components/layout/LanguageToggle'
import ProgressBar from '../components/ui/ProgressBar'
import logo from '/logo.png'

const navItems = (t) => [
  { to: '/candidate/profile',      label: t('candidate.profile.title'),      icon: '👤' },
  { to: '/candidate/resumes',      label: t('candidate.resume.title'),       icon: '📑' },
  { to: '/candidate/jobs',         label: t('candidate.jobs.title'),          icon: '🔍' },
  { to: '/candidate/applications', label: t('candidate.applications.title'),  icon: '📄' },
]

export default function CandidateLayout() {
  const { t } = useTranslation()
  const { userDoc, hasDualAccount, choosePortal } = useAuth()
  const navigate    = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    await logoutUser()
    navigate('/candidate/login')
  }

  const linkCls = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300'
        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
    }`

  const pct = userDoc?.profile_completion_pct ?? 0

  const Sidebar = () => (
    <nav className="flex flex-col h-full">
      <div className="px-4 py-5 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <img src={logo} alt="candydatos" className="h-7 w-auto" />
          <span className="font-bold text-gray-900 dark:text-white">candydatos</span>
        </div>
        <ProgressBar value={pct} label={t('candidate.profile.completion')} />
        {pct < 100 && (
          <p className="text-xs text-orange-500 mt-1">{t('candidate.profile.completeToApply')}</p>
        )}
      </div>
      <div className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems(t).map(item => (
          <NavLink key={item.to} to={item.to} className={linkCls} onClick={() => setMobileOpen(false)}>
            <span>{item.icon}</span>{item.label}
          </NavLink>
        ))}
      </div>
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 px-2 py-2 mb-2">
          {userDoc?.avatar_url ? (
            <img src={userDoc.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-200 dark:border-gray-700" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {userDoc?.first_name?.[0]?.toUpperCase() || 'C'}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {[userDoc?.first_name, userDoc?.last_name].filter(Boolean).join(' ') || userDoc?.email}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{pct}% {t('candidate.profile.completion').toLowerCase()}</p>
          </div>
        </div>
        {hasDualAccount && (
          <button onClick={() => { choosePortal('company'); navigate('/company/dashboard') }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors mb-1">
            <span className="text-base">🏢</span>
            {t('common.switchToCompany')}
          </button>
        )}
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
          </svg>
          {t('common.logout')}
        </button>
      </div>
    </nav>
  )

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shrink-0">
        <Sidebar />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-50 flex flex-col w-64 h-full bg-white dark:bg-gray-800">
            <Sidebar />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <button className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => setMobileOpen(true)}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {/* Mobile profile completion */}
          <div className="md:hidden flex-1 mx-4">
            <ProgressBar value={pct} />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto scrollbar-thin p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
