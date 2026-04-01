import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { getApplicationsByCandidate } from '../../services/applications'
import { getJob } from '../../services/jobs'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import Spinner from '../../components/ui/Spinner'

export default function MyApplications() {
  const { t } = useTranslation()
  const { firebaseUser } = useAuth()
  const [applications, setApplications] = useState([])
  const [jobsMap, setJobsMap]           = useState({})
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    async function load() {
      const apps = await getApplicationsByCandidate(firebaseUser.uid)
      setApplications(apps)
      // Load job titles in parallel
      const uniqueJobIds = [...new Set(apps.map(a => a.job_offer_id))]
      const jobs = await Promise.all(uniqueJobIds.map(id => getJob(id)))
      const map = {}
      jobs.forEach((j, i) => { if (j) map[uniqueJobIds[i]] = j })
      setJobsMap(map)
      setLoading(false)
    }
    load()
  }, [firebaseUser?.uid])

  if (loading) return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>

  const visible = applications.filter(a => a.status !== 'Draft')

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('candidate.applications.title')}</h1>

      {visible.length === 0
        ? (
          <EmptyState
            icon={<span className="text-5xl">📄</span>}
            title={t('candidate.applications.empty')}
            action={<Link to="/candidate/jobs"><Button>{t('candidate.jobs.title')}</Button></Link>}
          />
        )
        : (
          <div className="space-y-4">
            {visible.map(app => {
              const job = jobsMap[app.job_offer_id]
              return (
                <Card key={app.id} className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{job?.title || app.job_offer_id}</h3>
                        <Badge status={app.status} label={t(`candidate.applications.status_${app.status}`)} />
                      </div>
                      {job && <p className="text-sm text-gray-500 dark:text-gray-400">{job.country} · {job.work_modality}</p>}
                      {app.applied_at && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {app.applied_at.toDate?.()?.toLocaleDateString() || ''}
                        </p>
                      )}
                      {app.fit_check && (
                        <div className="mt-2 flex items-center gap-3">
                          <span className="text-xs text-gray-500">Fit: <strong>{app.fit_check.score}%</strong></span>
                          {app.fit_check.passed ? <span className="text-xs text-green-500">✅</span> : <span className="text-xs text-red-500">❌</span>}
                        </div>
                      )}
                      {app.feedback_to_candidate && (
                        <div className="mt-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700">
                          <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">💬 {t('candidate.applications.feedback')}</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{app.feedback_to_candidate}</p>
                        </div>
                      )}
                    </div>
                    {app.status === 'Draft' && (
                      <Link to={`/candidate/apply/${app.job_offer_id}`} className="shrink-0">
                        <Button size="sm" variant="secondary">{t('candidate.apply.continue')}</Button>
                      </Link>
                    )}
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
