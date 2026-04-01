import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { getActiveJobs } from '../../services/jobs'
import { getApplicationsByCandidate } from '../../services/applications'
import { getCompany } from '../../services/companies'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import Spinner from '../../components/ui/Spinner'

export default function JobBoard() {
  const { t } = useTranslation()
  const { firebaseUser, userDoc } = useAuth()
  const [jobs, setJobs]               = useState([])
  const [companiesMap, setCompaniesMap] = useState({}) // { companyId: company }
  const [applied, setApplied]         = useState(new Set())
  const [search, setSearch]           = useState('')
  const [country, setCountry]         = useState('')
  const [modality, setModality]       = useState('')
  const [minSalary, setMinSalary]     = useState('')
  const [sortBy, setSortBy]           = useState('date')
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    async function load() {
      const [fetchedJobs, myApps] = await Promise.all([
        getActiveJobs(),
        getApplicationsByCandidate(firebaseUser.uid),
      ])
      setJobs(fetchedJobs)
      setApplied(new Set(myApps.filter(a => a.status !== 'Draft').map(a => a.job_offer_id)))

      // Fetch company info for each unique company_id
      const uniqueCompanyIds = [...new Set(fetchedJobs.map(j => j.company_id).filter(Boolean))]
      const companies = await Promise.all(uniqueCompanyIds.map(id => getCompany(id)))
      const map = {}
      companies.forEach((c, i) => { if (c) map[uniqueCompanyIds[i]] = c })
      setCompaniesMap(map)

      setLoading(false)
    }
    load()
  }, [firebaseUser?.uid])

  const filtered = jobs
    .filter(j => {
      const q = search.toLowerCase()
      if (q && !j.title?.toLowerCase().includes(q) && !j.description?.toLowerCase().includes(q)) return false
      if (country  && j.country   !== country)   return false
      if (modality && j.work_modality !== modality) return false
      if (minSalary && (j.max_salary || 0) < parseInt(minSalary)) return false
      return true
    })
    .sort((a, b) => sortBy === 'date'
      ? (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0)
      : (b.max_salary || 0) - (a.max_salary || 0)
    )

  const canApply = userDoc?.profile_completion_pct >= 100
  const countries  = [...new Set(jobs.map(j => j.country).filter(Boolean))]
  const modalities = [
    { value: '', label: t('common.all') },
    { value: 'Remote',  label: t('company.jobForm.remote') },
    { value: 'On-site', label: t('company.jobForm.onsite') },
    { value: 'Hybrid',  label: t('company.jobForm.hybrid') },
  ]

  if (loading) return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('candidate.jobs.title')}</h1>

      {/* Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <div className="col-span-2 sm:col-span-3 lg:col-span-2">
          <Input placeholder={t('candidate.jobs.search')} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={country} onChange={e => setCountry(e.target.value)}
          options={[{ value: '', label: t('candidate.jobs.country') }, ...countries.map(c => ({ value: c, label: c }))]} />
        <Select value={modality} onChange={e => setModality(e.target.value)} options={modalities} />
        <Select value={sortBy} onChange={e => setSortBy(e.target.value)}
          options={[{ value: 'date', label: t('candidate.jobs.sortDate') }, { value: 'salary', label: t('candidate.jobs.sortSalary') }]} />
      </div>

      {!canApply && (
        <div className="mb-4 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 text-sm text-orange-600 dark:text-orange-400">
          ⚠️ {t('candidate.profile.completeToApply')}
        </div>
      )}

      {filtered.length === 0
        ? <EmptyState icon={<span className="text-5xl">🔍</span>} title={t('candidate.jobs.empty')} />
        : (
          <div className="space-y-4">
            {filtered.map(job => {
              const company = companiesMap[job.company_id]
              return (
                <Card key={job.id} className="p-5">
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div className="flex gap-4 min-w-0">
                      {/* Company logo */}
                      {company?.logo_url ? (
                        <img src={company.logo_url} alt={company.commercial_name}
                          className="w-12 h-12 rounded-lg object-cover shrink-0 border border-gray-200 dark:border-gray-700" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-brand-600 dark:text-brand-300 text-lg font-bold shrink-0">
                          {company?.commercial_name?.[0]?.toUpperCase() || '🏢'}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{job.title}</h3>
                          <Badge status={job.work_modality === 'Remote' ? 'Active' : 'Reviewed'} label={job.work_modality} />
                        </div>
                        {company && (
                          <p className="text-sm font-medium text-brand-500 dark:text-brand-400">{company.commercial_name}</p>
                        )}
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {job.country} · ${job.min_salary?.toLocaleString()}–${job.max_salary?.toLocaleString()}
                          {job.years_experience_required > 0 && ` · ${job.years_experience_required}y exp`}
                        </p>
                        {job.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">{job.description}</p>
                        )}
                        {job.benefits?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {job.benefits.slice(0, 4).map(b => (
                              <span key={b} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">{b}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 self-start">
                      {applied.has(job.id)
                        ? <Button variant="secondary" size="sm" disabled>{t('candidate.jobs.applied')}</Button>
                        : canApply
                          ? <Link to={`/candidate/apply/${job.id}`}><Button size="sm">{t('candidate.jobs.apply')}</Button></Link>
                          : <Button size="sm" disabled>{t('candidate.jobs.apply')}</Button>
                      }
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )
      }
    </div>
  )
}
