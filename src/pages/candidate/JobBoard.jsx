import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { getActiveJobs, getActiveJobsPaginated } from '../../services/jobs'
import { getApplicationsByCandidate } from '../../services/applications'
import { getCompany } from '../../services/companies'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import Spinner from '../../components/ui/Spinner'
import JobBoardSkeleton from '../../components/skeletons/JobBoardSkeleton'

// ─── Company Logo ───────────────────────────────────────────────────────────
function CompanyLogo({ company, size = 'md' }) {
  const cls = size === 'lg' ? 'w-16 h-16 text-2xl' : size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  if (company?.logo_url) {
    return <img src={company.logo_url} alt={company.commercial_name} className={`${cls} rounded-lg object-cover shrink-0 border border-gray-200 dark:border-gray-700`} />
  }
  return (
    <div className={`${cls} rounded-lg bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-brand-600 dark:text-brand-300 font-bold shrink-0`}>
      {company?.commercial_name?.[0]?.toUpperCase() || '🏢'}
    </div>
  )
}

// ─── Job list item (left panel) ─────────────────────────────────────────────
function JobListItem({ job, company, isSelected, isApplied, timeAgo, onClick }) {
  return (
    <button onClick={onClick} className={`w-full text-left p-4 border-b border-gray-100 dark:border-gray-800 transition-colors ${
      isSelected
        ? 'bg-brand-50 dark:bg-brand-900/20 border-l-4 border-l-brand-500'
        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-l-4 border-l-transparent'
    }`}>
      <div className="flex gap-3">
        <CompanyLogo company={company} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className={`text-sm font-semibold truncate ${isSelected ? 'text-brand-600 dark:text-brand-300' : 'text-gray-900 dark:text-white'}`}>{job.title}</h3>
          <p className="text-xs font-medium text-brand-500 dark:text-brand-400 truncate">{company?.commercial_name || '—'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {job.country}{job.work_modality ? ` · ${job.work_modality}` : ''}{timeAgo ? ` · ${timeAgo}` : ''}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            {job.max_salary > 0 && (
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                ${job.min_salary?.toLocaleString()}–${job.max_salary?.toLocaleString()}
              </span>
            )}
            {isApplied && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                ✓ Aplicado
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function JobBoard() {
  const { t } = useTranslation()
  const { firebaseUser, userDoc } = useAuth()

  const [jobs, setJobs]               = useState([])
  const [companiesMap, setCompaniesMap] = useState({})
  const [applied, setApplied]         = useState(new Set())
  const [search, setSearch]           = useState('')
  const [country, setCountry]         = useState('')
  const [modality, setModality]       = useState('')
  const [sortBy, setSortBy]           = useState('date')
  const [loading, setLoading]         = useState(true)
  const [selectedJobId, setSelectedJobId] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const [lastDoc, setLastDoc]         = useState(null)
  const [hasMore, setHasMore]         = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  async function handleShare(jobId) {
    const url = `https://us-central1-candydatos.cloudfunctions.net/jobOgMeta/jobs/${jobId}`
    try {
      if (navigator.share) {
        await navigator.share({ title: t('company.jobs.shareTitle'), url })
      } else {
        await navigator.clipboard.writeText(url)
        setCopiedId(jobId)
        setTimeout(() => setCopiedId(null), 2000)
      }
    } catch {
      await navigator.clipboard.writeText(url)
      setCopiedId(jobId)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  async function fetchCompanies(jobList, existingMap = {}) {
    const newIds = [...new Set(jobList.map(j => j.company_id).filter(id => id && !existingMap[id]))]
    if (newIds.length === 0) return existingMap
    const fetched = await Promise.all(newIds.map(id => getCompany(id)))
    const map = { ...existingMap }
    fetched.forEach((c, i) => { if (c) map[newIds[i]] = c })
    return map
  }

  useEffect(() => {
    async function load() {
      const [{ jobs: firstPage, lastDoc: ld, hasMore: hm }, myApps] = await Promise.all([
        getActiveJobsPaginated(),
        getApplicationsByCandidate(firebaseUser.uid),
      ])
      setJobs(firstPage)
      setLastDoc(ld)
      setHasMore(hm)
      setApplied(new Set(myApps.filter(a => a.status !== 'Draft').map(a => a.job_offer_id)))

      const map = await fetchCompanies(firstPage)
      setCompaniesMap(map)

      if (firstPage.length > 0) setSelectedJobId(firstPage[0].id)
      setLoading(false)
    }
    load()
  }, [firebaseUser?.uid])

  async function loadMoreJobs() {
    if (!hasMore || loadingMore) return
    setLoadingMore(true)
    const { jobs: nextPage, lastDoc: ld, hasMore: hm } = await getActiveJobsPaginated(lastDoc)
    setJobs(prev => [...prev, ...nextPage])
    setLastDoc(ld)
    setHasMore(hm)
    const map = await fetchCompanies(nextPage, companiesMap)
    setCompaniesMap(map)
    setLoadingMore(false)
  }

  const filtered = jobs
    .filter(j => {
      const q = search.toLowerCase()
      if (q && !j.title?.toLowerCase().includes(q) && !j.description?.toLowerCase().includes(q)) return false
      if (country  && j.country   !== country)   return false
      if (modality && j.work_modality !== modality) return false
      return true
    })
    .sort((a, b) => sortBy === 'date'
      ? (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0)
      : (b.max_salary || 0) - (a.max_salary || 0)
    )

  const selectedJob = jobs.find(j => j.id === selectedJobId)
  const selectedCompany = selectedJob ? companiesMap[selectedJob.company_id] : null
  const companyJobs = selectedJob
    ? filtered.filter(j => j.company_id === selectedJob.company_id && j.id !== selectedJob.id).slice(0, 5)
    : []
  const canApply = userDoc?.profile_completion_pct >= 100
  const countries  = [...new Set(jobs.map(j => j.country).filter(Boolean))]
  const modalities = [
    { value: '', label: t('common.all') },
    { value: 'Remote',  label: t('company.jobForm.remote') },
    { value: 'On-site', label: t('company.jobForm.onsite') },
    { value: 'Hybrid',  label: t('company.jobForm.hybrid') },
  ]

  function formatDate(ts) {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000)
    const diff = Math.floor((Date.now() - d.getTime()) / 86400000)
    if (diff === 0) return t('candidate.jobs.today')
    if (diff === 1) return t('candidate.jobs.yesterday')
    if (diff < 7)  return t('candidate.jobs.daysAgo', { count: diff })
    if (diff < 30) return t('candidate.jobs.weeksAgo', { count: Math.floor(diff / 7) })
    return t('candidate.jobs.monthsAgo', { count: Math.floor(diff / 30) })
  }

  if (loading) return <JobBoardSkeleton />

  return (
    <div className="h-full flex flex-col -m-4 md:-m-6">
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="px-4 md:px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <Input placeholder={t('candidate.jobs.search')} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={country} onChange={e => setCountry(e.target.value)} className="w-32 hidden sm:block"
            options={[{ value: '', label: t('candidate.jobs.country') }, ...countries.map(c => ({ value: c, label: c }))]} />
          <Select value={modality} onChange={e => setModality(e.target.value)} className="w-32 hidden sm:block"
            options={modalities} />
          <Select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-36 hidden md:block"
            options={[{ value: 'date', label: t('candidate.jobs.sortDate') }, { value: 'salary', label: t('candidate.jobs.sortSalary') }]} />
        </div>
        {/* Mobile filters */}
        <div className="flex items-center gap-2 mt-2 sm:hidden">
          <Select value={country} onChange={e => setCountry(e.target.value)} className="flex-1"
            options={[{ value: '', label: t('candidate.jobs.country') }, ...countries.map(c => ({ value: c, label: c }))]} />
          <Select value={modality} onChange={e => setModality(e.target.value)} className="flex-1"
            options={modalities} />
          <Select value={sortBy} onChange={e => setSortBy(e.target.value)} className="flex-1"
            options={[{ value: 'date', label: t('candidate.jobs.sortDate') }, { value: 'salary', label: t('candidate.jobs.sortSalary') }]} />
        </div>
        {!canApply && (
          <div className="mt-2 p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 text-xs text-orange-600 dark:text-orange-400">
            ⚠️ {t('candidate.profile.completeToApply')}
          </div>
        )}
      </div>

      {/* ── Results count ────────────────────────────────────────────────── */}
      <div className="px-4 md:px-6 py-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        {filtered.length} {t('candidate.jobs.results')}
      </div>

      {filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <EmptyState icon={<span className="text-5xl">🔍</span>} title={t('candidate.jobs.empty')} />
        </div>
      ) : (
        /* ── Split layout ──────────────────────────────────────────────── */
        <div className="flex-1 flex overflow-hidden">
          {/* Left panel: job list */}
          <div className="w-full md:w-[380px] lg:w-[420px] shrink-0 overflow-y-auto scrollbar-thin border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="pb-8">
            {filtered.map(job => (
              <JobListItem
                key={job.id}
                job={job}
                company={companiesMap[job.company_id]}
                isSelected={job.id === selectedJobId}
                isApplied={applied.has(job.id)}
                timeAgo={formatDate(job.created_at)}
                onClick={() => setSelectedJobId(job.id)}
              />
            ))}
            {hasMore && (
              <button onClick={loadMoreJobs} disabled={loadingMore}
                className="w-full py-3 text-sm font-medium text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors disabled:opacity-50">
                {loadingMore ? <Spinner size="sm" /> : t('common.loadMore')}
              </button>
            )}
            </div>
          </div>

          {/* Right panel: job detail */}
          <div className="hidden md:flex flex-1 flex-col overflow-y-auto scrollbar-thin bg-gray-50 dark:bg-gray-900">
            {selectedJob ? (
              <div className="max-w-3xl mx-auto w-full p-6 pb-12 space-y-5">
                {/* ── Header ─────────────────────────────────────────── */}
                <Card className="p-0 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <CompanyLogo company={selectedCompany} size="lg" />
                      <div className="flex-1 min-w-0">
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{selectedJob.title}</h1>
                        {selectedCompany && (
                          <p className="text-sm font-medium text-brand-500 dark:text-brand-400 mt-0.5">{selectedCompany.commercial_name}</p>
                        )}
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {selectedJob.country} · {formatDate(selectedJob.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Tags row */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      <Badge status={selectedJob.work_modality === 'Remote' ? 'Active' : selectedJob.work_modality === 'Hybrid' ? 'Reviewed' : 'Paused'} label={selectedJob.work_modality} />
                      {selectedJob.years_experience_required > 0 && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          💼 {selectedJob.years_experience_required} {t('candidate.jobs.yearsExp')}
                        </span>
                      )}
                      {selectedJob.max_salary > 0 && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                          💰 ${selectedJob.min_salary?.toLocaleString()}–${selectedJob.max_salary?.toLocaleString()}
                        </span>
                      )}
                      {selectedJob.max_applicants && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                          👥 Max {selectedJob.max_applicants}
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3 mt-5">
                      {applied.has(selectedJob.id) ? (
                        <Button variant="secondary" disabled className="flex-1 sm:flex-none">{t('candidate.jobs.applied')}</Button>
                      ) : canApply ? (
                        <Link to={`/candidate/apply/${selectedJob.id}`} className="flex-1 sm:flex-none">
                          <Button className="w-full">{t('candidate.jobs.apply')}</Button>
                        </Link>
                      ) : (
                        <Button disabled className="flex-1 sm:flex-none">{t('candidate.jobs.apply')}</Button>
                      )}
                      <Button variant="ghost" onClick={() => handleShare(selectedJob.id)}>
                        {copiedId === selectedJob.id ? (
                          <span className="text-green-500 text-xs font-medium">✓ {t('common.copied')}</span>
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* ── About the job ──────────────────────────────────── */}
                <Card className="p-6">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">{t('candidate.jobs.aboutJob')}</h2>
                  <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                    {selectedJob.description}
                  </div>
                </Card>

                {/* ── Benefits ───────────────────────────────────────── */}
                {selectedJob.benefits?.length > 0 && (
                  <Card className="p-6">
                    <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">{t('candidate.jobs.benefits')}</h2>
                    <div className="flex flex-wrap gap-2">
                      {selectedJob.benefits.map(b => (
                        <span key={b} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          <span className="text-green-500">✓</span> {b}
                        </span>
                      ))}
                    </div>
                  </Card>
                )}

                {/* ── About the company ──────────────────────────────── */}
                {selectedCompany && (
                  <Card className="p-6">
                    <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">{t('candidate.jobs.aboutCompany')}</h2>
                    <div className="flex items-start gap-4">
                      <CompanyLogo company={selectedCompany} size="lg" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{selectedCompany.commercial_name}</h3>
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

                {/* ── Other jobs from this company ───────────────────── */}
                {companyJobs.length > 0 && (
                  <Card className="p-6">
                    <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">
                      {t('candidate.jobs.moreFrom')} {selectedCompany?.commercial_name}
                    </h2>
                    <div className="space-y-3">
                      {companyJobs.map(j => (
                        <button key={j.id} onClick={() => setSelectedJobId(j.id)}
                          className="w-full text-left flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border border-gray-100 dark:border-gray-700">
                          <CompanyLogo company={selectedCompany} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{j.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {j.country} · {j.work_modality}
                              {j.max_salary > 0 && ` · $${j.max_salary.toLocaleString()}`}
                            </p>
                          </div>
                          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                        </button>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-400">{t('candidate.jobs.selectJob')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Mobile detail modal ──────────────────────────────────────────── */}
      {selectedJob && (
        <div className="md:hidden fixed inset-0 z-50 bg-gray-50 dark:bg-gray-900 overflow-y-auto scrollbar-thin" style={{ display: selectedJobId ? undefined : 'none' }}>
          <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3">
            <button onClick={() => setSelectedJobId(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{selectedJob.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{selectedCompany?.commercial_name}</p>
            </div>
            <button onClick={() => handleShare(selectedJob.id)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
              {copiedId === selectedJob.id ? (
                <span className="text-green-500 text-xs font-medium">✓</span>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              )}
            </button>
            {applied.has(selectedJob.id) ? (
              <Button variant="secondary" size="sm" disabled>{t('candidate.jobs.applied')}</Button>
            ) : canApply ? (
              <Link to={`/candidate/apply/${selectedJob.id}`}><Button size="sm">{t('candidate.jobs.apply')}</Button></Link>
            ) : (
              <Button size="sm" disabled>{t('candidate.jobs.apply')}</Button>
            )}
          </div>

          <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-start gap-3">
              <CompanyLogo company={selectedCompany} size="lg" />
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">{selectedJob.title}</h1>
                <p className="text-sm text-brand-500">{selectedCompany?.commercial_name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{selectedJob.country} · {formatDate(selectedJob.created_at)}</p>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              <Badge status={selectedJob.work_modality === 'Remote' ? 'Active' : 'Paused'} label={selectedJob.work_modality} />
              {selectedJob.years_experience_required > 0 && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">💼 {selectedJob.years_experience_required} {t('candidate.jobs.yearsExp')}</span>
              )}
              {selectedJob.max_salary > 0 && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">💰 ${selectedJob.min_salary?.toLocaleString()}–${selectedJob.max_salary?.toLocaleString()}</span>
              )}
            </div>

            {/* Description */}
            <Card className="p-4">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-2">{t('candidate.jobs.aboutJob')}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">{selectedJob.description}</p>
            </Card>

            {/* Benefits */}
            {selectedJob.benefits?.length > 0 && (
              <Card className="p-4">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-2">{t('candidate.jobs.benefits')}</h2>
                <div className="flex flex-wrap gap-2">
                  {selectedJob.benefits.map(b => (
                    <span key={b} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"><span className="text-green-500">✓</span> {b}</span>
                  ))}
                </div>
              </Card>
            )}

            {/* Company info */}
            {selectedCompany && (
              <Card className="p-4">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-3">{t('candidate.jobs.aboutCompany')}</h2>
                <div className="flex items-start gap-3">
                  <CompanyLogo company={selectedCompany} size="md" />
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">{selectedCompany.commercial_name}</p>
                    {selectedCompany.industry_sector && <p className="text-xs text-brand-500">{selectedCompany.industry_sector}</p>}
                    {selectedCompany.business_bio && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{selectedCompany.business_bio}</p>}
                  </div>
                </div>
              </Card>
            )}

            {/* Other jobs */}
            {companyJobs.length > 0 && (
              <Card className="p-4">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-3">{t('candidate.jobs.moreFrom')} {selectedCompany?.commercial_name}</h2>
                <div className="space-y-2">
                  {companyJobs.map(j => (
                    <button key={j.id} onClick={() => setSelectedJobId(j.id)}
                      className="w-full text-left p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{j.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{j.country} · {j.work_modality}</p>
                    </button>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
