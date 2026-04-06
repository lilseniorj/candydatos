import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getApplication, updateApplicationPipeline, addApplicationNote, updateApplicationStatus } from '../../services/applications'
import { getCandidate } from '../../services/candidates'
import { useCompany } from '../../context/CompanyContext'
import { useAuth } from '../../context/AuthContext'
import { sendRejectionEmail, sendPipelineEmail, createNotification } from '../../services/notifications'
import { getJob } from '../../services/jobs'
import { getResumesByCandidate } from '../../services/resumes'
import { getTestResultsByApplication } from '../../services/testResults'
import { generateCandidateReport } from '../../services/reportPdf'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'

// ─── Pipeline stages ────────────────────────────────────────────────────────
const STAGES = ['received', 'reviewing', 'interview', 'technical', 'offer', 'hired']
const STAGE_ICONS  = { received: '📥', reviewing: '👁', interview: '🎤', technical: '💻', offer: '📝', hired: '✅' }
const REJECTED = 'rejected'

// ─── Score Ring ─────────────────────────────────────────────────────────────
function ScoreRing({ value, size = 64 }) {
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const color = value >= 70 ? 'text-green-500' : value >= 40 ? 'text-orange-500' : 'text-red-400'
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth="5" className="text-gray-200 dark:text-gray-700" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round"
          className={color} strokeDasharray={`${(value/100)*circ} ${circ}`} transform={`rotate(-90 ${size/2} ${size/2})`} />
      </svg>
      <span className={`absolute text-sm font-bold ${color}`}>{value}</span>
    </div>
  )
}

// ─── Pipeline component ─────────────────────────────────────────────────────
function Pipeline({ current, isRejected, history, t }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {STAGES.map((stage, i) => {
        const isCurrent = stage === current && !isRejected
        const isPast = STAGES.indexOf(current) > i && !isRejected
        const isHired = stage === 'hired' && current === 'hired'
        const ts = history?.[stage]

        return (
          <div key={stage} className="flex items-center gap-1 shrink-0">
            <div className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg text-center min-w-[72px] transition-all ${
              isHired ? 'bg-green-100 dark:bg-green-900/30 ring-2 ring-green-500' :
              isCurrent ? 'bg-brand-100 dark:bg-brand-900/30 ring-2 ring-brand-500' :
              isPast ? 'bg-brand-50 dark:bg-brand-900/20' :
              'bg-gray-100 dark:bg-gray-800'
            }`}>
              <span className="text-lg">{STAGE_ICONS[stage]}</span>
              <span className={`text-[10px] font-medium leading-tight ${
                isCurrent || isHired ? 'text-brand-600 dark:text-brand-300' :
                isPast ? 'text-brand-500 dark:text-brand-400' :
                'text-gray-400 dark:text-gray-500'
              }`}>{t(`company.pipeline.${stage}`)}</span>
              {ts && <span className="text-[9px] text-gray-400">{new Date(ts).toLocaleDateString()}</span>}
            </div>
            {i < STAGES.length - 1 && (
              <div className={`w-4 h-0.5 shrink-0 ${isPast ? 'bg-brand-400' : 'bg-gray-300 dark:bg-gray-600'}`} />
            )}
          </div>
        )
      })}
      {isRejected && (
        <>
          <div className="w-4 h-0.5 bg-red-300 shrink-0" />
          <div className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 ring-2 ring-red-500 min-w-[72px]">
            <span className="text-lg">❌</span>
            <span className="text-[10px] font-medium text-red-600 dark:text-red-300">{t('company.pipeline.rejected')}</span>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Country phone prefixes ─────────────────────────────────────────────────
const COUNTRY_CODES = {
  Colombia: '57', Argentina: '54', Mexico: '52', Chile: '56', Peru: '51',
  Ecuador: '593', Venezuela: '58', Brasil: '55', Uruguay: '598', Paraguay: '595',
  Bolivia: '591', Panama: '507', 'Costa Rica': '506', Guatemala: '502',
  Honduras: '504', 'El Salvador': '503', Nicaragua: '505', 'Rep. Dominicana': '1',
  'United States': '1', USA: '1', Spain: '34', 'España': '34',
}

function getWhatsAppNumber(phone, country) {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  // If already has country code (starts with + or is long enough), use as-is
  if (digits.length > 10) return digits
  const prefix = COUNTRY_CODES[country] || '57' // default Colombia
  return prefix + digits
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function ApplicantDetail() {
  const { t } = useTranslation()
  const { jobId, appId } = useParams()
  const { company } = useCompany()
  const { userDoc: currentUser, firebaseUser } = useAuth()

  const [app, setApp]             = useState(null)
  const [candidate, setCandidate] = useState(null)
  const [job, setJob]             = useState(null)
  const [resumes, setResumes]     = useState([])
  const [testResults, setTestResults] = useState([])
  const [loading, setLoading]     = useState(true)
  const [notesList, setNotesList]   = useState([])
  const [newNote, setNewNote]       = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason]       = useState('')
  const [rejecting, setRejecting]             = useState(false)
  const [advancing, setAdvancing] = useState(false)

  useEffect(() => {
    async function load() {
      const [fetchedApp, fetchedJob] = await Promise.all([getApplication(appId), getJob(jobId)])
      if (!fetchedApp || !fetchedJob) { setLoading(false); return }
      setApp(fetchedApp)
      setJob(fetchedJob)
      setNotesList(Array.isArray(fetchedApp.internal_notes) ? fetchedApp.internal_notes : [])

      const [c, r, tr] = await Promise.all([
        getCandidate(fetchedApp.candidate_id),
        getResumesByCandidate(fetchedApp.candidate_id),
        getTestResultsByApplication(appId),
      ])
      setCandidate(c)
      setResumes(r)
      setTestResults(tr)
      setLoading(false)
    }
    load()
  }, [jobId, appId])

  const currentStage = app?.pipeline_stage || 'received'
  const isRejected = currentStage === REJECTED
  const isHired = currentStage === 'hired'
  const stageHistory = app?.stage_history || {}
  const currentIdx = STAGES.indexOf(currentStage)
  const nextStage = !isRejected && !isHired && currentIdx < STAGES.length - 1 ? STAGES[currentIdx + 1] : null

  async function handleAdvance() {
    if (!nextStage) return
    setAdvancing(true)
    const newHistory = { ...stageHistory, [nextStage]: new Date().toISOString() }
    await updateApplicationPipeline(appId, nextStage, newHistory)
    // Also update status for compatibility
    const statusMap = { reviewing: 'Reviewed', interview: 'Reviewed', technical: 'Testing', offer: 'Reviewed', hired: 'Hired' }
    if (statusMap[nextStage]) await updateApplicationStatus(appId, statusMap[nextStage])
    setApp(prev => ({ ...prev, pipeline_stage: nextStage, stage_history: newHistory }))

    // Send notifications (email + in-app)
    if (job) {
      const candidateName = [candidate?.first_name, candidate?.last_name].filter(Boolean).join(' ')
      const stageLabels = { reviewing: 'En revisión', interview: 'Entrevista', technical: 'Prueba técnica', offer: 'Oferta', hired: 'Contratado' }
      try {
        await createNotification(app.candidate_id, {
          type: nextStage === 'hired' ? 'hired' : 'status_change',
          title: nextStage === 'hired' ? `¡Felicidades! Has sido contratado` : `Tu aplicación avanzó a: ${stageLabels[nextStage] || nextStage}`,
          body: `Tu aplicación a ${job.title} en ${company?.commercial_name || ''} cambió de estado.`,
          jobTitle: job.title,
          jobId: job.id,
          appId,
        })
      } catch (err) { console.error('Failed to create in-app notification:', err) }
      if (candidate?.email) {
        try {
          await sendPipelineEmail({
            candidateEmail: candidate.email,
            candidateName,
            jobTitle: job.title,
            companyName: company?.commercial_name || '',
            newStage: nextStage,
          })
        } catch (err) { console.error('Failed to queue pipeline email:', err) }
      }
    }

    setAdvancing(false)
  }

  async function handleReject() {
    setRejecting(true)
    const newHistory = { ...stageHistory, [REJECTED]: new Date().toISOString() }
    await updateApplicationPipeline(appId, REJECTED, newHistory)
    // Save rejection reason as feedback visible to the candidate
    await updateApplicationStatus(appId, 'Rejected', rejectReason || null)
    setApp(prev => ({ ...prev, pipeline_stage: REJECTED, stage_history: newHistory, status: 'Rejected', feedback_to_candidate: rejectReason }))

    // Send notifications (in-app + email)
    if (job) {
      try {
        await createNotification(app.candidate_id, {
          type: 'rejected',
          title: 'Tu aplicación no fue seleccionada',
          body: rejectReason || `Tu aplicación a ${job.title} en ${company?.commercial_name || ''} no avanzó en el proceso.`,
          jobTitle: job.title,
          jobId: job.id,
          appId,
        })
      } catch (err) { console.error('Failed to create in-app notification:', err) }
      if (candidate?.email) {
        try {
          await sendRejectionEmail({
            candidateEmail: candidate.email,
            candidateName: [candidate.first_name, candidate.last_name].filter(Boolean).join(' '),
            jobTitle: job.title,
            companyName: company?.commercial_name || '',
            feedback: rejectReason,
          })
        } catch (err) { console.error('Failed to queue rejection email:', err) }
      }
    }

    setRejecting(false)
    setShowRejectModal(false)
    setRejectReason('')
  }

  async function handleAddNote() {
    if (!newNote.trim()) return
    setSavingNotes(true)
    const authorName = currentUser?.full_name || firebaseUser?.displayName || 'Unknown'
    const authorPhoto = firebaseUser?.photoURL || ''
    const note = await addApplicationNote(appId, newNote.trim(), authorName, authorPhoto)
    setNotesList(prev => [...prev, note])
    setNewNote('')
    setSavingNotes(false)
  }

  function formatDate(ts) {
    if (!ts) return '—'
    const d = ts.toDate ? ts.toDate() : ts.seconds ? new Date(ts.seconds * 1000) : null
    return d ? d.toLocaleDateString() : '—'
  }

  if (loading) return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>
  if (!app || !job) return <p className="text-center py-24 text-gray-500">Not found</p>

  const resume = resumes.find(r => r.id === app.resume_id) || resumes[0]
  const data = resume?.extracted_data || {}
  const fitScore = app.fit_check?.score
  const testScore = testResults[0]?.score
  const hasFit = fitScore != null && fitScore > 0
  const hasTest = testScore != null && testScore > 0
  // Weighted: 40% fit check + 60% interview test
  const combinedScore = hasFit && hasTest
    ? Math.round(fitScore * 0.4 + testScore * 0.6)
    : hasFit && !hasTest
      ? fitScore
      : hasTest ? testScore : 0

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Back */}
      <Link to={`/company/jobs/${jobId}/applicants`} className="inline-flex items-center gap-1 text-sm text-brand-500 hover:text-brand-600 font-medium">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        {t('company.applicants.title')}
      </Link>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <Card className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-brand-500 flex items-center justify-center text-white text-lg font-bold shrink-0">
            {candidate?.first_name?.[0]?.toUpperCase() || '?'}{candidate?.last_name?.[0]?.toUpperCase() || ''}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {[candidate?.first_name, candidate?.last_name].filter(Boolean).join(' ') || app.candidate_id}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
              {candidate?.city && <span>📍 {candidate.city}, {candidate.country}</span>}
              {candidate?.email && <span>✉ {candidate.email}</span>}
              {candidate?.phone && (
                <a href={`https://wa.me/${getWhatsAppNumber(candidate.phone, candidate.country)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-green-500 hover:text-green-400 font-medium">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.387 0-4.594-.822-6.339-2.2l-.444-.356-3.277 1.098 1.098-3.277-.356-.444A9.96 9.96 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
                  {candidate.phone}
                </a>
              )}
              <span>📅 {formatDate(app.applied_at)}</span>
            </div>
            <div className="mt-2">
              <Badge status="Active" label={job.title} />
            </div>
          </div>
          {combinedScore > 0 && (
            <div className="shrink-0 text-center">
              <ScoreRing value={combinedScore} size={72} />
              <p className="text-xs text-gray-500 mt-1">Score</p>
            </div>
          )}
        </div>
      </Card>

      {/* ── Pipeline ─────────────────────────────────────────────────────── */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('company.pipeline.title')}</h2>
        <Pipeline current={currentStage} isRejected={isRejected} history={stageHistory} t={t} />
        <div className="flex gap-2 mt-4">
          {nextStage && (
            <Button onClick={handleAdvance} loading={advancing}>
              {t('company.pipeline.advanceTo')} {t(`company.pipeline.${nextStage}`)}
            </Button>
          )}
          {!isRejected && !isHired && (
            <Button variant="danger" onClick={() => setShowRejectModal(true)}>{t('company.pipeline.reject')}</Button>
          )}
          <Button variant="secondary" onClick={() => generateCandidateReport({
            candidate, job, company, fitCheck: app.fit_check, testResults,
            resumeData: resume?.extracted_data, combinedScore,
          })}>
            📄 PDF
          </Button>
          {isHired && (
            <div className="px-4 py-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium">
              ✅ {t('company.pipeline.hired')}
            </div>
          )}
          {isRejected && (
            <div className="px-4 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 text-sm font-medium">
              ❌ {t('company.pipeline.rejected')}
            </div>
          )}
        </div>
      </Card>

      {/* ── Two columns ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left column (3/5) */}
        <div className="lg:col-span-3 space-y-5">
          {/* Personal info */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">👤 {t('company.applicantDetail.personalInfo')}</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                [t('company.applicantDetail.city'), candidate?.city || '—'],
                [t('company.applicantDetail.country'), candidate?.country || '—'],
                ['Email', candidate?.email || '—'],
                [t('company.applicantDetail.phone'), candidate?.phone || '—'],
                [t('company.applicantDetail.idType'), candidate?.identification_type || '—'],
                [t('company.applicantDetail.idNumber'), candidate?.identification_number || '—'],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
                  <p className="font-medium text-gray-900 dark:text-white">{val}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Skills */}
          {data.skills?.length > 0 && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">⚡ {t('company.applicantDetail.skills')}</h2>
              <div className="flex flex-wrap gap-2">
                {data.skills.map(s => (
                  <span key={s} className="px-2.5 py-1 rounded-full text-xs font-medium bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 border border-brand-200 dark:border-brand-800">{s}</span>
                ))}
              </div>
            </Card>
          )}

          {/* Experience */}
          {data.experience?.length > 0 && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">💼 {t('company.applicantDetail.experience')}</h2>
              <div className="space-y-4">
                {data.experience.map((e, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-brand-500 mt-2 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{e.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{e.company}{e.years ? ` · ${e.years}` : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Education */}
          {data.education?.length > 0 && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">🎓 {t('company.applicantDetail.education')}</h2>
              <div className="space-y-3">
                {data.education.map((e, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{e.degree}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{e.institution}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* CV & Documents */}
          {resume && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">📎 {t('company.applicantDetail.documents')}</h2>
              <a href={resume.document_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <span className="text-2xl">📄</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{resume.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(resume.created_at)}</p>
                </div>
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
            </Card>
          )}

          {/* Summary */}
          {data.summary && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">📝 {t('company.applicantDetail.summary')}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{data.summary}</p>
            </Card>
          )}
        </div>

        {/* Right column (2/5) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Fit check details */}
          {app.fit_check && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">🎯 Fit Check</h2>
              <div className="text-center mb-4">
                <ScoreRing value={app.fit_check.score} size={80} />
                <p className={`text-sm font-medium mt-1 ${app.fit_check.passed ? 'text-green-500' : 'text-red-400'}`}>
                  {app.fit_check.passed ? '✅ ' + t('candidate.apply.fitPassed') : '❌ ' + t('candidate.apply.fitFailed')}
                </p>
              </div>
              {app.fit_check.feedback && (
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{app.fit_check.feedback}</p>
              )}
            </Card>
          )}

          {/* Test results */}
          {testResults.length > 0 && testResults.map(tr => (
            <Card key={tr.id} className="p-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">🧪 {t('company.applicantDetail.testResults')}</h2>
              <div className="text-center mb-4">
                <ScoreRing value={tr.score} size={72} />
                <p className={`text-xs font-medium mt-1 ${tr.gemini_evaluation?.passed ? 'text-green-500' : 'text-red-400'}`}>
                  {tr.score}/100
                </p>
              </div>
              {tr.trait_scores && Object.entries(tr.trait_scores).map(([trait, val]) => (
                <div key={trait} className="mb-2">
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-gray-600 dark:text-gray-400 capitalize">{trait.replace(/_/g, ' ')}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{val}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${val >= 70 ? 'bg-green-500' : val >= 40 ? 'bg-orange-500' : 'bg-red-400'}`}
                      style={{ width: `${val}%` }} />
                  </div>
                </div>
              ))}
              {tr.gemini_evaluation?.feedback && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 leading-relaxed">{tr.gemini_evaluation.feedback}</p>
              )}
              {tr.video_url && (
                <div className="mt-4">
                  <h3 className="text-xs font-semibold text-gray-900 dark:text-white mb-2">🎥 {t('company.applicantDetail.interviewRecording')}</h3>
                  <video controls className="w-full rounded-lg bg-gray-900" preload="metadata">
                    <source src={tr.video_url} type="video/webm" />
                  </video>
                </div>
              )}
            </Card>
          ))}

          {/* Stage history */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">📋 {t('company.applicantDetail.history')}</h2>
            <div className="space-y-3">
              {app.applied_at && (
                <div className="flex items-center gap-3 text-xs">
                  <div className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center shrink-0">📥</div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{t('company.pipeline.received')}</p>
                    <p className="text-gray-400">{formatDate(app.applied_at)}</p>
                  </div>
                </div>
              )}
              {Object.entries(stageHistory)
                .sort(([,a], [,b]) => new Date(a) - new Date(b))
                .map(([stage, ts]) => (
                <div key={stage} className="flex items-center gap-3 text-xs">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    stage === REJECTED ? 'bg-red-100 dark:bg-red-900/40' : 'bg-brand-100 dark:bg-brand-900/40'
                  }`}>
                    {stage === REJECTED ? '❌' : (STAGE_ICONS[stage] || '•')}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {t(`company.pipeline.${stage}`)}
                    </p>
                    <p className="text-gray-400">{new Date(ts).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Internal notes */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">🗒 {t('company.applicantDetail.notes')}</h2>

            {/* Existing notes */}
            {notesList.length > 0 && (
              <div className="space-y-2.5 mb-3 max-h-60 overflow-y-auto scrollbar-thin">
                {notesList.map((note, i) => (
                  <div key={i} className="flex gap-2.5">
                    {/* Author avatar */}
                    {note.author_photo ? (
                      <img src={note.author_photo} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">
                        {(note.author || '?')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                      <p className="text-xs text-gray-700 dark:text-gray-300">{typeof note === 'string' ? note : note.text}</p>
                      {note.author && (
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-400">
                          <span className="font-medium">{note.author}</span>
                          <span>·</span>
                          <span>{note.created_at ? new Date(note.created_at).toLocaleString() : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* New note input */}
            <textarea rows={2} value={newNote} onChange={e => setNewNote(e.target.value)}
              placeholder={t('company.applicantDetail.notesPlaceholder')}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 mb-2" />
            <Button size="sm" onClick={handleAddNote} loading={savingNotes} disabled={!newNote.trim()} className="w-full">
              {t('company.applicantDetail.addNote')}
            </Button>
          </Card>
        </div>
      </div>

      {/* ── Rejection modal ──────────────────────────────────────────────── */}
      <Modal open={showRejectModal} onClose={() => { setShowRejectModal(false); setRejectReason('') }}
        title={t('company.pipeline.rejectTitle')}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('company.pipeline.rejectDesc')}</p>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">{t('company.pipeline.rejectReason')}</label>
            <textarea rows={4} value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder={t('company.pipeline.rejectPlaceholder')}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500" />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => { setShowRejectModal(false); setRejectReason('') }}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" className="flex-1" onClick={handleReject} loading={rejecting} disabled={!rejectReason.trim()}>
              {t('company.pipeline.confirmReject')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
