import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ThemeToggle from '../../components/layout/ThemeToggle'
import LanguageToggle from '../../components/layout/LanguageToggle'
import logo from '/logo.png'

const FEATURES_ICONS = ['🤖', '✅', '🧠', '⚡', '👥', '📊']

export default function LandingPage() {
  const { t } = useTranslation()

  const stepsCompany    = t('landing.how.steps_company',    { returnObjects: true })
  const stepsCandidate  = t('landing.how.steps_candidate',  { returnObjects: true })
  const features        = t('landing.features.items',       { returnObjects: true })

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">

      {/* Navbar */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src={logo} alt="candydatos" className="h-8 w-auto" />
            <span className="font-bold text-lg text-gray-900 dark:text-white">candydatos</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600 dark:text-gray-300">
            <a href="#how" className="hover:text-brand-500 transition-colors">{t('nav.forCompanies')}</a>
            <a href="#candidate" className="hover:text-brand-500 transition-colors">{t('nav.forCandidates')}</a>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <Link to="/company/login"
              className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-medium text-brand-600 dark:text-brand-400 border border-brand-300 dark:border-brand-700 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-colors">
              {t('nav.login')}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300 mb-6">
          ✨ {t('landing.hero.badge')}
        </span>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tight mb-4">
          {t('landing.hero.title')}<br />
          <span className="text-brand-500">{t('landing.hero.titleHighlight')}</span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-gray-500 dark:text-gray-400 mb-10">
          {t('landing.hero.subtitle')}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/company/register"
            className="px-8 py-3 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/30">
            {t('landing.hero.cta_company')}
          </Link>
          <Link to="/candidate/register"
            className="px-8 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            {t('landing.hero.cta_candidate')}
          </Link>
        </div>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 max-w-md mx-auto mt-16">
          {[
            { value: '500+', label: t('landing.hero.stats_companies') },
            { value: '12k+', label: t('landing.hero.stats_candidates') },
            { value: '3k+',  label: t('landing.hero.stats_placed') },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-extrabold text-brand-500">{s.value}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-gray-50 dark:bg-gray-800/50 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-center mb-2">{t('landing.how.title')}</h2>
          <p className="text-center text-gray-500 dark:text-gray-400 mb-14">{t('landing.how.subtitle')}</p>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Company steps */}
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold mb-6">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-500 text-white text-sm font-bold">🏢</span>
                {t('landing.how.company_title')}
              </h3>
              <div className="space-y-4">
                {stepsCompany.map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-bold shrink-0">{i + 1}</div>
                      {i < stepsCompany.length - 1 && <div className="w-0.5 flex-1 bg-brand-200 dark:bg-brand-800 mt-1" />}
                    </div>
                    <div className="pb-4">
                      <p className="font-semibold text-gray-900 dark:text-white">{step.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/company/register"
                className="inline-flex mt-4 px-6 py-2.5 bg-brand-500 text-white rounded-lg text-sm font-semibold hover:bg-brand-600 transition-colors">
                {t('landing.portals.company.register')}
              </Link>
            </div>

            {/* Candidate steps */}
            <div id="candidate">
              <h3 className="flex items-center gap-2 text-lg font-semibold mb-6">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white text-sm font-bold">👤</span>
                {t('landing.how.candidate_title')}
              </h3>
              <div className="space-y-4">
                {stepsCandidate.map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold shrink-0">{i + 1}</div>
                      {i < stepsCandidate.length - 1 && <div className="w-0.5 flex-1 bg-green-200 dark:bg-green-800 mt-1" />}
                    </div>
                    <div className="pb-4">
                      <p className="font-semibold text-gray-900 dark:text-white">{step.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/candidate/register"
                className="inline-flex mt-4 px-6 py-2.5 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition-colors">
                {t('landing.portals.candidate.register')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 max-w-6xl mx-auto px-4 sm:px-6">
        <h2 className="text-3xl font-bold text-center mb-2">{t('landing.features.title')}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {features.map((f, i) => (
            <div key={i} className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-3xl mb-3">{FEATURES_ICONS[i]}</div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{f.title}</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Portal CTA */}
      <section className="bg-gray-50 dark:bg-gray-800/50 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-center mb-12">{t('landing.portals.title')}</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Company */}
            <div className="p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-3xl">🏢</div>
              <h3 className="text-xl font-bold mb-2">{t('landing.portals.company.title')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('landing.portals.company.desc')}</p>
              <div className="flex flex-col gap-2">
                <Link to="/company/register"
                  className="px-6 py-2.5 bg-brand-500 text-white rounded-lg text-sm font-semibold hover:bg-brand-600 transition-colors">
                  {t('landing.portals.company.register')}
                </Link>
                <Link to="/company/login"
                  className="px-6 py-2.5 border border-brand-300 dark:border-brand-700 text-brand-600 dark:text-brand-400 rounded-lg text-sm font-medium hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors">
                  {t('landing.portals.company.login')}
                </Link>
              </div>
            </div>

            {/* Candidate */}
            <div className="p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-3xl">👤</div>
              <h3 className="text-xl font-bold mb-2">{t('landing.portals.candidate.title')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('landing.portals.candidate.desc')}</p>
              <div className="flex flex-col gap-2">
                <Link to="/candidate/register"
                  className="px-6 py-2.5 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition-colors">
                  {t('landing.portals.candidate.register')}
                </Link>
                <Link to="/candidate/login"
                  className="px-6 py-2.5 border border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 rounded-lg text-sm font-medium hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                  {t('landing.portals.candidate.login')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        {t('landing.footer')}
      </footer>
    </div>
  )
}
