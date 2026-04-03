import { useState, useCallback } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { logoutUser } from '../services/auth'
import { useAuth } from '../context/AuthContext'
import { useCompany } from '../context/CompanyContext'
import ThemeToggle from '../components/layout/ThemeToggle'
import LanguageToggle from '../components/layout/LanguageToggle'
import useSwipeDrawer from '../hooks/useSwipeDrawer'
import logo from '/logo.png'

const navItems = (t) => [
  { to: '/company/dashboard', label: t('company.dashboard.title'),  icon: '▦' },
  { to: '/company/jobs',      label: t('company.jobs.title'),       icon: '📋' },
  { to: '/company/analytics', label: t('company.analytics.title'),  icon: '📊' },
  { to: '/company/skills',    label: t('company.skills.title'),     icon: '🎯' },
  { to: '/company/settings',  label: t('company.settings.title'),   icon: '⚙️' },
]

export default function CompanyLayout() {
  const { t } = useTranslation()
  const { company } = useCompany()
  const { userDoc, hasDualAccount, choosePortal } = useAuth()
  const navigate     = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const setMobileOpenCb = useCallback((v) => setMobileOpen(v), [])
  useSwipeDrawer(mobileOpen, setMobileOpenCb)

  async function handleLogout() {
    await logoutUser()
    navigate('/company/login')
  }

  const linkCls = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300'
        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
    }`

  const Sidebar = () => (
    <nav aria-label="Company navigation" className="flex flex-col h-full">
      <div className="px-4 py-5 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <img src={logo} alt="candydatos" className="h-7 w-auto" />
          <span className="font-bold text-gray-900 dark:text-white">candydatos</span>
        </div>
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
          {company?.logo_url ? (
            <img src={company.logo_url} alt={company.commercial_name} className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-200 dark:border-gray-700" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {company?.commercial_name?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{company?.commercial_name || userDoc?.full_name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userDoc?.role}</p>
          </div>
        </div>
        {hasDualAccount && (
          <button onClick={() => { choosePortal('candidate'); navigate('/candidate/profile') }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors mb-1">
            <span className="text-base">👤</span>
            {t('common.switchToCandidate')}
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
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile sidebar with slide transition */}
      <div className={`fixed inset-0 z-40 md:hidden transition-opacity duration-300 ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
        <aside className={`relative z-50 flex flex-col w-60 h-full bg-white dark:bg-gray-800 transition-transform duration-300 ease-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <Sidebar />
        </aside>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <button className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => setMobileOpen(true)} aria-label={t('common.openMenu')}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
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
