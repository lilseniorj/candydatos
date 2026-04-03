import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCompany } from '../../context/CompanyContext'
import { getApplicationsByJob, getApplicationsByJobPaginated, updateApplicationStatus, assignReviewer, bulkUpdateStatus, bulkAssignReviewer } from '../../services/applications'
import { createNotification } from '../../services/notifications'
import { getCompanyUsers } from '../../services/companies'
import { getJob } from '../../services/jobs'
import { getCandidate } from '../../services/candidates'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Select from '../../components/ui/Select'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import EmptyState from '../../components/ui/EmptyState'
import Spinner from '../../components/ui/Spinner'
import ApplicantListSkeleton from '../../components/skeletons/ApplicantListSkeleton'
import { useToast } from '../../context/ToastContext'

const STATUSES = ['All', 'Pending', 'Reviewed', 'Testing', 'Rejected', 'Hired']

export default function ApplicantList() {
  const { t } = useTranslation()
  const { jobId } = useParams()
  const navigate = useNavigate()
  const { company } = useCompany()
  const toast = useToast()

  const [job, setJob]                       = useState(null)
  const [apps, setApps]                     = useState([])
  const [candidatesMap, setCandidatesMap]   = useState({})
  const [statusFilter, setStatusFilter]     = useState('All')
  const [search, setSearch]                 = useState('')
  const [loading, setLoading]               = useState(true)
  const [companyUsers, setCompanyUsers]     = useState([])
  const [lastDoc, setLastDoc]               = useState(null)
  const [hasMore, setHasMore]               = useState(false)
  const [loadingMore, setLoadingMore]       = useState(false)

  const [feedbackModal, setFeedbackModal]   = useState(null)
  const [feedbackText, setFeedbackText]     = useState('')
  const [assignModal, setAssignModal]       = useState(null)
  const [selectedReviewer, setSelectedReviewer] = useState('')
  const [assigning, setAssigning]           = useState(false)

  // Bulk actions
  const [selected, setSelected]             = useState(new Set())
  const [bulkModal, setBulkModal]           = useState(null) // 'reject' | 'advance' | 'assign'
  const [bulkFeedback, setBulkFeedback]     = useState('')
  const [bulkReviewer, setBulkReviewer]     = useState('')
  const [bulkProcessing, setBulkProcessing] = useState(false)

  function toggleSelect(appId) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(appId)) next.delete(appId)
      else next.add(appId)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(a => a.id)))
  }

  async function handleBulkReject() {
    setBulkProcessing(true)
    try {
      const ids = [...selected]
      await bulkUpdateStatus(ids, 'Rejected', bulkFeedback || null)
      setApps(prev => prev.map(a => ids.includes(a.id) ? { ...a, status: 'Rejected', feedback_to_candidate: bulkFeedback || a.feedback_to_candidate } : a))
      // Send in-app notifications
      const selectedApps = apps.filter(a => ids.includes(a.id))
      await Promise.all(selectedApps.map(a =>
        createNotification(a.candidate_id, {
          type: 'rejected',
          title: 'Tu aplicación no fue seleccionada',
          body: bulkFeedback || `Tu aplicación a ${job?.title || ''} no avanzó en el proceso.`,
          jobTitle: job?.title || '',
          jobId: jobId,
          appId: a.id,
        }).catch(err => console.error('Notification error:', err))
      ))
      toast.success(t('toast.bulkRejected', { count: ids.length }))
      setSelected(new Set())
      setBulkModal(null)
      setBulkFeedback('')
    } finally { setBulkProcessing(false) }
  }

  async function handleBulkAdvance() {
    setBulkProcessing(true)
    try {
      const ids = [...selected]
      await bulkUpdateStatus(ids, 'Reviewed')
      setApps(prev => prev.map(a => ids.includes(a.id) ? { ...a, status: 'Reviewed' } : a))
      // Send in-app notifications
      const selectedApps = apps.filter(a => ids.includes(a.id))
      await Promise.all(selectedApps.map(a =>
        createNotification(a.candidate_id, {
          type: 'status_change',
          title: 'Tu aplicación está siendo revisada',
          body: `Tu aplicación a ${job?.title || ''} avanzó a la etapa de revisión.`,
          jobTitle: job?.title || '',
          jobId: jobId,
          appId: a.id,
        }).catch(err => console.error('Notification error:', err))
      ))
      toast.success(t('toast.bulkAdvanced', { count: ids.length }))
      setSelected(new Set())
      setBulkModal(null)
    } finally { setBulkProcessing(false) }
  }

  async function handleBulkAssign() {
    if (!bulkReviewer) return
    setBulkProcessing(true)
    try {
      const ids = [...selected]
      await bulkAssignReviewer(ids, bulkReviewer)
      setApps(prev => prev.map(a => ids.includes(a.id) ? { ...a, reviewer_id: bulkReviewer } : a))
      toast.success(t('toast.bulkAssigned', { count: ids.length }))
      setSelected(new Set())
      setBulkModal(null)
      setBulkReviewer('')
    } finally { setBulkProcessing(false) }
  }

  async function fetchCandidates(appList, existingMap = {}) {
    const newIds = [...new Set(appList.map(ap => ap.candidate_id).filter(id => id && !existingMap[id]))]
    if (newIds.length === 0) return existingMap
    const candidates = await Promise.all(newIds.map(id => getCandidate(id)))
    const map = { ...existingMap }
    candidates.forEach((c, i) => { if (c) map[newIds[i]] = c })
    return map
  }

  useEffect(() => {
    async function load() {
      const [j, { applications: firstPage, lastDoc: ld, hasMore: hm }] = await Promise.all([
        getJob(jobId),
        getApplicationsByJobPaginated(jobId),
      ])
      setJob(j)
      const nonDraft = firstPage.filter(ap => ap.status !== 'Draft')
      setApps(nonDraft)
      setLastDoc(ld)
      setHasMore(hm)

      const map = await fetchCandidates(nonDraft)
      setCandidatesMap(map)

      setLoading(false)
    }
    load()
  }, [jobId])

  async function loadMoreApps() {
    if (!hasMore || loadingMore) return
    setLoadingMore(true)
    const { applications: nextPage, lastDoc: ld, hasMore: hm } = await getApplicationsByJobPaginated(jobId, lastDoc)
    const nonDraft = nextPage.filter(ap => ap.status !== 'Draft')
    setApps(prev => [...prev, ...nonDraft])
    setLastDoc(ld)
    setHasMore(hm)
    const map = await fetchCandidates(nonDraft, candidatesMap)
    setCandidatesMap(map)
    setLoadingMore(false)
  }

  useEffect(() => {
    if (!company?.id) return
    getCompanyUsers(company.id).then(setCompanyUsers)
  }, [company?.id])

  const PIPELINE_KEYS = ['received', 'reviewing', 'interview', 'technical', 'offer', 'hired', 'rejected']

  const filtered = apps
    .filter(a => {
      if (statusFilter === 'All') return true
      if (PIPELINE_KEYS.includes(statusFilter)) return (a.pipeline_stage || 'received') === statusFilter
      return a.status === statusFilter
    })
    .filter(a => {
      if (!search) return true
      const c = candidatesMap[a.candidate_id]
      const name = [c?.first_name, c?.last_name].filter(Boolean).join(' ').toLowerCase()
      return name.includes(search.toLowerCase()) || a.candidate_id.toLowerCase().includes(search.toLowerCase())
    })

  async function handleStatus(appId, status) {
    await updateApplicationStatus(appId, status)
    setApps(prev => prev.map(a => a.id === appId ? { ...a, status } : a))
    // Send in-app notification
    const targetApp = apps.find(a => a.id === appId)
    if (targetApp && job) {
      const statusLabels = { Reviewed: 'En revisión', Testing: 'En pruebas', Hired: 'Contratado', Rejected: 'Rechazado' }
      createNotification(targetApp.candidate_id, {
        type: status === 'Hired' ? 'hired' : status === 'Rejected' ? 'rejected' : 'status_change',
        title: status === 'Hired' ? '¡Felicidades! Has sido contratado' : status === 'Rejected' ? 'Tu aplicación no fue seleccionada' : `Tu aplicación cambió a: ${statusLabels[status] || status}`,
        body: `Tu aplicación a ${job.title} cambió de estado.`,
        jobTitle: job.title,
        jobId: jobId,
        appId,
      }).catch(err => console.error('Notification error:', err))
    }
  }

  async function handleFeedback() {
    await updateApplicationStatus(feedbackModal.id, feedbackModal.status, feedbackText)
    setApps(prev => prev.map(a => a.id === feedbackModal.id ? { ...a, feedback_to_candidate: feedbackText } : a))
    // Send in-app notification with feedback
    if (feedbackModal && job) {
      createNotification(feedbackModal.candidate_id, {
        type: 'feedback',
        title: 'El reclutador te dejó un comentario',
        body: feedbackText || `Tienes un nuevo comentario en tu aplicación a ${job.title}.`,
        jobTitle: job.title,
        jobId: jobId,
        appId: feedbackModal.id,
      }).catch(err => console.error('Notification error:', err))
    }
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

  function formatDate(ts) {
    if (!ts) return '—'
    const d = ts.toDate ? ts.toDate() : ts.seconds ? new Date(ts.seconds * 1000) : null
    return d ? d.toLocaleDateString() : '—'
  }

  const filterOpts   = STATUSES.map(s => ({ value: s, label: s === 'All' ? t('common.all') : t(`candidate.applications.status_${s}`) }))
  const reviewerOpts = [
    { value: '', label: `— ${t('company.applicants.noManager')} —` },
    ...companyUsers.map(u => ({ value: u.id, label: `${u.full_name} (${u.role})` })),
  ]

  if (loading) return <ApplicantListSkeleton />

  return (
    <div className="space-y-6">
      {/* ── Back + Header ────────────────────────────────────────────────── */}
      <Link to="/company/jobs" className="inline-flex items-center gap-1 text-sm text-brand-500 hover:text-brand-600 font-medium">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        {t('company.jobs.title')}
      </Link>

      {/* ── Job Info Summary ─────────────────────────────────────────────── */}
      {job && (
        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{job.title}</h1>
                <Badge status={job.status} />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {job.country} · {job.work_modality} · ${job.min_salary?.toLocaleString()}–${job.max_salary?.toLocaleString()}
                {job.years_experience_required > 0 && ` · ${job.years_experience_required} ${t('candidate.jobs.yearsExp')}`}
              </p>
              {job.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">{job.description}</p>
              )}
              {job.benefits?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {job.benefits.map(b => (
                    <span key={b} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">{b}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="text-center shrink-0">
              <p className="text-3xl font-bold text-brand-500">{apps.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('company.jobs.applicants')}</p>
            </div>
          </div>
        </Card>
      )}

      {/* ── Pipeline summary ────────────────────────────────────────────── */}
      {apps.length > 0 && (() => {
        const stages = [
          { key: 'received',  icon: '📥', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
          { key: 'reviewing', icon: '👁',  color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
          { key: 'interview', icon: '🎤', color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' },
          { key: 'technical', icon: '💻', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' },
          { key: 'offer',     icon: '📝', color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300' },
          { key: 'hired',     icon: '✅', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
          { key: 'rejected',  icon: '❌', color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300' },
        ]
        const counts = {}
        apps.forEach(a => {
          const s = a.pipeline_stage || 'received'
          counts[s] = (counts[s] || 0) + 1
        })
        return (
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {stages.map(({ key, icon, color }) => (
              <button key={key} onClick={() => setStatusFilter(key === statusFilter ? 'All' : key)}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl transition-all ${
                  statusFilter === key ? 'ring-2 ring-brand-500 ' + color : counts[key] ? color : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                }`}>
                <span className="text-lg">{icon}</span>
                <span className="text-xl font-bold">{counts[key] || 0}</span>
                <span className="text-[10px] font-medium leading-tight text-center">{t(`company.pipeline.${key}`)}</span>
              </button>
            ))}
          </div>
        )
      })()}

      {/* ── Bulk action bar ──────────────────────────────────────────────── */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800">
          <span className="text-sm font-medium text-brand-700 dark:text-brand-300">
            {selected.size} {t('company.bulk.selected')}
          </span>
          <div className="flex-1" />
          <Button size="sm" variant="danger" onClick={() => setBulkModal('reject')}>
            {t('company.bulk.reject')}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setBulkModal('advance')}>
            {t('company.bulk.advance')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setBulkModal('assign')}>
            {t('company.bulk.assignAll')}
          </Button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            {t('common.cancel')}
          </button>
        </div>
      )}

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-50">
          <Input placeholder={t('company.applicants.search')} value={search} onChange={e => setSearch(e.target.value)} aria-label={t('company.applicants.search')} />
        </div>
        <Select options={filterOpts} value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-40" />
        <span className="text-sm text-gray-500 dark:text-gray-400">{filtered.length} {t('company.jobs.applicants').toLowerCase()}</span>
      </div>

      {/* ── Applicant Table ──────────────────────────────────────────────── */}
      {filtered.length === 0
        ? <EmptyState icon={<span className="text-5xl">👥</span>} title={t('company.applicants.empty')} />
        : (
          <div className="space-y-2">
            {/* Select all */}
            <div className="flex items-center gap-2 px-1">
              <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                aria-label={t('company.bulk.selectAll')} />
              <span className="text-xs text-gray-500 dark:text-gray-400">{t('company.bulk.selectAll')}</span>
            </div>
            {filtered.map(app => {
              const candidate = candidatesMap[app.candidate_id]
              const name = [candidate?.first_name, candidate?.last_name].filter(Boolean).join(' ') || app.candidate_id.slice(0, 12) + '…'
              const reviewer = companyUsers.find(u => u.id === app.reviewer_id)
              const score = app.fit_check?.score
              const scoreColor = score >= 70 ? 'text-green-500' : score >= 40 ? 'text-orange-500' : 'text-red-400'

              return (
                <Card key={app.id} className={`p-4 hover:ring-2 hover:ring-brand-300 dark:hover:ring-brand-700 transition-all cursor-pointer ${selected.has(app.id) ? 'ring-2 ring-brand-400 dark:ring-brand-600 bg-brand-50/50 dark:bg-brand-900/10' : ''}`}
                  onClick={() => navigate(`/company/jobs/${jobId}/applicants/${app.id}`)}>
                  <div className="flex items-center gap-4">
                    {/* Checkbox */}
                    <div className="shrink-0" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(app.id)} onChange={() => toggleSelect(app.id)}
                        className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
                    </div>
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-brand-600 dark:text-brand-300 text-sm font-bold shrink-0">
                      {candidate?.first_name?.[0]?.toUpperCase() || '?'}{candidate?.last_name?.[0]?.toUpperCase() || ''}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">{name}</p>
                        <Badge status={app.status} label={t(`candidate.applications.status_${app.status}`)} />
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {candidate?.city && <span>📍 {candidate.city}</span>}
                        <span>📅 {formatDate(app.applied_at)}</span>
                        {reviewer && <span>👤 {reviewer.full_name}</span>}
                      </div>
                      {app.feedback_to_candidate && (
                        <p className="text-xs text-blue-500 mt-1 truncate">💬 {app.feedback_to_candidate}</p>
                      )}
                    </div>

                    {/* Score */}
                    {score != null && (
                      <div className="text-center shrink-0 px-2">
                        <div className="relative inline-flex items-center justify-center">
                          <svg width="44" height="44" viewBox="0 0 44 44">
                            <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth="4" className="text-gray-200 dark:text-gray-700" />
                            <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"
                              className={scoreColor}
                              strokeDasharray={`${(score / 100) * 113} 113`}
                              transform="rotate(-90 22 22)" />
                          </svg>
                          <span className={`absolute text-xs font-bold ${scoreColor}`}>{score}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">Fit</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" aria-label={t('company.applicants.assignManager')} onClick={() => { setAssignModal(app); setSelectedReviewer(app.reviewer_id || '') }}>
                        👤
                      </Button>
                      <Button size="sm" variant="ghost" aria-label={t('company.applicants.feedback')}
                        onClick={() => { setFeedbackModal(app); setFeedbackText(app.feedback_to_candidate || '') }}>
                        💬
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
            {hasMore && (
              <button onClick={loadMoreApps} disabled={loadingMore}
                className="w-full py-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors disabled:opacity-50">
                {loadingMore ? <Spinner size="sm" /> : t('common.loadMore')}
              </button>
            )}
          </div>
        )
      }

      {/* Assign manager modal */}
      <Modal open={!!assignModal} onClose={() => { setAssignModal(null); setSelectedReviewer('') }}
        title={t('company.applicants.assignManager')}>
        <div className="space-y-4">
          <Select label={t('company.applicants.selectManager')} options={reviewerOpts}
            value={selectedReviewer} onChange={e => setSelectedReviewer(e.target.value)} />
          <Button className="w-full" onClick={handleAssignReviewer} loading={assigning}>{t('common.save')}</Button>
        </div>
      </Modal>

      {/* Feedback modal */}
      <Modal open={!!feedbackModal} onClose={() => setFeedbackModal(null)} title={t('company.applicants.feedback')}>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {['profileNotAligned', 'positionFilled', 'insufficientExperience', 'missingSkills', 'keepInTouch'].map(key => (
              <button key={key} onClick={() => setFeedbackText(t(`company.feedbackTemplates.${key}`))}
                className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-brand-100 hover:text-brand-700 dark:hover:bg-brand-900/40 dark:hover:text-brand-300 transition-colors">
                {t(`company.feedbackTemplates.${key}Label`)}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('company.applicants.feedback')}</label>
            <textarea rows={3} value={feedbackText} onChange={e => setFeedbackText(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <Button className="w-full" onClick={handleFeedback}>{t('common.save')}</Button>
        </div>
      </Modal>

      {/* Bulk reject modal */}
      <Modal open={bulkModal === 'reject'} onClose={() => { setBulkModal(null); setBulkFeedback('') }}
        title={t('company.bulk.rejectTitle', { count: selected.size })}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('company.bulk.rejectDesc', { count: selected.size })}</p>
          <div className="flex flex-wrap gap-1.5">
            {['profileNotAligned', 'positionFilled', 'insufficientExperience', 'missingSkills', 'keepInTouch'].map(key => (
              <button key={key} onClick={() => setBulkFeedback(t(`company.feedbackTemplates.${key}`))}
                className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-brand-100 hover:text-brand-700 dark:hover:bg-brand-900/40 dark:hover:text-brand-300 transition-colors">
                {t(`company.feedbackTemplates.${key}Label`)}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('company.bulk.feedbackOptional')}</label>
            <textarea rows={3} value={bulkFeedback} onChange={e => setBulkFeedback(e.target.value)}
              placeholder={t('company.bulk.feedbackPlaceholder')}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => { setBulkModal(null); setBulkFeedback('') }}>{t('common.cancel')}</Button>
            <Button variant="danger" className="flex-1" onClick={handleBulkReject} loading={bulkProcessing}>{t('company.bulk.confirmReject')}</Button>
          </div>
        </div>
      </Modal>

      {/* Bulk advance modal */}
      <Modal open={bulkModal === 'advance'} onClose={() => setBulkModal(null)}
        title={t('company.bulk.advanceTitle', { count: selected.size })}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('company.bulk.advanceDesc', { count: selected.size })}</p>
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setBulkModal(null)}>{t('common.cancel')}</Button>
            <Button className="flex-1" onClick={handleBulkAdvance} loading={bulkProcessing}>{t('common.confirm')}</Button>
          </div>
        </div>
      </Modal>

      {/* Bulk assign modal */}
      <Modal open={bulkModal === 'assign'} onClose={() => { setBulkModal(null); setBulkReviewer('') }}
        title={t('company.bulk.assignTitle', { count: selected.size })}>
        <div className="space-y-4">
          <Select label={t('company.applicants.selectManager')} options={reviewerOpts}
            value={bulkReviewer} onChange={e => setBulkReviewer(e.target.value)} />
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => { setBulkModal(null); setBulkReviewer('') }}>{t('common.cancel')}</Button>
            <Button className="flex-1" onClick={handleBulkAssign} loading={bulkProcessing}>{t('common.confirm')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
