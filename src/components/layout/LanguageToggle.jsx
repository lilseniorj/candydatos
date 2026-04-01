import { useTranslation } from 'react-i18next'

export default function LanguageToggle({ className = '' }) {
  const { i18n } = useTranslation()
  const current  = i18n.language?.startsWith('es') ? 'es' : 'en'
  const toggle   = () => i18n.changeLanguage(current === 'es' ? 'en' : 'es')

  return (
    <button
      onClick={toggle}
      className={`px-2.5 py-1 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors ${className}`}
    >
      {current === 'es' ? 'EN' : 'ES'}
    </button>
  )
}
