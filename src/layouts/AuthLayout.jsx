import { Outlet, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ThemeToggle from '../components/layout/ThemeToggle'
import LanguageToggle from '../components/layout/LanguageToggle'
import logo from '/logo.png'

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="candydatos" className="h-8 w-auto" />
          <span className="font-bold text-gray-900 dark:text-white text-lg">candydatos</span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <Outlet />
      </main>
    </div>
  )
}
