import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getJob } from '../../services/jobs'
import { getCompany } from '../../services/companies'
import { useAuth } from '../../context/AuthContext'
import { signInWithGoogle } from '../../services/auth'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import GoogleButton from '../../components/ui/GoogleButton'
import Spinner from '../../components/ui/Spinner'
import ThemeToggle from '../../components/layout/ThemeToggle'
import LanguageToggle from '../../components/layout/LanguageToggle'
import logo from '/logo.png'

function CompanyLogo({ company }) {
  if (company?.logo_url) {
    return <img src={company.logo_url} alt={company.commercial_name} className="w-16 h-16 rounded-lg object-cover shrink-0 border border-gray-200 dark:border-gray-700" />
  }
  return (
    <div className="w-16 h-16 rounded-lg bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-2xl text-brand-600 dark:text-brand-300 font-bold shrink-0">
      {company?.commercial_name?.[0]?.toUpperCase() || '🏢'}
    </div>
  )
}

export default function JobPreview() {
  const { t } = useTranslation()
  const { jobId } = useParams()
  const navigate = useNavigate()
  const { firebaseUser, userType, userDoc, refreshUserDoc } = useAuth()

  const isCandidate = firebaseUser && userType === 'candidate'

  const [job, setJob] = useState(null)
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showLogin, setShowLogin] = useState(true)
  const [authLoading, setAuthLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const fetchedJob = await getJob(jobId)
      if (!fetchedJob) { setLoading(false); return }
      setJob(fetchedJob)
      if (fetchedJob.company_id) {
        const c = await getCompany(fetchedJob.company_id)
        setCompany(c)
      }
      setLoading(false)
    }
    load()
  }, [jobId])

  // If already logged in as candidate, redirect to apply
  useEffect(() => {
    if (firebaseUser && userType === 'candidate') {
      setShowLogin(false)
    }
  }, [firebaseUser, userType])

  async function handleGoogle() {
    setError('')
    setAuthLoading(true)
    try {
      await signInWithGoogle('candidate')
      const doc = await refreshUserDoc()
      setShowLogin(false)
      setAuthLoading(false)
    } catch (err) {
      setError(err.message || t('common.error'))
      setAuthLoading(false)
    }
  }

  // After login, check if profile is complete — if not, redirect to profile
  useEffect(() => {
    if (firebaseUser && userType === 'candidate' && userDoc && !showLogin) {
      if ((userDoc.profile_completion_pct ?? 0) < 100) {
        sessionStorage.setItem('redirect_after_login', `/jobs/${jobId}`)
        navigate('/candidate/profile', { replace: true })
      }
    }
  }, [firebaseUser, userType, userDoc, showLogin])

  function handleApply() {
    if (firebaseUser && userType === 'candidate') {
      navigate(`/candidate/apply/${jobId}`)
    } else {
      setShowLogin(true)
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900"><Spinner size="lg" /></div>

  if (!job) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <p className="text-gray-500 dark:text-gray-400 mb-4">{t('candidate.jobs.notFound')}</p>
      <Link to="/"><Button variant="secondary">{t('common.back')}</Button></Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative">
      {/* Navbar */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="candydatos" className="h-7 w-auto" />
            <span className="font-bold text-gray-900 dark:text-white">candydatos</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Job content */}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
        {/* Header card */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <CompanyLogo company={company} />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{job.title}</h1>
              {company && <p className="text-sm font-medium text-brand-500 dark:text-brand-400 mt-0.5">{company.commercial_name}</p>}
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{job.country} · {job.work_modality}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <Badge status={job.work_modality === 'Remote' ? 'Active' : job.work_modality === 'Hybrid' ? 'Reviewed' : 'Paused'} label={job.work_modality} />
            {job.years_experience_required > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                💼 {job.years_experience_required} {t('candidate.jobs.yearsExp')}
              </span>
            )}
            {job.max_salary > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                💰 ${job.min_salary?.toLocaleString()}–${job.max_salary?.toLocaleString()}
              </span>
            )}
          </div>

          <div className="mt-5">
            <Button onClick={handleApply} className="w-full sm:w-auto">{t('candidate.jobs.apply')}</Button>
          </div>
        </Card>

        {/* Description - visible */}
        <Card className="p-6">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">{t('candidate.jobs.aboutJob')}</h2>
          <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
            {!isCandidate
              ? job.description?.slice(0, 300) + (job.description?.length > 300 ? '...' : '')
              : job.description
            }
          </div>
          {!isCandidate && job.description?.length > 300 && (
            <div className="relative -mt-8 pt-12 bg-gradient-to-t from-white dark:from-gray-800 to-transparent">
              <p className="text-sm text-center text-gray-500 dark:text-gray-400">
                {t('public.job.loginToSeeMore')}
              </p>
            </div>
          )}
        </Card>

        {/* Benefits - blurred if not logged in */}
        {job.benefits?.length > 0 && (
          <Card className={`p-6 ${!isCandidate ? 'select-none' : ''}`}>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">{t('candidate.jobs.benefits')}</h2>
            <div className={`flex flex-wrap gap-2 ${!isCandidate ? 'blur-sm' : ''}`}>
              {job.benefits.map(b => (
                <span key={b} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  <span className="text-green-500">✓</span> {b}
                </span>
              ))}
            </div>
            {!isCandidate && (
              <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-3">{t('public.job.loginToSeeMore')}</p>
            )}
          </Card>
        )}

        {/* Company info - blurred if not logged in */}
        {company && (
          <Card className={`p-6 ${!isCandidate ? 'select-none' : ''}`}>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">{t('candidate.jobs.aboutCompany')}</h2>
            <div className={`flex items-start gap-4 ${!isCandidate ? 'blur-sm' : ''}`}>
              <CompanyLogo company={company} />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white">{company.commercial_name}</h3>
                {company.industry_sector && <p className="text-sm text-brand-500">{company.industry_sector}</p>}
                {company.business_bio && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">{company.business_bio}</p>}
              </div>
            </div>
            {!isCandidate && (
              <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-3">{t('public.job.loginToSeeMore')}</p>
            )}
          </Card>
        )}
      </div>

      {/* ─── Login Overlay ────────────────────────────────────────────────── */}
      {showLogin && !isCandidate && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setShowLogin(false)} />

          {/* Login card */}
          <div className="relative z-50 w-full max-w-md mx-4 mb-0 sm:mb-0 bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 animate-slide-up">
            {/* Close button */}
            <button onClick={() => setShowLogin(false)}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-4">
                <img src={logo} alt="candydatos" className="h-6 w-auto" />
                <span className="font-bold text-gray-900 dark:text-white text-sm">candydatos</span>
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('public.job.loginTitle')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('public.job.loginSubtitle')}</p>
            </div>

            <GoogleButton onClick={handleGoogle} label={t('auth.googleSignIn')} />

            {error && <p className="text-sm text-red-500 text-center mt-3">{error}</p>}

            {authLoading && (
              <div className="flex justify-center mt-4"><Spinner size="sm" /></div>
            )}

            <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-4">
              {t('public.job.loginFooter')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
