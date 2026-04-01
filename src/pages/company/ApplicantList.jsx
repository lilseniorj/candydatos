import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCompany } from '../../context/CompanyContext'
import { getApplicationsByJob, updateApplicationStatus, assignReviewer } from '../../services/applications'
import { getCompanyUsers } from '../../services/companies'
import { getJob } from '../../services/jobs'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Select from '../../components/ui/Select'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import EmptyState from '../../components/ui/EmptyState'
import Spinner from '../../components/ui/Spinner'

const STATUSES = ['All', 'Pending', 'Reviewed', 'Testing', 'Rejected', 'Hired']

export default function ApplicantList() {
  const { t } = useTranslation()
  const { jobId } = useParams()
  const { company } = useCompany()

  const [job, setJob]                       = useState(null)
  const [apps, setApps]                     = useState([])
  const [filtered, setFiltered]             = useState([])
  const [statusFilter, setStatusFilter]     = useState('All')
  const [loading, setLoading]               = useState(true)
  const [companyUsers, setCompanyUsers]     = useState([])

  // Feedback modal
  const [feedbackModal, setFeedbackModal]   = useState(null)
  const [feedbackText, setFeedbackText]     = useState('')

  // Assign manager modal
  const [assignModal, setAssignModal]       = useState(null) // app object
  const [selectedReviewer, setSelectedReviewer] = useState('')
  const [assigning, setAssigning]           = useState(false)

  useEffect(() => {
    async function load() {
      const [j, a] = await Promise.all([getJob(jobId), getApplicationsByJob(jobId)])
      setJob(j)
      setApps(a.filter(ap => ap.status !== 'Draft'))
      setLoading(false)
    }
    load()
  }, [jobId])

  useEffect(() => {
    if (!company?.id) return
    getCompanyUsers(company.id).then(setCompanyUsers)
  }, [company?.id])

  useEffect(() => {
    setFiltered(statusFilter === 'All' ? apps : apps.filter(a => a.status === statusFilter))
  }, [apps, statusFilter])

  async function handleStatus(appId, status) {
    await updateApplicationStatus(appId, status)
    setApps(prev => prev.map(a => a.id === appId ? { ...a, status } : a))
  }

  async function handleFeedback() {
    await updateApplicationStatus(feedbackModal.id, feedbackModal.status, feedbackText)
    setApps(prev => prev.map(a => a.id === feedbackModal.id ? { ...a, feedback_to_candidate: feedbackText } : a))
    setFeedbackModal(null)
    setFeedbackText('')
  }

  async function handleAssignReviewer() {
    if (!selectedReviewer) return
    setAssigning(true)
    try {
      await assignReviewer(assignModal.id, selectedReviewer)
      setApps(prev => prev.map(a => a.id === assignModal.id ? { ...a, reviewer_id: selectedReviewer } : a))
      setAssignModal(null)
      setSelectedReviewer('')
    } finally {
      setAssigning(false)
    }
  }

  function openAssignModal(app) {
    setAssignModal(app)
    setSelectedReviewer(app.reviewer_id || '')
  }

  const filterOpts   = STATUSES.map(s => ({ value: s, label: s === 'All' ? t('common.all') : t(`candidate.applications.status_${s}`) }))
  const reviewerOpts = [
    { value: '', label: `— ${t('company.applicants.noManager')} —` },
    ...companyUsers.map(u => ({ value: u.id, label: `${u.full_name} (${u.role})` })),
  ]

  if (loading) return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{t('company.applicants.title')}</h1>
      {job && <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{job.title}</p>}

      <div className="flex items-center gap-3 mb-4">
        <Select options={filterOpts} value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-44" />
        <span className="text-sm text-gray-500 dark:text-gray-400">{filtered.length} {t('company.jobs.applicants').toLowerCase()}</span>
      </div>

      {filtered.length === 0
        ? <EmptyState icon={<span className="text-5xl">👥</span>} title={t('company.applicants.empty')} />
        : (
          <div className="space-y-3">
            {filtered.map(app => {
              const reviewer = companyUsers.find(u => u.id === app.reviewer_id)
              return (
                <Card key={app.id} className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{app.candidate_id}</p>
                        <Badge status={app.status} label={t(`candidate.applications.status_${app.status}`)} />
                      </div>
                      {reviewer && (
                        <p className="text-xs text-brand-500 mb-1">👤 {t('company.applicants.assignedTo')}: {reviewer.full_name}</p>
                      )}
                      {app.fit_check && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Fit: {app.fit_check.score}% · {app.fit_check.passed ? '✅' : '❌'}
                        </p>
                      )}
                      {app.feedback_to_candidate && (
                        <p className="text-xs text-blue-500 mt-1">💬 {app.feedback_to_candidate}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {/* Assign manager — always available */}
                      <Button size="sm" variant="secondary" onClick={() => openAssignModal(app)}>
                        👤 {t('company.applicants.assign')}
                      </Button>
                      {['Pending', 'Reviewed', 'Testing'].includes(app.status) && (
                        <>
                          <Button size="sm" onClick={() => handleStatus(app.id, 'Hired')}>{t('company.applicants.accept')}</Button>
                          <Button size="sm" variant="danger" onClick={() => handleStatus(app.id, 'Rejected')}>{t('company.applicants.reject')}</Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost"
                        onClick={() => { setFeedbackModal(app); setFeedbackText(app.feedback_to_candidate || '') }}>
                        💬
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )
      }

      {/* Assign manager modal */}
      <Modal open={!!assignModal} onClose={() => { setAssignModal(null); setSelectedReviewer('') }}
        title={t('company.applicants.assignManager')}>
        <div className="space-y-4">
          <Select
            label={t('company.applicants.selectManager')}
            options={reviewerOpts}
            value={selectedReviewer}
            onChange={e => setSelectedReviewer(e.target.value)}
          />
          <Button className="w-full" onClick={handleAssignReviewer} loading={assigning}>
            {t('common.save')}
          </Button>
        </div>
      </Modal>

      {/* Feedback modal */}
      <Modal open={!!feedbackModal} onClose={() => setFeedbackModal(null)} title={t('company.applicants.feedback')}>
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('company.applicants.feedback')}</label>
            <textarea rows={4} value={feedbackText} onChange={e => setFeedbackText(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <Button className="w-full" onClick={handleFeedback}>{t('common.save')}</Button>
        </div>
      </Modal>
    </div>
  )
}
