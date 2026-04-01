import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCompany } from '../../context/CompanyContext'
import { getJobsByCompany } from '../../services/jobs'
import { getApplicationsByJob } from '../../services/applications'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'

export default function CompanyDashboard() {
  const { t } = useTranslation()
  const { company } = useCompany()
  const [jobs, setJobs]         = useState([])
  const [stats, setStats]       = useState({ active: 0, total: 0, applicants: 0, hired: 0 })
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!company?.id) return
    async function load() {
      const fetchedJobs = await getJobsByCompany(company.id)
      setJobs(fetchedJobs)

      let totalApplicants = 0, hired = 0
      for (const job of fetchedJobs) {
        const apps = await getApplicationsByJob(job.id)
        totalApplicants += apps.filter(a => a.status !== 'Draft').length
        hired           += apps.filter(a => a.status === 'Hired').length
      }
      setStats({
        total:      fetchedJobs.length,
        active:     fetchedJobs.filter(j => j.status === 'Active').length,
        applicants: totalApplicants,
        hired,
      })
      setLoading(false)
    }
    load()
  }, [company?.id])

  if (loading) return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>

  const statCards = [
    { label: t('company.dashboard.totalJobs'),        value: stats.total,      icon: '📋', color: 'text-brand-500' },
    { label: t('company.dashboard.activeJobs'),       value: stats.active,     icon: '✅', color: 'text-green-500' },
    { label: t('company.dashboard.totalApplicants'),  value: stats.applicants, icon: '👥', color: 'text-purple-500' },
    { label: t('company.dashboard.hired'),            value: stats.hired,      icon: '🎉', color: 'text-orange-500' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{t('company.dashboard.title')}</h1>
      {company && <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{company.commercial_name}</p>}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(s => (
          <Card key={s.label} className="p-4">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Recent jobs */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('company.jobs.title')}</h2>
        <Link to="/company/jobs" className="text-sm text-brand-500 hover:underline">{t('common.all')} →</Link>
      </div>
      <div className="space-y-3">
        {jobs.slice(0, 5).map(job => (
          <Card key={job.id} className="p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">{job.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{job.country} · {job.work_modality}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Badge status={job.status} />
              <Link to={`/company/jobs/${job.id}/applicants`}
                className="text-xs text-brand-500 hover:underline">{t('company.jobs.applicants')}</Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
