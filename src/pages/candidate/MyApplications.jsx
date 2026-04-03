import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { getApplicationsByCandidate, deleteApplication } from '../../services/applications'
import { getJob } from '../../services/jobs'
import { getCompany } from '../../services/companies'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import Spinner from '../../components/ui/Spinner'

// ─── Pipeline stages (same as company side) ─────────────────────────────────
const STAGES = ['received', 'reviewing', 'interview', 'technical', 'offer', 'hired']
const STAGE_ICONS = { received: '📥', reviewing: '👁', interview: '🎤', technical: '💻', offer: '📝', hired: '✅' }
const REJECTED = 'rejected'

function MiniPipeline({ stage, isRejected, t }) {
  const idx = STAGES.indexOf(stage)
  return (
    <div className="flex items-center gap-0.5">
      {STAGES.map((s, i) => {
        const isCurrent = s === stage && !isRejected
        const isPast = idx > i && !isRejected
        const isHired = s === 'hired' && stage === 'hired'
        return (
          <div key={s} className="flex items-center gap-0.5">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all ${
              isHired ? 'bg-green-500 text-white' :
              isCurrent ? 'bg-brand-500 text-white ring-2 ring-brand-200 dark:ring-brand-800' :
              isPast ? 'bg-brand-400 text-white' :
              'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
            }`}>
              {STAGE_ICONS[s]}
            </div>
            {i < STAGES.length - 1 && (
              <div className={`w-3 h-0.5 ${isPast ? 'bg-brand-400' : 'bg-gray-200 dark:bg-gray-700'}`} />
            )}
          </div>
        )
      })}
      {isRejected && (
        <>
          <div className="w-3 h-0.5 bg-red-300" />
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs bg-red-500 text-white">❌</div>
        </>
      )}
    </div>
  )
}

function CompanyLogo({ company, size = 'md' }) {
  const cls = size === 'lg' ? 'w-14 h-14 text-xl' : 'w-10 h-10 text-sm'
  if (company?.logo_url) {
    return <img src={company.logo_url} alt={company.commercial_name} className={`${cls} rounded-lg object-cover shrink-0 border border-gray-200 dark:border-gray-700`} />
  }
  return (
    <div className={`${cls} rounded-lg bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-brand-600 dark:text-brand-300 font-bold shrink-0`}>
      {company?.commercial_name?.[0]?.toUpperCase() || '🏢'}
    </div>
  )
}

export default function MyApplications() {
  const { t } = useTranslation()
  const { firebaseUser } = useAuth()
  const [applications, setApplications] = useState([])
  const [jobsMap, setJobsMap]           = useState({})
  const [companiesMap, setCompaniesMap] = useState({})
  const [loading, setLoading]           = useState(true)
  const [selectedId, setSelectedId]     = useState(null)

  useEffect(() => {
    async function load() {
      const apps = await getApplicationsByCandidate(firebaseUser.uid)
      setApplications(apps)

      const uniqueJobIds = [...new Set(apps.map(a => a.job_offer_id))]
      const jobs = await Promise.all(uniqueJobIds.map(id => getJob(id)))
      const jMap = {}
      jobs.forEach((j, i) => { if (j) jMap[uniqueJobIds[i]] = j })
      setJobsMap(jMap)

      const uniqueCompanyIds = [...new Set(Object.values(jMap).map(j => j.company_id).filter(Boolean))]
      const companies = await Promise.all(uniqueCompanyIds.map(id => getCompany(id)))
      const cMap = {}
      companies.forEach((c, i) => { if (c) cMap[uniqueCompanyIds[i]] = c })
      setCompaniesMap(cMap)

      setLoading(false)
    }
    load()
  }, [firebaseUser?.uid])

  if (loading) return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>

  const visible = applications.filter(a => a.status !== 'Draft')
  const selected = visible.find(a => a.id === selectedId)
  const selectedJob = selected ? jobsMap[selected.job_offer_id] : null
  const selectedCompany = selectedJob ? companiesMap[selectedJob.company_id] : null

  function formatDate(ts) {
    if (!ts) return '—'
    const d = ts.toDate ? ts.toDate() : ts.seconds ? new Date(ts.seconds * 1000) : null
    return d ? d.toLocaleDateString() : '—'
  }

  async function handleDeleteApp(appId) {
    await deleteApplication(appId)
    setApplications(prev => prev.filter(a => a.id !== appId))
    if (selectedId === appId) setSelectedId(null)
  }

  function getStageName(app) {
    const stage = app.pipeline_stage || 'received'
    return stage === REJECTED ? t('company.pipeline.rejected') : t(`company.pipeline.${stage}`)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('candidate.applications.title')}</h1>

      {visible.length === 0 ? (
        <EmptyState
          icon={<span className="text-5xl">📄</span>}
          title={t('candidate.applications.empty')}
          action={<Link to="/candidate/jobs"><Button>{t('candidate.jobs.title')}</Button></Link>}
        />
      ) : (
        <div className="flex flex-col lg:flex-row gap-5">
          {/* ── Application list ─────────────────────────────────────────── */}
          <div className={`space-y-3 ${selectedId ? 'hidden lg:block lg:w-[380px] shrink-0' : 'w-full'}`}>
            {visible.map(app => {
              const job = jobsMap[app.job_offer_id]
              const company = job ? companiesMap[job.company_id] : null
              const stage = app.pipeline_stage || 'received'
              const isRejected = stage === REJECTED
              const isSelected = app.id === selectedId

              return (
                <Card key={app.id}
                  className={`p-4 cursor-pointer transition-all ${
                    isSelected ? 'ring-2 ring-brand-500' : 'hover:ring-2 hover:ring-brand-300 dark:hover:ring-brand-700'
                  }`}
                  onClick={() => setSelectedId(isSelected ? null : app.id)}>
                  <div className="flex items-start gap-3">
                    <CompanyLogo company={company} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{job?.title || '—'}</h3>
                      </div>
                      <p className="text-xs text-brand-500 dark:text-brand-400">{company?.commercial_name || '—'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {job?.country} · {job?.work_modality} · {formatDate(app.applied_at)}
                      </p>

                      {/* Mini pipeline */}
                      <div className="mt-2">
                        <MiniPipeline stage={stage} isRejected={isRejected} t={t} />
                      </div>
                      <p className={`text-[11px] font-medium mt-1 ${
                        isRejected ? 'text-red-500' : stage === 'hired' ? 'text-green-500' : 'text-brand-500'
                      }`}>
                        {getStageName(app)}
                      </p>
                    </div>

                    {app.fit_check && (
                      <div className="text-center shrink-0">
                        <div className="relative inline-flex items-center justify-center">
                          <svg width="40" height="40" viewBox="0 0 40 40">
                            <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="4" className="text-gray-200 dark:text-gray-700" />
                            <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"
                              className={app.fit_check.score >= 70 ? 'text-green-500' : 'text-orange-500'}
                              strokeDasharray={`${(app.fit_check.score / 100) * 100.5} 100.5`}
                              transform="rotate(-90 20 20)" />
                          </svg>
                          <span className="absolute text-[10px] font-bold text-gray-700 dark:text-gray-300">{app.fit_check.score}</span>
                        </div>
                      </div>
                    )}

                    {/* Delete button for rejected apps */}
                    {isRejected && (
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteApp(app.id) }}
                        className="shrink-0 p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"
                        title={t('candidate.applications.delete')}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>

          {/* ── Detail panel ─────────────────────────────────────────────── */}
          {selected && selectedJob && (
            <div className={`flex-1 space-y-4 ${selectedId ? '' : 'hidden'}`}>
              {/* Mobile back button */}
              <button onClick={() => setSelectedId(null)} className="lg:hidden inline-flex items-center gap-1 text-sm text-brand-500 font-medium mb-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                {t('candidate.applications.backToList')}
              </button>

              {/* Pipeline full */}
              <Card className="p-5">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('company.pipeline.title')}</h2>
                <div className="flex items-center gap-1 overflow-x-auto py-1">
                  {STAGES.map((s, i) => {
                    const stage = selected.pipeline_stage || 'received'
                    const isRej = stage === REJECTED
                    const isCurrent = s === stage && !isRej
                    const isPast = STAGES.indexOf(stage) > i && !isRej
                    const isHired = s === 'hired' && stage === 'hired'
                    const ts = selected.stage_history?.[s]
                    return (
                      <div key={s} className="flex items-center gap-1 shrink-0">
                        <div className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg text-center min-w-[64px] ${
                          isHired ? 'bg-green-100 dark:bg-green-900/30 ring-2 ring-green-500' :
                          isCurrent ? 'bg-brand-100 dark:bg-brand-900/30 ring-2 ring-brand-500' :
                          isPast ? 'bg-brand-50 dark:bg-brand-900/20' :
                          'bg-gray-100 dark:bg-gray-800'
                        }`}>
                          <span className="text-base">{STAGE_ICONS[s]}</span>
                          <span className={`text-[10px] font-medium ${
                            isCurrent || isHired ? 'text-brand-600 dark:text-brand-300' :
                            isPast ? 'text-brand-500' : 'text-gray-400'
                          }`}>{t(`company.pipeline.${s}`)}</span>
                          {ts && <span className="text-[9px] text-gray-400">{new Date(ts).toLocaleDateString()}</span>}
                        </div>
                        {i < STAGES.length - 1 && <div className={`w-3 h-0.5 ${isPast ? 'bg-brand-400' : 'bg-gray-300 dark:bg-gray-600'}`} />}
                      </div>
                    )
                  })}
                  {(selected.pipeline_stage || 'received') === REJECTED && (
                    <>
                      <div className="w-3 h-0.5 bg-red-300" />
                      <div className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 ring-2 ring-red-500 min-w-[64px]">
                        <span className="text-base">❌</span>
                        <span className="text-[10px] font-medium text-red-600 dark:text-red-300">{t('company.pipeline.rejected')}</span>
                      </div>
                    </>
                  )}
                </div>
              </Card>

              {/* Job detail */}
              <Card className="p-5">
                <div className="flex items-start gap-4">
                  <CompanyLogo company={selectedCompany} size="lg" />
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{selectedJob.title}</h2>
                    {selectedCompany && (
                      <p className="text-sm font-medium text-brand-500 dark:text-brand-400">{selectedCompany.commercial_name}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge status={selectedJob.work_modality === 'Remote' ? 'Active' : 'Paused'} label={selectedJob.work_modality} />
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        📍 {selectedJob.country}
                      </span>
                      {selectedJob.max_salary > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                          💰 ${selectedJob.min_salary?.toLocaleString()}–${selectedJob.max_salary?.toLocaleString()}
                        </span>
                      )}
                      {selectedJob.years_experience_required > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          💼 {selectedJob.years_experience_required} {t('candidate.jobs.yearsExp')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Description */}
              {selectedJob.description && (
                <Card className="p-5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('candidate.jobs.aboutJob')}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">{selectedJob.description}</p>
                </Card>
              )}

              {/* Benefits */}
              {selectedJob.benefits?.length > 0 && (
                <Card className="p-5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('candidate.jobs.benefits')}</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.benefits.map(b => (
                      <span key={b} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        <span className="text-green-500">✓</span> {b}
                      </span>
                    ))}
                  </div>
                </Card>
              )}

              {/* Company info */}
              {selectedCompany && (
                <Card className="p-5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('candidate.jobs.aboutCompany')}</h3>
                  <div className="flex items-start gap-4">
                    <CompanyLogo company={selectedCompany} size="lg" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white">{selectedCompany.commercial_name}</p>
                      {selectedCompany.industry_sector && (
                        <p className="text-sm text-brand-500 dark:text-brand-400">{selectedCompany.industry_sector}</p>
                      )}
                      {selectedCompany.business_bio && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">{selectedCompany.business_bio}</p>
                      )}
                      {selectedCompany.website_url && (
                        <a href={selectedCompany.website_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-brand-500 hover:text-brand-600 mt-2 font-medium">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          {selectedCompany.website_url.replace(/^https?:\/\/(www\.)?/, '')}
                        </a>
                      )}
                    </div>
                  </div>
                </Card>
              )}

              {/* Fit check result */}
              {selected.fit_check && (
                <Card className="p-5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">🎯 Fit Check</h3>
                  <div className="flex items-center gap-4">
                    <div className="relative inline-flex items-center justify-center shrink-0">
                      <svg width="56" height="56" viewBox="0 0 56 56">
                        <circle cx="28" cy="28" r="23" fill="none" stroke="currentColor" strokeWidth="5" className="text-gray-200 dark:text-gray-700" />
                        <circle cx="28" cy="28" r="23" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round"
                          className={selected.fit_check.score >= 70 ? 'text-green-500' : 'text-orange-500'}
                          strokeDasharray={`${(selected.fit_check.score / 100) * 144.5} 144.5`}
                          transform="rotate(-90 28 28)" />
                      </svg>
                      <span className={`absolute text-sm font-bold ${selected.fit_check.score >= 70 ? 'text-green-500' : 'text-orange-500'}`}>{selected.fit_check.score}</span>
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${selected.fit_check.passed ? 'text-green-500' : 'text-red-400'}`}>
                        {selected.fit_check.passed ? '✅ ' + t('candidate.apply.fitPassed') : '❌ ' + t('candidate.apply.fitFailed')}
                      </p>
                      {selected.fit_check.feedback && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{selected.fit_check.feedback}</p>
                      )}
                    </div>
                  </div>
                </Card>
              )}

              {/* Feedback from company */}
              {selected.feedback_to_candidate && (
                <Card className="p-5 border-l-4 border-l-blue-500">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">💬 {t('candidate.applications.feedback')}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{selected.feedback_to_candidate}</p>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
