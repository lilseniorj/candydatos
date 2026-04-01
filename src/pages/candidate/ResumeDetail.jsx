import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { getResumesByCandidate, deleteResume } from '../../services/resumes'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'

// ─── Score ring component ───────────────────────────────────────────────────
function ScoreRing({ value, size = 80, strokeWidth = 7, className = '' }) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const color = value >= 70 ? 'text-green-500' : value >= 40 ? 'text-orange-500' : 'text-red-400'
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor"
          strokeWidth={strokeWidth} className="text-gray-200 dark:text-gray-700" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor"
          strokeWidth={strokeWidth} strokeLinecap="round" className={color}
          strokeDasharray={`${(value / 100) * circ} ${circ}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <span className={`absolute text-lg font-bold ${color}`}>{value}</span>
    </div>
  )
}

// ─── Score category card ────────────────────────────────────────────────────
function ScoreCategory({ icon, label, score, tips }) {
  const barColor = score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-orange-500' : 'bg-red-400'
  const tagColor = score >= 70
    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
    : score >= 40
      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
      : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300'
  const tagLabel = score >= 70 ? 'Fuerte' : score >= 40 ? 'Mejorable' : 'Débil'

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{label}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tagColor}`}>{tagLabel}</span>
          <span className="text-sm font-bold text-gray-900 dark:text-white">{score}/100</span>
        </div>
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${score}%` }} />
      </div>
      {tips?.length > 0 && (
        <ul className="space-y-1.5">
          {tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
              <span className="text-brand-500 mt-0.5 shrink-0">→</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function ResumeDetail() {
  const { t } = useTranslation()
  const { resumeId } = useParams()
  const navigate = useNavigate()
  const { firebaseUser } = useAuth()

  const [resume, setResume]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const all = await getResumesByCandidate(firebaseUser.uid)
      const found = all.find(r => r.id === resumeId)
      setResume(found || null)
      setLoading(false)
    }
    load()
  }, [firebaseUser?.uid, resumeId])

  async function handleDelete() {
    if (!resume) return
    await deleteResume(resume.id, resume.storage_path)
    navigate('/candidate/resumes')
  }

  if (loading) return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>
  if (!resume) return (
    <div className="text-center py-24">
      <p className="text-gray-500 dark:text-gray-400">{t('candidate.resume.notFound')}</p>
      <Link to="/candidate/resumes"><Button variant="ghost" className="mt-4">{t('candidate.resume.backToList')}</Button></Link>
    </div>
  )

  const data = resume.extracted_data || {}
  const skills = data.skills || []
  const experience = data.experience || []
  const education = data.education || []
  const suggestions = resume.suggestions || []

  // Compute scores from extracted data
  const skillsScore     = Math.min(100, skills.length * 14)
  const experienceScore = Math.min(100, experience.length * 30 + (experience.reduce((acc, e) => acc + (parseInt(e.years) || 1), 0)) * 10)
  const educationScore  = Math.min(100, education.length * 40 + (education.some(e => e.degree?.toLowerCase().includes('ingeni') || e.degree?.toLowerCase().includes('licen')) ? 20 : 0))
  const structureScore  = Math.min(100, (data.full_name ? 15 : 0) + (data.email ? 15 : 0) + (data.phone ? 10 : 0) + (data.summary ? 20 : 0) + (skills.length > 0 ? 15 : 0) + (experience.length > 0 ? 15 : 0) + (education.length > 0 ? 10 : 0))
  const overallScore    = Math.round((skillsScore + experienceScore + educationScore + structureScore) / 4)

  // Build tips per category
  const skillsTips = []
  if (skills.length < 5) skillsTips.push(t('candidate.resume.tipMoreSkills'))
  if (!skills.some(s => /react|angular|vue/i.test(s))) skillsTips.push(t('candidate.resume.tipFramework'))

  const experienceTips = []
  if (experience.length === 0) experienceTips.push(t('candidate.resume.tipAddExperience'))
  if (experience.length > 0 && !experience.some(e => e.years)) experienceTips.push(t('candidate.resume.tipAddYears'))

  const educationTips = []
  if (education.length === 0) educationTips.push(t('candidate.resume.tipAddEducation'))

  const structureTips = []
  if (!data.summary) structureTips.push(t('candidate.resume.tipAddSummary'))
  if (!data.phone) structureTips.push(t('candidate.resume.tipAddPhone'))
  if (!data.email) structureTips.push(t('candidate.resume.tipAddEmail'))

  const uploadDate = resume.created_at?.toDate?.()
    ? resume.created_at.toDate().toLocaleDateString()
    : resume.created_at?.seconds
      ? new Date(resume.created_at.seconds * 1000).toLocaleDateString()
      : '—'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back nav */}
      <Link to="/candidate/resumes" className="inline-flex items-center gap-1 text-sm text-brand-500 hover:text-brand-600 font-medium">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        {t('candidate.resume.backToList')}
      </Link>

      {/* ── Header Card ──────────────────────────────────────────────────── */}
      <Card className="p-0 overflow-hidden">
        <div className="bg-brand-500 px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center text-3xl shrink-0">📄</div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">{resume.name}</h1>
            <p className="text-sm text-blue-100">{t('candidate.resume.uploadedOn')} {uploadDate}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <a href={resume.document_url} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" size="sm">{t('candidate.resume.viewDocument')}</Button>
            </a>
            <Button variant="danger" size="sm" onClick={handleDelete}>{t('common.delete')}</Button>
          </div>
        </div>
      </Card>

      {/* ── Overall Score ────────────────────────────────────────────────── */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <ScoreRing value={overallScore} size={100} strokeWidth={8} />
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('candidate.resume.overallScore')}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('candidate.resume.scoreDescription')}</p>
          </div>
        </div>
      </Card>

      {/* ── Category Scores ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ScoreCategory icon="⚡" label={t('candidate.resume.catSkills')}     score={skillsScore}     tips={skillsTips} />
        <ScoreCategory icon="💼" label={t('candidate.resume.catExperience')} score={experienceScore} tips={experienceTips} />
        <ScoreCategory icon="🎓" label={t('candidate.resume.catEducation')}  score={educationScore}  tips={educationTips} />
        <ScoreCategory icon="📋" label={t('candidate.resume.catStructure')}  score={structureScore}  tips={structureTips} />
      </div>

      {/* ── Extracted Information ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Personal info */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">👤 {t('candidate.resume.personalInfo')}</h3>
          <div className="space-y-2 text-sm">
            {data.full_name && <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">{t('candidate.resume.fullName')}</span><span className="font-medium text-gray-900 dark:text-white">{data.full_name}</span></div>}
            {data.email     && <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Email</span><span className="font-medium text-gray-900 dark:text-white">{data.email}</span></div>}
            {data.phone     && <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">{t('candidate.profile.phone')}</span><span className="font-medium text-gray-900 dark:text-white">{data.phone}</span></div>}
          </div>
        </Card>

        {/* Skills */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">⚡ {t('candidate.resume.catSkills')}</h3>
          {skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {skills.map(s => (
                <span key={s} className="px-2.5 py-1 rounded-full text-xs font-medium bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 border border-brand-200 dark:border-brand-800">{s}</span>
              ))}
            </div>
          ) : <p className="text-xs text-gray-400 italic">{t('candidate.resume.noData')}</p>}
        </Card>

        {/* Experience */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">💼 {t('candidate.resume.catExperience')}</h3>
          {experience.length > 0 ? (
            <div className="space-y-3">
              {experience.map((e, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400 shrink-0">{i + 1}</div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{e.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{e.company}{e.years ? ` · ${e.years}` : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-gray-400 italic">{t('candidate.resume.noData')}</p>}
        </Card>

        {/* Education */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">🎓 {t('candidate.resume.catEducation')}</h3>
          {education.length > 0 ? (
            <div className="space-y-3">
              {education.map((e, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400 shrink-0">{i + 1}</div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{e.degree}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{e.institution}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-gray-400 italic">{t('candidate.resume.noData')}</p>}
        </Card>
      </div>

      {/* ── AI Suggestions ───────────────────────────────────────────────── */}
      {suggestions.length > 0 && (
        <Card className="p-5 border-l-4 border-l-brand-500">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">🤖 {t('candidate.resume.suggestions')}</h3>
          <ul className="space-y-2">
            {suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
                <span className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-brand-600 dark:text-brand-300 text-xs font-bold shrink-0">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ── Summary ──────────────────────────────────────────────────────── */}
      {data.summary && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">📝 {t('candidate.resume.summary')}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{data.summary}</p>
        </Card>
      )}
    </div>
  )
}
